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
import { appEventEmitter, AppEvents } from "../../utils/eventEmitter";

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
- create: 创建新交易（必须在 data 对象中提供 amount、type、categoryId）
- update: 更新已有交易
- delete: 删除交易
- batch_create: 批量创建交易
- statistics: 获取统计数据

【重要】create 操作必须提供 data 对象，包含：
- data.amount: 金额（必填）
- data.type: "EXPENSE"（支出）或 "INCOME"（收入）（必填）
- data.categoryId: 分类ID（必填）
- data.description: 交易描述（可选但建议填写）

【分类选择原则】
- 若用户指定的分类名称在上下文分类列表中存在，直接使用其ID
- 若用户指定的分类名称不存在（如"零食"、"健身"等），应先调用 category 工具创建该分类，再使用新ID`,
  schema: z.object({
    action: TransactionActionEnum.describe("操作类型"),
    // 查询参数
    filters: z.object({
      startTime: z.string().optional().describe("开始时间 YYYY-MM-DD 或 YYYY-MM-DDTHH:mm:ss（query/statistics时使用）"),
      endTime: z.string().optional().describe("结束时间 YYYY-MM-DD 或 YYYY-MM-DDTHH:mm:ss（query/statistics时使用）"),
      categoryId: z.number().optional().describe("分类ID（精确匹配，优先使用）"),
      categoryName: z.string().optional().describe("分类名称（模糊匹配，当不确定分类ID时使用）"),
      type: z.enum(["INCOME", "EXPENSE"]).optional().describe("类型：INCOME=收入，EXPENSE=支出"),
      keyword: z.string().optional().describe("搜索关键词（精确匹配交易描述，慎用！如果不确定描述完全一致，请不要使用此字段，而是先按时间范围查询）"),
      limit: z.number().optional().describe("返回数量限制"),
    }).optional().describe("查询/统计过滤条件"),
    // 单条操作参数
    id: z.number().optional().describe("交易ID（get/update/delete时必填）"),
    // 创建/更新参数
    data: z.object({
      description: z.string().optional().describe("交易描述，记录消费用途或收入来源"),
      amount: z.number().optional().describe("金额（create时必填）"),
      type: z.enum(["INCOME", "EXPENSE"]).optional().describe("类型：EXPENSE=支出，INCOME=收入（create时必填）"),
      categoryId: z.number().optional().describe("分类ID，从上下文分类列表中选择（create时必填）"),
      paymentMethodId: z.number().optional().describe("支付方式ID"),
      transactionDateTime: z.string().optional().describe("交易时间 ISO格式，默认当前时间"),
    }).optional().describe("交易数据（create/update时使用，create时 amount、type、categoryId 必填）"),
    // 批量创建参数
    items: z.array(z.object({
      description: z.string().optional().describe("交易描述"),
      amount: z.number().describe("金额"),
      type: z.enum(["INCOME", "EXPENSE"]).describe("类型：EXPENSE=支出，INCOME=收入"),
      categoryId: z.number().describe("分类ID"),
      paymentMethodId: z.number().optional().describe("支付方式ID"),
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
          if (filters?.categoryName) queryPayload.categoryName = filters.categoryName;
          if (filters?.type) queryPayload.type = filters.type; // 已经是 INCOME/EXPENSE
          if (filters?.keyword) queryPayload.keyword = filters.keyword;
          
          console.log('[transaction] query payload:', JSON.stringify(queryPayload));
          
          const response = await fetchWithTimeout(
            `${API_BASE_URL}/api/agent/transactions/query`,
            { method: "POST", headers, body: JSON.stringify(queryPayload) }
          );
          const result: any = await response.json();
          
          console.log('[transaction] query response code:', result?.code, 'message:', result?.message);
          
          // 后端返回结构: { code, message, data: { transactions, page, size, totalElements, ... } }
          const data = result?.data;
          const transactions = data?.transactions || [];
          const count = transactions.length;
          const totalElements = data?.totalElements || count;
          
          // 简化交易数据，并限制数量避免 token 过多
          const simplifiedTransactions = transactions.map((tx: any) => ({
            id: tx.id,
            description: tx.description,
            amount: tx.amount,
            type: tx.type,
            categoryName: tx.categoryName,
            categoryIcon: tx.categoryIcon,
            transactionDateTime: tx.transactionDateTime,
          }));
          
          console.log('[transaction] query found', count, 'transactions, total:', totalElements);
          
          // 为了避免返回数据过大导致 LLM 响应错误，只返回前10条用于渲染
          // 完整数据会通过渲染工具展示
          const previewTransactions = simplifiedTransactions.slice(0, 10);
          const hasMore = count > 10;
          
          return JSON.stringify({ 
            success: true, 
            transactions: previewTransactions,
            count,
            totalElements,
            hasMore,
            summary: {
              totalIncome: data?.totalIncome || 0,
              totalExpense: data?.totalExpense || 0,
              balance: data?.balance || 0,
            },
            hint: hasMore ? `显示了前10条，共${totalElements}条记录。请使用 render_transaction_list 工具渲染完整列表。` : undefined,
          });
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
          if (!data?.amount || !data?.type || !data?.categoryId) {
            return JSON.stringify({ error: "缺少必填字段：amount, type, categoryId" });
          }
          const payload = {
            ledgerId,
            description: data.description || "",
            amount: data.amount,
            type: data.type, // 已经是 INCOME/EXPENSE
            categoryId: data.categoryId,
            paymentMethodId: data.paymentMethodId,
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
          if (data?.description !== undefined) payload.description = data.description;
          if (data?.amount !== undefined) payload.amount = data.amount;
          if (data?.categoryId !== undefined) payload.categoryId = data.categoryId;
          if (data?.paymentMethodId !== undefined) payload.paymentMethodId = data.paymentMethodId;
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
              description: item.description || "",
              amount: item.amount,
              type: item.type, // 已经是 INCOME/EXPENSE
              categoryId: item.categoryId,
              paymentMethodId: item.paymentMethodId,
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

const CategoryActionEnum = z.enum(["list", "search", "create", "delete"]);

/**
 * 分类管理工具
 */
export const categoryDomainTool = new DynamicStructuredTool({
  name: "category",
  description: `分类管理工具，支持以下操作：
