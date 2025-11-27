/**
 * 状态机驱动的 Agent
 * 集成 Planning 模式和 Human-in-the-Loop 确认机制
 */

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, AIMessage, BaseMessage, ToolMessage, SystemMessage } from "@langchain/core/messages";
import { tools as transactionTools, agentExtendedTools } from "./tools/transactionTools";
import { contextTools } from "./tools/contextTools";
import { apiTools } from "./tools/apiTools";
import { renderTools } from "./tools/renderTools";
import { domainTools } from "./tools/domainTools";
import type { AgentRuntimeContext } from "../types/agent";
import { 
  withRetry, 
  withTimeout, 
  LLM_RETRY_CONFIG, 
  TIMEOUT_CONFIG,
} from "./utils/retry";
import { ContextManager, ContextConfig } from "./utils/contextManager";
import { AgentLogger, LogLevel, ConsoleLogOutput } from "./utils/logger";
import { 
  AgentCancellationController, 
  CancellationReason,
  isCancellationError,
  withCancellation 
} from "./utils/cancellation";
import {
  checkToolPermission,
  createConfirmationRequest,
  recordToolCall,
  ConfirmationRequest,
  ToolPermission,
} from "./utils/permissions";
import {
  AgentStateMachine,
  AgentState,
  ExecutionPlan,
  PlanStep,
} from "./stateMachine";
import {
  ExecutionPlanGenerator,
  createPlanGenerator,
} from "./planner";

// ============ 类型定义 ============

export interface StatefulAgentOptions {
  /** 运行时上下文 */
  runtimeContext?: AgentRuntimeContext;
  /** 启用的工具名称列表 */
  enabledToolNames?: string[];
  /** Context 管理配置 */
  contextConfig?: Partial<ContextConfig>;
  /** 日志级别 */
  logLevel?: LogLevel;
  /** 是否启用 Planning 模式（复杂任务分步规划） */
  enablePlanning?: boolean;
  /** 是否启用人机确认（危险操作确认弹窗） */
  enableConfirmation?: boolean;
  /** 用户偏好设置 */
  userPreferences?: {
    confirmHighRisk?: boolean;
    confirmMediumRisk?: boolean;
    batchThreshold?: number;
  };
}

export interface ConfirmationHandler {
  /** 显示确认弹窗 */
  showConfirmation: (request: ConfirmationRequest) => void;
  /** 确认回调 */
  onConfirm?: (requestId: string) => void;
  /** 拒绝回调 */
  onReject?: (requestId: string, reason?: string) => void;
}

export interface StatefulAgentCallbacks {
  /** 步骤回调 */
  onStep?: (step: AgentStepEvent) => void;
  /** 状态变化回调 */
  onStateChange?: (oldState: AgentState, newState: AgentState) => void;
  /** 计划生成回调 */
  onPlanGenerated?: (plan: ExecutionPlan) => void;
  /** 确认请求回调 */
  onConfirmationRequired?: (request: ConfirmationRequest) => void;
}

export interface AgentStepEvent {
  type: 'thinking' | 'planning' | 'tool_call' | 'tool_result' | 'confirmation' | 'cancelled' | 'state_change';
  content: string;
  toolName?: string;
  toolArgs?: Record<string, any>;  // 工具调用参数
  plan?: ExecutionPlan;
  confirmationRequest?: ConfirmationRequest;
  state?: AgentState;
}

// ============ 合并工具 ============

/**
 * 工具模式配置
 * - 'granular': 细粒度工具模式（20+ 个独立工具）
 * - 'domain': 领域聚合模式（4 个聚合工具 + 渲染工具）
 */
export type ToolMode = 'granular' | 'domain';

// 细粒度工具集（原有模式）
const granularTools = [...contextTools, ...apiTools, ...transactionTools, ...agentExtendedTools, ...renderTools];

// 领域聚合工具集（新模式）
const domainToolSet = [...domainTools, ...renderTools];

// 默认使用领域聚合模式
let currentToolMode: ToolMode = 'domain';

