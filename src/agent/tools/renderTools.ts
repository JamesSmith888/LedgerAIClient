/**
 * Render Tools - 用于在对话中渲染富内容的工具
 * 
 * 这些工具让 AI Agent 可以返回结构化数据，
 * 前端会自动将其渲染为对应的嵌入式组件
 * 
 * 设计理念：
 * 1. AI 调用 render_xxx 工具返回特定格式的数据
 * 2. 消息内容包含特殊标记，如 [EMBED:transaction_list:{...}]
 * 3. MessageBubble 解析标记并渲染对应组件
 * 
 * 组件分类：
 * - 基础组件：交易列表、交易详情、统计卡片、操作按钮
 * - 增强组件：动态卡片、键值对列表、进度卡片、对比卡片、饼图、柱状图
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

// ========== 公共 Schema 定义 ==========

/**
 * 智能建议 Schema
 * 用于在渲染结果的同时提供后续操作建议
 * 这些建议会显示在输入框上方的智能建议栏中
 */
const suggestedActionSchema = z.object({
  label: z.string().describe("建议按钮的显示文本，如'添加新交易'、'查看详情'"),
  message: z.string().describe("点击后发送的消息内容"),
});

/**
 * 可选的智能建议数组 Schema
 * 添加到需要支持智能建议的渲染工具中
 */
const suggestedActionsSchema = z.array(suggestedActionSchema)
  .max(5)
  .optional()
  .describe("后续操作建议列表（可选，最多5个），会显示在输入框上方供用户快速选择");

// 嵌入内容类型
export type EmbedType = 
  // 基础组件
  | 'transaction_list'    // 交易列表
  | 'transaction_detail'  // 交易详情
  | 'result_message'      // 操作结果消息
  | 'statistics_card'     // 统计卡片
  | 'action_buttons'      // 操作按钮
  // 增强组件
  | 'dynamic_card'        // 通用动态卡片
  | 'key_value_list'      // 键值对列表
  | 'progress_card'       // 进度卡片
  | 'comparison_card'     // 对比卡片
  | 'pie_chart'           // 饼图
  | 'bar_chart';          // 柱状图

// 嵌入内容标记格式
export const EMBED_MARKER_PREFIX = '[EMBED:';
export const EMBED_MARKER_SUFFIX = ']';

/**
 * 生成嵌入内容标记
 * 供前端解析并渲染对应组件
 */
export function createEmbedMarker(type: EmbedType, data: any): string {
  const jsonData = JSON.stringify(data);
  return `${EMBED_MARKER_PREFIX}${type}:${jsonData}${EMBED_MARKER_SUFFIX}`;
}

/**
 * 解析嵌入内容标记
 * 使用平衡括号匹配来正确解析嵌套的 JSON
 * @returns 解析结果数组，每个元素包含 type 和 data
 */
export function parseEmbedMarkers(content: string): Array<{
  type: EmbedType;
  data: any;
  fullMatch: string;
  startIndex: number;
  endIndex: number;
}> {
  const results: Array<{
    type: EmbedType;
    data: any;
    fullMatch: string;
    startIndex: number;
    endIndex: number;
  }> = [];
  
  // 查找所有 [EMBED:type: 的起始位置
  const prefix = '[EMBED:';
  let searchStart = 0;
  
  while (true) {
    const startIndex = content.indexOf(prefix, searchStart);
    if (startIndex === -1) break;
    
    // 找到类型名称
    const typeStart = startIndex + prefix.length;
    const colonIndex = content.indexOf(':', typeStart);
    if (colonIndex === -1) {
      searchStart = typeStart;
      continue;
    }
    
    const type = content.substring(typeStart, colonIndex) as EmbedType;
    
    // 找到 JSON 开始位置
    const jsonStart = colonIndex + 1;
    if (content[jsonStart] !== '{') {
      searchStart = jsonStart;
      continue;
    }
    
    // 使用括号平衡来找到 JSON 结束位置
    let braceCount = 0;
    let jsonEnd = -1;
    let inString = false;
    let escapeNext = false;
    
    for (let i = jsonStart; i < content.length; i++) {
      const char = content[i];
      
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      
      if (char === '\\' && inString) {
        escapeNext = true;
        continue;
      }
      
      if (char === '"') {
        inString = !inString;
        continue;
      }
      
      if (inString) continue;
      
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          jsonEnd = i;
          break;
        }
      }
    }
    
    if (jsonEnd === -1) {
      searchStart = jsonStart;
      continue;
    }
    
    // 检查是否以 ] 结尾
    if (content[jsonEnd + 1] !== ']') {
      searchStart = jsonEnd + 1;
      continue;
    }
    
    const jsonStr = content.substring(jsonStart, jsonEnd + 1);
    const fullMatch = content.substring(startIndex, jsonEnd + 2); // +2 包含结尾的 ]
    
    try {
      const data = JSON.parse(jsonStr);
      results.push({
        type,
        data,
        fullMatch,
        startIndex,
        endIndex: jsonEnd + 2,
      });
    } catch (e) {
      console.warn('Failed to parse embed marker JSON:', jsonStr.substring(0, 100), e);
    }
    
    searchStart = jsonEnd + 2;
  }
  
  return results;
}

