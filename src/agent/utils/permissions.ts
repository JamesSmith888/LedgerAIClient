/**
 * 工具权限管理
 * 定义工具风险级别和确认规则
 */

// ============ 权限类型定义 ============

/**
 * 风险级别
 * - low: 只读操作，无副作用
 * - medium: 可逆的写操作
 * - high: 难以逆转的操作
 * - critical: 不可逆的危险操作
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * 操作类型
 */
export type OperationType = 'read' | 'write' | 'delete' | 'admin';

/**
 * 工具权限配置
 */
export interface ToolPermission {
  toolName: string;
  riskLevel: RiskLevel;
  operationType: OperationType;
  description: string;
  confirmationMessage?: string;  // 自定义确认提示
  requiresExplicitConfirmation: boolean;  // 是否需要明确确认
  cooldownMs?: number;  // 连续调用冷却时间
  maxCallsPerMinute?: number;  // 每分钟最大调用次数
}

/**
 * 用户友好的确认信息
 * 设计目标：让普通用户（非技术人员）一眼就能理解要做什么
 */
export interface UserFriendlyConfirmation {
  /** 简洁的操作标题，如"记录一笔消费" */
  title: string;
  /** 通俗易懂的操作说明，用自然语言描述 */
  description: string;
  /** 要展示给用户的关键信息（人话版），如 ["花了 50 元", "买了午餐"] */
  keyPoints: string[];
  /** 操作的潜在影响说明 */
  impact?: string;
}

/**
 * 技术详情（给高级用户/调试用）
 */
export interface TechnicalDetails {
  /** 工具/API 名称 */
  toolName: string;
  /** 具体操作类型 */
  action?: string;
  /** 原始参数（JSON 格式） */
  rawArgs: Record<string, unknown>;
  /** 格式化的参数列表 */
  formattedArgs: string[];
}

/**
 * 确认请求
 */
export interface ConfirmationRequest {
  id: string;
  toolName: string;
  toolArgs: Record<string, unknown>;
  riskLevel: RiskLevel;
  /** @deprecated 使用 userFriendly.description 替代 */
  message: string;
  /** @deprecated 使用 technicalDetails.formattedArgs 替代 */
  details: string[];
  timestamp: number;
  expiresAt: number;  // 确认请求过期时间
  callback: {
    onConfirm: () => void;
    onReject: (reason?: string) => void;
    onModify?: (modifiedArgs: Record<string, unknown>) => void;
  };
  /** 用户友好的确认信息（新增） */
  userFriendly: UserFriendlyConfirmation;
  /** 技术详情（可选展开查看） */
  technicalDetails: TechnicalDetails;
}

// ============ 默认权限配置 ============

/**
 * 工具权限注册表
 */
const toolPermissionRegistry: Map<string, ToolPermission> = new Map();

/**
 * 默认工具权限配置
 */
