import { apiClient } from '../config';
import { Transaction } from '../../types/transaction';

export interface TransactionResponse {
    id: number;
    name?: string;
    type: 'EXPENSE' | 'INCOME';
    amount: number;
    categoryId: number;
    description?: string;
    transactionDateTime: string;
    ledgerId?: number;
    createdByUserId?: number;
}

export interface TransactionQueryParams {
    ledgerId?: number | null;
    type?: number | null; // 1-收入, 2-支出, null-全部
    categoryId?: number | null;
    startTime?: string | null;
    endTime?: string | null;
    page?: number;
    size?: number;
    sortBy?: 'transactionDateTime' | 'amount' | 'createTime';
    sortDirection?: 'ASC' | 'DESC';
}

export interface TransactionPageResponse {
    content: Transaction[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
    hasNext: boolean;
    hasPrevious: boolean;
}

export const transactionAPI = {

    create: async (transaction: Omit<Transaction, 'id'>): Promise<{ id: number }> => {
        // 发送POST请求
        const response = await apiClient.post<number>(
            '/api/transactions/create',
            transaction,
        );
        console.log('/api/transactions/create响应数据:', response);

        // 后端返回的是交易ID（在data字段中），包装成对象
        return { id: response.data };
    },

    /**
     * 查询交易列表（支持分页和多条件查询）
     */
    query: async (params: TransactionQueryParams = {}): Promise<TransactionPageResponse> => {
        const {
            ledgerId,
            type,
            categoryId,
            startTime,
            endTime,
            page = 0,
            size = 20,
            sortBy = 'transactionDateTime',
            sortDirection = 'DESC'
        } = params;

        const response = await apiClient.post<TransactionPageResponse>(
            '/api/transactions/query',
            {
                ledgerId,
                type,
                categoryId,
                startTime,
                endTime,
                page,
                size,
                sortBy,
                sortDirection
            }
        );
        console.log('/api/transactions/query响应数据:', response.data);

        return response.data;
    },

    /**
     * 获取所有交易（已废弃，建议使用 query 方法）
     * @deprecated 请使用 query 方法
     */
    getAll: async (): Promise<Transaction[]> => {
        // 发送GET请求
        const response = await apiClient.get<TransactionResponse[]>(
            '/api/transactions/getAll',
        );
        console.log('/api/transactions/getAll响应数据:', response.data);

        // 后端返回的 response.data 已经是数组了
        return response.data;
    },

    moveToLedger: async (transactionId: number | string, targetLedgerId: number): Promise<void> => {
        const id = transactionId.toString();
        await apiClient.post(`/api/transactions/${id}/move-ledger`, {
            targetLedgerId,
        });
    },

    /**
     * 删除交易（逻辑删除）
     */
    delete: async (transactionId: number | string): Promise<void> => {
        await apiClient.delete(`/api/transactions/${transactionId}`);
    },

    /**
     * 更新交易
     */
    update: async (
        transactionId: number | string,
        transaction: Partial<Omit<Transaction, 'id'>>
    ): Promise<Transaction> => {
        const response = await apiClient.put<TransactionResponse>(
            `/api/transactions/${transactionId}`,
            transaction
        );
        console.log('/api/transactions/{id} 更新响应:', response.data);
        return response.data;
    },
};
