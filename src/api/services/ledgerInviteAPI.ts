import { apiClient } from '../config';
import type {
  InviteCode,
  CreateInviteCodeRequest,
  InviteValidateResponse,
  DirectInviteRequest,
} from '../../types/invite';
import type { LedgerMember } from '../../types/ledger';

/**
 * 账本邀请 API 服务
 */
export const ledgerInviteAPI = {
  /**
   * 生成邀请码
   * @param ledgerId 账本ID
   * @param data 邀请码配置
   */
  createInviteCode: async (
    ledgerId: number,
    data: CreateInviteCodeRequest
  ): Promise<InviteCode> => {
    const response = await apiClient.post(
      `/api/ledgers/${ledgerId}/invites`,
      data
    );
    return response.data;
  },

  /**
   * 获取账本的所有邀请码
   * @param ledgerId 账本ID
   * @param includeInactive 是否包含已禁用的邀请码
   */
  getInviteCodes: async (
    ledgerId: number,
    includeInactive: boolean = false
  ): Promise<InviteCode[]> => {
    const response = await apiClient.get(`/api/ledgers/${ledgerId}/invites`, {
      params: { includeInactive },
    });
    return response.data || [];
  },

  /**
   * 验证邀请码
   * @param code 邀请码
   */
  validateInviteCode: async (code: string): Promise<InviteValidateResponse> => {
    const response = await apiClient.get(`/api/ledgers/invites/validate/${code}`);
    return response.data;
  },

  /**
   * 使用邀请码加入账本
   * @param code 邀请码
   */
  acceptInvite: async (code: string): Promise<LedgerMember> => {
    const response = await apiClient.post(`/api/ledgers/invites/accept/${code}`);
    return response.data;
  },

  /**
   * 禁用邀请码
   * @param ledgerId 账本ID
   * @param inviteId 邀请码ID
   */
  disableInviteCode: async (ledgerId: number, inviteId: number): Promise<void> => {
    await apiClient.delete(`/api/ledgers/${ledgerId}/invites/${inviteId}`);
  },

  /**
   * 直接邀请用户（通过用户ID）
   * @param ledgerId 账本ID
   * @param data 直接邀请请求
   */
  directInvite: async (
    ledgerId: number,
    data: DirectInviteRequest
  ): Promise<LedgerMember> => {
    const response = await apiClient.post(
      `/api/ledgers/${ledgerId}/members/direct-invite`,
      data
    );
    return response.data;
  },
};
