/**
 * 用户相关 API
 */
import { apiClient } from '../config';

/**
 * 用户信息响应类型
 */
export interface UserProfile {
  id: number;
  username: string;
  nickname?: string;
  email?: string;
  avatarUrl?: string;
  defaultLedgerId?: number;
  status: number;
  createTime: string;
  updateTime: string;
}

/**
 * 更新用户信息请求类型
 */
export interface UpdateProfileRequest {
  nickname?: string;
  email?: string;
  avatarUrl?: string;
}

/**
 * 用户 API
 */
export const userAPI = {
  /**
   * 获取当前用户信息
   */
  getProfile: async (): Promise<UserProfile> => {
    const response = await apiClient.get<UserProfile>('/user/profile');
    return response.data;
  },

  /**
   * 更新用户信息
   */
  updateProfile: async (data: UpdateProfileRequest): Promise<UserProfile> => {
    const response = await apiClient.put<UserProfile>('/user/profile', data);
    return response.data;
  },

  /**
   * 更新用户默认账本
   */
  updateDefaultLedger: async (ledgerId: number | null): Promise<UserProfile> => {
    const response = await apiClient.put<UserProfile>('/user/default-ledger', {
      ledgerId,
    });
    return response.data;
  },

  /**
   * 获取用户默认账本ID
   */
  getDefaultLedger: async (): Promise<number | null> => {
    const response = await apiClient.get<number>('/user/default-ledger');
    return response.data;
  },

  /**
   * 上传用户头像
   */
  uploadAvatar: async (file: FormData): Promise<string> => {
    const response = await apiClient.post<string>('/user/avatar', file, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
