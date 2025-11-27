/**
 * Agent 请求取消机制
 * 
 * 提供：
 * 1. AbortController 封装
 * 2. 取消状态检查
 * 3. 取消原因追踪
 * 4. 资源清理回调
 */

/**
 * 取消原因
 */
export enum CancellationReason {
  /** 用户手动取消 */
  USER_CANCELLED = 'user_cancelled',
  /** 超时自动取消 */
  TIMEOUT = 'timeout',
  /** 组件卸载取消 */
  COMPONENT_UNMOUNTED = 'component_unmounted',
  /** 新请求取消旧请求 */
  SUPERSEDED = 'superseded',
}

/**
 * 取消错误
 */
export class CancellationError extends Error {
  readonly reason: CancellationReason;
  readonly timestamp: number;
  
  constructor(reason: CancellationReason, message?: string) {
    super(message || `Operation cancelled: ${reason}`);
    this.name = 'CancellationError';
    this.reason = reason;
    this.timestamp = Date.now();
  }
  
  /**
   * 是否是用户主动取消
   */
  isUserCancelled(): boolean {
    return this.reason === CancellationReason.USER_CANCELLED;
  }
}

/**
 * 取消令牌
 * 
 * 用于在异步操作中检查取消状态
 */
export interface CancellationToken {
  /** 是否已取消 */
  readonly isCancelled: boolean;
  /** 取消原因 */
  readonly reason: CancellationReason | null;
  /** AbortSignal（用于 fetch 等原生支持的 API） */
  readonly signal: AbortSignal;
  /** 检查取消状态，如果已取消则抛出 CancellationError */
  throwIfCancelled(): void;
  /** 注册取消时的回调 */
  onCancelled(callback: (reason: CancellationReason) => void): () => void;
}

/**
 * 取消控制器
 * 
 * 用于控制和管理取消操作
 */
export class AgentCancellationController {
  private abortController: AbortController;
  private _reason: CancellationReason | null = null;
  private callbacks: Set<(reason: CancellationReason) => void> = new Set();
  private cleanupCallbacks: Set<() => void> = new Set();
  
  constructor() {
    this.abortController = new AbortController();
  }
  
  /**
   * 获取取消令牌
   */
  get token(): CancellationToken {
    return {
      isCancelled: this.isCancelled,
      reason: this._reason,
      signal: this.abortController.signal,
      throwIfCancelled: () => this.throwIfCancelled(),
      onCancelled: (callback) => this.onCancelled(callback),
    };
  }
  
  /**
   * 是否已取消
   */
  get isCancelled(): boolean {
    return this.abortController.signal.aborted;
  }
  
  /**
   * 取消原因
   */
  get reason(): CancellationReason | null {
    return this._reason;
  }
  
  /**
   * AbortSignal
   */
  get signal(): AbortSignal {
    return this.abortController.signal;
  }
  
  /**
   * 取消操作
   */
  cancel(reason: CancellationReason = CancellationReason.USER_CANCELLED): void {
    if (this.isCancelled) {
      console.warn('🛑 [Cancellation] Already cancelled');
      return;
    }
    
    this._reason = reason;
    console.log(`🛑 [Cancellation] Cancelling with reason: ${reason}`);
    
    // 触发 AbortController
    this.abortController.abort();
    
    // 触发回调
    this.callbacks.forEach(callback => {
      try {
        callback(reason);
      } catch (error) {
        console.error('🛑 [Cancellation] Callback error:', error);
      }
    });
    
    // 执行清理
    this.runCleanup();
  }
  
  /**
   * 检查取消状态，如果已取消则抛出错误
   */
  throwIfCancelled(): void {
    if (this.isCancelled) {
      throw new CancellationError(
        this._reason || CancellationReason.USER_CANCELLED,
        'Operation was cancelled'
      );
    }
  }
  
  /**
   * 注册取消回调
   */
  onCancelled(callback: (reason: CancellationReason) => void): () => void {
    // 如果已经取消，立即触发回调
    if (this.isCancelled && this._reason) {
      callback(this._reason);
    }
    
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }
  
  /**
   * 注册清理回调（取消时执行）
   */
  registerCleanup(cleanup: () => void): () => void {
    this.cleanupCallbacks.add(cleanup);
    return () => this.cleanupCallbacks.delete(cleanup);
  }
  
  /**
   * 执行清理
   */
  private runCleanup(): void {
    this.cleanupCallbacks.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.error('🛑 [Cancellation] Cleanup error:', error);
      }
    });
    this.cleanupCallbacks.clear();
  }
  
  /**
   * 重置控制器（用于新的请求）
   */
  reset(): void {
    if (this.isCancelled) {
      // 清理旧的回调
      this.callbacks.clear();
      this.cleanupCallbacks.clear();
    }
    
    // 创建新的 AbortController
    this.abortController = new AbortController();
    this._reason = null;
  }
}

/**
 * 带取消支持的 Promise 包装
 * 
 * @param promise 原始 Promise
 * @param token 取消令牌
 * @returns 带取消支持的 Promise
 */
export function withCancellation<T>(
  promise: Promise<T>,
  token: CancellationToken
): Promise<T> {
  // 先检查是否已取消
  token.throwIfCancelled();
  
  return new Promise((resolve, reject) => {
    // 监听取消
    const unsubscribe = token.onCancelled((reason) => {
      reject(new CancellationError(reason));
    });
    
    // 执行原始 Promise
    promise
      .then((result) => {
        unsubscribe();
        // 再次检查取消状态
        if (token.isCancelled) {
          reject(new CancellationError(token.reason || CancellationReason.USER_CANCELLED));
        } else {
          resolve(result);
        }
      })
      .catch((error) => {
        unsubscribe();
        reject(error);
      });
  });
}

/**
 * 创建可取消的延迟
 */
export function cancellableDelay(
  ms: number,
  token: CancellationToken
): Promise<void> {
  return new Promise((resolve, reject) => {
    token.throwIfCancelled();
    
    const timeoutId = setTimeout(() => {
      unsubscribe();
      if (token.isCancelled) {
        reject(new CancellationError(token.reason || CancellationReason.USER_CANCELLED));
      } else {
        resolve();
      }
    }, ms);
    
    const unsubscribe = token.onCancelled((reason) => {
      clearTimeout(timeoutId);
      reject(new CancellationError(reason));
    });
  });
}

/**
 * 判断错误是否是取消错误
 */
export function isCancellationError(error: unknown): error is CancellationError {
  return error instanceof CancellationError;
}

/**
 * 判断错误是否是用户取消
 */
export function isUserCancelled(error: unknown): boolean {
  return isCancellationError(error) && error.isUserCancelled();
}
