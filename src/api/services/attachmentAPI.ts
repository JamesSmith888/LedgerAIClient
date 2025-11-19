import { apiClient } from '../config';
import { Attachment } from '../../types/attachment';

export const attachmentAPI = {
  /**
   * 上传附件
   */
  upload: async (transactionId: number, file: FormData): Promise<Attachment> => {
    const response = await apiClient.post<Attachment>(
      `/api/transactions/${transactionId}/attachments`,
      file,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  /**
   * 获取交易的附件列表
   */
  list: async (transactionId: number): Promise<Attachment[]> => {
    const response = await apiClient.get<Attachment[]>(
      `/api/transactions/${transactionId}/attachments`
    );
    return response.data;
  },

  /**
   * 获取缩略图URL
   */
  getThumbnailUrl: (attachmentId: number): string => {
    return `${apiClient.defaults.baseURL}/api/transactions/attachments/${attachmentId}/thumbnail`;
  },

  /**
   * 获取完整文件URL
   */
  getDownloadUrl: (attachmentId: number): string => {
    return `${apiClient.defaults.baseURL}/api/transactions/attachments/${attachmentId}/download`;
  },

  /**
   * 删除附件
   */
  delete: async (attachmentId: number): Promise<void> => {
    await apiClient.delete(`/api/transactions/attachments/${attachmentId}`);
  },
};
