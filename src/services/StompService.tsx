/**
 * 🎓 STOMP WebSocket 服务
 *
 * 这是使用 STOMP 协议的新实现
 * 对比 WebSocketService.tsx 可以看到主要差异
 */

import { Client, StompSubscription } from '@stomp/stompjs';
import 'react-native-url-polyfill/auto'; // ← 重要！让 STOMP 在 RN 中工作

// 🔧 修复：添加 TextDecoder polyfill
// React Native 不支持 TextDecoder，需要手动导入
// eslint-disable-next-line @typescript-eslint/no-var-requires
const textEncoding = require('text-encoding');

// 将 polyfill 添加到全局对象
if (typeof (globalThis as any).TextEncoder === 'undefined') {
  (globalThis as any).TextEncoder = textEncoding.TextEncoder;
}
if (typeof (globalThis as any).TextDecoder === 'undefined') {
  (globalThis as any).TextDecoder = textEncoding.TextDecoder;
}

import { WSMessage } from '../types/chat.tsx';




/**
 * 📚 学习要点 1：STOMP 客户端配置
 *
 * STOMP 使用 Client 类，而不是原生的 WebSocket
 * Client 提供了更多高级功能：
 * - 自动重连
 * - 心跳检测
 * - 订阅管理
 * - 消息确认
 */
export class StompService {
  // 🔄 对比：旧代码用 WebSocket，新代码用 STOMP Client
  private client: Client | null = null;

  private url: string;

  // 📝 用户ID - 用于订阅个人消息队列
  private userId: string;

  // 📝 学习要点：订阅管理
  // STOMP 支持多个订阅，每个订阅监听不同的"频道"
  private subscriptions: StompSubscription[] = [];

  // 重连配置
  private reconnectDelay: number = 3000;
  private maxReconnectAttempts: number = 5;

  // 回调函数
  private onMessageCallback: ((message: WSMessage) => void) | null = null;
  private onConnectionChangeCallback: ((status: string) => void) | null = null;

  constructor(url: string, userId: string = '1') {
    this.url = url;
    this.userId = userId;
    console.log('🆔 [STOMP] 用户ID:', userId);
  }

  /**
   * 📚 学习要点 2：连接方式的改变
   *
   * 旧方式（WebSocket）：
   *   this.ws = new WebSocket(url);
   *   this.ws.onopen = () => { };
   *
   * 新方式（STOMP）：
   *   创建 Client → 配置回调 → 激活连接
   */
  connect() {
    try {
      console.log('🔌 [STOMP] 尝试连接到:', this.url);
      console.log('📋 [STOMP] 连接配置:');
      console.log('   - URL:', this.url);
      console.log('   - User ID:', this.userId);
      console.log('   - 重连延迟:', this.reconnectDelay + 'ms');

      // 创建 STOMP 客户端
      this.client = new Client({
        // WebSocket 连接地址
        //brokerURL: this.url,
        brokerURL: 'ws://10.0.2.2:8080/ws',

        // 📚 学习要点：连接超时
        // 增加到 15 秒，给后端更多时间响应
        connectionTimeout: 5000,

        // 📚 学习要点：心跳配置
        // STOMP 自动发送心跳，保持连接活跃
        // ⚠️ 重要：必须启用心跳，否则某些服务器会拒绝连接
        heartbeatIncoming: 10000,  // 期望服务器每 10 秒发送心跳
        heartbeatOutgoing: 10000,  // 客户端每 10 秒发送心跳

        // 📚 学习要点：重连配置
        // STOMP 自动处理重连，无需手动编码
        reconnectDelay: this.reconnectDelay,

        // ✅ 连接成功回调
        onConnect: (frame) => {
          console.log('✅ [STOMP] 连接成功!', frame);
          console.log('📋 [STOMP] Frame headers:', frame.headers);
          this.onConnectionChangeCallback?.('connected');

          // 📚 学习要点 3：订阅消息
          // 连接成功后，订阅我们需要的"频道"
          this.setupSubscriptions();
        },

        // ❌ 连接断开回调
        onDisconnect: (frame) => {
          console.log('🔌 [STOMP] 连接断开', frame);
          this.onConnectionChangeCallback?.('disconnected');
          this.cleanupSubscriptions();
        },

        // ⚠️ STOMP 错误回调
        onStompError: (frame) => {
          console.error('❌ [STOMP] 错误:', frame.headers['message']);
          console.error('详细信息:', frame.body);
          console.error('Frame headers:', frame.headers);
          this.onConnectionChangeCallback?.('error');
        },

        // 🐛 WebSocket 错误回调
        onWebSocketError: (event) => {
          console.error('❌ [WebSocket] 错误:', event);
        },

        // 🔒 WebSocket 关闭回调
        onWebSocketClose: (event) => {
          console.log('🔒 [WebSocket] 连接关闭');
          console.log('   Code:', event.code);
          console.log('   Reason:', event.reason);
          console.log('   Was Clean:', event.wasClean);

          // 分析关闭原因
          if (event.code === 1006) {
            console.error('⚠️ [STOMP] 连接异常关闭 (1006)');
          }
        },

        // 📝 调试：打开详细日志
        debug: (str) => {
          console.log('[STOMP Debug]', str);
        },
      });

      // 🚀 激活连接（重要！）
      // 旧代码：WebSocket 创建后自动连接
      // 新代码：需要调用 activate() 激活
      this.client.activate();

    } catch (error) {
      console.error('❌ [STOMP] 创建客户端失败:', error);
      this.onConnectionChangeCallback?.('error');
    }
  }

