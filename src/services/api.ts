/**
 * API 服务示例
 * 存放所有的 API 请求函数
 */

// 基础配置
const API_BASE_URL = 'https://api.example.com'; // 替换为你的 API 地址

/**
 * 通用请求函数
 */
const request = async (endpoint: string, options?: RequestInit) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

/**
 * 用户相关 API
 */
export const userAPI = {
  /**
   * 获取用户信息
   */
  getUserInfo: async (userId: string) => {
    return request(`/users/${userId}`);
  },

  /**
   * 更新用户信息
   */
  updateUserInfo: async (userId: string, data: any) => {
    return request(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

/**
 * 示例：如何使用
 * 
 * import { userAPI } from '../services/api';
 * 
 * const fetchUser = async () => {
 *   try {
 *     const user = await userAPI.getUserInfo('123');
 *     console.log(user);
 *   } catch (error) {
 *     console.error('Failed to fetch user:', error);
 *   }
 * };
 */
