/**
 * 🎓 useGiftedChat Hook - STOMP 版本
 *
 * 这个文件展示如何将 Hook 从 WebSocketService 迁移到 StompService
 *
 * 主要变化：
 * 1. 导入 StompService 替代 WebSocketService
 * 2. 其他逻辑保持不变（这是 STOMP 的优势！）
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { IMessage } from 'react-native-gifted-chat';
import { StompService } from '../services/StompService.tsx'; // ← 唯一的导入变化！
import { WSMessage } from '../types/chat.tsx';

// 当前用户配置
const CURRENT_USER = {
  _id: 1,
  name: 'me',
  avatar: 'https://placehold.co/100x100/png?text=Me',
};

// AI 用户配置
const AI_USER = {
  _id: 2,
  name: 'AI',
  avatar: 'https://placehold.co/100x100/0ea5e9/white/png?text=AI',
};

/**
 * 📚 学习要点：Hook 的迁移非常简单
 *
 * 因为 StompService 和 WebSocketService 提供了相同的 API：
 * - connect()
 * - disconnect()
 * - sendMessage()
 * - onMessage()
 * - onConnectionChange()
 *
 * 所以 Hook 几乎不需要修改！这就是好的抽象设计。
 */
export const useGiftedChat = (wsUrl: string, token?: string | null, userId?: string | number) => {
  // 消息列表
  const [messages, setMessages] = useState<IMessage[]>([]);

  // 连接状态
  const [isConnected, setIsConnected] = useState(false);

  // AI 输入状态
  const [isTyping, setIsTyping] = useState(false);

  const wsService = useRef<StompService | null>(null);
  // 用户跟踪当前正在流式传输的消息
  const currentAIMessageRef = useRef<IMessage | null>(null);

  /**
   * 初始化 STOMP 连接
   *
   * 📚 学习要点：除了类名，其他代码完全一样
   */
  useEffect(() => {
    console.log('🎣 [Hook] 初始化 STOMP 连接...');

    // 创建 StompService 实例
    wsService.current = new StompService(wsUrl, userId, token); // ← 传递 token

    // 📚 学习要点：监听消息的方式完全相同
    wsService.current.onMessage((wsMessage: WSMessage) => {
      console.log('📨 [Hook] 收到 WebSocket 消息:', wsMessage);

      // 处理 START 消息 - 创建一个空的 AI 消息
      if (wsMessage.type === 'typing') {
        console.log('⌨️ [Hook] AI 开始回复，创建空消息框...');

        // 创建一个空消息
        const emptyMessage: IMessage = {
          _id: `ai_${Date.now()}`, // 固定的 ID，不会变
          text: '', // 初始为空
          createdAt: new Date(),
          user: AI_USER,
        };

        // 保存到 ref
        currentAIMessageRef.current = emptyMessage;

        // 添加到消息列表
        setMessages(previousMessages => [emptyMessage, ...previousMessages]);
        setIsTyping(true);
      }
      // 处理 CHUNK 消息 - 更新现有消息
      else if (wsMessage.type === 'message' && wsMessage.content) {
        console.log('💬 [Hook] 收到 AI chunk:', wsMessage.content);

        // 保存当前消息 ID，避免在异步更新时 ref 被清空
        const messageId = currentAIMessageRef.current?._id;

        // 更新现有消息的文本
        if (messageId) {
          setMessages(previousMessages => {
            // 找到对应的消息
            const updatedMessages = [...previousMessages];
            const messageIndex = updatedMessages.findIndex(
              msg => msg._id === messageId,
            );

            if (messageIndex !== -1) {
              // 追加新内容
              updatedMessages[messageIndex] = {
                ...updatedMessages[messageIndex],
                text: updatedMessages[messageIndex].text + wsMessage.content, // 关键：追加而不是替换
              };
            }
            return updatedMessages;
          });
        }
      }
      // 处理 END 消息 - 清理
      else if (wsMessage.type === 'end') {
        console.log('✅ [Hook] AI 回复完成');
        currentAIMessageRef.current = null;
        setIsTyping(false);
      }
      // 处理 ERROR 消息
      else if (wsMessage.type === 'error') {
        console.error('❌ [Hook] AI 回复错误:', wsMessage.content);
        currentAIMessageRef.current = null;
        setIsTyping(false);
      }
    });

    // 📚 学习要点：监听连接状态的方式完全相同
    wsService.current.onConnectionChange(status => {
      console.log('🔌 [Hook] 连接状态变化:', status);
      setIsConnected(status === 'connected');
    });

    // 建立连接
    wsService.current.connect();

    // 添加欢迎消息
    const welcomeMessage: IMessage = {
      _id: 'welcome-' + Date.now(),
      text: 'Hello! I am your AI assistant. How can I help you today? 🤖',
      createdAt: new Date(),
      user: AI_USER,
    };
    setMessages([welcomeMessage]);

    // 清理函数
    return () => {
      console.log('🧹 [Hook] 清理：断开 STOMP 连接');
      wsService.current?.disconnect();
    };
  }, [wsUrl, token, userId]);

  /**
   * 发送用户消息
   *
   * 📚 学习要点：发送逻辑完全不需要改变
   * StompService.sendMessage() 的接口和 WebSocketService 一样
   */
  const onSend = useCallback((newMessages: IMessage[] = []) => {
    if (newMessages.length === 0) {
      console.warn('⚠️ [Hook] 没有消息需要发送');
      return;
    }

    console.log('📤 [Hook] 发送用户消息:', newMessages[0].text);

    // 1. 添加用户消息到 UI
    setMessages(previousMessages => [...newMessages, ...previousMessages]);

    // 2. 通过 STOMP 发送到服务器
    if (wsService.current) {
      wsService.current.sendMessage(newMessages[0].text);

      // 3. 显示 AI 正在输入
      setIsTyping(true);
    } else {
      console.error('❌ [Hook] STOMP 服务未初始化');
    }
  }, []);

  /**
   * 📚 学习要点：返回值完全不变
   *
   * Hook 的使用者（GiftedChatScreen）不需要知道底层是用
   * WebSocket 还是 STOMP，这就是好的封装！
   */
  return {
    messages, // 消息列表
    onSend, // 发送消息回调
    isConnected, // 连接状态
    isTyping, // AI 输入状态
    currentUser: CURRENT_USER, // 当前用户信息
  };
};

/**
 * 📚 总结：Hook 迁移的变化
 *
 * 只需要修改 2 个地方：
 * 1. 导入语句：WebSocketService → StompService
 * 2. 类型声明：useRef<WebSocketService> → useRef<StompService>
 *
 * 其他代码完全不需要改变！
 *
 * 为什么这么简单？
 * - 因为两个 Service 提供了相同的 API
 * - 这就是"接口一致性"的好处
 * - 底层实现变了，但接口不变
 */
