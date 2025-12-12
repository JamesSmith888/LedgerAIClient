/**
 * 工具权限持久化服务
 * 
 * 管理用户授权的"始终允许"工具设置
 * 使用 AsyncStorage 持久化到本地
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// 存储键
const STORAGE_KEYS = {
  ALWAYS_ALLOWED_TOOLS: 'tool_permissions_always_allowed',
};

/**
 * 工具权限存储服务
 */
class ToolPermissionStorage {
  // 内存缓存
  private alwaysAllowedTools: Set<string> = new Set();
  // 是否已初始化
  private initialized: boolean = false;
  // 初始化 Promise（防止重复初始化）
  private initPromise: Promise<void> | null = null;

  /**
   * 初始化 - 从 AsyncStorage 加载数据
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  private async _doInitialize(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.ALWAYS_ALLOWED_TOOLS);
      if (stored) {
        const tools: string[] = JSON.parse(stored);
        this.alwaysAllowedTools = new Set(tools);
        console.log('📋 [ToolPermissionStorage] Loaded always allowed tools:', tools);
      }
      this.initialized = true;
    } catch (error) {
      console.error('❌ [ToolPermissionStorage] Failed to load:', error);
      this.initialized = true; // 即使失败也标记为已初始化，避免重复尝试
    }
  }

  /**
   * 保存到 AsyncStorage
   */
  private async save(): Promise<void> {
    try {
      const tools = Array.from(this.alwaysAllowedTools);
      await AsyncStorage.setItem(STORAGE_KEYS.ALWAYS_ALLOWED_TOOLS, JSON.stringify(tools));
      console.log('💾 [ToolPermissionStorage] Saved always allowed tools:', tools);
    } catch (error) {
      console.error('❌ [ToolPermissionStorage] Failed to save:', error);
    }
  }

  /**
   * 设置工具为"始终允许"
   * @param toolName 工具名称（可以是 "toolName" 或 "toolName.action" 格式）
   */
  async setAlwaysAllowed(toolName: string): Promise<void> {
    await this.initialize();
    this.alwaysAllowedTools.add(toolName);
    await this.save();
    console.log(`✅ [ToolPermissionStorage] Tool "${toolName}" set to always allowed`);
  }

  /**
   * 移除工具的"始终允许"设置
   * @param toolName 工具名称
   */
  async removeAlwaysAllowed(toolName: string): Promise<void> {
    await this.initialize();
    this.alwaysAllowedTools.delete(toolName);
    await this.save();
    console.log(`🔄 [ToolPermissionStorage] Tool "${toolName}" removed from always allowed`);
  }

  /**
   * 检查工具是否已设置为"始终允许"
   * @param toolName 工具名称
   */
  isAlwaysAllowed(toolName: string): boolean {
    // 同步检查（依赖于初始化完成）
    return this.alwaysAllowedTools.has(toolName);
  }

  /**
   * 异步检查工具是否已设置为"始终允许"
   * @param toolName 工具名称
   */
  async isAlwaysAllowedAsync(toolName: string): Promise<boolean> {
    await this.initialize();
    return this.alwaysAllowedTools.has(toolName);
  }

  /**
   * 获取所有"始终允许"的工具名称
   */
  getAllAlwaysAllowed(): string[] {
    return Array.from(this.alwaysAllowedTools);
  }

  /**
   * 异步获取所有"始终允许"的工具名称
   */
  async getAllAlwaysAllowedAsync(): Promise<string[]> {
    await this.initialize();
    return Array.from(this.alwaysAllowedTools);
  }

  /**
   * 重置所有"始终允许"设置
   */
  async resetAll(): Promise<void> {
    await this.initialize();
    this.alwaysAllowedTools.clear();
    await this.save();
    console.log('🔄 [ToolPermissionStorage] All always allowed settings cleared');
  }

  /**
   * 获取指定工具前缀的所有授权
   * 例如：getByPrefix("transaction") 返回 ["transaction.create", "transaction.delete"] 等
   */
  getByPrefix(prefix: string): string[] {
    return this.getAllAlwaysAllowed().filter(name => name.startsWith(prefix + '.'));
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// 单例导出
export const toolPermissionStorage = new ToolPermissionStorage();

// 便捷函数导出
export const initializeToolPermissions = () => toolPermissionStorage.initialize();
export const setToolAlwaysAllowedPersisted = (toolName: string) => toolPermissionStorage.setAlwaysAllowed(toolName);
export const removeToolAlwaysAllowedPersisted = (toolName: string) => toolPermissionStorage.removeAlwaysAllowed(toolName);
export const isToolAlwaysAllowedPersisted = (toolName: string) => toolPermissionStorage.isAlwaysAllowed(toolName);
export const isToolAlwaysAllowedAsyncPersisted = (toolName: string) => toolPermissionStorage.isAlwaysAllowedAsync(toolName);
export const getAllAlwaysAllowedToolsPersisted = () => toolPermissionStorage.getAllAlwaysAllowed();
export const getAllAlwaysAllowedToolsAsyncPersisted = () => toolPermissionStorage.getAllAlwaysAllowedAsync();
export const resetAllAlwaysAllowedPersisted = () => toolPermissionStorage.resetAll();
