/**
 * useStatefulAgentChat Hook
 *
 * 状态机驱动的 Agent 聊天 Hook
 * 
 * 【重构说明】
 * 核心逻辑已迁移至 AgentContext，此 Hook 现在作为 Context 的消费者，
 * 保持 API 兼容性，以便 AgentScreen 无需大幅修改。
 */

import { useEffect } from 'react';
import { useAgent } from '../context/AgentContext';
import { AgentChatConfig } from '../types/agent';
import { ReflectorConfig } from '../agent/statefulAgent';

interface StatefulAgentChatConfig extends AgentChatConfig {
  conversationId?: string;
  enableIntentRewriting?: boolean;
  enableConfirmation?: boolean;
  enableReflection?: boolean;
  reflectorConfig?: Partial<ReflectorConfig>;
  userPreferences?: any;
}

export const useStatefulAgentChat = (config: StatefulAgentChatConfig) => {
  const agentContext = useAgent();
  
  // 监听 conversationId 变化，切换对话
  useEffect(() => {
    if (config.conversationId && config.conversationId !== agentContext.currentConversationId) {
      agentContext.switchToConversation(config.conversationId);
    }
  }, [config.conversationId]);

  return {
    ...agentContext,
    // 保持兼容性，虽然现在是全局单例，不需要在这里初始化
    isInitialized: agentContext.isInitialized,
  };
};
