/**
 * TransactionListDisplay - 对话框中显示的交易列表组件
 * 
 * 用于在 AI 对话中展示查询到的交易记录
 * 支持：
 * - 显示多条交易记录
 * - 汇总统计（收入、支出、余额）
 * - 点击查看详情
 * - 可折叠展开
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from '../../common';
import { TransactionCard, TransactionCardData } from './TransactionCard';
import { CollapsibleSection } from './CollapsibleSection';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius, Shadows } from '../../../constants/theme';

export interface TransactionListStatistics {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  count: number;
}

export interface SuggestedAction {
  label: string;
  message: string;
}


export interface TransactionListDisplayData {
  title?: string;
  message?: string;
  transactions: TransactionCardData[];
  statistics?: TransactionListStatistics;
  pagination?: {
    page: number;
    totalElements: number;
    totalPages: number;
  };
  suggestedActions?: SuggestedAction[];
}

export interface TransactionListDisplayProps {
  data: TransactionListDisplayData;
  onTransactionPress?: (transaction: TransactionCardData) => void;
  onSuggestedActionPress?: (message: string) => void;
  maxDisplayCount?: number; // 最多显示多少条，超过后折叠
  compact?: boolean;
}

export const TransactionListDisplay: React.FC<TransactionListDisplayProps> = ({
  data,
  onTransactionPress,
  onSuggestedActionPress,
  maxDisplayCount = 5,
  compact = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  
  const { transactions, statistics, pagination, title, message } = data;
  
  const displayedTransactions = expanded 
    ? transactions 
    : transactions.slice(0, maxDisplayCount);
  
  const hasMore = transactions.length > maxDisplayCount;
  const remainingCount = transactions.length - maxDisplayCount;

  const handleToggleExpand = useCallback(() => {
    setExpanded(!expanded);
  }, [expanded]);

  // 如果没有数据
  if (!transactions || transactions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="document-text-outline" size={32} color={Colors.textLight} />
        <Text style={styles.emptyText}>{message || '暂无交易记录'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 标题栏 */}
      {(title || statistics) && (
        <View style={styles.header}>
          {title && (
            <Text style={styles.title}>{title}</Text>
          )}
          {statistics && (
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>收入</Text>
                <Text style={[styles.statValue, styles.incomeValue]}>
                  ¥{statistics.totalIncome.toFixed(2)}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>支出</Text>
                <Text style={[styles.statValue, styles.expenseValue]}>
                  ¥{statistics.totalExpense.toFixed(2)}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>结余</Text>
                <Text style={[
                  styles.statValue, 
                  statistics.balance >= 0 ? styles.incomeValue : styles.expenseValue
                ]}>
                  {statistics.balance >= 0 ? '+' : ''}¥{statistics.balance.toFixed(2)}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* 提示消息 */}
      {message && !title && (
        <Text style={styles.message}>{message}</Text>
      )}

      {/* 交易列表 */}
      <View style={styles.listContainer}>
        {displayedTransactions.map((transaction) => (
          <TransactionCard
            key={transaction.id}
            transaction={transaction}
            onPress={onTransactionPress}
            compact={compact}
          />
        ))}
      </View>

      {/* 展开/收起按钮 */}
      {hasMore && (
        <TouchableOpacity 
          style={styles.expandButton} 
          onPress={handleToggleExpand}
          activeOpacity={0.7}
        >
          <Text style={styles.expandButtonText}>
            {expanded ? '收起' : `查看更多 (${remainingCount}条)`}
          </Text>
          <Icon 
            name={expanded ? 'chevron-up' : 'chevron-down'} 
            size={16} 
            color={Colors.primary} 
          />
        </TouchableOpacity>
      )}

      {/* 分页信息 */}
      {pagination && pagination.totalPages > 1 && (
        <View style={styles.paginationInfo}>
          <Text style={styles.paginationText}>
            第 {pagination.page + 1}/{pagination.totalPages} 页，共 {pagination.totalElements} 条
          </Text>
        </View>
      )}

      {/* 后续操作建议已移至底部 SuggestedActionsBar，此处不再显示 */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  
  // 头部
  header: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  
  // 统计行
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
  },
  incomeValue: {
    color: Colors.income,
  },
  expenseValue: {
    color: Colors.expense,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },
  
  // 消息
  message: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  
  // 列表 - 交易卡片现在直接使用 borderBottom，不需要额外间距
  listContainer: {
    // 移除内边距，让交易卡片边到边显示
  },
  
  // 展开按钮
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  expandButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: FontWeights.medium,
    marginRight: Spacing.xs,
  },
  
  // 分页
  paginationInfo: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.backgroundSecondary,
  },
  paginationText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  
  // 空状态
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
  },
  emptyText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
});
