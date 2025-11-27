# AI Agent 架构改进计划

> 目标：将当前 Agent 实现升级为生产级、类似 Cursor 的 AI Agent 工具
> 
> 创建时间：2024-11-27
> 
> 状态：📋 规划中

---

## 📊 改进优先级总览

| 优先级 | 模块 | 改进项 | 工作量 | 影响范围 |
|--------|------|--------|--------|----------|
| P0 | 安全 | API Key 安全存储 | 小 | agent.ts, useAgentChat.ts |
| P0 | 容错 | 超时控制 + 指数退避 | 中 | agent.ts, tools/*.ts |
| P1 | 性能 | Context Window 管理 | 中 | agent.ts, useAgentChat.ts |
| P1 | 可观测 | 结构化日志系统 | 中 | 全局 |
| P2 | 架构 | 状态机 + Planning 模式 | 大 | agent.ts |
| P2 | 体验 | Human-in-the-Loop | 中 | agent.ts, AgentScreen.tsx |
| P2 | 体验 | 请求取消机制 | 中 | agent.ts, useAgentChat.ts |
| P3 | 性能 | 工具并发执行 | 小 | agent.ts |
| P3 | 质量 | 代码重构 + 类型安全 | 中 | 全局 |

---

## 阶段一：安全与稳定性基础 (P0)

### 1.1 API Key 安全存储

**当前问题：**
```typescript
// ❌ 硬编码在代码中，极度不安全
const DEFAULT_API_KEY = "AIzaSyBJSnIcZ5SRDlU8BWulVbPsSE_ZDfRsiHs";
```

**改进方案：**

#### 方案 A：后端代理模式（推荐）
```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Client    │ ───► │   Backend   │ ───► │  Google AI  │
│  (无 Key)   │      │  (存储 Key) │      │     API     │
└─────────────┘      └─────────────┘      └─────────────┘
```

**改动文件：**
- `src/agent/agent.ts` - 移除本地 LLM 调用，改为调用后端
- `ledger-server` - 新增 `/api/agent/chat` 端点
- `src/hooks/useAgentChat.ts` - 适配新的调用方式

**后端新增代码：**
```java
// AgentChatController.java
@PostMapping("/api/agent/chat")
public ResponseEntity<StreamingResponseBody> chat(@RequestBody AgentChatRequest request) {
    // 1. 验证用户身份
    // 2. 构建 System Prompt（注入上下文）
    // 3. 调用 Google AI API（Key 存储在后端）
    // 4. 流式返回响应
}
```

#### 方案 B：安全存储模式（快速实现）
```typescript
// src/config/secrets.ts
import * as SecureStore from 'expo-secure-store';
import Config from 'react-native-config';

export async function getApiKey(): Promise<string> {
  // 优先从安全存储读取（用户自己配置的 Key）
  const userKey = await SecureStore.getItemAsync('GOOGLE_AI_API_KEY');
  if (userKey) return userKey;
  
  // 其次从环境变量读取（构建时注入）
  if (Config.GOOGLE_AI_API_KEY) return Config.GOOGLE_AI_API_KEY;
  
  throw new Error('API Key not configured');
}
```

**选择建议：** 先实现方案 B 快速修复安全问题，后续迭代到方案 A。

---

### 1.2 超时控制与指数退避

**当前问题：**
```typescript
// ❌ 无超时控制
const response = await model.invoke(currentMessages);

// ❌ 固定重试间隔
await new Promise(resolve => setTimeout(resolve, 1000));
```

**改进方案：**

**新增文件：** `src/agent/utils/retry.ts`
```typescript
/**
 * 重试配置
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableErrors: [
    'RATE_LIMIT',
    'TIMEOUT',
    'SERVICE_UNAVAILABLE',
    'NETWORK_ERROR',
    'reduce', // Google AI SDK 特定错误
  ],
};

/**
 * 指数退避重试
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error | null = null;
  let delay = config.initialDelayMs;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // 检查是否可重试
      const isRetryable = config.retryableErrors.some(e => 
        lastError!.message.includes(e)
      );
      
      if (!isRetryable || attempt === config.maxRetries) {
        throw lastError;
      }
      
      // 指数退避 + 抖动
      const jitter = Math.random() * 0.3 * delay;
      const waitTime = Math.min(delay + jitter, config.maxDelayMs);
      
      console.warn(`[Retry] Attempt ${attempt + 1} failed, retrying in ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      delay *= config.backoffMultiplier;
    }
  }
  
  throw lastError;
}

/**
 * 带超时的 Promise 包装
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}
```

**改动文件：** `src/agent/agent.ts`
```typescript
import { withRetry, withTimeout } from './utils/retry';

// LLM 调用超时：60 秒
const LLM_TIMEOUT_MS = 60000;

// 工具执行超时：30 秒
const TOOL_TIMEOUT_MS = 30000;

// 改造后的调用
const response = await withRetry(
  () => withTimeout(
    model.invoke(currentMessages),
    LLM_TIMEOUT_MS,
    'LLM 响应超时，请稍后重试'
  )
);

// 工具执行
const result = await withTimeout(
  (tool as any).invoke(toolCall.args),
  TOOL_TIMEOUT_MS,
  `工具 ${toolCall.name} 执行超时`
);
```

---

### 1.3 工具执行权限校验

**新增文件：** `src/agent/utils/permissions.ts`
```typescript
/**
 * 工具权限等级
 */
