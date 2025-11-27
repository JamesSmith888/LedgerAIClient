import { apiClient } from "../config";

// 后端返回的分类类型
export interface CategoryResponse {
    id: number;
    name: string;
    icon: string;
    color: string;
    type: 'EXPENSE' | 'INCOME';
    sortOrder: number;
    isSystem: boolean;
    description?: string;
    isFrequent?: boolean;
    isRecommended?: boolean; // 系统推荐的常用分类
}

export const categoryAPI = {
    // 获取所有分类
    getAll: async (): Promise<CategoryResponse[]> => {
        const response = await apiClient.get<CategoryResponse[]>('/api/categories');
        console.log('/api/categories响应数据:', response.data);

        // 返回数据
        return response.data;
    },

    // 根据类型获取分类
    getByType: async (type: 'EXPENSE' | 'INCOME'): Promise<CategoryResponse[]> => {
        const response = await apiClient.get<CategoryResponse[]>(`/api/categories?type=${type}`);
        console.log(`/api/categories?type=${type}响应数据:`, response.data);

        // 返回数据
        return response.data;
    },

    // 获取支出分类
    getExpenseCategories: async (): Promise<CategoryResponse[]> => {
        const response = await apiClient.get<CategoryResponse[]>('/api/categories/expense');
        console.log('/api/categories/expense响应数据:', response.data);

        // 返回数据
        return response.data;
    },

    // 获取收入分类
    getIncomeCategories: async (): Promise<CategoryResponse[]> => {
        const response = await apiClient.get<CategoryResponse[]>('/api/categories/income');
        console.log('/api/categories/income响应数据:', response.data);

        // 返回数据
        return response.data;
    },

    // 创建自定义分类
    create: async (data: {
        name: string;
        icon: string;
        color: string;
        type: 'EXPENSE' | 'INCOME';
        description?: string;
    }): Promise<CategoryResponse> => {
        const response = await apiClient.post<CategoryResponse>('/api/categories', data);
        console.log('创建分类响应:', response.data);
        return response.data;
    },

    // 更新分类
    update: async (id: number, data: {
        name?: string;
        icon?: string;
        color?: string;
        type?: 'EXPENSE' | 'INCOME';
        description?: string;
    }): Promise<CategoryResponse> => {
        const response = await apiClient.put<CategoryResponse>(`/api/categories/${id}`, data);
        console.log('更新分类响应:', response.data);
        return response.data;
    },

    // 删除分类
    delete: async (id: number): Promise<void> => {
        await apiClient.delete(`/api/categories/${id}`);
        console.log('删除分类成功:', id);
    },

    // 获取用户自定义分类
    getCustomCategories: async (): Promise<CategoryResponse[]> => {
        const response = await apiClient.get<CategoryResponse[]>('/api/categories/custom');
        console.log('自定义分类响应:', response.data);
        return response.data;
    },

    // 获取常用分类
    getFrequentCategories: async (type: 'EXPENSE' | 'INCOME'): Promise<CategoryResponse[]> => {
        const response = await apiClient.get<CategoryResponse[]>(`/api/categories/frequent/${type}`);
        console.log(`常用${type === 'EXPENSE' ? '支出' : '收入'}分类响应:`, response.data);
        return response.data;
    },

    // 标记分类为常用
    markAsFrequent: async (id: number): Promise<void> => {
        await apiClient.post(`/api/categories/${id}/mark-frequent`);
        console.log('标记为常用成功:', id);
    },

    // 取消标记分类为常用
    unmarkAsFrequent: async (id: number): Promise<void> => {
        await apiClient.post(`/api/categories/${id}/unmark-frequent`);
        console.log('取消标记常用成功:', id);
    },

};