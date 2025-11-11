import { apiClient } from '../config';
import type {
  LedgerMember,
  AddMemberRequest,
  LedgerMemberRole,
} from '../../types/ledger';

/**
 * 账本成员 API 服务
 */
export const ledgerMemberAPI = {
  /**
   * 添加成员到账本
   */
  addMember: async (ledgerId: number, data: AddMemberRequest): Promise<LedgerMember> => {
    const response = await apiClient.post(`/api/ledgers/${ledgerId}/members`, data);
    return response.data;
  },

  /**
   * 获取账本的所有成员
   */
  getMembers: async (ledgerId: number): Promise<LedgerMember[]> => {
    const response = await apiClient.get(`/api/ledgers/${ledgerId}/members`);
    return response.data;
  },

  /**
   * 移除成员
   */
  removeMember: async (ledgerId: number, userId: number): Promise<void> => {
    await apiClient.delete(`/api/ledgers/${ledgerId}/members/${userId}`);
  },

  /**
   * 更新成员角色
   */
  updateRole: async (
    ledgerId: number,
    userId: number,
    role: LedgerMemberRole
  ): Promise<LedgerMember> => {
    const response = await apiClient.put(
      `/api/ledgers/${ledgerId}/members/${userId}/role`,
      { role }
    );
    return response.data;
  },

  /**
   * 退出账本（成员主动退出）
   */
  leave: async (ledgerId: number): Promise<void> => {
    await apiClient.post(`/api/ledgers/${ledgerId}/leave`);
  },
};
