/**
 * 用户偏好记忆服务
 * 
 * 存储 AI 学习的用户个性化偏好，例如：
 * - "青桔" -> 青桔单车（交通类），而非水果
 * - "711" -> 7-Eleven 便利店
 * - "星巴克" -> 咖啡/餐饮
 * 
 * 这些记忆会被注入到 Agent 的系统提示词中，帮助 AI 更好地理解用户意图
 * 
 * 支持本地存储和云端存储两种模式，默认使用本地存储
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dataStorageSettings } from './dataStorageSettings';
import { API_BASE_URL } from '../api/config';

// 存储键
const STORAGE_KEY = '@ledger_user_preference_memory';

/**
 * 偏好类型
 */
export type PreferenceType = 
  | 'category_mapping'    // 分类映射：如"青桔" -> "交通"
  | 'merchant_alias'      // 商户别名：如"星巴" -> "星巴克"
  | 'amount_pattern'      // 金额模式：如"早餐通常15-30元"
  | 'payment_preference'  // 支付偏好：如"网购用支付宝"
  | 'custom_correction';  // 自定义纠正

/**
 * 单条偏好记录
 */
export interface PreferenceItem {
  /** 唯一标识 */
  id: string;
  /** 偏好类型 */
  type: PreferenceType;
  /** 触发关键词 */
  keyword: string;
  /** 正确的理解/分类 */
  correction: string;
  /** 附加说明 */
  note?: string;
  /** 相关分类ID（如果适用） */
  categoryId?: number;
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
  /** 使用次数（用于排序和清理） */
  usageCount: number;
  /** 是否启用 */
  enabled: boolean;
}

/**
 * 偏好存储数据
 */
export interface PreferenceData {
  /** 版本号 */
  version: number;
  /** 所有偏好记录 */
  items: PreferenceItem[];
}

/**
 * 添加偏好的参数
 */
export interface AddPreferenceParams {
  type: PreferenceType;
  keyword: string;
  correction: string;
  note?: string;
  categoryId?: number;
}

/**
 * 生成唯一ID
 */
