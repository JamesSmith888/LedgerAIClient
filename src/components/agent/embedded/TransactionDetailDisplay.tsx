/**
 * TransactionDetailDisplay - 对话框中显示的单条交易详情组件
 * 
 * 用于展示完整的交易信息
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from '../../common';
import { CategoryIcon } from '../../common/CategoryIcon';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius, Shadows } from '../../../constants/theme';

export interface TransactionDetailData {
  id: number;
  name: string;
  description?: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  transactionDateTime: string;
  ledgerId?: number;
  ledgerName?: string;
  categoryId?: number;
  categoryName?: string;
  categoryIcon?: string;
  paymentMethodId?: number;
  paymentMethodName?: string;
  createdByUserNickname?: string;
  attachmentCount?: number;
}

export interface TransactionDetailDisplayProps {
  transaction: TransactionDetailData;
  onPress?: (transaction: TransactionDetailData) => void;
}

/**
 * 格式化完整日期时间
 */
const formatFullDateTime = (dateTimeStr: string): string => {
  try {
    const date = new Date(dateTimeStr);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekDay = weekDays[date.getDay()];
    
    return `${year}年${month}月${day}日 ${weekDay} ${hours}:${minutes}`;
  } catch {
    return dateTimeStr;
  }
};

export const TransactionDetailDisplay: React.FC<TransactionDetailDisplayProps> = ({
  transaction,
  onPress,
}) => {
  const isExpense = transaction.type === 'EXPENSE';

  const handlePress = () => {
    onPress?.(transaction);
  };

  const renderInfoRow = (icon: string, label: string, value?: string | number | null) => {
    if (!value) return null;
    return (
      <View style={styles.infoRow}>
        <View style={styles.infoLabel}>
          <Icon name={icon as any} size={16} color={Colors.textSecondary} />
          <Text style={styles.infoLabelText}>{label}</Text>
        </View>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    );
  };

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={handlePress}
      activeOpacity={0.8}
    >
      {/* 头部：金额和类型 */}
      <View style={styles.header}>
        <View style={[
          styles.typeIndicator,
          { backgroundColor: isExpense ? Colors.expenseLight : Colors.incomeLight },
        ]}>
          {transaction.categoryIcon ? (
            <CategoryIcon 
              icon={transaction.categoryIcon} 
              size={28} 
              color={isExpense ? Colors.expense : Colors.income} 
            />
          ) : (
            <Icon 
              name={isExpense ? 'trending-down' : 'trending-up'} 
              size={28} 
              color={isExpense ? Colors.expense : Colors.income} 
            />
          )}
        </View>
        
        <View style={styles.headerInfo}>
          <Text style={styles.transactionName} numberOfLines={1}>
            {transaction.name || transaction.categoryName || '未命名交易'}
          </Text>
          <Text style={[
            styles.amount,
            isExpense ? styles.amountExpense : styles.amountIncome,
          ]}>
            {isExpense ? '-' : '+'}¥{transaction.amount.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* 详情信息 */}
      <View style={styles.detailsContainer}>
        {renderInfoRow('calendar-outline', '时间', formatFullDateTime(transaction.transactionDateTime))}
        {renderInfoRow('pricetag-outline', '分类', transaction.categoryName)}
        {renderInfoRow('book-outline', '账本', transaction.ledgerName)}
        {renderInfoRow('card-outline', '支付方式', transaction.paymentMethodName)}
        {transaction.description && renderInfoRow('document-text-outline', '备注', transaction.description)}
        {transaction.createdByUserNickname && renderInfoRow('person-outline', '创建人', transaction.createdByUserNickname)}
        {transaction.attachmentCount && transaction.attachmentCount > 0 && 
          renderInfoRow('attach-outline', '附件', `${transaction.attachmentCount} 个`)}
      </View>

      {/* 底部操作提示 */}
      <View style={styles.footer}>
        <Icon name="create-outline" size={14} color={Colors.primary} />
        <Text style={styles.footerText}>点击编辑交易</Text>
        <Icon name="chevron-forward" size={14} color={Colors.primary} />
      </View>
    </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  typeIndicator: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  headerInfo: {
    flex: 1,
  },
  transactionName: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: 4,
  },
  amount: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
  },
  amountExpense: {
    color: Colors.expense,
  },
  amountIncome: {
    color: Colors.income,
  },
  
  // 详情
  detailsContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  infoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabelText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },
  infoValue: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    fontWeight: FontWeights.medium,
    maxWidth: '60%',
    textAlign: 'right',
  },
  
  // 底部
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    gap: Spacing.xs,
  },
  footerText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: FontWeights.medium,
  },
});
