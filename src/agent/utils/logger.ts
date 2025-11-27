/**
 * Agent 结构化日志系统
 * 
 * 提供：
 * 1. TraceId 全链路追踪
 * 2. 结构化事件日志
 * 3. 性能指标统计
 * 4. 可扩展的日志输出
 */

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * 日志级别优先级
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
};

/**
 * Agent 日志事件类型
 */
export type AgentLogEvent =
  // Agent 生命周期
  | 'agent_init'
  | 'agent_start'
  | 'agent_end'
  | 'agent_error'
  // LLM 调用
  | 'llm_call_start'
  | 'llm_call_end'
  | 'llm_call_error'
  | 'llm_call_retry'
  // 工具调用
  | 'tool_call_start'
  | 'tool_call_end'
  | 'tool_call_error'
  // Context 管理
  | 'context_trimmed'
  | 'context_stats'
  // 其他
  | 'step_progress'
  | 'user_message'
  | 'custom';

/**
 * 日志条目
 */
export interface LogEntry {
  /** 时间戳 */
  timestamp: string;
  /** 日志级别 */
  level: LogLevel;
  /** 事件类型 */
  event: AgentLogEvent;
  /** 追踪 ID */
  traceId: string;
  /** 消息 */
  message?: string;
  /** 附加数据 */
  data?: Record<string, any>;
  /** 耗时（毫秒） */
  duration?: number;
  /** 错误信息 */
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * 日志输出器接口
 */
export interface LogOutput {
  write(entry: LogEntry): void;
}

/**
 * 控制台日志输出器
 */
export class ConsoleLogOutput implements LogOutput {
  private minLevel: LogLevel;
  private useEmoji: boolean;
  
  constructor(options: { minLevel?: LogLevel; useEmoji?: boolean } = {}) {
    this.minLevel = options.minLevel || LogLevel.DEBUG;
    this.useEmoji = options.useEmoji !== false;
  }
  
  write(entry: LogEntry): void {
    // 检查日志级别
    if (LOG_LEVEL_PRIORITY[entry.level] < LOG_LEVEL_PRIORITY[this.minLevel]) {
      return;
    }
    
    const emoji = this.useEmoji ? this.getEmoji(entry.level, entry.event) : '';
    const prefix = `${emoji} [${entry.traceId.slice(-8)}]`;
    const timestamp = entry.timestamp.split('T')[1]?.slice(0, 8) || '';
    
    let message = `${prefix} ${timestamp} ${entry.event}`;
    if (entry.message) {
      message += `: ${entry.message}`;
    }
    if (entry.duration !== undefined) {
      message += ` (${entry.duration}ms)`;
    }
    
    // 根据级别选择输出方法
    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(message, entry.data || '', entry.error || '');
        break;
      case LogLevel.WARN:
        console.warn(message, entry.data || '');
        break;
      case LogLevel.DEBUG:
        console.debug(message, entry.data || '');
        break;
      default:
        console.log(message, entry.data || '');
    }
  }
  
  private getEmoji(level: LogLevel, event: AgentLogEvent): string {
    // 根据事件类型返回 emoji
    if (event.includes('error')) return '❌';
    if (event.includes('retry')) return '🔄';
    if (event === 'agent_init') return '🤖';
    if (event === 'agent_start') return '🚀';
    if (event === 'agent_end') return '✅';
    if (event.includes('llm')) return '💭';
    if (event.includes('tool')) return '🔧';
    if (event.includes('context')) return '📊';
    if (event === 'step_progress') return '📍';
    if (event === 'user_message') return '👤';
    
    // 根据级别返回
    switch (level) {
      case LogLevel.ERROR: return '❌';
      case LogLevel.WARN: return '⚠️';
      case LogLevel.DEBUG: return '🔍';
      default: return '📋';
    }
  }
}

/**
 * 日志收集器（用于后续分析）
 */
export class LogCollector implements LogOutput {
  private entries: LogEntry[] = [];
  private maxEntries: number;
  
  constructor(maxEntries = 1000) {
    this.maxEntries = maxEntries;
  }
  
  write(entry: LogEntry): void {
    this.entries.push(entry);
    
    // 限制最大条目数
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }
  }
  
  getEntries(): LogEntry[] {
    return [...this.entries];
  }
  
  getEntriesByTraceId(traceId: string): LogEntry[] {
    return this.entries.filter(e => e.traceId === traceId);
  }
  
  clear(): void {
    this.entries = [];
  }
}

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  /** 总耗时 */
  totalDuration: number;
  /** LLM 调用次数 */
  llmCalls: number;
  /** LLM 总耗时 */
  llmDuration: number;
  /** 工具调用次数 */
  toolCalls: number;
  /** 工具总耗时 */
  toolDuration: number;
  /** 重试次数 */
  retryCount: number;
  /** 错误次数 */
  errorCount: number;
  /** 迭代次数 */
  iterations: number;
}

