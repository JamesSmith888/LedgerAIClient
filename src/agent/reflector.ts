/**
 * ReAct Reflector - 反思器模块
 * 
 * 核心理念：
 * 在每个执行步骤后，由独立的 LLM 调用进行反思和评估：
 * 1. 评估当前步骤的执行结果
 * 2. 判断是否需要调整策略
 * 3. 决定下一步行动
 * 4. 检测是否已完成任务
 * 
 * 这是 ReAct 模式的核心：Thought → Action → Observation → Thought → ...
 * 
 * 参考论文：ReAct: Synergizing Reasoning and Acting in Language Models
 * https://arxiv.org/abs/2210.03629
 */

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { StructuredToolInterface } from "@langchain/core/tools";
import { ExecutionPlan, PlanStep } from "./stateMachine";
import { DEFAULT_MODEL, DEFAULT_PROVIDER, AIProvider } from "../services/apiKeyStorage";
import { createChatModel } from "./modelFactory";

// ============ 类型定义 ============

/**
 * 反思结果
 */
export interface ReflectionResult {
  /** 当前步骤是否成功 */
  stepSuccess: boolean;
  
  /** 反思内容（展示给用户的思考过程） */
  thought: string;
  
  /** 下一步行动建议 */
  nextAction: ReflectionAction;
  
  /** 任务是否已完成 */
  isTaskComplete: boolean;
  
  /** 完成度百分比 (0-100) */
  progressPercent: number;
  
  /** 如果需要调整策略，给出新的建议 */
  strategyAdjustment?: string;
  
  /** 如果检测到错误，给出修正建议 */
  errorCorrection?: string;
  
  /**
   * 纠正提示 - 注入到主 LLM 的下一轮调用中
   * 这是反思器给主执行模型的具体指令，告诉它如何修正错误或调整策略
   * 例如："上一步统计接口调用失败，请改用 query 接口查询今天的交易列表，然后手动计算总额"
   */
  correctionHint?: string;
  
  /**
   * 建议使用的替代工具
   * 当某个工具调用失败时，反思器可以建议使用其他工具达成相同目的
   */
  suggestedTool?: {
    name: string;
    reason: string;
    args?: Record<string, any>;
  };
  
  /** 置信度 (0-1) */
  confidence: number;
}

/**
 * 反思建议的行动类型
 */
export type ReflectionAction = 
  | 'continue'        // 继续执行下一步
  | 'retry'           // 重试当前步骤
  | 'adjust_strategy' // 调整策略后继续
  | 'ask_user'        // 需要用户输入/确认
  | 'complete'        // 任务完成
  | 'abort';          // 中止任务

/**
 * 执行步骤的观察结果
 */
export interface StepObservation {
  /** 步骤 ID */
  stepId: string;
  
  /** 步骤描述 */
  stepDescription: string;
  
  /** 工具名称（如果是工具调用） */
  toolName?: string;
  
  /** 工具参数 */
  toolArgs?: Record<string, any>;
  
  /** 执行结果 */
  result: string;
  
  /** 是否成功 */
  success: boolean;
  
  /** 错误信息（如果失败） */
  error?: string;
  
  /** 执行耗时（毫秒） */
  duration?: number;
}

/**
 * 反思上下文
 */
export interface ReflectionContext {
  /** 用户原始请求 */
  userRequest: string;
  
  /** 当前执行计划 */
  plan: ExecutionPlan;
  
  /** 已完成的步骤和结果 */
  completedSteps: StepObservation[];
  
  /** 当前步骤的观察结果 */
  currentObservation: StepObservation;
  
  /** 剩余的步骤 */
  remainingSteps: PlanStep[];
}

/**
 * 反思器配置
 */
export interface ReflectorConfig {
  /** 是否启用反思模式 */
  enabled: boolean;
  
  /** 反思频率：every_step（每步）| on_error（出错时）| on_milestone（里程碑时） */
  frequency: 'every_step' | 'on_error' | 'on_milestone';
  
  /** AI 提供商 */
  provider?: AIProvider;
  
