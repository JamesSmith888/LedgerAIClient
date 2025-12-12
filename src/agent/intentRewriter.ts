/**
 * Intent Rewriter - 意图改写器
 * 
 * 核心职责：
 * 1. 解析用户输入（包括模糊、口语化的表达）
 * 2. 提取结构化信息（金额、日期、分类等）
 * 3. 生成清晰、规范的任务描述
 * 4. 判断操作风险等级
 * 
 * 设计理念：
 * - 作为执行前的"预处理器"，让后续的执行模型更容易理解
 * - 不指定具体工具调用，只描述"做什么"
 * - 轻量、快速，使用小模型即可
 */

import { AIMessage, HumanMessage, SystemMessage, BaseMessage } from "@langchain/core/messages";
import type { MessageContentText, MessageContentImageUrl } from "@langchain/core/messages";
import { DEFAULT_MODEL, DEFAULT_PROVIDER, AIProvider } from '../services/apiKeyStorage';
import { createChatModel } from './modelFactory';

// ============ 类型定义 ============

/**
 * 多模态内容类型
 */
type MultimodalContent = string | (MessageContentText | MessageContentImageUrl)[];

/**
 * 单条交易记录信息
 */
export interface TransactionItem {
  /** 金额 */
  amount: number;
  /** 交易类型 */
  type: 'EXPENSE' | 'INCOME';
  /** 分类名称 */
  category?: string;
  /** 描述/备注 */
  description?: string;
  /** 日期（YYYY-MM-DD 格式） */
  date?: string;
  /** 时间（HH:mm 格式） */
  time?: string;
  /** 支付方式 */
  paymentMethod?: string;
}

/**
 * 从用户输入中提取的结构化信息
 */
export interface ExtractedInfo {
  /** 金额（单条记录时使用） */
  amount?: number;
  /** 交易类型（单条记录时使用） */
  type?: 'EXPENSE' | 'INCOME';
  /** 分类名称 */
  category?: string;
  /** 描述/备注 */
  description?: string;
  /** 日期（YYYY-MM-DD 格式） */
  date?: string;
  /** 时间（HH:mm 格式） */
  time?: string;
  /** 支付方式 */
  paymentMethod?: string;
  /** 其他备注 */
  notes?: string;
  /** 查询的时间范围 */
  dateRange?: {
    start?: string;
    end?: string;
  };
  /** 涉及的数量（如"最近10条"） */
  limit?: number;
  /** 多条交易记录（批量操作时使用） */
  items?: TransactionItem[];
}

/**
 * 操作风险等级
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * 意图类型
 */
export type IntentType = 
  | 'create'       // 创建记录
  | 'query'        // 查询数据
  | 'update'       // 修改记录
  | 'delete'       // 删除记录
  | 'statistics'   // 统计分析
  | 'batch'        // 批量操作
  | 'chat'         // 普通对话
  | 'clarify'      // 需要澄清（信息不足）
  | 'unknown';     // 无法识别

/**
 * 意图改写结果
 */
export interface RewrittenIntent {
  /** 改写后的清晰任务描述 */
  rewrittenPrompt: string;
  
  /** 原始用户输入 */
  originalInput: string;
  
  /** 识别的意图类型 */
  intentType: IntentType;
  
  /** 提取的结构化信息 */
  extractedInfo: ExtractedInfo;
  
  /** 操作风险等级 */
  riskLevel: RiskLevel;
  
  /** 是否需要用户确认 */
  requiresConfirmation: boolean;
  
  /** 确认原因（如果需要确认） */
  confirmationReason?: string;
  
  /** 置信度 (0-1) */
  confidence: number;
  
  /** 是否包含图片 */
  hasImage: boolean;
  
  /** 需要澄清时，向用户询问的问题（clarify 意图时使用） */
  clarifyQuestion?: string;
  
  /** 缺失的关键信息列表 */
  missingInfo?: string[];
}

/**
 * Intent Rewriter 配置
 */
export interface IntentRewriterConfig {
  /** AI 提供商 */
  provider?: AIProvider;
  /** 使用的模型 */
  model?: string;
  /** 是否启用 */
  enabled?: boolean;
  /** 高风险操作需要确认 */
  confirmHighRisk?: boolean;
  /** 中风险操作需要确认 */
  confirmMediumRisk?: boolean;
  /** 批量操作确认阈值 */
  batchThreshold?: number;
}

// ============ System Prompt ============

