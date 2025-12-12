/**
 * TransactionCard - 对话框中显示的单条交易卡片
 * 
 * 参考 TransactionListItem 样式，但为嵌入式场景优化
 * 支持点击查看详情等交互
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from '../../common';
import { CategoryIcon } from '../../common/CategoryIcon';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius, Shadows } from '../../../constants/theme';
import { TransactionIcons } from '../../../constants/icons';

export interface TransactionCardData {
  id: number;
  description?: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  transactionDateTime: string;
  ledgerName?: string;
  categoryName?: string;
  categoryIcon?: string;
  paymentMethodName?: string;
  source?: 'MANUAL' | 'AI'; // 交易来源
}

export interface TransactionCardProps {
  transaction: TransactionCardData;
  onPress?: (transaction: TransactionCardData) => void;
  compact?: boolean; // 紧凑模式
}

/**
 * 格式化日期时间
 */
const formatDateTime = (dateTimeStr: string): string => {
  try {
    const date = new Date(dateTimeStr);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
  } catch {
    return dateTimeStr;
  }
};

export const TransactionCard: React.FC<TransactionCardProps> = ({
  transaction,
  onPress,
  compact = false,
}) => {
  const isExpense = transaction.type === 'EXPENSE';
  
  const handlePress = () => {
    onPress?.(transaction);
  };

  return (
    <TouchableOpacity
      style={[styles.container, compact && styles.containerCompact]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* 左侧：图标 */}
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: isExpense ? Colors.expenseLight : Colors.incomeLight },
          compact && styles.iconContainerCompact,
        ]}
      >
        {transaction.categoryIcon ? (
          <CategoryIcon 
            icon={transaction.categoryIcon} 
            size={compact ? 18 : 22} 
            color={isExpense ? Colors.expense : Colors.income} 
          />
        ) : (
          <Icon 
            name={isExpense ? TransactionIcons.expense : TransactionIcons.income} 
            size={compact ? 18 : 22} 
            color={isExpense ? Colors.expense : Colors.income} 
          />
        )}
      </View>

      {/* 中间：信息 */}
      <View style={styles.infoContainer}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={1}>
            {transaction.description || transaction.categoryName || '未命名'}
          </Text>
          {transaction.categoryName && transaction.description && transaction.description !== transaction.categoryName && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText} numberOfLines={1}>
                {transaction.categoryName}
              </Text>
            </View>
          )}
          {/* AI 来源标识 - 不明显的小图标 */}
          {transaction.source === 'AI' && (
            <View style={styles.aiSourceBadge}>
              <Icon name="sparkles" size={12} color={Colors.primary} />
            </View>
          )}
        </View>
        
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            {formatDateTime(transaction.transactionDateTime)}
          </Text>
          {transaction.ledgerName && (
            <>
              <Text style={styles.metaDivider}> · </Text>
              <Text style={styles.metaText} numberOfLines={1}>
                {transaction.ledgerName}
              </Text>
            </>
          )}
        </View>
      </View>

      {/* 右侧：金额 */}
      <View style={styles.amountContainer}>
        <Text style={[styles.amount, isExpense ? styles.amountExpense : styles.amountIncome]}>
          {isExpense ? '-' : '+'}¥{transaction.amount.toFixed(2)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '50',
  },
  containerCompact: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  iconContainerCompact: {
    width: 30,
    height: 30,
  },
  
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    flex: 1,
  },
  titleCompact: {
    fontSize: FontSizes.sm,
  },
  categoryBadge: {
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.xs,
    maxWidth: 80,
  },
  categoryBadgeText: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  // AI 来源标识 - 不明显的小图标
  aiSourceBadge: {
    marginLeft: Spacing.xs,
    opacity: 0.6,
  },
  
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  metaDivider: {
    fontSize: FontSizes.xs,
    color: Colors.textLight,
  },
  
  amountContainer: {
    marginLeft: Spacing.sm,
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
  },
  amountExpense: {
    color: Colors.expense,
  },
  amountIncome: {
    color: Colors.income,
  },
});
