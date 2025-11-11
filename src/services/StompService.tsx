/**
 * 🎓 STOMP WebSocket 服务
 *
 * React Native 环境下的 STOMP 协议实现
 *
 * 【核心问题】
 * React Native 的 WebSocket 在发送文本帧时会截断 NULL 字节（\x00），
 * 而 STOMP 协议要求每个帧必须以 NULL 字节结尾。
 *
 * 【解决方案】
 * 使用 WebSocket 包装器拦截 send() 方法，将 STOMP 帧转换为二进制帧发送，
 * 从而保留 NULL 终止符，确保后端能正确解析 STOMP 帧。
 */

import { Client, StompSubscription } from '@stomp/stompjs';
import 'react-native-url-polyfill/auto';
import { WSMessage } from '../types/chat.tsx';

// 配置必要的 polyfills
// eslint-disable-next-line @typescript-eslint/no-var-requires
const textEncoding = require('text-encoding');

if (typeof (globalThis as any).TextEncoder === 'undefined') {
  (globalThis as any).TextEncoder = textEncoding.TextEncoder;
}
if (typeof (globalThis as any).TextDecoder === 'undefined') {
  (globalThis as any).TextDecoder = textEncoding.TextDecoder;
}

/**
 * React Native WebSocket 包装器
 *
 * 问题：RN 的 WebSocket 文本帧会截断 NULL 字节
 * 解决：拦截 STOMP 帧，转换为二进制帧发送
 */
class RNWebSocketWrapper {
  private ws: WebSocket;

  constructor(url: string) {
    this.ws = new WebSocket(url);
  }

  // 代理 WebSocket 属性
  get readyState() { return this.ws.readyState; }
  get url() { return (this.ws as any).url; }
  get protocol() { return (this.ws as any).protocol; }
  get binaryType() { return (this.ws as any).binaryType; }
  set binaryType(value: any) { (this.ws as any).binaryType = value; }

  // 代理事件处理器
  set onopen(handler: any) { this.ws.onopen = handler; }
  set onclose(handler: any) { this.ws.onclose = handler; }
  set onerror(handler: any) { this.ws.onerror = handler; }
  set onmessage(handler: any) { this.ws.onmessage = handler; }

  get onopen() { return this.ws.onopen; }
  get onclose() { return this.ws.onclose; }
  get onerror() { return this.ws.onerror; }
  get onmessage() { return this.ws.onmessage; }

  /**
   * 拦截 send 方法
   * 将 STOMP 帧转换为二进制发送以保留 NULL 终止符
   */
  send(data: string | ArrayBuffer | Blob) {
    if (typeof data === 'string' && this.isStompFrame(data)) {
      // 转换为二进制帧
      const encoder = new (globalThis as any).TextEncoder();
      const buffer = encoder.encode(data);
      this.ws.send(buffer);
    } else {
      this.ws.send(data);
    }
  }

  /**
   * 检测是否为 STOMP 帧
   */
  private isStompFrame(data: string): boolean {
    return /^(CONNECT|SEND|SUBSCRIBE|UNSUBSCRIBE|BEGIN|COMMIT|ABORT|ACK|NACK|DISCONNECT)/.test(data);
  }

  close(code?: number, reason?: string) {
    this.ws.close(code, reason);
  }

  addEventListener(type: string, listener: any) {
    (this.ws as any).addEventListener(type, listener);
  }

  removeEventListener(type: string, listener: any) {
    (this.ws as any).removeEventListener(type, listener);
  }
}

/**
 * STOMP 服务类
 * 管理 WebSocket 连接、消息订阅和发送
 */
export class StompService {
  private client: Client | null = null;
  private url: string;
  private userId?: string | number;
  private subscriptions: StompSubscription[] = [];
  private reconnectDelay: number = 3000;
  private token: string | null = null;

  // 回调函数
  private onMessageCallback: ((message: WSMessage) => void) | null = null;
  private onConnectionChangeCallback: ((status: string) => void) | null = null;

