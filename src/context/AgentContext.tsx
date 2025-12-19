import React, { createContext, useContext, useRef, useState, useEffect, useCallback, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { 
  AgentState, 
  StatefulAgent, 
  createStatefulAgent, 
  AgentStepEvent,
  ConfirmationRequest,
  ReflectionResult,
} from '../agent/statefulAgent';
import { RewrittenIntent } from '../agent/intentRewriter';
import { CancellationReason } from '../agent/utils/cancellation';
import { AgentMessage, ToolCallData, PendingAttachment } from '../types/agent';
import { AgentRuntimeContext } from '../types/agent';
import { useAuth } from './AuthContext';
import { useLedger } from './LedgerContext';
import { useCategories } from './CategoryContext';
import { usePaymentMethod } from './PaymentMethodContext';
import { apiKeyStorage, AIProvider } from '../services/apiKeyStorage';
import { ConversationStorage } from '../services/conversationStorage';
import { toolPermissionStorage } from '../services/toolPermissionStorage';
import { agentConfigStorage } from '../services/agentConfigStorage';
import { userPreferenceMemory } from '../services/userPreferenceMemory';
import { HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { transcribeAudioWithGeminiOfficial, transcribeAudioWithGeminiViaNewAPI } from '../services/geminiAudioService';
// import { buildMultimodalContent } from '../utils/multimodalUtils';

// 定义 Context 类型
interface AgentContextType {
  // 基础状态
  messages: AgentMessage[];
  agentState: AgentState;
  isTyping: boolean;
  isInitialized: boolean;
  isConnected: boolean;
  
  // 对话管理
  currentConversationId: string | null;
  switchToConversation: (id: string) => Promise<void>;
  clearMessages: () => void;
  
  // 交互
  sendMessage: (content: string, attachments?: any[]) => Promise<void>;
  cancelChat: () => void;
  
  // 确认/拒绝
  pendingConfirmation: ConfirmationRequest | null;
  confirmOperation: () => void;
  rejectOperation: (reason?: string) => void;
  isAwaitingConfirmation: boolean;
  
  // 意图与反思
  currentIntent: RewrittenIntent | null;
  lastReflection: ReflectionResult | null;
  isReflecting: boolean;
  
  // 智能建议（由 AI 生成的后续操作建议）
  suggestions: Array<{ label: string; message: string }> | null;
  clearSuggestions: () => void;
  
  // 模型信息
  currentProvider: AIProvider;
  currentModelName: string;
  refreshModelInfo: () => Promise<void>;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export const useAgent = () => {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error('useAgent must be used within an AgentProvider');
  }
  return context;
};

export const AgentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // ============ 状态定义 ============
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [agentState, setAgentState] = useState<AgentState>(AgentState.IDLE);
  const [isTyping, setIsTyping] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  
  // 智能建议状态
  const [suggestions, setSuggestions] = useState<Array<{ label: string; message: string }> | null>(null);
  
  const [pendingConfirmation, setPendingConfirmation] = useState<ConfirmationRequest | null>(null);
  const [currentIntent, setCurrentIntent] = useState<RewrittenIntent | null>(null);
  const [lastReflection, setLastReflection] = useState<ReflectionResult | null>(null);
  
  const [currentProvider, setCurrentProvider] = useState<AIProvider>('gemini');
  const [currentModelName, setCurrentModelName] = useState<string>('gemini-pro');
  const [modelConfigVersion, setModelConfigVersion] = useState(0);

  // ============ Refs ============
  const agentRef = useRef<StatefulAgent | null>(null);
  const historyRef = useRef<BaseMessage[]>([]);
  const conversationIdRef = useRef<string | null>(null);
  const saveDebounceRef = useRef<any>(null);
  const hasRenderedContentRef = useRef(false);

  // ============ Context Hooks ============
  const { user } = useAuth();
  const { currentLedger, ledgers, defaultLedgerId } = useLedger();
  const { categories } = useCategories();
  const { paymentMethods } = usePaymentMethod();

  // ============ 辅助函数 ============
  
  // 构建运行时上下文
  const getRuntimeContext = useCallback((): AgentRuntimeContext => {
    return {
      user: user ? {
        id: Number(user.id || user.userId || user._id || 0),
        username: user.username || 'unknown',
        nickname: user.nickname,
      } : null,
      currentLedger: currentLedger ? {
        id: currentLedger.id,
        name: currentLedger.name,
        description: currentLedger.description || undefined,
      } : null,
      defaultLedgerId: defaultLedgerId || null,
      allLedgers: ledgers.map(l => ({
        id: l.id,
        name: l.name,
      })),
      categories: categories.map((c: any) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        icon: c.icon,
      })),
      paymentMethods: paymentMethods.map(p => ({
        id: p.id,
        name: p.name,
        icon: p.icon,
        isDefault: !!p.isDefault,
      })),
      currentDateTime: new Date().toISOString(),
    };
  }, [user, currentLedger, ledgers, categories, paymentMethods, defaultLedgerId]);

  // 加载消息
  const loadMessagesFromStorage = useCallback(async (id: string): Promise<AgentMessage[]> => {
    try {
      const stored = await ConversationStorage.getMessages(id);
      return stored.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp), // 恢复 Date 对象
      })) as AgentMessage[];
    } catch (error) {
      console.warn('⚠️ [AgentContext] Failed to load messages:', error);
      return [];
    }
  }, []);

  // 保存消息
  const saveMessagesToStorage = useCallback((msgs: AgentMessage[]) => {
    if (!conversationIdRef.current) return;
    
    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current);
    }

    saveDebounceRef.current = setTimeout(() => {
      ConversationStorage.saveMessages(conversationIdRef.current!, msgs)
        .catch((err: any) => console.warn('⚠️ [AgentContext] Failed to save messages:', err));
    }, 1000);
  }, []);

  // 监听消息变化自动保存
  useEffect(() => {
    if (messages.length > 0) {
      saveMessagesToStorage(messages);
    }
  }, [messages, saveMessagesToStorage]);

  // ============ 初始化 Agent ============
  
  useEffect(() => {
    const initAgent = async () => {
      if (!user) return;

      try {
        // 1. 获取配置
        const [executorConfig, intentConfig, reflectorConfigResult, agentConfig] = await Promise.all([
          apiKeyStorage.getModelForRole('executor'),
          apiKeyStorage.getModelForRole('intentRewriter'),
          apiKeyStorage.getModelForRole('reflector'),
          agentConfigStorage.getConfig(),
        ]);

        if (!executorConfig.apiKey) {
          console.warn('⚠️ [AgentContext] No API Key configured');
          setIsConnected(false);
          return;
        }

        setCurrentProvider(executorConfig.provider);
        setCurrentModelName(executorConfig.model);

        // 2. 获取工具权限
        const alwaysAllowedTools = await toolPermissionStorage.getAllAlwaysAllowed();
        
        // 3. 初始化 Agent
        const runtimeContext = getRuntimeContext();
        
        agentRef.current = createStatefulAgent(executorConfig.apiKey, {
          runtimeContext,
          enabledToolNames: undefined, // 默认启用所有工具
          enableIntentRewriting: true, // 默认启用
          enableConfirmation: true, // 默认启用
          enableReflection: agentConfig.enableReflection,
          userPreferences: {
            confirmHighRisk: agentConfig.confirmationPolicy?.confirmHighRisk ?? true,
          },
          modelConfig: {
            executorProvider: executorConfig.provider,
            executorModel: executorConfig.model,
            executorBaseURL: executorConfig.baseURL,
            intentRewriterProvider: intentConfig.provider,
            intentRewriterModel: intentConfig.model,
            intentRewriterBaseURL: intentConfig.baseURL,
            reflectorProvider: reflectorConfigResult.provider,
            reflectorModel: reflectorConfigResult.model,
            reflectorBaseURL: reflectorConfigResult.baseURL,
          }
        });

        setIsConnected(true);
        setIsInitialized(true);
        console.log('✅ [AgentContext] Agent initialized globally');

      } catch (error) {
        console.error('❌ [AgentContext] Failed to initialize agent:', error);
        setIsConnected(false);
      }
    };

    initAgent();

    return () => {
      // Cleanup if needed
    };
  }, [user, modelConfigVersion, getRuntimeContext]); // 依赖项变化时重新初始化

  // ============ 核心功能实现 ============

  const sendMessage = useCallback(async (content: string, attachments: any[] = []) => {
    if (!content.trim() && attachments.length === 0) return;
    if (!agentRef.current) return;

    console.log('🎬 [AgentContext] ========== 开始新的对话轮次 ==========');
    console.log('📥 [AgentContext] 用户输入:', content);

    // 使用单轮对话内的严格递增序号，避免同毫秒内的顺序错乱
    const seqBase = Date.now() * 1000;
    let seqInc = 0;
    const getNextSequence = () => seqBase + (seqInc++);

    // 1. 添加用户消息
    const userMsgId = `user_${Date.now()}`;
    const userMessage: AgentMessage = {
      id: userMsgId,
      type: 'text',
      sender: 'user',
      content,
      timestamp: new Date(),
      status: 'sent',
      metadata: attachments.length > 0 ? { attachments } : undefined,
      sequence: getNextSequence(),
    };

    console.log(`📤 [AgentContext] 添加用户消息 [seq=${userMessage.sequence}]:`, userMsgId);
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    // 2. 添加 AI 占位符（不显示，只用于后续更新）
    const aiMsgId = `assistant_${Date.now()}`;
    const aiPlaceholder: AgentMessage = {
      id: aiMsgId,
      type: 'text',
      sender: 'assistant',
      content: '',
      timestamp: new Date(),
      status: 'sending',
      sequence: -1, // 占位符不参与排序
    };
    console.log(`🤖 [AgentContext] 添加 AI 占位符:`, aiMsgId);
    setMessages(prev => [...prev, aiPlaceholder]);

    // 3. 准备历史记录 - 构建多模态消息
    let humanMsg: HumanMessage;

    // ===== 语音输入（NewAPI Gemini 原生格式） =====
    // 参考 NewAPI 文档：GeminiRequest.parts[].inlineData { mimeType, data }
    // - provider=gemini：调用官方 Gemini generateContent 转写
    // - provider=thirdparty 且 model=gemini*：调用 {baseURL}/v1beta/models/{model}:generateContent 转写
    // 目标：恢复“语音输入可用”，让 agent 拿到真实文本，而不是占位符。
    let effectiveText = content;
    const firstAudio = attachments.find((a) => a?.type === 'audio');
    const isVoiceOnly = !content.trim() && !!firstAudio?.base64;

    const inferAudioMimeType = (uri?: string, fallback?: string) => {
      const fb = (fallback || '').trim();
      if (fb) return fb;
      const lower = (uri || '').toLowerCase();
      if (lower.endsWith('.m4a') || lower.endsWith('.mp4')) return 'audio/mp4';
      if (lower.endsWith('.aac')) return 'audio/aac';
      if (lower.endsWith('.mp3')) return 'audio/mpeg';
      if (lower.endsWith('.wav')) return 'audio/wav';
      return 'audio/aac';
    };

    if (isVoiceOnly) {
      try {
        const executorConfig = await apiKeyStorage.getModelForRole('executor');
        const model = (executorConfig?.model || currentModelName || '').trim();
        const mimeType = inferAudioMimeType(firstAudio?.uri, firstAudio?.mimeType);

        if (executorConfig?.provider === 'gemini' && executorConfig?.apiKey && model) {
          const transcript = await transcribeAudioWithGeminiOfficial({
            apiKey: executorConfig.apiKey,
            model,
            base64: firstAudio.base64,
            mimeType,
          });
          effectiveText = transcript;
          console.log('🎧 [AgentContext] Gemini audio transcribed (official):', effectiveText);
        } else if (
          executorConfig?.provider === 'thirdparty' &&
          executorConfig?.apiKey &&
          executorConfig?.baseURL &&
          model &&
          model.startsWith('gemini')
        ) {
          const transcript = await transcribeAudioWithGeminiViaNewAPI({
            baseURL: executorConfig.baseURL,
            apiKey: executorConfig.apiKey,
            model,
            base64: firstAudio.base64,
            mimeType,
          });
          effectiveText = transcript;
          console.log('🎧 [AgentContext] Gemini audio transcribed (NewAPI):', effectiveText);
        }

        // 可选：把转写文本回填到 UI 中，避免用户消息显示为空
        if (effectiveText.trim()) {
          setMessages(prev => prev.map(m => (m.id === userMsgId ? { ...m, content: effectiveText } : m)));
        }
      } catch (e) {
        console.warn('⚠️ [AgentContext] Gemini audio transcription failed, fallback to placeholder:', e);
      }
    }
    
    if (attachments.length > 0) {
      // 有附件：构建多模态消息（文本 + 图片）
      // ⚠️ 注意：当前仅将“图片”注入到 LLM 的 message content。
      // 音频/文件类附件不会注入（否则会触发不同 Provider 的不兼容）。
      // 当只有非图片附件且文本为空时，必须降级为纯文本占位符，避免 OpenAI 兼容接口返回 400。
      const messageContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

      // 添加文本内容（如果有）
      if (effectiveText.trim()) {
        messageContent.push({
          type: 'text',
          text: effectiveText,
        });
      }

      // 添加图片内容
      attachments.forEach((attachment) => {
        if (attachment.type === 'image' && attachment.base64) {
          // LangChain 支持的格式：data:image/jpeg;base64,xxx
          const imageUrl = attachment.base64.startsWith('data:')
            ? attachment.base64
            : `data:image/jpeg;base64,${attachment.base64}`;

          messageContent.push({
            type: 'image_url',
            image_url: { url: imageUrl },
          });

          console.log('🖼️ [AgentContext] Added image to message, size:', attachment.size);
        }
      });

      // 如果最终没有任何可发送给模型的 part，则降级为纯文本消息
      if (messageContent.length === 0) {
        const hasAudio = attachments.some((a) => a?.type === 'audio');
        const hasOther = attachments.length > 0;
        const fallbackText = effectiveText.trim()
          ? effectiveText
          : hasAudio
            ? '（用户发送了一段语音消息）'
            : hasOther
              ? '（用户发送了一个附件）'
              : '';

        humanMsg = new HumanMessage(fallbackText);
        console.log('🖼️ [AgentContext] Attachment-only message fallback to text:', fallbackText);
      } else {
        humanMsg = new HumanMessage({ content: messageContent });
        console.log('🖼️ [AgentContext] Created multimodal message with', messageContent.length, 'parts');
      }
    } else {
      // 无附件：纯文本消息
      humanMsg = new HumanMessage(effectiveText);
    }
    
    historyRef.current.push(humanMsg);

    // 4. 定义回调
    let thinkingMsgId: string | null = null;
    const toolCallTracker: Record<string, { msgId: string, data: ToolCallData }> = {};

    const callbacks = {
      onStateChange: (oldState: AgentState, newState: AgentState) => {
        console.log(`🔄 [AgentContext] State: ${oldState} → ${newState}`);
        setAgentState(newState);
      },
      onIntentRewritten: (intent: RewrittenIntent) => {
        console.log('📝 [AgentContext] Intent rewritten:', intent.intentType);
        setCurrentIntent(intent);
        // 可选：添加意图消息
      },
      onConfirmationRequired: (request: ConfirmationRequest) => {
        console.log('⏸️  [AgentContext] Confirmation required:', request.toolName, request.userFriendly?.description || request.message);
        setPendingConfirmation(request);
      },
      onReflection: (result: ReflectionResult) => {
        setLastReflection(result);
        const seq = getNextSequence();
        console.log(`💭 [AgentContext] Reflection [seq=${seq}]:`, result.thought.substring(0, 50));
        
        // 追加反思到思考消息
        if (thinkingMsgId) {
          const reflectionPreview = result.thought.length > 100 
            ? result.thought.substring(0, 100) + '...'
            : result.thought;
          const reflectionInfo = `\n\n💭 反思: ${reflectionPreview}`;
          setMessages(prev => prev.map(m => 
            m.id === thinkingMsgId ? {...m, content: m.content + reflectionInfo} : m
          ));
        }
        
        // 添加反思消息
        const reflectionMsg: AgentMessage = {
          id: `reflection_${Date.now()}`,
          type: 'reflection',
          sender: 'assistant',
          content: result.thought,
          timestamp: new Date(),
          metadata: { reflectionResult: result },
          sequence: seq,
        };
        setMessages(prev => [...prev, reflectionMsg]);
      },
      onStep: (step: AgentStepEvent) => {
        // 处理思考
        if (step.type === 'thinking') {
           if (step.content === '正在思考...') {
             if (!thinkingMsgId) {
               const seq = getNextSequence();
               thinkingMsgId = `thinking_${Date.now()}`;
               console.log(`🤔 [AgentContext] Thinking start [seq=${seq}]`);
               setMessages(prev => [...prev, {
                 id: thinkingMsgId!,
                 type: 'thinking',
                 sender: 'assistant',
                 content: step.content,
                 timestamp: new Date(),
                 sequence: seq,
               }]);
             }
           } else if (thinkingMsgId && step.content && step.content !== '正在思考...') {
             // 更新思考内容（操作步骤，不是模型推理）
             console.log('🤔 [AgentContext] Thinking update:', step.content.substring(0, 50));
             setMessages(prev => prev.map(m => 
               m.id === thinkingMsgId ? {...m, content: step.content} : m
             ));
           }
           return;
        }

        // 将工具调用也追加到思考消息（展示执行流程）
        if (step.type === 'tool_call' && thinkingMsgId) {
          const toolInfo = `\n\n🔧 ${step.content || `调用工具: ${step.toolName}`}`;
          setMessages(prev => prev.map(m => 
            m.id === thinkingMsgId ? {...m, content: m.content + toolInfo} : m
          ));
        }

        // 处理工具调用
        if (step.type === 'tool_call' && step.toolName) {
          const seq = getNextSequence();
          const toolMsgId = `tool_${step.toolName}_${Date.now()}`;
          const toolData: ToolCallData = {
            toolName: step.toolName,
            status: 'running',
            args: step.toolArgs,
            timestamp: new Date()
          };
          toolCallTracker[step.toolName] = { msgId: toolMsgId, data: toolData };
          
          console.log(`🔧 [AgentContext] Tool call [seq=${seq}]:`, step.toolName);
          console.log(`   Args:`, step.toolArgs);
          
          setMessages(prev => [...prev, {
            id: toolMsgId,
            type: 'tool_call',
            sender: 'assistant',
            content: '',
            timestamp: new Date(),
            metadata: { toolName: step.toolName, toolCallData: toolData },
            sequence: seq,
          }]);
        }

        // 处理工具结果
        if (step.type === 'tool_result' && step.toolName) {
          console.log(`✅ [AgentContext] Tool result:`, step.toolName);
          console.log(`   Result:`, step.content.substring(0, 100));
          
          // 追加工具结果到思考消息
          if (thinkingMsgId) {
            const resultPreview = step.content.length > 50 
              ? step.content.substring(0, 50) + '...'
              : step.content;
            const resultInfo = `\n   ✓ 结果: ${resultPreview}`;
            setMessages(prev => prev.map(m => 
              m.id === thinkingMsgId ? {...m, content: m.content + resultInfo} : m
            ));
          }
          
          const tracked = toolCallTracker[step.toolName];
          const isRenderTool = step.toolName.startsWith('render_');
          
          if (isRenderTool) {
            // 处理渲染工具...
            let embeddedData: any = null;
            try { embeddedData = JSON.parse(step.content); } catch {}
            
            if (embeddedData) {
               const seq = getNextSequence();
               console.log(`🎨 [AgentContext] Render tool result [seq=${seq}]:`, step.toolName);
               
               // 特殊处理 render_action_buttons - 设置为建议栏而不是嵌入消息
               if (step.toolName === 'render_action_buttons' && embeddedData.buttons && Array.isArray(embeddedData.buttons)) {
                 console.log('💡 [AgentContext] Setting suggestions from render_action_buttons:', embeddedData.buttons.length);
                 
                 // 转换为 suggestions 格式
                 const newSuggestions = embeddedData.buttons.map((btn: any) => ({
                   label: btn.label,
                   message: btn.payload || btn.label,
                 }));
                 
                 setSuggestions(newSuggestions);
                 
                 // 不创建嵌入消息，只更新工具状态
                 if (tracked) {
                   setMessages(prev => prev.map(m => m.id === tracked.msgId ? {
                     ...m,
                     type: 'tool_result',
                     metadata: { ...m.metadata, toolCallData: { ...tracked.data, status: 'completed', result: '✅ 已设置建议' } }
                   } : m));
                 }
                 
                 return; // 不再继续处理嵌入消息
               }
               
               // 其他 render 工具正常处理为嵌入消息
               // 映射工具名到类型...
               const typeMap: Record<string, string> = {
                  'render_transaction_list': 'transaction_list',
                  'render_transaction_detail': 'transaction_detail',
                  'render_result_message': 'result_message',
                  'render_statistics_card': 'statistics_card',
                  'render_action_buttons': 'action_buttons', // 保留映射，以防回退到嵌入消息
                  'render_dynamic_card': 'dynamic_card',
                  'render_key_value_list': 'key_value_list',
                  'render_progress_card': 'progress_card',
                  'render_comparison_card': 'comparison_card',
                  'render_pie_chart': 'pie_chart',
                  'render_bar_chart': 'bar_chart',
               };
               
               setMessages(prev => [...prev, {
                 id: `embed_${Date.now()}`,
                 type: 'embedded',
                 sender: 'assistant',
                 content: '',
                 timestamp: new Date(),
                 metadata: {
                   embeddedContent: {
                     type: ((step.toolName && typeMap[step.toolName]) || 'unknown') as any,
                     data: embeddedData
                   }
                 },
                 sequence: seq,
               }]);
            }
            
            // 更新工具状态为完成
            if (tracked) {
              setMessages(prev => prev.map(m => m.id === tracked.msgId ? {
                ...m,
                type: 'tool_result',
                metadata: { ...m.metadata, toolCallData: { ...tracked.data, status: 'completed', result: '✅ 已渲染' } }
              } : m));
            }
          } else if (tracked) {
            // 普通工具结果
            setMessages(prev => prev.map(m => m.id === tracked.msgId ? {
              ...m,
              type: 'tool_result',
              metadata: { ...m.metadata, toolCallData: { ...tracked.data, status: 'completed', result: step.content } }
            } : m));
          }
        }
      }
    };

    // 5. 执行流
    try {
      const stream = agentRef.current.stream({ messages: historyRef.current }, callbacks);
      
      console.log('🚀 [AgentContext] Starting stream execution...');
      let finalContent = "";
      let chunkCount = 0;
      
      for await (const chunk of stream) {
        chunkCount++;
        if (chunk.messages && chunk.messages.length > 0) {
          const lastMsg = chunk.messages[chunk.messages.length - 1];
          if (lastMsg instanceof AIMessage && typeof lastMsg.content === 'string') {
            finalContent = lastMsg.content;
            // ⚠️ 关键修复：不在这里实时更新消息，避免打乱顺序
            // 等所有步骤完成后，在 finally 块中统一添加最终的 AI 响应
            console.log(`📝 [AgentContext] Chunk ${chunkCount}: content length=${finalContent.length}`);
          }
          historyRef.current = chunk.messages;
        }
      }
      
      console.log(`✅ [AgentContext] Stream completed. Total chunks: ${chunkCount}`);
      
      // 6. Stream 完成后，添加最终的 AI 响应（确保在所有工具调用之后）
      if (finalContent) {
        const seq = getNextSequence();
        console.log(`💬 [AgentContext] Final AI response [seq=${seq}]:`, finalContent.substring(0, 50));
        
        // 删除占位符，添加最终消息
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== aiMsgId);
          return [...filtered, {
            id: `assistant_final_${Date.now()}`,
            type: 'text',
            sender: 'assistant',
            content: finalContent,
            timestamp: new Date(),
            status: 'sent',
            sequence: seq,
          }];
        });
      }
    } catch (err) {
      console.error('❌ [AgentContext] Execution error:', err);

      // ⚠️ 注意：不要在 setState updater 闭包里直接引用 catch 变量（Hermes 下可能触发 ReferenceError）
      const rawErrText = err instanceof Error ? err.message : String(err ?? '未知错误');
      const rawStack = err instanceof Error ? err.stack : undefined;

      // LangChain 在模型响应缺失（例如 choices 为空）时，可能会在 BaseChatModel.invoke 里触发该 TypeError。
      // 这通常意味着：第三方网关对当前模型/参数（尤其是 tools/tool calling）不兼容，或返回结构并非 OpenAI 兼容格式。
      const looksLikeEmptyGeneration =
        rawErrText.includes("Cannot read property 'message' of undefined") ||
        rawErrText.includes('Cannot read property \"message\" of undefined') ||
        rawErrText.includes('Cannot read properties of undefined (reading \"message\")') ||
        rawErrText.includes("Cannot read properties of undefined (reading 'message')");

      const errText = looksLikeEmptyGeneration
        ? '模型没有返回可用的生成结果（可能是第三方网关对该模型/工具调用不兼容或响应不符合 OpenAI 兼容格式）。\n\n建议：\n1) 把 Executor 模型换成已验证支持工具调用的 OpenAI 兼容模型（例如 gpt-4o-mini / deepseek-chat 等）；\n2) 或检查第三方网关是否开启了 tools/tool-calling 的 OpenAI 兼容支持。'
        : rawErrText;

      if (looksLikeEmptyGeneration) {
        console.warn('⚠️ [AgentContext] Suspected empty generations/choices from model response. This is usually a gateway compatibility issue.');
        if (rawStack) console.warn('⚠️ [AgentContext] Stack:', rawStack);
      }

      setMessages(prev => [
        ...prev,
        {
          id: `error_${Date.now()}`,
          type: 'text',
          sender: 'system',
          content: `执行出错: ${errText}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      console.log('🏁 [AgentContext] Finalizing...');
      
      setIsTyping(false);
      setAgentState(AgentState.IDLE);
      setPendingConfirmation(null);
      setCurrentIntent(null);
      
      // 清理和排序消息
      setMessages(prev => {
        // 1. 删除占位符
        let filtered = prev.filter(m => {
          if (m.id === aiMsgId && !m.content && !m.metadata?.toolCallData) return false;
          return true;
        });

        // 1.1 将本轮“正在思考...”标记为完成（避免结束后仍显示“正在思考...”）
        if (thinkingMsgId) {
          filtered = filtered.map(m => {
            if (m.id !== thinkingMsgId) return m;
            if (m.content === '正在思考...') {
              return { ...m, content: '思考完成' };
            }
            return m;
          });
        }
        
        // 2. 按序号排序（确保消息按照生成顺序显示）
        filtered.sort((a, b) => {
          const seqA = a.sequence ?? 999999999999999;
          const seqB = b.sequence ?? 999999999999999;
          return seqA - seqB;
        });
        
        console.log('📊 [AgentContext] Final message count:', filtered.length);
        console.log('📊 [AgentContext] Message order:', filtered.map(m => `[${m.sequence}] ${m.type}`).join(' → '));
        console.log('🔍 [AgentContext] Sequence details:', filtered.map(m => ({ id: m.id, seq: m.sequence, type: m.type, sender: m.sender })));
        
        return filtered;
      });
      
      console.log('🎬 [AgentContext] ========== 对话轮次结束 ==========\n');
    }
  }, [user]);

  // 切换对话
  const switchToConversation = useCallback(async (id: string) => {
    if (conversationIdRef.current === id) return;
    
    // 保存当前
    if (conversationIdRef.current && messages.length > 0) {
      await ConversationStorage.saveMessages(conversationIdRef.current, messages);
    }
    
    conversationIdRef.current = id;
    setCurrentConversationId(id);
    
    const msgs = await loadMessagesFromStorage(id);
    setMessages(msgs);
    
    // 重建 LangChain 历史（过滤掉工具调用相关消息，避免状态不一致）
    // 只保留用户和 AI 的纯文本消息，移除所有 tool_call 和 tool_result 消息
    const textMessages = msgs.filter(
      (m: AgentMessage) => 
        m.type === 'text' && 
        (m.sender === 'user' || m.sender === 'assistant')
    );
    
    // 验证消息序列：如果最后一条消息是未完成的工具调用相关消息，移除它
    // 这可以防止 LangChain 报错："An assistant message with 'tool_calls' must be followed by tool messages"
    const validMessages = textMessages.filter((m: AgentMessage, index: number) => {
      // 如果不是最后一条消息，保留
      if (index < textMessages.length - 1) return true;
      
      // 最后一条消息：如果是 AI 消息且内容提到工具调用，可能是未完成的，跳过
      // 这是一个保守的做法，确保历史消息的完整性
      const content = m.content || '';
      const hasToolCallHint = 
        content.includes('工具') || 
        content.includes('调用') ||
        content.includes('执行') ||
        m.type === 'tool_call' ||
        m.type === 'tool_result';
      
      // 如果是用户消息，或者是不包含工具调用提示的 AI 消息，保留
      return m.sender === 'user' || !hasToolCallHint;
    });
    
    historyRef.current = validMessages.map(
      (m: AgentMessage) => m.sender === 'user' 
        ? new HumanMessage(m.content || '') 
        : new AIMessage(m.content || '')
    );
    
    // � 关键修复：完全重新创建 Agent 实例以清除 LLM 内部缓存
    // 仅调用 reset() 无法清除 LangChain 模型实例中可能存在的缓存状态
    // 通过递增版本号强制重新初始化，确保每次切换对话都有全新的上下文
    setModelConfigVersion(prev => prev + 1);
    
    // 重置确认和意图状态
    setPendingConfirmation(null);
    setCurrentIntent(null);
    setLastReflection(null);
      
    setAgentState(AgentState.IDLE);
  }, [messages, loadMessagesFromStorage]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    historyRef.current = [];
    // 清空消息时也重置 Agent 内部状态
    agentRef.current?.reset();
    setPendingConfirmation(null);
    setCurrentIntent(null);
    setLastReflection(null);
  }, []);

  const cancelChat = useCallback(() => {
    agentRef.current?.cancel(CancellationReason.USER_CANCELLED);
    setIsTyping(false);
    setAgentState(AgentState.IDLE);
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions(null);
  }, []);

  const confirmOperation = useCallback(() => {
    console.log('✅ [AgentContext] confirmOperation called');
    console.log('  - agentRef.current:', !!agentRef.current);
    console.log('  - pendingConfirmation:', !!pendingConfirmation);
    
    if (!agentRef.current) {
      console.error('❌ [AgentContext] agentRef.current is null!');
      return;
    }
    
    agentRef.current.confirm();
    setPendingConfirmation(null);
    console.log('✅ [AgentContext] Agent confirmed, pendingConfirmation cleared');
  }, [pendingConfirmation]);

  const rejectOperation = useCallback((reason?: string) => {
    agentRef.current?.reject(reason);
    setPendingConfirmation(null);
  }, []);

  const refreshModelInfo = useCallback(async () => {
    setModelConfigVersion(v => v + 1);
  }, []);

  const value: AgentContextType = {
    messages,
    agentState,
    isTyping,
    isInitialized,
    isConnected,
    currentConversationId,
    switchToConversation,
    clearMessages,
    sendMessage,
    cancelChat,
    pendingConfirmation,
    confirmOperation,
    rejectOperation,
    isAwaitingConfirmation: agentState === AgentState.AWAITING_CONFIRMATION,
    currentIntent,
    lastReflection,
    isReflecting: agentState === AgentState.REFLECTING,
    suggestions,
    clearSuggestions,
    currentProvider,
    currentModelName,
    refreshModelInfo,
  };

  return (
    <AgentContext.Provider value={value}>
      {children}
    </AgentContext.Provider>
  );
};
