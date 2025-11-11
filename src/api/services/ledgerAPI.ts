import { apiClient } from '../config';
import type {
  Ledger,
  CreateLedgerRequest,
  UpdateLedgerRequest,
} from '../../types/ledger';

/**
 * 账本 API 服务
 */
export const ledgerAPI = {
    /**
     * 创建个人账本
     */
    create: async (data: CreateLedgerRequest): Promise<Ledger> => {
        const response = await apiClient.post('/api/ledgers', data);
        return response.data.data;
    },

    /**
     * 创建共享账本
     */
    createShared: async (data: CreateLedgerRequest): Promise<Ledger> => {
        const response = await apiClient.post('/api/ledgers/shared', data);
        return response.data.data;
    },

    /**
     * 获取当前用户的所有账本（包括自己创建和参与的）
     */
    getAll: async (): Promise<Ledger[]> => {
        const response = await apiClient.get('/api/ledgers');
        return response.data;
    },

    /**
     * 获取当前用户拥有的账本
     */
    getOwned: async (): Promise<Ledger[]> => {
        const response = await apiClient.get('/api/ledgers/owned');
        return response.data;
    },

    /**
     * 获取当前用户参与的共享账本
     */
    getShared: async (): Promise<Ledger[]> => {
        const response = await apiClient.get('/api/ledgers/shared');
        return response.data;
    },

    /**
     * 根据ID获取账本详情
     */
    getById: async (id: number): Promise<Ledger> => {
        const response = await apiClient.get(`/api/ledgers/${id}`);
        return response.data;
    },

    /**
     * 更新账本
     */
    update: async (id: number, data: UpdateLedgerRequest): Promise<Ledger> => {
        const response = await apiClient.put(`/api/ledgers/${id}`, data);
        return response.data;
    },

    /**
     * 删除账本
     */
    delete: async (id: number): Promise<void> => {
        await apiClient.delete(`/api/ledgers/${id}`);
    },
};