- list: 获取所有分类列表
- search: 按名称搜索分类
- create: 创建新分类
- delete: 删除分类（需要分类ID）

【使用场景】
当用户描述的交易涉及特定分类名称（如"零食"、"健身"、"宠物"等），而上下文分类列表中不存在适合的分类：
1. 应先使用 create 操作创建该分类
2. 然后使用新创建的分类ID记录交易

删除分类时：
1. 先使用 search 操作查找分类获取ID
2. 然后使用 delete 操作配合 id 参数删除

避免将用户明确的分类意图归类到不精确的通用分类（如将"零食"归为"餐饮"）。`,
  schema: z.object({
    action: CategoryActionEnum.describe("操作类型"),
    // 搜索参数
    keyword: z.string().optional().describe("搜索关键词（search时使用）"),
    type: z.enum(["INCOME", "EXPENSE"]).optional().describe("分类类型过滤：INCOME=收入，EXPENSE=支出"),
    // 删除参数
    id: z.number().optional().describe("分类ID（delete时必填）"),
    // 创建参数
    data: z.object({
      name: z.string().describe("分类名称"),
      type: z.enum(["INCOME", "EXPENSE"]).describe("分类类型：INCOME=收入，EXPENSE=支出"),
      icon: z.string().optional().describe("图标emoji"),
      parentId: z.number().optional().describe("父分类ID"),
    }).optional().describe("创建分类的数据"),
  }),
  func: async ({ action, keyword, type, data, id }) => {
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
          const result: any = await response.json();
          // 后端返回: { code, message, data: [{ id, name, icon, type, ... }] }
          const categories = result?.data || [];
          return JSON.stringify({ success: true, data: categories, count: categories.length });
        }
        
        case "search": {
          // 使用 list 接口，后端暂不支持独立的 search 接口
          // 获取全部分类后在客户端过滤
          const params = new URLSearchParams();
          params.append("ledgerId", String(ledgerId));
          if (type) params.append("type", type);
          
          const response = await fetchWithTimeout(
            `${API_BASE_URL}/api/agent/categories?${params.toString()}`,
            { method: "GET", headers }
          );
          const result: any = await response.json();
          // 后端返回: { code, message, data: [{ id, name, icon, type, ... }] }
          const categories = result?.data || [];
          
          // 客户端过滤
          if (keyword) {
            const filtered = categories.filter((cat: any) => 
              cat.name?.toLowerCase().includes(keyword.toLowerCase())
            );
            return JSON.stringify({ success: true, data: filtered, count: filtered.length });
          }
          return JSON.stringify({ success: true, data: categories, count: categories.length });
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
          
          // 发送分类变更事件，通知 CategoryContext 刷新
          appEventEmitter.emit(AppEvents.CATEGORY_CHANGED);
          console.log('[category] 分类创建成功，已发送刷新事件');
          
          return JSON.stringify({ success: true, data: result, message: "分类创建成功" });
        }
        
        case "delete": {
          if (!id) {
            return JSON.stringify({ error: "缺少必填字段：id（分类ID）。请先使用 search 操作查找分类获取ID" });
          }
          const response = await fetchWithTimeout(
            `${API_BASE_URL}/api/categories/${id}`,
            { method: "DELETE", headers }
          );
          const result: any = await response.json();
          
          if (result.code !== 200) {
            return JSON.stringify({ success: false, error: result.message || "删除失败" });
          }
          
          // 发送分类变更事件，通知 CategoryContext 刷新
          appEventEmitter.emit(AppEvents.CATEGORY_CHANGED);
          console.log('[category] 分类删除成功，已发送刷新事件');
          
          return JSON.stringify({ success: true, message: "分类删除成功" });
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
          const result: any = await response.json();
          // 后端返回: { code, message, data: [{ id, name, icon, ... }] }
          const methods = result?.data || [];
          return JSON.stringify({ success: true, data: methods, count: methods.length });
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

// ============ 数据分析工具 ============

const AnalysisTypeEnum = z.enum(["summary", "trend", "category_breakdown", "comparison", "ranking"]);
const GroupByEnum = z.enum(["day", "week", "month", "category", "payment_method"]);

/**
 * 数据分析工具
 * 提供多维度的财务数据分析能力
 */
export const analysisDomainTool = new DynamicStructuredTool({
  name: "analyze",
  description: `财务数据分析工具，支持多种分析类型：