/**
 * 检查内容是否包含嵌入标记
 */
export function hasEmbedMarkers(content: string): boolean {
  return content.includes(EMBED_MARKER_PREFIX);
}

/**
 * 渲染交易列表工具
 * AI 调用此工具将交易数据转换为可渲染的格式
 */
export const renderTransactionListTool = new DynamicStructuredTool({
  name: "render_transaction_list",
  description: `【交易列表展示】将多条交易数据渲染为可视化列表。

⚠️ 必须提供 transactions 数组，否则会报错！

✅ 适用场景：
- 查询交易列表（按条件筛选、搜索等）
- 展示某个时间段的账单
- 显示某个分类下的所有交易

❌ 不适用场景：
- 单条交易创建/修改后（应使用 render_transaction_detail）
- 删除成功等操作提示（应使用 render_result_message）
- 分类管理结果（应使用 render_dynamic_card）

💡 可选：提供 suggestedActions 在列表下方显示后续操作建议按钮。`,
  schema: z.object({
    title: z.string().optional().describe("列表标题，如'最近交易'、'本月支出'"),
    message: z.string().optional().describe("提示信息"),
    transactions: z.array(z.object({
      id: z.number(),
      description: z.string().optional().nullable(),
      amount: z.number(),
      type: z.enum(['INCOME', 'EXPENSE']),
      transactionDateTime: z.string(),
      ledgerName: z.string().optional().nullable(),
      categoryName: z.string().optional().nullable(),
      categoryIcon: z.string().optional().nullable(),
      paymentMethodName: z.string().optional().nullable(),
    })).describe("交易记录列表"),
    statistics: z.object({
      totalIncome: z.number().optional().default(0).describe("总收入，默认0"),
      totalExpense: z.number().optional().default(0).describe("总支出，默认0"),
      balance: z.number().optional().describe("结余，可省略则自动计算"),
      count: z.number().optional().describe("交易笔数，可省略则自动计算"),
    }).optional().describe("汇总统计"),
    pagination: z.object({
      page: z.number(),
      totalElements: z.number(),
      totalPages: z.number(),
    }).optional().describe("分页信息"),
    suggestedActions: suggestedActionsSchema,
  }),
  func: async (input) => {
    console.log('🎨 [renderTransactionListTool] Rendering transaction list');
    if (input.suggestedActions?.length) {
      console.log('🎨 [renderTransactionListTool] With suggestions:', input.suggestedActions.length);
    }
    
    // 补全 statistics 中可能缺失的字段
    const data = { ...input };
    if (data.statistics) {
      const stats = data.statistics;
      stats.totalIncome = stats.totalIncome ?? 0;
      stats.totalExpense = stats.totalExpense ?? 0;
      stats.balance = stats.balance ?? (stats.totalIncome - stats.totalExpense);
      stats.count = stats.count ?? data.transactions.length;
    }
    
    // 直接返回 JSON 字符串，useAgentChat 会解析并创建 embedded 消息
    return JSON.stringify(data);
  },
});

/**
 * 渲染单条交易详情工具
 */