  /** 使用的模型（可以用更小的模型降低成本） */
  model?: string;
  
  /** 自定义 Base URL（用于第三方网关） */
  baseURL?: string;
  
  /** 最大反思次数（防止无限循环） */
  maxReflections?: number;
  
  /** 是否展示反思过程给用户 */
  showThoughts?: boolean;
  
  /** 可用的工具列表（动态注入，用于生成工具说明） */
  availableTools?: StructuredToolInterface[];
  
  /**
   * 置信度阈值配置（置信度驱动决策）
   * 控制在不同置信度下的反思行为：
   * - lowConfidenceThreshold: 低于此值建议 ask_user（默认 0.3）
   * - 高于此值：可以继续执行或调整策略
   */
  confidenceThresholds?: {
    /** 低置信度阈值（< 此值建议询问用户），范围 0.0-0.5，默认 0.3 */
    low?: number;
  };
}

// ============ 反思器 System Prompt ============

/**
 * 动态构建反思器系统提示词
 * 
 * 设计原则：
 * 1. Reflector 只需要知道工具名称，不需要完整描述（工具有自描述）
 * 2. 专注于评估执行结果和提供纠正建议
 * 3. 不硬编码具体的工具参数格式
 */
function buildReflectorSystemPrompt(tools?: StructuredToolInterface[], lowConfidenceThreshold: number = 0.3): string {
  // 只提取工具名称列表
  const toolNames = tools?.map(tool => tool.name).join(', ') || '（无可用工具）';
  
  // 识别渲染工具（以 render_ 开头的工具）
  const renderToolNames = tools
    ?.filter(tool => tool.name.startsWith('render_'))
    .map(tool => tool.name)
    .join(', ') || '';

  return `你是任务执行的监督者。核心职责是确保任务成功完成。

## 职责

1. 评估每个步骤的执行结果
2. 失败时寻找替代方案，而非直接放弃
3. 确保结果已渲染展示给用户
4. 任务完成时，思考用户可能需要的后续操作

## 可用工具

${toolNames}

## 渲染工具（用于展示结果给用户）

${renderToolNames || '（无渲染工具）'}

## 输出 JSON 格式

{
  "stepSuccess": boolean,
  "thought": "简洁的分析",
  "nextAction": "continue|retry|adjust_strategy|ask_user|complete|abort",
  "isTaskComplete": boolean,
  "progressPercent": 0-100,
  "correctionHint": "给执行模型的纠正指令（adjust_strategy时必填）",
  "suggestedTool": {"name": "工具名", "reason": "原因"},
  "confidence": 0-1
}

## 关键规则

- **渲染是必须的**: 任务完成前必须调用渲染工具展示结果
- **渲染后即完成**: 如果当前步骤是渲染工具调用且成功，同时之前已有业务操作（如创建/查询/修改/删除）成功，那么任务已完成。设置 nextAction=complete, isTaskComplete=true, progressPercent=100
- **数据传递**: 调用渲染工具时，必须从上一步的工具结果中提取完整数据传入（不要传空数组或空对象）
- **检查空结果**: 如果查询类工具返回空结果（count: 0 或 empty list），且后续操作依赖该结果，应指示执行模型停止尝试后续操作，并告知用户未找到。
- **严禁假定成功**: 如果工具调用返回错误（包括"重复调用"、"参数错误"等），**必须**视为步骤失败 (stepSuccess=false)。绝对不能假设任务已在之前的步骤中完成。
- nextAction=complete: 仅当业务操作成功 **且** 已调用渲染工具
- 如果业务成功但未渲染: nextAction=continue, progressPercent=80
- correctionHint: adjust_strategy 时必须具体可执行，包含数据提取说明

## 置信度驱动决策

当你对下一步如何处理不确定时，根据置信度决定：
- **高置信度（confidence >= ${lowConfidenceThreshold}）**: 可以选择 continue/adjust_strategy/retry
- **低置信度（confidence < ${lowConfidenceThreshold}）**: 应选择 nextAction=ask_user，并在 thought 中说明需要用户澄清什么信息`;
}

