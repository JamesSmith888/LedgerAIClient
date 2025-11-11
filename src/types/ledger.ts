/**
 * 账本类型定义
 * 对应后端 LedgerTypeEnum
 */

// 账本类型枚举
export enum LedgerType {
  PERSONAL = 1,   // 个人账本
  SHARED = 2,     // 共享账本
  BUSINESS = 3,   // 企业账本（预留）
}

// 成员角色枚举
export enum LedgerMemberRole {
  OWNER = 1,    // 所有者
  ADMIN = 2,    // 管理员
  EDITOR = 3,   // 记账员
  VIEWER = 4,   // 查看者
}

// 成员状态枚举
export enum MemberStatus {
  ACTIVE = 1,   // 正常
  INACTIVE = 2, // 暂停
  PENDING = 3,  // 待确认
}

/**
 * 账本实体
 * 对应后端 LedgerEntity
 */
export interface Ledger {
  id: number;
  name: string;
  description?: string;
  ownerUserId: number;
  type: LedgerType;
  typeName?: string;          // 类型描述（前端显示用）
  maxMembers?: number;        // 最大成员数
  memberCount?: number;       // 当前成员数（仅共享账本）
  isPublic?: boolean;         // 是否公开
  createTime: string;         // ISO 日期字符串
  updateTime: string;
}

/**
 * 账本成员实体
 * 对应后端 LedgerMemberEntity
 */
export interface LedgerMember {
  id: number;
  ledgerId: number;
  userId: number;
  role: LedgerMemberRole;
  joinedAt: string;
  invitedByUserId?: number;
  status: MemberStatus;
  remark?: string;

  // 扩展字段（前端显示用）
  userName?: string;
  userAvatar?: string;
}

/**
 * 创建账本请求
 * 对应后端 CreateLedgerRequest
 */
export interface CreateLedgerRequest {
  name: string;
  description?: string;
  maxMembers?: number;
  isPublic?: boolean;
}

/**
 * 更新账本请求
 */
export interface UpdateLedgerRequest {
  name?: string;
  description?: string;
  maxMembers?: number;
  isPublic?: boolean;
}

/**
 * 添加成员请求
 */
export interface AddMemberRequest {
  userId: number;
  role: LedgerMemberRole;
  remark?: string;
}

/**
 * 工具函数：获取账本类型描述
 */
export const getLedgerTypeName = (type: LedgerType): string => {
  switch (type) {
    case LedgerType.PERSONAL:
      return '个人账本';
    case LedgerType.SHARED:
      return '共享账本';
    case LedgerType.BUSINESS:
      return '企业账本';
    default:
      return '未知类型';
  }
};

/**
 * 工具函数：获取角色描述
 */
export const getRoleName = (role: LedgerMemberRole): string => {
  switch (role) {
    case LedgerMemberRole.OWNER:
      return '所有者';
    case LedgerMemberRole.ADMIN:
      return '管理员';
    case LedgerMemberRole.EDITOR:
      return '记账员';
    case LedgerMemberRole.VIEWER:
      return '查看者';
    default:
      return '未知角色';
  }
};

/**
 * 工具函数：获取角色颜色
 */
export const getRoleColor = (role: LedgerMemberRole): string => {
  switch (role) {
    case LedgerMemberRole.OWNER:
      return '#e53e3e'; // 红色
    case LedgerMemberRole.ADMIN:
      return '#dd6b20'; // 橙色
    case LedgerMemberRole.EDITOR:
      return '#38a169'; // 绿色
    case LedgerMemberRole.VIEWER:
      return '#4299e1'; // 蓝色
    default:
      return '#718096'; // 灰色
  }
};

/**
 * 工具函数：判断角色是否有编辑权限
 */
export const hasEditPermission = (role: LedgerMemberRole): boolean => {
  return role <= LedgerMemberRole.EDITOR;
};

/**
 * 工具函数：判断角色是否有管理权限
 */
export const hasManagePermission = (role: LedgerMemberRole): boolean => {
  return role <= LedgerMemberRole.ADMIN;
};