const REWRITER_SYSTEM_PROMPT = `你是一个意图理解助手。分析用户输入（文本或图片），输出 JSON 格式的结构化结果。

## 重要：对话上下文理解

如果提供了对话历史，你需要结合上下文理解用户的当前输入。例如：
- 如果上一轮你问了"您想查询什么时间范围？"，用户回答"一周"，你应该理解用户想查询最近一周的数据
- 如果上一轮你问了"请提供金额"，用户回答"50"，你应该理解50是金额
- 始终结合对话历史来理解用户当前输入的完整意图

## 核心原则：置信度驱动决策

根据信息完整程度决定处理策略：

### 高置信度（confidence >= 0.7）：直接执行
当用户提供的信息足够完整时，生成可执行的任务描述。

### 中置信度（0.4 <= confidence < 0.7）：合理推测后执行
当部分信息缺失但可合理推断时：
1. 结合常识选择最可能的默认值
2. 生成任务描述，但在 rewrittenPrompt 中说明推测了什么

### 低置信度（confidence < 0.4）：主动询问
当关键信息严重缺失时，使用 clarify 意图：
1. intentType 设为 "clarify"
2. clarifyQuestion 填写友好的询问语句
3. missingInfo 列出缺失的关键信息

## 信息完整性判断

### 创建交易（create）必需信息：
- 金额（必须）- 没有金额时 confidence < 0.3
- 类型（可推断）- 默认支出
- 分类（可推断）- 根据描述推断

### 查询操作（query）必需信息：
- 查询目标（必须）- 查什么？最近的？某分类的？
- 时间范围（可选）- 不指定则默认合理范围

### 删除/修改（delete/update）必需信息：
- 明确的目标（必须）- 删除/修改哪条？

## 输出格式

### 正常执行（confidence >= 0.4）
{
  "rewrittenPrompt": "清晰的任务描述",
  "intentType": "create|query|update|delete|batch|statistics|chat",
  "extractedInfo": { ... },
  "riskLevel": "low|medium|high|critical",
  "requiresConfirmation": false,
  "confidence": 0.4-1.0
}

### 需要澄清（confidence < 0.4）
{
  "rewrittenPrompt": "需要更多信息才能执行",
  "intentType": "clarify",
  "extractedInfo": { ... },  // 已识别的部分信息
  "riskLevel": "low",
  "requiresConfirmation": false,
  "confidence": 0.1-0.39,
  "clarifyQuestion": "友好的询问语句，引导用户补充信息",
  "missingInfo": ["缺失信息1", "缺失信息2"]
}

### 批量创建（intentType = "batch"）
{
  "rewrittenPrompt": "批量记录N条交易：简要描述",
  "intentType": "batch",
  "extractedInfo": {
    "items": [
      {"amount": 数字, "type": "EXPENSE|INCOME", "category": "分类名", "description": "描述", "date": "YYYY-MM-DD"},
      ...
    ]
  },
  "riskLevel": "medium",
  "confidence": 0.0-1.0
}

## 意图类型

- create: 单条数据创建
- batch: 多条数据操作（2条及以上）
- query: 查询/查看数据
- update: 修改数据
- delete: 删除数据
- statistics: 统计分析
- chat: 普通对话/闲聊/问答
- clarify: 信息不足，需要用户补充
- unknown: 完全无法判断

## 风险等级

- low: 只读操作、普通对话
- medium: 数据变更（创建、修改）
- high: 删除操作、批量修改
- critical: 批量删除、清空

## clarify 意图示例

用户输入: "帮我记一笔"
输出:
{
  "rewrittenPrompt": "需要更多信息才能记账",
  "intentType": "clarify",
  "extractedInfo": {},
  "riskLevel": "low",
  "confidence": 0.2,
  "clarifyQuestion": "好的，请告诉我这笔消费的金额是多少？花在什么上面了？",
  "missingInfo": ["金额", "消费类型或描述"]
}

用户输入: "查一下"
输出:
{
  "rewrittenPrompt": "需要明确查询目标",
  "intentType": "clarify",
  "extractedInfo": {},
  "riskLevel": "low",
  "confidence": 0.15,
  "clarifyQuestion": "您想查询什么呢？比如最近的消费记录、某个分类的支出、或者本月统计？",
  "missingInfo": ["查询目标"]
}

## 日期处理（重要！）

**必须**将所有相对日期转换为具体的 YYYY-MM-DD 格式，输出到 dateRange 字段：

时间转换规则（基于当前时间）：
- "今天" → start 和 end 都是今天的日期
- "昨天" → start 和 end 都是昨天的日期
- "本周" → start = 本周一, end = 今天
- "上周" → start = 上周一, end = 上周日
- "本月" → start = 本月1号, end = 今天
- "上月" → start = 上月1号, end = 上月最后一天
- "最近N天" → start = 今天-N+1, end = 今天
- "11月" → start = 2025-11-01, end = 2025-11-30（使用当前年份）

输出示例：
{
  "extractedInfo": {
    "dateRange": {
      "start": "2025-11-24",
      "end": "2025-11-30"
    },
    "type": "EXPENSE"
  }
}

**禁止**使用 timeRange 字段存储"上周"、"本月"这样的字符串！必须计算出具体日期！

## 图片处理

当用户上传图片时：
1. 仔细扫描图片中的所有交易/消费记录
2. 如果包含多条记录，使用 batch 意图类型
3. 每条记录提取：金额、类型、描述、日期
4. 图片模糊或无法识别时，降低 confidence 并说明

## 重要规则

1. **没有金额的记账请求，必须使用 clarify 意图**
2. type 值必须大写：EXPENSE 或 INCOME
3. 金额必须是数字
4. 只输出 JSON
5. clarifyQuestion 要友好自然，像真人对话

## 当前时间

{{CURRENT_DATETIME}}`;

