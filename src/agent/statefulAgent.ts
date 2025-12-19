/**
 * 状态机驱动的 Agent
 * 集成 Planning 模式、Human-in-the-Loop 确认机制和 ReAct 反思模式
 */

import { HumanMessage, AIMessage, BaseMessage, ToolMessage, SystemMessage } from "@langchain/core/messages";
import { allRenderTools } from "./tools/renderTools";
import { domainTools } from "./tools/domainTools";
import { memoryTools } from "./tools/memoryTools";
import { budgetTools } from "./tools/budgetTools";
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
  IntentRewriter,
  createIntentRewriter,
  RewrittenIntent,
  ExtractedInfo,
} from "./intentRewriter";
import {
  Reflector,
  ReflectorConfig,
  ReflectionResult,
  StepObservation,
  ReflectionContext,
  createReflector,
  DEFAULT_REFLECTOR_CONFIG,
} from "./reflector";
import { DEFAULT_MODEL, DEFAULT_PROVIDER, AIProvider } from "../services/apiKeyStorage";
import { createChatModelWithTools } from "./modelFactory";

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
  /** 是否启用意图改写（用户输入优化） */
  enableIntentRewriting?: boolean;
  /** 是否启用人机确认（危险操作确认弹窗） */
  enableConfirmation?: boolean;
  /** 是否启用 ReAct 反思模式（每步执行后反思评估） */
  enableReflection?: boolean;
  /** 反思器配置 */
  reflectorConfig?: Partial<ReflectorConfig>;
  /** 用户偏好设置 */
  userPreferences?: {
    confirmHighRisk?: boolean;
    confirmMediumRisk?: boolean;
    batchThreshold?: number;
    /** 意图改写器的置信度阈值配置 */
    intentRewriterConfidenceThresholds?: {
      high?: number;
      low?: number;
    };
    /** 反思器的置信度阈值配置 */
    reflectorConfidenceThresholds?: {
      low?: number;
    };
  };
  /** 模型配置（可选，用于支持不同模块使用不同模型和提供商） */
  modelConfig?: {
    /** 执行模型的提供商 */
    executorProvider?: AIProvider;
    /** 执行模型名称 */
    executorModel?: string;
    /** 执行模型自定义 Base URL（用于第三方网关） */
    executorBaseURL?: string;
    /** 意图改写模型的提供商 */
    intentRewriterProvider?: AIProvider;
    /** 意图改写模型名称 */
    intentRewriterModel?: string;
    /** 意图改写模型自定义 Base URL */
    intentRewriterBaseURL?: string;
    /** 反思模型的提供商 */
    reflectorProvider?: AIProvider;
    /** 反思模型名称 */
    reflectorModel?: string;
    /** 反思模型自定义 Base URL */
    reflectorBaseURL?: string;
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
  /** 意图改写完成回调 */
  onIntentRewritten?: (intent: RewrittenIntent) => void;
  /** 确认请求回调 */
  onConfirmationRequired?: (request: ConfirmationRequest) => void;
  /** 反思结果回调 */
  onReflection?: (result: ReflectionResult) => void;
}

export interface AgentStepEvent {
  type: 'thinking' | 'intent_rewriting' | 'tool_call' | 'tool_result' | 'confirmation' | 'reflection' | 'cancelled' | 'state_change';
  content: string;
  toolName?: string;
  toolArgs?: Record<string, any>;  // 工具调用参数
  rewrittenIntent?: RewrittenIntent;  // 改写后的意图
  confirmationRequest?: ConfirmationRequest;
  reflectionResult?: ReflectionResult;  // 反思结果
  state?: AgentState;
}

// ============ 工具集 ============

// 领域聚合工具集（领域工具 + 记忆工具 + 渲染工具 + 预算工具）
const allTools = [...domainTools, ...memoryTools, ...allRenderTools, ...budgetTools];

/**
 * 过滤启用的工具
 */
function filterTools(enabledToolNames?: string[]) {
  if (!enabledToolNames || enabledToolNames.length === 0) {
    return allTools;
  }
  return allTools.filter(tool => enabledToolNames.includes(tool.name));
}

// ============ System Prompt ============

/**
 * 构建系统提示词
 * 
 * 设计原则：
 * 1. 不重复工具描述 - LangChain 的 bindTools() 会自动注入工具 schema
 * 2. 上下文注入 - 运行时动态注入用户/账本等上下文
 * 3. 行为规范 - 定义行为准则和交互规范
 * 4. 禁止硬编码工具名称和参数 - 工具有自描述能力
 */