const defaultPermissions: ToolPermission[] = [
  // ============ Context 工具 - 低风险 ============
  {
    toolName: 'get_user_info',
    riskLevel: 'low',
    operationType: 'read',
    description: '获取当前用户信息',
    requiresExplicitConfirmation: false,
  },
  {
    toolName: 'get_current_ledger',
    riskLevel: 'low',
    operationType: 'read',
    description: '获取当前账本信息',
    requiresExplicitConfirmation: false,
  },
  {
    toolName: 'get_all_ledgers',
    riskLevel: 'low',
    operationType: 'read',
    description: '获取所有账本列表',
    requiresExplicitConfirmation: false,
  },
  {
    toolName: 'get_full_context',
    riskLevel: 'low',
    operationType: 'read',
    description: '获取完整上下文（用户、账本、分类等）',
    requiresExplicitConfirmation: false,
  },
  // ============ 查询工具 - 低风险 ============
  {
    toolName: 'query_transactions',
    riskLevel: 'low',
    operationType: 'read',
    description: '查询交易记录',
    requiresExplicitConfirmation: false,
  },
  {
    toolName: 'get_categories',
    riskLevel: 'low',
    operationType: 'read',
    description: '获取分类列表',
    requiresExplicitConfirmation: false,
  },
  {
    toolName: 'get_statistics',
    riskLevel: 'low',
    operationType: 'read',
    description: '获取统计数据',
    requiresExplicitConfirmation: false,
  },
  {
    toolName: 'get_statistics_report',
    riskLevel: 'low',
    operationType: 'read',
    description: '获取详细统计报表',
    requiresExplicitConfirmation: false,
  },
  {
    toolName: 'get_accounts',
    riskLevel: 'low',
    operationType: 'read',
    description: '获取账户列表',
    requiresExplicitConfirmation: false,
  },
  {
    toolName: 'get_budgets',
    riskLevel: 'low',
    operationType: 'read',
    description: '获取预算信息',
    requiresExplicitConfirmation: false,
  },
  {
    toolName: 'get_agent_categories',
    riskLevel: 'low',
    operationType: 'read',
    description: '获取分类列表（Agent专用）',
    requiresExplicitConfirmation: false,
  },
  {
    toolName: 'get_agent_payment_methods',
    riskLevel: 'low',
    operationType: 'read',
    description: '获取支付方式列表',
    requiresExplicitConfirmation: false,
  },
  {
    toolName: 'get_ledger_detail',
    riskLevel: 'low',
    operationType: 'read',
    description: '获取账本详情',
    requiresExplicitConfirmation: false,
  },
  {
    toolName: 'search_category',
    riskLevel: 'low',
    operationType: 'read',
    description: '搜索分类',
    requiresExplicitConfirmation: false,
  },
  {
    toolName: 'get_payment_methods',
    riskLevel: 'low',
    operationType: 'read',
    description: '获取支付方式列表',
    requiresExplicitConfirmation: false,
  },
  {
    toolName: 'get_transaction_detail',
    riskLevel: 'low',
    operationType: 'read',
    description: '获取交易详情',
    requiresExplicitConfirmation: false,
  },
  {
    toolName: 'query_agent_transactions',
    riskLevel: 'low',
    operationType: 'read',
    description: '查询交易记录（Agent专用）',
    requiresExplicitConfirmation: false,
  },
  {
    toolName: 'search_transactions',
    riskLevel: 'low',
    operationType: 'read',
    description: '搜索交易记录',
    requiresExplicitConfirmation: false,
  },
  {
    toolName: 'get_recent_transactions',
    riskLevel: 'low',
    operationType: 'read',
    description: '获取最近交易记录',
    requiresExplicitConfirmation: false,
  },
  // ============ 渲染工具 - 低风险 ============
  {
    toolName: 'render_transaction_list',
    riskLevel: 'low',
    operationType: 'read',
    description: '渲染交易列表',
    requiresExplicitConfirmation: false,
  },
  {
    toolName: 'render_transaction_detail',
    riskLevel: 'low',
    operationType: 'read',
    description: '渲染交易详情',
    requiresExplicitConfirmation: false,
  },
  {
    toolName: 'render_statistics_card',
    riskLevel: 'low',
    operationType: 'read',
    description: '渲染统计卡片',
    requiresExplicitConfirmation: false,
  },
  {
    toolName: 'render_action_buttons',
    riskLevel: 'low',
    operationType: 'read',
    description: '渲染操作按钮',
    requiresExplicitConfirmation: false,
  },
  
  // ============ 写入操作 - 中等风险 ============
  {
    toolName: 'add_transaction',
    riskLevel: 'medium',
    operationType: 'write',
    description: '添加交易记录',
    requiresExplicitConfirmation: false,
    maxCallsPerMinute: 30,
  },
  {
    toolName: 'create_transaction',
    riskLevel: 'medium',
    operationType: 'write',
    description: '创建交易记录',
    requiresExplicitConfirmation: false,
    maxCallsPerMinute: 30,
  },
  {
    toolName: 'update_transaction',
    riskLevel: 'medium',
    operationType: 'write',
    description: '修改交易记录',
    confirmationMessage: '确认要修改这条交易记录吗？',
    requiresExplicitConfirmation: true,
  },
  {
    toolName: 'add_category',
    riskLevel: 'medium',
    operationType: 'write',
    description: '添加分类',
    requiresExplicitConfirmation: false,
  },
  {
    toolName: 'create_category',
    riskLevel: 'medium',
    operationType: 'write',
    description: '创建分类',
    requiresExplicitConfirmation: false,
  },
  {
    toolName: 'add_account',
    riskLevel: 'medium',
    operationType: 'write',
    description: '添加账户',
    requiresExplicitConfirmation: false,
  },
  {
    toolName: 'create_payment_method',
    riskLevel: 'medium',
    operationType: 'write',
    description: '创建支付方式',
    requiresExplicitConfirmation: false,
  },
  
  // 批量写入 - 高风险
  {
    toolName: 'batch_add_transactions',
    riskLevel: 'high',
    operationType: 'write',
    description: '批量添加交易记录',
    confirmationMessage: '即将批量添加多条交易记录，确认执行吗？',
    requiresExplicitConfirmation: true,
    maxCallsPerMinute: 5,
  },
  {
    toolName: 'batch_create_transactions',
    riskLevel: 'high',
    operationType: 'write',
    description: '批量创建交易记录',
    confirmationMessage: '即将批量创建多条交易记录，确认执行吗？',
    requiresExplicitConfirmation: true,
    maxCallsPerMinute: 5,
  },
  {
    toolName: 'batch_update_transactions',
    riskLevel: 'high',
    operationType: 'write',
    description: '批量修改交易记录',
    confirmationMessage: '即将批量修改交易记录，确认执行吗？',
    requiresExplicitConfirmation: true,
    maxCallsPerMinute: 5,
  },

  // 删除操作 - 高风险
  {
    toolName: 'delete_transaction',
    riskLevel: 'high',
    operationType: 'delete',
    description: '删除交易记录',
    confirmationMessage: '删除后无法恢复，确认要删除吗？',
    requiresExplicitConfirmation: true,
    cooldownMs: 2000,
  },
  {
    toolName: 'delete_category',
    riskLevel: 'high',
    operationType: 'delete',
    description: '删除分类',
    confirmationMessage: '删除分类可能影响关联的交易记录，确认删除吗？',
    requiresExplicitConfirmation: true,
  },

  // 批量删除 - 关键风险
  {
    toolName: 'batch_delete_transactions',
    riskLevel: 'critical',
    operationType: 'delete',
    description: '批量删除交易记录',
    confirmationMessage: '⚠️ 危险操作：即将批量删除交易记录，此操作不可撤销！',
    requiresExplicitConfirmation: true,
    cooldownMs: 5000,
    maxCallsPerMinute: 2,
  },
  {
    toolName: 'clear_all_data',
    riskLevel: 'critical',
    operationType: 'admin',
    description: '清空所有数据',
    confirmationMessage: '⚠️ 极度危险：将删除所有数据，此操作完全不可恢复！',
    requiresExplicitConfirmation: true,
    cooldownMs: 10000,
    maxCallsPerMinute: 1,
  },
  
  // ============ 领域聚合工具 ============
  {
    toolName: 'transaction',
    riskLevel: 'medium',
    operationType: 'write',
    description: '交易管理（查询/创建/更新/删除/统计）',
    requiresExplicitConfirmation: false,  // 内部根据 action 判断
  },
  {
    toolName: 'category',
    riskLevel: 'low',
    operationType: 'read',
    description: '分类管理（查询/搜索/创建）',
    requiresExplicitConfirmation: false,
  },
  {
    toolName: 'payment_method',
    riskLevel: 'low',
    operationType: 'read',
    description: '支付方式管理（查询/创建）',
    requiresExplicitConfirmation: false,
  },
  {
    toolName: 'context',
    riskLevel: 'low',
    operationType: 'read',
    description: '获取上下文信息',
    requiresExplicitConfirmation: false,
  },
];

