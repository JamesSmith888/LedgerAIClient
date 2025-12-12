/**
 * useStatefulAgentChat Hook
 *
 * 状态机驱动的 Agent 聊天 Hook
 * 支持：
 * - Intent Rewriting（用户意图理解和提示词优化）
 * - Human-in-the-Loop（危险操作确认弹窗）
 * - ReAct 反思模式（每步执行后反思评估）
 * - 取消功能
 * - 状态可视化
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AgentMessage, AgentChatConfig, Attachment, PendingAttachment } from '../types/agent';
import {
  createStatefulAgent,
  StatefulAgent,
  StatefulAgentOptions,
  StatefulAgentCallbacks,
  AgentStepEvent,
  AgentState,
  ExecutionPlan,
  ConfirmationRequest,
  ReflectionResult,
  ReflectorConfig,
} from '../agent/statefulAgent';
import { CancellationReason } from '../agent/utils/cancellation';
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import type { MessageContentImageUrl, MessageContentText } from "@langchain/core/messages";
import { ToolCallData } from '../components/agent/embedded';
import ConversationStorage from '../services/conversationStorage';
import { apiKeyStorage, AIProvider, AI_PROVIDERS } from '../services/apiKeyStorage';
import { titleGeneratorService } from '../services/titleGeneratorService';

// ============ 常量 ============

// ============ 类型 ============

type MultimodalContent = MessageContentText | MessageContentImageUrl;

interface StatefulAgentChatConfig extends AgentChatConfig {
  conversationId?: string;
  /** 是否启用意图改写（用户输入优化） */
  enableIntentRewriting?: boolean;
  /** 是否启用人机确认 */
  enableConfirmation?: boolean;
  /** 是否启用 ReAct 反思模式 */
  enableReflection?: boolean;
  /** 反思器配置 */
  reflectorConfig?: Partial<ReflectorConfig>;
  /** 用户偏好 */
  userPreferences?: {
    confirmHighRisk?: boolean;
    confirmMediumRisk?: boolean;
    batchThreshold?: number;
  };
}

interface ToolCallTracker {
  [toolName: string]: {
    msgId: string;
    data: ToolCallData;
  };
}

// ============ 辅助函数 ============

/**
 * 多模态内容部分类型（扩展支持音频）
 */
type AudioContentPart = {
  type: 'media';
  mimeType: string;
  data: string;  // Base64 编码的音频数据
};

