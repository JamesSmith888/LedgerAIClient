/**
 * 数据存储配置服务
 * 
 * 管理用户数据的存储位置偏好（云端/本地）
 * 支持全局开关和细粒度功能级别配置
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// 存储键
const STORAGE_KEY = '@ledger_data_storage_settings';

/**
 * 数据功能类型
 * 定义所有可以独立配置存储位置的功能模块
 */
export type DataFeatureType = 
  | 'transactions'      // 交易记录
  | 'ledgers'          // 账本数据
  | 'categories'       // 分类数据
  | 'paymentMethods'   // 支付方式
  | 'userPreferences'  // 用户偏好记忆（如：青桔=单车）
  | 'conversations';   // AI 对话历史

/**
 * 存储位置类型
 */
export type StorageLocation = 'local' | 'cloud';

/**
 * 功能配置详情
 */
export interface FeatureStorageConfig {
  /** 存储位置 */
  location: StorageLocation;
  /** 最后同步时间（仅云端模式有效） */
  lastSyncAt?: number;
  /** 是否启用自动同步 */
  autoSync?: boolean;
}

/**
 * 功能元数据（用于UI展示）
 */
export interface FeatureMetadata {
  id: DataFeatureType;
  name: string;
  description: string;
  icon: string;
  /** 是否支持云端存储（有些功能可能暂不支持） */
  cloudSupported: boolean;
  /** 默认存储位置 */
  defaultLocation: StorageLocation;
}

/**
 * 所有功能的配置
 */
export type AllFeatureConfigs = Record<DataFeatureType, FeatureStorageConfig>;

/**
 * 完整的存储设置
 */
export interface DataStorageSettings {
  /** 全局默认存储位置 */
  globalDefault: StorageLocation;
  /** 各功能的独立配置 */
  features: AllFeatureConfigs;
  /** 配置版本（用于迁移） */
  version: number;
}

/**
 * 功能元数据定义
 */
export const FEATURE_METADATA: Record<DataFeatureType, FeatureMetadata> = {
  transactions: {
    id: 'transactions',
    name: '交易记录',
    description: '收入、支出等交易数据',
    icon: '💰',
    cloudSupported: true,  // 已有后端API支持
    defaultLocation: 'cloud',
  },
  ledgers: {
    id: 'ledgers',
    name: '账本数据',
    description: '账本名称、描述等信息',
    icon: '📒',
    cloudSupported: true,  // 已有后端API支持
    defaultLocation: 'cloud',
  },
  categories: {
    id: 'categories',
    name: '分类数据',
    description: '收支分类配置',
    icon: '🏷️',
    cloudSupported: true,  // 已有后端API支持
    defaultLocation: 'cloud',
  },
  paymentMethods: {
    id: 'paymentMethods',
    name: '支付方式',
    description: '银行卡、支付宝等',
    icon: '💳',
    cloudSupported: true,  // 已有后端API支持
    defaultLocation: 'cloud',
  },
  userPreferences: {
    id: 'userPreferences',
    name: '智能记忆',
    description: 'AI 学习的个性化偏好（如：青桔=单车）',
    icon: '🧠',
    cloudSupported: true,  // 已支持云端存储
    defaultLocation: 'local',  // 默认使用本地存储
  },
  conversations: {
    id: 'conversations',
    name: 'AI 对话历史',
    description: '与 AI 助手的聊天记录',
    icon: '💬',
    cloudSupported: false,  // 目前只支持本地
    defaultLocation: 'local',
  },
};

/**
 * 默认配置
 */
const DEFAULT_SETTINGS: DataStorageSettings = {
  globalDefault: 'cloud',
  version: 1,
  features: {
    transactions: { location: 'cloud', autoSync: true },
    ledgers: { location: 'cloud', autoSync: true },
    categories: { location: 'cloud', autoSync: true },
    paymentMethods: { location: 'cloud', autoSync: true },
    userPreferences: { location: 'local' },
    conversations: { location: 'local' },
  },
};

/**
 * 数据存储配置服务类
 */
class DataStorageSettingsService {
  private settings: DataStorageSettings = { ...DEFAULT_SETTINGS };
  private initialized = false;