// 初始化默认权限
defaultPermissions.forEach(p => toolPermissionRegistry.set(p.toolName, p));

// ============ 权限管理函数 ============

/**
 * 获取工具权限配置
 */
export function getToolPermission(toolName: string): ToolPermission {
  const permission = toolPermissionRegistry.get(toolName);
  
  if (permission) {
    return permission;
  }

  // 返回默认权限（未知工具默认为中等风险）
  return {
    toolName,
    riskLevel: 'medium',
    operationType: 'write',
    description: `未知工具: ${toolName}`,
    requiresExplicitConfirmation: true,  // 未知工具需要确认
  };
}

/**
 * 注册工具权限
 */
export function registerToolPermission(permission: ToolPermission): void {
  toolPermissionRegistry.set(permission.toolName, permission);
}

/**
 * 批量注册工具权限
 */
export function registerToolPermissions(permissions: ToolPermission[]): void {
  permissions.forEach(p => toolPermissionRegistry.set(p.toolName, p));
}

/**
 * 检查工具是否需要确认
 */
export function requiresConfirmation(permission: ToolPermission): boolean {
  // 明确标记需要确认
  if (permission.requiresExplicitConfirmation) {
    return true;
  }

  // 高风险和关键风险默认需要确认
  if (permission.riskLevel === 'high' || permission.riskLevel === 'critical') {
    return true;
  }

  // 删除操作默认需要确认
  if (permission.operationType === 'delete') {
    return true;
  }

  return false;
}

