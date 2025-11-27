/**
 * API Tools - 后端接口查询工具
 * 
 * 这些工具让 AI Agent 能够从后端获取数据
 * 例如:分类列表、账本详情等
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../../api/config";
import { fetchWithTimeout, TIMEOUT_CONFIG } from "../utils";

/**
 * 获取认证 Headers
 */
async function getAuthHeaders() {
  const token = await AsyncStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
}

/**
 * 获取账本的所有分类
 */
export const getCategoriesToolByLedgerId = new DynamicStructuredTool({
  name: "get_categories",
  description: "获取指定账本的所有交易分类列表。",
  schema: z.object({
    ledgerId: z.number().describe("账本ID"),
  }),
  func: async ({ ledgerId }) => {
    console.log(`🔍 [getCategoriesToolByLedgerId] Fetching categories for ledger ${ledgerId}`);
    
    try {
      const headers = await getAuthHeaders();
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/categories/ledger/${ledgerId}`,
        { headers, timeout: TIMEOUT_CONFIG.API_REQUEST }
      );
      
      const data = await response.json();
      
      if (data.code === 200 && data.data) {
        const categories = data.data.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          type: cat.type, // INCOME 或 EXPENSE
          icon: cat.icon,
        }));
        
        console.log(`✅ [getCategoriesToolByLedgerId] Found ${categories.length} categories`);
        
        return JSON.stringify({
          ledgerId,
          total: categories.length,
          categories,
        }, null, 2);
      } else {
        return `获取分类失败: ${data.message || '未知错误'}`;
      }
    } catch (error) {
      console.error('❌ [getCategoriesToolByLedgerId] Error:', error);
      return `请求出错: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
});

/**
 * 获取账本详细信息
 */
export const getLedgerDetailTool = new DynamicStructuredTool({
  name: "get_ledger_detail",
  description: "获取指定账本的详细信息,包括成员、权限等。",
  schema: z.object({
    ledgerId: z.number().describe("账本ID"),
  }),
  func: async ({ ledgerId }) => {
    console.log(`🔍 [getLedgerDetailTool] Fetching ledger ${ledgerId}`);
    
    try {
      const headers = await getAuthHeaders();
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/ledgers/${ledgerId}`,
        { headers, timeout: TIMEOUT_CONFIG.API_REQUEST }
      );
      
      const data = await response.json();
      
      if (data.code === 200 && data.data) {
        console.log(`✅ [getLedgerDetailTool] Ledger fetched successfully`);
        return JSON.stringify(data.data, null, 2);
      } else {
        return `获取账本失败: ${data.message || '未知错误'}`;
      }
    } catch (error) {
      console.error('❌ [getLedgerDetailTool] Error:', error);
      return `请求出错: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
});

/**
 * 搜索分类 (支持模糊匹配)
 * 搜索逻辑：
 * 1. 精确匹配：分类名包含关键词
 * 2. 模糊匹配：关键词包含在分类名中，或分类名包含关键词的任意字符
 * 3. 返回建议分类列表供参考
 */
export const searchCategoryTool = new DynamicStructuredTool({
  name: "search_category",
  description: "根据关键词搜索分类。支持模糊匹配，如搜索'午餐'可能匹配到'餐饮'分类。如果搜不到，尝试用更简短或更广泛的关键词。",
  schema: z.object({
    ledgerId: z.number().describe("账本ID"),
    categoryName: z.string().describe("分类名称关键词，建议使用简短关键词如'餐'、'交通'、'娱乐'"),
  }),
  func: async ({ ledgerId, categoryName }) => {
    console.log(`🔍 [searchCategoryTool] Searching category '${categoryName}' in ledger ${ledgerId}`);
    
    try {
      const headers = await getAuthHeaders();
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/categories/ledger/${ledgerId}`,
        { headers, timeout: TIMEOUT_CONFIG.API_REQUEST }
      );
      
      const data = await response.json();
      
      if (data.code === 200 && data.data) {
        const allCategories = data.data;
        const keyword = categoryName.toLowerCase();
        
        // 1. 精确匹配：分类名包含关键词
        let matched = allCategories.filter((cat: any) => 
          cat.name && cat.name.toLowerCase().includes(keyword)
        );
        
        // 2. 模糊匹配：关键词的任意字符在分类名中
        if (matched.length === 0) {
          matched = allCategories.filter((cat: any) => {
            if (!cat.name) return false;
            const catName = cat.name.toLowerCase();
            // 检查关键词的每个字是否在分类名中
            return [...keyword].some(char => catName.includes(char));
          });
        }
        
        console.log(`✅ [searchCategoryTool] Found ${matched.length} matching categories`);
        
        if (matched.length === 0) {
          // 返回所有可用分类供参考
          const expenseCategories = allCategories
            .filter((cat: any) => cat.type === 'EXPENSE')
            .slice(0, 10)
            .map((cat: any) => cat.name);
          const incomeCategories = allCategories
            .filter((cat: any) => cat.type === 'INCOME')
            .slice(0, 5)
            .map((cat: any) => cat.name);
            
          return JSON.stringify({
            found: false,
            keyword: categoryName,
            message: `没有找到匹配 '${categoryName}' 的分类`,
            suggestion: "请尝试使用以下分类名称搜索，或调用 get_categories 获取完整列表",
            availableExpenseCategories: expenseCategories,
            availableIncomeCategories: incomeCategories,
          }, null, 2);
        }
        
        return JSON.stringify({
          found: true,
          keyword: categoryName,
          total: matched.length,
          categories: matched.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            type: cat.type,
            icon: cat.icon,
          })),
        }, null, 2);
      } else {
        return `搜索失败: ${data.message || '未知错误'}`;
      }
    } catch (error) {
      console.error('❌ [searchCategoryTool] Error:', error);
      return `请求出错: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
});

/**
 * 获取支付方式列表
 */
export const getPaymentMethodsTool = new DynamicStructuredTool({
  name: "get_payment_methods",
  description: "获取当前用户的所有支付方式列表，包括默认支付方式。",
  schema: z.object({}),
  func: async () => {
    console.log(`🔍 [getPaymentMethodsTool] Fetching payment methods`);
    
    try {
      const headers = await getAuthHeaders();
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/payment-methods`,
        { headers, timeout: TIMEOUT_CONFIG.API_REQUEST }
      );
      
      const data = await response.json();
      
      if (data.code === 200 && data.data) {
        const methods = data.data.map((m: any) => ({
          id: m.id,
          name: m.name,
          icon: m.icon,
          isDefault: m.isDefault || false,
        }));
        
        const defaultMethod = methods.find((m: any) => m.isDefault);
        
        console.log(`✅ [getPaymentMethodsTool] Found ${methods.length} payment methods`);
        
        return JSON.stringify({
          total: methods.length,
          defaultPaymentMethod: defaultMethod || null,
          paymentMethods: methods,
        }, null, 2);
      } else {
        return `获取支付方式失败: ${data.message || '未知错误'}`;
      }
    } catch (error) {
      console.error('❌ [getPaymentMethodsTool] Error:', error);
      return `请求出错: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
});

export const apiTools = [
  getCategoriesToolByLedgerId,
  getLedgerDetailTool,
  searchCategoryTool,
  getPaymentMethodsTool,
];
