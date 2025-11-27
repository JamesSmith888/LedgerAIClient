/**
 * ConversationStorage - 对话本地存储服务
 * 
 * 使用 AsyncStorage 将对话数据持久化到手机本地
 * 不依赖服务器，完全离线可用
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Conversation, AgentMessage } from '../types/agent';

// 存储 Key 前缀
const STORAGE_KEYS = {
  CONVERSATIONS_LIST: '@ledger_conversations_list',      // 对话列表元数据
  CONVERSATION_MESSAGES: '@ledger_conv_messages_',       // 对话消息前缀，后面跟对话 ID
  CURRENT_CONVERSATION_ID: '@ledger_current_conv_id',    // 当前活跃的对话 ID
};

/**
 * 序列化对话数据（处理 Date 对象）
 */
const serializeConversation = (conv: Conversation): string => {
  return JSON.stringify({
    ...conv,
    createdAt: conv.createdAt.toISOString(),
    updatedAt: conv.updatedAt.toISOString(),
  });
};

/**
 * 反序列化对话数据
 */
const deserializeConversation = (json: string): Conversation => {
  const data = JSON.parse(json);
  return {
    ...data,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  };
};

/**
 * 序列化消息列表
 */
const serializeMessages = (messages: AgentMessage[]): string => {
  return JSON.stringify(messages.map(msg => ({
    ...msg,
    timestamp: msg.timestamp.toISOString(),
  })));
};

/**
 * 反序列化消息列表
 */
const deserializeMessages = (json: string): AgentMessage[] => {
  const data = JSON.parse(json);
  return data.map((msg: any) => ({
    ...msg,
    timestamp: new Date(msg.timestamp),
  }));
};

/**
 * 对话存储服务
 */
export const ConversationStorage = {
  /**
   * 获取所有对话列表
   */
  async getConversations(): Promise<Conversation[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.CONVERSATIONS_LIST);
      if (!json) return [];
      
      const list: string[] = JSON.parse(json);
      return list.map(deserializeConversation);
    } catch (error) {
      console.error('❌ [ConversationStorage] Failed to get conversations:', error);
      return [];
    }
  },

  /**
   * 保存对话列表
   */
  async saveConversations(conversations: Conversation[]): Promise<void> {
    try {
      const list = conversations.map(serializeConversation);
      await AsyncStorage.setItem(STORAGE_KEYS.CONVERSATIONS_LIST, JSON.stringify(list));
      console.log('✅ [ConversationStorage] Saved', conversations.length, 'conversations');
    } catch (error) {
      console.error('❌ [ConversationStorage] Failed to save conversations:', error);
    }
  },

  /**
   * 创建新对话
   */
  async createConversation(title?: string): Promise<Conversation> {
    const conversations = await this.getConversations();
    
    const newConv: Conversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      title: title || `对话 ${conversations.length + 1}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      messageCount: 0,
      preview: undefined,
    };
    
    // 新对话放在列表最前面
    await this.saveConversations([newConv, ...conversations]);
    
    console.log('✅ [ConversationStorage] Created conversation:', newConv.id);
    return newConv;
  },

  /**
   * 更新对话元数据
   */
  async updateConversation(id: string, updates: Partial<Conversation>): Promise<void> {
    const conversations = await this.getConversations();
    const index = conversations.findIndex(c => c.id === id);
    
    if (index === -1) {
      console.warn('⚠️ [ConversationStorage] Conversation not found:', id);
      return;
    }
    
    conversations[index] = {
      ...conversations[index],
      ...updates,
      updatedAt: new Date(),
    };
    
    await this.saveConversations(conversations);
  },

  /**
   * 删除对话及其消息
   */
  async deleteConversation(id: string): Promise<void> {
    try {
      // 删除消息
      await AsyncStorage.removeItem(STORAGE_KEYS.CONVERSATION_MESSAGES + id);
      
      // 从列表中移除
      const conversations = await this.getConversations();
      const filtered = conversations.filter(c => c.id !== id);
      await this.saveConversations(filtered);
      
      console.log('✅ [ConversationStorage] Deleted conversation:', id);
    } catch (error) {
      console.error('❌ [ConversationStorage] Failed to delete conversation:', error);
    }
  },

  /**
   * 获取对话的消息列表
   */
  async getMessages(conversationId: string): Promise<AgentMessage[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.CONVERSATION_MESSAGES + conversationId);
      if (!json) return [];
      
      return deserializeMessages(json);
    } catch (error) {
      console.error('❌ [ConversationStorage] Failed to get messages:', error);
      return [];
    }
  },

  /**
   * 保存对话的消息列表
   */
  async saveMessages(conversationId: string, messages: AgentMessage[]): Promise<void> {
    try {
      const json = serializeMessages(messages);
      await AsyncStorage.setItem(STORAGE_KEYS.CONVERSATION_MESSAGES + conversationId, json);
      
      // 同时更新对话元数据
      const lastMessage = messages[messages.length - 1];
      await this.updateConversation(conversationId, {
        messageCount: messages.length,
        preview: lastMessage?.content?.substring(0, 50) || undefined,
      });
      
      console.log('✅ [ConversationStorage] Saved', messages.length, 'messages for', conversationId);
    } catch (error) {
      console.error('❌ [ConversationStorage] Failed to save messages:', error);
    }
  },

  /**
   * 追加消息到对话（优化性能，避免重复读写整个消息列表）
   */
  async appendMessages(conversationId: string, newMessages: AgentMessage[]): Promise<void> {
    const existing = await this.getMessages(conversationId);
    const all = [...existing, ...newMessages];
    await this.saveMessages(conversationId, all);
  },

  /**
   * 获取当前对话 ID
   */
  async getCurrentConversationId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_CONVERSATION_ID);
    } catch (error) {
      console.error('❌ [ConversationStorage] Failed to get current conversation ID:', error);
      return null;
    }
  },

  /**
   * 设置当前对话 ID
   */
  async setCurrentConversationId(id: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_CONVERSATION_ID, id);
    } catch (error) {
      console.error('❌ [ConversationStorage] Failed to set current conversation ID:', error);
    }
  },

  /**
   * 清空所有对话数据（用于调试或重置）
   */
  async clearAll(): Promise<void> {
    try {
      const conversations = await this.getConversations();
      
      // 删除所有对话消息
      const keys = conversations.map(c => STORAGE_KEYS.CONVERSATION_MESSAGES + c.id);
      keys.push(STORAGE_KEYS.CONVERSATIONS_LIST);
      keys.push(STORAGE_KEYS.CURRENT_CONVERSATION_ID);
      
      await AsyncStorage.multiRemove(keys);
      console.log('✅ [ConversationStorage] Cleared all conversation data');
    } catch (error) {
      console.error('❌ [ConversationStorage] Failed to clear all:', error);
    }
  },

  /**
   * 获取存储使用情况（调试用）
   */
  async getStorageInfo(): Promise<{ conversationCount: number; totalMessages: number }> {
    try {
      const conversations = await this.getConversations();
      let totalMessages = 0;
      
      for (const conv of conversations) {
        const messages = await this.getMessages(conv.id);
        totalMessages += messages.length;
      }
      
      return {
        conversationCount: conversations.length,
        totalMessages,
      };
    } catch (error) {
      console.error('❌ [ConversationStorage] Failed to get storage info:', error);
      return { conversationCount: 0, totalMessages: 0 };
    }
  },
};

export default ConversationStorage;
