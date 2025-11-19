import { apiClient } from '../config';

/**
 * 反馈类型
 */
export interface Feedback {
  id: number;
  userId: number;
  type: '需求' | '优化' | 'BUG';
  title: string;
  description: string;
  status: '待处理' | '处理中' | '已完成' | '已关闭';
  adminReply?: string;
  createTime: string;
  updateTime: string;
}

/**
 * 提交反馈请求
 */
export interface SubmitFeedbackRequest {
  type: '需求' | '优化' | 'BUG';
  title: string;
  description: string;
}

export const feedbackAPI = {
  /**
   * 提交反馈
   */
  submit: async (data: SubmitFeedbackRequest): Promise<Feedback> => {
    const response = await apiClient.post<Feedback>('/feedback/submit', data);
    console.log('/feedback/submit响应数据:', response.data);
    return response.data;
  },

  /**
   * 获取当前用户的所有反馈
   */
  getAll: async (): Promise<Feedback[]> => {
    const response = await apiClient.get<Feedback[]>('/feedback/list');
    console.log('/feedback/list响应数据:', response.data);
    return response.data;
  },

  /**
   * 根据类型获取反馈
   */
  getByType: async (type: '需求' | '优化' | 'BUG'): Promise<Feedback[]> => {
    const response = await apiClient.get<Feedback[]>(`/feedback/list/${type}`);
    console.log(`/feedback/list/${type}响应数据:`, response.data);
    return response.data;
  },

  /**
   * 获取反馈详情
   */
  getById: async (id: number): Promise<Feedback> => {
    const response = await apiClient.get<Feedback>(`/feedback/${id}`);
    console.log(`/feedback/${id}响应数据:`, response.data);
    return response.data;
  },

  /**
   * 删除反馈
   */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/feedback/${id}`);
    console.log(`/feedback/${id} deleted`);
  },
};