// ============ Intent Rewriter 实现 ============

import { BaseChatModel } from "@langchain/core/language_models/chat_models";

/**
 * Intent Rewriter 意图改写器
 */
export class IntentRewriter {
  private model: BaseChatModel | null = null;
  private config: Required<IntentRewriterConfig>;

  constructor(config?: IntentRewriterConfig) {
    this.config = {
      provider: config?.provider ?? DEFAULT_PROVIDER,
      model: config?.model ?? DEFAULT_MODEL,
      enabled: config?.enabled ?? true,
      confirmHighRisk: config?.confirmHighRisk ?? true,
      confirmMediumRisk: config?.confirmMediumRisk ?? false,
      batchThreshold: config?.batchThreshold ?? 5,
    };
  }

  /**
   * 初始化模型
   */
  initialize(apiKey: string): void {
    if (!this.config.enabled) {
      console.log('📝 [IntentRewriter] Disabled, skipping initialization');
      return;
    }

    // 使用模型工厂创建模型（支持多种 AI 提供商）
    this.model = createChatModel({
      provider: this.config.provider,
      model: this.config.model,
      apiKey,
      temperature: 0,
      maxRetries: 2,
    });

    console.log(`📝 [IntentRewriter] Initialized with ${this.config.provider}/${this.config.model}`);
  }

  /**
   * 改写用户意图
   * @param userInput 用户输入（文本或多模态内容）
   * @param conversationHistory 可选的对话历史，用于理解上下文（如用户对澄清问题的回答）
   */
  async rewrite(userInput: MultimodalContent, conversationHistory?: BaseMessage[]): Promise<RewrittenIntent> {
    const originalText = this.extractText(userInput);
    const hasImage = this.hasImageContent(userInput);

    console.log('📝 [IntentRewriter] Processing input:', originalText.substring(0, 100));
    console.log('📝 [IntentRewriter] Conversation history length:', conversationHistory?.length || 0);

    // 如果未启用或模型未初始化，返回原始输入
    if (!this.config.enabled || !this.model) {
      console.log('📝 [IntentRewriter] Disabled or not initialized, returning original');
      return this.createPassthroughResult(originalText, hasImage);
    }

    try {
      // 动态获取当前时间，替换系统提示词中的占位符
      const currentDateTime = new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
      });
      const systemPromptWithTime = REWRITER_SYSTEM_PROMPT.replace(
        '{{CURRENT_DATETIME}}',
        currentDateTime
      );

      // 构建消息 - 包含对话历史以理解上下文
      const messages: BaseMessage[] = [
        new SystemMessage(systemPromptWithTime),
      ];

      // 添加对话历史，用于理解上下文
      if (conversationHistory && conversationHistory.length > 0) {
        console.log('📝 [IntentRewriter] Adding conversation context:', conversationHistory.length, 'messages');
        const recentHistory = conversationHistory;
        
        // 添加历史消息到提示中
        for (const msg of recentHistory) {
          if (msg._getType() === 'human') {
            messages.push(new HumanMessage({ content: msg.content as any }));
          } else if (msg._getType() === 'ai') {
            messages.push(new AIMessage({ content: msg.content as any }));
          }
        }
      }
      
