import { apiClient } from '../config';
import type { CategoryStatistics, TrendStatistics, ReportQueryParams } from '../../types/report';

/**
 * 报表 API 服务
 */
export const reportAPI = {
    /**
     * 按分类统计
     * 用于生成饼图、柱状图等分类维度的图表
     */
    getStatisticsByCategory: async (params: ReportQueryParams): Promise<CategoryStatistics> => {
        const response = await apiClient.post<CategoryStatistics>(
            '/api/reports/by-category',
            params
        );
        console.log('/api/reports/by-category 响应数据:', response.data);
        return response.data;
    },

    /**
     * 按时间趋势统计
     * 用于生成折线图、面积图等时间序列图表
     */
    getTrendStatistics: async (params: ReportQueryParams): Promise<TrendStatistics> => {
        const response = await apiClient.post<TrendStatistics>(
            '/api/reports/trend',
            params
        );
        console.log('/api/reports/trend 响应数据:', response.data);
        return response.data;
    },
};
