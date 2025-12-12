/**
 * 模型工厂 - 为 Agent 模块提供便捷的模型创建方法
 * 
 * 根据配置创建不同提供商的 LLM 模型实例
 * 基于 src/agent/modelFactory.ts 的策略模式实现
 */

import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { 
  apiKeyStorage, 
  AIProvider, 
  ModelRole,
  AI_PROVIDERS,
} from "../../services/apiKeyStorage";
import { createChatModel, createChatModelWithTools } from "../modelFactory";

// 模型创建选项
export interface ModelOptions {
  /** 温度参数 */
  temperature?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 是否绑定工具 */
  bindTools?: boolean;
  /** 工具列表（当 bindTools 为 true 时使用） */
  tools?: any[];
}

// 模型信息
export interface ModelInfo {
  provider: AIProvider;
  model: string;
  apiKey: string;
  isDefault: boolean;
}

/**
 * 根据角色获取模型配置和 API Key
 */
export async function getModelInfoForRole(role: ModelRole): Promise<ModelInfo> {
  const roleConfig = await apiKeyStorage.getModelForRole(role);
  
  const apiKey = roleConfig.apiKey;

  // 如果没有配置 API Key，抛出错误
  if (!apiKey) {
    throw new Error(`请先配置 ${AI_PROVIDERS[roleConfig.provider].name} 的 API Key`);
  }

  return {
    provider: roleConfig.provider,
    model: roleConfig.model,
    apiKey,
    isDefault: false,
  };
}

/**
 * 为指定角色创建模型实例
 * 这是给 Agent 模块使用的主要方法
 */
export async function createModelForRole(
  role: ModelRole,
  options: ModelOptions = {}
): Promise<{ model: BaseChatModel; info: ModelInfo }> {
  const info = await getModelInfoForRole(role);
  const { temperature = 0, maxRetries = 2, bindTools = false, tools = [] } = options;
  
  console.log(`🏭 [ModelFactory] Creating model for ${role}:`, {
    provider: info.provider,
    model: info.model,
    isDefault: info.isDefault,
  });

  let model: BaseChatModel;

  // 使用策略模式的模型工厂创建模型
  if (bindTools && tools.length > 0) {
    model = createChatModelWithTools(
      {
        provider: info.provider,
        model: info.model,
        apiKey: info.apiKey,
        temperature,
        maxRetries,
      },
      tools
    );
  } else {
    model = createChatModel({
      provider: info.provider,
      model: info.model,
      apiKey: info.apiKey,
      temperature,
      maxRetries,
    });
  }

  return { model, info };
}

/**
 * 快速创建执行模型（带工具绑定）
 */
export async function createExecutorModel(
  tools: any[],
  options: Omit<ModelOptions, 'bindTools' | 'tools'> = {}
): Promise<{ model: BaseChatModel; info: ModelInfo }> {
  return createModelForRole('executor', {
    ...options,
    bindTools: true,
    tools,
  });
}

/**
 * 快速创建意图理解模型
 */
export async function createIntentRewriterModel(
  options: ModelOptions = {}
): Promise<{ model: BaseChatModel; info: ModelInfo }> {
  return createModelForRole('intentRewriter', options);
}

/**
 * 快速创建反思模型
 */
export async function createReflectorModel(
  options: ModelOptions = {}
): Promise<{ model: BaseChatModel; info: ModelInfo }> {
  return createModelForRole('reflector', options);
}

/**
 * 检查指定角色的模型是否可用
 */
export async function isModelAvailableForRole(role: ModelRole): Promise<boolean> {
  try {
    const info = await getModelInfoForRole(role);
    return !!info.apiKey;
  } catch {
    return false;
  }
}

/**
 * 获取所有角色的模型可用状态
 */
export async function getAllRolesModelStatus(): Promise<Record<ModelRole, {
  available: boolean;
  provider: AIProvider;
  model: string;
  isDefault: boolean;
}>> {
  const roles: ModelRole[] = ['executor', 'intentRewriter', 'reflector'];
  const status: Record<string, any> = {};

  for (const role of roles) {
    try {
      const info = await getModelInfoForRole(role);
      status[role] = {
        available: true,
        provider: info.provider,
        model: info.model,
        isDefault: info.isDefault,
      };
    } catch {
      const roleConfig = await apiKeyStorage.getRoleModelConfig(role);
      status[role] = {
        available: false,
        provider: roleConfig.provider,
        model: roleConfig.model,
        isDefault: false,
      };
    }
  }

  return status as Record<ModelRole, any>;
}