/**
 * 检查是否为只读操作
 */
export function isReadOnly(toolName: string): boolean {
  const permission = getToolPermission(toolName);
  return permission.operationType === 'read';
}

/**
 * 检查是否为危险操作
 */
export function isDangerous(toolName: string): boolean {
  const permission = getToolPermission(toolName);
  return permission.riskLevel === 'high' || permission.riskLevel === 'critical';
}

/**
 * 获取所有已注册的权限
 */
export function getAllPermissions(): ToolPermission[] {
  return Array.from(toolPermissionRegistry.values());
}

// ============ 确认请求管理 ============

/**
 * 工具操作的用户友好描述映射
 * key: toolName 或 toolName.action
 */
const userFriendlyDescriptions: Record<string, {
  title: string;
  descriptionTemplate: (args: Record<string, unknown>) => string;
  keyPointsGenerator: (args: Record<string, unknown>) => string[];
  impactTemplate?: (args: Record<string, unknown>) => string;
}> = {
  // 交易相关操作
  'transaction.create': {
    title: '记录一笔账',
    descriptionTemplate: (args) => {
      const type = args.type === 'EXPENSE' ? '支出' : args.type === 'INCOME' ? '收入' : '交易';
      return `AI 助手将帮您记录一笔${type}`;
    },
    keyPointsGenerator: (args) => {
      const points: string[] = [];
      if (args.amount) {
        const type = args.type === 'EXPENSE' ? '支出' : args.type === 'INCOME' ? '收入' : '';
        points.push(`💰 ${type}金额：¥${Number(args.amount).toFixed(2)}`);
      }
      if (args.description) {
        points.push(`📝 备注：${args.description}`);
      }
      if (args.categoryName) {
        points.push(`📁 分类：${args.categoryName}`);
      }
      return points;
    },
  },
  'transaction.update': {
    title: '修改交易记录',
    descriptionTemplate: () => 'AI 助手将修改您的一条交易记录',
    keyPointsGenerator: (args) => {
      const points: string[] = [];
      if (args.amount) points.push(`💰 金额改为：¥${Number(args.amount).toFixed(2)}`);
      if (args.description) points.push(`📝 备注改为：${args.description}`);
      return points.length > 0 ? points : ['将更新交易的相关信息'];
    },
    impactTemplate: () => '原有记录将被覆盖',
  },
  'transaction.delete': {
    title: '删除交易记录',
    descriptionTemplate: () => '确定要删除这条交易记录吗？',
    keyPointsGenerator: (args) => {
      return ['🗑️ 记录删除后无法恢复'];
    },
    impactTemplate: () => '此操作不可撤销',
  },
  'transaction.batch_create': {
    title: '批量记账',
    descriptionTemplate: (args) => {
      const items = args.items as any[];
      const count = items?.length || 0;
      return `AI 助手将一次性记录 ${count} 笔账目`;
    },
    keyPointsGenerator: (args) => {
      const items = args.items as any[];
      if (!items || items.length === 0) return ['无记录'];
      
      const totalAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      const points = [
        `📊 共 ${items.length} 笔记录`,
        `💰 总金额：¥${totalAmount.toFixed(2)}`,
      ];
      
      // 显示前两条的描述
      if (items.length > 0 && items[0].description) {
        points.push(`📝 包括：${items[0].description}${items.length > 1 ? ' 等' : ''}`);
      }
      return points;
    },
    impactTemplate: (args) => {
      const items = args.items as any[];
      return `将在您的账本中添加 ${items?.length || 0} 条新记录`;
    },
  },
  // 分类操作
  'category.create': {
    title: '新建分类',
    descriptionTemplate: (args) => `创建一个新的${args.type === 'EXPENSE' ? '支出' : '收入'}分类`,
    keyPointsGenerator: (args) => {
      const points: string[] = [];
      if (args.name) points.push(`📁 分类名称：${args.name}`);
      if (args.icon) points.push(`🎨 图标：${args.icon}`);
      return points;
    },
  },
  // 支付方式
  'payment_method.create': {
    title: '添加支付方式',
    descriptionTemplate: () => '添加一种新的支付方式',
    keyPointsGenerator: (args) => {
      const points: string[] = [];
      if (args.name) points.push(`💳 名称：${args.name}`);
      return points;
    },
  },
  // 通用删除
  'delete_transaction': {
    title: '删除交易记录',
    descriptionTemplate: () => '确定要删除这条交易记录吗？',
    keyPointsGenerator: () => ['🗑️ 记录删除后无法恢复'],
    impactTemplate: () => '此操作不可撤销',
  },
  'batch_delete_transactions': {
    title: '批量删除',
    descriptionTemplate: (args) => {
      const ids = args.ids as any[];
      return `确定要删除 ${ids?.length || 0} 条交易记录吗？`;
    },
    keyPointsGenerator: (args) => {
      const ids = args.ids as any[];
      return [
        `🗑️ 将删除 ${ids?.length || 0} 条记录`,
        '⚠️ 删除后无法恢复',
      ];
    },
    impactTemplate: () => '此操作不可撤销，请谨慎确认',
  },
};