  constructor(url: string, userId?: string | number, token?: string | null) {
    this.url = url;
    this.userId = userId;
    this.token = token || null;
  }

  /**
   * 建立 STOMP 连接
   */
  connect() {
    try {
      this.client = new Client({
        brokerURL: this.url,

        // 使用包装器确保 STOMP 帧正确发送
        webSocketFactory: () => new RNWebSocketWrapper(this.url) as any,

        connectionTimeout: 15000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        reconnectDelay: this.reconnectDelay,

        onConnect: (frame) => {
          console.log('✅ [STOMP] 连接成功');
          this.onConnectionChangeCallback?.('connected');
          this.setupSubscriptions();
        },

        onDisconnect: (frame) => {
          console.log('🔌 [STOMP] 连接断开');
          this.onConnectionChangeCallback?.('disconnected');
          this.cleanupSubscriptions();
        },

        onStompError: (frame) => {
          console.error('❌ [STOMP] 错误:', frame.headers['message']);
          this.onConnectionChangeCallback?.('error');
        },

        onWebSocketError: (event) => {
          console.error('❌ [WebSocket] 错误:', event);
        },

        onWebSocketClose: (event) => {
          console.log('🔒 [WebSocket] 连接关闭');
          if (event.code === 1006) {
            console.error('⚠️ 连接异常关闭');
          }
        },
      });

      this.client.activate();
    } catch (error) {
      console.error('❌ [STOMP] 创建客户端失败:', error);
      this.onConnectionChangeCallback?.('error');
    }
  }

  /**
   * 设置消息订阅
   */
  private setupSubscriptions() {
    if (!this.client) return;

    const queuePath = `/queue/messages/${this.userId}`;
    console.log('📡 [STOMP] 订阅:', queuePath);

    const subscription = this.client.subscribe(queuePath, (message) => {
      this.handleIncomingMessage(message.body);
    });

    this.subscriptions.push(subscription);
  }

  /**
   * 处理接收到的消息
   */
  private handleIncomingMessage(messageBody: string) {
    try {
      const chatResponse = JSON.parse(messageBody);

      switch (chatResponse.type) {
        case 'START':
          this.onMessageCallback?.({
            type: 'typing',
            content: '',
            timestamp: chatResponse.timestamp,
          });
          break;
        case 'CHUNK':
          if (chatResponse.content) {
            this.onMessageCallback?.({
              type: 'message',
              content: chatResponse.content,
              timestamp: chatResponse.timestamp,
            });
          }
          break;
        case 'ERROR':
          this.onMessageCallback?.({
            type: 'error',
            content: chatResponse.error || 'Unknown error',
            timestamp: chatResponse.timestamp,
          });
          break;
        case 'END':
          this.onMessageCallback?.({
            type: 'end',
            content: '',
            timestamp: chatResponse.timestamp,
          });
      }
    } catch (error) {
      console.error('❌ [STOMP] 解析消息失败:', error);
    }
  }

  /**
   * 发送消息
   */
  sendMessage(content: string) {
    if (!this.client?.connected) {
      console.error('❌ [STOMP] 未连接，无法发送消息');
      return;
    }

    const chatRequest = {
      userId: this.userId,
      message: content,
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      token: this.token,
    };

    this.client.publish({
      destination: '/app/chat/stream',
      body: JSON.stringify(chatRequest),
    });
  }

  /**
   * 清理订阅
   */
  private cleanupSubscriptions() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
  }

  /**
   * 注册回调
   */
  onMessage(callback: (message: WSMessage) => void) {
    this.onMessageCallback = callback;
  }

  onConnectionChange(callback: (status: string) => void) {
    this.onConnectionChangeCallback = callback;
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.client) {
      this.cleanupSubscriptions();
      this.client.deactivate();
      this.client = null;
    }
  }

  /**
   * 检查连接状态
   */
  isConnected(): boolean {
    return this.client?.connected ?? false;
  }
}
