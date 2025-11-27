/**
 * useConversations Hook - 对话管理
 * 
 * 提供对话列表的 CRUD 操作，自动持久化到本地存储
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Conversation, AgentMessage } from '../types/agent';
import ConversationStorage from '../services/conversationStorage';

interface UseConversationsReturn {
  // 状态
  conversations: Conversation[];
  currentConversationId: string | null;
  isLoading: boolean;
  
  // 对话操作
  createConversation: (title?: string) => Promise<Conversation>;
  deleteConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, newTitle: string) => Promise<void>;
  switchConversation: (id: string) => Promise<void>;
  
  // 消息操作
  loadMessages: (conversationId: string) => Promise<AgentMessage[]>;
  saveMessages: (conversationId: string, messages: AgentMessage[]) => Promise<void>;
  
  // 刷新
  refreshConversations: () => Promise<void>;
}

export const useConversations = (): UseConversationsReturn => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // 防止重复初始化
  const initializedRef = useRef(false);

  /**
   * 初始化：从本地存储加载对话列表
   */
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    const initialize = async () => {
      console.log('🔄 [useConversations] Initializing...');
      setIsLoading(true);
      
      try {
        // 加载对话列表
        let convList = await ConversationStorage.getConversations();
        
        // 如果没有对话，创建一个默认对话
        if (convList.length === 0) {
          console.log('📝 [useConversations] No conversations found, creating default');
          const defaultConv = await ConversationStorage.createConversation('新对话');
          convList = [defaultConv];
        }
        
        setConversations(convList);
        
        // 获取或设置当前对话
        let currentId = await ConversationStorage.getCurrentConversationId();
        if (!currentId || !convList.find(c => c.id === currentId)) {
          currentId = convList[0].id;
          await ConversationStorage.setCurrentConversationId(currentId);
        }
        
        setCurrentConversationId(currentId);
        console.log('✅ [useConversations] Initialized with', convList.length, 'conversations');
        console.log('📍 [useConversations] Current conversation:', currentId);
      } catch (error) {
        console.error('❌ [useConversations] Init error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    initialize();
  }, []);

  /**
   * 刷新对话列表
   */
  const refreshConversations = useCallback(async () => {
    try {
      const convList = await ConversationStorage.getConversations();
      setConversations(convList);
    } catch (error) {
      console.error('❌ [useConversations] Refresh error:', error);
    }
  }, []);

  /**
   * 创建新对话
   */
  const createConversation = useCallback(async (title?: string): Promise<Conversation> => {
    console.log('📝 [useConversations] Creating conversation:', title);
    
    const newConv = await ConversationStorage.createConversation(title);
    
    // 更新状态
    setConversations(prev => [newConv, ...prev]);
    setCurrentConversationId(newConv.id);
    await ConversationStorage.setCurrentConversationId(newConv.id);
    
    return newConv;
  }, []);

  /**
   * 删除对话
   */
  const deleteConversation = useCallback(async (id: string): Promise<void> => {
    console.log('🗑️ [useConversations] Deleting conversation:', id);
    
    await ConversationStorage.deleteConversation(id);
    
    // 更新状态
    setConversations(prev => {
      const filtered = prev.filter(c => c.id !== id);
      
      // 如果删除的是当前对话，切换到第一个
      if (currentConversationId === id && filtered.length > 0) {
        setCurrentConversationId(filtered[0].id);
        ConversationStorage.setCurrentConversationId(filtered[0].id);
      }
      
      return filtered;
    });
  }, [currentConversationId]);

  /**
   * 重命名对话
   */
  const renameConversation = useCallback(async (id: string, newTitle: string): Promise<void> => {
    console.log('✏️ [useConversations] Renaming conversation:', id, '->', newTitle);
    
    await ConversationStorage.updateConversation(id, { title: newTitle });
    
    // 更新状态
    setConversations(prev =>
      prev.map(c => (c.id === id ? { ...c, title: newTitle, updatedAt: new Date() } : c))
    );
  }, []);

  /**
   * 切换对话
   */
  const switchConversation = useCallback(async (id: string): Promise<void> => {
    console.log('🔀 [useConversations] Switching to conversation:', id);
    
    setCurrentConversationId(id);
    await ConversationStorage.setCurrentConversationId(id);
    
    // 将切换到的对话移到列表顶部（可选，表示最近使用）
    setConversations(prev => {
      const target = prev.find(c => c.id === id);
      if (!target) return prev;
      
      const others = prev.filter(c => c.id !== id);
      return [{ ...target, updatedAt: new Date() }, ...others];
    });
  }, []);

  /**
   * 加载对话消息
   */
  const loadMessages = useCallback(async (conversationId: string): Promise<AgentMessage[]> => {
    console.log('📥 [useConversations] Loading messages for:', conversationId);
    return await ConversationStorage.getMessages(conversationId);
  }, []);

  /**
   * 保存对话消息
   */
  const saveMessages = useCallback(async (conversationId: string, messages: AgentMessage[]): Promise<void> => {
    console.log('💾 [useConversations] Saving messages for:', conversationId);
    await ConversationStorage.saveMessages(conversationId, messages);
    
    // 更新对话元数据
    await refreshConversations();
  }, [refreshConversations]);

  return {
    conversations,
    currentConversationId,
    isLoading,
    createConversation,
    deleteConversation,
    renameConversation,
    switchConversation,
    loadMessages,
    saveMessages,
    refreshConversations,
  };
};

export default useConversations;
