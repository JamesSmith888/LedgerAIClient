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

// 嵌入内容类型
export type EmbedType = 
  // 基础组件
  | 'transaction_list'    // 交易列表
  | 'transaction_detail'  // 交易详情
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
  description: "将交易数据渲染为可视化列表展示给用户。当需要向用户展示多条交易记录时调用此工具。",
  schema: z.object({
    title: z.string().optional().describe("列表标题，如'最近交易'、'本月支出'"),
    message: z.string().optional().describe("提示信息"),
    transactions: z.array(z.object({
      id: z.number(),
      name: z.string(),
      description: z.string().optional(),
      amount: z.number(),
      type: z.enum(['INCOME', 'EXPENSE']),
      transactionDateTime: z.string(),
      ledgerName: z.string().optional(),
      categoryName: z.string().optional(),
      categoryIcon: z.string().optional(),
      paymentMethodName: z.string().optional(),
    })).describe("交易记录列表"),
    statistics: z.object({
      totalIncome: z.number(),
      totalExpense: z.number(),
      balance: z.number(),
      count: z.number(),
    }).optional().describe("汇总统计"),
    pagination: z.object({
      page: z.number(),
      totalElements: z.number(),
      totalPages: z.number(),
    }).optional().describe("分页信息"),
  }),
  func: async (data) => {
    console.log('🎨 [renderTransactionListTool] Rendering transaction list');
    
    // 直接返回 JSON 字符串，useAgentChat 会解析并创建 embedded 消息
    return JSON.stringify(data);
  },
});

/**
 * 渲染单条交易详情工具
 */
export const renderTransactionDetailTool = new DynamicStructuredTool({
  name: "render_transaction_detail",
  description: "将单条交易详情渲染为卡片展示给用户。当需要向用户展示某条交易的完整信息时调用此工具。",
  schema: z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().optional(),
    amount: z.number(),
    type: z.enum(['INCOME', 'EXPENSE']),
    transactionDateTime: z.string(),
    ledgerId: z.number().optional(),
    ledgerName: z.string().optional(),
    categoryId: z.number().optional(),
    categoryName: z.string().optional(),
    categoryIcon: z.string().optional(),
    paymentMethodId: z.number().optional(),
    paymentMethodName: z.string().optional(),
    createdByUserNickname: z.string().optional(),
    attachmentCount: z.number().optional(),
  }),
  func: async (transaction) => {
    console.log('🎨 [renderTransactionDetailTool] Rendering transaction detail:', transaction.id);
    
    // 直接返回 JSON 字符串
    return JSON.stringify(transaction);
  },
});

/**
 * 渲染统计卡片工具
 */
