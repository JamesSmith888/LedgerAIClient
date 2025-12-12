/**
 * TitleGeneratorService - 对话标题生成服务
 * 
 * 使用 AI 根据对话内容自动生成简洁的标题
 * 在用户发送第一条消息并得到回复后自动触发
 */

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentMessage } from '../types/agent';
import { apiKeyStorage } from './apiKeyStorage';
import { createChatModel } from '../agent/modelFactory';

/**
 * 标题生成配置
 */
interface TitleGeneratorConfig {
  /** 最大标题长度（字符） */
  maxLength?: number;
  /** 是否使用更小的模型以降低成本 */
  useFastModel?: boolean;
}

/**
 * 系统提示词 - 专注于生成简洁标题
 */
const SYSTEM_PROMPT = `你是标题生成助手。根据对话内容生成简洁的标题。

## 要求

1. **简洁**: 4-12个字，不超过15个字
2. **准确**: 概括对话的核心主题
3. **自然**: 使用日常用语，不要太正式
4. **禁止**: 
   - 不要使用"关于"、"的对话"等冗余词
   - 不要使用引号、书名号等标点
   - 不要使用emoji表情

## 示例

❌ 不好的标题:
- "关于今天早餐的消费记录"
- "查询本月支出情况的对话"
- "🍜 早餐记账"

✅ 好的标题:
- "今天早餐记账"
- "本月支出查询"
- "超市购物记录"

## 输出格式

只输出标题文本，不要任何解释或额外内容。`;

/**
 * 标题生成服务
 */
class TitleGeneratorService {
  private config: Required<TitleGeneratorConfig> = {
    maxLength: 15,
    useFastModel: true,
  };

  /**
   * 更新配置
   */
  updateConfig(config: Partial<TitleGeneratorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 降级方案：从用户第一条消息生成标题
   * 
   * @param messages 对话消息列表
   * @returns 生成的标题，如果失败返回 null
   */
  private generateFallbackTitle(messages: AgentMessage[]): string | null {
    // 找到用户的第一条文本消息
    const firstUserMessage = messages.find(
      m => m.type === 'text' && m.sender === 'user' && m.content.trim().length > 0
    );

    if (!firstUserMessage) {
      return null;
    }

    let content = firstUserMessage.content.trim();

    // 清理内容
    content = content
      .replace(/\n+/g, ' ') // 移除换行
      .replace(/\s+/g, ' ') // 合并多个空格
      .trim();

    // 如果内容太长，智能截断
    if (content.length > this.config.maxLength) {
      // 尝试在标点符号处截断
      const punctuations = ['。', '！', '？', '，', '、', ' '];
      let cutIndex = this.config.maxLength;

      for (let i = this.config.maxLength - 1; i >= Math.floor(this.config.maxLength * 0.6); i--) {
        if (punctuations.includes(content[i])) {
          cutIndex = i;
          break;
        }
      }

      content = content.substring(0, cutIndex).trim();
      
      // 移除末尾标点
      content = content.replace(/[。！？，、\.\!\?\,]+$/, '');
    }

    // 验证标题有效性
    if (content.length < 2) {
      return null;
    }

    console.log('✂️ [TitleGenerator] Generated fallback title:', content);
    return content;
  }

  /**
   * 根据对话消息生成标题
   * 
   * @param messages 对话消息列表（至少包含一轮用户和AI的对话）
   * @returns 生成的标题，如果失败返回 null
   */
  async generateTitle(messages: AgentMessage[]): Promise<string | null> {
    try {
      // 过滤出文本消息（用户和助手的对话）
      const textMessages = messages.filter(
        m => m.type === 'text' && 
        (m.sender === 'user' || m.sender === 'assistant') &&
        m.content.trim().length > 0
      );

      // 至少需要一轮对话（一问一答）
      if (textMessages.length < 2) {
        console.warn('⚠️ [TitleGenerator] Not enough messages for title generation');
        // 降级：使用用户第一条消息
        return this.generateFallbackTitle(messages);
      }

      // 只使用前3轮对话（最多6条消息）生成标题，避免内容太长
      const relevantMessages = textMessages.slice(0, 6);

      // 构建对话上下文
      const conversationContext = relevantMessages
        .map(m => `${m.sender === 'user' ? '用户' : 'AI'}: ${m.content}`)
        .join('\n');

      const prompt = `请根据以下对话内容，生成一个简洁的标题：

${conversationContext}

标题:`;

      // 获取 API Key 和模型配置
      const { apiKey, provider, model } = await apiKeyStorage.getModelForRole('executor');
      
      if (!apiKey) {
        console.warn('⚠️ [TitleGenerator] No API key available');
        return null;
      }

      // 创建模型（使用更快的模型降低成本）
      const chatModel = createChatModel({
        provider,
        model, // 使用执行模型相同的配置，确保一致性
        apiKey,
        temperature: 0.3, // 稍微提高创造性，但保持稳定
        maxRetries: 1,
      });

      console.log('🏷️ [TitleGenerator] Generating title...');
      
      const response = await chatModel.invoke([
        new SystemMessage(SYSTEM_PROMPT),
        new HumanMessage(prompt),
      ]);

      const content = typeof response.content === 'string' 
        ? response.content 
        : JSON.stringify(response.content);

      // 清理生成的标题
      let title = content
        .trim()
        .replace(/^(标题[:：]|Title[:：])/i, '') // 移除可能的前缀
        .replace(/^["'「『]|["'」』]$/g, '') // 移除引号
        .replace(/[。！？\.\!\?]+$/g, '') // 移除结尾标点
        .trim();

      // 限制长度
      if (title.length > this.config.maxLength) {
        title = title.substring(0, this.config.maxLength);
      }

      // 验证标题有效性
      if (title.length < 2) {
        console.warn('⚠️ [TitleGenerator] Generated title too short:', title);
        return null;
      }

      console.log('✅ [TitleGenerator] Generated title:', title);
      return title;

    } catch (error) {
      console.error('❌ [TitleGenerator] Failed to generate title:', error);
      
      // 降级方案：使用用户第一条消息作为标题
      console.log('🔄 [TitleGenerator] Attempting fallback title generation...');
      return this.generateFallbackTitle(messages);
    }
  }

  /**
   * 判断是否应该生成标题
   * 
   * 条件：
   * 1. 对话标题是默认的"新对话 X"格式
   * 2. 至少有一轮完整的对话（用户提问 + AI 回答）
   */
  shouldGenerateTitle(currentTitle: string, messages: AgentMessage[]): boolean {
    // 检查是否是默认标题格式
    const isDefaultTitle = /^(新对话|对话)\s*\d*$/.test(currentTitle);
    
    if (!isDefaultTitle) {
      return false;
    }

    // 检查是否有足够的对话内容
    const textMessages = messages.filter(
      m => m.type === 'text' && 
      (m.sender === 'user' || m.sender === 'assistant') &&
      m.content.trim().length > 0
    );

    return textMessages.length >= 2;
  }
}

// 导出单例
export const titleGeneratorService = new TitleGeneratorService();