export const renderTransactionDetailTool = new DynamicStructuredTool({
  name: "render_transaction_detail",
  description: `【单条交易展示】将交易详情渲染为卡片展示。

⚠️ 必须提供完整的交易对象（id, amount, type, transactionDateTime 等）

适用场景：
- 创建交易成功后，展示新建的交易详情
- 修改交易成功后，展示更新后的交易详情
- 查询某条交易的完整信息

不适用场景：删除成功等无需展示交易详情的操作（请用 render_result_message）

💡 **必须**：提供 suggestedActions 数组（2-4个建议），在交易详情下方显示后续操作建议按钮。`,
  schema: z.object({
    id: z.number(),
    description: z.string().optional().nullable(),
    amount: z.number(),
    type: z.enum(['INCOME', 'EXPENSE']),
    transactionDateTime: z.string(),
    ledgerId: z.number().optional().nullable(),
    ledgerName: z.string().optional().nullable(),
    categoryId: z.number().optional().nullable(),
    categoryName: z.string().optional().nullable(),
    categoryIcon: z.string().optional().nullable(),
    paymentMethodId: z.number().optional().nullable(),
    paymentMethodName: z.string().optional().nullable(),
    createdByUserNickname: z.string().optional().nullable(),
    attachmentCount: z.number().optional().nullable(),
    suggestedActions: suggestedActionsSchema,
  }),
  func: async (data) => {
    console.log('🎨 [renderTransactionDetailTool] Rendering transaction detail:', data.id);
    if (data.suggestedActions?.length) {
      console.log('🎨 [renderTransactionDetailTool] With suggestions:', data.suggestedActions.length);
    }
    
    // 直接返回 JSON 字符串
    return JSON.stringify(data);
  },
});

/**
 * 渲染操作结果消息工具
 * 用于显示简单的操作成功/失败消息
 */
export const renderResultMessageTool = new DynamicStructuredTool({
  name: "render_result_message",
  description: `【简单文字反馈】渲染简洁的操作结果消息。

✅ 适用场景：
- 删除成功、批量操作成功等无需展示具体数据的操作
- 系统设置更改、权限变更等配置类操作
- 错误提示、警告信息

❌ 不适用场景：
- 创建/修改交易后（应使用 render_transaction_detail 展示完整交易信息）
- 查询交易列表（应使用 render_transaction_list）
- 统计数据展示（应使用 render_statistics_card 或图表工具）

💡 可选：提供 suggestedActions 在消息下方显示后续操作建议按钮。`,
  schema: z.object({
    message: z.string().describe("要显示的消息内容"),
    type: z.enum(['success', 'error', 'info', 'warning']).optional().default('success').describe("消息类型"),
    icon: z.string().optional().describe("图标名称（Ionicons），默认根据type自动选择"),
    title: z.string().optional().describe("标题（可选）"),
    suggestedActions: suggestedActionsSchema,
  }),
  func: async (data) => {
    console.log('🎨 [renderResultMessageTool] Rendering result message:', data.message);
    if (data.suggestedActions?.length) {
      console.log('🎨 [renderResultMessageTool] With suggestions:', data.suggestedActions.length);
    }
    // 自动选择图标
    const iconMap: Record<string, string> = {
      success: 'checkmark-circle',
      error: 'close-circle',
      info: 'information-circle',
      warning: 'warning',
    };
    const result = {
      ...data,
      icon: data.icon || iconMap[data.type || 'success'],
    };
    return JSON.stringify(result);
  },
});

/**
 * 渲染统计卡片工具
 */
export const renderStatisticsCardTool = new DynamicStructuredTool({
  name: "render_statistics_card",
  description: `渲染统计汇总卡片，展示收入、支出、结余等核心数据。

配合 analyze 工具使用：
1. 调用 analyze(analysisType='summary') 获取汇总数据
2. 直接使用返回的 totalIncome、totalExpense、balance、transactionCount
3. 如需对比，调用 analyze(analysisType='comparison') 获取变化率

💡 可选：提供 suggestedActions 在卡片下方显示后续操作建议按钮。`,
  schema: z.object({
    title: z.string().describe("卡片标题，如'本月汇总'、'11月收支报告'"),
    period: z.string().optional().describe("统计周期，如'2024年11月'、'11.1-11.28'"),
    totalIncome: z.number().describe("总收入金额"),
    totalExpense: z.number().describe("总支出金额"),
    balance: z.number().describe("结余金额（收入-支出）"),
    transactionCount: z.number().optional().describe("交易笔数"),
    comparedToPrevious: z.object({
      incomeChange: z.number().optional().describe("收入变化率百分比"),
      expenseChange: z.number().optional().describe("支出变化率百分比"),
    }).optional().describe("与上期对比的变化率"),
    suggestedActions: suggestedActionsSchema,
  }),
  func: async (data) => {
    console.log('🎨 [renderStatisticsCardTool] Rendering statistics card');
    if (data.suggestedActions?.length) {
      console.log('🎨 [renderStatisticsCardTool] With suggestions:', data.suggestedActions.length);
    }
    
    return JSON.stringify(data);
  },
});

