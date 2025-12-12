/**
 * Agent 扩展工具
 * 
 * 包含修改、删除、批量操作、统计报表等增强功能
 * 对应后端 AgentController 的扩展 API
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../../api/config";
import { fetchWithTimeout, TIMEOUT_CONFIG } from "../utils";
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
 * 更新/修改交易工具
 * 对应后端: PUT /api/agent/transactions/{id}
 */
export const updateTransactionTool = new DynamicStructuredTool({
  name: "update_transaction",
  description: "修改已有的交易记录。只需要提供需要修改的字段，未提供的字段保持不变。",
  schema: z.object({
    id: z.number().describe("要修改的交易ID"),
    description: z.string().optional().describe("新的交易描述"),
    amount: z.number().optional().describe("新的交易金额"),
    type: z.enum(["INCOME", "EXPENSE"]).optional().describe("新的交易类型"),
    categoryId: z.number().optional().describe("新的分类ID"),
    paymentMethodId: z.number().optional().describe("新的支付方式ID"),
    transactionDateTime: z.string().optional().describe("新的交易时间，ISO格式"),
  }),
  func: async (params) => {
    console.log('🔧 [updateTransactionTool] Called with:', params);
    try {
      const headers = await getAuthHeaders();

      const response = await fetchWithTimeout(`${API_BASE_URL}/api/agent/transactions/${params.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(params),
        timeout: TIMEOUT_CONFIG.API_REQUEST,
      });

      const data = await response.json();
      console.log('📥 [updateTransactionTool] Response:', data);

      if (data.code === 200 && data.data) {
        const tx = data.data;
        return JSON.stringify({
          success: true,
          message: "交易修改成功",
          transaction: {
            id: tx.id,
            description: tx.description,
            amount: tx.amount,
            type: tx.type,
            typeName: tx.type === 'INCOME' ? '收入' : '支出',
            transactionDateTime: tx.transactionDateTime,
            categoryName: tx.categoryName,
            paymentMethodName: tx.paymentMethodName,
          }
        }, null, 2);
      } else {
        return JSON.stringify({
          success: false,
          message: data.message || "修改失败",
        });
      }
    } catch (error) {
      console.error('❌ [updateTransactionTool] Error:', error);
      return JSON.stringify({
        success: false,
        message: `请求出错: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  },
});

/**
 * 删除交易工具
 * 对应后端: DELETE /api/agent/transactions/{id}
 */
export const deleteTransactionTool = new DynamicStructuredTool({
  name: "delete_transaction",
  description: "删除一条交易记录。这是逻辑删除，数据可以恢复。删除前请确认用户意图。",
  schema: z.object({
    id: z.number().describe("要删除的交易ID"),
  }),
  func: async ({ id }) => {
    console.log('🔧 [deleteTransactionTool] Called with:', { id });
    try {
      const headers = await getAuthHeaders();

      const response = await fetchWithTimeout(`${API_BASE_URL}/api/agent/transactions/${id}`, {
        method: 'DELETE',
        headers,
        timeout: TIMEOUT_CONFIG.API_REQUEST,
      });

      const data = await response.json();
      console.log('📥 [deleteTransactionTool] Response:', data);

      if (data.code === 200) {
        return JSON.stringify({
          success: true,
          message: `交易 #${id} 已删除`,
        });
      } else {
        return JSON.stringify({
          success: false,
          message: data.message || "删除失败",
        });
      }
    } catch (error) {
      console.error('❌ [deleteTransactionTool] Error:', error);
      return JSON.stringify({
        success: false,
        message: `请求出错: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  },
});

/**
 * 批量创建交易工具
 * 对应后端: POST /api/agent/transactions/batch-create
 * 
 * 适用场景：
 * - 用户提供多笔交易（如"帮我记一下：午餐35，晚餐42，打车15"）
 * - 从图片/文字批量导入交易
 */
export const batchCreateTransactionsTool = new DynamicStructuredTool({
  name: "batch_create_transactions",
  description: "批量创建多笔交易记录。适合用户一次性提供多笔交易的场景，如'记一下今天的开销：午餐35，晚餐42，打车15'。单次最多创建50条。",
  schema: z.object({
    ledgerId: z.number().describe("账本ID"),
    transactions: z.array(z.object({
      description: z.string().describe("交易描述"),
      amount: z.number().describe("交易金额"),
      type: z.enum(["INCOME", "EXPENSE"]).describe("交易类型"),
      categoryId: z.number().optional().describe("分类ID"),
      paymentMethodId: z.number().optional().describe("支付方式ID"),
      transactionDateTime: z.string().optional().describe("交易时间，ISO格式"),
    })).describe("交易列表"),
  }),
  func: async ({ ledgerId, transactions }) => {
    console.log('🔧 [batchCreateTransactionsTool] Called with:', { ledgerId, count: transactions.length });
    try {
      const headers = await getAuthHeaders();

      const response = await fetchWithTimeout(`${API_BASE_URL}/api/agent/transactions/batch-create`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ledgerId, transactions }),
        timeout: TIMEOUT_CONFIG.API_REQUEST * 2, // 批量操作给更长时间
      });

      const data = await response.json();
      console.log('📥 [batchCreateTransactionsTool] Response:', data);

      if (data.code === 200 && data.data) {
        const result = data.data;
        return JSON.stringify({
          success: true,
          message: result.message,
          summary: {
            successCount: result.successCount,
            failedCount: result.failedCount,
          },
          successItems: result.successItems?.map((tx: any) => ({
            id: tx.id,
            description: tx.description,
            amount: tx.amount,
            type: tx.type,
          })),
          failedItems: result.failedItems,
        }, null, 2);
      } else {
        return JSON.stringify({
          success: false,
          message: data.message || "批量创建失败",
        });
      }
    } catch (error) {
      console.error('❌ [batchCreateTransactionsTool] Error:', error);
      return JSON.stringify({
        success: false,
        message: `请求出错: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  },
});

/**
 * 统计报表工具
 * 对应后端: GET /api/agent/statistics
 * 
 * 返回详细的统计数据，包括：
 * - 收支汇总
 * - 按分类统计（占比分析）
 */
export const getStatisticsReportTool = new DynamicStructuredTool({
  name: "get_statistics_report",
  description: "获取详细统计报表，包括收支汇总和各分类的占比分析。适合用户询问'本月花了多少'、'支出主要在哪些方面'等场景。",
  schema: z.object({
    ledgerId: z.number().optional().describe("账本ID（可选，不填则查询所有账本）"),
    startTime: z.string().describe("开始时间，格式如 2024-01-01 或 2024-01-01T00:00:00"),
    endTime: z.string().describe("结束时间，格式如 2024-01-31 或 2024-01-31T23:59:59"),
    type: z.enum(["INCOME", "EXPENSE"]).optional().describe("仅统计收入或支出（可选）"),
  }),
  func: async ({ ledgerId, startTime, endTime, type }) => {
    console.log('🔧 [getStatisticsReportTool] Called with:', { ledgerId, startTime, endTime, type });
    try {
      const headers = await getAuthHeaders();

      const url = new URL(`${API_BASE_URL}/api/agent/statistics`);
      if (ledgerId) url.searchParams.append('ledgerId', ledgerId.toString());
      url.searchParams.append('startTime', startTime);
      url.searchParams.append('endTime', endTime);
      if (type) url.searchParams.append('type', type);

      const response = await fetchWithTimeout(url.toString(), { 
        headers, 
        timeout: TIMEOUT_CONFIG.API_REQUEST 
      });

      const data = await response.json();
      console.log('📥 [getStatisticsReportTool] Response:', data);

      if (data.code === 200 && data.data) {
        const stats = data.data;
        
        // 格式化分类统计
        const categoryBreakdown = stats.categoryStats?.map((cat: any) => ({
          name: cat.categoryName,
          icon: cat.categoryIcon,
          amount: cat.amount,
          count: cat.count,
          percentage: `${cat.percentage.toFixed(1)}%`,
        })) || [];

        return JSON.stringify({
          success: true,
          message: `统计周期：${stats.startTime} ~ ${stats.endTime}`,
          summary: {
            totalIncome: stats.totalIncome,
            totalExpense: stats.totalExpense,
            balance: stats.balance,
            transactionCount: stats.transactionCount,
          },
          categoryBreakdown,
        }, null, 2);
      } else {
        return JSON.stringify({
          success: false,
          message: data.message || "获取统计失败",
        });
      }
    } catch (error) {
      console.error('❌ [getStatisticsReportTool] Error:', error);
      return JSON.stringify({
        success: false,
        message: `请求出错: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  },
});

/**
 * 获取分类列表（Agent 专用）
 * 对应后端: GET /api/agent/categories
 */
export const getAgentCategoriesTool = new DynamicStructuredTool({
  name: "get_agent_categories",
  description: "获取所有可用的交易分类列表。可以按类型筛选收入分类或支出分类。",
  schema: z.object({
    ledgerId: z.number().optional().describe("账本ID（可选）"),
    type: z.enum(["INCOME", "EXPENSE"]).optional().describe("筛选分类类型：收入或支出"),
  }),
  func: async ({ ledgerId, type }) => {
    console.log('🔧 [getAgentCategoriesTool] Called with:', { ledgerId, type });
    try {
      const headers = await getAuthHeaders();

      const url = new URL(`${API_BASE_URL}/api/agent/categories`);
      if (ledgerId) url.searchParams.append('ledgerId', ledgerId.toString());
      if (type) url.searchParams.append('type', type);

      const response = await fetchWithTimeout(url.toString(), { 
        headers, 
        timeout: TIMEOUT_CONFIG.API_REQUEST 
      });

      const data = await response.json();
      console.log('📥 [getAgentCategoriesTool] Response:', data);

      if (data.code === 200 && data.data) {
        const categories = data.data.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          icon: cat.icon,
          type: cat.typeName,
        }));

        return JSON.stringify({
          success: true,
          message: `找到 ${categories.length} 个分类`,
          categories,
        }, null, 2);
      } else {
        return JSON.stringify({
          success: false,
          message: data.message || "获取分类失败",
        });
      }
    } catch (error) {
      console.error('❌ [getAgentCategoriesTool] Error:', error);
      return JSON.stringify({
        success: false,
        message: `请求出错: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  },
});

/**
 * 创建分类工具
 * 对应后端: POST /api/agent/categories
 */
export const createCategoryTool = new DynamicStructuredTool({
  name: "create_category",
  description: "创建新的交易分类。当用户要记账但找不到合适的分类时，可以帮用户创建新分类。",
  schema: z.object({
    name: z.string().describe("分类名称，如'健身房'、'宠物'等"),
    icon: z.string().optional().describe("分类图标（emoji 或 ionicons 名称如：ionicons:chatbubble、ionicons:wallet、ionicons:gift等）"),
    type: z.enum(["INCOME", "EXPENSE"]).describe("分类类型：INCOME收入 或 EXPENSE支出"),
    ledgerId: z.number().optional().describe("所属账本ID（可选）"),
  }),
  func: async ({ name, icon, type, ledgerId }) => {
    console.log('🔧 [createCategoryTool] Called with:', { name, icon, type, ledgerId });
    try {
      const headers = await getAuthHeaders();

      const response = await fetchWithTimeout(`${API_BASE_URL}/api/agent/categories`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name, icon: icon || '📁', type, ledgerId }),
        timeout: TIMEOUT_CONFIG.API_REQUEST,
      });

      const data = await response.json();
      console.log('📥 [createCategoryTool] Response:', data);

      if (data.code === 200 && data.data) {
        const cat = data.data;
        
        // 发送分类变更事件，通知 CategoryContext 刷新
        appEventEmitter.emit(AppEvents.CATEGORY_CHANGED);
        console.log('[createCategoryTool] 分类创建成功，已发送刷新事件');
        
        return JSON.stringify({
          success: true,
          message: `分类"${cat.name}"创建成功`,
          category: {
            id: cat.id,
            name: cat.name,
            icon: cat.icon,
            type: cat.typeName,
          }
        }, null, 2);
      } else {
        return JSON.stringify({
          success: false,
          message: data.message || "创建分类失败",
        });
      }
    } catch (error) {
      console.error('❌ [createCategoryTool] Error:', error);
      return JSON.stringify({
        success: false,
        message: `请求出错: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  },
});

/**
 * 获取支付方式列表（Agent 专用）
 * 对应后端: GET /api/agent/payment-methods
 */
export const getAgentPaymentMethodsTool = new DynamicStructuredTool({
  name: "get_agent_payment_methods",
  description: "获取用户的所有支付方式列表。",
  schema: z.object({}),
  func: async () => {
    console.log('🔧 [getAgentPaymentMethodsTool] Called');
    try {
      const headers = await getAuthHeaders();

      const response = await fetchWithTimeout(`${API_BASE_URL}/api/agent/payment-methods`, { 
        headers, 
        timeout: TIMEOUT_CONFIG.API_REQUEST 
      });

      const data = await response.json();
      console.log('📥 [getAgentPaymentMethodsTool] Response:', data);

      if (data.code === 200 && data.data) {
        const methods = data.data.map((m: any) => ({
          id: m.id,
          name: m.name,
          icon: m.icon,
          isDefault: m.isDefault,
        }));

        return JSON.stringify({
          success: true,
          message: `找到 ${methods.length} 个支付方式`,
          paymentMethods: methods,
        }, null, 2);
      } else {
        return JSON.stringify({
          success: false,
          message: data.message || "获取支付方式失败",
        });
      }
    } catch (error) {
      console.error('❌ [getAgentPaymentMethodsTool] Error:', error);
      return JSON.stringify({
        success: false,
        message: `请求出错: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  },
});

/**
 * 创建支付方式工具
 * 对应后端: POST /api/agent/payment-methods
 */
export const createPaymentMethodTool = new DynamicStructuredTool({
  name: "create_payment_method",
  description: "创建新的支付方式。当用户的支付方式不在列表中时，可以帮用户创建。",
  schema: z.object({
    name: z.string().describe("支付方式名称，如'京东白条'、'花呗'等"),
    icon: z.string().optional().describe("支付方式图标（emoji）"),
  }),
  func: async ({ name, icon }) => {
    console.log('🔧 [createPaymentMethodTool] Called with:', { name, icon });
    try {
      const headers = await getAuthHeaders();

      const url = new URL(`${API_BASE_URL}/api/agent/payment-methods`);
      url.searchParams.append('name', name);
      if (icon) url.searchParams.append('icon', icon);

      const response = await fetchWithTimeout(url.toString(), {
        method: 'POST',
        headers,
        timeout: TIMEOUT_CONFIG.API_REQUEST,
      });

      const data = await response.json();
      console.log('📥 [createPaymentMethodTool] Response:', data);

      if (data.code === 200 && data.data) {
        const method = data.data;
        return JSON.stringify({
          success: true,
          message: `支付方式"${method.name}"创建成功`,
          paymentMethod: {
            id: method.id,
            name: method.name,
            icon: method.icon,
          }
        }, null, 2);
      } else {
        return JSON.stringify({
          success: false,
          message: data.message || "创建支付方式失败",
        });
      }
    } catch (error) {
      console.error('❌ [createPaymentMethodTool] Error:', error);
      return JSON.stringify({
        success: false,
        message: `请求出错: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  },
});

/**
 * 导出所有扩展工具
 */
export const agentExtendedTools = [
  updateTransactionTool,
  deleteTransactionTool,
  batchCreateTransactionsTool,
  getStatisticsReportTool,
  getAgentCategoriesTool,
  createCategoryTool,
  getAgentPaymentMethodsTool,
  createPaymentMethodTool,
];