/**
 * 生成用户友好的确认信息
 */
function generateUserFriendlyConfirmation(
  toolName: string,
  toolArgs: Record<string, unknown>,
  permission: ToolPermission
): UserFriendlyConfirmation {
  // 确定使用的 key（支持 action 子操作）
  const action = toolArgs?.action as string | undefined;
  const lookupKey = action ? `${toolName}.${action}` : toolName;
  
  const descriptor = userFriendlyDescriptions[lookupKey] || userFriendlyDescriptions[toolName];
  
  if (descriptor) {
    return {
      title: descriptor.title,
      description: descriptor.descriptionTemplate(toolArgs),
      keyPoints: descriptor.keyPointsGenerator(toolArgs),
      impact: descriptor.impactTemplate?.(toolArgs),
    };
  }
  
  // 默认生成（回退方案）
  return generateDefaultUserFriendly(toolName, toolArgs, permission);
}

/**
 * 默认的用户友好信息生成器
 */
function generateDefaultUserFriendly(
  toolName: string,
  toolArgs: Record<string, unknown>,
  permission: ToolPermission
): UserFriendlyConfirmation {
  const action = toolArgs?.action as string | undefined;
  
  // 根据操作类型生成标题
  let title = '确认操作';
  let description = permission.description;
  
  switch (permission.operationType) {
    case 'read':
      title = '查询数据';
      break;
    case 'write':
      title = action === 'create' ? '新增记录' : action === 'update' ? '修改记录' : '保存数据';
      break;
    case 'delete':
      title = '删除数据';
      description = '此操作将删除相关数据';
      break;
    case 'admin':
      title = '管理操作';
      break;
  }
  
  // 生成通用的关键点
  const keyPoints: string[] = [];
  if (toolArgs) {
    if (toolArgs.amount) {
      keyPoints.push(`💰 金额：¥${Number(toolArgs.amount).toFixed(2)}`);
    }
    if (toolArgs.description && typeof toolArgs.description === 'string') {
      keyPoints.push(`📝 ${toolArgs.description}`);
    }
  }
  
  if (keyPoints.length === 0) {
    keyPoints.push(`执行 ${permission.description}`);
  }
  
  // 根据风险级别添加影响说明
  let impact: string | undefined;
  if (permission.riskLevel === 'critical') {
    impact = '⚠️ 这是一个高风险操作，执行后无法撤销';
  } else if (permission.riskLevel === 'high') {
    impact = '请确认操作内容正确';
  }
  
  return {
    title,
    description,
    keyPoints,
    impact,
  };
}

