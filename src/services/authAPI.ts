import { apiClient } from '../api/config';
import { LoginRequest, RegisterRequest, AuthResponse } from '../types/user';

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


    // 登出
    logout: async (): Promise<void> => {
        await apiClient.post('/user/logout');
    }

};
