/**
 * Context Tools - 提供前端运行时上下文数据
 * 
 * 这些工具让 AI Agent 能够主动获取前端的数据,而不是向用户索要
 * 采用 ReAct 模式:AI 可以主动调用这些工具来获取所需信息
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * 全局上下文存储
 * 由 AgentScreen 在初始化时注入
 */
interface AppContext {
  user: {
    id: string | number;
    username: string;
    email?: string;
  } | null;
  currentLedger: {
    id: number;
    name: string;
    description?: string;
  } | null;
  defaultLedgerId: number | null;
  allLedgers: Array<{
    id: number;
    name: string;
    description?: string;
  }>;
  token: string | null;
}

let globalContext: AppContext = {
  user: null,
  currentLedger: null,
  defaultLedgerId: null,
  allLedgers: [],
  token: null,
};

/**
 * 更新全局上下文 (由 AgentScreen 调用)
 */
export const updateAgentContext = (context: Partial<AppContext>) => {
  globalContext = { ...globalContext, ...context };
  console.log('🔄 [ContextTools] Context updated:', globalContext);
};

/**
 * 获取当前用户信息
 * AI 可以通过此工具了解当前登录用户
 */
export const getUserInfoTool = new DynamicStructuredTool({
  name: "get_user_info",
  description: "获取当前登录用户的信息。当需要用户ID或用户名时调用此工具。",
  schema: z.object({}), // 无需参数
  func: async () => {
    console.log('🔍 [getUserInfoTool] Called');
    
    if (!globalContext.user) {
      return "用户未登录";
    }
    
    return JSON.stringify({
      id: globalContext.user.id,
      username: globalContext.user.username,
      email: globalContext.user.email,
    });
  },
});

/**
 * 获取当前账本信息
 * AI 可以通过此工具获取用户当前选中的账本
 */
export const getCurrentLedgerTool = new DynamicStructuredTool({
  name: "get_current_ledger",
  description: "获取用户当前选中的账本信息。当需要账本ID时,应该首先调用此工具。",
  schema: z.object({}),
  func: async () => {
    console.log('🔍 [getCurrentLedgerTool] Called');
    
    if (!globalContext.currentLedger) {
      return "用户没有选中账本";
    }
    
    return JSON.stringify({
      id: globalContext.currentLedger.id,
      name: globalContext.currentLedger.name,
      description: globalContext.currentLedger.description,
      isDefault: globalContext.currentLedger.id === globalContext.defaultLedgerId,
    });
  },
});

/**
 * 获取所有账本列表
 * AI 可以通过此工具查看用户的所有账本
 */
export const getAllLedgersTool = new DynamicStructuredTool({
  name: "get_all_ledgers",
  description: "获取用户的所有账本列表。当用户询问有哪些账本,或需要在多个账本中选择时调用。",
  schema: z.object({}),
  func: async () => {
    console.log('🔍 [getAllLedgersTool] Called');
    
    if (!globalContext.allLedgers || globalContext.allLedgers.length === 0) {
      return "用户没有任何账本";
    }
    
    return JSON.stringify({
      total: globalContext.allLedgers.length,
      defaultLedgerId: globalContext.defaultLedgerId,
      ledgers: globalContext.allLedgers.map(l => ({
        id: l.id,
        name: l.name,
        description: l.description,
        isDefault: l.id === globalContext.defaultLedgerId,
      })),
    });
  },
});

/**
 * 获取完整的上下文信息
 * 一次性获取所有可用的上下文数据
 */
export const getFullContextTool = new DynamicStructuredTool({
  name: "get_full_context",
  description: "一次性获取所有可用的上下文信息(用户、账本等)。在对话开始时建议调用一次,了解当前环境。",
  schema: z.object({}),
  func: async () => {
    console.log('🔍 [getFullContextTool] Called');
    
    return JSON.stringify({
      user: globalContext.user ? {
        id: globalContext.user.id,
        username: globalContext.user.username,
        email: globalContext.user.email,
      } : null,
      currentLedger: globalContext.currentLedger,
      defaultLedgerId: globalContext.defaultLedgerId,
      allLedgers: globalContext.allLedgers,
      hasToken: !!globalContext.token,
    }, null, 2);
  },
});

export const contextTools = [
  getUserInfoTool,
  getCurrentLedgerTool,
  getAllLedgersTool,
  getFullContextTool,
];
