export type TransactionType = 'EXPENSE' | 'INCOME';

// 交易来源类型
export type TransactionSource = 'MANUAL' | 'AI';

export interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  isSystem?: boolean;
  isFrequent?: boolean;
  isRecommended?: boolean; // 系统推荐的常用分类
}

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  categoryId: number;
  description?: string;
  transactionDateTime: string;
  ledgerId?: number;
  createdByUserId?: number;
  createdByUserName?: string;  // 创建人用户名（用于后备）
  createdByUserNickname?: string;  // 创建人昵称（优先显示）
  paymentMethodId?: number;
  attachmentCount?: number; // 附件数量
  source?: TransactionSource; // 交易来源：MANUAL-手动录入，AI-AI助手创建
  parentId?: number; // 父交易ID（用于聚合交易）
  aggregatedAmount?: number; // 聚合总金额（父+子）
  childCount?: number; // 子交易数量
}

// 子交易类型 - 现在包含完整的交易信息
export interface ChildTransaction {
  id: number;
  description?: string;
  amount: number;
  type: TransactionType;
  transactionDateTime: string;
  ledgerId?: number;
  createdByUserId?: number;
  createdByUserName?: string;
  createdByUserNickname?: string;
  categoryId: number;
  paymentMethodId?: number;
  attachmentCount?: number;
  source?: TransactionSource;
  parentId?: number;
  createTime: string;
}

// 聚合交易类型（包含父交易和所有子交易）
export interface AggregatedTransaction extends Transaction {
  aggregatedAmount: number; // 聚合总金额
  latestDateTime: string; // 最新交易时间
  children: ChildTransaction[]; // 子交易列表
}

// 预定义的类别
export const EXPENSE_CATEGORIES: Category[] = [
  { id: 1, name: '餐饮', icon: '🍜', color: '#FF9500', type: 'EXPENSE' },
  { id: 2, name: '购物', icon: '🛍️', color: '#FF2D55', type: 'EXPENSE' },
  { id: 3, name: '交通', icon: '🚗', color: '#5AC8FA', type: 'EXPENSE' },
  { id: 4, name: '日用', icon: '🏠', color: '#34C759', type: 'EXPENSE' },
  { id: 5, name: '娱乐', icon: '🎮', color: '#AF52DE', type: 'EXPENSE' },
  { id: 6, name: '医疗', icon: '💊', color: '#FF3B30', type: 'EXPENSE' },
  { id: 7, name: '教育', icon: '📚', color: '#007AFF', type: 'EXPENSE' },
  { id: 8, name: '通讯', icon: '📱', color: '#5AC8FA', type: 'EXPENSE' },
];

export const INCOME_CATEGORIES: Category[] = [
  { id: 101, name: '工资', icon: '💰', color: '#34C759', type: 'INCOME' },
  { id: 102, name: '奖金', icon: '🎁', color: '#FF9500', type: 'INCOME' },
  { id: 103, name: '理财', icon: '📈', color: '#FFD60A', type: 'INCOME' },
  { id: 104, name: '兼职', icon: '💼', color: '#00C7BE', type: 'INCOME' },
];

// 快速金额选项（简单录入使用）
export const QUICK_AMOUNT = [1, 5, 10, 20, 50, 100, 200, 500];

// 时间快速选择
export const QUICK_TIME_OPTIONS = [
  { label: '刚才', value: 0 },
  { label: '今天', value: 0 },
  { label: '昨天', value: -1 },
  { label: '前天', value: -2 },
];
