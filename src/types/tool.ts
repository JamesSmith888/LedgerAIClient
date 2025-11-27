/**
 * AI Agent 工具类型定义
 * 用于工具管理和动态启用/禁用
 */

/**
 * 工具分类
 */
export type ToolCategory = 
  | 'context'      // 上下文工具（获取用户、账本等信息）
  | 'api'          // API 工具（查询分类、支付方式等）
  | 'transaction'  // 交易工具（创建、查询、统计等）
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
    id: 'render',
    name: '渲染展示',
    description: '展示列表、卡片等可视化内容',
    icon: '🎨',
  },
];

/**
 * 所有可用工具的元信息
 * 按分类组织，便于 UI 展示
 */
export const ALL_TOOLS_META: ToolMeta[] = [
  // 上下文工具
  {
    name: 'get_user_info',
    displayName: '获取用户信息',
    description: '获取当前登录用户的信息',
    category: 'context',
    icon: '👤',
    isEnabled: true,
    isCore: false,
  },
  {
    name: 'get_current_ledger',
    displayName: '获取当前账本',
    description: '获取用户当前选中的账本信息',
    category: 'context',
    icon: '📒',
    isEnabled: true,
    isCore: false,
  },
  {
    name: 'get_all_ledgers',
    displayName: '获取所有账本',
    description: '获取用户的所有账本列表',
    category: 'context',
    icon: '📚',
    isEnabled: true,
    isCore: false,
  },
  {
    name: 'get_full_context',
    displayName: '获取完整上下文',
    description: '一次性获取所有上下文信息',
    category: 'context',
    icon: '📋',
    isEnabled: true,
    isCore: false,
  },
  
  // API 工具
  {
    name: 'get_categories',
    displayName: '获取分类列表',
    description: '获取指定账本的所有交易分类',
    category: 'api',
    icon: '🏷️',
    isEnabled: true,
    isCore: false,
  },
  {
    name: 'get_ledger_detail',
    displayName: '获取账本详情',
    description: '获取账本的详细信息',
    category: 'api',
    icon: '📖',
    isEnabled: true,
    isCore: false,
  },
  {
    name: 'search_category',
    displayName: '搜索分类',
    description: '根据关键词模糊搜索分类',
    category: 'api',
    icon: '🔎',
    isEnabled: true,
    isCore: false,
  },
  {
    name: 'get_payment_methods',
    displayName: '获取支付方式',
    description: '获取用户的所有支付方式',
    category: 'api',
    icon: '💳',
    isEnabled: true,
    isCore: false,
  },
  
  // 交易工具
  {
    name: 'create_transaction',
    displayName: '创建交易',
    description: '创建一笔新的交易记录',
    category: 'transaction',
    icon: '➕',
    isEnabled: true,
    isCore: true, // 核心工具，不可禁用
  },
  {
    name: 'update_transaction',
    displayName: '修改交易',
    description: '修改已有的交易记录',
    category: 'transaction',
    icon: '✏️',
    isEnabled: true,
    isCore: false,
  },
  {
    name: 'delete_transaction',
    displayName: '删除交易',
    description: '删除交易记录（可恢复）',
    category: 'transaction',
    icon: '🗑️',
    isEnabled: true,
    isCore: false,
  },
  {
    name: 'batch_create_transactions',
    displayName: '批量创建交易',
    description: '一次性创建多笔交易',
    category: 'transaction',
    icon: '📦',
    isEnabled: true,
    isCore: false,
  },
  {
    name: 'query_transactions',
    displayName: '查询交易',
    description: '按条件查询交易记录',
    category: 'transaction',
    icon: '🔍',
    isEnabled: true,
    isCore: true,
  },
  {
    name: 'get_statistics',
    displayName: '获取统计',
    description: '获取每日交易统计数据',
    category: 'transaction',
    icon: '📊',
    isEnabled: true,
    isCore: false,
  },
  {
    name: 'get_statistics_report',
    displayName: '统计报表',
    description: '获取详细统计报表，含分类占比分析',
    category: 'transaction',
    icon: '📈',
    isEnabled: true,
    isCore: false,
  },
  {
    name: 'get_transaction_detail',
    displayName: '获取交易详情',
    description: '获取单条交易的完整详情',
    category: 'transaction',
    icon: '📄',
    isEnabled: true,
    isCore: false,
  },
  {
    name: 'query_agent_transactions',
    displayName: '高级查询',
    description: '多条件筛选查询交易',
    category: 'transaction',
    icon: '🔬',
    isEnabled: true,
    isCore: false,
  },
  {
    name: 'search_transactions',
    displayName: '搜索交易',
    description: '通过关键词搜索交易',
    category: 'transaction',
    icon: '🔎',
    isEnabled: true,
    isCore: false,
  },
  {
    name: 'get_recent_transactions',
    displayName: '最近交易',
    description: '快速获取最近的交易记录',
    category: 'transaction',
    icon: '🕐',
    isEnabled: true,
    isCore: false,
  },
  
  // API 管理工具
  {
    name: 'create_category',
    displayName: '创建分类',
    description: '创建新的交易分类',
    category: 'api',
    icon: '🏷️',
    isEnabled: true,
    isCore: false,
  },
  {
    name: 'create_payment_method',
    displayName: '创建支付方式',
    description: '创建新的支付方式',
    category: 'api',
    icon: '💳',
    isEnabled: true,
    isCore: false,
  },
  
  // 渲染工具
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
  
  // ============ 领域聚合工具 ============
  {
    name: 'transaction',
    displayName: '交易管理',
    description: '统一交易操作：查询/创建/更新/删除/批量/统计',
    category: 'transaction',
    icon: '💹',
    isEnabled: true,
    isCore: true,
  },
  {
    name: 'category',
    displayName: '分类管理',
    description: '统一分类操作：查询/搜索/创建',
    category: 'api',
    icon: '📂',
    isEnabled: true,
    isCore: false,
  },
  {
    name: 'payment_method',
    displayName: '支付方式管理',
    description: '统一支付方式操作：查询/创建',
    category: 'api',
    icon: '💰',
    isEnabled: true,
    isCore: false,
  },
  {
    name: 'context',
    displayName: '上下文信息',
    description: '获取完整/用户/账本等上下文信息',
    category: 'context',
    icon: '🔄',
    isEnabled: true,
    isCore: true,
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
    render: [],
  };
  
  for (const tool of tools) {
    result[tool.category].push(tool);
  }
  
  return result;
}