function generateId(): string {
  return `pref_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * 用户偏好记忆服务类
 * 
 * 支持本地存储和云端存储两种模式，根据 dataStorageSettings 自动选择
 */
class UserPreferenceMemoryService {
  private data: PreferenceData = { version: 1, items: [] };
  private initialized = false;
  private authToken: string | null = null;

  /**
   * 设置认证 Token（用于云端 API 调用）
   */
  setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  /**
   * 获取当前存储模式
   */
  private async getStorageMode(): Promise<'local' | 'cloud'> {
    try {
      const location = await dataStorageSettings.getFeatureLocation('userPreferences');
      return location;
    } catch {
      return 'local'; // 默认本地
    }
  }

  /**
   * 获取认证头
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    // 优先使用设置的 token，否则从 AsyncStorage 获取
    let token = this.authToken;
    if (!token) {
      token = await AsyncStorage.getItem('token');
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }

  /**
   * 初始化 - 根据存储模式加载数据
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const mode = await this.getStorageMode();
    console.log(`🔧 [UserPreferenceMemory] Storage mode: ${mode}`);

    if (mode === 'cloud') {
      await this.loadFromCloud();
    } else {
      await this.loadFromLocal();
    }
    
    this.initialized = true;
  }

  /**
   * 强制重新初始化（切换存储模式时使用）
   */
  async reinitialize(): Promise<void> {
    this.initialized = false;
    this.data = { version: 1, items: [] };
    await this.initialize();
  }

  /**
   * 从本地加载数据
   */
  private async loadFromLocal(): Promise<void> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (json) {
        this.data = JSON.parse(json);
      }
      console.log(`✅ [UserPreferenceMemory] Loaded ${this.data.items.length} preferences from local`);
    } catch (error) {
      console.error('❌ [UserPreferenceMemory] Failed to load from local:', error);
      this.data = { version: 1, items: [] };
    }
  }

  /**
   * 从云端加载数据
   */
  private async loadFromCloud(): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/user/preferences`, {
        method: 'GET',
        headers,
      });

      const result = await response.json() as { code: number; data?: any[]; message?: string };
      if (result.code === 200 && result.data) {
        // 转换云端格式为本地格式
        this.data = {
          version: 1,
          items: result.data.map((item: any) => this.cloudToLocal(item)),
        };
        console.log(`✅ [UserPreferenceMemory] Loaded ${this.data.items.length} preferences from cloud`);
      } else {
        console.warn('⚠️ [UserPreferenceMemory] Cloud returned no data, using empty list');
        this.data = { version: 1, items: [] };
      }
    } catch (error) {
      console.error('❌ [UserPreferenceMemory] Failed to load from cloud:', error);
      // 云端加载失败，回退到本地
      console.log('⚠️ [UserPreferenceMemory] Falling back to local storage');
      await this.loadFromLocal();
    }
  }

  /**
   * 云端格式转本地格式
   */
  private cloudToLocal(cloudItem: any): PreferenceItem {
    return {
      id: String(cloudItem.id),
      type: cloudItem.type?.toLowerCase() as PreferenceType || 'category_mapping',
      keyword: cloudItem.keyword,
      correction: cloudItem.correction,
      note: cloudItem.note,
      categoryId: cloudItem.categoryId,
      createdAt: new Date(cloudItem.createTime).getTime(),
      updatedAt: new Date(cloudItem.updateTime).getTime(),
      usageCount: cloudItem.usageCount || 1,
      enabled: cloudItem.enabled !== false,
    };
  }

  /**
   * 本地格式转云端格式
   */
  private localToCloud(item: PreferenceItem): any {
    return {
      type: item.type.toUpperCase(),
      keyword: item.keyword,
      correction: item.correction,
      note: item.note,
      categoryId: item.categoryId,
    };
  }

  /**
   * 保存数据（根据存储模式）
   */
  private async save(): Promise<void> {
    const mode = await this.getStorageMode();
    
    if (mode === 'cloud') {
      // 云端模式下也保存本地副本作为缓存
      await this.saveToLocal();
    } else {
      await this.saveToLocal();
    }
  }

  /**
   * 保存到本地
   */
  private async saveToLocal(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      console.log('✅ [UserPreferenceMemory] Saved to local');
    } catch (error) {
      console.error('❌ [UserPreferenceMemory] Failed to save to local:', error);
      throw error;
    }
  }

  /**
   * 保存到云端
   */
  private async saveToCloud(item: PreferenceItem): Promise<PreferenceItem | null> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/user/preferences`, {
        method: 'POST',
        headers,
        body: JSON.stringify(this.localToCloud(item)),
      });

      const result = await response.json() as { code: number; data?: any; message?: string };
      if (result.code === 200 && result.data) {
        console.log('✅ [UserPreferenceMemory] Saved to cloud');
        return this.cloudToLocal(result.data);
      } else {
        console.error('❌ [UserPreferenceMemory] Cloud save failed:', result.message);
        return null;
      }
    } catch (error) {
      console.error('❌ [UserPreferenceMemory] Failed to save to cloud:', error);
      return null;
    }
  }

  /**
   * 添加新的偏好记录
   */
  async addPreference(params: AddPreferenceParams): Promise<PreferenceItem> {
    await this.initialize();

    const mode = await this.getStorageMode();

    // 检查是否已存在相同关键词的记录
    const existing = this.data.items.find(
      item => item.keyword.toLowerCase() === params.keyword.toLowerCase() && item.type === params.type
    );

    if (existing) {
      // 更新现有记录
      existing.correction = params.correction;
      existing.note = params.note;
      existing.categoryId = params.categoryId;
      existing.updatedAt = Date.now();
      existing.usageCount += 1;
      
      if (mode === 'cloud') {
        // 云端模式：调用 API 更新
        const cloudResult = await this.saveToCloud(existing);
        if (cloudResult) {
          // 更新本地 ID 为云端 ID
          const idx = this.data.items.findIndex(i => i.id === existing.id);
          if (idx !== -1) {
            this.data.items[idx] = cloudResult;
          }
        }
      }
      
      await this.save();
      console.log(`✅ [UserPreferenceMemory] Updated: "${params.keyword}" -> "${params.correction}"`);
      return existing;
    }

    // 创建新记录
    const newItem: PreferenceItem = {
      id: generateId(),
      type: params.type,
      keyword: params.keyword,
      correction: params.correction,
      note: params.note,
      categoryId: params.categoryId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      usageCount: 1,
      enabled: true,
    };

    if (mode === 'cloud') {
      // 云端模式：先保存到云端获取真实 ID
      const cloudResult = await this.saveToCloud(newItem);
      if (cloudResult) {
        this.data.items.push(cloudResult);
        await this.save();
        console.log(`✅ [UserPreferenceMemory] Added to cloud: "${params.keyword}" -> "${params.correction}"`);
        return cloudResult;
      }
      // 云端保存失败，回退到本地
      console.warn('⚠️ [UserPreferenceMemory] Cloud save failed, saving locally');
    }

    this.data.items.push(newItem);
    await this.save();
    console.log(`✅ [UserPreferenceMemory] Added: "${params.keyword}" -> "${params.correction}"`);
    return newItem;
  }

  /**
   * 快捷方法：添加分类映射
   * 例如：learnCategoryMapping("青桔", "交通", "青桔单车")
   */
  async learnCategoryMapping(keyword: string, category: string, note?: string, categoryId?: number): Promise<PreferenceItem> {
    return this.addPreference({
      type: 'category_mapping',
      keyword,
      correction: category,
      note,
      categoryId,
    });
  }

  /**
   * 快捷方法：添加商户别名
   * 例如：learnMerchantAlias("星巴", "星巴克")
   */
  async learnMerchantAlias(alias: string, fullName: string): Promise<PreferenceItem> {
    return this.addPreference({
      type: 'merchant_alias',
      keyword: alias,
      correction: fullName,
    });
  }

  /**
   * 快捷方法：添加自定义纠正
   * 例如：learnCustomCorrection("买菜", "这是生活日用，不是餐饮")
   */
  async learnCustomCorrection(keyword: string, correction: string, note?: string): Promise<PreferenceItem> {
    return this.addPreference({
      type: 'custom_correction',
      keyword,
      correction,
      note,
    });
  }

  /**
   * 获取所有启用的偏好记录
   */
  async getActivePreferences(): Promise<PreferenceItem[]> {
    await this.initialize();
    return this.data.items.filter(item => item.enabled);
  }

  /**
   * 获取所有偏好记录
   */
  async getAllPreferences(): Promise<PreferenceItem[]> {
    await this.initialize();
    return [...this.data.items];
  }

  /**
   * 按类型获取偏好记录
   */
  async getPreferencesByType(type: PreferenceType): Promise<PreferenceItem[]> {
    await this.initialize();
    return this.data.items.filter(item => item.type === type && item.enabled);
  }

  /**
   * 查找关键词对应的偏好
   */
  async findPreference(keyword: string, type?: PreferenceType): Promise<PreferenceItem | undefined> {
    await this.initialize();
    const lowerKeyword = keyword.toLowerCase();
    return this.data.items.find(item => {
      const keywordMatch = item.keyword.toLowerCase() === lowerKeyword;
      const typeMatch = type ? item.type === type : true;
      return keywordMatch && typeMatch && item.enabled;
    });
  }

  /**
   * 更新偏好记录
   */
  async updatePreference(id: string, updates: Partial<Omit<PreferenceItem, 'id' | 'createdAt'>>): Promise<PreferenceItem | undefined> {
    await this.initialize();
    const item = this.data.items.find(i => i.id === id);
    if (!item) return undefined;

    Object.assign(item, updates, { updatedAt: Date.now() });
    await this.save();
    return item;
  }

  /**
   * 删除偏好记录
   */
  async deletePreference(id: string): Promise<boolean> {
    await this.initialize();
    const index = this.data.items.findIndex(i => i.id === id);
    if (index === -1) return false;

    const mode = await this.getStorageMode();
    
    if (mode === 'cloud') {
      // 云端模式：调用 API 删除
      try {
        const headers = await this.getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/api/user/preferences/${id}`, {
          method: 'DELETE',
          headers,
        });
        const result = await response.json() as { code: number };
        if (result.code !== 200) {
          console.warn('⚠️ [UserPreferenceMemory] Cloud delete failed, removing locally');
        }
      } catch (error) {
        console.error('❌ [UserPreferenceMemory] Cloud delete error:', error);
      }
    }

    this.data.items.splice(index, 1);
    await this.save();
    return true;
  }

  /**
   * 启用/禁用偏好记录
   */
  async togglePreference(id: string, enabled: boolean): Promise<void> {
    await this.initialize();
    const item = this.data.items.find(i => i.id === id);
    if (item) {
      item.enabled = enabled;
      item.updatedAt = Date.now();
      
      const mode = await this.getStorageMode();
      if (mode === 'cloud') {
        // 云端模式：调用 API 更新
        try {
          const headers = await this.getAuthHeaders();
          await fetch(`${API_BASE_URL}/api/user/preferences/${id}/toggle?enabled=${enabled}`, {
            method: 'PUT',
            headers,
          });
        } catch (error) {
          console.error('❌ [UserPreferenceMemory] Cloud toggle error:', error);
        }
      }
      
      await this.save();
    }
  }

  /**
   * 增加使用次数
   */
  async incrementUsage(id: string): Promise<void> {
    await this.initialize();
    const item = this.data.items.find(i => i.id === id);
    if (item) {
      item.usageCount += 1;
      item.updatedAt = Date.now();
      
      const mode = await this.getStorageMode();
      if (mode === 'cloud') {
        // 云端模式：调用 API 更新
        try {
          const headers = await this.getAuthHeaders();
          await fetch(`${API_BASE_URL}/api/user/preferences/${id}/usage`, {
            method: 'POST',
            headers,
          });
        } catch (error) {
          console.error('❌ [UserPreferenceMemory] Cloud usage increment error:', error);
        }
      }
      
      await this.save();
    }
  }

  /**
   * 生成用于注入 System Prompt 的偏好描述文本
   */
  async generatePromptContext(): Promise<string> {
    await this.initialize();
    
    const activeItems = this.data.items.filter(item => item.enabled);
    if (activeItems.length === 0) {
      return '';
    }

    // 按类型分组
    const categoryMappings = activeItems.filter(i => i.type === 'category_mapping');
    const merchantAliases = activeItems.filter(i => i.type === 'merchant_alias');
    const customCorrections = activeItems.filter(i => i.type === 'custom_correction');

    const lines: string[] = [];
    lines.push('## 用户个性化偏好');
    lines.push('以下是用户之前的纠正和偏好，请在处理时参考：');
    lines.push('');

    if (categoryMappings.length > 0) {
      lines.push('### 分类映射');
      for (const item of categoryMappings.slice(0, 20)) { // 限制数量
        const noteText = item.note ? ` (${item.note})` : '';
        lines.push(`- "${item.keyword}" → 分类为"${item.correction}"${noteText}`);
      }
      lines.push('');
    }

    if (merchantAliases.length > 0) {
      lines.push('### 商户别名');
      for (const item of merchantAliases.slice(0, 20)) {
        lines.push(`- "${item.keyword}" = "${item.correction}"`);
      }
      lines.push('');
    }

    if (customCorrections.length > 0) {
      lines.push('### 其他偏好');
      for (const item of customCorrections.slice(0, 10)) {
        lines.push(`- ${item.keyword}：${item.correction}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<{ total: number; enabled: number; byType: Record<PreferenceType, number> }> {
    await this.initialize();
    const byType: Record<PreferenceType, number> = {
      category_mapping: 0,
      merchant_alias: 0,
      amount_pattern: 0,
      payment_preference: 0,
      custom_correction: 0,
    };

    for (const item of this.data.items) {
      byType[item.type] = (byType[item.type] || 0) + 1;
    }

    return {
      total: this.data.items.length,
      enabled: this.data.items.filter(i => i.enabled).length,
      byType,
    };
  }

  /**
   * 清空所有偏好
   */
  async clearAll(): Promise<void> {
    const mode = await this.getStorageMode();
    
    if (mode === 'cloud') {
      // 云端模式：调用 API 删除所有
      try {
        const headers = await this.getAuthHeaders();
        await fetch(`${API_BASE_URL}/api/user/preferences/all`, {
          method: 'DELETE',
          headers,
        });
      } catch (error) {
        console.error('❌ [UserPreferenceMemory] Cloud clear all error:', error);
      }
    }
    
    this.data = { version: 1, items: [] };
    await this.save();
    console.log('✅ [UserPreferenceMemory] Cleared all preferences');
  }

  /**
   * 同步本地数据到云端
   */
  async syncToCloud(): Promise<boolean> {
    await this.initialize();
    
    if (this.data.items.length === 0) {
      console.log('ℹ️ [UserPreferenceMemory] No data to sync');
      return true;
    }

    try {
      const headers = await this.getAuthHeaders();
      const syncData = {
        preferences: this.data.items.map(item => this.localToCloud(item)),
      };
      
      const response = await fetch(`${API_BASE_URL}/api/user/preferences/sync`, {
        method: 'POST',
        headers,
        body: JSON.stringify(syncData),
      });

      const result = await response.json() as { code: number; data?: any[] };
      if (result.code === 200 && result.data) {
        // 更新本地数据为云端返回的数据（包含真实 ID）
        this.data = {
          version: 1,
          items: result.data.map((item: any) => this.cloudToLocal(item)),
        };
        await this.saveToLocal();
        console.log(`✅ [UserPreferenceMemory] Synced ${result.data.length} preferences to cloud`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ [UserPreferenceMemory] Sync to cloud failed:', error);
      return false;
    }
  }

  /**
   * 从云端同步数据到本地
   */
  async syncFromCloud(): Promise<boolean> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/user/preferences`, {
        method: 'GET',
        headers,
      });

      const result = await response.json() as { code: number; data?: any[] };
      if (result.code === 200 && result.data) {
        this.data = {
          version: 1,
          items: result.data.map((item: any) => this.cloudToLocal(item)),
        };
        await this.saveToLocal();
        console.log(`✅ [UserPreferenceMemory] Synced ${result.data.length} preferences from cloud`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ [UserPreferenceMemory] Sync from cloud failed:', error);
      return false;
    }
  }

  /**
   * 获取当前存储模式
   */
  async getCurrentStorageMode(): Promise<'local' | 'cloud'> {
    return this.getStorageMode();
  }

  /**
   * 导出数据（用于备份）
   */
  async exportData(): Promise<PreferenceData> {
    await this.initialize();
    return { ...this.data };
  }

  /**
   * 导入数据（用于恢复）
   */
  async importData(data: PreferenceData): Promise<void> {
    this.data = data;
    await this.save();
    console.log(`✅ [UserPreferenceMemory] Imported ${data.items.length} preferences`);
  }
}

// 导出单例
export const userPreferenceMemory = new UserPreferenceMemoryService();
