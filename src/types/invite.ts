/**
 * 邀请相关类型定义
 * 对应后端 InviteCodeEntity 和相关 DTO
 */

import { LedgerMemberRole } from './ledger';

/**
 * 邀请码实体
 * 对应后端 InviteCodeEntity
 */
export interface InviteCode {
  id: number;
  code: string;
  ledgerId: number;
  ledgerName?: string;
  createdByUserId: number;
  createdByUserName?: string;
  role: number;                    // 角色代码
  roleName: string;                // 角色名称
  maxUses: number;                 // 最大使用次数（-1表示无限）
  usedCount: number;               // 已使用次数
  expireTime?: string;             // 过期时间（ISO字符串）
  isExpired: boolean;              // 是否已过期
  isExhausted: boolean;            // 是否已达上限
  status: number;                  // 状态：1-有效，0-禁用
  statusName: string;              // 状态名称
  createTime: string;
  updateTime: string;
  inviteUrl?: string;              // 完整邀请链接
}

/**
 * 创建邀请码请求
 * 对应后端 CreateInviteCodeRequest
 */
export interface CreateInviteCodeRequest {
  role: number;                    // 邀请角色代码（2-4）
  maxUses?: number;                // 最大使用次数（-1表示无限）
  expireHours?: number;            // 过期时间（小时）
}

/**
 * 邀请码验证响应
 * 对应后端 InviteValidateResponse
 */
export interface InviteValidateResponse {
  isValid: boolean;
  errorMessage?: string;
  ledgerId?: number;
  ledgerName?: string;
  ledgerDescription?: string;
  inviterName?: string;
  role?: number;
  roleName?: string;
  expireTime?: string;
  memberCount?: number;
  maxMembers?: number;
}

/**
 * 直接邀请请求
 * 对应后端 DirectInviteRequest
 */
export interface DirectInviteRequest {
  userId: number;
  role: number;
}

/**
 * 邀请码使用记录
 */
export interface InviteRecord {
  id: number;
  inviteCodeId: number;
  ledgerId: number;
  userId: number;
  userName?: string;
  useTime: string;
}

/**
 * 邀请角色选项
 * 用于前端角色选择器
 */
export interface RoleOption {
  code: LedgerMemberRole;
  name: string;
  description: string;
  color: string;
  icon: string;
}

/**
 * 邀请角色选项列表
 */
export const INVITE_ROLE_OPTIONS: RoleOption[] = [
  {
    code: LedgerMemberRole.ADMIN,
    name: '管理员',
    description: '可管理成员、修改账本设置',
    color: '#FF6B6B',
    icon: '👑',
  },
  {
    code: LedgerMemberRole.EDITOR,
    name: '记账员',
    description: '可添加、编辑、删除交易记录',
    color: '#4ECDC4',
    icon: '✍️',
  },
  {
    code: LedgerMemberRole.VIEWER,
    name: '查看者',
    description: '只能查看账本内容',
    color: '#95E1D3',
    icon: '👀',
  },
];

/**
 * 获取角色选项
 */
export const getRoleOption = (role: number): RoleOption | undefined => {
  return INVITE_ROLE_OPTIONS.find(option => option.code === role);
};

/**
 * 获取角色名称
 */
export const getRoleName = (role: number): string => {
  const option = getRoleOption(role);
  return option?.name || '未知角色';
};

/**
 * 获取角色颜色
 */
export const getRoleColor = (role: number): string => {
  const option = getRoleOption(role);
  return option?.color || '#999999';
};

/**
 * 获取角色图标
 */
export const getRoleIcon = (role: number): string => {
  const option = getRoleOption(role);
  return option?.icon || '👤';
};
