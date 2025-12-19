/**
 * AI 驱动的执行计划生成器
 * 
 * 核心理念：
 * 1. 由 LLM 分析用户意图，生成结构化执行计划
 * 2. 按计划逐步执行，每步完成后可动态调整
 * 3. 支持复杂的多步骤任务和条件分支
 * 
 * 与静态模板的区别：
 * - 旧方案：正则匹配 → 返回预定义步骤（死板、无法处理复杂任务）
 * - 新方案：LLM 分析 → 动态生成计划 → 执行中可调整（灵活、智能）
 */

import { HumanMessage, SystemMessage, BaseMessage } from "@langchain/core/messages";
import type { MessageContentText, MessageContentImageUrl } from "@langchain/core/messages";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { StructuredToolInterface } from '@langchain/core/tools';
import { ExecutionPlan, PlanStep, PlanStepType } from './stateMachine';
import { DEFAULT_MODEL, DEFAULT_PROVIDER, AIProvider } from '../services/apiKeyStorage';
import { createChatModel } from './modelFactory';

// 多模态内容类型
type MultimodalContent = string | (MessageContentText | MessageContentImageUrl)[];

// ============ 类型定义 ============

/**
 * 计划生成上下文
 * 包含生成计划所需的所有信息
 */
export interface PlanContext {
  /** 可用的工具列表 */
  availableTools: StructuredToolInterface[];
  /** 用户偏好设置 */
  userPreferences?: {
    /** 高风险操作是否需要确认 */
    confirmHighRisk: boolean;
    /** 中风险操作是否需要确认 */
    confirmMediumRisk: boolean;
    /** 批量操作确认阈值（超过此数量需确认） */
    batchThreshold: number;
  };
}

/**
 * LLM 返回的原始计划步骤
 * 这是 LLM 生成的 JSON 结构
 */
interface LLMPlanStep {
  /** 步骤描述 */
  description: string;
  /** 步骤类型 */
  type: 'analyze' | 'tool_call' | 'confirm' | 'summarize' | 'goal';
  /** 期望的结果（type 为 goal 时使用） */
  expectedOutcome?: string;
  /** 要调用的工具名称（type 为 tool_call 时必填） */
  toolName?: string;
  /** 工具参数的描述或预估值 */
  toolArgs?: Record<string, any>;
  /** 是否需要用户确认 */
  requiresConfirmation?: boolean;
  /** 依赖的步骤索引（从 0 开始） */
  dependsOn?: number[];
  /** 条件执行：只有当条件满足时才执行此步骤 */
  condition?: string;
}

/**
 * LLM 返回的完整计划
 */
interface LLMPlan {
  /** 计划的整体描述 */
  description: string;
  /** 执行步骤列表 */
  steps: LLMPlanStep[];
  /** 是否包含危险操作，需要整体确认 */
  requiresConfirmation: boolean;
  /** 预估复杂度：simple（1-2步）、medium（3-5步）、complex（5+步） */
  complexity: 'simple' | 'medium' | 'complex';
  /** 从图片/收据提取的信息 */
  extractedInfo?: {
    amount?: number;
    type?: 'EXPENSE' | 'INCOME';
    category?: string;
    description?: string;
    date?: string;
    paymentMethod?: string;
    notes?: string;
  };
}

/**
 * 计划执行状态
 * 用于跟踪计划执行进度和支持动态调整
 */
export interface PlanExecutionState {
  /** 当前执行的计划 */
  plan: ExecutionPlan;
  /** 当前步骤索引 */
  currentStepIndex: number;
  /** 每个步骤的执行结果 */
  stepResults: Map<string, StepResult>;
  /** 是否需要重新规划 */
  needsReplanning: boolean;
  /** 重新规划的原因 */
  replanReason?: string;
}

/**
 * 单个步骤的执行结果
 */
export interface StepResult {
  /** 步骤 ID */
  stepId: string;
  /** 是否成功 */
  success: boolean;
  /** 执行结果（工具返回值或 LLM 响应） */
  result?: any;
  /** 错误信息 */
  error?: string;
  /** 执行耗时（毫秒） */
  duration?: number;
}

/**
 * 计划估算结果
 */