- summary: 汇总统计（收支总额、分类占比、日均数据）
- trend: 趋势分析（按日/周/月查看收支变化趋势）
- category_breakdown: 分类明细（各分类的详细统计和占比）
- comparison: 对比分析（当前期间与上期对比，查看变化）
- ranking: 排行榜（消费/收入分类排行）

使用场景示例：
- "本月消费情况" → summary
- "最近三个月的支出趋势" → trend + groupBy=month
- "本月各分类花了多少" → category_breakdown
- "本月和上月对比" → comparison
- "本月消费最多的是什么" → ranking`,
  schema: z.object({
    analysisType: AnalysisTypeEnum.describe("分析类型"),
    startTime: z.string().describe("开始时间 YYYY-MM-DD"),
    endTime: z.string().describe("结束时间 YYYY-MM-DD"),
    // 趋势分析参数
    groupBy: GroupByEnum.optional().describe("分组维度：day=按日、week=按周、month=按月（trend类型时使用）"),
    // 筛选参数
    type: z.enum(["INCOME", "EXPENSE"]).optional().describe("交易类型过滤：INCOME=仅收入、EXPENSE=仅支出"),
    categoryIds: z.array(z.number()).optional().describe("指定分类ID过滤"),
    // 对比分析参数
    compareStartTime: z.string().optional().describe("对比期间开始时间（comparison类型时使用，不传则自动取上一期）"),
    compareEndTime: z.string().optional().describe("对比期间结束时间"),
    // 排行参数
    topN: z.number().optional().describe("返回前N个结果（ranking类型时使用，默认10）"),
  }),
  func: async ({ analysisType, startTime, endTime, groupBy, type, categoryIds, compareStartTime, compareEndTime, topN }) => {
    const ledgerId = await getCurrentLedgerId();
    if (!ledgerId) {
      return JSON.stringify({ error: "请先选择账本" });
    }
    const headers = await getAuthHeaders();

    try {
      const payload: Record<string, any> = {
        ledgerId,
        analysisType,
        startTime,
        endTime,
      };
      
      if (groupBy) payload.groupBy = groupBy;
      if (type) payload.type = type;
      if (categoryIds && categoryIds.length > 0) payload.categoryIds = categoryIds;
      if (compareStartTime) payload.compareStartTime = compareStartTime;
      if (compareEndTime) payload.compareEndTime = compareEndTime;
      if (topN) payload.topN = topN;

      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/agent/analyze`,
        { method: "POST", headers, body: JSON.stringify(payload) }
      );
      const result: any = await response.json();
      
      if (result.code !== 200 && result.code !== 0) {
        return JSON.stringify({ error: result.message || "分析失败" });
      }
      
      return JSON.stringify({ success: true, data: result.data || result });
    } catch (error: any) {
      return JSON.stringify({ 
        error: error.message || "分析失败",
        analysisType,
      });
    }
  },
});

// ============ 导出聚合工具 ============

export const domainTools = [
  transactionDomainTool,
  categoryDomainTool,
  paymentMethodDomainTool,
  contextDomainTool,
  analysisDomainTool,
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
 * - analyze (analysisType: summary/trend/category_breakdown/comparison/ranking)
 * - render_xxx (渲染工具，用于可视化展示)
 * 
 * 优势：
 * 1. 工具数量从 20+ 减少到 5-6 个
 * 2. LLM 更容易理解和选择
 * 3. 参数结构统一，易于维护
 * 4. 扩展新功能只需添加 action，无需注册新工具
 */
