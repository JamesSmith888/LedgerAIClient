/**
 * API Key 存储服务
 * 
 * 安全存储用户配置的 AI 模型 API Key
 * 支持为不同模块配置不同的模型和提供商
 * 使用 AsyncStorage 持久化到本地
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// 存储键
const STORAGE_KEYS = {
  API_KEYS: '@ledger_ai_api_keys',
  SELECTED_PROVIDER: '@ledger_ai_selected_provider',
  MODEL_CONFIGS: '@ledger_ai_model_configs',
  THIRD_PARTY_GATEWAYS: '@ledger_ai_thirdparty_gateways',
  SELECTED_THIRD_PARTY_GATEWAY_ID: '@ledger_ai_selected_thirdparty_gateway_id',
  THIRD_PARTY_GATEWAY_MODEL_CONFIGS: '@ledger_ai_thirdparty_gateway_model_configs',
} as const;

// 支持的 AI 提供商
export type AIProvider = 'gemini' | 'deepseek' | 'alibaba' | 'thirdparty';

// 模型角色/用途
export type ModelRole = 'executor' | 'intentRewriter' | 'reflector' | 'completion';

// 模型角色配置
export interface ModelRoleConfig {
  id: ModelRole;
  name: string;
  description: string;
  icon: string;
}

// 每个角色的模型配置
export interface RoleModelConfig {
  provider: AIProvider;
  model: string;
}

// 所有角色的模型配置
export type ModelConfigs = Record<ModelRole, RoleModelConfig>;

// 提供商配置信息
export interface AIProviderConfig {
  id: AIProvider;
  name: string;
  description: string;
  icon: string;
  placeholder: string;
  helpUrl: string;
  models: string[];
  defaultModel: string;
  /** 是否支持图片/多模态 */
  supportsVision: boolean;
  /** 是否支持工具调用 */
  supportsTools: boolean;
  /** 是否支持音频输入 */
  supportsAudio: boolean;
  /** 支持的音频格式 */
  audioFormats?: string[];
  /** 自定义 Base URL（用于第三方网关） */
  baseURL?: string;
  /** 是否需要用户输入 Base URL */
  requiresBaseURL?: boolean;
}

// 第三方中转站配置
export interface ThirdPartyConfig {
  apiKey: string;
  baseURL: string;
}

/**
 * 第三方中转站（可配置多家）
 * - id: 用于选择/更新/删除
 * - name: 展示名称（可选，空则用 baseURL 展示）
 */
export interface ThirdPartyGatewayConfig {
  id: string;
  name?: string;
  apiKey: string;
  baseURL: string;
}

// API Key 存储结构
export interface APIKeyStore {
  gemini?: string;
  deepseek?: string;
  alibaba?: string;
  thirdparty?: ThirdPartyConfig;
}

// 模型角色定义
export const MODEL_ROLES: Record<ModelRole, ModelRoleConfig> = {
  executor: {
    id: 'executor',
    name: '任务执行模型',
    description: '主要的 AI Agent，负责理解用户需求并执行记账操作',
    icon: '🤖',
  },
  intentRewriter: {
    id: 'intentRewriter',
    name: '意图理解模型',
    description: '分析用户输入，提取关键信息并优化提示词',
    icon: '🎯',
  },
  reflector: {
    id: 'reflector',
    name: '反思监督模型',
    description: '评估执行结果，发现问题并提供改进建议',
    icon: '🔍',
  },
  completion: {
    id: 'completion',
    name: '智能补全模型',
    description: '在输入框中提供实时智能补全建议',
    icon: '✨',
  },
};

// ============ 默认配置常量 ============

/** 默认提供商 */
export const DEFAULT_PROVIDER: AIProvider = 'alibaba';

/** 默认模型名称 */
export const DEFAULT_MODEL = 'qwen3-omni-flash';

