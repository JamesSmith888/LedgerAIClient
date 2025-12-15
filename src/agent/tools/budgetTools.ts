import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { budgetAPI } from "../../api/services/budgetAPI";
import { categoryAPI } from "../../api/services/categoryAPI";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

/**
 * 获取预算概览工具
 */
export const getBudgetOverviewTool = new DynamicStructuredTool({
  name: "get_budget_overview",
  description: "获取当前账本的预算概览，包括总预算、已用金额、剩余金额以及各分类的预算执行情况。",
  schema: z.object({
    ledgerId: z.number().optional().describe("账本ID，不填则使用当前账本"),
  }),
  func: async ({ ledgerId }) => {
    const targetLedgerId = ledgerId || await getCurrentLedgerId();
    if (!targetLedgerId) {
      return JSON.stringify({ error: "请先选择账本" });
    }

    try {
      const overview = await budgetAPI.getBudgetOverview(targetLedgerId);
      if (!overview) {
        return JSON.stringify({ message: "当前账本尚未设置预算" });
      }
      return JSON.stringify(overview);
    } catch (error) {
      return JSON.stringify({ error: `获取预算失败: ${error}` });
    }
  },
});

/**
 * 设置预算工具
 */
export const setBudgetTool = new DynamicStructuredTool({
  name: "set_budget",
  description: "设置账本的月度预算。可以设置总预算，也可以同时设置各分类的预算。如果提供了分类名称，会自动查找对应的分类ID。",
  schema: z.object({
    ledgerId: z.number().optional().describe("账本ID，不填则使用当前账本"),
    totalAmount: z.number().describe("月度总预算金额"),
    categoryBudgets: z.array(z.object({
      categoryId: z.number().optional().describe("分类ID"),
      categoryName: z.string().optional().describe("分类名称（如果不知道ID，可以提供名称）"),
      amount: z.number().describe("该分类的预算金额"),
    })).optional().describe("分类预算列表"),
  }),
  func: async ({ ledgerId, totalAmount, categoryBudgets }) => {
    const targetLedgerId = ledgerId || await getCurrentLedgerId();
    if (!targetLedgerId) {
      return JSON.stringify({ error: "请先选择账本" });
    }

    try {
      let resolvedCategoryBudgets: { categoryId: number; amount: number }[] = [];

      if (categoryBudgets && categoryBudgets.length > 0) {
        // 获取所有分类以进行名称匹配
        const allCategories = await categoryAPI.getAll();
        
        for (const item of categoryBudgets) {
          let catId = item.categoryId;
          
          if (!catId && item.categoryName) {
            const matched = allCategories.find(c => c.name === item.categoryName);
            if (matched) {
              catId = matched.id;
            }
          }
          
          if (catId) {
            resolvedCategoryBudgets.push({ categoryId: catId, amount: item.amount });
          }
        }
      }

      await budgetAPI.setBudget({
        ledgerId: targetLedgerId,
        totalAmount,
        categoryBudgets: resolvedCategoryBudgets,
      });
      return JSON.stringify({ success: true, message: "预算设置成功" });
    } catch (error) {
      return JSON.stringify({ error: `设置预算失败: ${error}` });
    }
  },
});

export const budgetTools = [getBudgetOverviewTool, setBudgetTool];
