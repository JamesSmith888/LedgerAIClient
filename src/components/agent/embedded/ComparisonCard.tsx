/**
 * ComparisonCard - 对比卡片组件
 * 
 * 用于展示两个时期/项目的数据对比
 * 如：本月vs上月、收入vs支出、预算vs实际 等
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from '../../common';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius, Shadows } from '../../../constants/theme';

export interface ComparisonItem {
  label: string;
  leftValue: number;
  rightValue: number;
  unit?: string;  // '元', '%', '笔' 等
  format?: 'currency' | 'number' | 'percentage';
}

export interface ComparisonCardData {
  title: string;
  titleIcon?: string;
  leftTitle: string;   // 左边列标题，如 "本月"
  rightTitle: string;  // 右边列标题，如 "上月"
  items: ComparisonItem[];
  showChange?: boolean;  // 显示变化百分比
  highlightBetter?: 'left' | 'right' | 'auto' | 'none';  // 高亮表现更好的一方
}

export interface ComparisonCardProps {
  data: ComparisonCardData;
}

const formatValue = (value: number, format?: string, unit?: string): string => {
  switch (format) {
    case 'currency':
      return `¥${value.toFixed(2)}`;
    case 'percentage':
      return `${value.toFixed(1)}%`;
    default:
      return `${value.toFixed(unit === '元' ? 2 : 0)}${unit || ''}`;
  }
};

const calculateChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
};

export const ComparisonCard: React.FC<ComparisonCardProps> = ({ data }) => {
  const {
    title,
    titleIcon,
    leftTitle,
    rightTitle,
    items,
    showChange = true,
    highlightBetter = 'auto',
  } = data;

  const renderChangeIndicator = (left: number, right: number) => {
    const change = calculateChange(left, right);
    const isPositive = change >= 0;
    
    return (
      <View style={styles.changeContainer}>
        <Icon 
          name={isPositive ? 'trending-up' : 'trending-down'} 
          size={12} 
          color={isPositive ? Colors.success : Colors.error} 
        />
        <Text style={[
          styles.changeText, 
          { color: isPositive ? Colors.success : Colors.error }
        ]}>
          {isPositive ? '+' : ''}{change.toFixed(1)}%
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* 标题 */}
      <View style={styles.header}>
        {titleIcon && (
          <Icon name={titleIcon} size={18} color={Colors.primary} />
        )}
        <Text style={[styles.title, titleIcon && styles.titleWithIcon]}>{title}</Text>
      </View>

      {/* 表头 */}
      <View style={styles.tableHeader}>
        <View style={styles.labelColumn} />
        <View style={styles.valueColumn}>
          <Text style={styles.columnTitle}>{leftTitle}</Text>
        </View>
        <View style={styles.valueColumn}>
          <Text style={styles.columnTitle}>{rightTitle}</Text>
        </View>
        {showChange && (
          <View style={styles.changeColumn}>
            <Text style={styles.columnTitle}>变化</Text>
          </View>
        )}
      </View>

      {/* 数据行 */}
      {items.map((item, index) => {
        const leftBetter = item.leftValue > item.rightValue;
        const rightBetter = item.rightValue > item.leftValue;
        
        return (
          <View 
            key={index} 
            style={[
              styles.tableRow,
              index < items.length - 1 && styles.tableRowBorder,
            ]}
          >
            <View style={styles.labelColumn}>
              <Text style={styles.rowLabel}>{item.label}</Text>
            </View>
            <View style={styles.valueColumn}>
              <Text style={[
                styles.rowValue,
                highlightBetter === 'left' && styles.highlightValue,
                highlightBetter === 'auto' && leftBetter && styles.highlightValue,
              ]}>
                {formatValue(item.leftValue, item.format, item.unit)}
              </Text>
            </View>
            <View style={styles.valueColumn}>
              <Text style={[
                styles.rowValue,
                highlightBetter === 'right' && styles.highlightValue,
                highlightBetter === 'auto' && rightBetter && styles.highlightValue,
              ]}>
                {formatValue(item.rightValue, item.format, item.unit)}
              </Text>
            </View>
            {showChange && (
              <View style={styles.changeColumn}>
                {renderChangeIndicator(item.leftValue, item.rightValue)}
              </View>
            )}
          </View>
        );
      })}
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
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.backgroundSecondary,
  },
  title: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
  },
  titleWithIcon: {
    marginLeft: Spacing.xs,
  },

  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  labelColumn: {
    flex: 2,
    justifyContent: 'center',
  },
  valueColumn: {
    flex: 2,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  changeColumn: {
    flex: 1.5,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  columnTitle: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeights.medium,
  },

  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  tableRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowLabel: {
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  rowValue: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.text,
  },
  highlightValue: {
    color: Colors.primary,
    fontWeight: FontWeights.bold,
  },

  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeText: {
    fontSize: FontSizes.xs,
    marginLeft: 2,
    fontWeight: FontWeights.medium,
  },
});
