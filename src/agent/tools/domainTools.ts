/**
 * 领域聚合工具
 * 
 * 设计理念：
 * 1. 将同一领域的多个工具聚合为一个"超级工具"
 * 2. 通过 action 参数区分具体操作
 * 3. 减少 Agent 需要理解的工具数量，同时保持功能完整
 * 
 * 好处：
 * - 工具数量从 20+ 减少到 4-5 个
 * - LLM 选择工具的认知负担大幅降低
 * - 参数结构统一，便于维护
 * - 支持动态扩展，添加新 action 无需注册新工具
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../../api/config";
import { fetchWithTimeout } from "../utils/http";

/**
 * 获取认证Token的辅助函数
 */
async function getAuthHeaders() {
  const token = await AsyncStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
}

/**
 * 获取当前账本ID
 */
async function getCurrentLedgerId(): Promise<number | null> {
  try {
    const ledgerStr = await AsyncStorage.getItem('currentLedger');
    if (ledgerStr) {
      const ledger = JSON.parse(ledgerStr);
      return ledger.id;
    }
    return null;
  } catch {
    return null;
  }
}

// ============ 交易领域工具 ============

const TransactionActionEnum = z.enum([
  "query", "get", "create", "update", "delete", "batch_create", "statistics"
]);

/**
 * 交易操作工具
 * 统一处理：查询、创建、更新、删除、批量操作
 */