export interface PlanEstimate {
  /** 预估步骤数 */
  estimatedSteps: number;
  /** 预估耗时描述 */
  estimatedDuration: string;
  /** 风险级别 */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  /** 是否需要确认 */
  confirmationRequired: boolean;
  /** 警告信息 */
  warnings: string[];
}

// ============ 常量定义 ============

/**
 * 高风险操作列表
 * 这些操作的调用需要用户确认
 */
const HIGH_RISK_ACTIONS = [
  'delete',
  'batch_create',
  'batch_delete',
  'clear',
];

/**
 * 中风险操作列表
 */
const MEDIUM_RISK_ACTIONS = [
  'update',
];

// ============ 计划生成的 System Prompt ============

/**
 * 构建 Planner 的系统提示词
 * 
 * 设计原则：
 * 1. Planner 只负责理解用户意图和提取信息
 * 2. 不需要知道具体工具，由 Executor 决定（工具有自描述）
 * 3. 计划步骤是目标导向的
 * 4. 不硬编码工具参数格式，由执行器根据工具 schema 自动处理
 */
function buildPlannerSystemPrompt(_tools: StructuredToolInterface[]): string {
  return `你是一个智能计划生成器，负责分析用户请求并生成高层执行计划。

## 核心规则

1. **只输出 JSON**：回复必须是纯 JSON，无需 markdown 代码块
2. **目标导向**：描述"要达成什么"，不指定具体工具
3. **提取信息**：从用户输入/图片中提取结构化信息

## JSON 结构

{
  "description": "计划整体目标",
  "complexity": "simple|medium|complex",
  "requiresConfirmation": false,
  "steps": [{"description": "目标描述", "type": "goal", "expectedOutcome": "期望结果"}],
  "extractedInfo": {"amount": 数字, "type": "EXPENSE|INCOME", "category": "分类名", "description": "描述", "date": "YYYY-MM-DD", "paymentMethod": "支付方式"}
}

## 重要

- complexity: simple(1-2步) / medium(3-5步) / complex(5+步)
- extractedInfo.type: 必须大写 "EXPENSE"(支出) 或 "INCOME"(收入)
- 删除、批量操作需要 requiresConfirmation: true`;
}

// ============ AI 驱动的计划生成器 ============

/**
 * AI 驱动的执行计划生成器
 * 
 * 使用 LLM 分析用户意图并生成结构化执行计划，
 * 支持动态调整和重新规划。
 */
export class ExecutionPlanGenerator {
  private plannerModel: BaseChatModel | null = null;
  private apiKey: string | null = null;
  private provider: AIProvider = DEFAULT_PROVIDER;
  private modelName: string = DEFAULT_MODEL;
  private context: PlanContext;
  private executionState: PlanExecutionState | null = null;

  constructor(tools: StructuredToolInterface[], userPreferences?: PlanContext['userPreferences']) {
    this.context = {
      availableTools: tools,
      userPreferences: userPreferences ?? {
        confirmHighRisk: true,
        confirmMediumRisk: false,
        batchThreshold: 5,
      },
    };
  }

  /**
   * 设置 API Key 并初始化 LLM
   * @param apiKey API 密钥
   * @param provider AI 提供商（可选，默认使用 Gemini）
   * @param model 模型名称（可选，默认使用 DEFAULT_MODEL）
   * @param baseURL 自定义 Base URL（可选，用于第三方网关）
   */
  setApiKey(apiKey: string, provider?: AIProvider, model?: string, baseURL?: string): void {
    this.apiKey = apiKey;
    this.provider = provider || DEFAULT_PROVIDER;
    this.modelName = model || DEFAULT_MODEL;
    
    // 使用模型工厂创建模型（支持多种 AI 提供商）
    this.plannerModel = createChatModel({
      provider: this.provider,
      model: this.modelName,
      apiKey,
      temperature: 0,
      maxRetries: 2,
      baseURL,
    });
    
    console.log(`🧠 [Planner] LLM initialized with ${this.provider}/${this.modelName}${baseURL ? ` @ ${baseURL}` : ''}`);
  }