// 提供商配置
export const AI_PROVIDERS: Record<AIProvider, AIProviderConfig> = {
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Google 的多模态 AI 模型，支持图片和音频识别',
    icon: '✨',
    placeholder: 'AIzaSy...',
    helpUrl: 'https://aistudio.google.com/apikey',
    models: [DEFAULT_MODEL, 'gemini-2.5-flash', 'gemini-2.5-pro'],
    defaultModel: DEFAULT_MODEL,
    supportsVision: true,
    supportsTools: true,
    supportsAudio: true,
    // Gemini 官方支持的音频格式：https://ai.google.dev/gemini-api/docs/audio
    audioFormats: ['audio/wav', 'audio/mp3', 'audio/aiff', 'audio/aac', 'audio/ogg', 'audio/flac'],
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    description: '高性价比的中文 AI 模型（不支持音频输入）',
    icon: '🔮',
    placeholder: 'sk-...',
    helpUrl: 'https://platform.deepseek.com/api_keys',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    defaultModel: 'deepseek-chat',
    supportsVision: false,
    supportsTools: true,
    supportsAudio: false,
  },
  alibaba: {
    id: 'alibaba',
    name: '阿里云百炼',
    description: '阿里云通义千问大模型服务，兼容 OpenAI API',
    icon: '☁️',
    placeholder: 'sk-...',
    helpUrl: 'https://bailian.console.aliyun.com/',
    models: ['qwen3-omni-flash', 'qwen-max', 'qwen-plus', 'qwen-turbo', 'qwen-vl-max', 'qwen-vl-plus'],
    defaultModel: 'qwen3-omni-flash',
    supportsVision: true,
    supportsTools: true,
    supportsAudio: false,
  },
  thirdparty: {
    id: 'thirdparty',
    name: '第三方中转站',
    description: '支持 Gemini/OpenAI 格式的第三方 API 网关服务',
    icon: '🌐',
    placeholder: 'sk-...',
    helpUrl: 'https://docs.newapi.pro/zh/docs/api',
    models: ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet'],
    defaultModel: 'gemini-2.0-flash-exp',
    supportsVision: true,
    supportsTools: true,
    supportsAudio: true,
    requiresBaseURL: true,
  },
};

// 默认模型配置（所有角色使用同一个模型）
export const DEFAULT_MODEL_CONFIGS: ModelConfigs = {
  executor: { provider: DEFAULT_PROVIDER, model: DEFAULT_MODEL },
  intentRewriter: { provider: DEFAULT_PROVIDER, model: DEFAULT_MODEL },
  reflector: { provider: DEFAULT_PROVIDER, model: DEFAULT_MODEL },
  completion: { provider: DEFAULT_PROVIDER, model: DEFAULT_MODEL },
};

/**
 * API Key 存储服务类
 */
class APIKeyStorageService {
  private apiKeys: APIKeyStore = {};
  private selectedProvider: AIProvider = DEFAULT_PROVIDER;
  private modelConfigs: ModelConfigs = { ...DEFAULT_MODEL_CONFIGS };
  private thirdPartyGateways: ThirdPartyGatewayConfig[] = [];
  private selectedThirdPartyGatewayId: string | null = null;
  /** 每个中转站独立的模型选择（仅保存 model；provider 固定为 thirdparty） */
  private thirdPartyGatewayModels: Record<string, Partial<Record<ModelRole, string>>> = {};
  private initialized = false;