/**
 * 创建确认请求
 */
export function createConfirmationRequest(
  toolName: string,
  toolArgs: Record<string, unknown>,
  callbacks: ConfirmationRequest['callback']
): ConfirmationRequest {
  const permission = getToolPermission(toolName);
  
  // 生成格式化的技术参数详情
  const formattedArgs: string[] = [];
  if (toolArgs) {
    for (const [key, value] of Object.entries(toolArgs)) {
      if (value !== undefined && value !== null) {
        formattedArgs.push(`${formatArgName(key)}: ${formatArgValue(value)}`);
      }
    }
  }

  // 生成用户友好的确认信息
  const userFriendly = generateUserFriendlyConfirmation(toolName, toolArgs, permission);
  
  // 构建技术详情
  const technicalDetails: TechnicalDetails = {
    toolName,
    action: toolArgs?.action as string | undefined,
    rawArgs: toolArgs,
    formattedArgs,
  };

  return {
    id: `confirm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    toolName,
    toolArgs,
    riskLevel: permission.riskLevel,
    // 保留旧字段以保持向后兼容
    message: userFriendly.description,
    details: formattedArgs,
    timestamp: Date.now(),
    expiresAt: Date.now() + 5 * 60 * 1000,  // 5分钟过期
    callback: callbacks,
    // 新增字段
    userFriendly,
    technicalDetails,
  };
}

/**
 * 格式化参数名
 */
function formatArgName(name: string): string {
  const nameMap: Record<string, string> = {
    amount: '金额',
    description: '描述',
    category: '分类',
    categoryId: '分类',
    date: '日期',
    type: '类型',
    accountId: '账户',
    id: 'ID',
    ids: 'ID列表',
    startDate: '开始日期',
    endDate: '结束日期',
  };
  return nameMap[name] || name;
}

/**
 * 格式化参数值
 */
function formatArgValue(value: unknown): string {
  if (typeof value === 'number') {
    return value.toLocaleString();
  }
  if (Array.isArray(value)) {
    if (value.length > 3) {
      return `[${value.slice(0, 3).join(', ')}... 共${value.length}项]`;
    }
    return `[${value.join(', ')}]`;
  }
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value).slice(0, 50) + '...';
  }
  return String(value);
}

// ============ 始终允许管理 ============

import {
  toolPermissionStorage,
  setToolAlwaysAllowedPersisted,
  removeToolAlwaysAllowedPersisted,
  isToolAlwaysAllowedPersisted,
  getAllAlwaysAllowedToolsPersisted,
  resetAllAlwaysAllowedPersisted,
} from '../../services/toolPermissionStorage';

/**
 * 初始化工具权限（需要在 App 启动时调用）
 */
export async function initializeToolPermissions(): Promise<void> {
  await toolPermissionStorage.initialize();
  console.log('✅ [Permissions] Tool permissions initialized from storage');
}

/**
 * 设置工具为"始终允许"（持久化）
 * @param toolName 工具名称
 */
export function setToolAlwaysAllowed(toolName: string): void {
  // 异步持久化，但不等待（保持同步接口兼容）
  setToolAlwaysAllowedPersisted(toolName).catch(err => {
    console.error('❌ [Permissions] Failed to persist always allowed:', err);
  });
}

/**
 * 移除工具的"始终允许"设置（持久化）
 * @param toolName 工具名称
 */
export function removeToolAlwaysAllowed(toolName: string): void {
  // 异步持久化，但不等待（保持同步接口兼容）
  removeToolAlwaysAllowedPersisted(toolName).catch(err => {
    console.error('❌ [Permissions] Failed to persist removal:', err);
  });
}

/**
 * 检查工具是否已设置为"始终允许"
 * @param toolName 工具名称
 */
export function isToolAlwaysAllowed(toolName: string): boolean {
  return isToolAlwaysAllowedPersisted(toolName);
}

/**
 * 获取所有"始终允许"的工具名称
 */
export function getAllAlwaysAllowedTools(): string[] {
  return getAllAlwaysAllowedToolsPersisted();
}

/**
 * 重置所有"始终允许"设置（持久化）
 */
export function resetAllAlwaysAllowed(): void {
  // 异步持久化，但不等待（保持同步接口兼容）
  resetAllAlwaysAllowedPersisted().catch(err => {
    console.error('❌ [Permissions] Failed to persist reset:', err);
  });
}

// ============ 调用频率限制 ============

interface CallRecord {
  toolName: string;
  timestamp: number;
}

const callHistory: CallRecord[] = [];
const MAX_HISTORY_SIZE = 1000;

/**
 * 记录工具调用
 */
export function recordToolCall(toolName: string): void {
  callHistory.push({
    toolName,
    timestamp: Date.now(),
  });

  // 清理旧记录
  if (callHistory.length > MAX_HISTORY_SIZE) {
    const cutoff = Date.now() - 60000;  // 保留最近1分钟
    const index = callHistory.findIndex(r => r.timestamp > cutoff);
    if (index > 0) {
      callHistory.splice(0, index);
    }
  }
}

/**
 * 检查是否超过调用频率限制
 */
export function checkRateLimit(toolName: string): {
  allowed: boolean;
  remainingCalls?: number;
  resetInMs?: number;
} {
  const permission = getToolPermission(toolName);
  
  if (!permission.maxCallsPerMinute) {
    return { allowed: true };
  }

  const oneMinuteAgo = Date.now() - 60000;
  const recentCalls = callHistory.filter(
    r => r.toolName === toolName && r.timestamp > oneMinuteAgo
  );

  const allowed = recentCalls.length < permission.maxCallsPerMinute;
  const remainingCalls = Math.max(0, permission.maxCallsPerMinute - recentCalls.length);
  
  // 计算重置时间
  let resetInMs = 0;
  if (!allowed && recentCalls.length > 0) {
    const oldestCall = recentCalls[0];
    resetInMs = oldestCall.timestamp + 60000 - Date.now();
  }

  return {
    allowed,
    remainingCalls,
    resetInMs,
  };
}

/**
 * 检查冷却时间
 */
export function checkCooldown(toolName: string): {
  allowed: boolean;
  remainingMs?: number;
} {
  const permission = getToolPermission(toolName);
  
  if (!permission.cooldownMs) {
    return { allowed: true };
  }

  const lastCall = [...callHistory]
    .reverse()
    .find(r => r.toolName === toolName);

  if (!lastCall) {
    return { allowed: true };
  }

  const elapsed = Date.now() - lastCall.timestamp;
  const allowed = elapsed >= permission.cooldownMs;

  return {
    allowed,
    remainingMs: allowed ? 0 : permission.cooldownMs - elapsed,
  };
}

// ============ 权限检查组合 ============

export interface PermissionCheckResult {
  allowed: boolean;
  requiresConfirmation: boolean;
  blockReason?: string;
  warnings: string[];
}

/**
 * 根据领域工具的 action 获取动态权限配置
 * 用于 transaction 等聚合工具，根据具体操作判断风险级别
 */
function getDynamicPermissionForDomainTool(
  toolName: string,
  toolArgs?: Record<string, unknown>
): ToolPermission | null {
  // 只处理领域聚合工具
  if (toolName !== 'transaction') {
    return null;
  }

  const action = toolArgs?.action as string | undefined;
  if (!action) {
    return null;
  }

  // 根据 action 返回对应的权限配置
  switch (action) {
    case 'query':
    case 'get':
    case 'statistics':
      return {
        toolName: `transaction.${action}`,
        riskLevel: 'low',
        operationType: 'read',
        description: '查询交易记录',
        requiresExplicitConfirmation: false,
      };

    case 'create':
      return {
        toolName: `transaction.${action}`,
        riskLevel: 'medium',
        operationType: 'write',
        description: '创建交易记录',
        confirmationMessage: '确认要创建这条交易记录吗？',
        requiresExplicitConfirmation: true, // 创建需要确认
      };

    case 'update':
      return {
        toolName: `transaction.${action}`,
        riskLevel: 'medium',
        operationType: 'write',
        description: '更新交易记录',
        confirmationMessage: '确认要修改这条交易记录吗？',
        requiresExplicitConfirmation: true, // 更新需要确认
      };

    case 'delete':
      return {
        toolName: `transaction.${action}`,
        riskLevel: 'high',
        operationType: 'delete',
        description: '删除交易记录',
        confirmationMessage: '删除后无法恢复，确认要删除吗？',
        requiresExplicitConfirmation: true,
        cooldownMs: 2000,
      };

    case 'batch_create':
      const itemCount = (toolArgs?.items as any[])?.length || 0;
      return {
        toolName: `transaction.${action}`,
        riskLevel: 'high',
        operationType: 'write',
        description: `批量创建 ${itemCount} 条交易记录`,
        confirmationMessage: `即将批量创建 ${itemCount} 条交易记录，确认执行吗？`,
        requiresExplicitConfirmation: true,
        maxCallsPerMinute: 5,
      };

    default:
      return null;
  }
}

/**
 * 综合权限检查
 */
export function checkToolPermission(
  toolName: string,
  toolArgs?: Record<string, unknown>
): PermissionCheckResult {
  // 尝试获取动态权限（领域聚合工具）
  const dynamicPermission = getDynamicPermissionForDomainTool(toolName, toolArgs);
  const permission = dynamicPermission || getToolPermission(toolName);
  
  const warnings: string[] = [];
  let allowed = true;
  let blockReason: string | undefined;

  // 检查频率限制
  const rateCheck = checkRateLimit(toolName);
  if (!rateCheck.allowed) {
    allowed = false;
    blockReason = `调用过于频繁，请${Math.ceil((rateCheck.resetInMs || 0) / 1000)}秒后重试`;
  }

  // 检查冷却时间
  const cooldownCheck = checkCooldown(toolName);
  if (!cooldownCheck.allowed) {
    allowed = false;
    blockReason = `操作冷却中，请${Math.ceil((cooldownCheck.remainingMs || 0) / 1000)}秒后重试`;
  }

  // 风险警告
  if (permission.riskLevel === 'high') {
    warnings.push('⚠️ 这是一个高风险操作');
  } else if (permission.riskLevel === 'critical') {
    warnings.push('🔴 这是一个关键危险操作，请谨慎确认');
  }

  // 特定工具的额外检查
  if (toolArgs && permission.operationType === 'delete') {
    const ids = toolArgs.ids || toolArgs.id;
    if (Array.isArray(ids) && ids.length > 10) {
      warnings.push(`即将删除 ${ids.length} 条记录`);
    }
  }

  // 批量操作的数量警告
  if (toolArgs && toolName === 'transaction' && toolArgs.action === 'batch_create') {
    const items = toolArgs.items as any[];
    if (items && items.length > 0) {
      warnings.push(`即将创建 ${items.length} 条交易记录`);
    }
  }

  // 检查是否已设置为"始终允许"
  // 注意：critical 级别的操作即使设置了始终允许，仍然需要确认
  // 对于领域工具，使用原始工具名 + action 作为始终允许的 key
  const alwaysAllowedKey = dynamicPermission ? `${toolName}.${toolArgs?.action}` : toolName;
  const needsConfirmation = requiresConfirmation(permission);
  const isAlwaysAllowed = isToolAlwaysAllowed(alwaysAllowedKey);
  const skipConfirmation = isAlwaysAllowed && permission.riskLevel !== 'critical';

  return {
    allowed,
    requiresConfirmation: needsConfirmation && !skipConfirmation,
    blockReason,
    warnings,
  };
}
