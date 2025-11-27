/**
 * 重试与超时控制工具
 * 
 * 提供指数退避重试和超时控制功能，用于：
 * 1. LLM 调用的重试和超时
 * 2. 工具执行的超时保护
 * 3. API 请求的重试
 */

/**
 * 重试配置
 */
export interface RetryConfig {
  /** 最大重试次数 */
  maxRetries: number;
  /** 初始延迟时间（毫秒） */
  initialDelayMs: number;
  /** 最大延迟时间（毫秒） */
  maxDelayMs: number;
  /** 退避乘数 */
  backoffMultiplier: number;
  /** 可重试的错误关键词 */
  retryableErrors: string[];
  /** 重试回调（用于日志或状态更新） */
  onRetry?: (attempt: number, error: Error, nextDelayMs: number) => void;
}

/**
 * 默认重试配置
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableErrors: [
    // 网络错误
    'NETWORK_ERROR',
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'fetch failed',
    'network',
    
    // 速率限制
    'RATE_LIMIT',
    'rate limit',
    '429',
    'Too Many Requests',
    'quota',
    
    // 服务端错误
    'SERVICE_UNAVAILABLE',
    '500',
    '502',
    '503',
    '504',
    'Internal Server Error',
    'Bad Gateway',
    'Service Unavailable',
    
    // Google AI SDK 特定错误
    'reduce',
    'mapGenerateContentResult',
    'RECITATION',
  ],
};

/**
 * LLM 调用专用重试配置
 */
export const LLM_RETRY_CONFIG: RetryConfig = {
  ...DEFAULT_RETRY_CONFIG,
  maxRetries: 2,
  initialDelayMs: 2000,
  maxDelayMs: 15000,
};

/**
 * API 调用专用重试配置
 */
export const API_RETRY_CONFIG: RetryConfig = {
  ...DEFAULT_RETRY_CONFIG,
  maxRetries: 3,
  initialDelayMs: 500,
  maxDelayMs: 10000,
};

/**
 * 判断错误是否可重试
 */
export function isRetryableError(error: Error, config: RetryConfig): boolean {
  const errorMessage = error.message.toLowerCase();
  return config.retryableErrors.some(keyword => 
    errorMessage.includes(keyword.toLowerCase())
  );
}

/**
 * 计算下一次重试的延迟时间（指数退避 + 抖动）
 */
export function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig
): number {
  // 指数退避
  const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  
  // 添加随机抖动（±30%）防止多个请求同时重试
  const jitter = exponentialDelay * (0.7 + Math.random() * 0.6);
  
  // 限制最大延迟
  return Math.min(jitter, config.maxDelayMs);
}

/**
 * 延迟执行
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 带指数退避的重试包装器
 * 
 * @param operation 要执行的异步操作
 * @param config 重试配置
 * @returns 操作结果
 * @throws 如果所有重试都失败，抛出最后一个错误
 * 
 * @example
 * ```typescript
 * const result = await withRetry(
 *   () => model.invoke(messages),
 *   LLM_RETRY_CONFIG
 * );
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // 检查是否是最后一次尝试
      const isLastAttempt = attempt === finalConfig.maxRetries;
      
      // 检查错误是否可重试
      const canRetry = isRetryableError(lastError, finalConfig);
      
      if (isLastAttempt || !canRetry) {
        // 不可重试或已达最大重试次数，直接抛出
        throw lastError;
      }
      
      // 计算延迟并等待
      const delayMs = calculateBackoffDelay(attempt, finalConfig);
      
      // 触发重试回调
      if (finalConfig.onRetry) {
        finalConfig.onRetry(attempt + 1, lastError, delayMs);
      } else {
        console.warn(
          `⚠️ [Retry] Attempt ${attempt + 1}/${finalConfig.maxRetries} failed: ${lastError.message}. ` +
          `Retrying in ${Math.round(delayMs)}ms...`
        );
      }
      
      await delay(delayMs);
    }
  }

  // 理论上不会到达这里，但 TypeScript 需要
  throw lastError || new Error('Unknown error during retry');
}

/**
 * 超时错误
 */
export class TimeoutError extends Error {
  constructor(message: string, public readonly timeoutMs: number) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * 带超时的 Promise 包装器
 * 
 * @param promise 要执行的 Promise
 * @param timeoutMs 超时时间（毫秒）
 * @param errorMessage 超时错误信息
 * @returns Promise 结果
 * @throws TimeoutError 如果超时
 * 
 * @example
 * ```typescript
 * const result = await withTimeout(
 *   model.invoke(messages),
 *   60000,
 *   'LLM 响应超时'
 * );
 * ```
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    // 设置超时定时器
    const timeoutId = setTimeout(() => {
      reject(new TimeoutError(`${errorMessage} (${timeoutMs}ms)`, timeoutMs));
    }, timeoutMs);

    // 执行原始 Promise
    promise
      .then(result => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * 带超时和重试的组合包装器
 * 
 * @param operation 要执行的异步操作
 * @param timeoutMs 单次操作超时时间
 * @param retryConfig 重试配置
 * @returns 操作结果
 * 
 * @example
 * ```typescript
 * const result = await withTimeoutAndRetry(
 *   () => model.invoke(messages),
 *   60000,
 *   LLM_RETRY_CONFIG
 * );
 * ```
 */
export async function withTimeoutAndRetry<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  retryConfig: Partial<RetryConfig> = {}
): Promise<T> {
  return withRetry(
    () => withTimeout(operation(), timeoutMs, 'Operation timed out'),
    retryConfig
  );
}

/**
 * 可取消的超时 Promise
 * 
 * 用于需要手动取消的场景
 */
export interface CancellablePromise<T> {
  promise: Promise<T>;
  cancel: () => void;
}

/**
 * 创建可取消的带超时 Promise
 * 
 * @example
 * ```typescript
 * const { promise, cancel } = createCancellableTimeout(
 *   model.invoke(messages),
 *   60000
 * );
 * 
 * // 如果需要取消
 * cancel();
 * ```
 */
export function createCancellableTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): CancellablePromise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let cancelled = false;

  const wrappedPromise = new Promise<T>((resolve, reject) => {
    timeoutId = setTimeout(() => {
      if (!cancelled) {
        reject(new TimeoutError(`${errorMessage} (${timeoutMs}ms)`, timeoutMs));
      }
    }, timeoutMs);

    promise
      .then(result => {
        if (!cancelled) {
          if (timeoutId) clearTimeout(timeoutId);
          resolve(result);
        }
      })
      .catch(error => {
        if (!cancelled) {
          if (timeoutId) clearTimeout(timeoutId);
          reject(error);
        }
      });
  });

  return {
    promise: wrappedPromise,
    cancel: () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    },
  };
}

/**
 * 超时配置常量
 */
export const TIMEOUT_CONFIG = {
  /** LLM 调用超时：60 秒 */
  LLM_INVOKE: 60000,
  
  /** 工具执行超时：30 秒 */
  TOOL_EXECUTE: 30000,
  
  /** API 请求超时：15 秒 */
  API_REQUEST: 15000,
  
  /** 文件上传超时：120 秒 */
  FILE_UPLOAD: 120000,
} as const;