// ============ 反思器实现 ============

/**
 * ReAct 反思器
 * 
 * 在每个执行步骤后提供反思和指导
 */
export class Reflector {
  private model: BaseChatModel | null = null;
  private config: ReflectorConfig;
  private reflectionCount: number = 0;
  private maxReflections: number;
  private availableTools: StructuredToolInterface[] = [];
  private lowConfidenceThreshold: number;

  constructor(config: ReflectorConfig) {
    this.config = config;
    this.maxReflections = config.maxReflections ?? 20;
    this.lowConfidenceThreshold = config.confidenceThresholds?.low ?? 0.3;
    // 从配置中获取工具列表（如果有的话）
    if (config.availableTools) {
      this.availableTools = config.availableTools;
    }
  }

  /**
   * 设置可用工具列表
   * 用于动态更新反思器感知的工具
   */
  setTools(tools: StructuredToolInterface[]): void {
    this.availableTools = tools;
    console.log(`🔍 [Reflector] Tools updated: ${tools.length} tools available`);
  }

  /**
   * 获取当前可用工具列表
   */
  getTools(): StructuredToolInterface[] {
    return this.availableTools;
  }

  /**
   * 初始化反思模型
   */
  initialize(apiKey: string): void {
    if (!this.config.enabled) {
      console.log('🔍 [Reflector] Disabled, skipping initialization');
      return;
    }

    // 获取配置的提供商和模型
    const provider = this.config.provider || DEFAULT_PROVIDER;
    const modelName = this.config.model || DEFAULT_MODEL;
    const baseURL = this.config.baseURL;
    
    // 使用模型工厂创建模型（支持多种 AI 提供商）
    this.model = createChatModel({
      provider,
      model: modelName,
      apiKey,
      temperature: 0,
      maxRetries: 2,
      baseURL,
    });

    console.log(`🔍 [Reflector] Initialized with ${provider}/${modelName}${baseURL ? ` @ ${baseURL}` : ''}`);
    console.log(`🔍 [Reflector] Frequency: ${this.config.frequency}`);
  }

  /**
   * 检查是否应该进行反思
   */
  shouldReflect(observation: StepObservation, remainingSteps: number): boolean {
    console.log(`🔍 [Reflector] shouldReflect check:`, {
      enabled: this.config.enabled,
      hasModel: !!this.model,
      frequency: this.config.frequency,
      toolName: observation.toolName,
      success: observation.success,
      reflectionCount: this.reflectionCount,
      maxReflections: this.maxReflections,
    });

    if (!this.config.enabled || !this.model) {
      console.log(`🔍 [Reflector] Skipping reflection: enabled=${this.config.enabled}, hasModel=${!!this.model}`);
      return false;
    }

    // 防止无限循环
    if (this.reflectionCount >= this.maxReflections) {
      console.warn('⚠️ [Reflector] Max reflections reached, skipping');
      return false;
    }

    // 特殊情况：渲染工具成功执行后，无论频率设置如何，都应该反思
    // 因为渲染通常意味着任务可能已完成，需要反思模型来判断
    if (observation.success && observation.toolName?.startsWith('render_')) {
      console.log('🔍 [Reflector] Render tool completed, triggering reflection to check task completion');
      return true;
    }

    let shouldReflect = false;
    switch (this.config.frequency) {
      case 'every_step':
        shouldReflect = true;
        break;
      
      case 'on_error':
        shouldReflect = !observation.success;
        break;
      
      case 'on_milestone':
        // 里程碑：第一步、最后一步、或每3步
        shouldReflect = remainingSteps === 0 || 
               observation.stepId.endsWith('_0') || 
               this.reflectionCount % 3 === 0;
        break;
      
      default:
        shouldReflect = false;
    }
    
    console.log(`🔍 [Reflector] Decision: shouldReflect=${shouldReflect} (frequency=${this.config.frequency})`);
    return shouldReflect;
  }

