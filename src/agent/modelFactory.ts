/**
 * Chat Model Factory - 模型工厂
 * 
 * 使用策略模式动态创建不同 AI 提供商的聊天模型
 * 支持扩展新的提供商，无需修改现有代码
 * 
 * 设计原则：
 * 1. 开闭原则 - 对扩展开放，对修改关闭
 * 2. 策略模式 - 封装不同提供商的实现细节
 * 3. 工厂模式 - 统一创建入口
 */

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { StructuredToolInterface } from "@langchain/core/tools";
import { AIProvider, AI_PROVIDERS, AIProviderConfig } from "../services/apiKeyStorage";

// ============ 动态模型列表获取 ============

/**
 * 模型信息
 */
export interface ModelInfo {
    id: string;
    name: string;
    description?: string;
    contextWindow?: number;
    supportsVision?: boolean;
    supportsTools?: boolean;
}

/**
 * 动态获取模型列表的结果
 */
export interface FetchModelsResult {
    success: boolean;
    models: ModelInfo[];
    error?: string;
    /** 是否使用了缓存 */
    cached?: boolean;
}

// 模型列表缓存
const modelListCache = new Map<string, { models: ModelInfo[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟缓存

/**
 * 动态获取 Gemini 支持的模型列表
 * 
 * API 文档: https://ai.google.dev/api/models
 */
async function fetchGeminiModels(apiKey: string): Promise<FetchModelsResult> {
    const cacheKey = `gemini-${apiKey.slice(-8)}`;
    const cached = modelListCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return { success: true, models: cached.models, cached: true };
    }

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
            {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }
        );

        if (!response.ok) {
            const error = await response.text();
            return {
                success: false,
                models: [],
                error: `API 请求失败 (${response.status}): ${error}`
            };
        }

        const data = await response.json() as { models?: any[] };

        // 解析 Gemini 模型列表
        // 文档参考: https://ai.google.dev/api/models#Model
        const models: ModelInfo[] = (data.models || [])
            .filter((m: any) => {
                // 只保留支持 generateContent 的模型（聊天模型）
                const supportedMethods = m.supportedGenerationMethods || [];
                return supportedMethods.includes('generateContent');
            })
            .map((m: any) => ({
                id: m.name?.replace('models/', '') || m.name,
                name: m.displayName || m.name?.replace('models/', ''),
                description: m.description,
                contextWindow: m.inputTokenLimit,
                supportsVision: m.supportedGenerationMethods?.includes('generateContent') &&
                    m.name?.includes('vision'),
                supportsTools: true, // Gemini 模型通常都支持 function calling
            }))
            // 按名称排序，优先显示稳定版本
            .sort((a: ModelInfo, b: ModelInfo) => {
                // gemini-2.x 优先
                if (a.id.includes('gemini-2') && !b.id.includes('gemini-2')) return -1;
                if (!a.id.includes('gemini-2') && b.id.includes('gemini-2')) return 1;
                // flash 优先于 pro
                if (a.id.includes('flash') && !b.id.includes('flash')) return -1;
                if (!a.id.includes('flash') && b.id.includes('flash')) return 1;
                return a.id.localeCompare(b.id);
            });

        // 缓存结果
        modelListCache.set(cacheKey, { models, timestamp: Date.now() });

        console.log(`✅ [ModelFactory] Fetched ${models.length} Gemini models`);
        return { success: true, models };
    } catch (error) {
        console.error('❌ [ModelFactory] Failed to fetch Gemini models:', error);
        return {
            success: false,
            models: [],
            error: error instanceof Error ? error.message : '网络请求失败'
        };
    }
}

/**
 * 动态获取 DeepSeek 支持的模型列表
 * 
 * DeepSeek 使用 OpenAI 兼容 API
 * API 文档: https://platform.deepseek.com/api-docs
 */