function buildSystemPrompt(context?: AgentRuntimeContext, _tools?: any[]): string {
  const basePrompt = `你是一个智能助手，帮助用户完成各类任务。

## 行为规范

1. **遵循任务指令**：如果下方有"当前任务"部分，必须严格按照任务描述执行，不要自行重新解读用户意图
2. **行动而非描述**：收到任务后，立即调用工具执行，不要只是描述你将要做什么
3. **工具调用**：根据任务需要选择合适的工具，严格按照工具的 schema 定义传参
4. **优先使用上下文**：优先使用下方提供的上下文信息，避免重复查询
5. **渲染结果**：业务操作完成后，调用渲染工具将结果展示给用户
6. **确认敏感操作**：高风险操作需要用户确认
7. **学习用户偏好**：当用户纠正你的理解时，使用记忆工具记录，以便下次更好地服务用户
8. **💡 智能建议（重要）**：在调用渲染工具时，**必须**通过 suggestedActions 参数提供 2-4 个后续操作建议
   - ❌ 错误：在消息文本中写"智能建议：1. xxx 2. xxx"
   - ✅ 正确：在渲染工具的 suggestedActions 参数中传入数组：[{label: "xxx", message: "xxx"}, ...]
   - 建议应该具体、可操作，帮助用户快速完成相关任务`;

  // 如果没有上下文，直接返回基础提示词
  if (!context) {
    return basePrompt;
  }

  // 构建上下文块
  const contextBlocks: string[] = [];

  // 如果有用户偏好记忆，放在最前面
  if (context.userPreferenceContext) {
    contextBlocks.push(context.userPreferenceContext);
  }

  if (context.user) {
    contextBlocks.push(`## 当前用户\n- ID: ${context.user.id}\n- 用户名: ${context.user.username}${context.user.nickname ? `\n- 昵称: ${context.user.nickname}` : ''}`);
  }

  if (context.currentLedger) {
    const isDefault = context.currentLedger.id === context.defaultLedgerId;
    contextBlocks.push(`## 当前账本\n- ID: ${context.currentLedger.id}\n- 名称: ${context.currentLedger.name}${isDefault ? ' (默认)' : ''}${context.currentLedger.description ? `\n- 描述: ${context.currentLedger.description}` : ''}`);
  }

  if (context.allLedgers && context.allLedgers.length > 0) {
    const ledgersList = context.allLedgers
      .map(l => `  - ${l.name} (ID: ${l.id}${l.id === context.defaultLedgerId ? ', 默认' : ''})`)
      .join('\n');
    contextBlocks.push(`## 所有可用账本\n${ledgersList}`);
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

  if (context.currentDateTime) {
    contextBlocks.push(`## 当前时间\n${context.currentDateTime}`);
  }

  // 如果没有上下文块，直接返回基础提示词
  if (contextBlocks.length === 0) {
    return basePrompt;
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
    enableIntentRewriting = true,  // 默认启用意图改写
    enableConfirmation = true,
    enableReflection = true,  // 默认启用反思模式（ReAct 核心特性）
    reflectorConfig,
    userPreferences,
    modelConfig,
  } = options || {};

  // 获取模型和提供商配置，默认使用 DEFAULT_MODEL 和 DEFAULT_PROVIDER
  const executorProvider = modelConfig?.executorProvider || DEFAULT_PROVIDER;
  const executorModelName = modelConfig?.executorModel || DEFAULT_MODEL;
  const executorBaseURL = modelConfig?.executorBaseURL;
  const intentRewriterProvider = modelConfig?.intentRewriterProvider || DEFAULT_PROVIDER;
  const intentRewriterModelName = modelConfig?.intentRewriterModel || DEFAULT_MODEL;
  const intentRewriterBaseURL = modelConfig?.intentRewriterBaseURL;
  const reflectorProvider = modelConfig?.reflectorProvider || DEFAULT_PROVIDER;
  const reflectorModelName = modelConfig?.reflectorModel || DEFAULT_MODEL;
  const reflectorBaseURL = modelConfig?.reflectorBaseURL;

  console.log('🔧 [StatefulAgent] Model Configuration:');
  console.log(`  - Executor: ${executorProvider}/${executorModelName}${executorBaseURL ? ` @ ${executorBaseURL}` : ''}`);
  console.log(`  - Intent Rewriter: ${intentRewriterProvider}/${intentRewriterModelName}${intentRewriterBaseURL ? ` @ ${intentRewriterBaseURL}` : ''}`);
  console.log(`  - Reflector: ${reflectorProvider}/${reflectorModelName}${reflectorBaseURL ? ` @ ${reflectorBaseURL}` : ''}`);

  // 初始化组件
  const logger = new AgentLogger({
    outputs: [new ConsoleLogOutput({ minLevel: logLevel ?? LogLevel.INFO })],
  });
  const contextManager = new ContextManager(contextConfig);
  const cancellationController = new AgentCancellationController();
  const stateMachine = new AgentStateMachine();
  const tools = filterTools(enabledToolNames);
  
  // 创建意图改写器（用户输入优化）
  const intentRewriter = createIntentRewriter({
    confirmHighRisk: userPreferences?.confirmHighRisk ?? true,
    confirmMediumRisk: userPreferences?.confirmMediumRisk ?? false,
    batchThreshold: userPreferences?.batchThreshold ?? 5,
    model: intentRewriterModelName,
    provider: intentRewriterProvider,  // 使用配置的提供商
    baseURL: intentRewriterBaseURL,  // 传递自定义 Base URL
    confidenceThresholds: userPreferences?.intentRewriterConfidenceThresholds,  // 传入置信度阈值配置
  });
  
  // 初始化意图改写器
  if (enableIntentRewriting) {
    intentRewriter.initialize(apiKey);
  }

  // 创建反思器（ReAct 模式核心组件）
  // 传入工具列表，使反思器能够感知可用工具
  const reflector = createReflector({
    ...DEFAULT_REFLECTOR_CONFIG,
    enabled: enableReflection,
    ...reflectorConfig,
    availableTools: tools,  // 动态注入可用工具列表
    model: reflectorModelName,
    provider: reflectorProvider,  // 使用配置的提供商
    baseURL: reflectorBaseURL,  // 传递自定义 Base URL
    confidenceThresholds: userPreferences?.reflectorConfidenceThresholds,  // 传入置信度阈值配置
  });
  
  // 初始化反思器
  if (enableReflection) {
    reflector.initialize(apiKey);
  }

  // 反思上下文跟踪
  let completedStepObservations: StepObservation[] = [];
  let currentUserRequest: string = '';
  let currentRewrittenIntent: RewrittenIntent | null = null;
  
  // System Prompt（传入工具列表以自动生成工具说明）
  const systemPrompt = buildSystemPrompt(runtimeContext, tools);
  
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
  
  // 使用模型工厂创建执行模型（支持多种 AI 提供商）
  const model = createChatModelWithTools(
    {
      provider: executorProvider,
      model: executorModelName,
      apiKey: apiKey,
      temperature: 0,
      maxRetries: 2,
      baseURL: executorBaseURL,
    },
    tools
  );

  // 等待确认的 Promise 解析器
  let confirmationResolver: {
    resolve: () => void;
    reject: (reason?: string) => void;
  } | null = null;

  // 当前确认请求
  let pendingConfirmation: ConfirmationRequest | null = null;

  console.log('🤖 [StatefulAgent] Initialized with:');
  console.log(`  - Intent Rewriting: ${enableIntentRewriting ? 'ENABLED' : 'DISABLED'}`);
  console.log(`  - Confirmation mode: ${enableConfirmation ? 'ENABLED' : 'DISABLED'}`);
  console.log(`  - Reflection mode: ${enableReflection ? 'ENABLED' : 'DISABLED'}`);
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
   * 尝试纠正错误的工具名称
   * 例如：'list' -> 'category' (如果上下文暗示要获取分类列表)
   */
  function tryCorrectToolName(
    wrongToolName: string,
    toolArgs: Record<string, any>
  ): { correctedName: string | null; correctedArgs: Record<string, any> } {
    // 常见的错误工具名称映射
    const toolCorrections: Record<string, { name: string; argTransform?: (args: any) => any }> = {
      // list 相关
      'list': { 
        name: 'category', 
        argTransform: (args) => ({ action: 'list', ...args }) 
      },
      'get_categories': { 
        name: 'category', 
        argTransform: (args) => ({ action: 'list', ...args }) 
      },
      'list_categories': { 
        name: 'category', 
        argTransform: (args) => ({ action: 'list', ...args }) 
      },
      'categories': { 
        name: 'category', 
        argTransform: (args) => ({ action: 'list', ...args }) 
      },
      
      // create 相关
      'create': { 
        name: 'transaction', 
        argTransform: (args) => ({ action: 'create', ...args }) 
      },
      'create_transaction': { 
        name: 'transaction', 
        argTransform: (args) => ({ action: 'create', ...args }) 
      },
      'add_transaction': { 
        name: 'transaction', 
        argTransform: (args) => ({ action: 'create', ...args }) 
      },
      
      // query 相关
      'query': { 
        name: 'transaction', 
        argTransform: (args) => ({ action: 'query', ...args }) 
      },
      'search': { 
        name: 'transaction', 
        argTransform: (args) => ({ action: 'query', ...args }) 
      },
      'get_transactions': { 
        name: 'transaction', 
        argTransform: (args) => ({ action: 'query', ...args }) 
      },
      
      // analyze 相关（不存在的工具）
      'analyze': {
        name: 'transaction',
        argTransform: (args) => ({ action: 'statistics', ...args })
      },
      'analysis': {
        name: 'transaction',
        argTransform: (args) => ({ action: 'statistics', ...args })
      },
    };

    const correction = toolCorrections[wrongToolName.toLowerCase()];
    if (correction) {
      const correctedArgs = correction.argTransform 
        ? correction.argTransform(toolArgs)
        : toolArgs;
      
      console.log(`🔄 [ToolCorrection] Auto-correcting: ${wrongToolName} -> ${correction.name}`);
      console.log(`🔄 [ToolCorrection] Args transform:`, toolArgs, '->', correctedArgs);
      
      return {
        correctedName: correction.name,
        correctedArgs,
      };
    }

    return { correctedName: null, correctedArgs: toolArgs };
  }

  /**
   * 执行工具调用（带权限检查）
   */
  async function executeToolWithPermissionCheck(
    toolCall: { id?: string; name: string; args: Record<string, any> },
    callbacks?: StatefulAgentCallbacks
  ): Promise<{ success: boolean; result?: string; error?: string; needsConfirmation?: boolean }> {
    const token = cancellationController.token;
    let { name: toolName, args: toolArgs } = toolCall;

    // 首先检查工具是否存在
    let tool = tools.find(t => t.name === toolName);
    
    // 如果工具不存在，尝试自动纠正
    if (!tool) {
      const { correctedName, correctedArgs } = tryCorrectToolName(toolName, toolArgs);
      
      if (correctedName) {
        const correctedTool = tools.find(t => t.name === correctedName);
        if (correctedTool) {
          console.log(`✅ [ToolCorrection] Successfully corrected: ${toolName} -> ${correctedName}`);
          
          // 通知用户工具被自动纠正
          callbacks?.onStep?.({
            type: 'tool_call',
            content: `🔄 自动纠正工具: ${toolName} → ${correctedName}`,
            toolName: correctedName,
            toolArgs: correctedArgs,
          });
          
          // 使用纠正后的工具和参数
          toolName = correctedName;
          toolArgs = correctedArgs;
          tool = correctedTool;
        }
      }
      
      // 如果仍然找不到工具
      if (!tool) {
        const availableTools = tools.map(t => t.name).join(', ');
        return {
          success: false,
          error: `工具 "${toolName}" 不存在。：${availableTools}`,
        };
      }
    }

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

      // 动态获取当前时间，确保每次对话使用最新时间
      const currentDateTime = new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
      });
      // 用当前时间覆盖 runtimeContext 中可能过时的时间
      const updatedContext = runtimeContext 
        ? { ...runtimeContext, currentDateTime }
        : undefined;
      const dynamicSystemPrompt = buildSystemPrompt(updatedContext, tools);

      // 添加或更新系统提示词
      const systemMsgIndex = currentMessages.findIndex(m => m instanceof SystemMessage);
      if (systemMsgIndex === -1) {
        // 没有系统消息，添加新的
        currentMessages = [new SystemMessage(dynamicSystemPrompt), ...currentMessages];
      } else {
        // 已有系统消息，更新时间（替换整个系统消息以确保时间最新）
        currentMessages[systemMsgIndex] = new SystemMessage(dynamicSystemPrompt);
      }

      // Context 管理
      if (contextManager.needsTrimming(currentMessages)) {
        currentMessages = contextManager.process(currentMessages);
      }

      // 获取用户最后一条消息用于意图改写
      const lastUserMessage = [...currentMessages]
        .reverse()
        .find(m => m instanceof HumanMessage);
      
      // 提取文本用于日志和简单判断
      const userInputText = lastUserMessage 
        ? extractTextContent(lastUserMessage.content)
        : '';
      
      // 获取完整内容（可能包含图片）用于意图改写
      const userInputContent = lastUserMessage?.content;

      // 保存用户请求用于反思（只保存文本）
      currentUserRequest = userInputText;
      // 重置反思状态
      completedStepObservations = [];
      currentRewrittenIntent = null;
      reflector.reset();

      // 意图改写模式
      // 将用户的模糊输入转换为清晰的任务描述
      const hasContent = userInputText || (Array.isArray(userInputContent) && userInputContent.length > 0);
      if (enableIntentRewriting && hasContent && userInputContent && intentRewriter.isEnabled()) {
        callbacks?.onStep?.({ type: 'intent_rewriting', content: '📝 理解您的需求...', state: AgentState.PARSING });

        // 传递对话历史以便理解上下文（如用户对澄清问题的回答）
        // 注意：不包括最后一条用户消息，因为它会单独传递
        const historyForContext = currentMessages.length > 1 
          ? currentMessages.slice(0, -1)  // 排除最后一条（当前用户输入）
          : undefined;
        
        // 使用意图改写器处理用户输入，传递对话历史
        const rewrittenIntent = await intentRewriter.rewrite(userInputContent as any, historyForContext);
        currentRewrittenIntent = rewrittenIntent;

        // 通知回调
        callbacks?.onIntentRewritten?.(rewrittenIntent);
        callbacks?.onStep?.({ 
          type: 'intent_rewriting', 
          content: intentRewriter.formatForDisplay(rewrittenIntent),
          rewrittenIntent,
        });

        console.log(`📝 [StatefulAgent] Intent rewritten:`, {
          intentType: rewrittenIntent.intentType,
          riskLevel: rewrittenIntent.riskLevel,
          confidence: rewrittenIntent.confidence,
          clarifyQuestion: rewrittenIntent.clarifyQuestion,
        });

        // 处理 clarify 意图：信息不足，需要向用户询问
        if (rewrittenIntent.intentType === 'clarify') {
          console.log('🤔 [StatefulAgent] Clarification needed, asking user for more info');
          stateMachine.transition(AgentState.COMPLETED);
          
          // 构建友好的询问消息
          const clarifyMessage = rewrittenIntent.clarifyQuestion 
            || `我需要更多信息才能帮助您。请问您具体想做什么呢？`;
          
          callbacks?.onStep?.({ 
            type: 'thinking', 
            content: clarifyMessage,
          });
          
          yield { 
            messages: [...currentMessages, new AIMessage({ content: clarifyMessage })],
            state: AgentState.COMPLETED,
          };
          return;
        }

        // 如果意图需要确认（高风险操作）
        if (rewrittenIntent.requiresConfirmation && enableConfirmation) {
          stateMachine.transition(AgentState.AWAITING_CONFIRMATION);
          callbacks?.onStateChange?.(AgentState.PARSING, AgentState.AWAITING_CONFIRMATION);

          const intentConfirmRequest = createConfirmationRequest(
            rewrittenIntent.intentType,
            { intent: rewrittenIntent },
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
          intentConfirmRequest.message = rewrittenIntent.confirmationReason || '确认执行此操作？';

          callbacks?.onConfirmationRequired?.(intentConfirmRequest);

          try {
            await waitForConfirmation(intentConfirmRequest);
            console.log('✅ [StatefulAgent] Intent confirmed');
          } catch (rejectReason) {
            console.log('❌ [StatefulAgent] Intent rejected:', rejectReason);
            stateMachine.transition(AgentState.COMPLETED);
            yield { 
              messages: [...currentMessages, new AIMessage({ content: `好的，已取消。${rejectReason || ''}` })],
              state: AgentState.COMPLETED,
            };
            return;
          }
        }
      }

      // 状态: -> EXECUTING
      if (stateMachine.getState() !== AgentState.EXECUTING) {
        stateMachine.transition(AgentState.EXECUTING);
        callbacks?.onStateChange?.(stateMachine.getState(), AgentState.EXECUTING);
        callbacks?.onStep?.({ type: 'state_change', content: '执行中...', state: AgentState.EXECUTING });
      }

      // 如果有改写后的意图，将任务描述和提取的结构化信息注入到系统消息中
      if (currentRewrittenIntent && currentRewrittenIntent.confidence > 0.5) {
        // ============ 详细调试日志 ============
        console.log('📨 [StatefulAgent] ========== TASK INJECTION DEBUG ==========');
        console.log('📨 [StatefulAgent] Intent Type:', currentRewrittenIntent.intentType);
        console.log('📨 [StatefulAgent] Rewritten Prompt:', currentRewrittenIntent.rewrittenPrompt);
        console.log('📨 [StatefulAgent] Extracted Info:', JSON.stringify(currentRewrittenIntent.extractedInfo, null, 2));
        console.log('📨 [StatefulAgent] Confidence:', currentRewrittenIntent.confidence);
        console.log('📨 [StatefulAgent] Risk Level:', currentRewrittenIntent.riskLevel);
        
        // 构建任务指令，包含任务描述
        let taskInstruction = `\n\n---\n## 当前任务\n\n**任务**: ${currentRewrittenIntent.rewrittenPrompt}`;
        
        // 如果有提取的信息，添加到指令中
        const extractedInfo = currentRewrittenIntent.extractedInfo;
        if (extractedInfo && Object.keys(extractedInfo).length > 0) {
          const infoLines: string[] = [];
          
          // 处理批量记录（items 数组）
          if (extractedInfo.items && extractedInfo.items.length > 0) {
            infoLines.push(`- 待处理记录数: ${extractedInfo.items.length} 条`);
            infoLines.push(`\n**待处理的交易记录**:`);
            extractedInfo.items.forEach((item, index) => {
              const itemDesc = [
                `金额: ${item.amount}`,
                `类型: ${item.type === 'EXPENSE' ? '支出' : '收入'}`,
                item.category ? `分类: ${item.category}` : null,
                item.description ? `描述: ${item.description}` : null,
                item.date ? `日期: ${item.date}` : null,
              ].filter(Boolean).join(', ');
              infoLines.push(`  ${index + 1}. ${itemDesc}`);
            });
          } else {
            // 单条记录的处理
            if (extractedInfo.amount !== undefined) infoLines.push(`- 金额: ${extractedInfo.amount}`);
            if (extractedInfo.type) {
              infoLines.push(`- 类型: ${extractedInfo.type === 'EXPENSE' ? '支出(EXPENSE)' : '收入(INCOME)'}`);
            }
            if (extractedInfo.category) infoLines.push(`- 分类: ${extractedInfo.category}`);
            if (extractedInfo.description) infoLines.push(`- 描述: ${extractedInfo.description}`);
            if (extractedInfo.date) infoLines.push(`- 日期: ${extractedInfo.date}`);
            if (extractedInfo.paymentMethod) infoLines.push(`- 支付方式: ${extractedInfo.paymentMethod}`);
          }
          
          if (extractedInfo.dateRange) {
            if (extractedInfo.dateRange.start) infoLines.push(`- 开始日期: ${extractedInfo.dateRange.start}（必须使用此日期）`);
            if (extractedInfo.dateRange.end) infoLines.push(`- 结束日期: ${extractedInfo.dateRange.end}（必须使用此日期）`);
          }
          if (extractedInfo.limit) infoLines.push(`- 数量限制: ${extractedInfo.limit}`);
          
          if (infoLines.length > 0) {
            taskInstruction += `\n\n**提取的信息**:\n${infoLines.join('\n')}`;
          }
        }

        // 根据意图类型添加执行指导
        const intentType = currentRewrittenIntent.intentType;
        if (intentType === 'update' || intentType === 'delete') {
          // 修改/删除操作需要先确定目标记录
          taskInstruction += `\n\n**执行原则**: 执行${intentType === 'update' ? '修改' : '删除'}操作前，必须先查询确认目标记录存在并获取其唯一标识。**如果查询结果为空，请直接告知用户未找到记录，不要尝试${intentType === 'update' ? '修改' : '删除'}，也不要重复查询。**`;
        }
        
        taskInstruction += '\n\n**注意**: 请严格按照任务描述执行，完成后必须调用渲染工具展示结果。';
          
        // 输出完整的任务指令
        console.log('📨 [StatefulAgent] Full Task Instruction:');
        console.log(taskInstruction);
        console.log('📨 [StatefulAgent] ========== TASK INJECTION END ==========');
        
        // 找到第一个系统消息并追加任务指令
        const systemMsgIndex = currentMessages.findIndex(m => m instanceof SystemMessage);
        if (systemMsgIndex !== -1) {
          const originalSystemMsg = currentMessages[systemMsgIndex];
          const originalContent = typeof originalSystemMsg.content === 'string' 
            ? originalSystemMsg.content 
            : JSON.stringify(originalSystemMsg.content);
          currentMessages[systemMsgIndex] = new SystemMessage({
            content: originalContent + taskInstruction,
          });
        }

        // 注意：不再移除图片内容
        // 图片保留给执行模型，因为意图识别可能不完全准确
        // 执行模型可以结合图片内容进行更精确的处理
        if (currentRewrittenIntent.hasImage) {
          console.log('🖼️ [StatefulAgent] Image content preserved for executor model');
        }
      }

      // 打印当前消息（调试用）
      console.log('📨 [StatefulAgent] Messages to send:');
      currentMessages.forEach((msg, idx) => {
        const msgType = msg instanceof SystemMessage ? 'System' 
          : msg instanceof HumanMessage ? 'Human'
          : msg instanceof AIMessage ? 'AI'
          : msg instanceof ToolMessage ? 'Tool'
          : 'Unknown';
        
        // 智能格式化内容：避免打印巨大的 base64 图片数据
        let content: string;
        if (typeof msg.content === 'string') {
          content = msg.content.substring(0, 200) + (msg.content.length > 200 ? '...' : '');
        } else if (Array.isArray(msg.content)) {
          // 多模态消息：显示各部分类型，不显示完整内容
          const parts = msg.content.map((part: any) => {
            if (part.type === 'text') {
              const textContent = part.text || '';
              return `[text: ${typeof textContent === 'string' ? textContent.substring(0, 50) : String(textContent)}...]`;
            }
            if (part.type === 'image_url') return `[image]`;
            return `[${part.type}]`;
          }).join(', ');
          content = `MultiModal(${msg.content.length} parts): ${parts}`;
        } else {
          content = JSON.stringify(msg.content).substring(0, 200);
        }
        
        console.log(`  [${idx}] ${msgType}: ${content}`);
      });

      logger.agentStart({
        messageCount: currentMessages.length,
        estimatedTokens: contextManager.getUsage(currentMessages).estimatedTokens,
      });

      // 空响应重试计数器（防止无限循环）
      let emptyResponseRetryCount = 0;
      const maxEmptyRetries = 3;

      // 主执行循环
      while (iterations < maxIterations) {
        token.throwIfCancelled();
        iterations++;
        
        logger.stepProgress({ iteration: iterations, maxIterations, status: 'starting' });
        callbacks?.onStep?.({ type: 'thinking', content: '正在思考...' });

        // 检查当前消息是否包含图片（第一次迭代时检查）
        const hasImageInMessages = iterations === 1 && currentRewrittenIntent?.hasImage;
        // 图片处理需要更长的超时时间
        const llmTimeout = hasImageInMessages 
          ? TIMEOUT_CONFIG.LLM_INVOKE_WITH_IMAGE 
          : TIMEOUT_CONFIG.LLM_INVOKE;

        // 调用 LLM
        let response;
        try {
          logger.llmCallStart({ iteration: iterations, messageCount: currentMessages.length });
          
          response = await withCancellation(
            withRetry(
              () => withTimeout(
                model.invoke(currentMessages),
                llmTimeout,
                hasImageInMessages ? 'LLM 响应超时（图片处理中）' : 'LLM 响应超时'
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
            stateMachine.transition(AgentState.CANCELLED);
            callbacks?.onStep?.({ type: 'cancelled', content: '已取消' });
            yield { messages: currentMessages, state: AgentState.CANCELLED };
            return;
          }
          
          // 处理 LangChain/Gemini 的空响应错误
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes('reduce') && errorMessage.includes('undefined')) {
            console.warn('⚠️ [StatefulAgent] Gemini returned empty response');
            
            // 检查是否已经渲染过结果
            const hasRenderedResult = completedStepObservations.some(
              obs => obs.toolName?.startsWith('render_')
            );
            
            if (hasRenderedResult) {
              // 已经渲染过，可以安全结束
              console.log('✅ [StatefulAgent] Already rendered, treating empty response as completion');
              stateMachine.transition(AgentState.SUMMARIZING);
              callbacks?.onStep?.({ type: 'state_change', content: '生成总结...' });
              break;
            } else {
              // 还没渲染，注入提示让模型继续渲染
              console.log('⚠️ [StatefulAgent] No render yet, prompting LLM to render result');
              currentMessages.push(
                new HumanMessage({
                  content: '[系统提示] 业务操作已完成，但你还没有将结果展示给用户。请立即调用合适的 render_xxx 工具（如 render_transaction_detail、render_transaction_list 等）将结果渲染给用户查看。这是必须完成的最后一步！',
                })
              );
              // 不 break，继续循环让 LLM 调用渲染工具
              continue;
            }
          }
          
          throw error;
        }

        // 详细日志：输出 LLM 响应的结构
        const aiMsgPreview = response as AIMessage;
        console.log('📥 [StatefulAgent] ========== LLM RESPONSE DEBUG ==========');
        console.log('📥 [StatefulAgent] Has Content:', !!response?.content);
        console.log('📥 [StatefulAgent] Content Type:', typeof response?.content);
        console.log('📥 [StatefulAgent] Content:', typeof response?.content === 'string' 
          ? response.content 
          : JSON.stringify(response?.content));
        console.log('📥 [StatefulAgent] Has Tool Calls:', !!(aiMsgPreview)?.tool_calls?.length);
        console.log('📥 [StatefulAgent] Tool Call Count:', (aiMsgPreview)?.tool_calls?.length || 0);
        if (aiMsgPreview?.tool_calls?.length) {
          console.log('📥 [StatefulAgent] Tool Calls Detail:');
          aiMsgPreview.tool_calls.forEach((tc, i) => {
            console.log(`  [${i}] Tool: ${tc.name}`);
            console.log(`      Args: ${JSON.stringify(tc.args)}`);
          });
        }
        // 检查是否有停止信号（不同提供商的停止信号可能不同）
        const stopSignals = [
          (aiMsgPreview as any)?.response_metadata?.finish_reason,
          (aiMsgPreview as any)?.additional_kwargs?.finish_reason,
          (aiMsgPreview as any)?.lc_kwargs?.additional_kwargs?.finish_reason,
        ].filter(Boolean);
        if (stopSignals.length > 0) {
          console.log('📥 [StatefulAgent] Stop Signals:', stopSignals);
        }
        console.log('📥 [StatefulAgent] ========== LLM RESPONSE END ==========');

        // 提取并展示模型推理过程
        const aiMsg = response as AIMessage;
        const hasToolCalls = aiMsg.tool_calls && aiMsg.tool_calls.length > 0;
        
        // 1. 尝试获取显式的推理内容 (如 DeepSeek R1 的 reasoning_content)
        const reasoningContent = (aiMsg.response_metadata as any)?.reasoning_content || (aiMsg.additional_kwargs as any)?.reasoning_content;
        
        if (reasoningContent) {
          console.log('🧠 [StatefulAgent] Found explicit reasoning content');
          callbacks?.onStep?.({ type: 'thinking', content: reasoningContent });
        } 
        // 2. 如果有工具调用，文本内容通常是思考过程 (CoT)
        else if (hasToolCalls && typeof aiMsg.content === 'string' && aiMsg.content.trim().length > 0) {
          console.log('🧠 [StatefulAgent] Found CoT reasoning with tool calls');
          callbacks?.onStep?.({ type: 'thinking', content: aiMsg.content.trim() });
        }

        // 检查响应是否有效
        // 注意：如果有 tool_calls，即使 content 为空也是有效响应
        const hasContent = response && response.content && 
          (typeof response.content === 'string' ? response.content.trim().length > 0 : true);
        
        if (!response || (!hasContent && !hasToolCalls)) {
          console.warn('⚠️ [StatefulAgent] Empty response from LLM (no content and no tool calls)');
          
          // 检查是否已经渲染过结果
          const hasRenderedResult = completedStepObservations.some(
            obs => obs.toolName?.startsWith('render_')
          );
          
          if (hasRenderedResult) {
            // 已经渲染过，可以安全结束
            console.log('✅ [StatefulAgent] Already rendered, treating empty response as completion');
            stateMachine.transition(AgentState.SUMMARIZING);
            callbacks?.onStep?.({ type: 'state_change', content: '生成总结...' });
            break;
          } else {
            // 还没渲染，检查是否已尝试过多次
            emptyResponseRetryCount++;
            
            if (emptyResponseRetryCount > maxEmptyRetries) {
              // 达到最大重试次数，检查任务状态
              console.warn(`⚠️ [StatefulAgent] Max empty response retries (${maxEmptyRetries}) reached, checking task status`);
              
              // 检查是否有已完成的业务操作
              const businessOps = completedStepObservations.filter(
                obs => obs.success && obs.toolName && !obs.toolName.startsWith('render_')
              );
              
              if (businessOps.length > 0) {
                const lastOp = businessOps[businessOps.length - 1];
                
                try {
                  // 解析操作结果
                  const opResult = JSON.parse(lastOp.result);
                  
                  // 检查是否只是查询操作（需要继续执行修改）
                  if (lastOp.toolName === 'transaction' && lastOp.toolArgs?.action === 'query') {
                    console.warn('⚠️ [StatefulAgent] Last operation was a query, task not complete yet');
                    throw new Error('AI 模型在查询后停止响应，请稍后重试');
                  }
                  
                  // 不是查询操作，尝试自动渲染
                  console.log(`🔧 [StatefulAgent] Auto-rendering result for: ${lastOp.toolName}`);
                  
                  if (opResult.success && opResult.data) {
                    const responseData = opResult.data.data || opResult.data;
                    
                    // 根据操作类型决定渲染方式
                    if (lastOp.toolName === 'transaction') {
                      // 单条交易操作，渲染交易详情
                      if (responseData && typeof responseData === 'object' && responseData.id) {
                        callbacks?.onStep?.({
                          type: 'tool_result',
                          toolName: 'render_transaction_detail',
                          content: JSON.stringify(responseData),
                        });
                        console.log('✅ [StatefulAgent] Auto-rendered transaction detail');
                      }
                    } else if (lastOp.toolName === 'query' && Array.isArray(responseData)) {
                      // 查询操作，渲染交易列表
                      callbacks?.onStep?.({
                        type: 'tool_result',
                        toolName: 'render_transaction_list',
                        content: JSON.stringify({ transactions: responseData }),
                      });
                      console.log('✅ [StatefulAgent] Auto-rendered transaction list');
                    }
                  }
                } catch (parseError) {
                  console.warn('⚠️ [StatefulAgent] Failed to parse operation result for auto-render:', parseError);
                  throw parseError;
                }
                
                // 通知用户操作已完成
                callbacks?.onStep?.({ 
                  type: 'thinking', 
                  content: '操作已完成' 
                });
                stateMachine.transition(AgentState.SUMMARIZING);
                break;
              } else {
                // 没有任何操作完成，返回错误
                throw new Error('AI 模型返回空响应，请稍后重试');
              }
            }
            
            // 还没渲染，检查任务类型和进度
            console.log(`⚠️ [StatefulAgent] No render yet, analyzing task progress (attempt ${emptyResponseRetryCount}/${maxEmptyRetries})`);
            
            // 分析最后一次操作
            const lastBusinessOp = completedStepObservations
              .filter(obs => obs.success && obs.toolName && !obs.toolName.startsWith('render_'))
              .pop();
            
            let promptContent = '';
            
            if (lastBusinessOp) {
              try {
                const result = JSON.parse(lastBusinessOp.result);
                
                // 检查是否是查询操作（修改/删除任务的第一步）
                if (lastBusinessOp.toolName === 'transaction' && result.success) {
                  const action = lastBusinessOp.toolArgs?.action;
                  
                  // 如果是查询操作，且任务类型是修改/删除，说明还需要继续执行
                  if (action === 'query') {
                    const transactions = result.transactions || (result.data?.data);
                    
                    if (Array.isArray(transactions) && transactions.length > 0) {
                      promptContent = `[系统提示] 你刚才查询到了 ${transactions.length} 条记录。

**重要**：这只是第一步！根据用户的任务要求，你还需要：
1. 从查询结果中选择正确的记录
2. 调用 transaction 工具执行修改操作（action: "update"）
3. 最后调用渲染工具展示结果

请继续执行下一步操作！不要停在查询步骤。`;
                    } else {
                      promptContent = `[系统提示] 查询没有找到匹配的记录。请调用 render_message 工具告知用户未找到相关记录。`;
                    }
                  } else {
                    // 创建/修改/删除操作已完成，需要渲染
                    const data = result.data?.data || result.data;
                    if (data && data.id) {
                      promptContent = `[系统提示] 操作已完成，请立即调用 render_transaction_detail 工具展示结果。

交易数据：${JSON.stringify(data)}`;
                    } else {
                      promptContent = `[系统提示] 操作已完成，请调用合适的渲染工具展示结果。`;
                    }
                  }
                } else {
                  // 其他操作，需要渲染
                  promptContent = `[系统提示] 业务操作已完成，请调用渲染工具展示结果：
- 单条记录：render_transaction_detail
- 多条记录：render_transaction_list
- 统计分析：render_statistics_card`;
                }
              } catch (parseError) {
                console.warn('⚠️ [StatefulAgent] Failed to parse last operation result:', parseError);
                promptContent = `[系统提示] 请根据任务要求继续执行或调用渲染工具展示结果。`;
              }
            } else {
              promptContent = `[系统提示] 请继续执行任务或调用渲染工具展示结果。`;
            }
            
            currentMessages.push(
              new HumanMessage({
                content: promptContent,
              })
            );
            // 不 break，继续循环让 LLM 调用渲染工具
            continue;
          }
        }
        
        // 有响应，重置空响应计数
        emptyResponseRetryCount = 0;

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

        // ============ 检测是否为重复的渲染工具调用（表示任务已完成） ============
        if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
          // 检查是否所有的 tool calls 都是渲染工具
          const allRenderTools = aiMessage.tool_calls.every(tc => tc.name.startsWith('render_'));
          
          if (allRenderTools) {
            // 检查这些渲染工具是否已经被调用过（检查最近3次调用）
            const recentRenderCalls = completedStepObservations
              .slice(-3)  // 只看最近3次
              .filter(obs => obs.toolName?.startsWith('render_'));
            
            // 检查当前要调用的渲染工具是否与最近的渲染调用重复
            const isRepeatRenderCall = aiMessage.tool_calls.every(tc => {
              return recentRenderCalls.some(obs => {
                if (obs.toolName !== tc.name) return false;
                
                // 简单比较：如果工具名相同且参数的 id 相同（如果有），则认为是重复
                try {
                  const obsArgs = obs.toolArgs || {};
                  const tcArgs = tc.args || {};
                  
                  // 如果有 id 字段，比较 id
                  if (obsArgs.id !== undefined && tcArgs.id !== undefined) {
                    return obsArgs.id === tcArgs.id;
                  }
                  
                  // 否则认为渲染工具重复调用就是重复（因为数据不会变）
                  return true;
                } catch {
                  return false;
                }
              });
            });
            
            if (isRepeatRenderCall) {
              console.log('🔄 [StatefulAgent] Detected repeated render tool calls, task is complete');
              stateMachine.transition(AgentState.SUMMARIZING);
              callbacks?.onStateChange?.(AgentState.EXECUTING, AgentState.SUMMARIZING);
              
              stateMachine.transition(AgentState.COMPLETED);
              callbacks?.onStateChange?.(AgentState.SUMMARIZING, AgentState.COMPLETED);
              
              logger.agentEnd({ success: true, finalMessageCount: currentMessages.length });
              console.log('✅ [StatefulAgent] Completed (repeated render detected)');
              break;
            }
          }
        }

        // 检查是否完成
        if (!aiMessage.tool_calls || aiMessage.tool_calls.length === 0) {
          // 检查是否已经渲染过结果
          const hasRenderedResult = completedStepObservations.some(
            obs => obs.toolName?.startsWith('render_')
          );
          
          if (hasRenderedResult) {
            // 已经渲染过，可以安全结束
            stateMachine.transition(AgentState.SUMMARIZING);
            callbacks?.onStateChange?.(AgentState.EXECUTING, AgentState.SUMMARIZING);
            
            stateMachine.transition(AgentState.COMPLETED);
            callbacks?.onStateChange?.(AgentState.SUMMARIZING, AgentState.COMPLETED);
            
            logger.agentEnd({ success: true, finalMessageCount: currentMessages.length });
            console.log('✅ [StatefulAgent] Completed (with render)');
            break;
          } else {
            // 还没渲染，检查是否有可渲染的结果
            const hasBusinessResult = completedStepObservations.some(
              obs => obs.toolName && ['transaction', 'category', 'ledger'].includes(obs.toolName) && obs.success
            );
            
            if (hasBusinessResult) {
              // 有业务结果但没渲染，提示 LLM 渲染
              console.log('⚠️ [StatefulAgent] No render yet but has business result, prompting LLM to render');
              currentMessages.push(
                new HumanMessage({
                  content: '[系统提示] 你已完成业务操作，但还没有将结果展示给用户。请立即调用合适的 render_xxx 工具将结果渲染给用户查看！',
                })
              );
              // 不 break，继续循环让 LLM 调用渲染工具
              continue;
            } else {
              // 没有业务结果，检查是否是第一轮且有明确任务
              const isFirstIteration = iterations === 1;
              const hasTaskIntent = currentRewrittenIntent && 
                ['create', 'update', 'delete', 'query', 'statistics', 'batch'].includes(currentRewrittenIntent.intentType);
              
              if (isFirstIteration && hasTaskIntent) {
                // 第一轮有任务但没调用工具，提示重新思考
                console.warn('⚠️ [StatefulAgent] First iteration with task intent but no tool calls');
                currentMessages.push(
                  new HumanMessage({
                    content: '[系统] 请根据任务指令调用相应的工具执行操作。',
                  })
                );
                continue;
              }
              
              // 可能是普通对话，直接结束
              stateMachine.transition(AgentState.SUMMARIZING);
              callbacks?.onStateChange?.(AgentState.EXECUTING, AgentState.SUMMARIZING);
              
              stateMachine.transition(AgentState.COMPLETED);
              callbacks?.onStateChange?.(AgentState.SUMMARIZING, AgentState.COMPLETED);
              
              logger.agentEnd({ success: true, finalMessageCount: currentMessages.length });
              console.log('✅ [StatefulAgent] Completed (no business result)');
              break;
            }
          }
        }

        // 执行工具调用
        for (const toolCall of aiMessage.tool_calls) {
          token.throwIfCancelled();

          const toolStartTime = Date.now();

          callbacks?.onStep?.({ 
            type: 'tool_call', 
            content: `🔧 调用工具: ${toolCall.name}`,
            toolName: toolCall.name,
            toolArgs: toolCall.args,
          });

          // ============ 循环检测：检查是否重复调用相同的工具和参数 ============
          const isRepeatedCall = completedStepObservations.some(obs => 
            obs.toolName === toolCall.name && 
            JSON.stringify(obs.toolArgs) === JSON.stringify(toolCall.args)
          );

          let result;
          if (isRepeatedCall) {
            console.warn(`⚠️ [StatefulAgent] Detected repeated tool call: ${toolCall.name}`);
            
            // 检查是否已经多次触发重复调用警告（防止死循环）
            const repeatedWarnings = completedStepObservations.filter(obs => 
              obs.result && obs.result.includes('[系统错误] 禁止重复调用')
            ).length;

            if (repeatedWarnings >= 2) {
              console.error('🛑 [StatefulAgent] Too many repeated calls, forcing termination');
              
              // 强制结束任务
              stateMachine.transition(AgentState.SUMMARIZING);
              callbacks?.onStateChange?.(AgentState.EXECUTING, AgentState.SUMMARIZING);
              
              stateMachine.transition(AgentState.COMPLETED);
              callbacks?.onStateChange?.(AgentState.SUMMARIZING, AgentState.COMPLETED);
              
              logger.agentEnd({ success: false, finalMessageCount: currentMessages.length });
              
              // 返回最后一条消息给用户
              yield {
                messages: [
                  ...currentMessages,
                  new AIMessage({ content: '❌ 检测到多次重复操作，任务已强制终止。请尝试提供更详细的信息或稍后重试。' })
                ],
                state: AgentState.COMPLETED 
              };
              break;
            }

            result = {
              success: false,
              error: `[系统错误] 禁止重复调用！你刚才已经用完全相同的参数调用过工具 "${toolCall.name}" 了。
参数: ${JSON.stringify(toolCall.args)}

**严重警告**：你正在陷入死循环！
1. **立即停止**尝试这个操作
2. 如果是查询失败，请直接询问用户补充信息
3. 不要重试相同的参数！`
            };
          } else {
            result = await executeToolWithPermissionCheck(toolCall, callbacks);
          }

          const toolDuration = Date.now() - toolStartTime;

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

            // ============ 记录步骤观察（无论是否启用反思模式） ============
            const observation: StepObservation = {
              stepId: toolCall.id || `step_${iterations}_${Date.now()}`,
              stepDescription: `调用 ${toolCall.name}`,
              toolName: toolCall.name,
              toolArgs: toolCall.args,
              result: result.result!,
              success: true,
              duration: toolDuration,
            };
            
            // 总是记录已完成的步骤，用于 hasRenderedResult 检查
            completedStepObservations.push(observation);

            // ============ ReAct 反思模式（可选） ============
            if (enableReflection && reflector.isEnabled()) {
              // 检查是否需要反思
              const remainingToolCalls = aiMessage.tool_calls.indexOf(toolCall) < aiMessage.tool_calls.length - 1;
              
              if (reflector.shouldReflect(observation, remainingToolCalls ? 1 : 0)) {
                // 进入反思状态
                stateMachine.transition(AgentState.REFLECTING);
                callbacks?.onStateChange?.(AgentState.EXECUTING, AgentState.REFLECTING);

                callbacks?.onStep?.({
                  type: 'state_change',
                  content: '🔍 反思中...',
                  state: AgentState.REFLECTING,
                });

                // 构建反思上下文
                const reflectionContext: ReflectionContext = {
                  userRequest: currentUserRequest,
                  plan: {
                    id: 'dynamic',
                    description: currentUserRequest || '动态执行',  // 使用原始输入，不是改写后的提示
                    steps: [],
                    requiresConfirmation: false,
                    createdAt: Date.now(),
                  },
                  completedSteps: completedStepObservations,
                  currentObservation: observation,
                  remainingSteps: [], // 动态执行模式下剩余步骤未知
                };

                // 执行反思
                const reflectionResult = await reflector.reflect(reflectionContext);

                // observation 已经在上面添加到 completedStepObservations 了

                // 通知回调
                callbacks?.onReflection?.(reflectionResult);
                callbacks?.onStep?.({
                  type: 'reflection',
                  content: reflector.formatForDisplay(reflectionResult),
                  reflectionResult,
                });

                // 返回执行状态
                stateMachine.transition(AgentState.EXECUTING);
                callbacks?.onStateChange?.(AgentState.REFLECTING, AgentState.EXECUTING);

                // 根据反思结果决定下一步
                if (reflectionResult.nextAction === 'complete' || reflectionResult.isTaskComplete) {
                  // 检查是否已经调用过渲染工具
                  const hasRenderedResult = completedStepObservations.some(
                    obs => obs.toolName?.startsWith('render_')
                  ) || toolCall.name.startsWith('render_');
                  
                  if (hasRenderedResult) {
                    console.log('🔍 [Reflector] Task complete with render, ending early');
                    // 已经渲染过结果，可以安全结束
                    stateMachine.transition(AgentState.SUMMARIZING);
                    callbacks?.onStateChange?.(AgentState.EXECUTING, AgentState.SUMMARIZING);
                    stateMachine.transition(AgentState.COMPLETED);
                    callbacks?.onStateChange?.(AgentState.SUMMARIZING, AgentState.COMPLETED);
                    logger.agentEnd({ success: true, finalMessageCount: currentMessages.length });
                    console.log('✅ [StatefulAgent] Completed (via reflection)');
                    
                    // 必须 yield 最终状态，否则调用方无法收到完成信号
                    yield {
                      messages: currentMessages,
                      state: AgentState.COMPLETED,
                    };
                    return; // 结束生成器
                  } else {
                    // 还没有渲染结果，注入提示让 LLM 调用渲染工具
                    console.log('🔍 [Reflector] Task logic complete, but no render yet. Injecting render hint...');
                    
                    // 查找最后一次业务操作的结果
                    const lastBusinessOp = completedStepObservations
                      .filter(obs => obs.success && obs.toolName && !obs.toolName.startsWith('render_'))
                      .pop();
                    
                    let specificHint = '';
                    if (lastBusinessOp) {
                      try {
                        const result = JSON.parse(lastBusinessOp.result);
                        if (result.success && result.data) {
                          const data = result.data.data || result.data;
                          
                          // 针对不同的操作类型给出具体的渲染指导
                          if (lastBusinessOp.toolName === 'transaction') {
                            const action = lastBusinessOp.toolArgs?.action;
                            
                            if (action === 'statistics' || action === 'query') {
                              // 统计或查询操作：数据中包含 transactions 数组和 statistics 对象
                              specificHint = `\n\n**重要**：上一步工具返回的数据中包含：\n- statistics: 统计数据（totalExpense, totalIncome, balance等）\n- transactions: 交易列表数组\n\n请调用 render_transaction_list 工具，将这些数据传入对应参数：\n- statistics: 传入统计数据对象\n- transactions: 传入交易列表数组（不要传空数组！）`;
                            } else if (action === 'create' || action === 'update' || action === 'get') {
                              // 单条记录操作
                              specificHint = `\n\n请调用 render_transaction_detail 工具，传入上一步返回的交易数据。`;
                            }
                          } else if (lastBusinessOp.toolName === 'category' && Array.isArray(data)) {
                            specificHint = `\n\n请调用 render_category_list 工具，传入上一步返回的分类数据。`;
                          }
                        }
                      } catch (e) {
                        console.warn('⚠️ [Reflector] Failed to parse last business operation result:', e);
                      }
                    }
                    
                    // 构建渲染提示，让 LLM 知道需要渲染结果
                    const renderHint = new HumanMessage({
                      content: `[系统] 操作已成功完成，请调用合适的渲染工具将结果展示给用户。${specificHint}`,
                    });
                    currentMessages.push(renderHint);
                    
                    // 继续循环，让 LLM 调用渲染工具
                  }
                }

                if (reflectionResult.nextAction === 'abort') {
                  console.warn('🔍 [Reflector] Recommends abort, but continuing...');
                  // 反思器建议中止，但我们让用户决定
                  // 可以在这里添加用户确认逻辑
                }

                // ============ 策略调整：注入纠正提示并跳出当前循环 ============
                if (reflectionResult.nextAction === 'adjust_strategy') {
                  console.log('🔍 [Reflector] Strategy adjustment:', reflectionResult.strategyAdjustment);
                  
                  // 构建强制性的纠正指令
                  const correctionParts: string[] = [];
                  
                  if (reflectionResult.correctionHint) {
                    correctionParts.push(`**纠正指令**: ${reflectionResult.correctionHint}`);
                  }
                  
                  if (reflectionResult.suggestedTool) {
                    correctionParts.push(`**必须使用的工具**: ${reflectionResult.suggestedTool.name}`);
                    correctionParts.push(`**原因**: ${reflectionResult.suggestedTool.reason}`);
                    if (reflectionResult.suggestedTool.args) {
                      correctionParts.push(`**建议参数**: ${JSON.stringify(reflectionResult.suggestedTool.args)}`);
                    }
                  }
                  
                  if (correctionParts.length > 0) {
                    // 使用 HumanMessage 而不是 ToolMessage，让 LLM 更容易注意到
                    const correctionMessage = `[系统] 上一步操作需要调整。请严格按照以下指令执行：

${correctionParts.join('\n')}

**重要**：你必须按照上述指令行动，不要跳过或忽略这个步骤！`;
                    
                    console.log('💡 [Reflector] Injecting correction as HumanMessage');
                    console.log(correctionMessage);
                    
                    currentMessages.push(
                      new HumanMessage({
                        content: correctionMessage,
                      })
                    );
                    
                    // 跳出当前 tool_calls 循环，强制 LLM 重新决策
                    console.log('🔄 [Reflector] Breaking out of tool_calls loop to force new LLM decision');
                    break;
                  }
                }
              }
            }
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

            // ============ 记录失败的步骤观察（无论是否启用反思模式） ============
            const failedObservation: StepObservation = {
              stepId: toolCall.id || `step_${iterations}_${Date.now()}`,
              stepDescription: `调用 ${toolCall.name}`,
              toolName: toolCall.name,
              toolArgs: toolCall.args,
              result: '',
              success: false,
              error: result.error,
              duration: toolDuration,
            };
            completedStepObservations.push(failedObservation);

            // ============ 失败时的反思（可选） ============
            if (enableReflection && reflector.isEnabled()) {
              if (reflector.shouldReflect(failedObservation, 0)) {
                stateMachine.transition(AgentState.REFLECTING);
                callbacks?.onStateChange?.(AgentState.EXECUTING, AgentState.REFLECTING);

                const reflectionContext: ReflectionContext = {
                  userRequest: currentUserRequest,
                  plan: {
                    id: 'dynamic',
                    description: currentUserRequest || '动态执行',  // 使用原始输入，不是改写后的提示
                    steps: [],
                    requiresConfirmation: false,
                    createdAt: Date.now(),
                  },
                  completedSteps: completedStepObservations,
                  currentObservation: failedObservation,
                  remainingSteps: [],
                };

                const reflectionResult = await reflector.reflect(reflectionContext);
                // observation 已经在上面添加到 completedStepObservations 了

                callbacks?.onReflection?.(reflectionResult);
                callbacks?.onStep?.({
                  type: 'reflection',
                  content: reflector.formatForDisplay(reflectionResult),
                  reflectionResult,
                });

                stateMachine.transition(AgentState.EXECUTING);
                callbacks?.onStateChange?.(AgentState.REFLECTING, AgentState.EXECUTING);

                // 处理反思结果
                if (reflectionResult.nextAction === 'complete' || reflectionResult.isTaskComplete) {
                  // 检查是否已经调用过渲染工具
                  const hasRenderedResult = completedStepObservations.some(
                    obs => obs.toolName?.startsWith('render_')
                  );
                  
                  if (hasRenderedResult) {
                    console.log('🔍 [Reflector] Task complete after error with render, ending');
                    stateMachine.transition(AgentState.SUMMARIZING);
                    callbacks?.onStateChange?.(AgentState.EXECUTING, AgentState.SUMMARIZING);
                    stateMachine.transition(AgentState.COMPLETED);
                    callbacks?.onStateChange?.(AgentState.SUMMARIZING, AgentState.COMPLETED);
                    logger.agentEnd({ success: true, finalMessageCount: currentMessages.length });
                    yield { messages: currentMessages, state: AgentState.COMPLETED };
                    return;
                  } else {
                    // 失败后判断完成但没有渲染，继续让 LLM 处理
                    console.log('🔍 [Reflector] Task complete after error, but no render. Continuing...');
                  }
                }

                // ============ 关键：失败后的策略调整 ============
                if (reflectionResult.nextAction === 'adjust_strategy' || 
                    reflectionResult.nextAction === 'retry' ||
                    reflectionResult.nextAction === 'continue') {
                  
                  // 构建强制性的纠正指令
                  const correctionParts: string[] = [];
                  
                  if (reflectionResult.correctionHint) {
                    correctionParts.push(`**纠正指令**: ${reflectionResult.correctionHint}`);
                  }
                  
                  if (reflectionResult.suggestedTool) {
                    correctionParts.push(`**必须使用的工具**: ${reflectionResult.suggestedTool.name}`);
                    correctionParts.push(`**原因**: ${reflectionResult.suggestedTool.reason}`);
                    if (reflectionResult.suggestedTool.args) {
                      correctionParts.push(`**建议参数**: ${JSON.stringify(reflectionResult.suggestedTool.args)}`);
                    }
                  }
                  
                  if (correctionParts.length > 0) {
                    // 构建强制性的系统级纠正消息
                    const correctionMessage = `[系统] 上一步操作失败。请严格按照以下指令重新执行：

${correctionParts.join('\n')}

**重要**：你必须按照上述指令行动，不要跳过或忽略这个步骤！`;
                    
                    console.log('💡 [Reflector] Injecting error correction as HumanMessage');
                    console.log(correctionMessage);
                    
                    // 使用 HumanMessage 而不是修改 ToolMessage，这样更容易被 LLM 注意到
                    currentMessages.push(
                      new HumanMessage({
                        content: correctionMessage,
                      })
                    );
                  }
                }

                if (reflectionResult.errorCorrection) {
                  console.log('🔍 [Reflector] Error correction:', reflectionResult.errorCorrection);
                }
              }
            }
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
        // 从当前状态转换到 CANCELLED，再转换到 IDLE
        const currentState = stateMachine.getState();
        if (currentState !== AgentState.IDLE && 
            currentState !== AgentState.CANCELLED) {
          stateMachine.transition(AgentState.CANCELLED);
        }
        if (stateMachine.getState() === AgentState.CANCELLED) {
          stateMachine.transition(AgentState.IDLE);
        }
        callbacks?.onStep?.({ type: 'cancelled', content: '已取消' });
        yield { messages: currentMessages, state: AgentState.CANCELLED };
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
      // 只有当前不是 IDLE 状态时才尝试转换
      const currentState = stateMachine.getState();
      if (currentState !== AgentState.IDLE) {
        // 根据当前状态选择合适的转换路径
        if (currentState === AgentState.COMPLETED || 
            currentState === AgentState.ERROR || 
            currentState === AgentState.CANCELLED) {
          // 终态可以直接转换到 IDLE
          stateMachine.transition(AgentState.IDLE);
        } else {
          // 其他状态先转换到 CANCELLED，再转换到 IDLE
          stateMachine.transition(AgentState.CANCELLED);
          stateMachine.transition(AgentState.IDLE);
        }
      }
    },

    /**
     * 重置 Agent 状态
     */
    reset: () => {
      cancellationController.reset();
      stateMachine.reset();
      confirmationResolver = null;
      pendingConfirmation = null;
      // 重置反思状态
      completedStepObservations = [];
      currentUserRequest = '';
      currentRewrittenIntent = null;
      reflector.reset();
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
     * 是否正在反思
     */
    isReflecting: () => stateMachine.getState() === AgentState.REFLECTING,

    /**
     * 获取反思器
     */
    getReflector: () => reflector,

    /**
     * 更新反思器配置
     * 如果启用反思模式但模型未初始化，会自动初始化
     */
    updateReflectorConfig: (config: Partial<ReflectorConfig>) => {
      reflector.updateConfig(config);
      // 如果启用了反思但模型未初始化，需要初始化
      if (config.enabled && !reflector.isEnabled()) {
        console.log('🔍 [StatefulAgent] Initializing reflector on enable');
        reflector.initialize(apiKey);
      }
    },

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
     * 获取 Intent Rewriter
     */
    getIntentRewriter: () => intentRewriter,
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

// 导出反思相关类型
export type {
  ReflectorConfig,
  ReflectionResult,
  StepObservation,
  ReflectionContext,
} from './reflector';