function buildMultimodalContent(
  text: string,
  attachments?: PendingAttachment[],
  provider?: AIProvider
): { content: string | MultimodalContent[], hasUnsupportedImages: boolean, hasUnsupportedAudio: boolean } {
  const imageAttachments = attachments?.filter(a => a.type === 'image' && a.base64) || [];
  const audioAttachments = attachments?.filter(a => a.type === 'audio' && a.base64) || [];

  // 检查当前 provider 的能力
  const providerConfig = provider ? AI_PROVIDERS[provider] : null;
  const supportsVision = providerConfig?.supportsVision ?? false;
  const supportsAudio = providerConfig?.supportsAudio ?? false;

  // 无附件情况
  if (imageAttachments.length === 0 && audioAttachments.length === 0) {
    return { content: text || '', hasUnsupportedImages: false, hasUnsupportedAudio: false };
  }

  // 检查不支持的功能
  const hasUnsupportedImages = imageAttachments.length > 0 && !supportsVision;
  const hasUnsupportedAudio = audioAttachments.length > 0 && !supportsAudio;

  // 如果有任何不支持的功能，返回纯文本并标记
  if (hasUnsupportedImages || hasUnsupportedAudio) {
    return { 
      content: text || '', 
      hasUnsupportedImages,
      hasUnsupportedAudio,
    };
  }

  const content: MultimodalContent[] = [];

  // 添加文本
  if (text && text.trim()) {
    content.push({ type: 'text', text });
  }

  // 添加图片
  for (const attachment of imageAttachments) {
    const mimeType = attachment.mimeType || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${attachment.base64}`;
    content.push({
      type: 'image_url',
      image_url: { url: dataUrl },
    });
  }

  // 添加音频（Gemini 格式）
  // 注意：Gemini 使用 inlineData 格式
  for (const attachment of audioAttachments) {
    // Gemini 只支持 audio/wav, audio/mp3, audio/aiff, audio/aac, audio/ogg, audio/flac
    // 我们的 Android 录音模块输出 AAC 编码的 M4A 容器，应该使用 audio/aac
    const mimeType = attachment.mimeType || 'audio/aac';
    // Gemini API 期望的格式是 { inlineData: { mimeType, data } }
    // LangChain 使用 { type: 'media', mimeType, data } 格式来转换
    const audioContent: AudioContentPart = {
      type: 'media',
      mimeType: mimeType,
      data: attachment.base64!,
    };
    // 将音频内容添加为特殊格式
    content.push(audioContent as any);
  }

  // 添加提示语
  if (imageAttachments.length > 0) {
    content.push({
      type: 'text',
      text: imageAttachments.length === 1
        ? '\n请分析这张图片。如果是收据、发票、账单或消费凭证，请提取信息并帮我记账。'
        : `\n请分析这 ${imageAttachments.length} 张图片。如果是收据、发票等，请提取信息并帮我记账。`,
    });
  }

  if (audioAttachments.length > 0) {
    content.push({
      type: 'text',
      text: '\n请仔细听取这段语音消息，理解用户的意图，然后执行相应的操作。如果是记账相关的语音，请提取金额、分类、描述等信息帮用户记账。',
    });
  }

  return { content, hasUnsupportedImages: false, hasUnsupportedAudio: false };
}

// ============ Hook ============

export const useStatefulAgentChat = (config: StatefulAgentChatConfig) => {
  const {
    userId,
    enableStreaming = true,
    conversationId,
    runtimeContext,
    enabledToolNames,
    enableIntentRewriting = true,  // 默认启用意图改写
    enableConfirmation = true,
    enableReflection = false,  // 默认关闭反思模式
    reflectorConfig,
    userPreferences,
  } = config;

  // 将 enabledToolNames 数组转换为稳定的字符串 key
  // 这样即使数组引用变化，只要内容不变就不会触发重新初始化
  const enabledToolNamesKey = useMemo(() => {
    return enabledToolNames?.slice().sort().join(',') || '';
  }, [enabledToolNames]);

  // ============ State ============

  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // 状态机状态
  const [agentState, setAgentState] = useState<AgentState>(AgentState.IDLE);

  // 当前改写后的意图
  const [currentIntent, setCurrentIntent] = useState<any | null>(null);

  // 等待确认的请求
  const [pendingConfirmation, setPendingConfirmation] = useState<ConfirmationRequest | null>(null);

  // 最新反思结果
  const [lastReflection, setLastReflection] = useState<ReflectionResult | null>(null);

  // 当前使用的 Provider（用于检查能力）
  const [currentProvider, setCurrentProvider] = useState<AIProvider>('gemini');

  // 当前使用的模型名称（用于UI展示）
  const [currentModelName, setCurrentModelName] = useState<string>('');

  // ============ Refs ============

  const agentRef = useRef<StatefulAgent | null>(null);
  const contextRef = useRef(runtimeContext);
  const enabledToolsRef = useRef(enabledToolNames);
  const historyRef = useRef<BaseMessage[]>([]);
  const hasRenderedContentRef = useRef(false);
  const conversationIdRef = useRef<string | null>(conversationId || null);
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesRef = useRef<AgentMessage[]>([]);  // 追踪最新消息状态，用于组件卸载时保存
  
  // 用于追踪模型配置变化的版本号
  const [modelConfigVersion, setModelConfigVersion] = useState(0);
  
  // 追踪配置变化，但不立即触发重新初始化（等待当前任务完成）
  const pendingConfigRef = useRef<{
    enableReflection?: boolean;
    enableIntentRewriting?: boolean;
    enableConfirmation?: boolean;
  } | null>(null);
  
  // 当前 Agent 是否正在执行任务
  const isExecutingRef = useRef(false);

  // ============ 消息存储 ============

  // 同步 messagesRef（用于组件卸载时保存）
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const saveMessagesToStorage = useCallback((msgs: AgentMessage[]) => {
    if (!conversationIdRef.current) return;

    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current);
    }

    saveDebounceRef.current = setTimeout(async () => {
      try {
        await ConversationStorage.saveMessages(conversationIdRef.current!, msgs);
      } catch (error) {
        console.error('❌ [useStatefulAgentChat] Failed to save messages:', error);
      }
    }, 500);
  }, []);

  const loadMessagesFromStorage = useCallback(async (convId: string): Promise<AgentMessage[]> => {
    try {
      return await ConversationStorage.getMessages(convId);
    } catch (error) {
      console.error('❌ [useStatefulAgentChat] Failed to load messages:', error);
      return [];
    }
  }, []);

  // ============ 标题生成 ============

  /**
   * 如果需要，为对话生成标题
   * 
   * 触发条件：
   * 1. 对话标题是默认的"新对话 X"格式
   * 2. 至少有一轮完整的对话（用户 + AI 回复）
   */
  const generateTitleIfNeeded = useCallback(async (convId: string, messages: AgentMessage[]) => {
    try {
      // 获取当前对话信息
      const conversations = await ConversationStorage.getConversations();
      const currentConv = conversations.find(c => c.id === convId);
      
      if (!currentConv) {
        return;
      }

      // 检查是否需要生成标题
      if (!titleGeneratorService.shouldGenerateTitle(currentConv.title, messages)) {
        return;
      }

      console.log('🏷️ [useStatefulAgentChat] Generating title for conversation:', convId);

      // 生成标题（异步，不阻塞主流程）
      const newTitle = await titleGeneratorService.generateTitle(messages);
      
      if (newTitle) {
        console.log('✅ [useStatefulAgentChat] Generated title:', newTitle);
        
        // 更新对话标题
        await ConversationStorage.updateConversation(convId, { title: newTitle });
        
        // 如果有回调，通知上层组件更新 UI
        // 注意：这里不需要特殊处理，因为 useConversations 会定期刷新列表
      }
    } catch (error) {
      console.error('❌ [useStatefulAgentChat] Failed to generate title:', error);
      // 静默失败，不影响主流程
    }
  }, []);

  // ============ 初始化 ============

  // 保存当前配置到 ref，供重新初始化时使用
  const configRef = useRef({
    enableIntentRewriting,
    enableConfirmation,
    enableReflection,
    reflectorConfig,
    userPreferences,
  });
  
  // 更新配置 ref（不触发重新初始化）
  useEffect(() => {
    configRef.current = {
      enableIntentRewriting,
      enableConfirmation,
      enableReflection,
      reflectorConfig,
      userPreferences,
    };
  }, [enableIntentRewriting, enableConfirmation, enableReflection, reflectorConfig, userPreferences]);

  useEffect(() => {
    console.log('🤖 [useStatefulAgentChat] Initializing stateful agent...');
    console.log(`  - Intent Rewriting: ${configRef.current.enableIntentRewriting ? 'ENABLED' : 'DISABLED'}`);
    console.log(`  - Confirmation: ${configRef.current.enableConfirmation ? 'ENABLED' : 'DISABLED'}`);
    console.log(`  - Reflection: ${configRef.current.enableReflection ? 'ENABLED' : 'DISABLED'}`);

    const initializeAgent = async () => {
      // 获取用户配置的模型信息
      let apiKey: string | undefined;
      let modelConfig: {
        executorProvider?: AIProvider;
        executorModel?: string;
        intentRewriterProvider?: AIProvider;
        intentRewriterModel?: string;
        reflectorProvider?: AIProvider;
        reflectorModel?: string;
      } = {};
      
      try {
        // 获取各个角色的模型配置
        const [executorConfig, intentConfig, reflectorConfigResult] = await Promise.all([
          apiKeyStorage.getModelForRole('executor'),
          apiKeyStorage.getModelForRole('intentRewriter'),
          apiKeyStorage.getModelForRole('reflector'),
        ]);

        // 使用执行模型的 API Key
        if (executorConfig.apiKey) {
          apiKey = executorConfig.apiKey;
          setCurrentProvider(executorConfig.provider);
          setCurrentModelName(executorConfig.model);
          console.log(`🔑 [useStatefulAgentChat] Using user-configured API Key for ${executorConfig.provider}`);
        } else {
          console.warn('⚠️ [useStatefulAgentChat] No API Key configured, agent will not work');
          setIsConnected(false);
          return;
        }

        // 设置模型配置（包含提供商和模型名称）
        modelConfig = {
          executorProvider: executorConfig.provider,
          executorModel: executorConfig.model,
          intentRewriterProvider: intentConfig.provider,
          intentRewriterModel: intentConfig.model,
          reflectorProvider: reflectorConfigResult.provider,
          reflectorModel: reflectorConfigResult.model,
        };

        console.log('📦 [useStatefulAgentChat] Model configs:', modelConfig);
      } catch (error) {
        console.warn('⚠️ [useStatefulAgentChat] Failed to get model config:', error);
        setIsConnected(false);
        return;
      }

      // 确保 apiKey 已配置
      if (!apiKey) {
        console.warn('⚠️ [useStatefulAgentChat] No API Key available');
        setIsConnected(false);
        return;
      }

      // 使用 ref 中的最新配置
      const currentConfig = configRef.current;

      agentRef.current = createStatefulAgent(apiKey, {
        runtimeContext,
        enabledToolNames,
        enableIntentRewriting: currentConfig.enableIntentRewriting,
        enableConfirmation: currentConfig.enableConfirmation,
        enableReflection: currentConfig.enableReflection,
        reflectorConfig: currentConfig.reflectorConfig,
        userPreferences: currentConfig.userPreferences,
        modelConfig,
      });
      contextRef.current = runtimeContext;
      enabledToolsRef.current = enabledToolNames;
      setIsConnected(true);

      // 加载消息历史（仅在初始化时）
      if (conversationId) {
        conversationIdRef.current = conversationId;
        const storedMessages = await loadMessagesFromStorage(conversationId);
        console.log(`📥 [useStatefulAgentChat] Loaded ${storedMessages.length} messages on init`);

        if (storedMessages.length > 0) {
          setMessages(storedMessages);
          historyRef.current = storedMessages
            .filter(m => m.type === 'text' && (m.sender === 'user' || m.sender === 'assistant'))
            .map(m => m.sender === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content));
        } else {
          addSystemMessage('你好！我是你的 AI 财务助手。');
        }
      } else {
        addSystemMessage('你好！我是你的 AI 财务助手。');
      }
      
      setIsInitialized(true);
    };

    initializeAgent();

    return () => {
      // 组件卸载时，先立即保存消息（不等 debounce）
      if (saveDebounceRef.current) {
        clearTimeout(saveDebounceRef.current);
        saveDebounceRef.current = null;
      }
      // 立即保存当前消息到存储
      // 注意：这里使用同步方式调用，确保在组件卸载前完成保存
      if (conversationIdRef.current) {
        ConversationStorage.saveMessages(conversationIdRef.current, messagesRef.current)
          .catch(err => console.error('❌ [useStatefulAgentChat] Failed to save on unmount:', err));
      }
      
      // 只在组件真正卸载时取消，而不是配置变化时
      if (agentRef.current) {
        agentRef.current.cancel(CancellationReason.COMPONENT_UNMOUNTED);
      }
      agentRef.current = null;
    };
  // 注意：
  // 1. 移除了 enableIntentRewriting, enableConfirmation, enableReflection 依赖
  //    这些配置变化不应该触发 Agent 重新初始化，而是在下次任务开始时生效
  // 2. 使用 enabledToolNamesKey 代替 enabledToolNames 数组引用
  //    避免因为 useToolManager 内部状态变化（如 isAlwaysAllowed）导致不必要的重新初始化
  }, [runtimeContext, enabledToolNamesKey, modelConfigVersion]);

  // ============ 发送消息 ============

  const sendMessage = useCallback(async (content: string, attachments?: Attachment[] | PendingAttachment[]) => {
    if (!content.trim() && (!attachments || attachments.length === 0)) return;

    // 在任务开始时，检查并应用最新的反思模式配置
    if (agentRef.current) {
      const currentConfig = configRef.current;
      const reflector = agentRef.current.getReflector();
      
      // 动态更新反思器的启用状态
      if (reflector && reflector.isEnabled() !== currentConfig.enableReflection) {
        console.log(`🔄 [useStatefulAgentChat] Updating reflection mode: ${currentConfig.enableReflection}`);
        agentRef.current.updateReflectorConfig({
          enabled: currentConfig.enableReflection,
          ...currentConfig.reflectorConfig,
        });
      }
    }

    const pendingAttachments = attachments as PendingAttachment[] | undefined;

    // 添加用户消息
    const userMsgId = `user_${Date.now()}`;
    const displayAttachments: Attachment[] | undefined = attachments?.map(a => ({
      id: a.id,
      type: a.type,
      uri: a.uri,
      name: a.name,
      size: a.size,
      mimeType: a.mimeType,
      width: a.width,
      height: a.height,
    }));

    // 如果没有文本内容，但有附件，content 保持为空字符串
    // MessageBubble 组件会根据是否有 content 来决定是否显示文本气泡
    // 这样可以避免在只发送图片或语音时显示 "[图片]" 或 "[语音]" 这样的占位符

    const userMessage: AgentMessage = {
      id: userMsgId,
      type: 'text',
      sender: 'user',
      content: content || '',
      timestamp: new Date(),
      status: 'sent',
      metadata: displayAttachments ? { attachments: displayAttachments } : undefined,
    };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    const aiMsgId = `assistant_${Date.now()}`;
    const aiPlaceholder: AgentMessage = {
      id: aiMsgId,
      type: 'text',
      sender: 'assistant',
      content: '',
      timestamp: new Date(),
      status: 'sending',
    };

    try {
      // 构建消息内容，检查图片/音频支持
      const { content: messageContent, hasUnsupportedImages, hasUnsupportedAudio } = buildMultimodalContent(
        content, 
        pendingAttachments, 
        currentProvider
      );

      // 如果当前 Provider 不支持图片，显示友好提示
      if (hasUnsupportedImages) {
        const providerName = AI_PROVIDERS[currentProvider]?.name || currentProvider;
        const warningMessage: AgentMessage = {
          id: `warning_${Date.now()}`,
          type: 'text',
          sender: 'assistant',
          content: `⚠️ ${providerName} 暂不支持图片识别功能。\n\n如需使用图片记账，请在「设置 → API Key 设置」中切换到 **Google Gemini**。\n\n您可以继续用文字描述这笔消费，我会帮您记录。`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, warningMessage]);
        setIsTyping(false);
        return;
      }

      // 如果当前 Provider 不支持音频，显示友好提示
      if (hasUnsupportedAudio) {
        const providerName = AI_PROVIDERS[currentProvider]?.name || currentProvider;
        const warningMessage: AgentMessage = {
          id: `warning_${Date.now()}`,
          type: 'text',
          sender: 'assistant',
          content: `🎙️ ${providerName} 暂不支持语音输入功能。\n\n如需使用语音记账，请在「设置 → API Key 设置」中切换到 **Google Gemini**。\n\nGemini 支持直接理解语音内容，无需转换为文字。`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, warningMessage]);
        setIsTyping(false);
        return;
      }

      const humanMsg = new HumanMessage(messageContent);
      const currentHistory = [...historyRef.current, humanMsg];

      if (!agentRef.current) {
        throw new Error("Agent not initialized");
      }

      setMessages(prev => [...prev, aiPlaceholder]);

      const toolCallTracker: ToolCallTracker = {};
      hasRenderedContentRef.current = false;
      let thinkingMsgId: string | null = null;

      // Agent 回调
      const callbacks: StatefulAgentCallbacks = {
        onStateChange: (oldState, newState) => {
          console.log(`📊 [State] ${oldState} -> ${newState}`);
          setAgentState(newState);
        },

        onIntentRewritten: (intent) => {
          console.log('📝 [Intent] Rewritten:', intent.rewrittenPrompt);
          setCurrentIntent(intent);

          // 如果置信度高且有提取信息，可以显示意图消息
          if (intent.confidence > 0.7 && Object.keys(intent.extractedInfo).length > 0) {
            const intentMsgId = `intent_${Date.now()}`;
            const intentMessage: AgentMessage = {
              id: intentMsgId,
              type: 'intent',  // 意图消息类型
              sender: 'assistant',
              content: intent.rewrittenPrompt,
              timestamp: new Date(),
              metadata: { intent },
            };

            setMessages(prev => {
              const aiIndex = prev.findIndex(m => m.id === aiMsgId);
              if (aiIndex >= 0) {
                return [...prev.slice(0, aiIndex), intentMessage, ...prev.slice(aiIndex)];
              }
              return [...prev, intentMessage];
            });
          }
        },

        onConfirmationRequired: (request) => {
          console.log('⚠️ [Confirmation] Required:', request.message);
          setPendingConfirmation(request);
        },

        // 反思结果回调
        onReflection: (result: ReflectionResult) => {
          console.log('🔍 [Reflection]', result.thought);
          setLastReflection(result);

          // 添加反思消息到对话中
          const reflectionMsgId = `reflection_${Date.now()}`;
          const reflectionMessage: AgentMessage = {
            id: reflectionMsgId,
            type: 'reflection',  // 专门的反思消息类型
            sender: 'assistant',
            content: result.thought,
            timestamp: new Date(),
            metadata: { 
              reflectionResult: result,
              progress: result.progressPercent,
              nextAction: result.nextAction,
            },
          };

          setMessages(prev => {
            const aiIndex = prev.findIndex(m => m.id === aiMsgId);
            if (aiIndex >= 0) {
              return [...prev.slice(0, aiIndex), reflectionMessage, ...prev.slice(aiIndex)];
            }
            return [...prev, reflectionMessage];
          });
        },

        onStep: (step: AgentStepEvent) => {
          console.log('📍 [Step]', step.type, step.content?.substring(0, 50));

          // 状态变化
          if (step.type === 'state_change' && step.state) {
            setAgentState(step.state);
          }

          // 意图改写消息
          if (step.type === 'intent_rewriting' && step.rewrittenIntent) {
            // 已在 onIntentRewritten 处理
          }

          // 确认请求
          if (step.type === 'confirmation' && step.confirmationRequest) {
            setPendingConfirmation(step.confirmationRequest);
          }

          // 反思结果 - 在 onReflection 已处理，这里跳过
          if (step.type === 'reflection') {
            return;
          }

          // 思考过程
          if (step.type === 'thinking') {
            if (step.content === '正在思考...') {
              if (!thinkingMsgId) {
                thinkingMsgId = `thinking_${Date.now()}`;
                const thinkingMessage: AgentMessage = {
                  id: thinkingMsgId,
                  type: 'thinking',
                  sender: 'assistant',
                  content: step.content,
                  timestamp: new Date(),
                };

                setMessages(prev => {
                  const aiIndex = prev.findIndex(m => m.id === aiMsgId);
                  if (aiIndex >= 0) {
                    return [...prev.slice(0, aiIndex), thinkingMessage, ...prev.slice(aiIndex)];
                  }
                  return [...prev, thinkingMessage];
                });
              }
            } else if (thinkingMsgId) {
              setMessages(prev => prev.map(m =>
                m.id === thinkingMsgId ? { ...m, content: step.content } : m
              ));
            }
            return;
          }

          // 取消
          if (step.type === 'cancelled') {
            // 只删除思考中的消息和空的 AI 占位符，保留已渲染的内容
            setMessages(prev => {
              const updated = prev.filter(m => {
                // 删除思考消息
                if (m.id.startsWith('thinking_')) return false;
                // 删除空的 AI 占位符消息
                if (m.id === aiMsgId && (!m.content || m.content.trim() === '')) return false;
                // 保留其他所有消息（包括用户消息、嵌入内容、工具调用结果等）
                return true;
              });
              // 取消时也保存消息，防止组件卸载导致的数据丢失
              saveMessagesToStorage(updated);
              return updated;
            });
            setIsTyping(false);
            return;
          }

          // 移除思考消息
          if ((step.type === 'tool_call' || step.type === 'tool_result') && thinkingMsgId) {
            setMessages(prev => prev.filter(m => m.id !== thinkingMsgId));
            thinkingMsgId = null;
          }

          // 工具调用
          if (step.type === 'tool_call' && step.toolName) {
            const toolMsgId = `tool_${step.toolName}_${Date.now()}`;
            const toolCallData: ToolCallData = {
              toolName: step.toolName,
              status: 'running',
              args: step.toolArgs,  // 传递请求参数
              timestamp: new Date(),
            };

            toolCallTracker[step.toolName] = { msgId: toolMsgId, data: toolCallData };

            const toolMessage: AgentMessage = {
              id: toolMsgId,
              type: 'tool_call',
              sender: 'assistant',
              content: '',
              timestamp: new Date(),
              metadata: { toolName: step.toolName, toolCallData },
            };

            setMessages(prev => {
              const aiIndex = prev.findIndex(m => m.id === aiMsgId);
              if (aiIndex >= 0) {
                return [...prev.slice(0, aiIndex), toolMessage, ...prev.slice(aiIndex)];
              }
              return [...prev, toolMessage];
            });
          }

          // 工具结果
          if (step.type === 'tool_result' && step.toolName) {
            const tracked = toolCallTracker[step.toolName];
            const isRenderTool = step.toolName.startsWith('render_');

            if (isRenderTool) {
              let embeddedData: any = null;
              try {
                embeddedData = JSON.parse(step.content);
              } catch (e) {
                const match = step.content.match(/\[EMBED:\w+:(.+)\]$/s);
                if (match) {
                  try { embeddedData = JSON.parse(match[1]); } catch {}
                }
              }

              if (embeddedData) {
                hasRenderedContentRef.current = true;

                // 工具名到嵌入类型的映射（包含增强组件）
                const typeMap: Record<string, string> = {
                  // 基础组件
                  'render_transaction_list': 'transaction_list',
                  'render_transaction_detail': 'transaction_detail',
                  'render_result_message': 'result_message',
                  'render_statistics_card': 'statistics_card',
                  'render_action_buttons': 'action_buttons',
                  // 增强组件
                  'render_dynamic_card': 'dynamic_card',
                  'render_key_value_list': 'key_value_list',
                  'render_progress_card': 'progress_card',
                  'render_comparison_card': 'comparison_card',
                  'render_pie_chart': 'pie_chart',
                  'render_bar_chart': 'bar_chart',
                };

                const embedMessage: AgentMessage = {
                  id: `embed_${Date.now()}_${Math.random()}`,
                  type: 'embedded',
                  sender: 'assistant',
                  content: '',
                  timestamp: new Date(),
                  metadata: {
                    embeddedContent: {
                      type: (typeMap[step.toolName] || 'unknown') as any,
                      data: embeddedData,
                    },
                  },
                };

                setMessages(prev => {
                  const aiIndex = prev.findIndex(m => m.id === aiMsgId);
                  if (aiIndex >= 0) {
                    return [...prev.slice(0, aiIndex), embedMessage, ...prev.slice(aiIndex)];
                  }
                  return [...prev, embedMessage];
                });
              }

              if (tracked) {
                setMessages(prev => prev.map(m => {
                  if (m.id === tracked.msgId) {
                    return {
                      ...m,
                      type: 'tool_result' as const,
                      metadata: {
                        ...m.metadata,
                        toolCallData: { ...tracked.data, status: 'completed', result: '✅ 已渲染' },
                      },
                    };
                  }
                  return m;
                }));
              }
            } else if (tracked) {
              setMessages(prev => prev.map(m => {
                if (m.id === tracked.msgId) {
                  return {
                    ...m,
                    type: 'tool_result' as const,
                    metadata: {
                      ...m.metadata,
                      toolCallData: { ...tracked.data, status: 'completed', result: step.content },
                    },
                  };
                }
                return m;
              }));
            }
          }
        },
      };

      // 执行
      const stream = agentRef.current.stream({ messages: currentHistory }, callbacks);

      let finalContent = "";
      let finalMessages: BaseMessage[] = [];

      try {
        for await (const chunk of stream) {
          const msgs = chunk.messages;
          if (msgs && msgs.length > 0) {
            finalMessages = msgs;
            const lastMsg = msgs[msgs.length - 1];

            if (lastMsg instanceof AIMessage && lastMsg.content) {
              const extractContent = (content: any): string => {
                if (!content) return '';
                if (typeof content === 'string') return content;
                if (Array.isArray(content)) {
                  return content
                    .filter((p: any) => p.type === 'text' && p.text)
                    .map((p: any) => p.text)
                    .join('\n');
                }
                return JSON.stringify(content);
              };

              finalContent = extractContent(lastMsg.content);
              setMessages(prev => prev.map(m =>
                m.id === aiMsgId ? { ...m, content: finalContent } : m
              ));
            }
          }
        }
      } catch (streamError: unknown) {
        // Gemini 有时候在流处理过程中会抛出 'parts' 相关错误
        // 但工具调用可能已经成功完成了
        console.warn('⚠️ [useStatefulAgentChat] Stream processing error:', streamError);

        // 如果已经有渲染内容，不需要报错
        if (hasRenderedContentRef.current) {
          console.log('✅ [useStatefulAgentChat] Rendered content exists, ignoring stream error');
        } else {
          throw streamError; // 重新抛出让外层处理
        }
      }

      if (finalMessages.length > 0) {
        historyRef.current = finalMessages;
      }

      // 任务完成后重置状态
      setIsTyping(false);
      setAgentState(AgentState.IDLE); // 重置为 IDLE 而不是 COMPLETED，因为任务已结束
      setPendingConfirmation(null);
      setCurrentIntent(null);

      setMessages(prev => {
        let updated = prev.filter(m => !m.id.startsWith('thinking_'));

        const aiMsg = updated.find(m => m.id === aiMsgId);
        if (aiMsg && (!aiMsg.content || aiMsg.content.trim() === '')) {
          updated = updated.filter(m => m.id !== aiMsgId);
        } else if (aiMsg) {
          updated = updated.map(m =>
            m.id === aiMsgId ? { ...m, status: 'delivered' as const } : m
          );
        }

        saveMessagesToStorage(updated);
        
        // 在 AI 回复完成后，尝试生成对话标题（异步执行，不阻塞 UI）
        if (conversationIdRef.current && updated.length >= 2) {
          generateTitleIfNeeded(conversationIdRef.current, updated);
        }
        
        return updated;
      });

    } catch (error: unknown) {
      console.error('❌ [useStatefulAgentChat] Error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);

      // 特殊处理 Gemini API 的 'parts' 错误
      let displayMessage = errorMessage;
      if (errorMessage.includes("'parts' of undefined") || errorMessage.includes("parts")) {
        displayMessage = "AI 模型返回异常，请重试";
      }

      setMessages(prev => [...prev, {
        id: `error_${Date.now()}`,
        type: 'system',
        sender: 'system',
        content: `出错了: ${displayMessage}`,
        timestamp: new Date(),
      }]);
      setIsTyping(false);
      setAgentState(AgentState.IDLE); // 错误后也重置为 IDLE，允许用户重试
    }
  }, [saveMessagesToStorage]);

  // ============ 确认/拒绝 ============

  const confirmOperation = useCallback(() => {
    if (agentRef.current && pendingConfirmation) {
      console.log('✅ [useStatefulAgentChat] User confirmed');
      agentRef.current.confirm();
      setPendingConfirmation(null);
    }
  }, [pendingConfirmation]);

  const rejectOperation = useCallback((reason?: string) => {
    if (agentRef.current && pendingConfirmation) {
      console.log('❌ [useStatefulAgentChat] User rejected:', reason);
      agentRef.current.reject(reason);
      setPendingConfirmation(null);
    }
  }, [pendingConfirmation]);

  // ============ 其他方法 ============

  const addSystemMessage = useCallback((content: string) => {
    const systemMessage: AgentMessage = {
      id: `system_${Date.now()}`,
      type: 'system',
      sender: 'system',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => {
      const updated = [...prev, systemMessage];
      saveMessagesToStorage(updated);
      return updated;
    });
  }, [saveMessagesToStorage]);

  const clearMessages = useCallback(async () => {
    setMessages([]);
    historyRef.current = [];
    setIsTyping(false);
    setAgentState(AgentState.IDLE);
    setCurrentIntent(null);
    setPendingConfirmation(null);

    if (conversationIdRef.current) {
      await ConversationStorage.saveMessages(conversationIdRef.current, []);
    }
  }, []);

  const reconnect = useCallback(() => {
    historyRef.current = [];
    setIsConnected(true);
    setAgentState(AgentState.IDLE);
  }, []);

  const cancelChat = useCallback(() => {
    console.log('🛑 [useStatefulAgentChat] Cancelling...');

    if (agentRef.current) {
      agentRef.current.cancel(CancellationReason.USER_CANCELLED);
      agentRef.current.reset();
    }

    setIsTyping(false);
    setAgentState(AgentState.IDLE);
    setPendingConfirmation(null);
    setCurrentIntent(null);

    setMessages(prev => {
      const cleaned = prev.filter(m => !m.id.startsWith('thinking_'));
      return [...cleaned, {
        id: `system_${Date.now()}`,
        type: 'system',
        sender: 'system',
        content: '已取消',
        timestamp: new Date(),
      }];
    });
  }, []);

  const switchToConversation = useCallback(async (newConversationId: string) => {
    console.log('🔀 [useStatefulAgentChat] Switching to conversation:', newConversationId);
    
    // 保存当前对话的消息
    if (conversationIdRef.current && conversationIdRef.current !== newConversationId && messagesRef.current.length > 0) {
      console.log('💾 [useStatefulAgentChat] Saving current conversation before switch');
      await ConversationStorage.saveMessages(conversationIdRef.current, messagesRef.current);
    }

    // 更新 conversationIdRef
    conversationIdRef.current = newConversationId;
    
    // 加载新对话的消息
    const storedMessages = await loadMessagesFromStorage(newConversationId);
    console.log(`✅ [useStatefulAgentChat] Loaded ${storedMessages.length} messages`);
    
    setMessages(storedMessages);

    historyRef.current = storedMessages
      .filter(m => m.type === 'text' && (m.sender === 'user' || m.sender === 'assistant'))
      .map(m => m.sender === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content));

    // 重置状态
    setAgentState(AgentState.IDLE);
    setCurrentIntent(null);
    setPendingConfirmation(null);
    setLastReflection(null);
  }, [loadMessagesFromStorage]);

  // ============ 刷新模型信息并重新初始化 Agent ============

  const refreshModelInfo = useCallback(async () => {
    try {
      const executorConfig = await apiKeyStorage.getModelForRole('executor');
      if (executorConfig.apiKey) {
        const providerChanged = executorConfig.provider !== currentProvider;
        const modelChanged = executorConfig.model !== currentModelName;
        
        setCurrentProvider(executorConfig.provider);
        setCurrentModelName(executorConfig.model);
        
        // 如果模型或提供商变化，触发 Agent 重新初始化
        if (providerChanged || modelChanged) {
          console.log(`🔄 [useStatefulAgentChat] Model config changed, reinitializing agent...`);
          console.log(`  - Provider: ${currentProvider} -> ${executorConfig.provider}`);
          console.log(`  - Model: ${currentModelName} -> ${executorConfig.model}`);
          setModelConfigVersion(v => v + 1);
        } else {
          console.log(`🔄 [useStatefulAgentChat] Refreshed model info (no change): ${executorConfig.provider}/${executorConfig.model}`);
        }
      }
    } catch (error) {
      console.warn('⚠️ [useStatefulAgentChat] Failed to refresh model info:', error);
    }
  }, [currentProvider, currentModelName]);

  // ============ 返回值 ============

  return {
    // 基础功能
    messages,
    sendMessage,
    clearMessages,
    reconnect,
    cancelChat,
    isConnected,
    isTyping,
    isInitialized,
    switchToConversation,
    currentConversationId: conversationIdRef.current,

    // 状态机扩展
    agentState,
    currentIntent,
    pendingConfirmation,
    confirmOperation,
    rejectOperation,
    isAwaitingConfirmation: agentState === AgentState.AWAITING_CONFIRMATION,

    // 反思模式扩展
    lastReflection,
    isReflecting: agentState === AgentState.REFLECTING,

    // 模型信息（用于UI展示）
    currentProvider,
    currentModelName,
    refreshModelInfo,
  };
};
