/**
 * PromptReflector - 用户提示词反思优化器
 * 
 * 在 Agent 对话之前，对用户的输入进行分析和优化，提高对话质量：
 * 1. 提取关键意图
 * 2. 补充必要上下文
 * 3. 规范化表达方式
 * 4. 识别模糊需求并细化
 * 
 * 使用场景：
 * - 用户输入过于简略时，补充必要信息
 * - 用户输入包含歧义时，明确意图
 * - 用户输入不完整时，提示补充
 * 
 * 注意：此模块是可选的，可通过配置开启或关闭
 */

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { AgentRuntimeContext } from "../../types/agent";
import { withTimeout, withRetry, LLM_RETRY_CONFIG } from "./retry";

// ============ 类型定义 ============

/**
 * 反思结果
 */
export interface ReflectionResult {
  /** 原始输入 */
  originalPrompt: string;
  /** 优化后的提示词 */
  refinedPrompt: string;
  /** 是否进行了优化 */
  wasRefined: boolean;
  /** 识别的意图 */
  intent?: PromptIntent;
  /** 提取的实体 */
  entities?: ExtractedEntities;
  /** 优化说明（用于调试） */
  refinementNotes?: string;
  /** 置信度 0-1 */
  confidence: number;
}

/**
 * 提示词意图类型
 */
export type PromptIntent = 
  | 'create_transaction'    // 记账
  | 'query_transaction'     // 查询交易
  | 'statistics'            // 统计分析
  | 'delete_transaction'    // 删除交易
  | 'update_transaction'    // 修改交易
  | 'category_management'   // 分类管理
  | 'general_question'      // 一般问题
  | 'unclear';              // 意图不明确

/**
 * 提取的实体
 */
export interface ExtractedEntities {
  /** 金额 */
  amount?: number;
  /** 交易类型 */
  transactionType?: 'EXPENSE' | 'INCOME';
  /** 分类名称 */
  categoryName?: string;
  /** 时间范围 */
  timeRange?: {
    start?: string;
    end?: string;
    description?: string;  // 如 "本月"、"今天" 等
  };
  /** 支付方式 */
  paymentMethod?: string;
  /** 备注/描述 */
  description?: string;
}

/**
 * 反思器配置
 */
export interface PromptReflectorConfig {
  /** 是否启用反思 */
  enabled: boolean;
  /** 是否自动补全上下文 */
  autoCompleteContext: boolean;
  /** 最小输入长度（低于此长度才进行优化） */
  minLengthForRefinement: number;
  /** 是否显示优化过程（调试用） */
  showRefinementProcess: boolean;
  /** 超时时间（毫秒） */
  timeout: number;
  /** 使用简单规则优化（不调用 LLM） */
  useSimpleRules: boolean;
}

/**
 * 默认配置
 */
export const DEFAULT_REFLECTOR_CONFIG: PromptReflectorConfig = {
  enabled: true,
  autoCompleteContext: true,
  minLengthForRefinement: 50,  // 超过 50 字符的输入不进行优化
  showRefinementProcess: false,
  timeout: 5000,  // 5 秒超时
  useSimpleRules: true,  // 默认使用简单规则，不调用 LLM
};

// ============ 简单规则匹配 ============

/**
 * 意图识别规则
 */
const INTENT_PATTERNS: { pattern: RegExp; intent: PromptIntent }[] = [
  // 记账意图
  { pattern: /记[一笔]*账?|添加.*(支出|收入)|花了|买了|收到|工资|发了/i, intent: 'create_transaction' },
  // 查询意图
  { pattern: /查[询看]|哪些|列[出表]|显示|最近.*交易/i, intent: 'query_transaction' },
  // 统计意图
  { pattern: /统计|分析|报[表告]|总[计共]|多少钱|花了多少|收入.*(多少|情况)|支出.*(多少|情况)/i, intent: 'statistics' },
  // 删除意图
  { pattern: /删除|移除|取消/i, intent: 'delete_transaction' },
  // 修改意图
  { pattern: /修改|更新|编辑|改[成为]/i, intent: 'update_transaction' },
  // 分类管理
  { pattern: /分类|类别/i, intent: 'category_management' },
];

