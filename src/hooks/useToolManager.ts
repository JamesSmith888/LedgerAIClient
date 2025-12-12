/**
 * useToolManager Hook
 * 
 * 管理 AI Agent 的工具启用/禁用状态
 * 支持持久化存储用户的工具偏好设置
 * 支持"始终允许"状态管理
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  ToolMeta, 
  ALL_TOOLS_META, 
  ToolCategory, 
  groupToolsByCategory,
  getToolActions,
} from '../types/tool';
import { toolPermissionStorage } from '../services/toolPermissionStorage';

const STORAGE_KEY = 'agent_tool_settings';

interface ToolSettings {
  enabledTools: string[];  // 启用的工具名称列表
  version: number;         // 设置版本，用于迁移
}

/**
 * 工具管理 Hook
 */
export function useToolManager() {
  // 工具列表状态
  const [tools, setTools] = useState<ToolMeta[]>(() => {
    return ALL_TOOLS_META.map(tool => ({ ...tool }));
  });
  
  // 是否已加载
  const [isLoaded, setIsLoaded] = useState(false);

  /**
   * 从存储加载工具设置
   */
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // 初始化权限存储
        await toolPermissionStorage.initialize();
        
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        
        // 获取已授权的工具（从持久化存储）
        const alwaysAllowedTools = toolPermissionStorage.getAllAlwaysAllowed();
        
        if (stored) {
          const settings: ToolSettings = JSON.parse(stored);
          
          // 应用存储的设置，同时同步"始终允许"状态
          setTools(prev => prev.map(tool => {
            const isAlwaysAllowed = alwaysAllowedTools.includes(tool.name) ||
              (tool.actions?.some(action => 
                alwaysAllowedTools.includes(`${tool.name}.${action.name}`)
              ) ?? false);
            
            return {
              ...tool,
              isEnabled: tool.isCore || settings.enabledTools.includes(tool.name),
              isAlwaysAllowed,
              actions: tool.actions?.map(action => ({
                ...action,
                isAlwaysAllowed: alwaysAllowedTools.includes(`${tool.name}.${action.name}`),
              })),
            };
          }));
        } else {
          // 同步"始终允许"状态
          setTools(prev => prev.map(tool => {
            const isAlwaysAllowed = alwaysAllowedTools.includes(tool.name) ||
              (tool.actions?.some(action => 
                alwaysAllowedTools.includes(`${tool.name}.${action.name}`)
              ) ?? false);
            
            return {
              ...tool,
              isAlwaysAllowed,
              actions: tool.actions?.map(action => ({
                ...action,
                isAlwaysAllowed: alwaysAllowedTools.includes(`${tool.name}.${action.name}`),
              })),
            };
          }));
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
          if (tool.isCore) return tool; // 核心工具不能禁用
          return { ...tool, isEnabled: !tool.isEnabled };
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
          if (tool.isCore && !enabled) return tool;
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
  const resetToDefault = useCallback(async () => {
    const defaultTools = ALL_TOOLS_META.map(tool => ({ 
      ...tool, 
      isEnabled: true,
      isAlwaysAllowed: false,
      actions: tool.actions?.map(action => ({
        ...action,
        isAlwaysAllowed: false,
      })),
    }));
    setTools(defaultTools);
    saveSettings(defaultTools);
    await toolPermissionStorage.resetAll();
  }, [saveSettings]);

  /**
   * 切换工具的"始终允许"状态
   * @param toolName 工具名称（可以是 "toolName" 或 "toolName.action" 格式）
   * @param allowed 是否始终允许
   */
  const toggleAlwaysAllowed = useCallback(async (toolName: string, allowed: boolean) => {
    // 持久化到存储
    if (allowed) {
      await toolPermissionStorage.setAlwaysAllowed(toolName);
    } else {
      await toolPermissionStorage.removeAlwaysAllowed(toolName);
    }
    
    const parts = toolName.split('.');
    const isSubAction = parts.length === 2;
    
    setTools(prev => prev.map(tool => {
      if (isSubAction) {
        if (tool.name === parts[0] && tool.actions) {
          const updatedActions = tool.actions.map(action => {
            if (action.name === parts[1]) {
              return { ...action, isAlwaysAllowed: allowed };
            }
            return action;
          });
          const allActionsAllowed = updatedActions.every(a => a.isAlwaysAllowed);
          return { ...tool, actions: updatedActions, isAlwaysAllowed: allActionsAllowed };
        }
      } else {
        if (tool.name === toolName) {
          const updatedActions = tool.actions?.map(action => ({
            ...action,
            isAlwaysAllowed: allowed,
          }));
          if (!allowed && tool.actions) {
            tool.actions.forEach(action => {
              toolPermissionStorage.removeAlwaysAllowed(`${tool.name}.${action.name}`);
            });
          }
          return { ...tool, isAlwaysAllowed: allowed, actions: updatedActions };
        }
      }
      return tool;
    }));
  }, []);

  /**
   * 刷新"始终允许"状态
   */
  const refreshAlwaysAllowedStatus = useCallback(async () => {
    await toolPermissionStorage.initialize();
    const alwaysAllowedTools = toolPermissionStorage.getAllAlwaysAllowed();
    
    setTools(prev => prev.map(tool => {
      const isAlwaysAllowed = alwaysAllowedTools.includes(tool.name) ||
        (tool.actions?.some(action => 
          alwaysAllowedTools.includes(`${tool.name}.${action.name}`)
        ) ?? false);
      
      return {
        ...tool,
        isAlwaysAllowed,
        actions: tool.actions?.map(action => ({
          ...action,
          isAlwaysAllowed: alwaysAllowedTools.includes(`${tool.name}.${action.name}`),
        })),
      };
    }));
  }, []);

  // 启用的工具名称列表
  const enabledToolNames = useMemo(() => {
    return tools.filter(t => t.isEnabled).map(t => t.name);
  }, [tools]);

  // 按分类分组的工具
  const toolsByCategory = useMemo(() => {
    return groupToolsByCategory(tools);
  }, [tools]);

  // 统计信息
  const stats = useMemo(() => {
    const enabled = tools.filter(t => t.isEnabled).length;
    const total = tools.length;
    const core = tools.filter(t => t.isCore).length;
    const authorized = tools.filter(t => t.isAlwaysAllowed).length;
    
    return {
      enabled,
      total,
      core,
      optional: total - core,
      enabledOptional: enabled - core,
      authorized,
    };
  }, [tools]);

  return {
    tools,
    toolsByCategory,
    enabledToolNames,
    stats,
    isLoaded,
    toggleTool,
    toggleCategory,
    resetToDefault,
    toggleAlwaysAllowed,
    refreshAlwaysAllowedStatus,
    getToolActions,
  };
}