/**
 * 设置工具模式
 */
export function setToolMode(mode: ToolMode) {
  currentToolMode = mode;
  console.log(`🔧 [StatefulAgent] Tool mode set to: ${mode}`);
}

/**
 * 获取当前工具模式
 */
export function getToolMode(): ToolMode {
  return currentToolMode;
}

/**
 * 根据当前模式获取工具集
 */
function getAllTools() {
  return currentToolMode === 'domain' ? domainToolSet : granularTools;
}

function filterTools(enabledToolNames?: string[]) {
  const allTools = getAllTools();
  if (!enabledToolNames || enabledToolNames.length === 0) {
    return allTools;
  }
  return allTools.filter(tool => enabledToolNames.includes(tool.name));
}

// ============ System Prompt ============

function buildSystemPrompt(context?: AgentRuntimeContext): string {
  // 根据工具模式选择不同的提示
  const toolGuidance = currentToolMode === 'domain' 
    ? `## 工具使用指南

你有以下聚合工具可用：

1. **transaction** - 交易管理（通过 action 参数指定操作）
   - action: "query" - 查询交易列表
   - action: "create" - 创建新交易
   - action: "update" - 更新交易（需要 id）
   - action: "delete" - 删除交易（需要 id）
   - action: "batch_create" - 批量创建（需要 items 数组）
   - action: "statistics" - 获取统计数据

2. **category** - 分类管理
   - action: "list" - 获取分类列表
   - action: "search" - 搜索分类
   - action: "create" - 创建新分类

3. **payment_method** - 支付方式管理
   - action: "list" - 获取支付方式列表
   - action: "create" - 创建新支付方式

4. **context** - 获取上下文信息
   - action: "full" - 获取完整上下文
   - action: "user/ledger/ledgers" - 获取特定信息

5. **render_xxx** - 渲染工具（展示结果）`
    : `## 核心规则

- 直接使用下方提供的上下文信息（用户、账本、分类、支付方式）
- 只有当上下文信息不完整或需要刷新时，才调用 get_xxx 工具查询
- 智能匹配：根据用户描述智能选择最合适的分类`;

  const basePrompt = `帮助用户记账、查账、分析财务。

${toolGuidance}

## 输出规范

- 可视化展示：完成任务后，使用一句话简短总结完成的操作，并用 render_xxx 工具将结果渲染成列表或卡片展示给用户
- 使用 render_xxx 工具时，无需额外输出文字说明，工具会自动渲染标题和内容
- 如需额外说明，使用工具的 title 和 message 参数，不要单独输出文本
- 保持回复简洁，避免重复信息`;

  if (!context) {
    return basePrompt;
  }

  const contextBlocks: string[] = [];

  if (context.currentDateTime) {
    contextBlocks.push(`## 当前时间\n${context.currentDateTime}`);
  }

  if (context.user) {
    contextBlocks.push(`## 当前用户\n- ID: ${context.user.id}\n- 用户名: ${context.user.username}${context.user.nickname ? `\n- 昵称: ${context.user.nickname}` : ''}`);
  }

  if (context.currentLedger) {
    const isDefault = context.currentLedger.id === context.defaultLedgerId;
    contextBlocks.push(`## 当前账本\n- ID: ${context.currentLedger.id}\n- 名称: ${context.currentLedger.name}${isDefault ? ' (默认)' : ''}${context.currentLedger.description ? `\n- 描述: ${context.currentLedger.description}` : ''}`);
  }

  if (context.categories && context.categories.length > 0) {
    const expenseCategories = context.categories
      .filter(c => c.type === 'EXPENSE')
      .map(c => `  - ${c.name} (ID: ${c.id})`)
      .join('\n');
    const incomeCategories = context.categories
      .filter(c => c.type === 'INCOME')
      .map(c => `  - ${c.name} (ID: ${c.id})`)
      .join('\n');
    
    let categoryBlock = '## 当前账本的分类';
    if (expenseCategories) {
      categoryBlock += `\n### 支出分类\n${expenseCategories}`;
    }
    if (incomeCategories) {
      categoryBlock += `\n### 收入分类\n${incomeCategories}`;
    }
    contextBlocks.push(categoryBlock);
  }

  if (context.paymentMethods && context.paymentMethods.length > 0) {
    const methodsList = context.paymentMethods
      .map(m => `  - ${m.name} (ID: ${m.id}${m.isDefault ? ', 默认' : ''})`)
      .join('\n');
    contextBlocks.push(`## 支付方式\n${methodsList}`);
  }

  return `${basePrompt}

---
# 当前上下文信息

${contextBlocks.join('\n\n')}`;
}

