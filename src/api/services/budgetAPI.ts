import { apiClient } from '../config';
import { BudgetOverview, BudgetSettingReq } from '../../types/budget';

export const budgetAPI = {
  /**
   * 设置预算
   */
  setBudget: async (req: BudgetSettingReq): Promise<void> => {
    await apiClient.post('/api/budgets/setting', req);
  },

  /**
   * 获取预算概览
   */
  getBudgetOverview: async (ledgerId: number, year?: number, month?: number): Promise<BudgetOverview | null> => {
    const params: any = { ledgerId };
    if (year) params.year = year;
    if (month) params.month = month;
    
    const response = await apiClient.get<BudgetOverview>('/api/budgets/overview', { params });
    return response.data;
  },
};