/**
 * Agent Logger
 * 
 * 为单次 Agent 执行提供完整的日志追踪
 */
export class AgentLogger {
  private traceId: string;
  private startTime: number;
  private outputs: LogOutput[];
  private metrics: PerformanceMetrics;
  private timers: Map<string, number> = new Map();
  
  constructor(options: {
    traceId?: string;
    outputs?: LogOutput[];
  } = {}) {
    this.traceId = options.traceId || this.generateTraceId();
    this.startTime = Date.now();
    this.outputs = options.outputs || [new ConsoleLogOutput()];
    this.metrics = {
      totalDuration: 0,
      llmCalls: 0,
      llmDuration: 0,
      toolCalls: 0,
      toolDuration: 0,
      retryCount: 0,
      errorCount: 0,
      iterations: 0,
    };
  }
  
  /**
   * 生成追踪 ID
   */
  private generateTraceId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `agent_${timestamp}_${random}`;
  }
  
  /**
   * 获取追踪 ID
   */
  getTraceId(): string {
    return this.traceId;
  }
  
  /**
   * 获取已运行时间
   */
  getElapsed(): number {
    return Date.now() - this.startTime;
  }
  
  /**
   * 写入日志
   */
  private log(
    level: LogLevel,
    event: AgentLogEvent,
    message?: string,
    data?: Record<string, any>,
    error?: Error
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      traceId: this.traceId,
      message,
      data,
      duration: this.getElapsed(),
    };
    
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
      this.metrics.errorCount++;
    }
    
    // 输出到所有输出器
    for (const output of this.outputs) {
      try {
        output.write(entry);
      } catch (e) {
        console.error('Failed to write log:', e);
      }
    }
  }
  
  /**
   * 开始计时
   */
  startTimer(name: string): void {
    this.timers.set(name, Date.now());
  }
  
  /**
   * 结束计时并返回耗时
   */
  endTimer(name: string): number {
    const start = this.timers.get(name);
    if (start === undefined) return 0;
    
    const duration = Date.now() - start;
    this.timers.delete(name);
    return duration;
  }
  
  // ============ Agent 生命周期 ============
  
  /**
   * Agent 初始化
   */
  agentInit(data: { toolCount: number; hasContext: boolean }): void {
    this.log(LogLevel.INFO, 'agent_init', 'Agent initialized', data);
  }
  
  /**
   * Agent 开始执行
   */
  agentStart(data: { messageCount: number; estimatedTokens?: number }): void {
    this.log(LogLevel.INFO, 'agent_start', 'Agent execution started', data);
  }
  
  /**
   * Agent 执行结束
   */
  agentEnd(data: { success: boolean; finalMessageCount: number }): void {
    this.metrics.totalDuration = this.getElapsed();
    this.log(LogLevel.INFO, 'agent_end', 'Agent execution completed', {
      ...data,
      metrics: this.metrics,
    });
  }
  
  /**
   * Agent 执行错误
   */
  agentError(error: Error, data?: Record<string, any>): void {
    this.metrics.totalDuration = this.getElapsed();
    this.log(LogLevel.ERROR, 'agent_error', error.message, data, error);
  }
  
  // ============ LLM 调用 ============
  
  /**
   * LLM 调用开始
   */
  llmCallStart(data?: { iteration?: number; messageCount?: number }): void {
    this.startTimer('llm_call');
    this.log(LogLevel.DEBUG, 'llm_call_start', 'Calling LLM', data);
  }
  
  /**
   * LLM 调用结束
   */
  llmCallEnd(data: { hasToolCalls: boolean; toolCount?: number; contentLength?: number }): void {
    const duration = this.endTimer('llm_call');
    this.metrics.llmCalls++;
    this.metrics.llmDuration += duration;
    this.log(LogLevel.DEBUG, 'llm_call_end', `LLM responded in ${duration}ms`, {
      ...data,
      duration,
    });
  }
  
  /**
   * LLM 调用错误
   */
  llmCallError(error: Error, data?: Record<string, any>): void {
    this.endTimer('llm_call');
    this.log(LogLevel.ERROR, 'llm_call_error', error.message, data, error);
  }
  
  /**
   * LLM 调用重试
   */
  llmCallRetry(data: { attempt: number; maxRetries: number; delay: number; error: string }): void {
    this.metrics.retryCount++;
    this.log(LogLevel.WARN, 'llm_call_retry', `Retrying LLM call (${data.attempt}/${data.maxRetries})`, data);
  }
  
  // ============ 工具调用 ============
  
  /**
   * 工具调用开始
   */
  toolCallStart(data: { toolName: string; args?: any }): void {
    this.startTimer(`tool_${data.toolName}`);
    this.log(LogLevel.INFO, 'tool_call_start', `Executing tool: ${data.toolName}`, {
      toolName: data.toolName,
      args: data.args ? JSON.stringify(data.args).substring(0, 200) : undefined,
    });
  }
  
  /**
   * 工具调用结束
   */
  toolCallEnd(data: { toolName: string; resultPreview?: string }): void {
    const duration = this.endTimer(`tool_${data.toolName}`);
    this.metrics.toolCalls++;
    this.metrics.toolDuration += duration;
    this.log(LogLevel.INFO, 'tool_call_end', `Tool ${data.toolName} completed in ${duration}ms`, {
      ...data,
      duration,
    });
  }
  
  /**
   * 工具调用错误
   */
  toolCallError(toolName: string, error: Error): void {
    this.endTimer(`tool_${toolName}`);
    this.log(LogLevel.ERROR, 'tool_call_error', `Tool ${toolName} failed`, { toolName }, error);
  }
  
  // ============ Context 管理 ============
  
  /**
   * Context 裁剪
   */
  contextTrimmed(data: { 
    originalCount: number; 
    trimmedCount: number; 
    removedMessages: number;
    tokensBefore?: number;
    tokensAfter?: number;
  }): void {
    this.log(LogLevel.WARN, 'context_trimmed', 
      `Trimmed ${data.removedMessages} messages to fit context window`, data);
  }
  
  /**
   * Context 统计
   */
  contextStats(data: { 
    messageCount: number; 
    estimatedTokens: number;
    usagePercentage: number;
  }): void {
    this.log(LogLevel.DEBUG, 'context_stats', 
      `Context: ${data.messageCount} msgs, ~${data.estimatedTokens} tokens (${data.usagePercentage}%)`, data);
  }
  
  // ============ 其他 ============
  
  /**
   * 步骤进度
   */
  stepProgress(data: { iteration: number; maxIterations: number; status: string }): void {
    this.metrics.iterations = data.iteration;
    this.log(LogLevel.DEBUG, 'step_progress', 
      `Iteration ${data.iteration}/${data.maxIterations}: ${data.status}`, data);
  }
  
  /**
   * 用户消息
   */
  userMessage(data: { contentLength: number; hasAttachments?: boolean }): void {
    this.log(LogLevel.INFO, 'user_message', 'User message received', data);
  }
  
  /**
   * 自定义日志
   */
  custom(level: LogLevel, event: string, message?: string, data?: Record<string, any>): void {
    this.log(level, 'custom', message, { customEvent: event, ...data });
  }
  
  // ============ 统计 ============
  
  /**
   * 获取性能指标
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics, totalDuration: this.getElapsed() };
  }
  
  /**
   * 获取执行摘要
   */
  getSummary(): string {
    const m = this.getMetrics();
    return [
      `📊 Agent Execution Summary (${this.traceId})`,
      `   Duration: ${m.totalDuration}ms`,
      `   Iterations: ${m.iterations}`,
      `   LLM Calls: ${m.llmCalls} (${m.llmDuration}ms)`,
      `   Tool Calls: ${m.toolCalls} (${m.toolDuration}ms)`,
      `   Retries: ${m.retryCount}`,
      `   Errors: ${m.errorCount}`,
    ].join('\n');
  }
}

/**
 * 创建 Agent Logger 的工厂函数
 */
export function createAgentLogger(options?: {
  traceId?: string;
  minLevel?: LogLevel;
  collectLogs?: boolean;
}): { logger: AgentLogger; collector?: LogCollector } {
  const outputs: LogOutput[] = [
    new ConsoleLogOutput({ minLevel: options?.minLevel || LogLevel.DEBUG }),
  ];
  
  let collector: LogCollector | undefined;
  if (options?.collectLogs) {
    collector = new LogCollector();
    outputs.push(collector);
  }
  
  const logger = new AgentLogger({
    traceId: options?.traceId,
    outputs,
  });
  
  return { logger, collector };
}
