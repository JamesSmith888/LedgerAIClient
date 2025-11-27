/**
 * 分类折线图组件
 * 用于展示分类金额排名和对比
 */
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Colors, Spacing, FontSizes, FontWeights } from '../../constants/theme';
import { CategoryIcon } from '../common/CategoryIcon';
import { formatCurrency } from '../../utils/helpers';
import type { StatisticsItem } from '../../types/report';

interface CategoryLineChartProps {
    data: StatisticsItem[];
    width?: number;
    height?: number;
}

export const CategoryLineChart: React.FC<CategoryLineChartProps> = ({
    data,
    width = Dimensions.get('window').width - Spacing.lg * 2 - Spacing.lg * 2,
    height = 220,
}) => {
    // 只显示前8个数据
    const displayData = data.slice(0, 8);

    // 标签（简化显示序号）
    const labels = displayData.map((_, index) => `#${index + 1}`);

    // 数据值
    const dataValues = displayData.map(item => item.amount);

    // 图表配置
    const chartConfig = {
        backgroundColor: Colors.surface,
        backgroundGradientFrom: Colors.surface,
        backgroundGradientTo: Colors.surface,
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
        labelColor: (opacity = 1) => Colors.textSecondary,
        style: {
            borderRadius: 16,
        },
        propsForDots: {
            r: '6',
            strokeWidth: '2',
            stroke: Colors.primary,
        },
        propsForBackgroundLines: {
            strokeDasharray: '',
            stroke: Colors.border,
            strokeWidth: 1,
        },
    };

    return (
        <View style={styles.container}>
            <LineChart
                data={{
                    labels,
                    datasets: [
                        {
                            data: dataValues,
                            color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                            strokeWidth: 3,
                        },
                    ],
                }}
                width={width}
                height={height}
                yAxisLabel=""
                yAxisSuffix=""
                formatYLabel={(yValue) => {
                    const value = parseFloat(yValue);
                    return value === 0 ? '-' : `¥${value}`;
                }}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                withInnerLines={true}
                withOuterLines={true}
                withVerticalLines={false}
                withHorizontalLines={true}
                withDots={true}
                withShadow={false}
                segments={4}
            />

            {/* 图例列表 - 显示排名、分类名称和图标 */}
            <View style={styles.legend}>
                {displayData.map((item, index) => (
                    <View key={item.key} style={styles.legendItem}>
                        <View style={styles.legendRankBadge}>
                            <Text style={styles.legendRankText}>#{index + 1}</Text>
                        </View>
                        <View style={styles.legendIconWrapper}>
                            {item.icon && <CategoryIcon icon={item.icon} size={16} color={Colors.primary} />}
                        </View>
                        <Text style={styles.legendLabel} numberOfLines={1}>
                            {item.label}
                        </Text>
                        <Text style={styles.legendValue}>
                            {formatCurrency(item.amount)}
                        </Text>
                        <Text style={styles.legendPercentage}>
                            {item.percentage.toFixed(1)}%
                        </Text>
                    </View>
                ))}
                {data.length > 8 && (
                    <Text style={styles.moreText}>
                        还有 {data.length - 8} 个分类未显示
                    </Text>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
    },
    chart: {
        borderRadius: 16,
        marginBottom: Spacing.md,
    },
    legend: {
        marginTop: Spacing.md,
        width: '100%',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.xs,
        paddingHorizontal: Spacing.sm,
        borderRadius: 8,
        marginBottom: Spacing.xs,
        backgroundColor: Colors.background,
    },
    legendRankBadge: {
        width: 28,
        height: 22,
        borderRadius: 11,
        backgroundColor: Colors.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.xs,
    },
    legendRankText: {
        fontSize: 11,
        color: Colors.primary,
        fontWeight: FontWeights.bold,
    },
    legendIconWrapper: {
        width: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.xs,
    },
    legendLabel: {
        flex: 1,
        fontSize: FontSizes.sm,
        color: Colors.text,
        fontWeight: FontWeights.medium,
    },
    legendValue: {
        fontSize: FontSizes.sm,
        color: Colors.text,
        fontWeight: FontWeights.semibold,
        marginRight: Spacing.sm,
    },
    legendPercentage: {
        fontSize: FontSizes.xs,
        color: Colors.textSecondary,
        width: 45,
        textAlign: 'right',
    },
    moreText: {
        fontSize: FontSizes.xs,
        color: Colors.textLight,
        textAlign: 'center',
        marginTop: Spacing.xs,
        fontStyle: 'italic',
    },
});