// ============ 状态机驱动的 Agent ============

/**
 * 创建状态机驱动的 Agent
 */
export function createStatefulAgent(apiKey: string, options?: StatefulAgentOptions) {
  const { 
    runtimeContext, 
    enabledToolNames, 
    contextConfig, 
    logLevel,
    enablePlanning = true,
    enableConfirmation = true,
    userPreferences,
  } = options || {};

  // 初始化组件
  const logger = new AgentLogger({
    outputs: [new ConsoleLogOutput({ minLevel: logLevel ?? LogLevel.INFO })],
  });
  const contextManager = new ContextManager(contextConfig);
  const cancellationController = new AgentCancellationController();
  const stateMachine = new AgentStateMachine();
  const tools = filterTools(enabledToolNames);
  const planGenerator = createPlanGenerator(tools, userPreferences ? {
    confirmHighRisk: userPreferences.confirmHighRisk ?? true,
    confirmMediumRisk: userPreferences.confirmMediumRisk ?? false,
    batchThreshold: userPreferences.batchThreshold ?? 5,
  } : undefined);
  
  // System Prompt
  const systemPrompt = buildSystemPrompt(runtimeContext);
  
  // 打印系统提示词（调试用）
  console.log('📝 [StatefulAgent] System Prompt:');
  console.log('─'.repeat(50));
  console.log(systemPrompt);
  console.log('─'.repeat(50));
  
  // 打印上下文关键信息
  if (runtimeContext) {
    console.log('📋 [StatefulAgent] Runtime Context:');
    console.log(`  - User: ${runtimeContext.user?.username || 'N/A'}`);
    console.log(`  - Current Ledger: ${runtimeContext.currentLedger?.name || 'N/A'} (ID: ${runtimeContext.currentLedger?.id || 'N/A'})`);
    console.log(`  - Categories: ${runtimeContext.categories?.length || 0}`);
    console.log(`  - Payment Methods: ${runtimeContext.paymentMethods?.length || 0}`);
  } else {
    console.warn('⚠️ [StatefulAgent] No runtime context provided!');
  }
  
  // 初始化模型
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash-lite",
    apiKey: apiKey,
    temperature: 0,
    maxRetries: 2,
  }).bindTools(tools);

  // 等待确认的 Promise 解析器
  let confirmationResolver: {
    resolve: () => void;
    reject: (reason?: string) => void;
  } | null = null;

  // 当前确认请求
  let pendingConfirmation: ConfirmationRequest | null = null;

  console.log('🤖 [StatefulAgent] Initialized with:');
  console.log(`  - Planning mode: ${enablePlanning ? 'ENABLED' : 'DISABLED'}`);
  console.log(`  - Confirmation mode: ${enableConfirmation ? 'ENABLED' : 'DISABLED'}`);
  console.log(`  - Tools: ${tools.length}`);

  /**
   * 提取文本内容
   */
  function extractTextContent(content: any): string {
    if (!content) return '';
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content
        .filter((part: any) => part.type === 'text' && part.text)
        .map((part: any) => part.text)
        .join('\n');
    }
    return JSON.stringify(content);
  }

  /**
   * 检查是否为 function call JSON
   */
  function isFunctionCallJson(content: string): boolean {
    if (!content || !content.trim()) return false;
    const trimmed = content.trim();
    return (trimmed.startsWith('[') || trimmed.startsWith('{')) && 
           trimmed.includes('"functionCall"');
  }

  /**
   * 等待用户确认
   */
  function waitForConfirmation(request: ConfirmationRequest): Promise<void> {
    return new Promise((resolve, reject) => {
      confirmationResolver = { resolve, reject };
      pendingConfirmation = request;
    });
  }

  /**
   * 执行工具调用（带权限检查）
   */
  async function executeToolWithPermissionCheck(
    toolCall: { id?: string; name: string; args: Record<string, any> },
    callbacks?: StatefulAgentCallbacks
  ): Promise<{ success: boolean; result?: string; error?: string; needsConfirmation?: boolean }> {
    const token = cancellationController.token;
    const { name: toolName, args: toolArgs } = toolCall;

    // 权限检查
    const permissionCheck = checkToolPermission(toolName, toolArgs);
    
    if (!permissionCheck.allowed) {
      return {
        success: false,
        error: permissionCheck.blockReason || '操作被阻止',
      };
    }

    // 如果需要确认且启用了确认模式
    if (enableConfirmation && permissionCheck.requiresConfirmation) {
      const confirmRequest = createConfirmationRequest(
        toolName,
        toolArgs,
        {
          onConfirm: () => {
            confirmationResolver?.resolve();
            confirmationResolver = null;
            pendingConfirmation = null;
          },
          onReject: (reason) => {
            confirmationResolver?.reject(reason);
            confirmationResolver = null;
            pendingConfirmation = null;
          },
        }
      );

      // 通知 UI 显示确认弹窗
      callbacks?.onConfirmationRequired?.(confirmRequest);
      callbacks?.onStep?.({
        type: 'confirmation',
        content: `⚠️ 需要确认: ${confirmRequest.message}`,
        confirmationRequest: confirmRequest,
      });

      // 状态转换到等待确认
      stateMachine.transition(AgentState.AWAITING_CONFIRMATION);
      callbacks?.onStateChange?.(AgentState.EXECUTING, AgentState.AWAITING_CONFIRMATION);

      try {
        // 等待用户确认
        await waitForConfirmation(confirmRequest);
        console.log('✅ [StatefulAgent] User confirmed');
        
        // 恢复执行状态
        stateMachine.transition(AgentState.EXECUTING);
        callbacks?.onStateChange?.(AgentState.AWAITING_CONFIRMATION, AgentState.EXECUTING);
      } catch (rejectReason) {
        console.log('❌ [StatefulAgent] User rejected:', rejectReason);
        return {
          success: false,
          error: `操作被用户取消: ${rejectReason || '未提供原因'}`,
          needsConfirmation: false,
        };
      }
    }

    // 执行工具
    const tool = tools.find(t => t.name === toolName);
    if (!tool) {
      return {
        success: false,
        error: `工具 ${toolName} 不存在`,
      };
    }

    try {
      logger.toolCallStart({ toolName, args: toolArgs });
      
      const result = await withCancellation(
        withTimeout(
          (tool as any).invoke(toolArgs),
          TIMEOUT_CONFIG.TOOL_EXECUTE,
          `工具 ${toolName} 执行超时`
        ),
        token
      );

      // 记录调用（用于频率限制）
      recordToolCall(toolName);

      const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
      logger.toolCallEnd({ toolName, resultPreview: resultStr.substring(0, 200) });

      return {
        success: true,
        result: resultStr,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.toolCallError(toolName, error instanceof Error ? error : new Error(errorMsg));
      
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * 流式执行 Agent（带状态机）
   */
  async function* streamWithStateMachine(
    input: { messages: BaseMessage[] },
    callbacks?: StatefulAgentCallbacks
  ): AsyncGenerator<{ messages: BaseMessage[]; state: AgentState }, void, unknown> {
    const token = cancellationController.token;
    let currentMessages = [...input.messages];
    let iterations = 0;
    const maxIterations = 10;

    try {
      // 检查取消
      token.throwIfCancelled();

      // 状态: IDLE -> PARSING
      stateMachine.transition(AgentState.PARSING);
      callbacks?.onStateChange?.(AgentState.IDLE, AgentState.PARSING);
      callbacks?.onStep?.({ type: 'state_change', content: '解析请求中...', state: AgentState.PARSING });

      // 添加系统提示词
      const hasSystemMessage = currentMessages.some(m => m instanceof SystemMessage);
      if (!hasSystemMessage) {
        currentMessages = [new SystemMessage(systemPrompt), ...currentMessages];
      }

      // Context 管理
      if (contextManager.needsTrimming(currentMessages)) {
        currentMessages = contextManager.process(currentMessages);
      }

      // 获取用户最后一条消息用于 Planning
      const lastUserMessage = [...currentMessages]
        .reverse()
        .find(m => m instanceof HumanMessage);
      const userInput = lastUserMessage 
        ? extractTextContent(lastUserMessage.content)
        : '';

      // Planning 模式
      if (enablePlanning && userInput) {
        stateMachine.transition(AgentState.PLANNING);
        callbacks?.onStateChange?.(AgentState.PARSING, AgentState.PLANNING);
        callbacks?.onStep?.({ type: 'planning', content: '制定执行计划...', state: AgentState.PLANNING });

        const plan = planGenerator.generatePlan(userInput);
        if (plan) {
          stateMachine.setPlan(plan);
          callbacks?.onPlanGenerated?.(plan);
          
          const planDisplay = planGenerator.formatPlanForDisplay(plan);
          callbacks?.onStep?.({ 
            type: 'planning', 
            content: planDisplay,
            plan: plan,
          });

          console.log('📋 [StatefulAgent] Plan generated:', plan.description);
          console.log(`📋 [StatefulAgent] Steps: ${plan.steps.length}, Confirmation: ${plan.requiresConfirmation}`);

          // 如果计划需要确认
          if (plan.requiresConfirmation && enableConfirmation) {
            stateMachine.transition(AgentState.AWAITING_CONFIRMATION);
            callbacks?.onStateChange?.(AgentState.PLANNING, AgentState.AWAITING_CONFIRMATION);

            const planConfirmRequest = createConfirmationRequest(
              'execute_plan',
              { plan },
              {
                onConfirm: () => {
                  stateMachine.confirm();
                  confirmationResolver?.resolve();
                  confirmationResolver = null;
                  pendingConfirmation = null;
                },
                onReject: (reason) => {
                  stateMachine.reject();
                  confirmationResolver?.reject(reason);
                  confirmationResolver = null;
                  pendingConfirmation = null;
                },
              }
            );
            planConfirmRequest.message = `确认执行以下计划？\n${planDisplay}`;

            callbacks?.onConfirmationRequired?.(planConfirmRequest);

            try {
              await waitForConfirmation(planConfirmRequest);
              console.log('✅ [StatefulAgent] Plan confirmed');
            } catch (rejectReason) {
              console.log('❌ [StatefulAgent] Plan rejected:', rejectReason);
              stateMachine.transition(AgentState.COMPLETED);
              yield { 
                messages: [...currentMessages, new AIMessage({ content: `好的，已取消执行。${rejectReason || ''}` })],
                state: AgentState.COMPLETED,
              };
              return;
            }
          }
        }
      }

      // 状态: -> EXECUTING（如果尚未处于执行状态）
      // 注意：setPlan 在 plan 不需要确认时会自动转换到 EXECUTING
      if (stateMachine.getState() !== AgentState.EXECUTING) {
        stateMachine.transition(AgentState.EXECUTING);
        callbacks?.onStateChange?.(stateMachine.getState(), AgentState.EXECUTING);
        callbacks?.onStep?.({ type: 'state_change', content: '执行中...', state: AgentState.EXECUTING });
      }

      // 打印当前消息（调试用）
      console.log('📨 [StatefulAgent] Messages to send:');
      currentMessages.forEach((msg, idx) => {
        const msgType = msg instanceof SystemMessage ? 'System' 
          : msg instanceof HumanMessage ? 'Human'
          : msg instanceof AIMessage ? 'AI'
          : msg instanceof ToolMessage ? 'Tool'
          : 'Unknown';
        const content = typeof msg.content === 'string' 
          ? msg.content.substring(0, 200) + (msg.content.length > 200 ? '...' : '')
          : JSON.stringify(msg.content).substring(0, 200);
        console.log(`  [${idx}] ${msgType}: ${content}`);
      });

      logger.agentStart({
        messageCount: currentMessages.length,
        estimatedTokens: contextManager.getUsage(currentMessages).estimatedTokens,
      });

      // 主执行循环
      while (iterations < maxIterations) {
        token.throwIfCancelled();
        iterations++;
        
        logger.stepProgress({ iteration: iterations, maxIterations, status: 'starting' });
        callbacks?.onStep?.({ type: 'thinking', content: '正在思考...' });

        // 调用 LLM
        let response;
        try {
          logger.llmCallStart({ iteration: iterations, messageCount: currentMessages.length });
          
          response = await withCancellation(
            withRetry(
              () => withTimeout(
                model.invoke(currentMessages),
                TIMEOUT_CONFIG.LLM_INVOKE,
                'LLM 响应超时'
              ),
              {
                ...LLM_RETRY_CONFIG,
                onRetry: (attempt, error, nextDelay) => {
                  token.throwIfCancelled();
                  logger.llmCallRetry({
                    attempt,
                    maxRetries: LLM_RETRY_CONFIG.maxRetries,
                    delay: Math.round(nextDelay),
                    error: error.message,
                  });
                  callbacks?.onStep?.({ 
                    type: 'thinking', 
                    content: `重试中 (${attempt}/${LLM_RETRY_CONFIG.maxRetries})...` 
                  });
                },
              }
            ),
            token
          );
        } catch (error) {
          if (isCancellationError(error)) {
            stateMachine.transition(AgentState.ERROR);
            callbacks?.onStep?.({ type: 'cancelled', content: '已取消' });
            return;
          }
          throw error;
        }

        currentMessages.push(response);
        yield { messages: currentMessages, state: stateMachine.getState() };

        const aiMessage = response as AIMessage;
        const textContent = extractTextContent(aiMessage.content);

        logger.llmCallEnd({
          hasToolCalls: !!(aiMessage.tool_calls && aiMessage.tool_calls.length > 0),
          toolCount: aiMessage.tool_calls?.length || 0,
          contentLength: textContent.length,
        });

        // 输出思考内容
        if (textContent.trim() && !isFunctionCallJson(textContent)) {
          if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
            callbacks?.onStep?.({ type: 'thinking', content: textContent });
          }
        }

        // 检查是否完成
        if (!aiMessage.tool_calls || aiMessage.tool_calls.length === 0) {
          stateMachine.transition(AgentState.SUMMARIZING);
          callbacks?.onStateChange?.(AgentState.EXECUTING, AgentState.SUMMARIZING);
          
          // 简短延迟后完成
          stateMachine.transition(AgentState.COMPLETED);
          callbacks?.onStateChange?.(AgentState.SUMMARIZING, AgentState.COMPLETED);
          
          logger.agentEnd({ success: true, finalMessageCount: currentMessages.length });
          console.log('✅ [StatefulAgent] Completed');
          break;
        }

        // 执行工具调用
        for (const toolCall of aiMessage.tool_calls) {
          token.throwIfCancelled();

          callbacks?.onStep?.({ 
            type: 'tool_call', 
            content: `🔧 调用工具: ${toolCall.name}`,
            toolName: toolCall.name,
            toolArgs: toolCall.args,
          });

          const result = await executeToolWithPermissionCheck(toolCall, callbacks);

          if (result.success) {
            const resultPreview = result.result!.length > 100 
              ? result.result!.substring(0, 100) + '...' 
              : result.result!;
            
            const isRenderTool = toolCall.name.startsWith('render_');
            callbacks?.onStep?.({ 
              type: 'tool_result', 
              content: isRenderTool ? result.result! : result.result!,  // 返回完整结果，不截断
              toolName: toolCall.name,
              toolArgs: toolCall.args,
            });

            currentMessages.push(
              new ToolMessage({
                content: result.result!,
                tool_call_id: toolCall.id || '',
              })
            );
          } else {
            callbacks?.onStep?.({ 
              type: 'tool_result', 
              content: result.error || '操作失败',
              toolName: toolCall.name,
              toolArgs: toolCall.args,
            });

            currentMessages.push(
              new ToolMessage({
                content: `Error: ${result.error}`,
                tool_call_id: toolCall.id || '',
              })
            );
          }
        }

        yield { messages: currentMessages, state: stateMachine.getState() };
      }

      if (iterations >= maxIterations) {
        stateMachine.transition(AgentState.ERROR);
        logger.agentEnd({ success: false, finalMessageCount: currentMessages.length });
        console.warn('⚠️ [StatefulAgent] Max iterations reached');
      }

    } catch (error) {
      if (isCancellationError(error)) {
        stateMachine.transition(AgentState.IDLE);
        callbacks?.onStep?.({ type: 'cancelled', content: '已取消' });
        return;
      }
      
      stateMachine.transition(AgentState.ERROR);
      throw error;
    }
  }

  // ============ 返回 Agent 接口 ============

  return {
    /**
     * 流式执行
     */
    stream: (input: { messages: BaseMessage[] }, callbacks?: StatefulAgentCallbacks) => {
      return streamWithStateMachine(input, callbacks);
    },

    /**
     * 同步执行
     */
    invoke: async (
      input: { messages: BaseMessage[] },
      callbacks?: StatefulAgentCallbacks
    ): Promise<{ messages: BaseMessage[]; state: AgentState }> => {
      let result: { messages: BaseMessage[]; state: AgentState } = {
        messages: input.messages,
        state: AgentState.IDLE,
      };

      for await (const state of streamWithStateMachine(input, callbacks)) {
        result = state;
      }

      return result;
    },

    /**
     * 确认当前操作
     */
    confirm: () => {
      if (confirmationResolver) {
        confirmationResolver.resolve();
      }
    },

    /**
     * 拒绝当前操作
     */
    reject: (reason?: string) => {
      if (confirmationResolver) {
        confirmationResolver.reject(reason);
      }
    },

    /**
     * 取消执行
     */
    cancel: (reason = CancellationReason.USER_CANCELLED) => {
      cancellationController.cancel(reason);
      stateMachine.transition(AgentState.IDLE);
    },

    /**
     * 重置 Agent 状态
     */
    reset: () => {
      cancellationController.reset();
      stateMachine.reset();
      confirmationResolver = null;
      pendingConfirmation = null;
    },

    /**
     * 获取当前状态
     */
    getState: () => stateMachine.getState(),

    /**
     * 获取当前执行计划
     */
    getPlan: () => stateMachine.getPlan(),

    /**
     * 获取待确认请求
     */
    getPendingConfirmation: () => pendingConfirmation,

    /**
     * 是否正在等待确认
     */
    isAwaitingConfirmation: () => stateMachine.getState() === AgentState.AWAITING_CONFIRMATION,

    /**
     * 获取状态机
     */
    getStateMachine: () => stateMachine,

    /**
     * 获取 Logger
     */
    getLogger: () => logger,

    /**
     * 获取 Context Manager
     */
    getContextManager: () => contextManager,

    /**
     * 获取 Plan Generator
     */
    getPlanGenerator: () => planGenerator,
  };
}

// ============ 类型导出 ============

export type StatefulAgent = ReturnType<typeof createStatefulAgent>;

export { AgentState };

export type {
  ExecutionPlan,
  PlanStep,
  ConfirmationRequest,
};