/**
 * 金额提取规则
 */
const AMOUNT_PATTERNS = [
  /(\d+(?:\.\d{1,2})?)\s*[元块]?/,
  /¥\s*(\d+(?:\.\d{1,2})?)/,
  /￥\s*(\d+(?:\.\d{1,2})?)/,
];

/**
 * 时间范围关键词
 */
const TIME_KEYWORDS: { keywords: string[]; description: string }[] = [
  { keywords: ['今天', '今日'], description: '今天' },
  { keywords: ['昨天', '昨日'], description: '昨天' },
  { keywords: ['本周', '这周', '这一周'], description: '本周' },
  { keywords: ['上周', '上一周'], description: '上周' },
  { keywords: ['本月', '这个月', '这月'], description: '本月' },
  { keywords: ['上月', '上个月'], description: '上月' },
  { keywords: ['今年', '本年'], description: '今年' },
  { keywords: ['去年', '上一年'], description: '去年' },
];

/**
 * 交易类型关键词
 */
const TRANSACTION_TYPE_KEYWORDS = {
  EXPENSE: ['支出', '花了', '买了', '消费', '付了', '付款', '花费'],
  INCOME: ['收入', '收到', '工资', '奖金', '转账收入', '报销'],
};

// ============ PromptReflector 类 ============

/**
 * 提示词反思优化器
 */
export class PromptReflector {
  private config: PromptReflectorConfig;
  private model: ChatGoogleGenerativeAI | null = null;
  private runtimeContext?: AgentRuntimeContext;

