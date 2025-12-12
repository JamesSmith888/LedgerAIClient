/**
 * 嵌入式组件导出
 * 
 * 统一导出所有可嵌入到消息中的组件
 * 便于后续扩展和管理
 */

export { CollapsibleSection } from './CollapsibleSection';
export type { CollapsibleSectionProps } from './CollapsibleSection';

export { ToolCallDisplay } from './ToolCallDisplay';
export type { ToolCallData, ToolCallDisplayProps } from './ToolCallDisplay';

// 交易相关嵌入式组件
export { TransactionCard } from './TransactionCard';
export type { TransactionCardData, TransactionCardProps } from './TransactionCard';

export { TransactionListDisplay } from './TransactionListDisplay';
export type { 
  TransactionListDisplayData, 
  TransactionListDisplayProps,
  TransactionListStatistics,
} from './TransactionListDisplay';

export { TransactionDetailDisplay } from './TransactionDetailDisplay';
export type { TransactionDetailData, TransactionDetailDisplayProps } from './TransactionDetailDisplay';

// 统计和操作组件
export { StatisticsCardDisplay } from './StatisticsCardDisplay';
export type { StatisticsCardData, StatisticsCardDisplayProps } from './StatisticsCardDisplay';

export { ActionButtonsDisplay } from './ActionButtonsDisplay';
export type { ActionButton, ActionButtonsData, ActionButtonsDisplayProps } from './ActionButtonsDisplay';

// 结果消息组件
export { ResultMessageDisplay } from './ResultMessageDisplay';
export type { ResultMessageData } from './ResultMessageDisplay';

// 执行计划展示组件
export { PlanDisplay } from './PlanDisplay';
export type { PlanDisplayProps } from './PlanDisplay';

// ========== 增强组件库 ==========

// 通用动态卡片（核心）- AI 可灵活组合各种元素
export { DynamicCard } from './DynamicCard';
export type { 
  DynamicCardData, 
  DynamicCardProps,
  DynamicSection,
  DynamicSectionType,
} from './DynamicCard';

// 键值对列表
export { KeyValueListDisplay } from './KeyValueListDisplay';
export type { 
  KeyValueItem, 
  KeyValueListData, 
  KeyValueListDisplayProps,
} from './KeyValueListDisplay';

// 进度卡片（预算、目标等）
export { ProgressCard } from './ProgressCard';
export type { ProgressCardData, ProgressCardProps } from './ProgressCard';

// 对比卡片
export { ComparisonCard } from './ComparisonCard';
export type { 
  ComparisonItem, 
  ComparisonCardData, 
  ComparisonCardProps,
} from './ComparisonCard';

// 饼图
export { PieChartDisplay } from './PieChartDisplay';
export type { 
  PieChartItem, 
  PieChartData, 
  PieChartDisplayProps,
} from './PieChartDisplay';

// 柱状图
export { BarChartDisplay } from './BarChartDisplay';
export type { 
  BarChartItem, 
  BarChartData, 
  BarChartDisplayProps,
} from './BarChartDisplay';
