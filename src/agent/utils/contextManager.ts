/**
 * Context Window 管理器
 * 
 * 用于管理 LLM 对话的上下文长度，防止超出模型限制
 * 
 * 功能：
 * 1. Token 估算
 * 2. 消息智能裁剪
 * 3. 历史消息摘要（可选）
 */

import { BaseMessage, SystemMessage, HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";

/**
 * Context 管理配置
 */
export interface ContextConfig {
  /** 模型最大 token 数 */
  maxTokens: number;
  /** 预留给响应的 token 数 */
  reservedForResponse: number;
  /** 系统消息预留 token 数 */
  reservedForSystem: number;
  /** 触发摘要的消息数阈值 */
  summaryThreshold: number;
  /** 始终保留的最近消息数 */
  alwaysKeepRecent: number;
}

/**
 * 默认配置 - 针对 Gemini 2.5 Flash
 */
export const DEFAULT_CONTEXT_CONFIG: ContextConfig = {
  maxTokens: 100000,           // Gemini 2.5 Flash 支持约 100k
  reservedForResponse: 8000,   // 预留 8k 给响应
  reservedForSystem: 4000,     // 预留 4k 给系统提示词
  summaryThreshold: 30,        // 超过 30 条消息考虑摘要
  alwaysKeepRecent: 6,         // 始终保留最近 6 条消息（3轮对话）
};

/**
 * Context 使用统计
 */
export interface ContextStats {
  /** 总消息数 */
  totalMessages: number;
  /** 估算 token 数 */
  estimatedTokens: number;
  /** 系统消息 token 数 */
  systemTokens: number;
  /** 对话消息 token 数 */
  conversationTokens: number;
  /** 是否已裁剪 */
  wasTrimmed: boolean;
  /** 裁剪掉的消息数 */
  trimmedCount: number;
  /** 可用 token 数 */
  availableTokens: number;
  /** token 使用率 */
  usagePercentage: number;
}

/**
 * 估算文本的 token 数
 * 
 * 简化算法：
 * - 中文：约 1 字符 = 1.5-2 token
 * - 英文：约 4 字符 = 1 token
 * - 综合估算偏保守，避免超限
 * 
 * 注意：这是粗略估算，实际应使用 tiktoken 等专业库
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  
  // 统计中文字符
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  // 统计英文单词（粗略）
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
  // 统计数字
  const numbers = (text.match(/\d+/g) || []).length;
  // 其他字符
  const others = text.length - chineseChars - (text.match(/[a-zA-Z\d]/g) || []).length;
  
  // token 估算公式（偏保守）
  const tokens = Math.ceil(
    chineseChars * 1.8 +  // 中文每字约 1.8 token
    englishWords * 1.3 +   // 英文每词约 1.3 token
    numbers * 0.5 +        // 数字较少
    others * 0.3           // 标点等
  );
  
  return Math.max(tokens, 1);
}

/**
 * 估算消息列表的总 token 数
 */
export function estimateMessagesTokens(messages: BaseMessage[]): number {
  let total = 0;
  
  for (const msg of messages) {
    // 消息角色标识约占 4 token
    total += 4;
    
    // 消息内容
    const content = typeof msg.content === 'string' 
      ? msg.content 
      : JSON.stringify(msg.content);
    total += estimateTokens(content);
    
    // 工具调用额外 token
    if (msg instanceof AIMessage && msg.tool_calls?.length) {
      for (const tc of msg.tool_calls) {
        total += estimateTokens(tc.name) + estimateTokens(JSON.stringify(tc.args));
      }
    }
  }
  
  return total;
}

/**
 * 获取消息的简短描述（用于日志）
 */
function getMessagePreview(msg: BaseMessage, maxLength = 50): string {
  const content = typeof msg.content === 'string' 
    ? msg.content 
    : JSON.stringify(msg.content);
  
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + '...';
}

/**
 * 获取消息类型名称
 */
function getMessageType(msg: BaseMessage): string {
  if (msg instanceof SystemMessage) return 'system';
  if (msg instanceof HumanMessage) return 'human';
  if (msg instanceof AIMessage) return 'ai';
  if (msg instanceof ToolMessage) return 'tool';
  return 'unknown';
}

/**
 * 智能裁剪消息历史
 * 
 * 策略：
 * 1. 始终保留系统消息
 * 2. 始终保留最近 N 条消息
 * 3. 从最早的消息开始裁剪
 * 4. 裁剪时添加摘要提示
 * 
 * @param messages 消息列表
 * @param config 配置
 * @returns 裁剪后的消息列表和统计信息
 */
export function trimMessages(
  messages: BaseMessage[],
  config: ContextConfig = DEFAULT_CONTEXT_CONFIG
): { messages: BaseMessage[]; stats: ContextStats } {
  // 计算可用 token 数
  const availableTokens = config.maxTokens - config.reservedForResponse;
  
  // 分离系统消息和对话消息
  const systemMessages = messages.filter(m => m instanceof SystemMessage);
  const conversationMessages = messages.filter(m => !(m instanceof SystemMessage));
  
  // 计算系统消息 token
  const systemTokens = estimateMessagesTokens(systemMessages);
  
  // 对话可用 token
  const conversationAvailable = availableTokens - systemTokens;
  
  // 如果系统消息就已经超限，发出警告但仍继续
  if (systemTokens > availableTokens) {
    console.warn(
      `⚠️ [ContextManager] System prompt too long: ${systemTokens} tokens > ${availableTokens} available`
    );
  }
  
  // 计算对话消息 token
  const conversationTokens = estimateMessagesTokens(conversationMessages);
  
  // 如果未超限，直接返回
  if (conversationTokens <= conversationAvailable) {
    const totalTokens = systemTokens + conversationTokens;
    return {
      messages,
      stats: {
        totalMessages: messages.length,
        estimatedTokens: totalTokens,
        systemTokens,
        conversationTokens,
        wasTrimmed: false,
        trimmedCount: 0,
        availableTokens,
        usagePercentage: Math.round((totalTokens / config.maxTokens) * 100),
      },
    };
  }
  
  // 需要裁剪
  console.log(
    `📊 [ContextManager] Trimming needed: ${conversationTokens} tokens > ${conversationAvailable} available`
  );
  
  // 始终保留最近 N 条消息
  const recentMessages = conversationMessages.slice(-config.alwaysKeepRecent);
  const recentTokens = estimateMessagesTokens(recentMessages);
  
  // 剩余可用 token
  let remainingTokens = conversationAvailable - recentTokens;
  
  // 从最新到最旧保留消息（排除已保留的最近消息）
  const olderMessages = conversationMessages.slice(0, -config.alwaysKeepRecent);
  const keptOlderMessages: BaseMessage[] = [];
  
  // 从最新的旧消息开始保留（保持对话连贯性）
  for (let i = olderMessages.length - 1; i >= 0 && remainingTokens > 0; i--) {
    const msg = olderMessages[i];
    const msgTokens = estimateMessagesTokens([msg]);
    
    if (msgTokens <= remainingTokens) {
      keptOlderMessages.unshift(msg);
      remainingTokens -= msgTokens;
    } else {
      break; // token 不够了，停止
    }
  }
  
  // 计算裁剪数量
  const trimmedCount = olderMessages.length - keptOlderMessages.length;
  
  // 组合最终消息
  const trimmedMessages: BaseMessage[] = [...systemMessages];
  
  // 如果有裁剪，添加摘要提示
  if (trimmedCount > 0) {
    const summaryNote = new SystemMessage(
      `[上下文提示：为保持对话长度在模型限制内，已省略前 ${trimmedCount} 条历史消息。` +
      `当前显示最近 ${keptOlderMessages.length + recentMessages.length} 条消息。]`
    );
    trimmedMessages.push(summaryNote);
  }
  
  // 添加保留的对话消息
  trimmedMessages.push(...keptOlderMessages, ...recentMessages);
  
  // 计算最终统计
  const finalConversationTokens = estimateMessagesTokens(
    trimmedMessages.filter(m => !(m instanceof SystemMessage))
  );
  const totalTokens = systemTokens + finalConversationTokens;
  
  console.log(
    `✅ [ContextManager] Trimmed ${trimmedCount} messages. ` +
    `Final: ${trimmedMessages.length} messages, ~${totalTokens} tokens`
  );
  
  return {
    messages: trimmedMessages,
    stats: {
      totalMessages: trimmedMessages.length,
      estimatedTokens: totalTokens,
      systemTokens,
      conversationTokens: finalConversationTokens,
      wasTrimmed: true,
      trimmedCount,
      availableTokens,
      usagePercentage: Math.round((totalTokens / config.maxTokens) * 100),
    },
  };
}

/**
 * 检查是否需要裁剪
 */
export function needsTrimming(
  messages: BaseMessage[],
  config: ContextConfig = DEFAULT_CONTEXT_CONFIG
): boolean {
  const tokens = estimateMessagesTokens(messages);
  const available = config.maxTokens - config.reservedForResponse;
  return tokens > available * 0.9; // 使用 90% 作为阈值
}

/**
 * 获取 Context 使用情况
 */
export function getContextUsage(
  messages: BaseMessage[],
  config: ContextConfig = DEFAULT_CONTEXT_CONFIG
): ContextStats {
  const systemMessages = messages.filter(m => m instanceof SystemMessage);
  const conversationMessages = messages.filter(m => !(m instanceof SystemMessage));
  
  const systemTokens = estimateMessagesTokens(systemMessages);
  const conversationTokens = estimateMessagesTokens(conversationMessages);
  const totalTokens = systemTokens + conversationTokens;
  const availableTokens = config.maxTokens - config.reservedForResponse;
  
  return {
    totalMessages: messages.length,
    estimatedTokens: totalTokens,
    systemTokens,
    conversationTokens,
    wasTrimmed: false,
    trimmedCount: 0,
    availableTokens,
    usagePercentage: Math.round((totalTokens / config.maxTokens) * 100),
  };
}

/**
 * 格式化 Context 统计信息（用于日志）
 */
export function formatContextStats(stats: ContextStats): string {
  const lines = [
    `📊 Context Stats:`,
    `   Messages: ${stats.totalMessages}`,
    `   Tokens: ~${stats.estimatedTokens} / ${stats.availableTokens} (${stats.usagePercentage}%)`,
    `   System: ~${stats.systemTokens}, Conversation: ~${stats.conversationTokens}`,
  ];
  
  if (stats.wasTrimmed) {
    lines.push(`   ⚠️ Trimmed: ${stats.trimmedCount} messages removed`);
  }
  
  return lines.join('\n');
}

/**
 * Context 管理器类
 * 
 * 封装 Context 管理的完整功能
 */
export class ContextManager {
  private config: ContextConfig;
  private lastStats: ContextStats | null = null;
  
  constructor(config: Partial<ContextConfig> = {}) {
    this.config = { ...DEFAULT_CONTEXT_CONFIG, ...config };
  }
  
  /**
   * 处理消息列表，必要时进行裁剪
   */
  process(messages: BaseMessage[]): BaseMessage[] {
    const { messages: processed, stats } = trimMessages(messages, this.config);
    this.lastStats = stats;
    
    // 日志输出
    if (stats.wasTrimmed || stats.usagePercentage > 70) {
      console.log(formatContextStats(stats));
    }
    
    return processed;
  }
  
  /**
   * 获取最近一次处理的统计信息
   */
  getLastStats(): ContextStats | null {
    return this.lastStats;
  }
  
  /**
   * 检查消息是否需要裁剪
   */
  needsTrimming(messages: BaseMessage[]): boolean {
    return needsTrimming(messages, this.config);
  }
  
  /**
   * 获取 Context 使用情况
   */
  getUsage(messages: BaseMessage[]): ContextStats {
    return getContextUsage(messages, this.config);
  }
  
  /**
   * 更新配置
   */
  updateConfig(config: Partial<ContextConfig>) {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * 获取当前配置
   */
  getConfig(): ContextConfig {
    return { ...this.config };
  }
}

/**
 * 默认 Context 管理器实例
 */
export const defaultContextManager = new ContextManager();
