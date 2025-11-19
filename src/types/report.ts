/**
 * 报表相关类型定义
 */

// ========== 查询参数 ==========
export interface ReportQueryParams {
    ledgerId?: number | null;
    type?: 1 | 2 | null;  // 1=收入 2=支出
    categoryIds?: number[];
    startTime: string;  // ISO 8601 格式
    endTime: string;
    groupBy: 'day' | 'week' | 'month' | 'year';
    dimension: 'category' | 'ledger' | 'paymentMethod' | 'creator';
}

// ========== 统计项 ==========
export interface StatisticsItem {
    key: string;
    label: string;
    icon?: string;
    amount: number;
    count: number;
    percentage: number;
    trend?: number;
}

// ========== 分类统计响应 ==========
export interface CategoryStatistics {
    items: StatisticsItem[];
    totalAmount: number;
    totalCount: number;
    timeRange: {
        startTime: string;
        endTime: string;
    };
}

// ========== 趋势数据点 ==========
export interface TrendDataPoint {
    date: string;
    income: number;
    expense: number;
    balance: number;
    count: number;
    categories?: Record<string, number>;
}

// ========== 趋势统计响应 ==========
export interface TrendStatistics {
    dataPoints: TrendDataPoint[];
    summary: {
        totalIncome: number;
        totalExpense: number;
        netBalance: number;
        totalCount: number;
        avgIncome: number;
        avgExpense: number;
    };
    groupBy: string;
}

// ========== 图表类型 ==========
export type ChartType = 'line' | 'bar' | 'pie' | 'donut' | 'area';

// ========== 时间粒度 ==========
export type TimeGranularity = 'day' | 'week' | 'month' | 'year';

// ========== 分析维度 ==========
export type AnalysisDimension = 'category' | 'ledger' | 'paymentMethod' | 'creator';