/**
 * 渲染操作按钮工具
 */
export const renderActionButtonsTool = new DynamicStructuredTool({
  name: "render_action_buttons",
  description: "渲染可点击的操作按钮，让用户可以快速执行后续操作。",
  schema: z.object({
    message: z.string().optional().describe("提示文字"),
    buttons: z.array(z.object({
      id: z.string(),
      label: z.string().describe("按钮文字"),
      action: z.string().describe("点击后的操作类型：'navigate'跳转、'send_message'发送消息"),
      payload: z.any().describe("操作参数"),
      style: z.enum(['primary', 'secondary', 'danger']).optional().describe("按钮样式"),
    })).describe("按钮列表"),
  }),
  func: async (data) => {
    console.log('🎨 [renderActionButtonsTool] Rendering action buttons');
    
    return JSON.stringify(data);
  },
});

export const renderTools = [
  renderTransactionListTool,
  renderTransactionDetailTool,
  renderResultMessageTool,
  renderStatisticsCardTool,
  renderActionButtonsTool,
];

// ========== 增强组件 Render Tools ==========

/**
 * DynamicSection Schema - 动态卡片的内容块定义
 * 
 * 注意：使用简化的 schema 结构以兼容 Google Generative AI API
 * Google API 不支持 discriminatedUnion、literal、tuple 等高级 JSON Schema 特性
 */
const dynamicSectionSchema = z.object({
  type: z.enum([
    'text', 'title', 'key_value', 'key_value_row', 'divider', 'spacer',
    'icon_text', 'highlight', 'list', 'progress', 'tag_row', 
    'button', 'button_row', 'amount'
  ]).describe("内容块类型"),
  // 通用字段
  content: z.string().optional().describe("文本内容（text/title/icon_text/highlight 类型使用）"),
  label: z.string().optional().describe("标签（key_value/progress/amount 类型使用）"),
  value: z.any().optional().describe("值（key_value 用 string，progress/amount 用 number）"),
  icon: z.string().optional().describe("图标"),
  // 样式字段
  style: z.enum(['normal', 'secondary', 'small', 'bold', 'solid', 'dashed', 'bullet', 'numbered', 'check', 'primary', 'secondary', 'danger']).optional().describe("样式"),
  align: z.enum(['left', 'center', 'right']).optional().describe("对齐方式"),
  size: z.enum(['xs', 'sm', 'md', 'lg', 'normal', 'large', 'xlarge']).optional().describe("尺寸"),
  color: z.enum(['normal', 'primary', 'success', 'warning', 'error', 'default']).optional().describe("颜色"),
  variant: z.enum(['info', 'success', 'warning', 'error']).optional().describe("变体样式"),
  level: z.number().optional().describe("标题级别（1-3）"),
  // 列表/数组字段
  items: z.array(z.any()).optional().describe("子项数组（key_value_row/list/tag_row/button_row 类型使用）"),
  tags: z.array(z.object({
    text: z.string(),
    color: z.enum(['primary', 'success', 'warning', 'error', 'default']).optional(),
  })).optional().describe("标签数组（tag_row 类型使用）"),
  buttons: z.array(z.object({
    label: z.string(),
    action: z.string(),
    payload: z.any().optional(),
    style: z.enum(['primary', 'secondary', 'danger']).optional(),
  })).optional().describe("按钮数组（button_row 类型使用）"),
  // 其他字段
  action: z.string().optional().describe("按钮操作"),
  payload: z.any().optional().describe("按钮操作参数"),
  maxValue: z.number().optional().describe("最大值（progress 类型使用）"),
  showPercentage: z.boolean().optional().describe("显示百分比"),
  showSign: z.boolean().optional().describe("显示正负号"),
  iconColor: z.string().optional().describe("图标颜色"),
  valueColor: z.enum(['normal', 'primary', 'success', 'warning', 'error']).optional().describe("值的颜色"),
});

/**
 * 渲染动态卡片工具 - 核心增强组件
 * AI 可以灵活组合各种元素来构建自定义卡片
 */
