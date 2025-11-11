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
    }

};