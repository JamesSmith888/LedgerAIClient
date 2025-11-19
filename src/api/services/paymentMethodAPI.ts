import { apiClient } from '../config';
import type { PaymentMethod, PaymentMethodReq } from '../../types/paymentMethod';

export const paymentMethodAPI = {
  /**
   * 获取当前用户的所有支付方式
   */
  getAll: async (): Promise<PaymentMethod[]> => {
    const response = await apiClient.get<PaymentMethod[]>('/api/payment-methods');
    console.log('/api/payment-methods响应数据:', response.data);
    return response.data;
  },

  /**
   * 创建支付方式
   */
  create: async (data: PaymentMethodReq): Promise<PaymentMethod> => {
    const response = await apiClient.post<PaymentMethod>('/api/payment-methods', data);
    console.log('/api/payment-methods create响应数据:', response.data);
    return response.data;
  },

  /**
   * 更新支付方式
   */
  update: async (id: number, data: PaymentMethodReq): Promise<PaymentMethod> => {
    const response = await apiClient.put<PaymentMethod>(`/api/payment-methods/${id}`, data);
    console.log(`/api/payment-methods/${id} update响应数据:`, response.data);
    return response.data;
  },

  /**
   * 设置默认支付方式
   */
  setDefault: async (id: number): Promise<void> => {
    await apiClient.post(`/api/payment-methods/${id}/set-default`);
  },

  /**
   * 删除支付方式
   */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/payment-methods/${id}`);
  },

  /**
   * 初始化默认支付方式（用于老用户）
   */
  initDefaults: async (): Promise<PaymentMethod[]> => {
    const response = await apiClient.post<PaymentMethod[]>('/api/payment-methods/init-defaults');
    console.log('/api/payment-methods/init-defaults响应数据:', response.data);
    return response.data;
  },
};
