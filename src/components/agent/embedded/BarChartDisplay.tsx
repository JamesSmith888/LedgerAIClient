/**
 * BarChartDisplay - 柱状图组件
 * 
 * 用于展示时间序列数据、分类对比等
 * 纯 React Native 实现
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Icon } from '../../common';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius, Shadows } from '../../../constants/theme';

export interface BarChartItem {
  label: string;
  value: number;
  secondaryValue?: number;  // 用于对比（如收入vs支出）
  color?: string;
  secondaryColor?: string;
}

export interface BarChartData {
  title?: string;
  titleIcon?: string;
  items: BarChartItem[];
  showValues?: boolean;
  valueFormat?: 'currency' | 'number' | 'percentage';
  orientation?: 'vertical' | 'horizontal';
  barColor?: string;
  secondaryBarColor?: string;
  maxValue?: number;  // 手动设置最大值
  showLegend?: boolean;
  legendLabels?: [string, string];  // [primary, secondary]
}

export interface BarChartDisplayProps {
  data: BarChartData;
}

const formatValue = (value: number, format?: string): string => {
  switch (format) {
    case 'currency':
      return `¥${value >= 10000 ? (value / 10000).toFixed(1) + 'w' : value.toFixed(0)}`;
    case 'percentage':
      return `${value.toFixed(0)}%`;
    default:
      return value >= 10000 ? (value / 10000).toFixed(1) + 'w' : value.toFixed(0);
  }
};

export const BarChartDisplay: React.FC<BarChartDisplayProps> = ({ data }) => {
  const {
    title,
    titleIcon,
    items,
    showValues = true,
    valueFormat = 'currency',
    orientation = 'vertical',
    barColor = Colors.primary,
    secondaryBarColor = Colors.expense,
    maxValue: providedMaxValue,
    showLegend = true,
    legendLabels = ['收入', '支出'],
  } = data;

  // 计算最大值
  const maxValue = useMemo(() => {
    if (providedMaxValue) return providedMaxValue;
    let max = 0;
    items.forEach(item => {
      if (item.value > max) max = item.value;
      if (item.secondaryValue && item.secondaryValue > max) max = item.secondaryValue;
    });
    return max || 100;
  }, [items, providedMaxValue]);

  const hasSecondary = items.some(item => item.secondaryValue !== undefined);

  // 无数据状态
  if (items.length === 0) {
    return (
      <View style={styles.container}>
        {title && (
          <View style={styles.header}>
            {titleIcon && <Icon name={titleIcon} size={18} color={Colors.primary} />}
            <Text style={[styles.title, titleIcon && styles.titleWithIcon]}>{title}</Text>
          </View>
        )}
        <View style={styles.emptyState}>
          <Icon name="bar-chart-outline" size={40} color={Colors.textLight} />
          <Text style={styles.emptyText}>暂无数据</Text>
        </View>
      </View>
    );
  }

  // 垂直柱状图
  const renderVerticalBars = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.verticalBarsContainer}
    >
      {items.map((item, index) => {
        const primaryHeight = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
        const secondaryHeight = item.secondaryValue && maxValue > 0 
          ? (item.secondaryValue / maxValue) * 100 
          : 0;
        const itemBarColor = item.color || barColor;
        const itemSecondaryColor = item.secondaryColor || secondaryBarColor;

        return (
          <View key={index} style={styles.verticalBarGroup}>
            <View style={styles.verticalBarsRow}>
              {/* 主柱 */}
              <View style={styles.verticalBarWrapper}>
                {showValues && item.value > 0 && (
                  <Text style={styles.verticalBarValue}>
                    {formatValue(item.value, valueFormat)}
                  </Text>
                )}
                <View 
                  style={[
                    styles.verticalBar,
                    { 
                      height: `${Math.max(primaryHeight, 2)}%`,
                      backgroundColor: itemBarColor,
                    }
                  ]} 
                />
              </View>
              
              {/* 次柱（如果有） */}
              {hasSecondary && (
                <View style={styles.verticalBarWrapper}>
                  {showValues && item.secondaryValue && item.secondaryValue > 0 && (
                    <Text style={styles.verticalBarValue}>
                      {formatValue(item.secondaryValue, valueFormat)}
                    </Text>
                  )}
                  <View 
                    style={[
                      styles.verticalBar,
                      { 
                        height: `${Math.max(secondaryHeight, 2)}%`,
                        backgroundColor: itemSecondaryColor,
                      }
                    ]} 
                  />
                </View>
              )}
            </View>
            <Text style={styles.verticalBarLabel} numberOfLines={1}>
              {item.label}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );

  // 水平柱状图
  const renderHorizontalBars = () => (
    <View style={styles.horizontalBarsContainer}>
      {items.map((item, index) => {
        const primaryWidth = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
        const secondaryWidth = item.secondaryValue && maxValue > 0 
          ? (item.secondaryValue / maxValue) * 100 
          : 0;
        const itemBarColor = item.color || barColor;
        const itemSecondaryColor = item.secondaryColor || secondaryBarColor;

        return (
          <View key={index} style={styles.horizontalBarGroup}>
            <Text style={styles.horizontalBarLabel} numberOfLines={1}>
              {item.label}
            </Text>
            <View style={styles.horizontalBarsColumn}>
              {/* 主柱 */}
              <View style={styles.horizontalBarRow}>
                <View 
                  style={[
                    styles.horizontalBar,
                    { 
                      width: `${Math.max(primaryWidth, 2)}%`,
                      backgroundColor: itemBarColor,
                    }
                  ]} 
                />
                {showValues && (
                  <Text style={styles.horizontalBarValue}>
                    {formatValue(item.value, valueFormat)}
                  </Text>
                )}
              </View>
              
              {/* 次柱（如果有） */}
              {hasSecondary && item.secondaryValue !== undefined && (
                <View style={styles.horizontalBarRow}>
                  <View 
                    style={[
                      styles.horizontalBar,
                      { 
                        width: `${Math.max(secondaryWidth, 2)}%`,
                        backgroundColor: itemSecondaryColor,
                      }
                    ]} 
                  />
                  {showValues && (
                    <Text style={styles.horizontalBarValue}>
                      {formatValue(item.secondaryValue, valueFormat)}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* 标题 */}
      {title && (
        <View style={styles.header}>
          {titleIcon && <Icon name={titleIcon} size={18} color={Colors.primary} />}
          <Text style={[styles.title, titleIcon && styles.titleWithIcon]}>{title}</Text>
        </View>
      )}

      {/* 图例 */}
      {showLegend && hasSecondary && (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: barColor }]} />
            <Text style={styles.legendText}>{legendLabels[0]}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: secondaryBarColor }]} />
            <Text style={styles.legendText}>{legendLabels[1]}</Text>
          </View>
        </View>
      )}

      {/* 图表 */}
      <View style={styles.chartArea}>
        {orientation === 'vertical' ? renderVerticalBars() : renderHorizontalBars()}
      </View>
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

  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
    gap: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.xs,
  },
  legendText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },

  chartArea: {
    padding: Spacing.md,
  },

  // 垂直柱状图
  verticalBarsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 150,
    paddingHorizontal: Spacing.xs,
  },
  verticalBarGroup: {
    alignItems: 'center',
    marginHorizontal: Spacing.xs,
    minWidth: 40,
  },
  verticalBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    gap: 4,
  },
  verticalBarWrapper: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  verticalBar: {
    width: 20,
    minHeight: 4,
    borderRadius: BorderRadius.sm,
  },
  verticalBarValue: {
    fontSize: FontSizes.xs - 1,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  verticalBarLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    maxWidth: 50,
    textAlign: 'center',
  },

  // 水平柱状图
  horizontalBarsContainer: {
    gap: Spacing.sm,
  },
  horizontalBarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  horizontalBarLabel: {
    width: 60,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginRight: Spacing.sm,
  },
  horizontalBarsColumn: {
    flex: 1,
    gap: 4,
  },
  horizontalBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  horizontalBar: {
    height: 16,
    minWidth: 4,
    borderRadius: BorderRadius.sm,
  },
  horizontalBarValue: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
});
