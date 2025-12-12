/**
 * 简单的事件发射器
 * 用于跨组件通信（如 AI Agent 工具创建数据后通知 Context 刷新）
 */

type EventCallback = (...args: any[]) => void;

class EventEmitter {
  private events: Map<string, Set<EventCallback>> = new Map();

  /**
   * 订阅事件
   */
  on(event: string, callback: EventCallback): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(callback);

    // 返回取消订阅函数
    return () => {
      this.events.get(event)?.delete(callback);
    };
  }

  /**
   * 发射事件
   */
  emit(event: string, ...args: any[]): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`[EventEmitter] Error in callback for event "${event}":`, error);
        }
      });
    }
  }

  /**
   * 移除所有事件监听
   */
  clear(): void {
    this.events.clear();
  }
}

// 全局单例
export const appEventEmitter = new EventEmitter();

// 事件名称常量
export const AppEvents = {
  /** 分类数据变更（创建/更新/删除） */
  CATEGORY_CHANGED: 'category:changed',
  /** 支付方式数据变更 */
  PAYMENT_METHOD_CHANGED: 'paymentMethod:changed',
  /** 交易数据变更 */
  TRANSACTION_CHANGED: 'transaction:changed',
} as const;
