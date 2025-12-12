/**
 * 智能补全 API
 * 
 * 与后端 /api/completion 交互
 * 负责高频短语的同步和查询
 */
import { apiClient } from '../config';

/**
 * 补全短语
 */
export interface CompletionPhrase {
  id?: number;
  phrase: string;
  frequency: number;
  lastUsedAt: number;
  sourceType: 'USER_INPUT' | 'SUGGESTION_ACCEPTED' | 'PRESET';
  category?: string;
}

/**
 * 补全查询结果
 */
export interface CompletionResult {
  phrase: string;
  completion: string;
  score: number;
  sourceType: string;
}

/**
 * 补全查询响应
 */
export interface CompletionQueryResponse {
  prefix: string;
  results: CompletionResult[];
  fromCache: boolean;
  queryTimeMs: number;
}

/**
 * 查询补全候选
 */
export async function queryCompletions(prefix: string): Promise<CompletionQueryResponse> {
  const response = await apiClient.get<CompletionQueryResponse>('/api/completion/query', {
    params: { prefix },
  });
  return response.data;
}

/**
 * 添加或更新短语
 */
export async function addPhrase(phrase: string, sourceType?: string): Promise<CompletionPhrase> {
  const response = await apiClient.post<CompletionPhrase>('/api/completion/phrase', {
    phrase,
    sourceType: sourceType || 'USER_INPUT',
  });
  return response.data;
}

/**
 * 获取高频短语（用于本地缓存初始化）
 */
export async function getTopPhrases(limit: number = 50): Promise<CompletionPhrase[]> {
  const response = await apiClient.get<CompletionPhrase[]>('/api/completion/phrases/top', {
    params: { limit },
  });
  return response.data;
}

/**
 * 增量同步短语
 */
export async function syncPhrases(since: number): Promise<CompletionPhrase[]> {
  const response = await apiClient.get<CompletionPhrase[]>('/api/completion/phrases/sync', {
    params: { since },
  });
  return response.data;
}

export const completionAPI = {
  queryCompletions,
  addPhrase,
  getTopPhrases,
  syncPhrases,
};
