/**
 * AI Agent 工具类型定义
 * 仅支持领域聚合模式（Domain Mode）
 */

/**
 * 工具分类
 */
export type ToolCategory = 
  | 'context'      // 上下文工具（获取用户、账本等信息）
  | 'api'          // API 工具（查询分类、支付方式等）
  | 'transaction'  // 交易工具（创建、查询、统计等）
  | 'memory'       // 记忆工具（学习用户偏好、查询记忆等）
  | 'render';      // 渲染工具（展示列表、卡片等）

/**
 * 工具元信息
 * 用于 UI 展示和管理
 */
export interface ToolMeta {
  name: string;           // 工具名称（唯一标识）
  displayName: string;    // 显示名称
  description: string;    // 功能描述
  category: ToolCategory; // 分类
  icon: string;           // 图标（emoji 或 icon name）
  isEnabled: boolean;     // 是否启用
  isCore: boolean;        // 是否核心工具（不可禁用）
  isAlwaysAllowed?: boolean; // 是否已设置为"始终允许"（跳过确认弹窗）
  // 领域工具的子操作（用于展示和权限管理）
  actions?: ToolAction[];
}

/**
 * 工具操作（用于领域聚合工具）
 */
export interface ToolAction {
  name: string;           // 操作名称（如 "create", "delete"）
  displayName: string;    // 显示名称
  description: string;    // 操作描述
  riskLevel: 'low' | 'medium' | 'high' | 'critical';  // 风险级别
  isAlwaysAllowed?: boolean; // 是否已授权
}

/**
 * 工具分类元信息
 */
export interface ToolCategoryMeta {
  id: ToolCategory;
  name: string;
  description: string;
  icon: string;
}

/**
 * 工具分类定义
 */
export const TOOL_CATEGORIES: ToolCategoryMeta[] = [
  {
    id: 'context',
    name: '上下文',
    description: '获取用户、账本等环境信息',
    icon: '🔍',
  },
  {
    id: 'api',
    name: 'API 查询',
    description: '查询分类、支付方式等数据',
    icon: '📡',
  },
  {
    id: 'transaction',
    name: '交易操作',
    description: '创建、查询、统计交易',
    icon: '💰',
  },
  {
    id: 'memory',
    name: '智能记忆',
    description: '学习用户偏好、查询记忆',
    icon: '🧠',
  },
  {
    id: 'render',
    name: '渲染展示',
    description: '展示列表、卡片等可视化内容',
    icon: '🎨',
  },
];

/**
 * 所有可用工具的元信息
 * 领域聚合模式：4 个聚合工具 + 4 个渲染工具
 */
