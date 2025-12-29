/**
 * 饼图组件
 * 用于展示分类占比
 */
import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { Colors, Spacing, FontSizes, FontWeights } from '../../constants/theme';
import { CategoryIcon } from '../common/CategoryIcon';
import { formatCurrency } from '../../utils/helpers';
import type { StatisticsItem } from '../../types/report';

interface CustomPieChartProps {
    data: StatisticsItem[];
    width?: number;
    height?: number;
    onItemPress?: (item: StatisticsItem) => void;
}

// 配色方案（参考 Google Material Design）
const CHART_COLORS = [
    '#1976D2', // 蓝色
    '#388E3C', // 绿色
    '#F57C00', // 橙色
    '#E91E63', // 粉色
    '#9C27B0', // 紫色
    '#00ACC1', // 青色
    '#FBC02D', // 黄色
    '#E53935', // 红色
    '#5E35B1', // 深紫色
    '#43A047', // 深绿色
];

export const CustomPieChart: React.FC<CustomPieChartProps> = ({
    data,
    width = Dimensions.get('window').width - Spacing.lg * 2 - Spacing.lg * 2,
    height = 220,
    onItemPress,
}) => {
    // 转换数据格式（react-native-chart-kit 要求的格式）
    const chartData = data.slice(0, 8).map((item, index) => ({
        name: item.label,
        population: item.amount,
        color: CHART_COLORS[index % CHART_COLORS.length],
        legendFontColor: Colors.text,
        legendFontSize: 12,
    }));

    // 图表配置
    const chartConfig = {
        backgroundGradientFrom: Colors.surface,
        backgroundGradientTo: Colors.surface,
        color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        strokeWidth: 2,
        barPercentage: 0.5,
        useShadowColorFromDataset: false,
    };

    return (
        <View style={styles.container}>
            <PieChart
                data={chartData}
                width={width}
                height={height}
                chartConfig={chartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute={false}  // 显示百分比而非绝对值
            />

            {/* 图例列表（详细信息） */}
            <View style={styles.legend}>
                {data.slice(0, 8).map((item, index) => (
                    <TouchableOpacity
                        key={item.key}
                        style={styles.legendItem}
                        onPress={() => onItemPress && onItemPress(item)}
                        activeOpacity={0.7}
                    >
                        <View
                            style={[
                                styles.legendColor,
                                { backgroundColor: CHART_COLORS[index % CHART_COLORS.length] },
                            ]}
                        />
                        <View style={styles.legendIconWrapper}>
                            {item.icon && <CategoryIcon icon={item.icon} size={16} color={Colors.text} />}
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
                    </TouchableOpacity>
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
    legendColor: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: Spacing.sm,
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