  /**
   * 📚 学习要点 3：设置订阅
   *
   * STOMP 的核心概念：订阅（Subscribe）
   * 类似于"关注"某个频道，服务器会把消息推送给你
   */
  private setupSubscriptions() {
    if (!this.client) {
      return;
    }

    console.log('📡 [STOMP] 设置消息订阅...');

    // 📚 订阅个人消息队列
    // 路径格式：/queue/messages/{userId}
    // 匹配后端：messagingTemplate.convertAndSend("/queue/messages/" + userId, response);
    const queuePath = `/queue/messages/${this.userId}`;
    console.log('� [STOMP] 订阅路径:', queuePath);

    const privateSubscription = this.client.subscribe(
      queuePath,
      (message) => {
        console.log('� [STOMP] 收到消息:', message.body);
        this.handleIncomingMessage(message.body);
      }
    );
    this.subscriptions.push(privateSubscription);

    console.log('✅ [STOMP] 订阅设置完成，共', this.subscriptions.length, '个订阅');

    // 📚 学习提示：
    // 您可以根据后端配置调整订阅路径
    // 常见的路径模式：
    // - /user/queue/xxx  → 用户私有队列
    // - /topic/xxx       → 公共主题（广播）
    // - /queue/xxx       → 共享队列
  }

  /**
   * 📚 学习要点：处理接收到的消息
   *
   * 后端 ChatResponse 格式：
   * {
   *   messageId: string,
   *   content: string,
   *   type: 'START' | 'CHUNK' | 'END' | 'ERROR',
   *   isFinal: boolean,
   *   error?: string,
   *   timestamp: number
   * }
   */
  private handleIncomingMessage(messageBody: string) {
    try {
      const chatResponse = JSON.parse(messageBody);
      console.log('📦 [STOMP] 解析的消息:', chatResponse);

      // 根据消息类型处理
      if (chatResponse.type === 'START') {
        console.log('▶️ [STOMP] AI 开始回复');
        // 可以显示"正在输入..."
        this.onMessageCallback?.({
          type: 'typing',
          content: '',
          timestamp: chatResponse.timestamp,
        });
      } else if (chatResponse.type === 'CHUNK' && chatResponse.content) {
        console.log('📝 [STOMP] 收到内容块:', chatResponse.content);
        // 流式传输的内容块
        this.onMessageCallback?.({
          type: 'message',
          content: chatResponse.content,
          timestamp: chatResponse.timestamp,
        });
      } else if (chatResponse.type === 'END') {
        console.log('⏹️ [STOMP] AI 回复结束');
        // 消息传输结束
      } else if (chatResponse.type === 'ERROR') {
        console.error('❌ [STOMP] 收到错误消息:', chatResponse.error);
        this.onMessageCallback?.({
          type: 'error',
          content: chatResponse.error || 'Unknown error',
          timestamp: chatResponse.timestamp,
        });
      }

    } catch (error) {
      console.error('❌ [STOMP] 解析消息失败:', error);
    }
  }

