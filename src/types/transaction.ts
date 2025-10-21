export type TransactionType = 'expense' | 'income';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: Category;
  description?: string;
  date: string;
  accountId: string;
  images?: string[];
}

// 预定义的类别
export const EXPENSE_CATEGORIES: Category[] = [
  { id: '1', name: '餐饮', icon: '🍜', color: '#FF9500', type: 'expense' },
  { id: '2', name: '购物', icon: '🛍️', color: '#FF2D55', type: 'expense' },
  { id: '3', name: '交通', icon: '🚗', color: '#5AC8FA', type: 'expense' },
  { id: '4', name: '日用', icon: '🏠', color: '#34C759', type: 'expense' },
  { id: '5', name: '娱乐', icon: '🎮', color: '#AF52DE', type: 'expense' },
  { id: '6', name: '医疗', icon: '💊', color: '#FF3B30', type: 'expense' },
  { id: '7', name: '教育', icon: '📚', color: '#007AFF', type: 'expense' },
  { id: '8', name: '通讯', icon: '📱', color: '#5AC8FA', type: 'expense' },
];

export const INCOME_CATEGORIES: Category[] = [
  { id: '101', name: '工资', icon: '💰', color: '#34C759', type: 'income' },
  { id: '102', name: '奖金', icon: '🎁', color: '#FF9500', type: 'income' },
  { id: '103', name: '理财', icon: '📈', color: '#FFD60A', type: 'income' },
  { id: '104', name: '兼职', icon: '💼', color: '#00C7BE', type: 'income' },
];

// 快速金额选项（简单录入使用）
export const QUICK_AMOUNTS = [1, 5, 10, 20, 50, 100, 200, 500];

// 时间快速选择
export const QUICK_TIME_OPTIONS = [
  { label: '刚才', value: 0 },
  { label: '今天', value: 0 },
  { label: '昨天', value: -1 },
  { label: '前天', value: -2 },
];
