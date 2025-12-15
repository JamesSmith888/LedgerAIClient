export interface CategoryBudget {
  categoryId: number;
  categoryName: string;
  categoryIcon: string;
  budgetAmount: number;
  expenseAmount: number;
  remainingAmount: number;
  progress: number; // 0-100
  status: 'NORMAL' | 'WARNING' | 'EXCEEDED';
}

export interface BudgetOverview {
  ledgerId: number;
  totalBudget: number;
  totalExpense: number;
  remainingBudget: number;
  progress: number; // 0-100
  status: 'NORMAL' | 'WARNING' | 'EXCEEDED';
  categoryBudgets: CategoryBudget[];
}

export interface BudgetSettingReq {
  ledgerId: number;
  totalAmount: number;
  categoryBudgets: {
    categoryId: number;
    amount: number;
  }[];
}