  /**
   * 📚 学习要点 4：发送消息
   *
   * 旧方式（WebSocket）：
   *   this.ws.send(JSON.stringify(message));
   *
   * 新方式（STOMP）：
   *   使用 publish() 发送到指定的"目的地"
   */
  sendMessage(content: string) {
    if (!this.client || !this.client.connected) {
      console.error('❌ [STOMP] 未连接，无法发送消息');
      return;
    }

    try {
      // 📚 学习要点：构造符合后端的消息格式
      // 后端期望的格式：ChatRequest { userId, message, messageId }
      const chatRequest = {
        userId: this.userId,
        message: content,
        messageId: this.generateMessageId(),
      };

      // 📚 学习要点：发布消息
      // destination - 目的地，告诉服务器这个消息要发到哪里
      // 匹配后端：@MessageMapping("/chat") → /app/chat
      this.client.publish({
        destination: '/app/chat',  // ← 后端的 @MessageMapping("/chat")
        body: JSON.stringify(chatRequest),
      });

      console.log('✅ [STOMP] 消息已发送到 /app/chat:', chatRequest);

      // 📚 学习提示：
      // destination 的前缀 /app 是后端配置的
      // 参考后端：registry.setApplicationDestinationPrefixes("/app")

    } catch (error) {
      console.error('❌ [STOMP] 发送消息失败:', error);
    }
  }

  /**
   * 生成消息ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 📚 学习要点：发送广播消息（可选）
   *
   * 这是一个额外的示例，展示如何发送群消息
   */
  broadcastMessage(content: string) {
    if (!this.client || !this.client.connected) {
      console.error('❌ [STOMP] 未连接，无法广播消息');
      return;
    }

    try {
      const message: WSMessage = {
        type: 'broadcast',
        content,
        timestamp: Date.now(),
      };

      // 发送到广播端点
      this.client.publish({
        destination: '/app/chat.broadcast',  // ← 广播端点
        body: JSON.stringify(message),
      });

      console.log('📢 [STOMP] 广播消息已发送');

    } catch (error) {
      console.error('❌ [STOMP] 广播失败:', error);
    }
  }

  /**
   * 清理订阅
   */
  private cleanupSubscriptions() {
    console.log('🧹 [STOMP] 清理订阅...');
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
  }

  /**
   * 注册消息回调
   */
  onMessage(callback: (message: WSMessage) => void) {
    this.onMessageCallback = callback;
  }

  /**
   * 注册连接状态回调
   */
  onConnectionChange(callback: (status: string) => void) {
    this.onConnectionChangeCallback = callback;
  }

  /**
   * 📚 学习要点：断开连接
   *
   * STOMP 使用 deactivate() 而不是 close()
   */
  disconnect() {
    console.log('🔌 [STOMP] 主动断开连接');

    if (this.client) {
      // 清理订阅
      this.cleanupSubscriptions();

      // 停用客户端
      this.client.deactivate();

      this.client = null;
    }
  }

  /**
   * 📚 学习要点：检查连接状态
   */
  isConnected(): boolean {
    return this.client?.connected ?? false;
  }
}

/**
 * 📚 总结：主要差异
 *
 * 1. 连接方式：
 *    WebSocket: new WebSocket() + 事件监听
 *    STOMP: new Client() + 配置对象 + activate()
 *
 * 2. 接收消息：
 *    WebSocket: ws.onmessage 接收所有消息
 *    STOMP: client.subscribe() 订阅特定频道
 *
 * 3. 发送消息：
 *    WebSocket: ws.send() 发送字符串
 *    STOMP: client.publish() 发送到指定目的地
 *
 * 4. 重连：
 *    WebSocket: 需要手动实现
 *    STOMP: 自动处理（通过 reconnectDelay）
 *
 * 5. 心跳：
 *    WebSocket: 需要手动实现
 *    STOMP: 自动处理（通过 heartbeat 配置）
 */