      // 添加当前用户输入
      messages.push(new HumanMessage({ content: userInput as any }));

      // 调用 LLM
      const response = await this.model.invoke(messages);
      const content = typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);

      // ============ 详细调试日志 ============
      console.log('📝 [IntentRewriter] ========== DEBUG START ==========');
      console.log('📝 [IntentRewriter] User Input:', originalText);
      console.log('📝 [IntentRewriter] Has Image:', hasImage);
      console.log('📝 [IntentRewriter] Conversation History:', conversationHistory?.length || 0, 'messages');
      console.log('📝 [IntentRewriter] LLM Raw Response:');
      console.log(content);
      console.log('📝 [IntentRewriter] ========== DEBUG END ==========');

      // 解析结果
      const result = this.parseResponse(content, originalText, hasImage);
      
      // 应用确认策略
      this.applyConfirmationPolicy(result);

      console.log('📝 [IntentRewriter] Parsed Result:', {
        intentType: result.intentType,
        riskLevel: result.riskLevel,
        confidence: result.confidence,
        rewrittenPrompt: result.rewrittenPrompt,
        extractedInfo: result.extractedInfo,
      });

      return result;

    } catch (error) {
      console.error('❌ [IntentRewriter] Error:', error);
      return this.createPassthroughResult(originalText, hasImage);
    }
  }

  /**
   * 从内容中提取纯文本
   */
  private extractText(content: MultimodalContent): string {
    if (typeof content === 'string') {
      return content;
    }
    return content
      .filter((part): part is MessageContentText => part.type === 'text')
      .map(part => part.text)
      .join('\n');
  }

  /**
   * 检查是否包含图片
   */
  private hasImageContent(content: MultimodalContent): boolean {
    if (typeof content === 'string') {
      return false;
    }
    return content.some(part => part.type === 'image_url');
  }

  /**
   * 解析 LLM 响应
   */
  private parseResponse(
    content: string,
    originalText: string,
    hasImage: boolean
  ): RewrittenIntent {
    try {
      let jsonStr = content.trim();
      
      // 处理 markdown 代码块
      if (jsonStr.startsWith('```')) {
        const lines = jsonStr.split('\n');
        jsonStr = lines.slice(1, -1).join('\n');
      }

      // 提取 JSON
      const startIdx = jsonStr.indexOf('{');
      const endIdx = jsonStr.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1) {
        jsonStr = jsonStr.substring(startIdx, endIdx + 1);
      }

      const parsed = JSON.parse(jsonStr);

      // 标准化 extractedInfo.type
      if (parsed.extractedInfo?.type) {
        parsed.extractedInfo.type = String(parsed.extractedInfo.type).toUpperCase();
      }

      return {
        rewrittenPrompt: parsed.rewrittenPrompt || originalText,
        originalInput: originalText,
        intentType: this.validateIntentType(parsed.intentType),
        extractedInfo: parsed.extractedInfo || {},
        riskLevel: this.validateRiskLevel(parsed.riskLevel),
        requiresConfirmation: parsed.requiresConfirmation ?? false,
        confirmationReason: parsed.confirmationReason,
        confidence: Math.min(1, Math.max(0, parsed.confidence ?? 0.8)),
        hasImage,
        clarifyQuestion: parsed.clarifyQuestion,
        missingInfo: parsed.missingInfo,
      };

    } catch (error) {
      console.warn('⚠️ [IntentRewriter] Failed to parse response, using fallback');
      return this.createPassthroughResult(originalText, hasImage);
    }
  }

  /**
   * 验证意图类型
   */
  private validateIntentType(type: string): IntentType {
    const validTypes: IntentType[] = [
      'create', 'query', 'update', 'delete', 'statistics', 'batch', 'chat', 'clarify', 'unknown'
    ];
    return validTypes.includes(type as IntentType) 
      ? (type as IntentType) 
      : 'unknown';
  }

  /**
   * 验证风险等级
   */
  private validateRiskLevel(level: string): RiskLevel {
    const validLevels: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
    return validLevels.includes(level as RiskLevel) 
      ? (level as RiskLevel) 
      : 'low';
  }

  /**
   * 应用确认策略
   */
  private applyConfirmationPolicy(result: RewrittenIntent): void {
    // 根据风险等级和配置决定是否需要确认
    if (result.riskLevel === 'critical') {
      result.requiresConfirmation = true;
      result.confirmationReason = result.confirmationReason || '此操作不可逆，请确认';
    } else if (result.riskLevel === 'high' && this.config.confirmHighRisk) {
      result.requiresConfirmation = true;
      result.confirmationReason = result.confirmationReason || '此操作可能影响数据';
    } else if (result.riskLevel === 'medium' && this.config.confirmMediumRisk) {
      result.requiresConfirmation = true;
      result.confirmationReason = result.confirmationReason || '请确认操作';
    }

    // 批量操作特殊处理
    if (result.intentType === 'batch') {
      const limit = result.extractedInfo.limit;
      if (!limit || limit >= this.config.batchThreshold) {
        result.requiresConfirmation = true;
        result.confirmationReason = `批量操作将影响${limit || '多条'}记录`;
      }
    }
  }

  /**
   * 创建透传结果（不改写）
   */
  private createPassthroughResult(
    originalText: string,
    hasImage: boolean
  ): RewrittenIntent {
    // 简单的本地规则判断
    const lowerText = originalText.toLowerCase();
    
    let intentType: IntentType = 'unknown';
    let riskLevel: RiskLevel = 'low';

    if (lowerText.includes('删除') || lowerText.includes('移除')) {
      intentType = 'delete';
      riskLevel = 'high';
    } else if (lowerText.includes('修改') || lowerText.includes('更新')) {
      intentType = 'update';
      riskLevel = 'medium';
    } else if (lowerText.includes('查询') || lowerText.includes('查看') || lowerText.includes('列出')) {
      intentType = 'query';
      riskLevel = 'low';
    } else if (lowerText.includes('统计') || lowerText.includes('多少')) {
      intentType = 'statistics';
      riskLevel = 'low';
    } else if (lowerText.includes('记') || lowerText.includes('花了') || lowerText.includes('收入')) {
      intentType = 'create';
      riskLevel = 'medium';
    } else if (hasImage) {
      // 有图片大概率是创建记录（扫描收据）
      intentType = 'create';
      riskLevel = 'medium';
    }

    return {
      rewrittenPrompt: originalText,
      originalInput: originalText,
      intentType,
      extractedInfo: {},
      riskLevel,
      requiresConfirmation: riskLevel === 'high' || riskLevel === 'critical' as RiskLevel,
      confidence: 0.5, // 低置信度表示是本地规则判断
      hasImage,
    };
  }

  /**
   * 格式化结果用于显示
   */
  formatForDisplay(result: RewrittenIntent): string {
    const riskEmoji: Record<RiskLevel, string> = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      critical: '🔴',
    };

    const intentEmoji: Record<IntentType, string> = {
      create: '➕',
      query: '🔍',
      update: '✏️',
      delete: '🗑️',
      statistics: '📊',
      batch: '📦',
      chat: '💬',
      clarify: '🤔',
      unknown: '❓',
    };

    let output = `📝 **意图理解**\n`;
    output += `${intentEmoji[result.intentType]} 类型: ${result.intentType}\n`;
    output += `${riskEmoji[result.riskLevel]} 风险: ${result.riskLevel}\n`;
    output += `🎯 任务: ${result.rewrittenPrompt}\n`;

    if (Object.keys(result.extractedInfo).length > 0) {
      output += `\n📋 **提取信息**\n`;
      const info = result.extractedInfo;
      if (info.amount !== undefined) output += `- 金额: ${info.amount}\n`;
      if (info.type) output += `- 类型: ${info.type}\n`;
      if (info.category) output += `- 分类: ${info.category}\n`;
      if (info.description) output += `- 描述: ${info.description}\n`;
      if (info.date) output += `- 日期: ${info.date}\n`;
    }

    if (result.requiresConfirmation) {
      output += `\n⚠️ ${result.confirmationReason}`;
    }

    return output;
  }

  /**
   * 是否已启用
   */
  isEnabled(): boolean {
    return this.config.enabled && this.model !== null;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<IntentRewriterConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('📝 [IntentRewriter] Config updated:', this.config);
  }
}

// ============ 工厂函数 ============

/**
 * 创建 Intent Rewriter 实例
 */
export function createIntentRewriter(config?: IntentRewriterConfig): IntentRewriter {
  return new IntentRewriter(config);
}

/**
 * 默认配置
 */
export const DEFAULT_INTENT_REWRITER_CONFIG: IntentRewriterConfig = {
  model: DEFAULT_MODEL,
  enabled: true,
  confirmHighRisk: true,
  confirmMediumRisk: false,
  batchThreshold: 5,
};
