/**
 * Agent 配置存储服务
 * 
 * 管理用户的 Agent 个性化配置，包括置信度阈值等
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@agent_config';

/**
 * Agent 配置接口
 */
export interface AgentConfig {
  /** 意图改写器置信度阈值 */
  intentRewriterConfidenceThresholds?: {
    high?: number;
    low?: number;
  };
  /** 反思器置信度阈值 */
  reflectorConfidenceThresholds?: {
    low?: number;
  };
  /** 确认策略 */
  confirmationPolicy?: {
    confirmHighRisk?: boolean;
    confirmMediumRisk?: boolean;
    batchThreshold?: number;
  };
  /** 是否启用反思模式 */
  enableReflection?: boolean;
  /** 反思频率 */
  reflectionFrequency?: 'every_step' | 'on_error' | 'on_milestone';
}

/**
 * 预设配置
 */
export const AGENT_CONFIG_PRESETS = {
  default: {
    name: '默认（推荐）',
    description: '平衡的配置，适合大多数用户',
    config: {
      intentRewriterConfidenceThresholds: { high: 0.7, low: 0.4 },
      reflectorConfidenceThresholds: { low: 0.3 },
      confirmationPolicy: { confirmHighRisk: true, confirmMediumRisk: false, batchThreshold: 5 },
      enableReflection: true,
      reflectionFrequency: 'every_step' as const,
    },
  },
  beginner: {
    name: '新手模式',
    description: '更多指导和确认，适合新用户',
    config: {
      intentRewriterConfidenceThresholds: { high: 0.8, low: 0.5 },
      reflectorConfidenceThresholds: { low: 0.5 },
      confirmationPolicy: { confirmHighRisk: true, confirmMediumRisk: true, batchThreshold: 3 },
      enableReflection: true,
      reflectionFrequency: 'every_step' as const,
    },
  },
  expert: {
    name: '专家模式',
    description: '减少询问，追求效率',
    config: {
      intentRewriterConfidenceThresholds: { high: 0.6, low: 0.3 },
      reflectorConfidenceThresholds: { low: 0.2 },
      confirmationPolicy: { confirmHighRisk: true, confirmMediumRisk: false, batchThreshold: 10 },
      enableReflection: true,
      reflectionFrequency: 'on_error' as const,
    },
  },
  automation: {
    name: '自动化模式',
    description: '最少人工介入，适合自动化任务',
    config: {
      intentRewriterConfidenceThresholds: { high: 0.5, low: 0.1 },
      reflectorConfidenceThresholds: { low: 0.1 },
      confirmationPolicy: { confirmHighRisk: false, confirmMediumRisk: false, batchThreshold: 100 },
      enableReflection: false,
      reflectionFrequency: 'on_error' as const,
    },
  },
  strict: {
    name: '严格模式',
    description: '最大限度的确认，适合关键业务',
    config: {
      intentRewriterConfidenceThresholds: { high: 0.9, low: 0.6 },
      reflectorConfidenceThresholds: { low: 0.6 },
      confirmationPolicy: { confirmHighRisk: true, confirmMediumRisk: true, batchThreshold: 2 },
      enableReflection: true,
      reflectionFrequency: 'every_step' as const,
    },
  },
};

/**
 * Agent 配置存储服务
 */
class AgentConfigStorage {
  /**
   * 获取配置
   */
  async getConfig(): Promise<AgentConfig> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (json) {
        const config = JSON.parse(json);
        console.log('📋 [AgentConfig] Loaded config:', config);
        return config;
      }
    } catch (error) {
      console.error('❌ [AgentConfig] Failed to load config:', error);
    }
    
    // 返回默认配置
    return AGENT_CONFIG_PRESETS.default.config;
  }

  /**
   * 保存配置
   */
  async saveConfig(config: AgentConfig): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      console.log('✅ [AgentConfig] Config saved:', config);
    } catch (error) {
      console.error('❌ [AgentConfig] Failed to save config:', error);
      throw error;
    }
  }

  /**
   * 重置为默认配置
   */
  async resetToDefault(): Promise<void> {
    await this.saveConfig(AGENT_CONFIG_PRESETS.default.config);
  }

  /**
   * 应用预设配置
   */
  async applyPreset(presetName: keyof typeof AGENT_CONFIG_PRESETS): Promise<void> {
    const preset = AGENT_CONFIG_PRESETS[presetName];
    if (!preset) {
      throw new Error(`Unknown preset: ${presetName}`);
    }
    await this.saveConfig(preset.config);
  }

  /**
   * 清除配置
   */
  async clearConfig(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      console.log('🗑️ [AgentConfig] Config cleared');
    } catch (error) {
      console.error('❌ [AgentConfig] Failed to clear config:', error);
      throw error;
    }
  }
}

export const agentConfigStorage = new AgentConfigStorage();