export enum ToolPermissionLevel {
  READ = 'read',           // 只读操作
  WRITE = 'write',         // 写入操作
  DANGEROUS = 'dangerous', // 危险操作（删除、转账等）
}

/**
 * 工具权限配置
 */
export const TOOL_PERMISSIONS: Record<string, ToolPermissionLevel> = {
  // 只读工具
  'get_user_info': ToolPermissionLevel.READ,
  'get_current_ledger': ToolPermissionLevel.READ,
  'get_categories': ToolPermissionLevel.READ,
  'query_transactions': ToolPermissionLevel.READ,
  'get_recent_transactions': ToolPermissionLevel.READ,
  'search_transactions': ToolPermissionLevel.READ,
  
  // 写入工具
  'create_transaction': ToolPermissionLevel.WRITE,
  
  // 危险工具（未来可能添加）
  // 'delete_transaction': ToolPermissionLevel.DANGEROUS,
  // 'transfer_money': ToolPermissionLevel.DANGEROUS,
};

/**
 * 需要用户确认的工具
 */
export const TOOLS_REQUIRING_CONFIRMATION = new Set([
  // 'delete_transaction',
  // 'transfer_money',
]);

/**
 * 检查工具执行权限
 */
export function checkToolPermission(
  toolName: string,
  userRole?: string
): { allowed: boolean; requiresConfirmation: boolean; reason?: string } {
  const permission = TOOL_PERMISSIONS[toolName] || ToolPermissionLevel.READ;
  
  // 危险操作需要确认
  if (permission === ToolPermissionLevel.DANGEROUS) {
    return {
      allowed: true,
      requiresConfirmation: true,
      reason: `此操作（${toolName}）需要您的确认`,
    };
  }
  
  return { allowed: true, requiresConfirmation: false };
}
```

---

## 阶段二：性能与可观测性 (P1)

### 2.1 Context Window 管理

**当前问题：**
```typescript
// ❌ 历史消息无限增长
historyRef.current = [...historyRef.current, humanMsg];
```

**改进方案：**

**新增文件：** `src/agent/utils/contextManager.ts`
```typescript
import { BaseMessage, SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";

/**
 * Context 管理配置
 */
export interface ContextConfig {
  maxTokens: number;           // 最大 token 数
  reservedForResponse: number; // 预留给响应的 token
  summaryThreshold: number;    // 触发摘要的消息数
}

export const DEFAULT_CONTEXT_CONFIG: ContextConfig = {
  maxTokens: 100000,        // Gemini 2.5 Flash 支持 100k
  reservedForResponse: 8000, // 预留 8k 给响应
  summaryThreshold: 20,      // 超过 20 条消息触发摘要
};

/**
 * 估算消息 token 数（简化版，实际应使用 tiktoken）
 */
export function estimateTokens(messages: BaseMessage[]): number {
  let total = 0;
  for (const msg of messages) {
    const content = typeof msg.content === 'string' 
      ? msg.content 
      : JSON.stringify(msg.content);
    // 粗略估算：1 个中文字符 ≈ 2 token，1 个英文单词 ≈ 1 token
    total += Math.ceil(content.length * 0.5);
  }
  return total;
}

/**
 * 智能裁剪消息历史
 * 策略：保留 System Prompt + 最近 N 条 + 重要消息
 */
export function trimMessages(
  messages: BaseMessage[],
  config: ContextConfig = DEFAULT_CONTEXT_CONFIG
): BaseMessage[] {
  const targetTokens = config.maxTokens - config.reservedForResponse;
  
  // 分离系统消息和对话消息
  const systemMessages = messages.filter(m => m instanceof SystemMessage);
  const conversationMessages = messages.filter(m => !(m instanceof SystemMessage));
  
  // 系统消息必须保留
  const systemTokens = estimateTokens(systemMessages);
  let remainingTokens = targetTokens - systemTokens;
  
  // 从最新消息开始保留
  const keptMessages: BaseMessage[] = [];
  for (let i = conversationMessages.length - 1; i >= 0 && remainingTokens > 0; i--) {
    const msg = conversationMessages[i];
    const msgTokens = estimateTokens([msg]);
    
    if (msgTokens <= remainingTokens) {
      keptMessages.unshift(msg);
      remainingTokens -= msgTokens;
    } else {
      break;
    }
  }
  
  // 如果裁剪了消息，在开头添加摘要提示
  const trimmedCount = conversationMessages.length - keptMessages.length;
  if (trimmedCount > 0) {
    const summaryNote = new SystemMessage(
      `[注意：为保持上下文长度，已省略前 ${trimmedCount} 条历史消息]`
    );
    return [...systemMessages, summaryNote, ...keptMessages];
  }
  
  return [...systemMessages, ...keptMessages];
}

/**
 * 消息摘要生成（可选，需要额外 LLM 调用）
 */
export async function summarizeMessages(
  messages: BaseMessage[],
  summarizer: (text: string) => Promise<string>
): Promise<string> {
  const content = messages
    .map(m => {
      const role = m instanceof HumanMessage ? 'User' : 'Assistant';
      return `${role}: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`;
    })
    .join('\n');
  
  return await summarizer(`请简要总结以下对话的关键信息：\n${content}`);
}
```

**改动文件：** `src/agent/agent.ts`
```typescript
import { trimMessages, estimateTokens, DEFAULT_CONTEXT_CONFIG } from './utils/contextManager';

// 在 runAgent 中添加
const runAgent = async (messages: BaseMessage[], maxIterations = 10, onStep?) => {
  // 裁剪消息以适应 context window
  let currentMessages = trimMessages([...messages], DEFAULT_CONTEXT_CONFIG);
  
  console.log(`📊 [Agent] Context: ${estimateTokens(currentMessages)} tokens, ${currentMessages.length} messages`);
  
  // ... 后续逻辑
};
```

---

### 2.2 结构化日志系统

**新增文件：** `src/agent/utils/logger.ts`
```typescript
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
 * Agent 日志事件类型
 */
export type AgentLogEvent = 
  | 'agent_start'
  | 'agent_end'
  | 'llm_call_start'
  | 'llm_call_end'
  | 'llm_call_error'
  | 'tool_call_start'
  | 'tool_call_end'
  | 'tool_call_error'
  | 'context_trimmed'
  | 'retry_attempt';

/**
 * 日志条目
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  event: AgentLogEvent;
  traceId: string;
  data?: Record<string, any>;
  duration?: number;
  error?: string;
}

/**
 * Agent Logger
 */
export class AgentLogger {
  private traceId: string;
  private logs: LogEntry[] = [];
  private startTime: number;

  constructor(traceId?: string) {
    this.traceId = traceId || this.generateTraceId();
    this.startTime = Date.now();
  }

  private generateTraceId(): string {
    return `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getTraceId(): string {
    return this.traceId;
  }

  log(level: LogLevel, event: AgentLogEvent, data?: Record<string, any>, error?: Error) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      traceId: this.traceId,
      data,
      duration: Date.now() - this.startTime,
      error: error?.message,
    };
    
    this.logs.push(entry);
    
    // 控制台输出（开发环境）
    if (__DEV__) {
      const emoji = this.getEmoji(level, event);
      console.log(`${emoji} [${this.traceId}] ${event}`, data || '', error || '');
    }
    
    // TODO: 生产环境发送到日志收集服务
    // this.sendToLogService(entry);
  }

  private getEmoji(level: LogLevel, event: AgentLogEvent): string {
    if (event.includes('error')) return '❌';
    if (event.includes('start')) return '🚀';
    if (event.includes('end')) return '✅';
    if (event === 'retry_attempt') return '🔄';
    if (level === LogLevel.WARN) return '⚠️';
    return '📋';
  }

  // 便捷方法
  agentStart(data: { messageCount: number; toolCount: number }) {
    this.log(LogLevel.INFO, 'agent_start', data);
  }

  agentEnd(data: { iterations: number; success: boolean }) {
    this.log(LogLevel.INFO, 'agent_end', data);
  }

  llmCallStart(data: { tokenEstimate: number }) {
    this.log(LogLevel.DEBUG, 'llm_call_start', data);
  }

  llmCallEnd(data: { hasToolCalls: boolean; toolCount?: number }) {
    this.log(LogLevel.DEBUG, 'llm_call_end', data);
  }

  llmCallError(error: Error, data?: Record<string, any>) {
    this.log(LogLevel.ERROR, 'llm_call_error', data, error);
  }

  toolCallStart(data: { toolName: string; args: any }) {
    this.log(LogLevel.INFO, 'tool_call_start', data);
  }

  toolCallEnd(data: { toolName: string; resultPreview: string }) {
    this.log(LogLevel.INFO, 'tool_call_end', data);
  }

  toolCallError(toolName: string, error: Error) {
    this.log(LogLevel.ERROR, 'tool_call_error', { toolName }, error);
  }

  // 获取完整日志（用于问题排查）
  getLogs(): LogEntry[] {
    return this.logs;
  }

  // 获取统计摘要
  getSummary(): Record<string, any> {
    const totalDuration = Date.now() - this.startTime;
    const llmCalls = this.logs.filter(l => l.event === 'llm_call_end').length;
    const toolCalls = this.logs.filter(l => l.event === 'tool_call_end').length;
    const errors = this.logs.filter(l => l.level === LogLevel.ERROR).length;

    return {
      traceId: this.traceId,
      totalDuration,
      llmCalls,
      toolCalls,
      errors,
    };
  }
}
```

---

## 阶段三：架构升级 (P2)

### 3.1 状态机 + Planning 模式

**设计目标：**
```
用户请求
    │
    ▼
┌─────────────┐
│   Parser    │  ─── 解析用户意图
└─────────────┘
    │
    ▼
┌─────────────┐
│   Planner   │  ─── 生成执行计划
└─────────────┘
    │
    ▼
┌─────────────┐
│  Reviewer   │  ─── 用户确认（可选）
└─────────────┘
    │
    ▼
┌─────────────┐
│  Executor   │  ─── 执行工具
└─────────────┘
    │
    ▼
┌─────────────┐
│ Summarizer  │  ─── 总结结果
└─────────────┘
```

**新增文件：** `src/agent/stateMachine.ts`
```typescript
/**
 * Agent 状态
 */
export enum AgentState {
  IDLE = 'idle',
  PARSING = 'parsing',
  PLANNING = 'planning',
  AWAITING_CONFIRMATION = 'awaiting_confirmation',
  EXECUTING = 'executing',
  SUMMARIZING = 'summarizing',
  COMPLETED = 'completed',
  ERROR = 'error',
}

/**
 * 执行计划
 */
export interface ExecutionPlan {
  id: string;
  steps: PlanStep[];
  requiresConfirmation: boolean;
  estimatedDuration?: number;
}

export interface PlanStep {
  id: string;
  description: string;
  toolName: string;
  args: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: any;
  error?: string;
}

/**
 * Agent 状态机
 */
export class AgentStateMachine {
  private state: AgentState = AgentState.IDLE;
  private plan: ExecutionPlan | null = null;
  private listeners: Set<(state: AgentState, data?: any) => void> = new Set();

  getState(): AgentState {
    return this.state;
  }

  getPlan(): ExecutionPlan | null {
    return this.plan;
  }

  subscribe(listener: (state: AgentState, data?: any) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private transition(newState: AgentState, data?: any) {
    console.log(`🔄 [StateMachine] ${this.state} → ${newState}`);
    this.state = newState;
    this.listeners.forEach(l => l(newState, data));
  }

  // 状态转换方法
  startParsing() {
    if (this.state !== AgentState.IDLE) return;
    this.transition(AgentState.PARSING);
  }

  startPlanning() {
    if (this.state !== AgentState.PARSING) return;
    this.transition(AgentState.PLANNING);
  }

  setPlan(plan: ExecutionPlan) {
    this.plan = plan;
    if (plan.requiresConfirmation) {
      this.transition(AgentState.AWAITING_CONFIRMATION, plan);
    } else {
      this.transition(AgentState.EXECUTING);
    }
  }

  confirmPlan() {
    if (this.state !== AgentState.AWAITING_CONFIRMATION) return;
    this.transition(AgentState.EXECUTING);
  }

  rejectPlan() {
    if (this.state !== AgentState.AWAITING_CONFIRMATION) return;
    this.plan = null;
    this.transition(AgentState.IDLE);
  }

  completeExecution() {
    if (this.state !== AgentState.EXECUTING) return;
    this.transition(AgentState.SUMMARIZING);
  }

  finish() {
    this.transition(AgentState.COMPLETED);
  }

  setError(error: Error) {
    this.transition(AgentState.ERROR, { error: error.message });
  }

  reset() {
    this.plan = null;
    this.transition(AgentState.IDLE);
  }
}
```

---

### 3.2 Human-in-the-Loop 确认机制

**改动文件：** `src/types/agent.ts`
```typescript
/**
 * 确认请求
 */
export interface ConfirmationRequest {
  id: string;
  type: 'plan_confirmation' | 'dangerous_action' | 'data_modification';
  title: string;
  description: string;
  details?: any;
  actions: {
    confirm: { label: string; style: 'primary' | 'danger' };
    cancel: { label: string };
    modify?: { label: string };
  };
}
```

**新增组件：** `src/components/agent/ConfirmationDialog.tsx`
```typescript
// 执行计划确认弹窗
// 显示 Agent 将要执行的步骤，用户可确认/取消/修改
```

---

### 3.3 请求取消机制

**改动文件：** `src/agent/agent.ts`
```typescript
/**
 * 可取消的 Agent 执行
 */
export interface CancellableAgent {
  invoke: (input: { messages: BaseMessage[] }) => Promise<{ messages: BaseMessage[] }>;
  cancel: () => void;
  isCancelled: () => boolean;
}

export const createCancellableAgent = (apiKey: string, options?: AgentOptions): CancellableAgent => {
  let abortController = new AbortController();
  let cancelled = false;

  return {
    invoke: async (input) => {
      abortController = new AbortController();
      cancelled = false;
      
      // 传递 signal 给 LLM 调用和工具执行
      // ...
    },
    
    cancel: () => {
      cancelled = true;
      abortController.abort();
      console.log('🛑 [Agent] Execution cancelled');
    },
    
    isCancelled: () => cancelled,
  };
};
```

---

## 阶段四：优化与打磨 (P3)

### 4.1 工具并发执行

```typescript
// 识别独立的工具调用，并发执行
const independentCalls = identifyIndependentCalls(aiMessage.tool_calls);
const results = await Promise.all(
  independentCalls.map(call => executeToolWithTimeout(call))
);
```

### 4.2 代码重构 + 类型安全

- 消除 `any` 类型
- 抽取 `runAgent` 和 `stream` 的公共逻辑
- 配置外置化

### 4.3 真正的流式输出

- 集成 LLM 的流式 API
- 逐 token 返回给前端

---

## 📁 文件变更清单

### 新增文件
```
src/agent/
├── utils/
│   ├── retry.ts           # 重试 + 超时
│   ├── contextManager.ts  # Context Window 管理
│   ├── logger.ts          # 结构化日志
│   └── permissions.ts     # 权限校验
├── stateMachine.ts        # 状态机
└── planner.ts             # Planning 模块

src/config/
└── secrets.ts             # 安全配置

src/components/agent/
└── ConfirmationDialog.tsx # 确认弹窗
```

### 修改文件
```
src/agent/agent.ts              # 主要改造
src/hooks/useAgentChat.ts       # 适配新架构
src/screens/AgentScreen.tsx     # UI 适配
src/types/agent.ts              # 类型扩展
```

---

## 📅 实施计划

### Week 1: P0 安全与稳定性
- [ ] 1.1 API Key 安全存储
- [x] 1.2 超时控制 + 指数退避 ✅ 2024-11-27
- [ ] 1.3 工具执行权限校验
- [ ] 测试 & 修复

### Week 2: P1 性能与可观测性
- [x] 2.1 Context Window 管理 ✅ 2024-11-28
- [x] 2.2 结构化日志系统 ✅ 2024-11-28
- [x] 集成到 Agent ✅ 2024-11-28
- [ ] 测试 & 修复

### Week 3-4: P2 架构升级
- [x] 3.3 请求取消机制 ✅ 2024-11-28
- [x] 3.1 状态机 + Planning 模式 ✅ 2024-11-27
- [x] 3.2 Human-in-the-Loop 确认机制 ✅ 2024-11-27
- [ ] 集成测试

### Week 5: P3 优化与打磨
- [ ] 4.1 工具并发执行
- [ ] 4.2 代码重构 + 类型安全
- [ ] 4.3 真正的流式输出（可选）
- [ ] 性能测试 & 优化

---

## ✅ 验收标准

### P0 完成标准
- [ ] 代码中无硬编码的 API Key
- [x] 所有 LLM 调用有 60s 超时
- [x] 所有工具执行有 30s 超时
- [x] 网络错误能正确重试（最多 3 次，指数退避）
- [x] 重试日志清晰可追踪

### P1 完成标准
- [x] 长对话不会超出 context window
- [x] 有消息裁剪提示
- [x] 日志包含 traceId
- [x] 可追踪完整执行链路
- [x] 性能指标统计（LLM 调用次数、工具调用次数、耗时等）

### P2 完成标准
- [ ] 复杂任务有执行计划展示
- [ ] 危险操作有确认弹窗
- [x] 用户可取消正在执行的请求
- [x] 取消后资源正确释放

### P3 完成标准
- [ ] 独立工具并发执行
- [ ] 代码无 any 类型
- [ ] 配置可外置

---

## 🔗 参考资料

- [LangChain.js 官方文档](https://js.langchain.com/docs/)
- [LangGraph.js](https://langchain-ai.github.io/langgraphjs/)
- [Cursor Agent 架构分析](https://cursor.sh)
- [OpenTelemetry for LLM](https://opentelemetry.io/)

---

> **下一步**：确认计划后，从 P0-1.1 开始实施
