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
} as const;

// 支持的 AI 提供商
export type AIProvider = 'gemini' | 'deepseek';

// 模型角色/用途
export type ModelRole = 'executor' | 'intentRewriter' | 'reflector';

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
}

// API Key 存储结构
export interface APIKeyStore {
  gemini?: string;
  deepseek?: string;
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
};

// ============ 默认配置常量 ============

/** 默认提供商 */
export const DEFAULT_PROVIDER: AIProvider = 'gemini';

/** 默认模型名称 */
export const DEFAULT_MODEL = 'gemini-2.5-flash-lite';

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
};

// 默认模型配置（所有角色使用同一个模型）
export const DEFAULT_MODEL_CONFIGS: ModelConfigs = {
  executor: { provider: DEFAULT_PROVIDER, model: DEFAULT_MODEL },
  intentRewriter: { provider: DEFAULT_PROVIDER, model: DEFAULT_MODEL },
  reflector: { provider: DEFAULT_PROVIDER, model: DEFAULT_MODEL },
};

/**
 * API Key 存储服务类
 */
class APIKeyStorageService {
  private apiKeys: APIKeyStore = {};
  private selectedProvider: AIProvider = DEFAULT_PROVIDER;
  private modelConfigs: ModelConfigs = { ...DEFAULT_MODEL_CONFIGS };
  private initialized = false;

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

      // 加载选中的提供商
      const provider = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_PROVIDER);
      if (provider && (provider === 'gemini' || provider === 'deepseek')) {
        this.selectedProvider = provider;
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
    return this.apiKeys[provider];
  }

  /**
   * 设置指定提供商的 API Key
   */
  async setAPIKey(provider: AIProvider, apiKey: string | undefined): Promise<void> {
    await this.initialize();

    if (apiKey && apiKey.trim()) {
      this.apiKeys[provider] = apiKey.trim();
    } else {
      delete this.apiKeys[provider];
    }

    try {
      await AsyncStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(this.apiKeys));
      console.log(`✅ [APIKeyStorage] API Key ${apiKey ? 'saved' : 'removed'} for ${provider}`);
    } catch (error) {
      console.error('❌ [APIKeyStorage] Failed to save API Key:', error);
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
    const selectedKey = this.apiKeys[this.selectedProvider];
    if (selectedKey) {
      return { provider: this.selectedProvider, apiKey: selectedKey };
    }

    // 否则尝试其他提供商
    for (const provider of Object.keys(this.apiKeys) as AIProvider[]) {
      const key = this.apiKeys[provider];
      if (key) {
        return { provider, apiKey: key };
      }
    }

    return undefined;
  }

  /**
   * 检查是否有任何可用的 API Key
   */
  async hasAnyAPIKey(): Promise<boolean> {
    await this.initialize();
    return !!(this.apiKeys.gemini || this.apiKeys.deepseek);
  }

  /**
   * 获取所有 API Keys（用于显示配置状态，隐藏实际值）
   */
  async getAllAPIKeysStatus(): Promise<Record<AIProvider, boolean>> {
    await this.initialize();
    return {
      gemini: !!this.apiKeys.gemini,
      deepseek: !!this.apiKeys.deepseek,
    };
  }

  /**
   * 清除所有 API Keys
   */
  async clearAll(): Promise<void> {
    this.apiKeys = {};
    this.selectedProvider = 'gemini';

    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.API_KEYS,
        STORAGE_KEYS.SELECTED_PROVIDER,
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
    return this.modelConfigs[role] || DEFAULT_MODEL_CONFIGS[role];
  }

  /**
   * 设置指定角色的模型配置
   */
  async setRoleModelConfig(role: ModelRole, config: RoleModelConfig): Promise<void> {
    await this.initialize();
    this.modelConfigs[role] = config;

    try {
      await AsyncStorage.setItem(STORAGE_KEYS.MODEL_CONFIGS, JSON.stringify(this.modelConfigs));
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
    return { ...this.modelConfigs };
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
    };

    try {
      await AsyncStorage.setItem(STORAGE_KEYS.MODEL_CONFIGS, JSON.stringify(this.modelConfigs));
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
    
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.MODEL_CONFIGS);
      console.log('✅ [APIKeyStorage] Model configs reset to defaults');
    } catch (error) {
      console.error('❌ [APIKeyStorage] Failed to reset model configs:', error);
      throw error;
    }
  }

  /**
   * 获取指定角色的完整模型信息（包括 API Key）
   * 这是给 Agent 模块使用的主要方法
   */
  async getModelForRole(role: ModelRole): Promise<{
    provider: AIProvider;
    model: string;
    apiKey: string | undefined;
    providerConfig: AIProviderConfig;
  }> {
    await this.initialize();
    
    const roleConfig = this.modelConfigs[role];
    const apiKey = this.apiKeys[roleConfig.provider];
    const providerConfig = AI_PROVIDERS[roleConfig.provider];

    return {
      provider: roleConfig.provider,
      model: roleConfig.model,
      apiKey,
      providerConfig,
    };
  }

  /**
   * 检查指定角色是否有可用的 API Key
   */
  async hasAPIKeyForRole(role: ModelRole): Promise<boolean> {
    await this.initialize();
    const roleConfig = this.modelConfigs[role];
    return !!this.apiKeys[roleConfig.provider];
  }

  /**
   * 获取所有角色的 API Key 可用状态
   */
  async getAllRolesAPIKeyStatus(): Promise<Record<ModelRole, boolean>> {
    await this.initialize();
    return {
      executor: !!this.apiKeys[this.modelConfigs.executor.provider],
      intentRewriter: !!this.apiKeys[this.modelConfigs.intentRewriter.provider],
      reflector: !!this.apiKeys[this.modelConfigs.reflector.provider],
    };
  }
}

// 导出单例
export const apiKeyStorage = new APIKeyStorageService();
