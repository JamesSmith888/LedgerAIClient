import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../../api/config";
import { fetchWithTimeout, TIMEOUT_CONFIG } from "../utils";

/**
 * Agent 交易数据类型（包含完整关联信息）
 * 与后端 AgentTransactionResp 对应
 */
export interface AgentTransaction {
  id: number;
  description?: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  typeName: string;
  transactionDateTime: string;
  ledgerId?: number;
  ledgerName?: string;
  categoryId?: number;
  categoryName?: string;
  categoryIcon?: string;
  paymentMethodId?: number;
  paymentMethodName?: string;
  createdByUserId?: number;
  createdByUserName?: string;
  createdByUserNickname?: string;
  attachmentCount?: number;
}

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
 * 创建交易工具 - 使用 Agent 专用 API
 * 对应后端: POST /api/agent/transactions/create
 * 
 * 返回完整的交易记录，包含分类名称、账本名称等关联信息
 * 便于 AI 直接展示给用户
 */
export const createTransactionTool = new DynamicStructuredTool({
  name: "create_transaction",
  description: "【必须调用】创建一笔新的交易记录。这是唯一能实际完成记账的工具，用户说要记账时必须调用此工具。返回完整交易信息。",
  schema: z.object({
    description: z.string().describe("交易描述/备注"),
    amount: z.number().describe("交易金额，必须大于0"),
    type: z.enum(["INCOME", "EXPENSE"]).describe("交易类型：'INCOME'代表收入，'EXPENSE'代表支出"),
    ledgerId: z.number().describe("账本ID"),
    categoryId: z.number().optional().describe("分类ID"),
    paymentMethodId: z.number().optional().describe("支付方式ID"),
    transactionDateTime: z.string().optional().describe("交易时间，ISO格式"),
  }),
  func: async ({ description, amount, type, ledgerId, categoryId, paymentMethodId, transactionDateTime }) => {
    console.log('🔧 [createTransactionTool] Called with:', { description, amount, type, ledgerId, categoryId });
    try {
      const headers = await getAuthHeaders();

      const requestBody = {
        description,
        amount,
        type,
        ledgerId,
        categoryId,
        paymentMethodId,
        transactionDateTime: transactionDateTime || new Date().toISOString(),
      };

      console.log('📤 [createTransactionTool] Sending request to Agent API:', requestBody);

      // 使用 Agent 专用 API（带超时保护）
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/agent/transactions/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        timeout: TIMEOUT_CONFIG.API_REQUEST,
      });

      const data = await response.json();
      console.log('📥 [createTransactionTool] Response:', data);

      if (data.code === 200 && data.data) {
        const tx = data.data;
        // 返回结构化的完整信息，便于 AI 展示
        return JSON.stringify({
          success: true,
          message: "交易创建成功",
          transaction: {
            id: tx.id,
            description: tx.description,
            amount: tx.amount,
            type: tx.type,
            typeName: tx.type === 'INCOME' ? '收入' : '支出',
            transactionDateTime: tx.transactionDateTime,
            ledgerId: tx.ledgerId,
            ledgerName: tx.ledgerName,
            categoryId: tx.categoryId,
            categoryName: tx.categoryName,
            categoryIcon: tx.categoryIcon,
            paymentMethodId: tx.paymentMethodId,
            paymentMethodName: tx.paymentMethodName,
          }
        }, null, 2);
      } else {
        return JSON.stringify({
          success: false,
          message: data.message || "创建失败",
        });
      }
    } catch (error) {
      console.error('❌ [createTransactionTool] Error:', error);
      return JSON.stringify({
        success: false,
        message: `请求出错: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  },
});

/**
 * 查询交易工具
 * 对应后端: POST /api/transactions/query
 */
export const queryTransactionsTool = new DynamicStructuredTool({
  name: "query_transactions",
  description: "查询交易记录，支持按账本、类型、分类、时间范围等条件筛选。",
  schema: z.object({
    ledgerId: z.number().describe("账本ID"),
    type: z.enum(["INCOME", "EXPENSE"]).optional().describe("交易类型：'INCOME'收入，'EXPENSE'支出"),
    categoryId: z.number().optional().describe("分类ID"),
    startTime: z.string().optional().describe("开始时间 (yyyy-MM-dd HH:mm:ss)"),
    endTime: z.string().optional().describe("结束时间 (yyyy-MM-dd HH:mm:ss)"),
    page: z.number().default(0).describe("页码，从0开始"),
    size: z.number().default(10).describe("每页数量"),
  }),
  func: async (params) => {
    console.log('🔧 [queryTransactionsTool] Called with:', params);
    try {
      const headers = await getAuthHeaders();

      // 转换 type 字符串为后端期望的整数值: 1=收入, 2=支出
      const requestParams = {
        ...params,
        type: params.type === 'INCOME' ? 1 : params.type === 'EXPENSE' ? 2 : undefined,
      };

      console.log('📤 [queryTransactionsTool] Sending request:', requestParams);

      const response = await fetchWithTimeout(`${API_BASE_URL}/api/transactions/query`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestParams),
        timeout: TIMEOUT_CONFIG.API_REQUEST,
      });

      const data = await response.json();
      console.log('📥 [queryTransactionsTool] Response:', data);

      if (data.code === 200) {
        if (!data.data || !data.data.content || data.data.content.length === 0) {
          return "未找到符合条件的交易记录。";
        }
        const list = data.data.content.map((t: any) =>
          `ID:${t.id} | 描述:${t.description || '无'} | 金额:${t.amount} | 类型:${t.type} | 时间:${t.transactionDateTime}`
        ).join('\n');
        console.log(`✅ [queryTransactionsTool] Found ${data.data.totalElements} transactions`);
        return `📊 查询结果 (共${data.data.totalElements}条):\n${list}`;
      } else {
        return `❌ 查询失败: ${data.message}`;
      }
    } catch (error) {
      console.error('❌ [queryTransactionsTool] Error:', error);
      return `请求出错: ${error}`;
    }
  },
});

/**
 * 统计工具
 * 对应后端: GET /api/transactions/daily-statistics
 */
export const statisticsTool = new DynamicStructuredTool({
  name: "get_statistics",
  description: "获取每日交易统计数据，包括收入、支出和交易笔数。",
  schema: z.object({
    ledgerId: z.number().describe("账本ID"),
    startTime: z.string().describe("开始时间 (yyyy-MM-dd)"),
    endTime: z.string().describe("结束时间 (yyyy-MM-dd)"),
  }),
  func: async ({ ledgerId, startTime, endTime }) => {
    console.log('🔧 [statisticsTool] Called with:', { ledgerId, startTime, endTime });
    try {
      const headers = await getAuthHeaders();

      const url = new URL(`${API_BASE_URL}/api/transactions/daily-statistics`);
      url.searchParams.append('ledgerId', ledgerId.toString());
      url.searchParams.append('startTime', startTime);
      url.searchParams.append('endTime', endTime);

      console.log('📤 [statisticsTool] Fetching:', url.toString());
      const response = await fetchWithTimeout(url.toString(), { headers, timeout: TIMEOUT_CONFIG.API_REQUEST });
      const data = await response.json();
      console.log('📥 [statisticsTool] Response:', data);

      if (data.code === 200) {
        console.log(`✅ [statisticsTool] Statistics fetched successfully`);
        return JSON.stringify(data.data, null, 2);
      } else {
        return `❌ 获取统计失败: ${data.message}`;
      }
    } catch (error) {
      console.error('❌ [statisticsTool] Error:', error);
      return `请求出错: ${error}`;
    }
  },
});

/**
 * 获取单条交易详情 - Agent 专用
 * 对应后端: GET /api/agent/transactions/{id}
 */
export const getTransactionDetailTool = new DynamicStructuredTool({
  name: "get_transaction_detail",
  description: "根据交易ID获取单条交易的完整详情，包括分类名称、账本名称、支付方式等所有关联信息。",
  schema: z.object({
    transactionId: z.number().describe("交易ID"),
  }),
  func: async ({ transactionId }) => {
    console.log('🔧 [getTransactionDetailTool] Called with:', { transactionId });
    try {
      const headers = await getAuthHeaders();

      const response = await fetchWithTimeout(`${API_BASE_URL}/api/agent/transactions/${transactionId}`, {
        headers,
        timeout: TIMEOUT_CONFIG.API_REQUEST,
      });

      const data = await response.json();
      console.log('📥 [getTransactionDetailTool] Response:', data);

      if (data.code === 200 && data.data) {
        const tx = data.data;
        return JSON.stringify({
          success: true,
          transaction: {
            id: tx.id,
            description: tx.description,
            amount: tx.amount,
            type: tx.type,
            typeName: tx.type === 'INCOME' ? '收入' : '支出',
            transactionDateTime: tx.transactionDateTime,
            ledgerId: tx.ledgerId,
            ledgerName: tx.ledgerName,
            categoryId: tx.categoryId,
            categoryName: tx.categoryName,
            categoryIcon: tx.categoryIcon,
            paymentMethodId: tx.paymentMethodId,
            paymentMethodName: tx.paymentMethodName,
            createdByUserId: tx.createdByUserId,
            createdByUserName: tx.createdByUserName,
            createdByUserNickname: tx.createdByUserNickname,
            attachmentCount: tx.attachmentCount,
          }
        }, null, 2);
      } else {
        return JSON.stringify({
          success: false,
          message: data.message || "获取交易详情失败",
        });
      }
    } catch (error) {
      console.error('❌ [getTransactionDetailTool] Error:', error);
      return JSON.stringify({
        success: false,
        message: `请求出错: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  },
});

/**
 * 查询交易列表 - Agent 专用
 * 对应后端: POST /api/agent/transactions/query
 * 支持多种筛选条件，返回完整交易信息
 */
export const queryAgentTransactionsTool = new DynamicStructuredTool({
  name: "query_agent_transactions",
  description: "【推荐】高级交易查询工具，支持多条件筛选。返回完整交易信息（包含分类名称、账本名称等）和汇总统计。适合需要展示给用户的场景。",
  schema: z.object({
    ledgerId: z.number().optional().describe("账本ID（可选，不填则查询用户所有账本）"),
    type: z.enum(["INCOME", "EXPENSE"]).optional().describe("交易类型：'INCOME'收入，'EXPENSE'支出"),
    categoryId: z.number().optional().describe("分类ID"),
    startTime: z.string().optional().describe("开始时间，ISO格式如 2024-01-01T00:00:00"),
    endTime: z.string().optional().describe("结束时间，ISO格式如 2024-01-31T23:59:59"),
    keyword: z.string().optional().describe("关键词搜索，匹配交易名称或描述"),
    minAmount: z.number().optional().describe("最小金额"),
    maxAmount: z.number().optional().describe("最大金额"),
    page: z.number().default(0).describe("页码，从0开始"),
    size: z.number().default(10).describe("每页数量，最大50"),
    sortBy: z.enum(["transactionDateTime", "amount"]).default("transactionDateTime").describe("排序字段"),
    sortDirection: z.enum(["ASC", "DESC"]).default("DESC").describe("排序方向"),
  }),
  func: async (params) => {
    console.log('🔧 [queryAgentTransactionsTool] Called with:', params);
    try {
      const headers = await getAuthHeaders();

      const response = await fetchWithTimeout(`${API_BASE_URL}/api/agent/transactions/query`, {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
        timeout: TIMEOUT_CONFIG.API_REQUEST,
      });

      const data = await response.json();
      console.log('📥 [queryAgentTransactionsTool] Response:', data);

      if (data.code === 200 && data.data) {
        const result = data.data;

        // 构建简洁的结果摘要
        const summary = {
          success: true,
          message: `查询到 ${result.totalElements} 条交易记录`,
          pagination: {
            page: result.page,
            size: result.size,
            totalElements: result.totalElements,
            totalPages: result.totalPages,
            isFirst: result.isFirst,
            isLast: result.isLast,
          },
          statistics: {
            totalIncome: result.totalIncome,
            totalExpense: result.totalExpense,
            balance: result.balance,
            count: result.transactionCount,
          },
          transactions: result.transactions.map((tx: any) => ({
            id: tx.id,
            name: tx.name,
            description: tx.description,
            amount: tx.amount,
            type: tx.type,
            typeName: tx.type === 'INCOME' ? '收入' : '支出',
            transactionDateTime: tx.transactionDateTime,
            ledgerName: tx.ledgerName,
            categoryName: tx.categoryName,
            categoryIcon: tx.categoryIcon,
            paymentMethodName: tx.paymentMethodName,
          })),
        };

        return JSON.stringify(summary, null, 2);
      } else {
        return JSON.stringify({
          success: false,
          message: data.message || "查询失败",
        });
      }
    } catch (error) {
      console.error('❌ [queryAgentTransactionsTool] Error:', error);
      return JSON.stringify({
        success: false,
        message: `请求出错: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  },
});

/**
 * 搜索交易 - Agent 专用
 * 对应后端: GET /api/agent/transactions/search
 * 通过关键词快速搜索交易
 */
export const searchTransactionsTool = new DynamicStructuredTool({
  name: "search_transactions",
  description: "通过关键词搜索交易，匹配交易描述。返回完整交易信息。",
  schema: z.object({
    keyword: z.string().describe("搜索关键词"),
    ledgerId: z.number().optional().describe("限定在某个账本内搜索（可选）"),
    page: z.number().default(0).describe("页码，从0开始"),
    size: z.number().default(20).describe("每页数量"),
  }),
  func: async ({ keyword, ledgerId, page, size }) => {
    console.log('🔧 [searchTransactionsTool] Called with:', { keyword, ledgerId, page, size });
    try {
      const headers = await getAuthHeaders();

      const url = new URL(`${API_BASE_URL}/api/agent/transactions/search`);
      url.searchParams.append('keyword', keyword);
      if (ledgerId) url.searchParams.append('ledgerId', ledgerId.toString());
      url.searchParams.append('page', page.toString());
      url.searchParams.append('size', size.toString());

      const response = await fetchWithTimeout(url.toString(), { headers, timeout: TIMEOUT_CONFIG.API_REQUEST });
      const data = await response.json();
      console.log('📥 [searchTransactionsTool] Response:', data);

      if (data.code === 200 && data.data) {
        const result = data.data;
        return JSON.stringify({
          success: true,
          keyword,
          message: `搜索"${keyword}"找到 ${result.totalElements} 条交易`,
          pagination: {
            page: result.page,
            totalElements: result.totalElements,
            totalPages: result.totalPages,
          },
          transactions: result.transactions.map((tx: any) => ({
            id: tx.id,
            description: tx.description,
            amount: tx.amount,
            type: tx.type,
            typeName: tx.type === 'INCOME' ? '收入' : '支出',
            transactionDateTime: tx.transactionDateTime,
            ledgerName: tx.ledgerName,
            categoryName: tx.categoryName,
          })),
        }, null, 2);
      } else {
        return JSON.stringify({
          success: false,
          message: data.message || "搜索失败",
        });
      }
    } catch (error) {
      console.error('❌ [searchTransactionsTool] Error:', error);
      return JSON.stringify({
        success: false,
        message: `请求出错: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  },
});

/**
 * 获取最近交易 - Agent 专用
 * 对应后端: GET /api/agent/transactions/recent
 * 快速获取最近的交易记录
 */
export const getRecentTransactionsTool = new DynamicStructuredTool({
  name: "get_recent_transactions",
  description: "快速获取最近的交易记录，默认返回最近10条。适合用户询问'最近的交易'、'今天的记录'等场景。",
  schema: z.object({
    ledgerId: z.number().optional().describe("账本ID（可选，不填则查询用户所有账本）"),
    limit: z.number().default(10).describe("返回数量，最大50"),
  }),
  func: async ({ ledgerId, limit }) => {
    console.log('🔧 [getRecentTransactionsTool] Called with:', { ledgerId, limit });
    try {
      const headers = await getAuthHeaders();

      const url = new URL(`${API_BASE_URL}/api/agent/transactions/recent`);
      if (ledgerId) url.searchParams.append('ledgerId', ledgerId.toString());
      url.searchParams.append('limit', Math.min(limit, 50).toString());

      const response = await fetchWithTimeout(url.toString(), { headers, timeout: TIMEOUT_CONFIG.API_REQUEST });
      const data = await response.json();
      console.log('📥 [getRecentTransactionsTool] Response:', data);

      if (data.code === 200 && data.data) {
        const transactions = data.data;

        // 计算汇总
        let totalIncome = 0;
        let totalExpense = 0;
        transactions.forEach((tx: any) => {
          if (tx.type === 'INCOME') {
            totalIncome += tx.amount;
          } else {
            totalExpense += tx.amount;
          }
        });

        return JSON.stringify({
          success: true,
          message: `最近 ${transactions.length} 条交易记录`,
          statistics: {
            totalIncome,
            totalExpense,
            balance: totalIncome - totalExpense,
            count: transactions.length,
          },
          transactions: transactions.map((tx: any) => ({
            id: tx.id,
            description: tx.description,
            amount: tx.amount,
            type: tx.type,
            typeName: tx.type === 'INCOME' ? '收入' : '支出',
            transactionDateTime: tx.transactionDateTime,
            ledgerName: tx.ledgerName,
            categoryName: tx.categoryName,
            categoryIcon: tx.categoryIcon,
            paymentMethodName: tx.paymentMethodName,
          })),
        }, null, 2);
      } else {
        return JSON.stringify({
          success: false,
          message: data.message || "获取最近交易失败",
        });
      }
    } catch (error) {
      console.error('❌ [getRecentTransactionsTool] Error:', error);
      return JSON.stringify({
        success: false,
        message: `请求出错: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  },
});

export const tools = [
  createTransactionTool,
  queryTransactionsTool,
  statisticsTool,
  getTransactionDetailTool,
  queryAgentTransactionsTool,
  searchTransactionsTool,
  getRecentTransactionsTool,
];

// 导出扩展工具
export { agentExtendedTools } from './agentExtendedTools';
