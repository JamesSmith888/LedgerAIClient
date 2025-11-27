/**
 * ProgressCard - 进度卡片组件
 * 
 * 用于展示预算进度、目标达成、任务完成率等
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from '../../common';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius, Shadows } from '../../../constants/theme';

export interface ProgressCardData {
  title: string;
  titleIcon?: string;
  current: number;
  total: number;
  unit?: string;  // 如 '元', '%', '笔' 等
  label?: string;  // 如 '本月预算', '储蓄目标' 等
  description?: string;  // 额外描述
  color?: 'primary' | 'success' | 'warning' | 'error' | 'auto';  // auto 会根据进度自动变色
  showRemaining?: boolean;  // 显示剩余量
  warningThreshold?: number;  // 警告阈值（百分比）
  dangerThreshold?: number;   // 危险阈值（百分比）
}

export interface ProgressCardProps {
  data: ProgressCardData;
}

const getProgressColor = (
  percentage: number, 
  color?: string,
  warningThreshold = 70,
  dangerThreshold = 90
): string => {
  if (color && color !== 'auto') {
    switch (color) {
      case 'success': return Colors.success;
      case 'warning': return Colors.warning;
      case 'error': return Colors.error;
      default: return Colors.primary;
    }
  }
  
  // 自动变色逻辑
  if (percentage >= dangerThreshold) return Colors.error;
  if (percentage >= warningThreshold) return Colors.warning;
  return Colors.success;
};

export const ProgressCard: React.FC<ProgressCardProps> = ({ data }) => {
  const {
    title,
    titleIcon,
    current,
    total,
    unit = '',
    label,
    description,
    color = 'auto',
    showRemaining = true,
    warningThreshold = 70,
    dangerThreshold = 90,
  } = data;

  const percentage = total > 0 ? Math.min(100, (current / total) * 100) : 0;
  const remaining = total - current;
  const progressColor = getProgressColor(percentage, color, warningThreshold, dangerThreshold);
  const isOverBudget = current > total;

  return (
    <View style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {titleIcon && (
            <Icon name={titleIcon} size={18} color={Colors.primary} />
          )}
          <Text style={[styles.title, titleIcon && styles.titleWithIcon]}>{title}</Text>
        </View>
        <Text style={[styles.percentage, { color: progressColor }]}>
          {percentage.toFixed(0)}%
        </Text>
      </View>

      {/* 进度条 */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${Math.min(100, percentage)}%`, 
                backgroundColor: progressColor,
              }
            ]} 
          />
          {isOverBudget && (
            <View style={styles.overflowIndicator}>
              <Icon name="warning" size={12} color={Colors.error} />
            </View>
          )}
        </View>
      </View>

      {/* 数值详情 */}
      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>{label || '已用'}</Text>
          <Text style={[styles.detailValue, { color: progressColor }]}>
            {unit === '元' ? '¥' : ''}{current.toFixed(unit === '元' ? 2 : 0)}{unit !== '元' ? unit : ''}
          </Text>
        </View>
        
        <View style={styles.detailDivider} />
        
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>总额</Text>
          <Text style={styles.detailValue}>
            {unit === '元' ? '¥' : ''}{total.toFixed(unit === '元' ? 2 : 0)}{unit !== '元' ? unit : ''}
          </Text>
        </View>
        
        {showRemaining && (
          <>
            <View style={styles.detailDivider} />
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>{isOverBudget ? '超支' : '剩余'}</Text>
              <Text style={[
                styles.detailValue, 
                { color: isOverBudget ? Colors.error : Colors.success }
              ]}>
                {isOverBudget ? '-' : ''}
                {unit === '元' ? '¥' : ''}{Math.abs(remaining).toFixed(unit === '元' ? 2 : 0)}{unit !== '元' ? unit : ''}
              </Text>
            </View>
          </>
        )}
      </View>

      {/* 描述 */}
      {description && (
        <View style={styles.descriptionContainer}>
          <Icon name="information-circle-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.description}>{description}</Text>
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
    padding: Spacing.md,
    ...Shadows.sm,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
  },
  titleWithIcon: {
    marginLeft: Spacing.xs,
  },
  percentage: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
  },

  progressContainer: {
    marginBottom: Spacing.md,
  },
  progressTrack: {
    height: 12,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.round,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.round,
  },
  overflowIndicator: {
    position: 'absolute',
    right: 4,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },

  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  detailItem: {
    alignItems: 'center',
    flex: 1,
  },
  detailLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  detailDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },

  descriptionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  description: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
    flex: 1,
  },
});
