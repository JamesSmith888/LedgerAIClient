/**
 * 折线图组件
 * 用于展示趋势变化
 */
import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Colors, Spacing } from '../../constants/theme';
import type { TrendDataPoint } from '../../types/report';

interface CustomLineChartProps {
    data: TrendDataPoint[];
    width?: number;
    height?: number;
    showIncome?: boolean;
    showExpense?: boolean;
    onDataPointClick?: (point: TrendDataPoint) => void;
}

export const CustomLineChart: React.FC<CustomLineChartProps> = ({
    data,
    width = Dimensions.get('window').width - Spacing.lg * 2 - Spacing.lg * 2,
    height = 220,
    showIncome = true,
    showExpense = true,
    onDataPointClick,
}) => {
    // 数据集
    const datasets: any[] = [];
    
    if (showIncome) {
        datasets.push({
            data: data.map(d => d.income),
            color: (opacity = 1) => `rgba(56, 142, 60, ${opacity})`, // 绿色（收入）
            strokeWidth: 2,
        });
    }
    
    if (showExpense) {
        datasets.push({
            data: data.map(d => d.expense),
            color: (opacity = 1) => `rgba(211, 47, 47, ${opacity})`, // 红色（支出）
            strokeWidth: 2,
        });
    }

    // 标签（简化显示，避免拥挤）
    const labels = data.map((d, index) => {
        if (data.length <= 7) {
            // 少于7个点，显示全部
            return formatLabel(d.date);
        } else if (data.length <= 31) {
            // 7-31个点，每隔一定间隔显示
            const step = Math.ceil(data.length / 6);
            return index % step === 0 ? formatLabel(d.date) : '';
        } else {
            // 超过31个点，只显示首尾和中间几个
            if (index === 0 || index === data.length - 1 || index % Math.floor(data.length / 5) === 0) {
                return formatLabel(d.date);
            }
            return '';
        }
    });

    // 图表配置
    const chartConfig = {
        backgroundColor: Colors.surface,
        backgroundGradientFrom: Colors.surface,
        backgroundGradientTo: Colors.surface,
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(0, 0, 0, ${opacity * 0.3})`,
        labelColor: (opacity = 1) => Colors.textSecondary,
        style: {
            borderRadius: 16,
        },
        propsForDots: {
            r: '4',
            strokeWidth: '2',
            stroke: Colors.surface,
        },
        propsForBackgroundLines: {
            strokeDasharray: '', // 实线
            stroke: Colors.border,
            strokeWidth: 1,
        },
    };

    return (
        <View style={styles.container}>
            <LineChart
                data={{
                    labels,
                    datasets,
                    legend: showIncome && showExpense ? ['收入', '支出'] : showIncome ? ['收入'] : ['支出'],
                }}
                width={width}
                height={height}
                chartConfig={chartConfig}
                bezier  // 平滑曲线
                style={styles.chart}
                withInnerLines={true}
                withOuterLines={true}
                withVerticalLines={false}
                withHorizontalLines={true}
                withDots={data.length <= 31}  // 数据点较多时隐藏圆点
                withShadow={false}
                segments={4}  // 水平线段数
                formatYLabel={(yValue) => {
                    const value = parseFloat(yValue);
                    return value === 0 ? '-' : value.toString();
                }}
                onDataPointClick={({ index }) => {
                    if (onDataPointClick && data[index]) {
                        onDataPointClick(data[index]);
                    }
                }}
            />
        </View>
    );
};

/**
 * 格式化标签（简化日期显示）
 */
const formatLabel = (date: string): string => {
    // 2024-11-18 -> 11/18
    // 2024-11 -> 11月
    // 2024 -> 2024
    if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [, month, day] = date.split('-');
        return `${parseInt(month)}/${parseInt(day)}`;
    } else if (date.match(/^\d{4}-\d{2}$/)) {
        const [, month] = date.split('-');
        return `${parseInt(month)}月`;
    } else if (date.match(/^\d{4}$/)) {
        return date;
    }
    return date;
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
    },
    chart: {
        borderRadius: 16,
    },
});
