/**
 * StatisticsCardDisplay - 统计卡片显示组件
 * 
 * 在对话框中展示统计汇总数据
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from '../../common';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius, Shadows } from '../../../constants/theme';

export interface StatisticsCardData {
  title: string;
  period?: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  transactionCount?: number;
  comparedToPrevious?: {
    incomeChange?: number;
    expenseChange?: number;
  };
}

export interface StatisticsCardDisplayProps {
  data: StatisticsCardData;
}

export const StatisticsCardDisplay: React.FC<StatisticsCardDisplayProps> = ({ data }) => {
  const { title, period, totalIncome, totalExpense, balance, transactionCount, comparedToPrevious } = data;

  const renderChangeIndicator = (change?: number) => {
    if (change === undefined || change === null) return null;
    
    const isPositive = change >= 0;
    return (
      <View style={styles.changeIndicator}>
        <Icon 
          name={isPositive ? 'trending-up' : 'trending-down'} 
          size={12} 
          color={isPositive ? Colors.income : Colors.expense} 
        />
        <Text style={[styles.changeText, isPositive ? styles.changePositive : styles.changeNegative]}>
          {isPositive ? '+' : ''}{change.toFixed(1)}%
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* 标题栏 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="stats-chart" size={18} color={Colors.primary} />
          <Text style={styles.title}>{title}</Text>
        </View>
        {period && (
          <Text style={styles.period}>{period}</Text>
        )}
      </View>

      {/* 统计数据 */}
      <View style={styles.statsContainer}>
        {/* 收入 */}
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>收入</Text>
          <Text style={[styles.statValue, styles.incomeValue]}>
            ¥{totalIncome.toFixed(2)}
          </Text>
          {comparedToPrevious && renderChangeIndicator(comparedToPrevious.incomeChange)}
        </View>

        <View style={styles.statDivider} />

        {/* 支出 */}
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>支出</Text>
          <Text style={[styles.statValue, styles.expenseValue]}>
            ¥{totalExpense.toFixed(2)}
          </Text>
          {comparedToPrevious && renderChangeIndicator(comparedToPrevious.expenseChange)}
        </View>

        <View style={styles.statDivider} />

        {/* 结余 */}
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>结余</Text>
          <Text style={[
            styles.statValue, 
            balance >= 0 ? styles.incomeValue : styles.expenseValue
          ]}>
            {balance >= 0 ? '+' : ''}¥{balance.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* 交易笔数 */}
      {transactionCount !== undefined && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            共 {transactionCount} 笔交易
          </Text>
        </View>
      )}
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
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.backgroundSecondary,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginLeft: Spacing.xs,
  },
  period: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  
  statsContainer: {
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: FontSizes.lg,
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
    backgroundColor: Colors.border,
    marginVertical: Spacing.xs,
  },
  
  changeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  changeText: {
    fontSize: FontSizes.xs,
    marginLeft: 2,
  },
  changePositive: {
    color: Colors.income,
  },
  changeNegative: {
    color: Colors.expense,
  },
  
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.backgroundSecondary,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
});