  constructor(
    apiKey?: string,
    config?: Partial<PromptReflectorConfig>,
    runtimeContext?: AgentRuntimeContext
  ) {
    this.config = { ...DEFAULT_REFLECTOR_CONFIG, ...config };
    this.runtimeContext = runtimeContext;

    // 如果不使用简单规则且提供了 API Key，初始化 LLM
    if (!this.config.useSimpleRules && apiKey) {
      this.model = new ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash-lite",
        apiKey: apiKey,
        temperature: 0.1,  // 低温度保证稳定性
        maxRetries: 1,
      });
    }
  }

  /**
   * 更新运行时上下文
   */
  updateContext(context: AgentRuntimeContext): void {
    this.runtimeContext = context;
  }

  /**
   * 反思并优化用户提示词
   */
  async reflect(userPrompt: string): Promise<ReflectionResult> {
    const originalPrompt = userPrompt.trim();

    // 如果未启用或输入过长，直接返回原始输入
    if (!this.config.enabled || originalPrompt.length > this.config.minLengthForRefinement) {
      return {
        originalPrompt,
        refinedPrompt: originalPrompt,
        wasRefined: false,
        confidence: 1.0,
      };
    }

    // 使用简单规则或 LLM 进行优化
    if (this.config.useSimpleRules) {
      return this.reflectWithRules(originalPrompt);
    } else {
      return this.reflectWithLLM(originalPrompt);
    }
  }

  /**
   * 使用简单规则进行反思优化（公开方法，供便捷函数调用）
   */
  reflectWithRules(prompt: string): ReflectionResult {
    // 1. 识别意图
    const intent = this.detectIntent(prompt);

    // 2. 提取实体
    const entities = this.extractEntities(prompt);

    // 3. 构建优化后的提示词
    let refinedPrompt = prompt;
    let wasRefined = false;
    const refinementNotes: string[] = [];

    // 根据意图和上下文进行优化
    if (intent !== 'unclear' && intent !== 'general_question') {
      // 如果是记账意图但没有金额，提示补充
      if (intent === 'create_transaction' && !entities.amount) {
        refinementNotes.push('提示用户补充金额');
      }

      // 如果是统计意图但没有时间范围，默认添加"本月"
      if (intent === 'statistics' && !entities.timeRange && this.config.autoCompleteContext) {
        const hasTimeKeyword = TIME_KEYWORDS.some(t => 
          t.keywords.some(k => prompt.includes(k))
        );
        if (!hasTimeKeyword) {
          refinedPrompt = `${prompt}（本月）`;
          wasRefined = true;
          refinementNotes.push('自动添加时间范围：本月');
        }
      }

      // 如果有上下文，补充账本信息
      if (this.runtimeContext?.currentLedger && this.config.autoCompleteContext) {
        // 已通过 System Prompt 注入，无需额外处理
      }
    }

    return {
      originalPrompt: prompt,
      refinedPrompt,
      wasRefined,
      intent,
      entities,
      refinementNotes: refinementNotes.length > 0 ? refinementNotes.join('; ') : undefined,
      confidence: this.calculateConfidence(intent, entities),
    };
  }

  /**
   * 使用 LLM 进行反思优化
   */
  private async reflectWithLLM(prompt: string): Promise<ReflectionResult> {
    if (!this.model) {
      // 没有 LLM 模型，回退到规则优化
      return this.reflectWithRules(prompt);
    }

    try {
      const systemPrompt = this.buildReflectionSystemPrompt();
      const response = await withTimeout(
        withRetry(
          () => this.model!.invoke([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ]),
          { ...LLM_RETRY_CONFIG, maxRetries: 1 }
        ),
        this.config.timeout,
        '提示词优化超时'
      );

      // 解析 LLM 响应
      const aiMessage = response as { content: string | unknown };
      const content = typeof aiMessage.content === 'string' 
        ? aiMessage.content 
        : JSON.stringify(aiMessage.content);

      // 尝试解析 JSON 响应
      try {
        const parsed = JSON.parse(content);
        return {
          originalPrompt: prompt,
          refinedPrompt: parsed.refinedPrompt || prompt,
          wasRefined: parsed.refinedPrompt !== prompt,
          intent: parsed.intent,
          entities: parsed.entities,
          refinementNotes: parsed.notes,
          confidence: parsed.confidence || 0.8,
        };
      } catch {
        // JSON 解析失败，使用原始响应
        return {
          originalPrompt: prompt,
          refinedPrompt: content.trim() || prompt,
          wasRefined: content.trim() !== prompt,
          confidence: 0.6,
        };
      }
    } catch (error) {
      console.warn('⚠️ [PromptReflector] LLM reflection failed, falling back to rules:', error);
      return this.reflectWithRules(prompt);
    }
  }

  /**
   * 构建反思系统提示词
   */
  private buildReflectionSystemPrompt(): string {
    let prompt = `你是一个提示词优化助手。分析用户输入，提取意图和关键信息，必要时优化表达。

输出 JSON 格式：
{
  "refinedPrompt": "优化后的提示词",
  "intent": "意图类型",
  "entities": { "amount": 数字, "transactionType": "EXPENSE/INCOME", ... },
  "notes": "优化说明",
  "confidence": 0.9
}

意图类型：create_transaction, query_transaction, statistics, delete_transaction, update_transaction, category_management, general_question, unclear

规则：
1. 保留用户原意，不要过度修改
2. 补充明显缺失的上下文（如时间范围）
3. 规范化金额表达（如 "十块" → "10元"）
4. 如果输入已经清晰完整，refinedPrompt 与原输入相同`;

    if (this.runtimeContext) {
      prompt += `\n\n当前上下文：
- 账本：${this.runtimeContext.currentLedger?.name || '未知'}
- 时间：${this.runtimeContext.currentDateTime || new Date().toLocaleString('zh-CN')}`;
    }

    return prompt;
  }

  /**
   * 检测用户意图
   */
  private detectIntent(prompt: string): PromptIntent {
    for (const { pattern, intent } of INTENT_PATTERNS) {
      if (pattern.test(prompt)) {
        return intent;
      }
    }
    return 'unclear';
  }

  /**
   * 提取实体信息（公开方法，供便捷函数调用）
   */
  extractEntities(prompt: string): ExtractedEntities {
    const entities: ExtractedEntities = {};

    // 提取金额
    for (const pattern of AMOUNT_PATTERNS) {
      const match = prompt.match(pattern);
      if (match) {
        entities.amount = parseFloat(match[1]);
        break;
      }
    }

    // 提取交易类型
    for (const [type, keywords] of Object.entries(TRANSACTION_TYPE_KEYWORDS)) {
      if (keywords.some(k => prompt.includes(k))) {
        entities.transactionType = type as 'EXPENSE' | 'INCOME';
        break;
      }
    }

    // 提取时间范围
    for (const { keywords, description } of TIME_KEYWORDS) {
      if (keywords.some(k => prompt.includes(k))) {
        entities.timeRange = { description };
        break;
      }
    }

    // 从上下文中匹配分类
    if (this.runtimeContext?.categories) {
      const categories = this.runtimeContext.categories;
      for (const category of categories) {
        if (prompt.includes(category.name)) {
          entities.categoryName = category.name;
          break;
        }
      }
    }

    // 从上下文中匹配支付方式
    if (this.runtimeContext?.paymentMethods) {
      const methods = this.runtimeContext.paymentMethods;
      for (const method of methods) {
        if (prompt.includes(method.name)) {
          entities.paymentMethod = method.name;
          break;
        }
      }
    }

    return entities;
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(intent: PromptIntent, entities: ExtractedEntities): number {
    let confidence = 0.5;

    // 意图明确增加置信度
    if (intent !== 'unclear') {
      confidence += 0.2;
    }

    // 实体信息越多，置信度越高
    const entityCount = Object.keys(entities).filter(k => 
      entities[k as keyof ExtractedEntities] !== undefined
    ).length;
    confidence += Math.min(entityCount * 0.1, 0.3);

    return Math.min(confidence, 1.0);
  }

  /**
   * 判断是否需要用户补充信息
   */
  needsUserClarification(result: ReflectionResult): { needed: boolean; questions: string[] } {
    const questions: string[] = [];

    // 记账意图但没有金额
    if (result.intent === 'create_transaction' && !result.entities?.amount) {
      questions.push('请问金额是多少？');
    }

    // 意图不明确
    if (result.intent === 'unclear' && result.confidence < 0.5) {
      questions.push('请问您想做什么？是记账、查账还是其他操作？');
    }

    return {
      needed: questions.length > 0,
      questions,
    };
  }
}

// ============ 工厂函数 ============

/**
 * 创建 PromptReflector 实例
 */
export function createPromptReflector(
  apiKey?: string,
  config?: Partial<PromptReflectorConfig>,
  runtimeContext?: AgentRuntimeContext
): PromptReflector {
  return new PromptReflector(apiKey, config, runtimeContext);
}

// ============ 便捷函数 ============

/**
 * 快速反思优化（使用简单规则）
 */
export function quickReflect(prompt: string, context?: AgentRuntimeContext): ReflectionResult {
  const reflector = new PromptReflector(undefined, { useSimpleRules: true }, context);
  // 由于使用简单规则，可以同步返回
  return reflector.reflectWithRules(prompt);
}

/**
 * 检测提示词意图
 */
export function detectPromptIntent(prompt: string): PromptIntent {
  for (const { pattern, intent } of INTENT_PATTERNS) {
    if (pattern.test(prompt)) {
      return intent;
    }
  }
  return 'unclear';
}

/**
 * 提取提示词中的实体
 */
export function extractPromptEntities(
  prompt: string, 
  context?: AgentRuntimeContext
): ExtractedEntities {
  const reflector = new PromptReflector(undefined, { useSimpleRules: true }, context);
  return reflector.extractEntities(prompt);
}