  private createGatewayId(seed?: string): string {
    const safeSeed = (seed || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
    return `gw_${Date.now()}_${Math.random().toString(36).slice(2, 10)}${safeSeed ? `_${safeSeed}` : ''}`;
  }

  private normalizeBaseURL(baseURL: string): string {
    const trimmed = (baseURL || '').trim();
    if (!trimmed) return trimmed;
    // 统一去掉末尾多余的斜杠，避免同一地址出现多个版本
    return trimmed.replace(/\/+$/, '');
  }

  private async persistThirdPartyGateways(): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.THIRD_PARTY_GATEWAYS, JSON.stringify(this.thirdPartyGateways));
    if (this.selectedThirdPartyGatewayId) {
      await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_THIRD_PARTY_GATEWAY_ID, this.selectedThirdPartyGatewayId);
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.SELECTED_THIRD_PARTY_GATEWAY_ID);
    }
  }

  private async persistThirdPartyGatewayModels(): Promise<void> {
    await AsyncStorage.setItem(
      STORAGE_KEYS.THIRD_PARTY_GATEWAY_MODEL_CONFIGS,
      JSON.stringify(this.thirdPartyGatewayModels || {})
    );
  }

  private getEffectiveRoleModelConfig(role: ModelRole): RoleModelConfig {
    const base = this.modelConfigs[role] || DEFAULT_MODEL_CONFIGS[role];
    if (base.provider !== 'thirdparty') return base;

    const gateway = this.getSelectedThirdPartyGatewayInternal();
    const thirdPartyDefaultModel = AI_PROVIDERS.thirdparty.defaultModel;
    if (!gateway) return { provider: 'thirdparty', model: base.model || thirdPartyDefaultModel };

    const model = this.thirdPartyGatewayModels?.[gateway.id]?.[role] || thirdPartyDefaultModel;
    return { provider: 'thirdparty', model };
  }

  private getEffectiveModelConfigs(): ModelConfigs {
    return {
      executor: this.getEffectiveRoleModelConfig('executor'),
      intentRewriter: this.getEffectiveRoleModelConfig('intentRewriter'),
      reflector: this.getEffectiveRoleModelConfig('reflector'),
      completion: this.getEffectiveRoleModelConfig('completion'),
    };
  }

  private getSelectedThirdPartyGatewayInternal(): ThirdPartyGatewayConfig | undefined {
    if (!this.thirdPartyGateways || this.thirdPartyGateways.length === 0) return undefined;
    if (this.selectedThirdPartyGatewayId) {
      const hit = this.thirdPartyGateways.find(g => g.id === this.selectedThirdPartyGatewayId);
      if (hit) return hit;
    }
    return this.thirdPartyGateways[0];
  }

  /**
   * 初始化 - 从 AsyncStorage 加载数据
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // 加载 API Keys
      const keysJson = await AsyncStorage.getItem(STORAGE_KEYS.API_KEYS);
      if (keysJson) {
        this.apiKeys = JSON.parse(keysJson);
      }

      // 加载第三方中转站（多家）
      const gatewaysJson = await AsyncStorage.getItem(STORAGE_KEYS.THIRD_PARTY_GATEWAYS);
      if (gatewaysJson) {
        this.thirdPartyGateways = JSON.parse(gatewaysJson) as ThirdPartyGatewayConfig[];
      }

      const selectedGatewayId = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_THIRD_PARTY_GATEWAY_ID);
      if (selectedGatewayId) {
        this.selectedThirdPartyGatewayId = selectedGatewayId;
      }

      // 加载第三方中转站的模型选择（按网关隔离）
      const gatewayModelsJson = await AsyncStorage.getItem(STORAGE_KEYS.THIRD_PARTY_GATEWAY_MODEL_CONFIGS);
      if (gatewayModelsJson) {
        this.thirdPartyGatewayModels = JSON.parse(gatewayModelsJson) as Record<string, Partial<Record<ModelRole, string>>>;
      }

      // 兼容旧版本：如果还没有 gateways，但存在旧的 thirdparty 单配置，则迁移到 gateways
      const legacyThirdParty = this.apiKeys.thirdparty as ThirdPartyConfig | undefined;
      if ((!this.thirdPartyGateways || this.thirdPartyGateways.length === 0) && legacyThirdParty?.apiKey && legacyThirdParty?.baseURL) {
        const migrated: ThirdPartyGatewayConfig = {
          id: this.createGatewayId(legacyThirdParty.baseURL),
          name: '默认中转站',
          apiKey: legacyThirdParty.apiKey,
          baseURL: this.normalizeBaseURL(legacyThirdParty.baseURL),
        };
        this.thirdPartyGateways = [migrated];
        this.selectedThirdPartyGatewayId = migrated.id;
        await this.persistThirdPartyGateways();

        // 兼容迁移：如果旧的 modelConfigs 里已经使用 thirdparty，则把 model 迁移到该默认网关
        const migratedModels: Partial<Record<ModelRole, string>> = {};
        (Object.keys(MODEL_ROLES) as ModelRole[]).forEach(role => {
          const cfg = this.modelConfigs[role];
          if (cfg?.provider === 'thirdparty' && cfg?.model) {
            migratedModels[role] = cfg.model;
          }
        });
        if (Object.keys(migratedModels).length > 0) {
          this.thirdPartyGatewayModels[migrated.id] = {
            ...(this.thirdPartyGatewayModels[migrated.id] || {}),
            ...migratedModels,
          };
          await this.persistThirdPartyGatewayModels();
        }
      }

      // 加载选中的提供商
      const provider = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_PROVIDER);
      if (provider && (provider === 'gemini' || provider === 'deepseek' || provider === 'alibaba' || provider === 'thirdparty')) {
        this.selectedProvider = provider as AIProvider;
      }

      // 加载模型配置
      const configsJson = await AsyncStorage.getItem(STORAGE_KEYS.MODEL_CONFIGS);
      if (configsJson) {
        const savedConfigs = JSON.parse(configsJson);
        this.modelConfigs = { ...DEFAULT_MODEL_CONFIGS, ...savedConfigs };
      }

      this.initialized = true;
      console.log('✅ [APIKeyStorage] Initialized:', {
        hasGeminiKey: !!this.apiKeys.gemini,
        hasDeepSeekKey: !!this.apiKeys.deepseek,
        selectedProvider: this.selectedProvider,
        thirdPartyGateways: this.thirdPartyGateways?.length || 0,
        selectedThirdPartyGatewayId: this.selectedThirdPartyGatewayId,
        thirdPartyGatewayModels: Object.keys(this.thirdPartyGatewayModels || {}).length,
        modelConfigs: this.modelConfigs,
      });
    } catch (error) {
      console.error('❌ [APIKeyStorage] Failed to initialize:', error);
    }
  }

  /**
   * 获取指定提供商的 API Key
   */
  async getAPIKey(provider: AIProvider): Promise<string | undefined> {
    await this.initialize();
    if (provider === 'thirdparty') {
      const gateway = this.getSelectedThirdPartyGatewayInternal();
      return gateway?.apiKey;
    }
    return this.apiKeys[provider] as string | undefined;
  }

  /**
   * 获取第三方中转站完整配置
   */
  async getThirdPartyConfig(): Promise<ThirdPartyConfig | undefined> {
    await this.initialize();
    const gateway = this.getSelectedThirdPartyGatewayInternal();
    if (!gateway?.apiKey || !gateway?.baseURL) return undefined;
    return { apiKey: gateway.apiKey, baseURL: gateway.baseURL };
  }

  /** 获取所有第三方中转站配置 */
  async getThirdPartyGateways(): Promise<ThirdPartyGatewayConfig[]> {
    await this.initialize();
    return [...(this.thirdPartyGateways || [])];
  }

  /** 获取当前选中的第三方中转站 ID */
  async getSelectedThirdPartyGatewayId(): Promise<string | null> {
    await this.initialize();
    return this.selectedThirdPartyGatewayId;
  }

  /** 设置当前选中的第三方中转站 */
  async setSelectedThirdPartyGatewayId(id: string | null): Promise<void> {
    await this.initialize();
    this.selectedThirdPartyGatewayId = id;
    await this.persistThirdPartyGateways();
  }

  /** 新增或更新一个第三方中转站 */
  async upsertThirdPartyGateway(config: Omit<ThirdPartyGatewayConfig, 'baseURL'> & { baseURL: string }): Promise<ThirdPartyGatewayConfig> {
    await this.initialize();

    const normalized: ThirdPartyGatewayConfig = {
      ...config,
      id: config.id || this.createGatewayId(config.baseURL),
      baseURL: this.normalizeBaseURL(config.baseURL),
      apiKey: config.apiKey.trim(),
      name: (config.name || '').trim() || undefined,
    };

    const validation = this.validateThirdPartyConfig({ apiKey: normalized.apiKey, baseURL: normalized.baseURL });
    if (!validation.valid) {
      throw new Error(validation.message || '第三方中转站配置不正确');
    }

    const existingIndex = (this.thirdPartyGateways || []).findIndex(g => g.id === normalized.id);
    if (existingIndex >= 0) {
      this.thirdPartyGateways[existingIndex] = normalized;
    } else {
      this.thirdPartyGateways = [...(this.thirdPartyGateways || []), normalized];
    }

    // 如果还没选中任何网关，默认选中刚保存的
    if (!this.selectedThirdPartyGatewayId) {
      this.selectedThirdPartyGatewayId = normalized.id;
    }

    await this.persistThirdPartyGateways();
    console.log('✅ [APIKeyStorage] Upsert third-party gateway:', { id: normalized.id, baseURL: normalized.baseURL });
    return normalized;
  }

  /** 删除一个第三方中转站 */
  async deleteThirdPartyGateway(id: string): Promise<void> {
    await this.initialize();
    const next = (this.thirdPartyGateways || []).filter(g => g.id !== id);
    this.thirdPartyGateways = next;
    if (this.selectedThirdPartyGatewayId === id) {
      this.selectedThirdPartyGatewayId = next.length > 0 ? next[0].id : null;
    }
    await this.persistThirdPartyGateways();
    console.log('✅ [APIKeyStorage] Deleted third-party gateway:', id);
  }

  /**
   * 设置指定提供商的 API Key
   */
  async setAPIKey(provider: AIProvider, apiKey: string | undefined): Promise<void> {
    await this.initialize();

    if (apiKey && apiKey.trim()) {
      // 第三方中转站需要单独处理，保留原有的 baseURL
      if (provider === 'thirdparty') {
        const existingConfig = this.apiKeys[provider] as ThirdPartyConfig | undefined;
        this.apiKeys[provider] = {
          apiKey: apiKey.trim(),
          baseURL: existingConfig?.baseURL || '',
        } as any;
      } else {
        this.apiKeys[provider] = apiKey.trim() as any;
      }
    } else {
      delete this.apiKeys[provider];
    }

    try {
      await AsyncStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(this.apiKeys));
      console.log(`✅ [APIKeyStorage] Saved API key for ${provider}`);
    } catch (error) {
      console.error(`❌ [APIKeyStorage] Failed to save API key for ${provider}:`, error);
      throw error;
    }
  }

  /**
   * 设置第三方中转站完整配置
   */
  async setThirdPartyConfig(config: ThirdPartyConfig | undefined): Promise<void> {
    await this.initialize();

    // 兼容旧 API：把单配置映射为 gateways 列表（只保留 1 个）
    if (config && config.apiKey.trim() && config.baseURL.trim()) {
      const normalizedBaseURL = this.normalizeBaseURL(config.baseURL);
      const gw: ThirdPartyGatewayConfig = {
        id: this.createGatewayId(normalizedBaseURL),
        name: '默认中转站',
        apiKey: config.apiKey.trim(),
        baseURL: normalizedBaseURL,
      };
      this.thirdPartyGateways = [gw];
      this.selectedThirdPartyGatewayId = gw.id;
    } else {
      this.thirdPartyGateways = [];
      this.selectedThirdPartyGatewayId = null;
    }

    // 同时保留旧字段写入（避免其它未改代码读取失败）
    if (config && config.apiKey.trim() && config.baseURL.trim()) {
      this.apiKeys.thirdparty = {
        apiKey: config.apiKey.trim(),
        baseURL: this.normalizeBaseURL(config.baseURL),
      } as any;
    } else {
      delete this.apiKeys.thirdparty;
    }

    try {
      await AsyncStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(this.apiKeys));
      await this.persistThirdPartyGateways();
      console.log('✅ [APIKeyStorage] Saved third-party config (legacy + gateways)');
    } catch (error) {
      console.error('❌ [APIKeyStorage] Failed to save third-party config:', error);
      throw error;
    }
  }

  /**
   * 获取当前选中的提供商
   */
  async getSelectedProvider(): Promise<AIProvider> {
    await this.initialize();
    return this.selectedProvider;
  }

  /**
   * 设置当前选中的提供商
   */
  async setSelectedProvider(provider: AIProvider): Promise<void> {
    await this.initialize();
    this.selectedProvider = provider;

    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_PROVIDER, provider);
      console.log(`✅ [APIKeyStorage] Selected provider: ${provider}`);
    } catch (error) {
      console.error('❌ [APIKeyStorage] Failed to save selected provider:', error);
      throw error;
    }
  }

  /**
   * 获取当前有效的 API Key（优先使用用户配置，否则返回 undefined）
   */
  async getActiveAPIKey(): Promise<{ provider: AIProvider; apiKey: string } | undefined> {
    await this.initialize();

    // 优先使用选中的提供商
    if (this.selectedProvider === 'thirdparty') {
      const gw = this.getSelectedThirdPartyGatewayInternal();
      if (gw?.apiKey && gw?.baseURL) {
        return { provider: 'thirdparty', apiKey: gw.apiKey };
      }
    } else {
      const selectedKey = this.apiKeys[this.selectedProvider] as string | undefined;
      if (selectedKey) {
        return { provider: this.selectedProvider, apiKey: selectedKey };
      }
    }

    // 否则尝试其他提供商
    for (const provider of Object.keys(this.apiKeys) as AIProvider[]) {
      if (provider === 'thirdparty') {
        const gw = this.getSelectedThirdPartyGatewayInternal();
        if (gw?.apiKey && gw?.baseURL) {
          return { provider: 'thirdparty', apiKey: gw.apiKey };
        }
        continue;
      }
      const key = this.apiKeys[provider] as string | undefined;
      if (key) return { provider, apiKey: key };
    }

    return undefined;
  }

  /**
   * 检查是否有任何可用的 API Key
   */
  async hasAnyAPIKey(): Promise<boolean> {
    await this.initialize();
    // 检查所有提供商的 API Key，包括第三方中转站
    const hasBasicKey = !!(this.apiKeys.gemini || this.apiKeys.deepseek || this.apiKeys.alibaba);
    const hasThirdParty = (this.thirdPartyGateways || []).some(g => !!(g.apiKey && g.baseURL));
    return hasBasicKey || hasThirdParty;
  }

  /**
   * 获取所有 API Keys（用于显示配置状态，隐藏实际值）
   */
  async getAllAPIKeysStatus(): Promise<Record<AIProvider, boolean>> {
    await this.initialize();
    return {
      gemini: !!this.apiKeys.gemini,
      deepseek: !!this.apiKeys.deepseek,
      alibaba: !!this.apiKeys.alibaba,
      thirdparty: (this.thirdPartyGateways || []).some(g => !!(g.apiKey && g.baseURL)),
    };
  }

  /**
   * 清除所有 API Keys
   */
  async clearAll(): Promise<void> {
    this.apiKeys = {};
    this.selectedProvider = 'gemini';
    this.thirdPartyGateways = [];
    this.selectedThirdPartyGatewayId = null;
    this.thirdPartyGatewayModels = {};

    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.API_KEYS,
        STORAGE_KEYS.SELECTED_PROVIDER,
        STORAGE_KEYS.THIRD_PARTY_GATEWAYS,
        STORAGE_KEYS.SELECTED_THIRD_PARTY_GATEWAY_ID,
        STORAGE_KEYS.THIRD_PARTY_GATEWAY_MODEL_CONFIGS,
      ]);
      console.log('✅ [APIKeyStorage] All API Keys cleared');
    } catch (error) {
      console.error('❌ [APIKeyStorage] Failed to clear API Keys:', error);
      throw error;
    }
  }

  /**
   * 验证 API Key 格式（简单校验）
   */
  validateAPIKeyFormat(provider: AIProvider, apiKey: string): { valid: boolean; message?: string } {
    if (!apiKey || !apiKey.trim()) {
      return { valid: false, message: '请输入 API Key' };
    }

    const trimmed = apiKey.trim();

    switch (provider) {
      case 'gemini':
        // Google API Key 通常以 AIza 开头
        if (!trimmed.startsWith('AIza') || trimmed.length < 30) {
          return { valid: false, message: 'Gemini API Key 格式不正确，应以 AIza 开头' };
        }
        break;
      case 'deepseek':
        // DeepSeek API Key 通常以 sk- 开头
        if (!trimmed.startsWith('sk-') || trimmed.length < 20) {
          return { valid: false, message: 'DeepSeek API Key 格式不正确，应以 sk- 开头' };
        }
        break;
      case 'alibaba':
        // 阿里云百炼 API Key 也是以 sk- 开头（OpenAI 兼容格式）
        if (!trimmed.startsWith('sk-') || trimmed.length < 20) {
          return { valid: false, message: '阿里云百炼 API Key 格式不正确，应以 sk- 开头' };
        }
        break;
      case 'thirdparty':
        // 第三方中转站通常也使用 sk- 开头的格式
        if (!trimmed.startsWith('sk-') || trimmed.length < 20) {
          return { valid: false, message: 'API Key 格式不正确，应以 sk- 开头' };
        }
        break;
    }

    return { valid: true };
  }

  /**
   * 验证第三方中转站配置
   */
  validateThirdPartyConfig(config: ThirdPartyConfig): { valid: boolean; message?: string } {
    if (!config.apiKey || !config.apiKey.trim()) {
      return { valid: false, message: 'API Key 不能为空' };
    }

    if (!config.baseURL || !config.baseURL.trim()) {
      return { valid: false, message: 'Base URL 不能为空' };
    }

    // 验证 URL 格式
    try {
      const url = new URL(config.baseURL.trim());
      if (!url.protocol.startsWith('http')) {
        return { valid: false, message: 'Base URL 必须以 http:// 或 https:// 开头' };
      }
    } catch {
      return { valid: false, message: 'Base URL 格式不正确' };
    }

    // 验证 API Key 格式
    const keyValidation = this.validateAPIKeyFormat('thirdparty', config.apiKey);
    if (!keyValidation.valid) {
      return keyValidation;
    }

    return { valid: true };
  }

  /**
   * 遮罩显示 API Key（保护隐私）
   */
  maskAPIKey(apiKey: string): string {
    if (!apiKey || apiKey.length < 10) return '***';
    return `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`;
  }

  // ============ 模型角色配置方法 ============

  /**
   * 获取指定角色的模型配置
   */
  async getRoleModelConfig(role: ModelRole): Promise<RoleModelConfig> {
    await this.initialize();
    return this.getEffectiveRoleModelConfig(role);
  }

  /**
   * 设置指定角色的模型配置
   */
  async setRoleModelConfig(role: ModelRole, config: RoleModelConfig): Promise<void> {
    await this.initialize();
    this.modelConfigs[role] = config;

    // thirdparty 的模型选择需要按当前选中的中转站保存
    if (config.provider === 'thirdparty') {
      const gateway = this.getSelectedThirdPartyGatewayInternal();
      if (gateway) {
        this.thirdPartyGatewayModels[gateway.id] = {
          ...(this.thirdPartyGatewayModels[gateway.id] || {}),
          [role]: config.model,
        };
      }
    }

    try {
      await AsyncStorage.setItem(STORAGE_KEYS.MODEL_CONFIGS, JSON.stringify(this.modelConfigs));
      if (config.provider === 'thirdparty') {
        await this.persistThirdPartyGatewayModels();
      }
      console.log(`✅ [APIKeyStorage] Model config saved for ${role}:`, config);
    } catch (error) {
      console.error('❌ [APIKeyStorage] Failed to save model config:', error);
      throw error;
    }
  }

  /**
   * 获取所有角色的模型配置
   */
  async getAllModelConfigs(): Promise<ModelConfigs> {
    await this.initialize();
    return this.getEffectiveModelConfigs();
  }

  /**
   * 统一设置所有角色使用同一个模型
   */
  async setUnifiedModelConfig(provider: AIProvider, model: string): Promise<void> {
    await this.initialize();
    
    const config: RoleModelConfig = { provider, model };
    this.modelConfigs = {
      executor: config,
      intentRewriter: config,
      reflector: config,
      completion: config,
    };

    if (provider === 'thirdparty') {
      const gateway = this.getSelectedThirdPartyGatewayInternal();
      if (gateway) {
        this.thirdPartyGatewayModels[gateway.id] = {
          ...(this.thirdPartyGatewayModels[gateway.id] || {}),
          executor: model,
          intentRewriter: model,
          reflector: model,
          completion: model,
        };
      }
    }

    try {
      await AsyncStorage.setItem(STORAGE_KEYS.MODEL_CONFIGS, JSON.stringify(this.modelConfigs));
      if (provider === 'thirdparty') {
        await this.persistThirdPartyGatewayModels();
      }
      console.log('✅ [APIKeyStorage] Unified model config saved:', config);
    } catch (error) {
      console.error('❌ [APIKeyStorage] Failed to save unified model config:', error);
      throw error;
    }
  }

  /**
   * 重置模型配置为默认值
   */
  async resetModelConfigs(): Promise<void> {
    this.modelConfigs = { ...DEFAULT_MODEL_CONFIGS };
    this.thirdPartyGatewayModels = {};
    
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.MODEL_CONFIGS);
      await AsyncStorage.removeItem(STORAGE_KEYS.THIRD_PARTY_GATEWAY_MODEL_CONFIGS);
      console.log('✅ [APIKeyStorage] Model configs reset to defaults');
    } catch (error) {
      console.error('❌ [APIKeyStorage] Failed to reset model configs:', error);
      throw error;
    }
  }

  /**
   * 获取指定角色的完整模型信息（包括 API Key 和 baseURL）
   * 这是给 Agent 模块使用的主要方法
   */
  async getModelForRole(role: ModelRole): Promise<{
    provider: AIProvider;
    model: string;
    apiKey: string | undefined;
    providerConfig: AIProviderConfig;
    baseURL?: string;
  }> {
    await this.initialize();

    const roleConfig = this.getEffectiveRoleModelConfig(role);
    const providerConfig = AI_PROVIDERS[roleConfig.provider];

    let apiKey: string | undefined;
    let baseURL: string | undefined;

    // 第三方中转站需要返回 apiKey 和 baseURL
    if (roleConfig.provider === 'thirdparty') {
      const gateway = this.getSelectedThirdPartyGatewayInternal();
      apiKey = gateway?.apiKey;
      baseURL = gateway?.baseURL;
    } else {
      apiKey = this.apiKeys[roleConfig.provider] as string | undefined;
    }

    return {
      provider: roleConfig.provider,
      model: roleConfig.model,
      apiKey,
      providerConfig,
      baseURL,
    };
  }

  /**
   * 检查指定角色是否有可用的 API Key
   */
  async hasAPIKeyForRole(role: ModelRole): Promise<boolean> {
    await this.initialize();
    const roleConfig = this.modelConfigs[role];
    if (roleConfig.provider === 'thirdparty') {
      const gw = this.getSelectedThirdPartyGatewayInternal();
      return !!(gw?.apiKey && gw?.baseURL);
    }
    return !!this.apiKeys[roleConfig.provider];
  }

  /**
   * 获取所有角色的 API Key 可用状态
   */
  async getAllRolesAPIKeyStatus(): Promise<Record<ModelRole, boolean>> {
    await this.initialize();
    return {
      executor: await this.hasAPIKeyForRole('executor'),
      intentRewriter: await this.hasAPIKeyForRole('intentRewriter'),
      reflector: await this.hasAPIKeyForRole('reflector'),
      completion: await this.hasAPIKeyForRole('completion'),
    };
  }
}

// 导出单例
export const apiKeyStorage = new APIKeyStorageService();
