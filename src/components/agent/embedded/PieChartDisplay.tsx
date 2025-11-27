/**
 * PieChartDisplay - 饼图组件
 * 
 * 用于展示分类占比、收支结构等数据
 * 使用纯 React Native 实现，不依赖图表库
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, G, Text as SvgText } from 'react-native-svg';
import { Icon } from '../../common';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius, Shadows } from '../../../constants/theme';

export interface PieChartItem {
  label: string;
  value: number;
  color?: string;
  icon?: string;
}

export interface PieChartData {
  title?: string;
  titleIcon?: string;
  items: PieChartItem[];
  showLegend?: boolean;
  showPercentage?: boolean;
  showValue?: boolean;
  valueFormat?: 'currency' | 'number' | 'percentage';
  centerLabel?: string;  // 中心显示的文字
  centerValue?: string;  // 中心显示的数值
}

export interface PieChartDisplayProps {
  data: PieChartData;
  size?: number;
}

// 预定义颜色
const CHART_COLORS: string[] = [
  Colors.primary,
  Colors.success,
  Colors.warning,
  Colors.error,
  Colors.secondary,
  Colors.info,
  Colors.accent.cyan,
  Colors.accent.teal,
  Colors.accent.orange,
  Colors.accent.pink,
];

const formatValue = (value: number, format?: string): string => {
  switch (format) {
    case 'currency':
      return `¥${value.toFixed(2)}`;
    case 'percentage':
      return `${value.toFixed(1)}%`;
    default:
      return value.toFixed(0);
  }
};

// 计算饼图路径
const describeArc = (
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string => {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    'M', cx, cy,
    'L', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
    'Z'
  ].join(' ');
};

const polarToCartesian = (
  cx: number,
  cy: number,
  radius: number,
  angleInDegrees: number
) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
};

export const PieChartDisplay: React.FC<PieChartDisplayProps> = ({ 
  data,
  size = 160,
}) => {
  const {
    title,
    titleIcon,
    items,
    showLegend = true,
    showPercentage = true,
    showValue = true,
    valueFormat = 'currency',
    centerLabel,
    centerValue,
  } = data;

  // 计算总值和百分比
  const { total, chartItems } = useMemo(() => {
    const total = items.reduce((sum, item) => sum + item.value, 0);
    const chartItems = items.map((item, index) => ({
      ...item,
      percentage: total > 0 ? (item.value / total) * 100 : 0,
      color: item.color || CHART_COLORS[index % CHART_COLORS.length],
    }));
    return { total, chartItems };
  }, [items]);

  // 生成饼图扇区
  const renderPieSlices = () => {
    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 4;
    const innerRadius = radius * 0.55; // 环形图
    
    let currentAngle = 0;
    
    return chartItems.map((item, index) => {
      if (item.value === 0) return null;
      
      const angle = (item.percentage / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      // 对于小于 0.5% 的扇区，不渲染
      if (angle < 1.8) return null;

      // 完整圆的特殊处理
      if (angle >= 359.9) {
        return (
          <Circle
            key={index}
            cx={cx}
            cy={cy}
            r={radius}
            fill={item.color}
          />
        );
      }

      return (
        <Path
          key={index}
          d={describeArc(cx, cy, radius, startAngle, endAngle)}
          fill={item.color}
        />
      );
    });
  };

  // 无数据状态
  if (items.length === 0 || total === 0) {
    return (
      <View style={styles.container}>
        {title && (
          <View style={styles.header}>
            {titleIcon && <Icon name={titleIcon} size={18} color={Colors.primary} />}
            <Text style={[styles.title, titleIcon && styles.titleWithIcon]}>{title}</Text>
          </View>
        )}
        <View style={styles.emptyState}>
          <Icon name="pie-chart-outline" size={40} color={Colors.textLight} />
          <Text style={styles.emptyText}>暂无数据</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 标题 */}
      {title && (
        <View style={styles.header}>
          {titleIcon && <Icon name={titleIcon} size={18} color={Colors.primary} />}
          <Text style={[styles.title, titleIcon && styles.titleWithIcon]}>{title}</Text>
        </View>
      )}

      <View style={styles.chartContainer}>
        {/* 饼图 */}
        <View style={styles.pieContainer}>
          <Svg width={size} height={size}>
            <G>{renderPieSlices()}</G>
            {/* 中心白色圆（环形图效果） */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={size / 2 * 0.55}
              fill={Colors.surface}
            />
          </Svg>
          
          {/* 中心文字 */}
          {(centerLabel || centerValue) && (
            <View style={[styles.centerLabel, { width: size, height: size }]}>
              {centerLabel && <Text style={styles.centerLabelText}>{centerLabel}</Text>}
              {centerValue && <Text style={styles.centerValueText}>{centerValue}</Text>}
            </View>
          )}
        </View>

        {/* 图例 */}
        {showLegend && (
          <View style={styles.legend}>
            {chartItems.slice(0, 6).map((item, index) => (
              <View key={index} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <View style={styles.legendContent}>
                  <Text style={styles.legendLabel} numberOfLines={1}>
                    {item.icon ? `${item.icon} ` : ''}{item.label}
                  </Text>
                  <View style={styles.legendValues}>
                    {showValue && (
                      <Text style={styles.legendValue}>
                        {formatValue(item.value, valueFormat)}
                      </Text>
                    )}
                    {showPercentage && (
                      <Text style={styles.legendPercentage}>
                        {item.percentage.toFixed(1)}%
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ))}
            {chartItems.length > 6 && (
              <Text style={styles.moreText}>+{chartItems.length - 6} 更多...</Text>
            )}
          </View>
        )}
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

  chartContainer: {
    flexDirection: 'row',
    padding: Spacing.md,
    alignItems: 'center',
  },

  pieContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabelText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  centerValueText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },

  legend: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.xs,
  },
  legendContent: {
    flex: 1,
  },
  legendLabel: {
    fontSize: FontSizes.xs,
    color: Colors.text,
  },
  legendValues: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendValue: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginRight: Spacing.xs,
  },
  legendPercentage: {
    fontSize: FontSizes.xs,
    color: Colors.textLight,
  },
  moreText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
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