export const renderDynamicCardTool = new DynamicStructuredTool({
  name: "render_dynamic_card",
  description: `【灵活展示】渲染可自定义的动态卡片，适用于复杂信息展示。

适用场景：
- 需要展示多项相关信息（如分类详情、操作摘要）
- 需要图标、列表、高亮等富文本效果
- render_result_message 不够用时的升级选择

支持的 section 类型：
- text: 文本段落
- title: 标题（支持层级）
- key_value: 键值对
- key_value_row: 水平键值对行
- divider: 分隔线
- icon_text: 图标+文本
- highlight: 高亮提示块
- list: 列表（bullet/numbered/check）
- progress: 进度条
- tag_row: 标签行
- button/button_row: 按钮
- amount: 金额显示

💡 可选：提供 suggestedActions 在卡片下方显示后续操作建议按钮。`,
  schema: z.object({
    title: z.string().optional().describe("卡片标题"),
    titleIcon: z.string().optional().describe("标题图标（Ionicons 名称）"),
    subtitle: z.string().optional().describe("副标题"),
    sections: z.array(dynamicSectionSchema).describe("内容块数组"),
    footer: z.string().optional().describe("底部文字"),
    variant: z.enum(['default', 'outlined', 'elevated']).optional().describe("卡片样式"),
    suggestedActions: suggestedActionsSchema,
  }),
  func: async (data) => {
    console.log('🎨 [renderDynamicCardTool] Rendering dynamic card');
    if (data.suggestedActions?.length) {
      console.log('🎨 [renderDynamicCardTool] With suggestions:', data.suggestedActions.length);
    }
    return JSON.stringify(data);
  },
});

/**
 * 渲染键值对列表工具
 */
export const renderKeyValueListTool = new DynamicStructuredTool({
  name: "render_key_value_list",
  description: "渲染键值对列表，适合展示详情信息、配置项等。",
  schema: z.object({
    title: z.string().optional().describe("列表标题"),
    titleIcon: z.string().optional().describe("标题图标"),
    items: z.array(z.object({
      label: z.string().describe("键名"),
      value: z.string().describe("键值"),
      icon: z.string().optional().describe("图标"),
      valueColor: z.enum(['normal', 'primary', 'success', 'warning', 'error']).optional(),
    })).describe("键值对数组"),
    footer: z.string().optional().describe("底部文字"),
    compact: z.boolean().optional().describe("紧凑模式"),
  }),
  func: async (data) => {
    console.log('🎨 [renderKeyValueListTool] Rendering key-value list');
    return JSON.stringify(data);
  },
});

/**
 * 渲染进度卡片工具
 */
export const renderProgressCardTool = new DynamicStructuredTool({
  name: "render_progress_card",
  description: "渲染进度卡片，适合展示预算使用情况、目标达成进度等。支持自动变色提醒。",
  schema: z.object({
    title: z.string().describe("卡片标题，如'本月预算'"),
    titleIcon: z.string().optional().describe("标题图标"),
    current: z.number().describe("当前值"),
    total: z.number().describe("总值/目标值"),
    unit: z.string().optional().describe("单位，如'元'、'%'、'笔'"),
    label: z.string().optional().describe("当前值标签，如'已用'、'已完成'"),
    description: z.string().optional().describe("额外描述信息"),
    color: z.enum(['primary', 'success', 'warning', 'error', 'auto']).optional()
      .describe("进度条颜色，'auto'会根据进度自动变色"),
    showRemaining: z.boolean().optional().describe("是否显示剩余量"),
    warningThreshold: z.number().optional().describe("警告阈值（百分比），默认70"),
    dangerThreshold: z.number().optional().describe("危险阈值（百分比），默认90"),
  }),
  func: async (data) => {
    console.log('🎨 [renderProgressCardTool] Rendering progress card');
    return JSON.stringify(data);
  },
});

/**
 * 渲染对比卡片工具
 */
export const renderComparisonCardTool = new DynamicStructuredTool({
  name: "render_comparison_card",
  description: "渲染对比卡片，适合展示两个时期/项目的数据对比，如本月vs上月、收入vs支出。",
  schema: z.object({
    title: z.string().describe("卡片标题"),
    titleIcon: z.string().optional().describe("标题图标"),
    leftTitle: z.string().describe("左列标题，如'本月'"),
    rightTitle: z.string().describe("右列标题，如'上月'"),
    items: z.array(z.object({
      label: z.string().describe("数据项名称"),
      leftValue: z.number().describe("左列数值"),
      rightValue: z.number().describe("右列数值"),
      unit: z.string().optional().describe("单位"),
      format: z.enum(['currency', 'number', 'percentage']).optional().describe("格式化方式"),
    })).describe("对比数据项"),
    showChange: z.boolean().optional().describe("是否显示变化百分比"),
    highlightBetter: z.enum(['left', 'right', 'auto', 'none']).optional()
      .describe("高亮表现更好的一方"),
  }),
  func: async (data) => {
    console.log('🎨 [renderComparisonCardTool] Rendering comparison card');
    return JSON.stringify(data);
  },
});