  /**
   * 初始化 - 从 AsyncStorage 加载配置
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (json) {
        const saved = JSON.parse(json) as DataStorageSettings;
        // 合并配置（保留新增的功能默认值）
        this.settings = {
          ...DEFAULT_SETTINGS,
          ...saved,
          features: {
            ...DEFAULT_SETTINGS.features,
            ...saved.features,
          },
        };
      }
      this.initialized = true;
      console.log('✅ [DataStorageSettings] Initialized:', this.settings);
    } catch (error) {
      console.error('❌ [DataStorageSettings] Failed to initialize:', error);
      this.settings = { ...DEFAULT_SETTINGS };
      this.initialized = true;
    }
  }

  /**
   * 保存配置到 AsyncStorage
   */
  private async save(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
      console.log('✅ [DataStorageSettings] Saved');
    } catch (error) {
      console.error('❌ [DataStorageSettings] Failed to save:', error);
      throw error;
    }
  }

  /**
   * 获取全部配置
   */
  async getAll(): Promise<DataStorageSettings> {
    await this.initialize();
    return { ...this.settings };
  }

  /**
   * 获取全局默认存储位置
   */
  async getGlobalDefault(): Promise<StorageLocation> {
    await this.initialize();
    return this.settings.globalDefault;
  }

  /**
   * 设置全局默认存储位置
   * @param applyToAll 是否同时应用到所有功能
   */
  async setGlobalDefault(location: StorageLocation, applyToAll = false): Promise<void> {
    await this.initialize();
    this.settings.globalDefault = location;

    if (applyToAll) {
      // 只应用到支持该存储位置的功能
      for (const featureId of Object.keys(this.settings.features) as DataFeatureType[]) {
        const metadata = FEATURE_METADATA[featureId];
        if (location === 'cloud' && !metadata.cloudSupported) {
          // 云端不支持的功能保持本地
          continue;
        }
        this.settings.features[featureId].location = location;
      }
    }

    await this.save();
  }

  /**
   * 获取指定功能的存储配置
   */
  async getFeatureConfig(feature: DataFeatureType): Promise<FeatureStorageConfig> {
    await this.initialize();
    return { ...this.settings.features[feature] };
  }

  /**
   * 获取指定功能的存储位置
   */
  async getFeatureLocation(feature: DataFeatureType): Promise<StorageLocation> {
    await this.initialize();
    return this.settings.features[feature].location;
  }

  /**
   * 设置指定功能的存储配置
   */
  async setFeatureConfig(feature: DataFeatureType, config: Partial<FeatureStorageConfig>): Promise<void> {
    await this.initialize();

    // 检查云端支持
    if (config.location === 'cloud' && !FEATURE_METADATA[feature].cloudSupported) {
      throw new Error(`功能 "${FEATURE_METADATA[feature].name}" 暂不支持云端存储`);
    }

    this.settings.features[feature] = {
      ...this.settings.features[feature],
      ...config,
    };

    await this.save();
  }

  /**
   * 检查功能是否使用云端存储
   */
  async isCloudEnabled(feature: DataFeatureType): Promise<boolean> {
    await this.initialize();
    return this.settings.features[feature].location === 'cloud';
  }

  /**
   * 检查功能是否使用本地存储
   */
  async isLocalEnabled(feature: DataFeatureType): Promise<boolean> {
    await this.initialize();
    return this.settings.features[feature].location === 'local';
  }

  /**
   * 更新同步时间
   */
  async updateSyncTime(feature: DataFeatureType): Promise<void> {
    await this.initialize();
    this.settings.features[feature].lastSyncAt = Date.now();
    await this.save();
  }

  /**
   * 获取所有功能的元数据列表
   */
  getFeatureMetadataList(): FeatureMetadata[] {
    return Object.values(FEATURE_METADATA);
  }

  /**
   * 重置为默认配置
   */
  async reset(): Promise<void> {
    this.settings = { ...DEFAULT_SETTINGS };
    await this.save();
    console.log('✅ [DataStorageSettings] Reset to defaults');
  }
}

// 导出单例
export const dataStorageSettings = new DataStorageSettingsService();