  /**
   * 生成执行计划（AI 驱动）
   * @param userInput 用户输入，支持纯文本或多模态内容（包含图片）
   */
  async generatePlan(userInput: string | MultimodalContent): Promise<ExecutionPlan | null> {
    // 提取文本用于日志和 fallback
    const textContent = this.extractTextFromContent(userInput);
    
    if (!this.plannerModel) {
      console.log('⚠️ [Planner] LLM not configured, using fallback local planning');
      return this.generateFallbackPlan(textContent);
    }

    try {
      // 日志：只显示文本部分，避免打印大量 base64
      console.log('🧠 [Planner] Generating plan for:', textContent.substring(0, 200));
      
      // 构建消息内容 - 支持多模态
      const messageContent = typeof userInput === 'string' ? userInput : userInput;
      
      // 动态生成系统提示词（基于可用工具列表）
      const systemPrompt = buildPlannerSystemPrompt(this.context.availableTools);
      
      const response = await this.plannerModel.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(messageContent),
      ]);

      const content = typeof response.content === 'string' 
        ? response.content 
        : JSON.stringify(response.content);
      
      console.log('🧠 [Planner] LLM response:', content);
      
      const llmPlan = this.parseLLMResponse(content);
      if (!llmPlan) {
        console.warn('⚠️ [Planner] Failed to parse LLM response, using fallback');
        return this.generateFallbackPlan(textContent);
      }

      const plan = this.convertToExecutionPlan(llmPlan, textContent);
      
      const validation = this.validatePlan(plan);
      if (!validation.valid) {
        console.warn('⚠️ [Planner] Plan validation failed:', validation.errors);
        return this.generateFallbackPlan(textContent);
      }

      this.applyUserPreferences(plan);

      console.log('✅ [Planner] Plan generated:', plan.description);
      console.log('📋 [Planner] Steps:', plan.steps.length);
      
