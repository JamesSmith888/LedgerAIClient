/**
 * 智能补全服务
 * 
 * 核心功能：
 * 1. 本地 Trie 树高速前缀匹配（<5ms）
 * 2. 后端同步（初始化 + 增量）
 * 3. AI 模型补全（Debounce 触发）
 * 
 * 架构设计：
 * - 本地缓存优先，速度第一
 * - 后端作为持久化存储，定期同步
 * - AI 补全作为兜底，处理新场景
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { completionAPI, CompletionPhrase, CompletionResult } from '../api/services/completionAPI';
import { apiKeyStorage } from './apiKeyStorage';
import { createChatModel } from '../agent/modelFactory';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

// 存储键
const STORAGE_KEYS = {
  PHRASES: '@completion_phrases',
  LAST_SYNC: '@completion_last_sync',
  SETTINGS: '@completion_settings',
};

// 预设的高频短语（系统默认）
const PRESET_PHRASES: string[] = [
  // 统计查询
  '本月收支统计',
  '本月支出分析',
  '上个月收支情况',
  '今天花了多少钱',
  '今日消费明细',
  '这周花了多少',
  '这周消费分析',
  '查看最近交易',
  '按分类统计支出',
  // 记账操作
  '记一笔支出',
  '记一笔收入',
  '帮我记账',
  // 分析类
  '分析本月消费',
  '分析这周的消费',
  '分析上个月支出',
  '分析收支情况',
  // 查看类
  '查看餐饮消费',
  '查看交通费用',
  '查看购物支出',
  // 报表类
  '帮我生成月度报表',
  '生成本月消费报告',
  '导出收支明细',
  // 分类相关
  '餐饮消费统计',
  '交通费用统计',
  '购物支出汇总',
  '娱乐开销统计',
];

/**
 * 预设的初始建议（用于空对话时显示）
 * 每个建议包含标签和对应消息
 */
const PRESET_INITIAL_SUGGESTIONS: Array<{ label: string; message: string; icon?: string }> = [
  { label: '本月收支', message: '本月收支统计', icon: '📊' },
  { label: '记一笔', message: '记一笔支出', icon: '💸' },
  { label: '最近交易', message: '查看最近交易', icon: '📋' },
  { label: '消费分析', message: '分析本月消费', icon: '📈' },
  { label: '今日消费', message: '今天花了多少钱', icon: '💰' },
];

/**
 * 补全配置
 */
export interface CompletionSettings {
  /** 是否启用智能补全 */
  enabled: boolean;
  /** 是否启用 AI 补全 */
  aiEnabled: boolean;
  /** AI 补全触发延迟（毫秒） */
  aiDebounceMs: number;
  /** 最大本地缓存数量 */
  maxLocalCache: number;
  /** AI 补全使用的模型 */
  aiModel: string;
}

const DEFAULT_SETTINGS: CompletionSettings = {
  enabled: true,
  aiEnabled: true,
  aiDebounceMs: 500,
  maxLocalCache: 100,
  aiModel: 'gemini-2.5-flash-lite',
};

/**
 * 对话上下文消息（简化版本，用于补全提示）
 */
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * 补全候选结果
 */
export interface CompletionCandidate {
  /** 完整短语 */
  phrase: string;
  /** 补全部分（去掉前缀） */
  completion: string;
  /** 匹配分数 */
  score: number;
  /** 来源：local/remote/ai */
  source: 'local' | 'remote' | 'ai';
}

/**
 * Trie 节点
 */
interface TrieNode {
  children: Map<string, TrieNode>;
  isEnd: boolean;
  phrase?: string;
  frequency?: number;
  lastUsedAt?: number;
}

/**
 * 创建 Trie 节点
 */
function createTrieNode(): TrieNode {
  return {
    children: new Map(),
    isEnd: false,
  };
}

/**
 * 智能补全服务类
 */
class CompletionService {
  private root: TrieNode = createTrieNode();
  private phrases: Map<string, CompletionPhrase> = new Map();
  private settings: CompletionSettings = DEFAULT_SETTINGS;
  private initialized = false;
  private lastSyncTime: number = 0;

