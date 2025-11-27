/**
 * useStatefulAgentChat Hook
 *
 * 状态机驱动的 Agent 聊天 Hook
 * 支持：
 * - Planning 模式（复杂任务分步规划）
 * - Human-in-the-Loop（危险操作确认弹窗）
 * - 取消功能
 * - 状态可视化
 */

import { useCallback, useEffect, useRef, useState } from 'react';
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
} from '../agent/statefulAgent';
import { CancellationReason } from '../agent/utils/cancellation';
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import type { MessageContentImageUrl, MessageContentText } from "@langchain/core/messages";
import { ToolCallData } from '../components/agent/embedded';
import ConversationStorage from '../services/conversationStorage';

// ============ 常量 ============

const DEFAULT_API_KEY = "xxx";

// ============ 类型 ============

type MultimodalContent = MessageContentText | MessageContentImageUrl;

interface StatefulAgentChatConfig extends AgentChatConfig {
  conversationId?: string;
  /** 是否启用 Planning 模式 */
  enablePlanning?: boolean;
  /** 是否启用人机确认 */
  enableConfirmation?: boolean;
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

function buildMultimodalContent(
  text: string,
  attachments?: PendingAttachment[]
): string | MultimodalContent[] {
  const imageAttachments = attachments?.filter(a => a.type === 'image' && a.base64) || [];

  if (imageAttachments.length === 0) {
    return text || '';
  }

  const content: MultimodalContent[] = [];

  if (text && text.trim()) {
    content.push({ type: 'text', text });
  }

  for (const attachment of imageAttachments) {
    const mimeType = attachment.mimeType || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${attachment.base64}`;
    content.push({
      type: 'image_url',
      image_url: { url: dataUrl },
    });
  }

  if (imageAttachments.length > 0) {
    content.push({
      type: 'text',
      text: imageAttachments.length === 1
        ? '\n请分析这张图片。如果是收据、发票、账单或消费凭证，请提取信息并帮我记账。'
        : `\n请分析这 ${imageAttachments.length} 张图片。如果是收据、发票等，请提取信息并帮我记账。`,
    });
  }

  return content;
}

// ============ Hook ============

export const useStatefulAgentChat = (config: StatefulAgentChatConfig) => {
  const {
    userId,
    enableStreaming = true,
    conversationId,
    runtimeContext,
    enabledToolNames,
    enablePlanning = true,
    enableConfirmation = true,
    userPreferences,
  } = config;

  // ============ State ============

  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // 状态机状态
  const [agentState, setAgentState] = useState<AgentState>(AgentState.IDLE);

  // 当前执行计划
  const [currentPlan, setCurrentPlan] = useState<ExecutionPlan | null>(null);

  // 等待确认的请求
  const [pendingConfirmation, setPendingConfirmation] = useState<ConfirmationRequest | null>(null);

  // ============ Refs ============

  const agentRef = useRef<StatefulAgent | null>(null);
  const contextRef = useRef(runtimeContext);
  const enabledToolsRef = useRef(enabledToolNames);
  const historyRef = useRef<BaseMessage[]>([]);
  const hasRenderedContentRef = useRef(false);
  const conversationIdRef = useRef<string | null>(conversationId || null);
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ============ 消息存储 ============

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

  // ============ 初始化 ============

  useEffect(() => {
    console.log('🤖 [useStatefulAgentChat] Initializing stateful agent...');
    console.log(`  - Planning: ${enablePlanning ? 'ENABLED' : 'DISABLED'}`);
    console.log(`  - Confirmation: ${enableConfirmation ? 'ENABLED' : 'DISABLED'}`);

    agentRef.current = createStatefulAgent(DEFAULT_API_KEY, {
      runtimeContext,
      enabledToolNames,
      enablePlanning,
      enableConfirmation,
      userPreferences,
    });
    contextRef.current = runtimeContext;
    enabledToolsRef.current = enabledToolNames;
    setIsConnected(true);

    const initializeMessages = async () => {
      if (conversationId) {
        conversationIdRef.current = conversationId;
        const storedMessages = await loadMessagesFromStorage(conversationId);

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

    initializeMessages();

    return () => {
      if (agentRef.current) {
        agentRef.current.cancel(CancellationReason.COMPONENT_UNMOUNTED);
      }
      if (saveDebounceRef.current) {
        clearTimeout(saveDebounceRef.current);
      }
      agentRef.current = null;
    };
  }, [runtimeContext, enablePlanning, enableConfirmation]);

  // ============ 发送消息 ============

  const sendMessage = useCallback(async (content: string, attachments?: Attachment[] | PendingAttachment[]) => {
    if (!content.trim() && (!attachments || attachments.length === 0)) return;

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

    const userMessage: AgentMessage = {
      id: userMsgId,
      type: 'text',
      sender: 'user',
      content: content || (attachments?.length ? '[图片]' : ''),
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
      const messageContent = buildMultimodalContent(content, pendingAttachments);
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

        onPlanGenerated: (plan) => {
          console.log('📋 [Plan] Generated:', plan.description);
          setCurrentPlan(plan);

          // 添加计划消息 - 使用 plan 类型，前端使用 PlanDisplay 组件渲染
          const planMsgId = `plan_${Date.now()}`;
          const planMessage: AgentMessage = {
            id: planMsgId,
            type: 'plan',  // 专门的计划消息类型
            sender: 'assistant',
            content: '',
            timestamp: new Date(),
            metadata: { plan },
          };

          setMessages(prev => {
            const aiIndex = prev.findIndex(m => m.id === aiMsgId);
            if (aiIndex >= 0) {
              return [...prev.slice(0, aiIndex), planMessage, ...prev.slice(aiIndex)];
            }
            return [...prev, planMessage];
          });
        },

        onConfirmationRequired: (request) => {
          console.log('⚠️ [Confirmation] Required:', request.message);
          setPendingConfirmation(request);
        },

        onStep: (step: AgentStepEvent) => {
          console.log('📍 [Step]', step.type, step.content?.substring(0, 50));

          // 状态变化
          if (step.type === 'state_change' && step.state) {
            setAgentState(step.state);
          }

          // 计划消息
          if (step.type === 'planning' && step.plan) {
            // 已在 onPlanGenerated 处理
          }

          // 确认请求
          if (step.type === 'confirmation' && step.confirmationRequest) {
            setPendingConfirmation(step.confirmationRequest);
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
            setMessages(prev => prev.filter(m =>
              m.id !== aiMsgId && !m.id.startsWith('thinking_')
            ));
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

      setIsTyping(false);
      setAgentState(AgentState.COMPLETED);
      setPendingConfirmation(null);
      setCurrentPlan(null);

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
      setAgentState(AgentState.ERROR);
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
    setCurrentPlan(null);
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
    setCurrentPlan(null);

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
    if (conversationIdRef.current && messages.length > 0) {
      await ConversationStorage.saveMessages(conversationIdRef.current, messages);
    }

    conversationIdRef.current = newConversationId;
    const storedMessages = await loadMessagesFromStorage(newConversationId);
    setMessages(storedMessages);

    historyRef.current = storedMessages
      .filter(m => m.type === 'text' && (m.sender === 'user' || m.sender === 'assistant'))
      .map(m => m.sender === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content));

    setAgentState(AgentState.IDLE);
    setCurrentPlan(null);
    setPendingConfirmation(null);
  }, [messages, loadMessagesFromStorage]);

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
    currentPlan,
    pendingConfirmation,
    confirmOperation,
    rejectOperation,
    isAwaitingConfirmation: agentState === AgentState.AWAITING_CONFIRMATION,
  };
};
