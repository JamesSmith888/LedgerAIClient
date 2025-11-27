/**
 * 数据导出 API
 * 提供数据导出相关的接口调用
 */
import { apiClient } from '../config';

// 导出格式
export type ExportFormat = 'JSON' | 'CSV' | 'EXCEL';

// 导出数据类型
export type ExportDataType = 'ALL' | 'TRANSACTIONS' | 'CATEGORIES' | 'PAYMENT_METHODS' | 'LEDGERS';

// 导出选项
export interface ExportOptions {
    format: ExportFormat;
    dataType: ExportDataType;
    ledgerId?: number | null;
    startDate?: string;
    endDate?: string;
}

// 导出结果
export interface ExportResult {
    success: boolean;
    message?: string;
    data?: any;
    base64Data?: string; // 用于二进制文件（如Excel）
    fileName?: string;
}

// 导出数据预览
export interface ExportPreview {
    transactionCount: number;
    categoryCount: number;
    paymentMethodCount: number;
    ledgerCount: number;
    estimatedSize: string;
}

export const exportAPI = {
    /**
     * 导出数据
     */
    exportData: async (options: ExportOptions): Promise<ExportResult> => {
        const response = await apiClient.post<ExportResult>(
            '/api/export/data',
            options
        );
        console.log('/api/export/data 响应:', response.data);
        return response.data;
    },

    /**
     * 获取导出数据预览（统计数量等）
     */
    getExportPreview: async (options: Partial<ExportOptions>): Promise<ExportPreview> => {
        const response = await apiClient.post<ExportPreview>(
            '/api/export/preview',
            options
        );
        console.log('/api/export/preview 响应:', response.data);
        return response.data;
    },

    /**
     * 获取导出历史记录
     */
    getExportHistory: async (): Promise<any[]> => {
        const response = await apiClient.get<any[]>('/api/export/history');
        console.log('/api/export/history 响应:', response.data);
        return response.data;
    },
};