      return plan;

    } catch (error) {
      console.error('❌ [Planner] Error generating plan:', error);
      return this.generateFallbackPlan(textContent);
    }
  }

  /**
   * 从多模态内容中提取纯文本
   */
  private extractTextFromContent(content: string | MultimodalContent): string {
    if (typeof content === 'string') {
      return content;
    }
    // 多模态内容：提取所有文本部分
    return content
      .filter((part): part is MessageContentText => part.type === 'text')
      .map(part => part.text)
      .join('\n');
  }

  /**
   * 解析 LLM 响应为计划对象
   */
  private parseLLMResponse(content: string): LLMPlan | null {
    try {
      let jsonStr = content.trim();
      
      // 处理 markdown 代码块
      if (jsonStr.startsWith('```')) {
        const lines = jsonStr.split('\n');
        lines.shift();
        if (lines[lines.length - 1]?.trim() === '```') {
          lines.pop();
        }
        jsonStr = lines.join('\n');
      }

      const startIdx = jsonStr.indexOf('{');
      const endIdx = jsonStr.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1) {
        jsonStr = jsonStr.substring(startIdx, endIdx + 1);
      }

      const parsed = JSON.parse(jsonStr) as LLMPlan;
      
      if (!parsed.description || !Array.isArray(parsed.steps)) {
        console.warn('⚠️ [Planner] Invalid plan structure');
        return null;
      }

      return parsed;
    } catch (error) {
      console.error('❌ [Planner] JSON parse error:', error);
      return null;
    }
  }

  /**
   * 将 LLM 生成的计划转换为内部执行计划格式
   */
  private convertToExecutionPlan(llmPlan: LLMPlan, userInput: string): ExecutionPlan {
    const planId = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const steps: PlanStep[] = llmPlan.steps.map((step, index) => {
      let stepType: PlanStepType;
      switch (step.type) {
        case 'analyze':
        case 'summarize':
        case 'goal':  // 新增：目标导向的步骤
          stepType = 'llm_call';  // goal 类型由 LLM 自主决定如何执行
          break;
        case 'tool_call':
          stepType = 'tool_call';
          break;
        case 'confirm':
          stepType = 'confirmation';
          break;
        default:
          stepType = 'llm_call';
      }

      const dependencies = (step.dependsOn || []).map(idx => `${planId}_step_${idx}`);

      return {
        id: `${planId}_step_${index}`,
        type: stepType,
        description: step.description,
        toolName: step.toolName,
        toolArgs: step.toolArgs,
        status: 'pending' as const,
        dependencies,
        metadata: {
          condition: step.condition,
          requiresConfirmation: step.requiresConfirmation,
          expectedOutcome: (step as any).expectedOutcome,  // 保存期望结果
        },
      };
    });

    // 如果 LLM 提取了信息（如从收据），保存到计划元数据中
    const extractedInfo = (llmPlan as any).extractedInfo;
    
    // 归一化 extractedInfo.type 为大写
    if (extractedInfo?.type) {
      const typeUpper = String(extractedInfo.type).toUpperCase();
      if (typeUpper === 'EXPENSE' || typeUpper === 'INCOME') {
        extractedInfo.type = typeUpper;
      }
    }

    return {
      id: planId,
      description: llmPlan.description,
      steps,
      requiresConfirmation: llmPlan.requiresConfirmation,
      createdAt: Date.now(),
      metadata: {
        complexity: llmPlan.complexity,
        userInput,
        generatedBy: 'ai',
        extractedInfo,  // 保存提取的信息供 Executor 使用
      },
    };
  }

  /**
   * 应用用户偏好设置
   */
  private applyUserPreferences(plan: ExecutionPlan): void {
    const { userPreferences } = this.context;
    if (!userPreferences) return;

    for (const step of plan.steps) {
      if (step.type === 'tool_call' && step.args?.action) {
        const action = step.args.action;
        
        if (HIGH_RISK_ACTIONS.includes(action) && userPreferences.confirmHighRisk) {
          step.metadata = { ...step.metadata, requiresConfirmation: true };
          plan.requiresConfirmation = true;
        }
        
        if (MEDIUM_RISK_ACTIONS.includes(action) && userPreferences.confirmMediumRisk) {
          step.metadata = { ...step.metadata, requiresConfirmation: true };
        }
      }
    }
  }

  /**
   * 后备计划生成（本地规则）
   * 当 LLM 不可用或失败时使用
   */
  private generateFallbackPlan(userInput: string): ExecutionPlan {
    const planId = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const lowerInput = userInput.toLowerCase();
    let description = '执行用户请求';
    let steps: PlanStep[] = [];
    let requiresConfirmation = false;

    if (lowerInput.includes('删除') || lowerInput.includes('移除')) {
      description = '删除交易记录';
      requiresConfirmation = true;
      steps = [
        {
          id: `${planId}_step_0`,
          type: 'llm_call',
          description: '分析要删除的记录',
          status: 'pending',
          dependencies: [],
        },
        {
          id: `${planId}_step_1`,
          type: 'tool_call',
          description: '查询匹配的记录',
          toolName: 'transaction',
          args: { action: 'query' },
          status: 'pending',
          dependencies: [`${planId}_step_0`],
        },
        {
          id: `${planId}_step_2`,
          type: 'confirmation',
          description: '确认删除操作',
          status: 'pending',
          dependencies: [`${planId}_step_1`],
        },
        {
          id: `${planId}_step_3`,
          type: 'tool_call',
          description: '执行删除',
          toolName: 'transaction',
          args: { action: 'delete' },
          status: 'pending',
          dependencies: [`${planId}_step_2`],
        },
      ];
    } else if (lowerInput.includes('查询') || lowerInput.includes('查看') || lowerInput.includes('统计')) {
      description = '查询交易数据';
      steps = [
        {
          id: `${planId}_step_0`,
          type: 'llm_call',
          description: '分析查询条件',
          status: 'pending',
          dependencies: [],
        },
        {
          id: `${planId}_step_1`,
          type: 'tool_call',
          description: '执行查询',
          toolName: 'transaction',
          args: { action: 'query' },
          status: 'pending',
          dependencies: [`${planId}_step_0`],
        },
        {
          id: `${planId}_step_2`,
          type: 'tool_call',
          description: '展示结果',
          toolName: 'render_transaction_list',
          status: 'pending',
          dependencies: [`${planId}_step_1`],
        },
      ];
    } else {
      description = '记录交易';
      steps = [
        {
          id: `${planId}_step_0`,
          type: 'llm_call',
          description: '解析交易信息',
          status: 'pending',
          dependencies: [],
        },
        {
          id: `${planId}_step_1`,
          type: 'tool_call',
          description: '创建交易记录',
          toolName: 'transaction',
          args: { action: 'create' },
          status: 'pending',
          dependencies: [`${planId}_step_0`],
        },
        {
          id: `${planId}_step_2`,
          type: 'tool_call',
          description: '展示创建结果',
          toolName: 'render_transaction_detail',
          status: 'pending',
          dependencies: [`${planId}_step_1`],
        },
      ];
    }

    return {
      id: planId,
      description,
      steps,
      requiresConfirmation,
      createdAt: Date.now(),
      metadata: {
        userInput,
        generatedBy: 'fallback',
      },
    };
  }

  // ============ 动态调整相关方法 ============

  /**
   * 根据执行结果动态调整计划
   * 
   * 这是 AI 驱动规划的核心特性：
   * 根据每一步的执行结果，决定是否需要修改后续步骤
   */
  async adjustPlanIfNeeded(stepResult: StepResult): Promise<{
    needsAdjustment: boolean;
    newSteps?: PlanStep[];
    reason?: string;
  }> {
    if (!this.executionState) {
      return { needsAdjustment: false };
    }

    const { plan, currentStepIndex } = this.executionState;
    const currentStep = plan.steps[currentStepIndex];

    this.executionState.stepResults.set(stepResult.stepId, stepResult);

    if (!stepResult.success) {
      console.log('⚠️ [Planner] Step failed, checking if replan needed');
      
      const hasDependent = plan.steps.some(s => 
        s.dependencies.includes(stepResult.stepId) && s.status === 'pending'
      );

      if (hasDependent) {
        return {
          needsAdjustment: true,
          reason: `步骤 "${currentStep.description}" 失败，需要调整后续计划`,
        };
      }
    }

    const nextSteps = plan.steps.filter(s => 
      s.status === 'pending' && 
      s.metadata?.condition
    );

    for (const step of nextSteps) {
      console.log(`📋 [Planner] Conditional step: ${step.description}, condition: ${step.metadata?.condition}`);
    }

    return { needsAdjustment: false };
  }

  /**
   * 重新生成计划（基于当前执行状态）
   */
  async replan(reason: string): Promise<ExecutionPlan | null> {
    if (!this.executionState || !this.plannerModel) {
      return null;
    }

    const { plan, stepResults } = this.executionState;
    
    const completedSummary = Array.from(stepResults.entries())
      .map(([id, result]) => {
        const step = plan.steps.find(s => s.id === id);
        return `- ${step?.description}: ${result.success ? '成功' : '失败'} ${result.error || ''}`;
      })
      .join('\n');

    const replanPrompt = `原计划: ${plan.description}

已完成的步骤:
${completedSummary}

需要重新规划的原因: ${reason}

请生成新的执行计划来完成剩余任务。`;

    console.log('🔄 [Planner] Replanning:', replanPrompt);

    const userInput = plan.metadata?.userInput || plan.description;
    return this.generatePlan(`${userInput}\n\n[重新规划] ${replanPrompt}`);
  }

  // ============ 执行状态管理 ============

  initExecutionState(plan: ExecutionPlan): void {
    this.executionState = {
      plan,
      currentStepIndex: 0,
      stepResults: new Map(),
      needsReplanning: false,
    };
  }

  advanceStep(): PlanStep | null {
    if (!this.executionState) return null;
    
    this.executionState.currentStepIndex++;
    const { plan, currentStepIndex } = this.executionState;
    
    if (currentStepIndex >= plan.steps.length) {
      return null;
    }
    
    return plan.steps[currentStepIndex];
  }

  getCurrentStep(): PlanStep | null {
    if (!this.executionState) return null;
    const { plan, currentStepIndex } = this.executionState;
    return plan.steps[currentStepIndex] || null;
  }

  getExecutionState(): PlanExecutionState | null {
    return this.executionState;
  }

  // ============ 计划验证和估算 ============

  validatePlan(plan: ExecutionPlan): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!plan.id) errors.push('计划缺少 ID');
    if (!plan.description) errors.push('计划缺少描述');
    if (!plan.steps || plan.steps.length === 0) errors.push('计划没有步骤');

    const ids = plan.steps.map(s => s.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      errors.push('存在重复的步骤 ID');
    }

    for (const step of plan.steps) {
      for (const dep of step.dependencies) {
        if (!ids.includes(dep)) {
          errors.push(`步骤 ${step.id} 依赖不存在的步骤 ${dep}`);
        }
      }
    }

    if (this.hasCircularDependency(plan.steps)) {
      errors.push('存在循环依赖');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private hasCircularDependency(steps: PlanStep[]): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const stepMap = new Map(steps.map(s => [s.id, s]));

    const dfs = (stepId: string): boolean => {
      visited.add(stepId);
      recursionStack.add(stepId);

      const step = stepMap.get(stepId);
      if (step) {
        for (const dep of step.dependencies) {
          if (!visited.has(dep)) {
            if (dfs(dep)) return true;
          } else if (recursionStack.has(dep)) {
            return true;
          }
        }
      }

      recursionStack.delete(stepId);
      return false;
    };

    for (const step of steps) {
      if (!visited.has(step.id)) {
        if (dfs(step.id)) return true;
      }
    }

    return false;
  }

  estimatePlan(plan: ExecutionPlan): PlanEstimate {
    const warnings: string[] = [];
    let maxRisk: PlanEstimate['riskLevel'] = 'low';

    const llmCalls = plan.steps.filter(s => s.type === 'llm_call').length;
    const toolCalls = plan.steps.filter(s => s.type === 'tool_call').length;
    const confirmations = plan.steps.filter(s => s.type === 'confirmation').length;

    const estimatedSeconds = llmCalls * 3 + toolCalls * 2 + confirmations * 10;
    const estimatedDuration = estimatedSeconds < 60 
      ? `约${estimatedSeconds}秒`
      : `约${Math.ceil(estimatedSeconds / 60)}分钟`;

    for (const step of plan.steps) {
      if (step.type === 'tool_call') {
        const action = step.args?.action;
        
        if (action && HIGH_RISK_ACTIONS.includes(action)) {
          maxRisk = 'high';
          warnings.push(`⚠️ 包含高风险操作: ${step.description}`);
        } else if (action && MEDIUM_RISK_ACTIONS.includes(action) && maxRisk === 'low') {
          maxRisk = 'medium';
        }
      }
    }

    return {
      estimatedSteps: plan.steps.length,
      estimatedDuration,
      riskLevel: maxRisk,
      confirmationRequired: plan.requiresConfirmation,
      warnings,
    };
  }

  formatPlanForDisplay(plan: ExecutionPlan): string {
    const estimate = this.estimatePlan(plan);
    
    let output = `📋 **执行计划**: ${plan.description}\n\n`;
    output += `⏱️ 预估: ${estimate.estimatedSteps}个步骤, ${estimate.estimatedDuration}\n`;
    output += `🎯 风险级别: ${this.getRiskLabel(estimate.riskLevel)}\n`;
    
    if (estimate.warnings.length > 0) {
      output += `\n${estimate.warnings.join('\n')}\n`;
    }

    output += '\n**步骤详情:**\n';
    
    plan.steps.forEach((step, index) => {
      const icon = this.getStepIcon(step.type);
      const status = this.getStatusIcon(step.status);
      output += `${index + 1}. ${icon} ${step.description} ${status}\n`;
      
      if (step.toolName) {
        const action = step.args?.action ? ` (${step.args.action})` : '';
        output += `   └─ 工具: ${step.toolName}${action}\n`;
      }
    });

    if (plan.requiresConfirmation) {
      output += '\n⚠️ **需要您的确认才能执行**\n';
    }

    return output;
  }

  private getStepIcon(type: PlanStepType): string {
    switch (type) {
      case 'llm_call': return '🤖';
      case 'tool_call': return '🔧';
      case 'confirmation': return '✋';
      default: return '•';
    }
  }

  private getStatusIcon(status: PlanStep['status']): string {
    switch (status) {
      case 'pending': return '⏳';
      case 'running': return '🔄';
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'skipped': return '⏭️';
      default: return '';
    }
  }

  private getRiskLabel(level: PlanEstimate['riskLevel']): string {
    switch (level) {
      case 'low': return '🟢 低';
      case 'medium': return '🟡 中';
      case 'high': return '🟠 高';
      case 'critical': return '🔴 关键';
      default: return level;
    }
  }
}

// ============ 导出工厂函数 ============

export function createPlanGenerator(
  tools: StructuredToolInterface[],
  userPreferences?: PlanContext['userPreferences']
): ExecutionPlanGenerator {
  return new ExecutionPlanGenerator(tools, userPreferences);
}

export type { LLMPlan, LLMPlanStep };
