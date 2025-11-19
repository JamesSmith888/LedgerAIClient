import { apiClient } from '../api/config';
import { LoginRequest, RegisterRequest, AuthResponse } from '../types/user';

/**
 * OAuth 登录类型
 */
export type OAuthType = 'WECHAT' | 'ALIPAY' | 'GOOGLE' | 'APPLE';

/**
 * OAuth 登录请求
 */
export interface OAuthLoginRequest {
    oauthType: OAuthType;
    code?: string;        // 微信、支付宝、Apple 使用
    idToken?: string;     // Google 使用
    inviteCode?: string;  // 可选的邀请码
}

export const authAPI = {
    // 登录
    login: async (data: LoginRequest): Promise<AuthResponse> => {
        const response = await apiClient.post<AuthResponse>('/user/login', data);
        return response.data;
    },

    // 注册
    register: async (data: RegisterRequest): Promise<AuthResponse> => {
        const response = await apiClient.post<AuthResponse>('/user/register', data);
        return response.data;
    },

    // 第三方登录
    oauthLogin: async (data: OAuthLoginRequest): Promise<AuthResponse> => {
        const response = await apiClient.post<AuthResponse>('/oauth/login', data);
        return response.data;
    },

    // 登出
    logout: async (): Promise<void> => {
        await apiClient.post('/user/logout');
    }

};