export const transactionDomainTool = new DynamicStructuredTool({
  name: "transaction",
  description: `交易记录管理工具，支持以下操作：
- query: 查询交易列表（支持时间范围、分类、关键词过滤）
- get: 获取单条交易详情
- create: 创建新交易
- update: 更新已有交易
- delete: 删除交易
- batch_create: 批量创建交易
- statistics: 获取统计数据`,
  schema: z.object({
    action: TransactionActionEnum.describe("操作类型"),
    // 查询参数
    filters: z.object({
      startTime: z.string().optional().describe("开始时间 YYYY-MM-DD 或 YYYY-MM-DDTHH:mm:ss（query/statistics时使用）"),
      endTime: z.string().optional().describe("结束时间 YYYY-MM-DD 或 YYYY-MM-DDTHH:mm:ss（query/statistics时使用）"),
      categoryId: z.number().optional().describe("分类ID"),
      type: z.enum(["INCOME", "EXPENSE"]).optional().describe("类型：INCOME=收入，EXPENSE=支出"),
      keyword: z.string().optional().describe("搜索关键词"),
      limit: z.number().optional().describe("返回数量限制"),
    }).optional().describe("查询/统计过滤条件"),
    // 单条操作参数
    id: z.number().optional().describe("交易ID（get/update/delete时必填）"),
    // 创建/更新参数
    data: z.object({
      name: z.string().optional().describe("交易名称/标题（create时必填）"),
      amount: z.number().optional().describe("金额"),
      type: z.enum(["INCOME", "EXPENSE"]).optional().describe("类型：INCOME=收入，EXPENSE=支出"),
      categoryId: z.number().optional().describe("分类ID"),
      paymentMethodId: z.number().optional().describe("支付方式ID"),
      description: z.string().optional().describe("描述/备注"),
      transactionDateTime: z.string().optional().describe("交易时间 ISO格式"),
    }).optional().describe("交易数据（create/update时使用）"),
    // 批量创建参数
    items: z.array(z.object({
      name: z.string().describe("交易名称/标题"),
      amount: z.number().describe("金额"),
      type: z.enum(["INCOME", "EXPENSE"]).describe("类型：INCOME=收入，EXPENSE=支出"),
      categoryId: z.number().describe("分类ID"),
      paymentMethodId: z.number().optional().describe("支付方式ID"),
      description: z.string().optional().describe("描述/备注"),
      transactionDateTime: z.string().optional().describe("交易时间 ISO格式"),
    })).optional().describe("批量创建时的交易列表"),
  }),
  func: async ({ action, filters, id, data, items }) => {
    const ledgerId = await getCurrentLedgerId();
    if (!ledgerId) {
      return JSON.stringify({ error: "请先选择账本" });
    }
    const headers = await getAuthHeaders();

    try {
      switch (action) {
        case "query": {
          // 使用 POST /api/agent/transactions/query 接口
          const queryPayload: Record<string, any> = {
            ledgerId,
            page: 0,
            size: filters?.limit || 20,
          };
          if (filters?.startTime) queryPayload.startTime = filters.startTime;
          if (filters?.endTime) queryPayload.endTime = filters.endTime;
          if (filters?.categoryId) queryPayload.categoryId = filters.categoryId;
          if (filters?.type) queryPayload.type = filters.type; // 已经是 INCOME/EXPENSE
          if (filters?.keyword) queryPayload.keyword = filters.keyword;
          
          const response = await fetchWithTimeout(
            `${API_BASE_URL}/api/agent/transactions/query`,
            { method: "POST", headers, body: JSON.stringify(queryPayload) }
          );
          const result = await response.json();
          return JSON.stringify({ success: true, data: result?.data || result, count: result?.count || result?.data?.length || 0 });
        }
        
        case "get": {
          if (!id) return JSON.stringify({ error: "缺少交易ID" });
          const response = await fetchWithTimeout(
            `${API_BASE_URL}/api/transactions/${id}`,
            { method: "GET", headers }
          );
          const result = await response.json();
          return JSON.stringify({ success: true, data: result });
        }
        
        case "create": {
          if (!data?.name || !data?.amount || !data?.type || !data?.categoryId) {
            return JSON.stringify({ error: "缺少必填字段：name, amount, type, categoryId" });
          }
          const payload = {
            ledgerId,
            name: data.name,
            amount: data.amount,
            type: data.type, // 已经是 INCOME/EXPENSE
            categoryId: data.categoryId,
            paymentMethodId: data.paymentMethodId,
            description: data.description || "",
            transactionDateTime: data.transactionDateTime || new Date().toISOString(),
          };
          const response = await fetchWithTimeout(
            `${API_BASE_URL}/api/agent/transactions/create`,
            { method: "POST", headers, body: JSON.stringify(payload) }
          );
          const result = await response.json();
          return JSON.stringify({ success: true, data: result, message: "交易创建成功" });
        }
        
        case "update": {
          if (!id) return JSON.stringify({ error: "缺少交易ID" });
          const payload: Record<string, any> = {};
          if (data?.name !== undefined) payload.name = data.name;
          if (data?.amount !== undefined) payload.amount = data.amount;
          if (data?.categoryId !== undefined) payload.categoryId = data.categoryId;
          if (data?.paymentMethodId !== undefined) payload.paymentMethodId = data.paymentMethodId;
          if (data?.description !== undefined) payload.description = data.description;
          if (data?.transactionDateTime !== undefined) payload.transactionDateTime = data.transactionDateTime;
          if (data?.type !== undefined) payload.type = data.type; // 已经是 INCOME/EXPENSE
          
          const response = await fetchWithTimeout(
            `${API_BASE_URL}/api/agent/transactions/${id}`,
            { method: "PUT", headers, body: JSON.stringify(payload) }
          );
          const result = await response.json();
          return JSON.stringify({ success: true, data: result, message: "交易更新成功" });
        }
        
        case "delete": {
          if (!id) return JSON.stringify({ error: "缺少交易ID" });
          await fetchWithTimeout(
            `${API_BASE_URL}/api/agent/transactions/${id}`,
            { method: "DELETE", headers }
          );
          return JSON.stringify({ success: true, message: "交易删除成功" });
        }
        
        case "batch_create": {
          if (!items || items.length === 0) {
            return JSON.stringify({ error: "缺少交易列表" });
          }
          const payload = {
            ledgerId,
            transactions: items.map(item => ({
              name: item.name,
              amount: item.amount,
              type: item.type, // 已经是 INCOME/EXPENSE
              categoryId: item.categoryId,
              paymentMethodId: item.paymentMethodId,
              description: item.description || "",
              transactionDateTime: item.transactionDateTime || new Date().toISOString(),
            })),
          };
          const response = await fetchWithTimeout(
            `${API_BASE_URL}/api/agent/transactions/batch-create`,
            { method: "POST", headers, body: JSON.stringify(payload) }
          );
          const result = await response.json();
          return JSON.stringify({ success: true, data: result, message: `批量创建完成` });
        }
        
        case "statistics": {
          // 如果没有提供时间范围，默认查询本月
          let startTime = filters?.startTime;
          let endTime = filters?.endTime;
          
          if (!startTime || !endTime) {
            const now = new Date();
            endTime = now.toISOString().split('T')[0];
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            startTime = monthStart.toISOString().split('T')[0];
          }
          
          const params = new URLSearchParams();
          params.append("ledgerId", String(ledgerId));
          params.append("startTime", startTime);
          params.append("endTime", endTime);
          if (filters?.type) params.append("type", filters.type); // 已经是 INCOME/EXPENSE
          
          const response = await fetchWithTimeout(
            `${API_BASE_URL}/api/agent/statistics?${params.toString()}`,
            { method: "GET", headers }
          );
          const result = await response.json();
          return JSON.stringify({ success: true, data: result });
        }
        
        default:
          return JSON.stringify({ error: `不支持的操作: ${action}` });
      }
    } catch (error: any) {
      return JSON.stringify({ 
        error: error.message || "操作失败",
        action,
      });
    }
  },
});