async function fetchDeepSeekModels(apiKey: string): Promise<FetchModelsResult> {
    const cacheKey = `deepseek-${apiKey.slice(-8)}`;
    const cached = modelListCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return { success: true, models: cached.models, cached: true };
    }

    try {
        const response = await fetch(
            'https://api.deepseek.com/models',
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            const error = await response.text();
            return {
                success: false,
                models: [],
                error: `API 请求失败 (${response.status}): ${error}`
            };
        }

        const data = await response.json() as { data?: any[] };

        // 解析 OpenAI 格式的模型列表
        const models: ModelInfo[] = (data.data || [])
            .filter((m: any) => m.id && !m.id.includes('embedding'))
            .map((m: any) => ({
                id: m.id,
                name: m.id,
                description: m.owned_by ? `Owned by: ${m.owned_by}` : undefined,
                supportsVision: false, // DeepSeek 目前不支持视觉
                supportsTools: true,
            }))
            .sort((a: ModelInfo, b: ModelInfo) => {
                // chat 模型优先
                if (a.id.includes('chat') && !b.id.includes('chat')) return -1;
                if (!a.id.includes('chat') && b.id.includes('chat')) return 1;
                return a.id.localeCompare(b.id);
            });

        // 缓存结果
        modelListCache.set(cacheKey, { models, timestamp: Date.now() });

        console.log(`✅ [ModelFactory] Fetched ${models.length} DeepSeek models`);
        return { success: true, models };
    } catch (error) {
        console.error('❌ [ModelFactory] Failed to fetch DeepSeek models:', error);
        return {
            success: false,
            models: [],
            error: error instanceof Error ? error.message : '网络请求失败'
        };
    }
}

/**
 * 动态获取指定提供商支持的模型列表
 * 
 * @param provider AI 提供商
 * @param apiKey API Key
 * @returns 模型列表或错误信息
 */
export async function fetchAvailableModels(
    provider: AIProvider,
    apiKey: string
): Promise<FetchModelsResult> {
    if (!apiKey || !apiKey.trim()) {
        return {
            success: false,
            models: [],
            error: '请先配置 API Key'
        };
    }

    switch (provider) {
        case 'gemini':
            return fetchGeminiModels(apiKey);
        case 'deepseek':
            return fetchDeepSeekModels(apiKey);
        default:
            return {
                success: false,
                models: [],
                error: `不支持的提供商: ${provider}`
            };
    }
}

/**
 * 清除模型列表缓存
 */
export function clearModelListCache(provider?: AIProvider): void {
    if (provider) {
        // 清除特定提供商的缓存
        for (const key of modelListCache.keys()) {
            if (key.startsWith(provider)) {
                modelListCache.delete(key);
            }
        }
    } else {
        // 清除所有缓存
        modelListCache.clear();
    }
    console.log(`🗑️ [ModelFactory] Cleared model list cache${provider ? ` for ${provider}` : ''}`);
}

// ============ 类型定义 ============

/**
 * 模型创建配置
 */
export interface ModelCreationConfig {
    /** AI 提供商 */
    provider: AIProvider;
    /** 模型名称 */
    model: string;
    /** API Key */
    apiKey: string;
    /** 温度参数 (0-1) */
    temperature?: number;
    /** 最大重试次数 */
    maxRetries?: number;
    /** 可选：绑定的工具 */
    tools?: StructuredToolInterface[];
}

/**
 * 模型创建策略接口
 */
interface ModelCreationStrategy {
    /** 创建聊天模型 */
    createModel(config: ModelCreationConfig): BaseChatModel;
    /** 获取提供商配置 */
    getProviderConfig(): AIProviderConfig;
}

// ============ 策略实现 ============

/**
 * Google Gemini 模型创建策略
 */
class GeminiModelStrategy implements ModelCreationStrategy {
    createModel(config: ModelCreationConfig): BaseChatModel {
        return new ChatGoogleGenerativeAI({
            model: config.model,
            apiKey: config.apiKey,
            temperature: config.temperature ?? 0,
            maxRetries: config.maxRetries ?? 2,
        });
    }

    getProviderConfig(): AIProviderConfig {
        return AI_PROVIDERS.gemini;
    }
}

/**
 * DeepSeek 模型创建策略
 * DeepSeek 兼容 OpenAI API 格式
 */
class DeepSeekModelStrategy implements ModelCreationStrategy {
    private static readonly BASE_URL = 'https://api.deepseek.com';