export const renderStatisticsCardTool = new DynamicStructuredTool({
  name: "render_statistics_card",
  description: "渲染一个统计汇总卡片，展示收入、支出、结余等数据。",
  schema: z.object({
    title: z.string().describe("卡片标题，如'本月汇总'"),
    period: z.string().optional().describe("统计周期，如'2024年11月'"),
    totalIncome: z.number().describe("总收入"),
    totalExpense: z.number().describe("总支出"),
    balance: z.number().describe("结余"),
    transactionCount: z.number().optional().describe("交易笔数"),
    comparedToPrevious: z.object({
      incomeChange: z.number().optional(),
      expenseChange: z.number().optional(),
    }).optional().describe("与上期对比"),
  }),
  func: async (data) => {
    console.log('🎨 [renderStatisticsCardTool] Rendering statistics card');
    
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
  renderStatisticsCardTool,
  renderActionButtonsTool,
];

// ========== 增强组件 Render Tools ==========

/**
 * DynamicSection Schema - 动态卡片的内容块定义
 */
const dynamicSectionSchema = z.discriminatedUnion('type', [
  // 文本
  z.object({
    type: z.literal('text'),
    content: z.string(),
    style: z.enum(['normal', 'secondary', 'small', 'bold']).optional(),
    align: z.enum(['left', 'center', 'right']).optional(),
  }),
  // 标题
  z.object({
    type: z.literal('title'),
    content: z.string(),
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
    icon: z.string().optional(),
  }),
  // 键值对
  z.object({
    type: z.literal('key_value'),
    label: z.string(),
    value: z.string(),
    valueColor: z.enum(['normal', 'primary', 'success', 'warning', 'error']).optional(),
    icon: z.string().optional(),
  }),
  // 水平键值对行
  z.object({
    type: z.literal('key_value_row'),
    items: z.array(z.object({
      label: z.string(),
      value: z.string(),
      valueColor: z.enum(['normal', 'primary', 'success', 'warning', 'error']).optional(),
    })),
  }),
  // 分隔线
  z.object({
    type: z.literal('divider'),
    style: z.enum(['solid', 'dashed']).optional(),
  }),
  // 空白间距
  z.object({
    type: z.literal('spacer'),
    size: z.enum(['xs', 'sm', 'md', 'lg']).optional(),
  }),
  // 图标+文本
  z.object({
    type: z.literal('icon_text'),
    icon: z.string(),
    content: z.string(),
    iconColor: z.string().optional(),
  }),
  // 高亮块
  z.object({
    type: z.literal('highlight'),
    content: z.string(),
    variant: z.enum(['info', 'success', 'warning', 'error']).optional(),
    icon: z.string().optional(),
  }),
  // 列表
  z.object({
    type: z.literal('list'),
    items: z.array(z.string()),
    style: z.enum(['bullet', 'numbered', 'check']).optional(),
  }),
  // 进度条
  z.object({
    type: z.literal('progress'),
    value: z.number(),
    label: z.string().optional(),
    maxValue: z.number().optional(),
    showPercentage: z.boolean().optional(),
    color: z.enum(['primary', 'success', 'warning', 'error']).optional(),
  }),
  // 标签行
  z.object({
    type: z.literal('tag_row'),
    tags: z.array(z.object({
      text: z.string(),
      color: z.enum(['primary', 'success', 'warning', 'error', 'default']).optional(),
    })),
  }),
  // 按钮
  z.object({
    type: z.literal('button'),
    label: z.string(),
    action: z.string(),
    payload: z.any().optional(),
    style: z.enum(['primary', 'secondary', 'danger']).optional(),
  }),
  // 按钮行
  z.object({
    type: z.literal('button_row'),
    buttons: z.array(z.object({
      label: z.string(),
      action: z.string(),
      payload: z.any().optional(),
      style: z.enum(['primary', 'secondary', 'danger']).optional(),
    })),
  }),
  // 金额
  z.object({
    type: z.literal('amount'),
    value: z.number(),
    label: z.string().optional(),
    size: z.enum(['normal', 'large', 'xlarge']).optional(),
    showSign: z.boolean().optional(),
  }),
]);

/**
 * 渲染动态卡片工具 - 核心增强组件
 * AI 可以灵活组合各种元素来构建自定义卡片
 */
export const renderDynamicCardTool = new DynamicStructuredTool({
  name: "render_dynamic_card",
  description: `渲染一个动态卡片，AI 可以灵活组合各种元素。适用于需要自定义展示格式的场景。
支持的 section 类型：
- text: 文本段落
- title: 标题（支持层级）
- key_value: 键值对
- key_value_row: 水平键值对行
- divider: 分隔线
- spacer: 空白间距
- icon_text: 图标+文本
- highlight: 高亮提示块
- list: 列表（bullet/numbered/check）
- progress: 进度条
- tag_row: 标签行
- button/button_row: 按钮
- amount: 金额显示`,
  schema: z.object({
    title: z.string().optional().describe("卡片标题"),
    titleIcon: z.string().optional().describe("标题图标（Ionicons 名称）"),
    subtitle: z.string().optional().describe("副标题"),
    sections: z.array(dynamicSectionSchema).describe("内容块数组"),
    footer: z.string().optional().describe("底部文字"),
    variant: z.enum(['default', 'outlined', 'elevated']).optional().describe("卡片样式"),
  }),
  func: async (data) => {
    console.log('🎨 [renderDynamicCardTool] Rendering dynamic card');
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
  description: "渲染饼图，适合展示分类占比、收支结构等数据分布。",
  schema: z.object({
    title: z.string().optional().describe("图表标题"),
    titleIcon: z.string().optional().describe("标题图标"),
    items: z.array(z.object({
      label: z.string().describe("数据项名称"),
      value: z.number().describe("数值"),
      color: z.string().optional().describe("颜色（可选，会自动分配）"),
      icon: z.string().optional().describe("图标"),
    })).describe("数据项数组"),
    showLegend: z.boolean().optional().describe("是否显示图例"),
    showPercentage: z.boolean().optional().describe("是否显示百分比"),
    showValue: z.boolean().optional().describe("是否显示数值"),
    valueFormat: z.enum(['currency', 'number', 'percentage']).optional().describe("数值格式"),
    centerLabel: z.string().optional().describe("中心显示的标签"),
    centerValue: z.string().optional().describe("中心显示的数值"),
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
  description: "渲染柱状图，适合展示时间序列数据、分类对比等。支持双柱对比（如收入vs支出）。",
  schema: z.object({
    title: z.string().optional().describe("图表标题"),
    titleIcon: z.string().optional().describe("标题图标"),
    items: z.array(z.object({
      label: z.string().describe("X轴标签，如'1月'、'餐饮'"),
      value: z.number().describe("主数值"),
      secondaryValue: z.number().optional().describe("次数值（用于对比）"),
      color: z.string().optional().describe("主柱颜色"),
      secondaryColor: z.string().optional().describe("次柱颜色"),
    })).describe("数据项数组"),
    showValues: z.boolean().optional().describe("是否显示数值标签"),
    valueFormat: z.enum(['currency', 'number', 'percentage']).optional().describe("数值格式"),
    orientation: z.enum(['vertical', 'horizontal']).optional().describe("方向，默认垂直"),
    showLegend: z.boolean().optional().describe("是否显示图例"),
    legendLabels: z.tuple([z.string(), z.string()]).optional()
      .describe("图例标签，如['收入', '支出']"),
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