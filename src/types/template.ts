import { TransactionType } from './transaction';

/**
 * 交易模板类型
 */
export interface TransactionTemplate {
  id: number;
  userId: number;
  name: string;                    // 模板名称：如"地铁通勤"
  amount: number;                  // 默认金额
  type: TransactionType;           // 交易类型
  categoryId?: number;             // 分类ID
  paymentMethodId?: number;        // 支付方式ID
  description?: string;            // 描述
  allowAmountEdit: boolean;        // 使用时是否允许修改金额
  showInQuickPanel: boolean;       // 是否显示在快捷面板
  sortOrder: number;               // 排序顺序
  icon?: string;                   // 自定义图标
  color?: string;                  // 自定义颜色
  ledgerId?: number;               // 默认账本ID
  createTime?: string;             // 创建时间
  updateTime?: string;             // 更新时间
}

/**
 * 创建/更新模板请求
 */
export interface TransactionTemplateRequest {
  name: string;
  amount: number;
  type: number;  // 1-支出, 2-收入
  categoryId?: number;
  paymentMethodId?: number;
  description?: string;
  allowAmountEdit?: boolean;
  showInQuickPanel?: boolean;
  sortOrder?: number;
  icon?: string;
  color?: string;
  ledgerId?: number;
}

/**
 * 快速创建交易请求
 */
export interface QuickCreateTransactionRequest {
  amount?: number;              // 覆盖模板金额
  description?: string;         // 覆盖模板描述
  transactionDateTime?: string; // 指定交易时间
}

/**
 * 批量更新排序请求
 */
export interface TemplateSortOrderRequest {
  templateIds: number[];
}