  /**
   * 执行反思
   */
  async reflect(context: ReflectionContext): Promise<ReflectionResult> {
    if (!this.model) {
      // 返回默认的"继续"结果
      return this.createDefaultResult(context);
    }

    this.reflectionCount++;
    console.log(`🔍 [Reflector] Reflection #${this.reflectionCount}`);

    try {
      const prompt = this.buildReflectionPrompt(context);
      
      // 动态生成系统提示词，包含当前可用的工具列表和置信度阈值
      const systemPrompt = buildReflectorSystemPrompt(this.availableTools, this.lowConfidenceThreshold);
      
      const response = await this.model.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(prompt),
      ]);

      const content = typeof response.content === 'string' 
        ? response.content 
        : JSON.stringify(response.content);

      const result = this.parseReflectionResponse(content, context);
      
      console.log(`🔍 [Reflector] Thought: ${result.thought}`);
      console.log(`🔍 [Reflector] Next action: ${result.nextAction}`);
      console.log(`🔍 [Reflector] Progress: ${result.progressPercent}%`);

      return result;

    } catch (error) {
      console.error('❌ [Reflector] Error during reflection:', error);
      return this.createDefaultResult(context);
    }
  }

  /**
   * 构建反思提示
   */
  private buildReflectionPrompt(context: ReflectionContext): string {
    const { userRequest, plan, completedSteps, currentObservation, remainingSteps } = context;

    // 构建已完成步骤摘要
    const completedSummary = completedSteps.length > 0
      ? completedSteps.map((step, idx) => 
          `${idx + 1}. ${step.stepDescription}: ${step.success ? '✅ 成功' : '❌ 失败'}${step.error ? ` (${step.error})` : ''}`
        ).join('\n')
      : '无';

    // 构建剩余步骤摘要
    const remainingSummary = remainingSteps.length > 0
      ? remainingSteps.map((step, idx) => 
          `${idx + 1}. ${step.description}`
        ).join('\n')
      : '无';

    return `## 用户原始请求
${userRequest}

## 执行计划
${plan.description}

## 已完成的步骤
${completedSummary}

## 当前步骤执行结果
- 步骤: ${currentObservation.stepDescription}
- 工具: ${currentObservation.toolName || 'N/A'}
- 参数: ${currentObservation.toolArgs ? JSON.stringify(currentObservation.toolArgs) : 'N/A'}
- 状态: ${currentObservation.success ? '成功' : '失败'}
- 结果: ${currentObservation.result.substring(0, 500)}${currentObservation.result.length > 500 ? '...' : ''}
${currentObservation.error ? `- 错误: ${currentObservation.error}` : ''}

## 剩余步骤
${remainingSummary}

请分析当前执行情况，给出你的反思和下一步建议。`;
  }

  /**
   * 解析反思响应
   */
  private parseReflectionResponse(content: string, context: ReflectionContext): ReflectionResult {
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

      // 提取 JSON
      const startIdx = jsonStr.indexOf('{');
      const endIdx = jsonStr.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1) {
        jsonStr = jsonStr.substring(startIdx, endIdx + 1);
      }

      const parsed = JSON.parse(jsonStr);

      // 解析建议的替代工具
      let suggestedTool: ReflectionResult['suggestedTool'];
      if (parsed.suggestedTool && typeof parsed.suggestedTool === 'object') {
        suggestedTool = {
          name: parsed.suggestedTool.name || '',
          reason: parsed.suggestedTool.reason || '',
          args: parsed.suggestedTool.args,
        };
      }

      return {
        stepSuccess: parsed.stepSuccess ?? context.currentObservation.success,
        thought: parsed.thought || '继续执行...',
        nextAction: this.validateAction(parsed.nextAction),
        isTaskComplete: parsed.isTaskComplete ?? false,
        progressPercent: Math.min(100, Math.max(0, parsed.progressPercent ?? 50)),
        strategyAdjustment: parsed.strategyAdjustment,
        errorCorrection: parsed.errorCorrection,
        correctionHint: parsed.correctionHint,
        suggestedTool,
        confidence: Math.min(1, Math.max(0, parsed.confidence ?? 0.8)),
      };

    } catch (error) {
      console.warn('⚠️ [Reflector] Failed to parse response, using defaults');
      return this.createDefaultResult(context);
    }
  }

  /**
   * 验证行动类型
   */
  private validateAction(action: string): ReflectionAction {
    const validActions: ReflectionAction[] = [
      'continue', 'retry', 'adjust_strategy', 'ask_user', 'complete', 'abort'
    ];
    
    if (validActions.includes(action as ReflectionAction)) {
      return action as ReflectionAction;
    }
    
    return 'continue';
  }

  /**
   * 创建默认结果
   */
  private createDefaultResult(context: ReflectionContext): ReflectionResult {
    const { currentObservation, remainingSteps } = context;
    const totalSteps = context.completedSteps.length + remainingSteps.length + 1;
    const completedCount = context.completedSteps.length + 1;
    const progress = Math.round((completedCount / totalSteps) * 100);

    return {
      stepSuccess: currentObservation.success,
      thought: currentObservation.success 
        ? '步骤执行成功，继续下一步。' 
        : '步骤执行失败，尝试继续。',
      nextAction: remainingSteps.length === 0 ? 'complete' : 'continue',
      isTaskComplete: remainingSteps.length === 0,
      progressPercent: progress,
      confidence: 0.7,
    };
  }

  /**
   * 重置反思计数
   */
  reset(): void {
    this.reflectionCount = 0;
  }

  /**
   * 获取反思次数
   */
  getReflectionCount(): number {
    return this.reflectionCount;
  }

  /**
   * 是否启用
   */
  isEnabled(): boolean {
    return this.config.enabled && this.model !== null;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<ReflectorConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('🔍 [Reflector] Config updated:', this.config);
  }

  /**
   * 格式化反思结果用于显示
   */
  formatForDisplay(result: ReflectionResult): string {
    const actionEmoji: Record<ReflectionAction, string> = {
      'continue': '➡️',
      'retry': '🔄',
      'adjust_strategy': '🔧',
      'ask_user': '❓',
      'complete': '✅',
      'abort': '🛑',
    };

    const lines = [
      `💭 **反思**: ${result.thought}`,
      `📊 **进度**: ${result.progressPercent}%`,
      `${actionEmoji[result.nextAction]} **下一步**: ${this.getActionLabel(result.nextAction)}`,
    ];

    if (result.strategyAdjustment) {
      lines.push(`🔧 **策略调整**: ${result.strategyAdjustment}`);
    }

    if (result.errorCorrection) {
      lines.push(`⚠️ **修正建议**: ${result.errorCorrection}`);
    }

    if (result.correctionHint) {
      lines.push(`💡 **纠正指令**: ${result.correctionHint}`);
    }

    if (result.suggestedTool) {
      lines.push(`🔄 **建议工具**: ${result.suggestedTool.name} (${result.suggestedTool.reason})`);
    }

    return lines.join('\n');
  }

  /**
   * 获取行动标签
   */
  private getActionLabel(action: ReflectionAction): string {
    const labels: Record<ReflectionAction, string> = {
      'continue': '继续执行',
      'retry': '重试当前步骤',
      'adjust_strategy': '调整执行策略',
      'ask_user': '需要用户确认',
      'complete': '任务完成',
      'abort': '中止任务',
    };
    return labels[action];
  }
}

// ============ 工厂函数 ============

/**
 * 创建反思器实例
 */
export function createReflector(config: ReflectorConfig): Reflector {
  return new Reflector(config);
}

/**
 * 默认配置
 */
export const DEFAULT_REFLECTOR_CONFIG: ReflectorConfig = {
  enabled: true,  // 默认启用反思模式
  frequency: 'on_error',  // 默认只在出错时反思，平衡性能和准确性
  model: DEFAULT_MODEL,
  maxReflections: 20,
  showThoughts: true,
  confidenceThresholds: {
    low: 0.3,  // 低置信度阈值：< 0.3 建议询问用户
  },
};
