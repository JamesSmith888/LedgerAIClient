/**
 * HTTP 请求工具
 * 
 * 提供带超时和重试的 fetch 包装器，用于所有 API 调用
 */

import { withRetry, withTimeout, API_RETRY_CONFIG, TIMEOUT_CONFIG, RetryConfig } from './retry';

/**
 * Fetch 配置选项
 */
export interface FetchOptions extends RequestInit {
  /** 请求超时时间（毫秒） */
  timeout?: number;
  /** 重试配置 */
  retryConfig?: Partial<RetryConfig>;
  /** 是否启用重试，默认 true */
  enableRetry?: boolean;
}

/**
 * 带超时的 fetch（不带重试）
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = TIMEOUT_CONFIG.API_REQUEST, ...fetchOptions } = options;
  
  // 使用 AbortController 实现超时
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`请求超时 (${timeout}ms): ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 带超时和重试的 fetch
 * 
 * @param url 请求 URL
 * @param options Fetch 配置选项
 * @returns Response
 * 
 * @example
 * ```typescript
 * const response = await safeFetch('https://api.example.com/data', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ key: 'value' }),
 *   timeout: 10000,
 *   retryConfig: { maxRetries: 2 },
 * });
 * ```
 */
export async function safeFetch(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { 
    timeout = TIMEOUT_CONFIG.API_REQUEST, 
    retryConfig = {},
    enableRetry = true,
    ...fetchOptions 
  } = options;
  
  const doFetch = () => fetchWithTimeout(url, { ...fetchOptions, timeout });
  
  if (enableRetry) {
    return withRetry(doFetch, {
      ...API_RETRY_CONFIG,
      ...retryConfig,
      onRetry: (attempt, error, nextDelay) => {
        console.warn(`⚠️ [safeFetch] Request failed (attempt ${attempt}): ${error.message}. Retrying in ${Math.round(nextDelay)}ms...`);
      },
    });
  }
  
  return doFetch();
}

/**
 * 带超时和重试的 JSON fetch
 * 
 * 自动解析 JSON 响应，处理非 2xx 状态码
 * 
 * @param url 请求 URL
 * @param options Fetch 配置选项
 * @returns 解析后的 JSON 数据
 */
export async function safeFetchJson<T = any>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const response = await safeFetch(url, options);
  
  // 检查响应状态
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  
  return response.json();
}

/**
 * API 请求辅助函数 - GET
 */
export async function apiGet<T = any>(
  url: string,
  headers?: HeadersInit,
  options?: Omit<FetchOptions, 'method' | 'body'>
): Promise<T> {
  return safeFetchJson<T>(url, {
    method: 'GET',
    headers,
    ...options,
  });
}

/**
 * API 请求辅助函数 - POST
 */
export async function apiPost<T = any>(
  url: string,
  body: any,
  headers?: HeadersInit,
  options?: Omit<FetchOptions, 'method' | 'body'>
): Promise<T> {
  return safeFetchJson<T>(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
    ...options,
  });
}
