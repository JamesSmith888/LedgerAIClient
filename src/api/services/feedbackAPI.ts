import { apiClient } from '../config';

/**
 * 反馈类型
 */
export interface Feedback {
  id: number;
  userId: number;
  userName?: string;
  userNickname?: string;
  type: '需求' | '优化' | 'BUG';
  title: string;
  description: string;
  status: '待处理' | '处理中' | '已完成' | '已关闭';
  adminReply?: string;
  createTime: string;
  updateTime: string;
  commentCount?: number;
  upvoteCount?: number;
  downvoteCount?: number;
  userReaction?: 'upvote' | 'downvote' | null;
  canDelete?: boolean;
  canClose?: boolean;
}

/**
 * 反馈评论类型
 */
export interface FeedbackComment {
  id: number;
  feedbackId: number;
  userId: number;
  userName?: string;
  userNickname?: string;
  content: string;
  createTime: string;
  upvoteCount?: number;
  downvoteCount?: number;
  userReaction?: 'upvote' | 'downvote' | null;
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

  /**
   * 获取所有公开反馈
   */
  getAllPublic: async (): Promise<Feedback[]> => {
    const response = await apiClient.get<Feedback[]>('/feedback/public');
    console.log('/feedback/public响应数据:', response.data);
    return response.data;
  },

  /**
   * 根据类型获取公开反馈
   */
  getPublicByType: async (type: '需求' | '优化' | 'BUG'): Promise<Feedback[]> => {
    const response = await apiClient.get<Feedback[]>(`/feedback/public/type/${type}`);
    console.log(`/feedback/public/type/${type}响应数据:`, response.data);
    return response.data;
  },

  /**
   * 根据状态获取公开反馈
   */
  getPublicByStatus: async (status: '待处理' | '处理中' | '已完成' | '已关闭'): Promise<Feedback[]> => {
    const response = await apiClient.get<Feedback[]>(`/feedback/public/status/${status}`);
    console.log(`/feedback/public/status/${status}响应数据:`, response.data);
    return response.data;
  },

  /**
   * 搜索反馈
   */
  search: async (keyword: string): Promise<Feedback[]> => {
    const response = await apiClient.get<Feedback[]>('/feedback/search', {
      params: { keyword },
    });
    console.log('/feedback/search响应数据:', response.data);
    return response.data;
  },

  /**
   * 获取反馈的评论列表
   */
  getComments: async (feedbackId: number): Promise<FeedbackComment[]> => {
    const response = await apiClient.get<FeedbackComment[]>(`/feedback/${feedbackId}/comments`);
    console.log(`/feedback/${feedbackId}/comments响应数据:`, response.data);
    return response.data;
  },

  /**
   * 添加评论
   */
  addComment: async (feedbackId: number, content: string): Promise<FeedbackComment> => {
    const response = await apiClient.post<FeedbackComment>(`/feedback/${feedbackId}/comments`, {
      content,
    });
    console.log(`/feedback/${feedbackId}/comments响应数据:`, response.data);
    return response.data;
  },

  /**
   * 关闭反馈
   */
  close: async (id: number): Promise<void> => {
    await apiClient.put(`/feedback/${id}/close`);
    console.log(`/feedback/${id} closed`);
  },

  /**
   * 重新打开反馈
   */
  reopen: async (id: number): Promise<void> => {
    await apiClient.put(`/feedback/${id}/reopen`);
    console.log(`/feedback/${id} reopened`);
  },

  /**
   * 对反馈进行点赞
   */
  upvoteFeedback: async (feedbackId: number): Promise<void> => {
    await apiClient.post(`/feedback/${feedbackId}/upvote`);
    console.log(`/feedback/${feedbackId}/upvote success`);
  },

  /**
   * 对反馈进行倒赞
   */
  downvoteFeedback: async (feedbackId: number): Promise<void> => {
    await apiClient.post(`/feedback/${feedbackId}/downvote`);
    console.log(`/feedback/${feedbackId}/downvote success`);
  },

  /**
   * 取消对反馈的反应
   */
  removeFeedbackReaction: async (feedbackId: number): Promise<void> => {
    await apiClient.delete(`/feedback/${feedbackId}/reaction`);
    console.log(`/feedback/${feedbackId}/reaction removed`);
  },

  /**
   * 对评论进行点赞
   */
  upvoteComment: async (feedbackId: number, commentId: number): Promise<void> => {
    await apiClient.post(`/feedback/${feedbackId}/comments/${commentId}/upvote`);
    console.log(`/feedback/${feedbackId}/comments/${commentId}/upvote success`);
  },

  /**
   * 对评论进行倒赞
   */
  downvoteComment: async (feedbackId: number, commentId: number): Promise<void> => {
    await apiClient.post(`/feedback/${feedbackId}/comments/${commentId}/downvote`);
    console.log(`/feedback/${feedbackId}/comments/${commentId}/downvote success`);
  },

  /**
   * 取消对评论的反应
   */
  removeCommentReaction: async (feedbackId: number, commentId: number): Promise<void> => {
    await apiClient.delete(`/feedback/${feedbackId}/comments/${commentId}/reaction`);
    console.log(`/feedback/${feedbackId}/comments/${commentId}/reaction removed`);
  },
};