// ============ 分类领域工具 ============

const CategoryActionEnum = z.enum(["list", "search", "create"]);

/**
 * 分类管理工具
 */
export const categoryDomainTool = new DynamicStructuredTool({
  name: "category",
  description: `分类管理工具，支持以下操作：
- list: 获取所有分类列表
- search: 按名称搜索分类
- create: 创建新分类`,
  schema: z.object({
    action: CategoryActionEnum.describe("操作类型"),
    // 搜索参数
    keyword: z.string().optional().describe("搜索关键词（search时使用）"),
    type: z.enum(["INCOME", "EXPENSE"]).optional().describe("分类类型过滤：INCOME=收入，EXPENSE=支出"),
    // 创建参数
    data: z.object({
      name: z.string().describe("分类名称"),
      type: z.enum(["INCOME", "EXPENSE"]).describe("分类类型：INCOME=收入，EXPENSE=支出"),
      icon: z.string().optional().describe("图标emoji"),
      parentId: z.number().optional().describe("父分类ID"),
    }).optional().describe("创建分类的数据"),
  }),
  func: async ({ action, keyword, type, data }) => {
    const ledgerId = await getCurrentLedgerId();
    if (!ledgerId) {
      return JSON.stringify({ error: "请先选择账本" });
    }
    const headers = await getAuthHeaders();

    try {
      switch (action) {
        case "list": {
          const params = new URLSearchParams();
          params.append("ledgerId", String(ledgerId));
          if (type) params.append("type", type); // 已经是 INCOME/EXPENSE
          
          const response = await fetchWithTimeout(
            `${API_BASE_URL}/api/agent/categories?${params.toString()}`,
            { method: "GET", headers }
          );
          const result = await response.json();
          return JSON.stringify({ success: true, data: result, count: result?.length || 0 });
        }
        
        case "search": {
          if (!keyword) return JSON.stringify({ error: "缺少搜索关键词" });
          const params = new URLSearchParams();
          params.append("ledgerId", String(ledgerId));
          params.append("keyword", keyword);
          
          const response = await fetchWithTimeout(
            `${API_BASE_URL}/api/categories/search?${params.toString()}`,
            { method: "GET", headers }
          );
          const result = await response.json();
          return JSON.stringify({ success: true, data: result });
        }
        
        case "create": {
          if (!data?.name || !data?.type) {
            return JSON.stringify({ error: "缺少必填字段：name, type" });
          }
          const payload = {
            ledgerId,
            name: data.name,
            type: data.type, // 已经是 INCOME/EXPENSE
            icon: data.icon || "📁",
            parentId: data.parentId,
          };
          const response = await fetchWithTimeout(
            `${API_BASE_URL}/api/agent/categories`,
            { method: "POST", headers, body: JSON.stringify(payload) }
          );
          const result = await response.json();
          return JSON.stringify({ success: true, data: result, message: "分类创建成功" });
        }
        
        default:
          return JSON.stringify({ error: `不支持的操作: ${action}` });
      }
    } catch (error: any) {
      return JSON.stringify({ error: error.message || "操作失败" });
    }
  },
});

// ============ 支付方式领域工具 ============

const PaymentMethodActionEnum = z.enum(["list", "create"]);

/**
 * 支付方式/账户管理工具
 */
export const paymentMethodDomainTool = new DynamicStructuredTool({
  name: "payment_method",
  description: `支付方式/账户管理工具，支持以下操作：
- list: 获取所有支付方式列表
- create: 创建新支付方式`,
  schema: z.object({
    action: PaymentMethodActionEnum.describe("操作类型"),
    // 创建参数
    name: z.string().optional().describe("支付方式名称（create时必填）"),
    icon: z.string().optional().describe("图标emoji（create时可选，默认💳）"),
  }),
  func: async ({ action, name, icon }) => {
    const headers = await getAuthHeaders();

    try {
      switch (action) {
        case "list": {
          const response = await fetchWithTimeout(
            `${API_BASE_URL}/api/agent/payment-methods`,
            { method: "GET", headers }
          );
          const result = await response.json();
          return JSON.stringify({ success: true, data: result, count: result?.data?.length || result?.length || 0 });
        }
        
        case "create": {
          if (!name) {
            return JSON.stringify({ error: "缺少必填字段：name" });
          }
          // 后端使用 @RequestParam，不是 JSON body
          const params = new URLSearchParams();
          params.append("name", name);
          if (icon) params.append("icon", icon);
          
          const response = await fetchWithTimeout(
            `${API_BASE_URL}/api/agent/payment-methods?${params.toString()}`,
            { method: "POST", headers }
          );
          const result = await response.json();
          return JSON.stringify({ success: true, data: result, message: "支付方式创建成功" });
        }
        
        default:
          return JSON.stringify({ error: `不支持的操作: ${action}` });
      }
    } catch (error: any) {
      return JSON.stringify({ error: error.message || "操作失败" });
    }
  },
});