/**
 * 渲染饼图工具
 */
export const renderPieChartTool = new DynamicStructuredTool({
  name: "render_pie_chart",
  description: `渲染饼图，展示分类占比、收支结构分布。当用户想看"饼图"、"占比"、"分布"、"结构"时使用。

数据来源（二选一）：
1. transaction 工具的 statistics action 返回的 categoryStats
2. analyze 工具返回的 categoryBreakdown

转换规则：
- items[].label = categoryName（分类名称）
- items[].value = amount（金额数值，必须是 number 类型）
- items[].icon = categoryIcon（分类图标）
- valueFormat = 'currency'（金额格式）
- centerLabel = '总支出' 或 '总收入'
- centerValue = 格式化的总金额，如 '¥1,193.63'`,
  schema: z.object({
    title: z.string().optional().describe("图表标题，如'本周消费分布'、'支出结构'"),
    titleIcon: z.string().optional().describe("标题图标"),
    items: z.array(z.object({
      label: z.string().describe("分类名称"),
      value: z.number().describe("金额数值（必须是数字）"),
      color: z.string().optional().describe("颜色（可选，自动分配）"),
      icon: z.string().optional().describe("分类图标emoji"),
    })).describe("饼图数据项"),
    showLegend: z.boolean().optional().describe("显示图例，默认true"),
    showPercentage: z.boolean().optional().describe("显示百分比，默认true"),
    showValue: z.boolean().optional().describe("显示数值，默认true"),
    valueFormat: z.enum(['currency', 'number', 'percentage']).optional().describe("数值格式，通常用'currency'"),
    centerLabel: z.string().optional().describe("中心标签，如'总支出'"),
    centerValue: z.string().optional().describe("中心数值，如'¥1,193.63'"),
  }),
  func: async (data) => {
    console.log('🎨 [renderPieChartTool] Rendering pie chart');
    return JSON.stringify(data);
  },
});

/**
 * 渲染柱状图工具
 */
export const renderBarChartTool = new DynamicStructuredTool({
  name: "render_bar_chart",
  description: `渲染柱状图，展示时间趋势或分类对比。当用户想看"趋势"、"走势"、"柱状图"、"对比"时使用。

数据来源：
1. 趋势图：analyze 工具的 trend 分析返回的 trendData
2. 分类对比：transaction/statistics 的 categoryStats 或 analyze 的 categoryBreakdown

转换规则（趋势图）：
- items[].label = trendData 的 label（如"11-24"）
- items[].value = expense（支出金额）
- items[].secondaryValue = income（收入金额，可选）
- legendLabels = ['支出', '收入']

转换规则（分类对比）：
- items[].label = categoryName
- items[].value = amount`,
  schema: z.object({
    title: z.string().optional().describe("图表标题"),
    titleIcon: z.string().optional().describe("标题图标"),
    items: z.array(z.object({
      label: z.string().describe("X轴标签"),
      value: z.number().describe("主数值"),
      secondaryValue: z.number().optional().describe("次数值（对比用）"),
      color: z.string().optional().describe("主柱颜色"),
      secondaryColor: z.string().optional().describe("次柱颜色"),
    })).describe("柱状图数据项"),
    showValues: z.boolean().optional().describe("显示数值标签"),
    valueFormat: z.enum(['currency', 'number', 'percentage']).optional().describe("数值格式"),
    orientation: z.enum(['vertical', 'horizontal']).optional().describe("方向，默认vertical"),
    showLegend: z.boolean().optional().describe("显示图例"),
    legendLabels: z.array(z.string()).optional().describe("图例标签数组，如 ['支出', '收入']"),
  }),
  func: async (data) => {
    console.log('🎨 [renderBarChartTool] Rendering bar chart');
    return JSON.stringify(data);
  },
});

// 增强组件工具集合
export const enhancedRenderTools = [
  renderDynamicCardTool,
  renderKeyValueListTool,
  renderProgressCardTool,
  renderComparisonCardTool,
  renderPieChartTool,
  renderBarChartTool,
];

// 所有 render tools
export const allRenderTools = [
  ...renderTools,
  ...enhancedRenderTools,
];