export const ALL_TOOLS_META: ToolMeta[] = [
  // ============ 领域聚合工具 ============
  {
    name: 'transaction',
    displayName: '交易管理',
    description: '统一交易操作：查询/创建/更新/删除/批量/统计',
    category: 'transaction',
    icon: '💹',
    isEnabled: true,
    isCore: true,
    actions: [
      { name: 'query', displayName: '查询交易', description: '按条件查询交易列表', riskLevel: 'low' },
      { name: 'get', displayName: '获取详情', description: '获取单条交易详情', riskLevel: 'low' },
      { name: 'create', displayName: '创建交易', description: '创建新交易', riskLevel: 'medium' },
      { name: 'update', displayName: '更新交易', description: '修改交易信息', riskLevel: 'medium' },
      { name: 'delete', displayName: '删除交易', description: '删除交易记录', riskLevel: 'high' },
      { name: 'batch_create', displayName: '批量创建', description: '一次创建多条交易', riskLevel: 'high' },
      { name: 'statistics', displayName: '统计分析', description: '获取统计数据', riskLevel: 'low' },
    ],
  },
  {
    name: 'category',
    displayName: '分类管理',
    description: '统一分类操作：查询/搜索/创建',
    category: 'api',
    icon: '📂',
    isEnabled: true,
    isCore: false,
    actions: [
      { name: 'list', displayName: '获取列表', description: '获取所有分类', riskLevel: 'low' },
      { name: 'search', displayName: '搜索分类', description: '搜索匹配的分类', riskLevel: 'low' },
      { name: 'create', displayName: '创建分类', description: '创建新分类', riskLevel: 'medium' },
    ],
  },
  {
    name: 'payment_method',
    displayName: '支付方式管理',
    description: '统一支付方式操作：查询/创建',
    category: 'api',
    icon: '💰',
    isEnabled: true,
    isCore: false,
    actions: [
      { name: 'list', displayName: '获取列表', description: '获取所有支付方式', riskLevel: 'low' },
      { name: 'create', displayName: '创建支付方式', description: '创建新支付方式', riskLevel: 'medium' },
    ],
  },
  {
    name: 'context',
    displayName: '上下文信息',
    description: '获取完整/用户/账本等上下文信息',
    category: 'context',
    icon: '🔄',
    isEnabled: true,
    isCore: true,
    actions: [
      { name: 'full', displayName: '完整上下文', description: '获取所有上下文信息', riskLevel: 'low' },
      { name: 'user', displayName: '用户信息', description: '获取当前用户', riskLevel: 'low' },
      { name: 'ledger', displayName: '当前账本', description: '获取当前账本', riskLevel: 'low' },
      { name: 'ledgers', displayName: '所有账本', description: '获取账本列表', riskLevel: 'low' },
    ],
  },

  // ============ 记忆工具 ============
  {
    name: 'user_memory',
    displayName: '用户偏好记忆',
    description: '学习和查询用户的个性化偏好',
    category: 'memory',
    icon: '🧠',
    isEnabled: true,
    isCore: false,
    actions: [
      { name: 'learn', displayName: '学习偏好', description: '记录用户的纠正和偏好', riskLevel: 'low' },
      { name: 'query', displayName: '查询偏好', description: '查询已保存的偏好', riskLevel: 'low' },
      { name: 'list', displayName: '列出偏好', description: '列出所有偏好记录', riskLevel: 'low' },
    ],
  },

  // ============ 渲染工具 ============
  {
    name: 'render_transaction_list',
    displayName: '渲染交易列表',
    description: '将交易数据渲染为可视化列表',
    category: 'render',
    icon: '📋',
    isEnabled: true,
    isCore: true,
  },
  {
    name: 'render_transaction_detail',
    displayName: '渲染交易详情',
    description: '将交易详情渲染为卡片',
    category: 'render',
    icon: '🎴',
    isEnabled: true,
    isCore: true,
  },
  {
    name: 'render_result_message',
    displayName: '渲染结果消息',
    description: '展示操作成功/失败等简洁反馈消息',
    category: 'render',
    icon: '✅',
    isEnabled: true,
    isCore: true,  // 核心工具，不可禁用 - 最常用的反馈工具
  },
  {
    name: 'render_statistics_card',
    displayName: '渲染统计卡片',
    description: '渲染统计汇总卡片',
    category: 'render',
    icon: '📈',
    isEnabled: true,
    isCore: false,
  },
  {
    name: 'render_action_buttons',
    displayName: '渲染操作按钮',
    description: '渲染可点击的操作按钮',
    category: 'render',
    icon: '🔘',
    isEnabled: true,
    isCore: false,
  },

  // ============ 增强渲染工具 ============
  {
    name: 'render_dynamic_card',
    displayName: '渲染动态卡片',
    description: '灵活组合各种元素构建自定义卡片',
    category: 'render',
    icon: '🃏',
    isEnabled: true,
    isCore: false,
  },
  {
    name: 'render_key_value_list',
    displayName: '渲染键值对列表',
    description: '展示详情信息、配置项等',
    category: 'render',
    icon: '📝',
    isEnabled: true,
    isCore: false,
  },
  {
    name: 'render_progress_card',
    displayName: '渲染进度卡片',
    description: '展示预算使用情况、目标达成进度',
    category: 'render',
    icon: '📊',
    isEnabled: true,
    isCore: false,
  },
  {
    name: 'render_comparison_card',
    displayName: '渲染对比卡片',
    description: '展示两个时期/项目的数据对比',
    category: 'render',
    icon: '⚖️',
    isEnabled: true,
    isCore: false,
  },
  {
    name: 'render_pie_chart',
    displayName: '渲染饼图',
    description: '展示分类占比、收支结构分布',
    category: 'render',
    icon: '🥧',
    isEnabled: true,
    isCore: false,
  },
  {
    name: 'render_bar_chart',
    displayName: '渲染柱状图',
    description: '展示时间趋势或分类对比',
    category: 'render',
    icon: '📶',
    isEnabled: true,
    isCore: false,
  },
];

/**
 * 获取工具的元信息
 */
export function getToolMeta(toolName: string): ToolMeta | undefined {
  return ALL_TOOLS_META.find(t => t.name === toolName);
}

/**
 * 按分类分组工具
 */
export function groupToolsByCategory(tools: ToolMeta[]): Record<ToolCategory, ToolMeta[]> {
  const result: Record<ToolCategory, ToolMeta[]> = {
    context: [],
    api: [],
    transaction: [],
    memory: [],
    render: [],
  };
  
  for (const tool of tools) {
    result[tool.category].push(tool);
  }
  
  return result;
}

/**
 * 获取领域工具的操作列表
 */
export function getToolActions(toolName: string): ToolAction[] {
  const tool = ALL_TOOLS_META.find(t => t.name === toolName);
  return tool?.actions || [];
}