// ============ 上下文信息工具 ============

interface StoredLedger {
  id: number;
  name: string;
  description?: string;
  categories?: any[];
  paymentMethods?: any[];
}

interface StoredUser {
  id: number | string;
  nickname?: string;
  username?: string;
  email?: string;
}

/**
 * 从 AsyncStorage 获取上下文
 */
async function getStoredContext() {
  try {
    const [userStr, ledgerStr, ledgersStr] = await Promise.all([
      AsyncStorage.getItem('user'),
      AsyncStorage.getItem('currentLedger'),
      AsyncStorage.getItem('ledgers'),
    ]);
    
    return {
      user: userStr ? JSON.parse(userStr) as StoredUser : null,
      currentLedger: ledgerStr ? JSON.parse(ledgerStr) as StoredLedger : null,
      allLedgers: ledgersStr ? JSON.parse(ledgersStr) as StoredLedger[] : [],
    };
  } catch {
    return { user: null, currentLedger: null, allLedgers: [] };
  }
}

const ContextActionEnum = z.enum(["full", "user", "ledger", "ledgers"]);

/**
 * 上下文信息工具
 * 获取用户、账本、分类、支付方式等上下文
 */
export const contextDomainTool = new DynamicStructuredTool({
  name: "context",
  description: `获取当前上下文信息，支持以下操作：
- full: 获取完整上下文（用户、账本、分类、支付方式）
- user: 仅获取用户信息
- ledger: 仅获取当前账本信息
- ledgers: 获取所有账本列表`,
  schema: z.object({
    action: ContextActionEnum.describe("获取范围"),
  }),
  func: async ({ action }) => {
    const ctx = await getStoredContext();
    
    switch (action) {
      case "full":
        return JSON.stringify({
          user: ctx.user ? { id: ctx.user.id, nickname: ctx.user.nickname || ctx.user.username, email: ctx.user.email } : null,
          currentLedger: ctx.currentLedger,
          categories: ctx.currentLedger?.categories || [],
          paymentMethods: ctx.currentLedger?.paymentMethods || [],
          allLedgers: ctx.allLedgers.map((l: StoredLedger) => ({ id: l.id, name: l.name })),
        }, null, 2);
        
      case "user":
        return JSON.stringify(ctx.user ? { id: ctx.user.id, nickname: ctx.user.nickname || ctx.user.username, email: ctx.user.email } : { error: "未登录" });
        
      case "ledger":
        return JSON.stringify(ctx.currentLedger || { error: "未选择账本" });
        
      case "ledgers":
        return JSON.stringify(ctx.allLedgers.map((l: StoredLedger) => ({ id: l.id, name: l.name })));
        
      default:
        return JSON.stringify({ error: `不支持的操作: ${action}` });
    }
  },
});

// ============ 导出聚合工具 ============

export const domainTools = [
  transactionDomainTool,
  categoryDomainTool,
  paymentMethodDomainTool,
  contextDomainTool,
];

/**
 * 使用说明：
 * 
 * 原来的工具结构：
 * - create_transaction
 * - query_transactions
 * - update_transaction
 * - delete_transaction
 * - get_statistics
 * - get_categories
 * - create_category
 * - get_payment_methods
 * - create_payment_method
 * - get_user_info
 * - get_current_ledger
 * - ... (20+ 工具)
 * 
 * 新的工具结构：
 * - transaction (action: query/get/create/update/delete/batch_create/statistics)
 * - category (action: list/search/create)
 * - payment_method (action: list/create)
 * - context (action: full/user/ledger/ledgers)
 * - render (保留原有渲染工具，因为它们是展示层)
 * 
 * 优势：
 * 1. 工具数量从 20+ 减少到 4-5 个
 * 2. LLM 更容易理解和选择
 * 3. 参数结构统一，易于维护
 * 4. 扩展新功能只需添加 action，无需注册新工具
 */
