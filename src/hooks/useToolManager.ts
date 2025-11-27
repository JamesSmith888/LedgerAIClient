/**
 * useToolManager Hook
 * 
 * 管理 AI Agent 的工具启用/禁用状态
 * 支持持久化存储用户的工具偏好设置
 * 支持"始终允许"状态管理
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ToolMeta, ALL_TOOLS_META, ToolCategory, groupToolsByCategory } from '../types/tool';
import { 
  isToolAlwaysAllowed, 
  setToolAlwaysAllowed, 
  removeToolAlwaysAllowed,
  getAllAlwaysAllowedTools,
} from '../agent/utils/permissions';

const STORAGE_KEY = 'agent_tool_settings';

interface ToolSettings {
  enabledTools: string[];  // 启用的工具名称列表
  version: number;         // 设置版本，用于迁移
}

/**
 * 工具管理 Hook
 */
export function useToolManager() {
  // 调试日志
  console.log('🔧 [useToolManager] Initializing, ALL_TOOLS_META count:', ALL_TOOLS_META?.length);
  
  // 工具列表状态
  const [tools, setTools] = useState<ToolMeta[]>(() => {
    // 初始化时，所有工具都启用
    const initialTools = ALL_TOOLS_META.map(tool => ({ ...tool }));
    console.log('🔧 [useToolManager] Initial tools:', initialTools.length, initialTools.map(t => t.name));
    return initialTools;
  });
  
  // 是否已加载
  const [isLoaded, setIsLoaded] = useState(false);

  /**
   * 从存储加载工具设置
   */
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        const alwaysAllowedTools = getAllAlwaysAllowedTools();
        
        if (stored) {
          const settings: ToolSettings = JSON.parse(stored);
          
          // 应用存储的设置，同时同步"始终允许"状态
          setTools(prev => prev.map(tool => ({
            ...tool,
            // 核心工具始终启用，其他工具根据存储设置
            isEnabled: tool.isCore || settings.enabledTools.includes(tool.name),
            // 同步"始终允许"状态
            isAlwaysAllowed: alwaysAllowedTools.includes(tool.name),
          })));
          
          console.log('📋 [useToolManager] Loaded tool settings:', settings.enabledTools.length, 'tools enabled');
        } else {
          // 即使没有存储设置，也要同步"始终允许"状态
          setTools(prev => prev.map(tool => ({
            ...tool,
            isAlwaysAllowed: alwaysAllowedTools.includes(tool.name),
          })));
        }
      } catch (error) {
        console.error('❌ [useToolManager] Failed to load settings:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    
    loadSettings();
  }, []);

  /**
   * 保存工具设置到存储
   */
  const saveSettings = useCallback(async (toolList: ToolMeta[]) => {
    try {
      const settings: ToolSettings = {
        enabledTools: toolList.filter(t => t.isEnabled).map(t => t.name),
        version: 1,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      console.log('💾 [useToolManager] Saved tool settings');
    } catch (error) {
      console.error('❌ [useToolManager] Failed to save settings:', error);
    }
  }, []);

  /**
   * 切换单个工具的启用状态
   */
  const toggleTool = useCallback((toolName: string) => {
    setTools(prev => {
      const updated = prev.map(tool => {
        if (tool.name === toolName) {
          // 核心工具不能禁用
          if (tool.isCore) {
            console.log('⚠️ [useToolManager] Cannot disable core tool:', toolName);
            return tool;
          }
          return { ...tool, isEnabled: !tool.isEnabled };
        }
        return tool;
      });
      
      // 异步保存
      saveSettings(updated);
      
      return updated;
    });
  }, [saveSettings]);

  /**
   * 设置工具启用状态
   */
  const setToolEnabled = useCallback((toolName: string, enabled: boolean) => {
    setTools(prev => {
      const updated = prev.map(tool => {
        if (tool.name === toolName) {
          // 核心工具始终启用
          if (tool.isCore && !enabled) {
            return tool;
          }
          return { ...tool, isEnabled: enabled };
        }
        return tool;
      });
      
      saveSettings(updated);
      return updated;
    });
  }, [saveSettings]);

  /**
   * 启用/禁用整个分类的工具
   */
  const toggleCategory = useCallback((category: ToolCategory, enabled: boolean) => {
    setTools(prev => {
      const updated = prev.map(tool => {
        if (tool.category === category) {
          // 核心工具始终启用
          if (tool.isCore && !enabled) {
            return tool;
          }
          return { ...tool, isEnabled: enabled };
        }
        return tool;
      });
      
      saveSettings(updated);
      return updated;
    });
  }, [saveSettings]);

  /**
   * 重置所有工具为默认状态
   */
  const resetToDefault = useCallback(() => {
    const defaultTools = ALL_TOOLS_META.map(tool => ({ 
      ...tool, 
      isEnabled: true,
      isAlwaysAllowed: false, 
    }));
    setTools(defaultTools);
    saveSettings(defaultTools);
    
    // 同时清除所有"始终允许"设置
    const alwaysAllowedTools = getAllAlwaysAllowedTools();
    alwaysAllowedTools.forEach(toolName => {
      removeToolAlwaysAllowed(toolName);
    });
    
    console.log('🔄 [useToolManager] Reset all tools to default');
  }, [saveSettings]);

  /**
   * 切换工具的"始终允许"状态
   * @param toolName 工具名称
   * @param allowed 是否始终允许
   */
  const toggleAlwaysAllowed = useCallback((toolName: string, allowed: boolean) => {
    if (allowed) {
      setToolAlwaysAllowed(toolName);
    } else {
      removeToolAlwaysAllowed(toolName);
    }
    
    // 更新本地状态
    setTools(prev => prev.map(tool => {
      if (tool.name === toolName) {
        return { ...tool, isAlwaysAllowed: allowed };
      }
      return tool;
    }));
    
    console.log(`🔐 [useToolManager] Tool "${toolName}" always allowed: ${allowed}`);
  }, []);

  /**
   * 刷新"始终允许"状态
   * 用于同步来自其他地方的状态变更
   */
  const refreshAlwaysAllowedStatus = useCallback(() => {
    const alwaysAllowedTools = getAllAlwaysAllowedTools();
    setTools(prev => prev.map(tool => ({
      ...tool,
      isAlwaysAllowed: alwaysAllowedTools.includes(tool.name),
    })));
  }, []);

  /**
   * 获取启用的工具名称列表
   */
  const enabledToolNames = useMemo(() => {
    return tools.filter(t => t.isEnabled).map(t => t.name);
  }, [tools]);

  /**
   * 按分类分组的工具
   */
  const toolsByCategory = useMemo(() => {
    const result = groupToolsByCategory(tools);
    console.log('🔧 [useToolManager] toolsByCategory computed:', {
      context: result.context?.length || 0,
      api: result.api?.length || 0,
      transaction: result.transaction?.length || 0,
      render: result.render?.length || 0,
    });
    return result;
  }, [tools]);

  /**
   * 统计信息
   */
  const stats = useMemo(() => {
    const enabled = tools.filter(t => t.isEnabled).length;
    const total = tools.length;
    const core = tools.filter(t => t.isCore).length;
    
    return {
      enabled,
      total,
      core,
      optional: total - core,
      enabledOptional: enabled - core,
    };
  }, [tools]);

  return {
    tools,
    toolsByCategory,
    enabledToolNames,
    stats,
    isLoaded,
    toggleTool,
    setToolEnabled,
    toggleCategory,
    resetToDefault,
    toggleAlwaysAllowed,
    refreshAlwaysAllowedStatus,
  };
}
