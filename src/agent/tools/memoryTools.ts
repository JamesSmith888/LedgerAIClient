/**
 * 用户偏好记忆工具
 * 
 * 让 AI 能够：
 * 1. 学习用户的纠正和偏好（如："青桔"是共享单车，不是水果）
 * 2. 查询已有的记忆
 * 3. 帮助 AI 更准确地理解用户意图
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { userPreferenceMemory, PreferenceType } from "../../services/userPreferenceMemory";

// 偏好类型枚举
const PreferenceTypeEnum = z.enum([
  "category_mapping",    // 分类映射：如"青桔" -> "交通"
  "merchant_alias",      // 商户别名：如"星巴" -> "星巴克"
  "amount_pattern",      // 金额模式：如"早餐通常15-30元"
  "payment_preference",  // 支付偏好：如"网购用支付宝"
  "custom_correction",   // 自定义纠正
]);

// 操作类型
const MemoryActionEnum = z.enum([
  "learn",   // 学习新的偏好
  "query",   // 查询已有偏好
  "list",    // 列出所有偏好
]);

/**
 * 用户偏好记忆工具
 * 
 * 用于学习和查询用户的个性化偏好
 */
export const userPreferenceMemoryTool = new DynamicStructuredTool({
  name: "user_memory",
  description: `用户偏好记忆工具，用于记录和查询用户的个性化习惯。

操作说明：
- learn: 学习新的偏好（当用户纠正理解时使用）
- query: 按关键词查询已有偏好
- list: 列出最近的偏好记录

偏好类型：
- category_mapping: 分类映射
- merchant_alias: 商户别名
- custom_correction: 自定义纠正`,
  schema: z.object({
    action: MemoryActionEnum.describe("操作类型：learn=学习新偏好，query=查询偏好，list=列出偏好"),
    // learn 操作参数
    type: PreferenceTypeEnum.optional().describe("偏好类型（learn时需要）"),
    keyword: z.string().optional().describe("触发关键词（learn/query时需要）"),
    correction: z.string().optional().describe("正确的理解/分类（learn时需要）"),
    note: z.string().optional().describe("补充说明（learn时可选）"),
    categoryId: z.number().optional().describe("关联的分类ID（如果是分类映射类型）"),
    // list 操作参数
    limit: z.number().optional().describe("返回数量限制（list时可选，默认10）"),
  }),
  func: async ({ action, type, keyword, correction, note, categoryId, limit }) => {
    try {
      switch (action) {
        case "learn": {
          // 验证必填参数
          if (!keyword || !correction) {
            return JSON.stringify({ 
              error: "学习偏好需要提供 keyword（关键词）和 correction（正确理解）" 
            });
          }

          const preferenceType: PreferenceType = type || "category_mapping";
          
          const item = await userPreferenceMemory.addPreference({
            type: preferenceType,
            keyword,
            correction,
            note,
            categoryId,
          });

          return JSON.stringify({
            success: true,
            message: `已记住：「${keyword}」→「${correction}」`,
            data: {
              id: item.id,
              keyword: item.keyword,
              correction: item.correction,
              type: item.type,
              note: item.note,
            },
          });
        }

        case "query": {
          if (!keyword) {
            return JSON.stringify({ error: "查询需要提供 keyword（关键词）" });
          }

          const item = await userPreferenceMemory.findPreference(keyword);
          
          if (item) {
            // 增加使用次数
            await userPreferenceMemory.incrementUsage(item.id);
            
            return JSON.stringify({
              success: true,
              found: true,
              data: {
                keyword: item.keyword,
                correction: item.correction,
                type: item.type,
                note: item.note,
                usageCount: item.usageCount + 1,
              },
              message: `找到记忆：「${item.keyword}」应理解为「${item.correction}」`,
            });
          } else {
            return JSON.stringify({
              success: true,
              found: false,
              message: `没有关于「${keyword}」的记忆`,
            });
          }
        }

        case "list": {
          const preferences = await userPreferenceMemory.getActivePreferences();
          const limitNum = limit || 10;
          
          // 按使用次数和更新时间排序
          const sorted = preferences
            .sort((a, b) => {
              // 先按使用次数降序
              if (b.usageCount !== a.usageCount) {
                return b.usageCount - a.usageCount;
              }
              // 再按更新时间降序
              return b.updatedAt - a.updatedAt;
            })
            .slice(0, limitNum);

          const stats = await userPreferenceMemory.getStats();

          return JSON.stringify({
            success: true,
            total: stats.total,
            enabled: stats.enabled,
            data: sorted.map(item => ({
              keyword: item.keyword,
              correction: item.correction,
              type: item.type,
              note: item.note,
              usageCount: item.usageCount,
            })),
          });
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

// 导出
export const memoryTools = [
  userPreferenceMemoryTool,
];