  // AI 补全 Debounce
  private aiDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private aiCompletionCallback: ((result: CompletionCandidate | null) => void) | null = null;

  // 对话上下文（最近几轮对话，用于 AI 补全）
  private conversationContext: ConversationMessage[] = [];

  /**
   * 设置当前对话上下文
   * 在聊天界面中调用，使补全更加准确
   */
  setConversationContext(messages: ConversationMessage[]): void {
    // 只保留最近 6 条消息
    this.conversationContext = messages.slice(-6);
    console.log('📝 [CompletionService] Conversation context updated:', this.conversationContext.length, 'messages');
  }

  /**
   * 清除对话上下文
   */
  clearConversationContext(): void {
    this.conversationContext = [];
  }

  /**
   * 更新设置
   */
  async updateSettings(newSettings: Partial<CompletionSettings>): Promise<void> {
    await this.saveSettings(newSettings);
    console.log('⚙️ [CompletionService] Settings updated:', this.settings);
  }

  /**
   * 获取当前设置
   */
  /**
   * 初始化服务
   * 1. 加载本地缓存
   * 2. 从后端同步最新数据
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('🔄 [CompletionService] Initializing...');

      // 1. 加载本地设置
      await this.loadSettings();

      // 2. 加载本地缓存
      await this.loadLocalCache();

      // 3. 如果本地为空，添加预设短语
      if (this.phrases.size === 0) {
        console.log('📝 [CompletionService] Adding preset phrases...');
        PRESET_PHRASES.forEach(phrase => {
          this.addToTrie({
            phrase,
            frequency: 1,
            lastUsedAt: Date.now(),
            sourceType: 'PRESET',
          });
        });
      }

      // 4. 后台同步后端数据（不阻塞初始化）
      this.syncFromRemote().catch(err => {
        console.warn('⚠️ [CompletionService] Remote sync failed:', err.message);
      });

      this.initialized = true;
      console.log('✅ [CompletionService] Initialized with', this.phrases.size, 'phrases');
    } catch (error) {
      console.error('❌ [CompletionService] Initialize failed:', error);
      this.initialized = true; // 即使失败也标记为已初始化，避免重复初始化
    }
  }

  /**
   * 加载本地设置
   */
  private async loadSettings(): Promise<void> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (json) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(json) };
      }
    } catch (error) {
      console.warn('⚠️ [CompletionService] Load settings failed:', error);
    }
  }

  /**
   * 保存设置
   */
  async saveSettings(settings: Partial<CompletionSettings>): Promise<void> {
    this.settings = { ...this.settings, ...settings };
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
  }

  /**
   * 获取当前设置
   */
  getSettings(): CompletionSettings {
    return { ...this.settings };
  }

  /**
   * 加载本地缓存
   */
  private async loadLocalCache(): Promise<void> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.PHRASES);
      if (json) {
        const phrases: CompletionPhrase[] = JSON.parse(json);
        phrases.forEach(p => this.addToTrie(p));
        console.log('📦 [CompletionService] Loaded', phrases.length, 'phrases from local cache');
      }

      const lastSync = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      if (lastSync) {
        this.lastSyncTime = parseInt(lastSync, 10);
      }
    } catch (error) {
      console.warn('⚠️ [CompletionService] Load local cache failed:', error);
    }
  }

  /**
   * 保存到本地缓存
   */
  private async saveLocalCache(): Promise<void> {
    try {
      const phrases = Array.from(this.phrases.values());
      await AsyncStorage.setItem(STORAGE_KEYS.PHRASES, JSON.stringify(phrases));
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, String(this.lastSyncTime));
    } catch (error) {
      console.warn('⚠️ [CompletionService] Save local cache failed:', error);
    }
  }

  /**
   * 从后端同步数据
   */
  async syncFromRemote(): Promise<void> {
    try {
      let phrases: CompletionPhrase[];

      if (this.lastSyncTime === 0) {
        // 首次同步，获取 top N
        console.log('📡 [CompletionService] Full sync from remote...');
        phrases = await completionAPI.getTopPhrases(this.settings.maxLocalCache);
      } else {
        // 增量同步
        console.log('📡 [CompletionService] Incremental sync since', new Date(this.lastSyncTime));
        phrases = await completionAPI.syncPhrases(this.lastSyncTime);
      }

      if (phrases.length > 0) {
        phrases.forEach(p => this.addToTrie(p));
        console.log('📡 [CompletionService] Synced', phrases.length, 'phrases');
      }

      this.lastSyncTime = Date.now();
      await this.saveLocalCache();
    } catch (error) {
      console.warn('⚠️ [CompletionService] Sync from remote failed:', error);
      throw error;
    }
  }

  /**
   * 添加短语到 Trie 树
   */
  private addToTrie(phrase: CompletionPhrase): void {
    const text = phrase.phrase;
    if (!text || text.length < 2) return;

    // 更新 Map
    const existing = this.phrases.get(text);
    if (existing) {
      // 合并：取更高的频率
      existing.frequency = Math.max(existing.frequency, phrase.frequency);
      existing.lastUsedAt = Math.max(existing.lastUsedAt, phrase.lastUsedAt);
    } else {
      this.phrases.set(text, phrase);
    }

    // 更新 Trie
    let node = this.root;
    for (const char of text) {
      if (!node.children.has(char)) {
        node.children.set(char, createTrieNode());
      }
      node = node.children.get(char)!;
    }
    node.isEnd = true;
    node.phrase = text;
    node.frequency = phrase.frequency;
    node.lastUsedAt = phrase.lastUsedAt;
  }

  /**
   * 查询补全候选
   * 
   * @param prefix 用户输入的前缀
   * @param onAIResult AI 补全结果回调（异步）
   * @returns 立即返回的本地匹配结果
   */
  query(
    prefix: string,
    onAIResult?: (result: CompletionCandidate | null) => void
  ): CompletionCandidate[] {
    console.log('🔍 [CompletionService] query() called, prefix:', JSON.stringify(prefix));
    // 注意：aiModel 是历史遗留字段（已不作为模型选择来源，模型选择以 apiKeyStorage completion 角色配置为准）
    console.log('🔍 [CompletionService] Settings:', JSON.stringify({
      enabled: this.settings.enabled,
      aiEnabled: this.settings.aiEnabled,
      aiDebounceMs: this.settings.aiDebounceMs,
      maxLocalCache: this.settings.maxLocalCache,
    }));
    
    if (!this.settings.enabled || !prefix || prefix.length < 1) {
      console.log('🔍 [CompletionService] Query skipped: enabled=', this.settings.enabled, 'prefix=', prefix);
      return [];
    }

    // 1. 本地 Trie 查询（同步，极快）
    const localResults = this.searchTrie(prefix);
    console.log('🔍 [CompletionService] Local Trie results:', localResults.length, localResults.map(r => r.phrase));

    // 2. 如果启用 AI 补全且本地结果不够好，触发 AI 补全
    if (this.settings.aiEnabled && onAIResult) {
      const shouldTriggerAI = localResults.length === 0 || 
        (localResults.length < 3 && prefix.length >= 2);

      console.log('🔍 [CompletionService] Should trigger AI?', shouldTriggerAI, 
        '(localResults:', localResults.length, ', prefix.length:', prefix.length, ')');

      if (shouldTriggerAI) {
        this.triggerAICompletion(prefix, onAIResult);
      }
    }

    return localResults;
  }

  /**
   * Trie 树搜索
   */
  private searchTrie(prefix: string): CompletionCandidate[] {
    console.log('🌳 [CompletionService] searchTrie, prefix:', prefix, 'initialized:', this.initialized, 'phrases:', this.phrases.size);
    
    // 找到前缀对应的节点
    let node = this.root;
    for (const char of prefix) {
      if (!node.children.has(char)) {
        console.log('🌳 [CompletionService] No node for char:', char);
        return []; // 无匹配
      }
      node = node.children.get(char)!;
    }

    // DFS 收集所有以此前缀开头的短语
    const results: CompletionCandidate[] = [];
    this.collectPhrases(node, prefix, results);

    console.log('🌳 [CompletionService] Found', results.length, 'results before sort');

    // 按分数排序
    results.sort((a, b) => b.score - a.score);

    // 返回 top 5
    return results.slice(0, 5);
  }

  /**
   * DFS 收集短语
   */
  private collectPhrases(
    node: TrieNode,
    currentPrefix: string,
    results: CompletionCandidate[]
  ): void {
    if (node.isEnd && node.phrase) {
      // 只有当短语比前缀长时，才有补全意义
      const completion = node.phrase.substring(currentPrefix.length);
      if (completion.length > 0) {
        // 计算分数：频率 * 时间衰减
        const daysSinceLastUse = (Date.now() - (node.lastUsedAt || 0)) / (1000 * 60 * 60 * 24);
        const decay = Math.pow(0.9, daysSinceLastUse);
        const score = (node.frequency || 1) * decay;

        console.log('🌳 [CompletionService] Found phrase:', node.phrase, 'completion:', completion, 'score:', score);

        results.push({
          phrase: node.phrase,
          completion,
          score,
          source: 'local',
        });
      }
    }

    // 限制搜索深度，避免性能问题
    if (results.length >= 10) return;

    for (const [char, child] of node.children) {
      this.collectPhrases(child, currentPrefix + char, results);
    }
  }

  /**
   * 触发 AI 补全（带 Debounce）
   */
  private triggerAICompletion(
    prefix: string,
    callback: (result: CompletionCandidate | null) => void
  ): void {
    // 取消之前的定时器
    if (this.aiDebounceTimer) {
      clearTimeout(this.aiDebounceTimer);
    }

    this.aiCompletionCallback = callback;

    // 设置新的定时器
    this.aiDebounceTimer = setTimeout(async () => {
      try {
        // 调用 AI 补全
        const result = await this.callAICompletion(prefix);
        if (this.aiCompletionCallback === callback) {
          callback(result);
        }
      } catch (error) {
        console.warn('⚠️ [CompletionService] AI completion failed:', error);
        if (this.aiCompletionCallback === callback) {
          callback(null);
        }
      }
    }, this.settings.aiDebounceMs);
  }

  /**
   * 调用 AI 模型进行补全
   * 
   * 使用 FIM (Fill-In-Middle) 模式
   * Prompt 设计：让模型知道这是"填空"而非"续写"
   */
  private async callAICompletion(prefix: string): Promise<CompletionCandidate | null> {
    console.log('🤖 [CompletionService] AI completion for:', prefix);

    try {
      // 1. 获取 API Key 和配置 (使用 completion 角色配置)
      const roleConfig = await apiKeyStorage.getModelForRole('completion');
      if (!roleConfig.apiKey) {
        console.log('🤖 [CompletionService] No API key for completion role, skipping');
        return null;
      }

      // 2. 获取高频短语作为上下文 (Top 50)
      const topPhrases = Array.from(this.phrases.values())
        .sort((a, b) => (b.frequency || 0) - (a.frequency || 0))
        .slice(0, 50)
        .map(p => p.phrase)
        .join('\n');

      // 3. 构建对话历史上下文
      let conversationContextStr = '';
      if (this.conversationContext.length > 0) {
        conversationContextStr = `\n\n当前对话上下文（请结合对话历史理解用户意图）：\n${
          this.conversationContext
            .map(m => `${m.role === 'user' ? '用户' : 'AI助手'}: ${m.content}`)
            .join('\n')
        }`;
      }

      // 4. 构建 Prompt
      const systemPrompt = `你是一个记账软件的智能输入助手。用户正在输入查询或命令。
你的任务是预测用户想要输入的完整内容，并返回补全部分（不包含用户已输入的内容）。

规则：
1. 只返回需要补全的文字，不要重复用户已输入的内容
2. 补全应该简洁、自然、符合记账场景
3. 如果无法确定，返回空字符串
4. 不要添加任何解释或额外文字
5. 如果有对话上下文，请结合上下文理解用户当前想表达什么

参考的高频短语（用户习惯）：
${topPhrases}
${conversationContextStr}

常见的查询模式：
- 本月收支统计
- 今天花了多少钱
- 查看最近交易
- 按分类统计支出
- 上个月收入
- 记一笔支出/收入`;

      const userPrompt = `用户已输入: "${prefix}"
请补全:`;

      // 5. 创建模型并调用
      const model = createChatModel({
        provider: roleConfig.provider,
        model: roleConfig.model,
        apiKey: roleConfig.apiKey,
        temperature: 0.1, // 低温度，更确定性的输出
        baseURL: roleConfig.baseURL,
      });

      const response = await model.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt),
      ]);

      const completionText = typeof response.content === 'string' ? response.content.trim() : '';
      
      console.log('🤖 [CompletionService] AI response:', completionText);

      if (completionText && completionText.length > 0) {
        // 简单的后处理：如果 AI 返回了完整句子，尝试提取补全部分
        let finalCompletion = completionText;
        if (completionText.startsWith(prefix)) {
            finalCompletion = completionText.substring(prefix.length);
        }

        // 再次清理可能的前缀重复 (以防万一)
        if (finalCompletion.startsWith(prefix)) {
             finalCompletion = finalCompletion.substring(prefix.length);
        }
        
        if (finalCompletion.length > 0) {
            return {
              phrase: prefix + finalCompletion,
              completion: finalCompletion,
              score: 0.9, // AI 结果分数较高
              source: 'ai',
            };
        }
      }

      // 兜底：如果 AI 没返回有效结果，尝试规则
      const ruleBasedCompletion = this.getRuleBasedCompletion(prefix);
      if (ruleBasedCompletion) {
        return {
          phrase: prefix + ruleBasedCompletion,
          completion: ruleBasedCompletion,
          score: 0.5,
          source: 'local', // 规则算是 local
        };
      }

      return null;
    } catch (error) {
      console.warn('⚠️ [CompletionService] AI completion error:', error);
      return null;
    }
  }

  /**
   * 基于规则的简单补全（作为 AI 的兜底）
   */
  private getRuleBasedCompletion(prefix: string): string | null {
    console.log('📏 [CompletionService] getRuleBasedCompletion, prefix:', JSON.stringify(prefix));
    
    // 按规则优先级排序：更具体的规则优先
    const rules: Array<{ pattern: RegExp; completions: string[] }> = [
      // 长匹配优先
      { pattern: /^分析[一下]*这周的消费/, completions: ['情况', '记录', '明细'] },
      { pattern: /^分析[一下]*这周/, completions: ['的消费', '的支出', '花了多少'] },
      { pattern: /^分析[一下]*本月/, completions: ['消费', '支出', '收支'] },
      { pattern: /^分析[一下]+/, completions: ['本月消费', '这周的消费', '收支情况', '上个月支出'] },
      { pattern: /^分析/, completions: ['一下本月消费', '一下这周的消费', '本月收支情况'] },
      // 常用查询
      { pattern: /^本月/, completions: ['收支统计', '支出分析', '收入统计', '消费明细'] },
      { pattern: /^上月/, completions: ['收支统计', '支出分析', '收入统计'] },
      { pattern: /^今[天日]/, completions: ['花了多少钱', '消费明细', '支出统计'] },
      { pattern: /^这周/, completions: ['花了多少', '支出统计', '收支情况', '消费分析'] },
      { pattern: /^查[看一]/, completions: ['最近交易', '本月支出', '收支报表'] },
      { pattern: /^记[一笔]/, completions: ['笔支出', '笔收入'] },
      { pattern: /^按/, completions: ['分类统计', '日期查看', '金额排序'] },
      { pattern: /^帮我/, completions: ['记一笔', '查看', '统计', '生成报表', '分析'] },
      { pattern: /^餐饮/, completions: ['消费', '支出统计', '花费'] },
      { pattern: /^交通/, completions: ['费用', '支出统计'] },
      { pattern: /^购物/, completions: ['支出', '消费统计'] },
      { pattern: /^看看/, completions: ['本月消费', '最近支出', '收入情况'] },
      { pattern: /^统计/, completions: ['本月支出', '收入情况', '分类消费'] },
      { pattern: /^最近/, completions: ['消费记录', '交易明细', '支出情况'] },
    ];

    for (const rule of rules) {
      const match = prefix.match(rule.pattern);
      console.log('📏 [CompletionService] Testing rule:', rule.pattern.toString(), 'match:', !!match);
      
      if (match) {
        // 找到匹配的规则，返回第一个补全建议
        // 需要去掉已经输入的部分
        for (const completion of rule.completions) {
          const fullText = match[0] + completion;
          console.log('📏 [CompletionService] Checking completion:', completion, 'fullText:', fullText);
          if (fullText.startsWith(prefix) && fullText !== prefix) {
            const result = fullText.substring(prefix.length);
            console.log('📏 [CompletionService] ✅ Found match! completion:', result);
            return result;
          }
        }
      }
    }

    console.log('📏 [CompletionService] ❌ No rule matched');
    return null;
  }

  /**
   * 记录用户输入（发送消息后调用）
   */
  async recordUserInput(text: string): Promise<void> {
    if (!text || text.length < 2) return;

    const phrase: CompletionPhrase = {
      phrase: text,
      frequency: 1,
      lastUsedAt: Date.now(),
      sourceType: 'USER_INPUT',
    };

    // 更新本地
    const existing = this.phrases.get(text);
    if (existing) {
      existing.frequency += 1;
      existing.lastUsedAt = Date.now();
      this.addToTrie(existing);
    } else {
      this.addToTrie(phrase);
    }

    // 保存到本地
    await this.saveLocalCache();

    // 同步到后端（不阻塞）
    completionAPI.addPhrase(text, 'USER_INPUT').catch(err => {
      console.warn('⚠️ [CompletionService] Record to remote failed:', err.message);
    });
  }

  /**
   * 记录用户采纳的建议
   */
  async recordAcceptedSuggestion(text: string): Promise<void> {
    if (!text || text.length < 2) return;

    const phrase: CompletionPhrase = {
      phrase: text,
      frequency: 2, // 采纳的建议权重更高
      lastUsedAt: Date.now(),
      sourceType: 'SUGGESTION_ACCEPTED',
    };

    this.addToTrie(phrase);
    await this.saveLocalCache();

    // 同步到后端
    completionAPI.addPhrase(text, 'SUGGESTION_ACCEPTED').catch(err => {
      console.warn('⚠️ [CompletionService] Record to remote failed:', err.message);
    });
  }

  /**
   * 清除本地缓存
   */
  async clearCache(): Promise<void> {
    this.root = createTrieNode();
    this.phrases.clear();
    this.lastSyncTime = 0;
    await AsyncStorage.multiRemove([STORAGE_KEYS.PHRASES, STORAGE_KEYS.LAST_SYNC]);
    console.log('🗑️ [CompletionService] Cache cleared');
  }

  /**
   * 获取初始建议（用于空输入或新对话时显示的快捷操作）
   * 
   * 策略：
   * 1. 如果有对话上下文，根据上下文智能推荐
   * 2. 如果没有上下文，返回预设的高频建议
   * 3. 可选：异步调用 AI 获取更智能的建议
   * 
   * @param useAI 是否使用 AI 生成建议（异步）
   * @returns 初始建议列表
   */
  async getInitialSuggestions(
    useAI: boolean = false
  ): Promise<Array<{ label: string; message: string; icon?: string }>> {
    console.log('💡 [CompletionService] Getting initial suggestions, useAI:', useAI, 
      'context:', this.conversationContext.length, 'messages');

    // 如果有对话上下文且启用 AI，尝试生成智能建议
    if (useAI && this.settings.aiEnabled && this.conversationContext.length > 0) {
      try {
        const aiSuggestions = await this.generateAISuggestions();
        if (aiSuggestions.length > 0) {
          console.log('🤖 [CompletionService] AI generated suggestions:', aiSuggestions);
          return aiSuggestions;
        }
      } catch (error) {
        console.warn('⚠️ [CompletionService] AI suggestions failed, using fallback:', error);
      }
    }

    // 根据上下文选择合适的预设建议
    if (this.conversationContext.length > 0) {
      return this.getContextAwareSuggestions();
    }

    // 无上下文时返回默认预设
    return PRESET_INITIAL_SUGGESTIONS.slice(0, 4);
  }

  /**
   * 根据对话上下文选择合适的预设建议
   */
  private getContextAwareSuggestions(): Array<{ label: string; message: string; icon?: string }> {
    const lastMessages = this.conversationContext.slice(-2);
    const lastContent = lastMessages.map(m => m.content).join(' ').toLowerCase();

    // 基于上下文关键词选择相关建议
    const contextSuggestions: Array<{ label: string; message: string; icon?: string }> = [];

    // 如果用户刚查询了统计，推荐相关的深入分析
    if (lastContent.includes('统计') || lastContent.includes('收支')) {
      contextSuggestions.push(
        { label: '分类明细', message: '按分类查看支出明细', icon: '📂' },
        { label: '趋势分析', message: '分析最近的消费趋势', icon: '📈' },
        { label: '导出报表', message: '导出收支明细', icon: '📤' }
      );
    }

    // 如果用户刚记录了交易
    if (lastContent.includes('记一笔') || lastContent.includes('记账')) {
      contextSuggestions.push(
        { label: '今日汇总', message: '今天花了多少钱', icon: '💰' },
        { label: '继续记账', message: '再记一笔支出', icon: '💸' },
        { label: '查看记录', message: '查看最近交易', icon: '📋' }
      );
    }

    // 如果用户在查询交易记录
    if (lastContent.includes('交易') || lastContent.includes('记录') || lastContent.includes('明细')) {
      contextSuggestions.push(
        { label: '本月统计', message: '本月收支统计', icon: '📊' },
        { label: '按分类看', message: '按分类统计支出', icon: '📂' },
        { label: '消费分析', message: '分析本月消费', icon: '📈' }
      );
    }

    // 如果找到上下文相关建议，返回它们
    if (contextSuggestions.length > 0) {
      return contextSuggestions.slice(0, 4);
    }

    // 否则返回默认预设
    return PRESET_INITIAL_SUGGESTIONS.slice(0, 4);
  }

  /**
   * 使用 AI 生成智能建议
   */
  private async generateAISuggestions(): Promise<Array<{ label: string; message: string; icon?: string }>> {
    const roleConfig = await apiKeyStorage.getModelForRole('completion');
    if (!roleConfig.apiKey) return [];

    const conversationStr = this.conversationContext
      .map(m => `${m.role === 'user' ? '用户' : 'AI助手'}: ${m.content}`)
      .join('\n');

    const systemPrompt = `你是一个记账软件的智能助手。根据用户的对话历史，预测用户接下来可能想做什么操作。

规则：
1. 生成 3-4 个相关的后续操作建议
2. 每个建议包含：简短标签（2-4字）、完整消息（用于发送给 AI）、可选的 emoji 图标
3. 建议应该自然、符合记账场景、与对话上下文相关
4. 返回 JSON 数组格式

可选的操作类型：
- 统计查询：本月收支统计、今日消费、按分类统计等
- 记账：记一笔支出/收入
- 分析：消费趋势、分类分析
- 导出：导出明细、生成报表
- 查看：最近交易、某分类消费

常用 emoji：📊 📈 📋 💸 💰 📂 📤 ✏️`;

    const userPrompt = `当前对话：
${conversationStr}

请生成 3-4 个用户可能的后续操作建议，以 JSON 数组返回：
[{"label": "标签", "message": "完整消息", "icon": "emoji"}]`;

    try {
      const model = createChatModel({
        provider: roleConfig.provider,
        model: roleConfig.model,
        apiKey: roleConfig.apiKey,
        temperature: 0.3,
        baseURL: roleConfig.baseURL,
      });

      const response = await model.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt),
      ]);

      const content = typeof response.content === 'string' ? response.content.trim() : '';
      
      // 尝试解析 JSON
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const suggestions = JSON.parse(jsonMatch[0]);
        if (Array.isArray(suggestions) && suggestions.length > 0) {
          return suggestions.slice(0, 4).map(s => ({
            label: s.label || '',
            message: s.message || '',
            icon: s.icon || '💡',
          }));
        }
      }
    } catch (error) {
      console.warn('⚠️ [CompletionService] Parse AI suggestions failed:', error);
    }

    return [];
  }
}

// 导出单例
export const completionService = new CompletionService();