    createModel(config: ModelCreationConfig): BaseChatModel {
        return new ChatOpenAI({
            model: config.model,
            apiKey: config.apiKey,
            temperature: config.temperature ?? 0,
            maxRetries: config.maxRetries ?? 2,
            configuration: {
                baseURL: DeepSeekModelStrategy.BASE_URL,
            },
        });
    }

    getProviderConfig(): AIProviderConfig {
        return AI_PROVIDERS.deepseek;
    }
}

// ============ 策略注册表 ============

/**
 * 策略注册表 - 管理所有可用的模型创建策略
 */
const strategyRegistry = new Map<AIProvider, ModelCreationStrategy>([
    ['gemini', new GeminiModelStrategy()],
    ['deepseek', new DeepSeekModelStrategy()],
]);

/**
 * 注册新的模型创建策略
 * 用于扩展支持新的 AI 提供商
 */
export function registerModelStrategy(provider: AIProvider, strategy: ModelCreationStrategy): void {
    strategyRegistry.set(provider, strategy);
    console.log(`📦 [ModelFactory] Registered strategy for provider: ${provider}`);
}

/**
 * 获取已注册的所有提供商
 */
export function getRegisteredProviders(): AIProvider[] {
    return Array.from(strategyRegistry.keys());
}

// ============ 模型工厂 ============

/**
 * 创建聊天模型
 * 根据提供商自动选择正确的实现
 * 
 * @param config 模型创建配置
 * @returns 聊天模型实例（可能已绑定工具）
 */
export function createChatModel(config: ModelCreationConfig): BaseChatModel {
    console.log(`创建模型的 config 信息:`, config);

    const { provider, tools } = config;

    // 获取对应的策略
    const strategy = strategyRegistry.get(provider);
    if (!strategy) {
        throw new Error(
            `Unsupported AI provider: ${provider}. ` +
            `Available providers: ${Array.from(strategyRegistry.keys()).join(', ')}`
        );
    }

    // 创建基础模型
    let model = strategy.createModel(config);

    console.log(`使用的工具信息:`, tools);

    // 如果提供了工具，绑定工具
    if (tools && tools.length > 0) {
        // 检查提供商是否支持工具调用
        const providerConfig = strategy.getProviderConfig();
        if (!providerConfig.supportsTools) {
            console.warn(
                `⚠️ [ModelFactory] Provider ${provider} does not support tools, skipping tool binding`
            );
        } else if (model.bindTools) {
            model = model.bindTools(tools) as BaseChatModel;
        }
    }

    console.log(`🤖 [ModelFactory] Created ${provider} model: ${config.model}`);
    return model;
}

/**
 * 创建带工具绑定的聊天模型
 * 便捷方法，等同于 createChatModel({ ...config, tools })
 */
export function createChatModelWithTools(
    config: Omit<ModelCreationConfig, 'tools'>,
    tools: StructuredToolInterface[]
): BaseChatModel {
    return createChatModel({ ...config, tools });
}

/**
 * 检查提供商是否支持特定能力
 */
export function checkProviderCapability(
    provider: AIProvider,
    capability: 'vision' | 'tools' | 'audio'
): boolean {
    const providerConfig = AI_PROVIDERS[provider];
    if (!providerConfig) return false;

    switch (capability) {
        case 'vision':
            return providerConfig.supportsVision;
        case 'tools':
            return providerConfig.supportsTools;
        case 'audio':
            return providerConfig.supportsAudio;
        default:
            return false;
    }
}

/**
 * 获取提供商支持的音频格式
 */
export function getSupportedAudioFormats(provider: AIProvider): string[] {
    const providerConfig = AI_PROVIDERS[provider];
    return providerConfig?.audioFormats || [];
}

/**
 * 获取提供商的默认模型
 */
export function getDefaultModel(provider: AIProvider): string {
    return AI_PROVIDERS[provider]?.defaultModel || '';
}

/**
 * 获取提供商支持的所有模型
 */
export function getAvailableModels(provider: AIProvider): string[] {
    return AI_PROVIDERS[provider]?.models || [];
}

// ============ 类型导出 ============

export type { ModelCreationStrategy };
