import { apiClient } from '../config';
import type { 
  TransactionTemplate, 
  TransactionTemplateRequest, 
  QuickCreateTransactionRequest,
  TemplateSortOrderRequest 
} from '../../types/template';
import type { Transaction } from '../../types/transaction';

/**
 * 交易模板 API
 */
export const templateAPI = {
  /**
   * 获取所有模板
   */
  getAll: async (): Promise<TransactionTemplate[]> => {
    const response = await apiClient.get<TransactionTemplate[]>('/api/templates/list');
    console.log('/api/templates/list 响应数据:', response.data);
    return response.data;
  },

  /**
   * 获取快捷面板模板
   */
  getQuickPanelTemplates: async (): Promise<TransactionTemplate[]> => {
    const response = await apiClient.get<TransactionTemplate[]>('/api/templates/quick-panel');
    console.log('/api/templates/quick-panel 响应数据:', response.data);
    return response.data;
  },

  /**
   * 获取单个模板
   */
  getById: async (id: number): Promise<TransactionTemplate> => {
    const response = await apiClient.get<TransactionTemplate>(`/api/templates/${id}`);
    console.log(`/api/templates/${id} 响应数据:`, response.data);
    return response.data;
  },

  /**
   * 创建模板
   */
  create: async (data: TransactionTemplateRequest): Promise<TransactionTemplate> => {
    const response = await apiClient.post<TransactionTemplate>('/api/templates/create', data);
    console.log('/api/templates/create 响应数据:', response.data);
    return response.data;
  },

  /**
   * 更新模板
   */
  update: async (id: number, data: TransactionTemplateRequest): Promise<TransactionTemplate> => {
    const response = await apiClient.put<TransactionTemplate>(`/api/templates/${id}`, data);
    console.log(`/api/templates/${id} update 响应数据:`, response.data);
    return response.data;
  },

  /**
   * 删除模板
   */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/templates/${id}`);
  },

  /**
   * 批量更新模板排序
   */
  updateSortOrder: async (data: TemplateSortOrderRequest): Promise<void> => {
    await apiClient.post('/api/templates/sort-order', data);
  },

  /**
   * 快速创建交易（基于模板）
   */
  quickCreateTransaction: async (
    templateId: number, 
    data?: QuickCreateTransactionRequest
  ): Promise<Transaction> => {
    const response = await apiClient.post<Transaction>(
      `/api/templates/${templateId}/quick-create`, 
      data || {}
    );
    console.log(`/api/templates/${templateId}/quick-create 响应数据:`, response.data);
    return response.data;
  },
};
