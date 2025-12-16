/**
 * 折线图组件
 * 用于展示趋势变化
 */
import React from 'react';
import { View, StyleSheet, Dimensions, ScrollView } from 'react-native';
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
    fitScreen?: boolean; // 是否强制适应屏幕宽度（不滚动）
}

export const CustomLineChart: React.FC<CustomLineChartProps> = ({
    data,
    width = Dimensions.get('window').width - Spacing.lg * 2 - Spacing.lg * 2,
    height = 220,
    showIncome = true,
    showExpense = true,
    onDataPointClick,
    fitScreen = false,
}) => {
    // 确定主色调（用于点和线）
    const isExpense = showExpense && !showIncome;
    const mainColor = isExpense ? Colors.expense : Colors.income;
    const mainColorRgba = isExpense ? `rgba(244, 63, 94, 1)` : `rgba(16, 185, 129, 1)`; // Colors.expense/income

    // 数据集
    const datasets: any[] = [];
    
    if (showIncome) {
        datasets.push({
            data: data.map(d => d.income),
            color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, // 绿色（收入）
            strokeWidth: 2,
        });
    }
    
    if (showExpense) {
        datasets.push({
            data: data.map(d => d.expense),
            color: (opacity = 1) => `rgba(244, 63, 94, ${opacity})`, // 红色（支出）
            strokeWidth: 2,
        });
    }

    // 计算图表宽度（支持横向滚动）
    // 每个数据点至少占用 50px，如果总宽度超过屏幕宽度，则启用滚动
    const minPointWidth = 50;
    const calculatedWidth = fitScreen ? width : Math.max(width, data.length * minPointWidth);
    const isScrollable = !fitScreen && calculatedWidth > width;

    // 标签显示逻辑
    const labels = data.map((d, index) => {
        // 如果可以滚动，或者数据点很少，则显示所有标签
        if (isScrollable || data.length <= 7) {
            return formatLabel(d.date);
        }
        // 否则（数据点多且挤在一个屏幕内），进行抽样显示
        // 比如 fitScreen 模式下，如果点很多，就只显示部分标签
        const step = Math.ceil(data.length / 6);
        return index % step === 0 ? formatLabel(d.date) : '';
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
            stroke: showIncome && showExpense ? Colors.surface : mainColorRgba, // 如果单选，边框用主色；如果多选，边框用白色（默认）
        },
        propsForBackgroundLines: {
            strokeDasharray: '', // 实线
            stroke: Colors.border,
            strokeWidth: 1,
        },
    };

    return (
        <View style={styles.container}>
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: Spacing.lg }} // 右侧留白
            >
                <LineChart
                    data={{
                        labels,
                        datasets,
                        legend: showIncome && showExpense ? ['收入', '支出'] : [], // 单选时不显示图例
                    }}
                    width={calculatedWidth}
                    height={height}
                    chartConfig={chartConfig}
                    bezier  // 平滑曲线
                    style={styles.chart}
                    withInnerLines={true}
                    withOuterLines={true}
                    withVerticalLines={false}
                    withHorizontalLines={true}
                    withDots={true}  // 始终显示圆点
                    withShadow={false}
                    segments={4}  // 水平线段数
                    getDotColor={(dataPoint, index) => {
                        // 0值显示空心（填充背景色），非0值显示实心（填充主色）
                        if (dataPoint === 0) {
                            return Colors.surface;
                        }
                        // 多选模式下，无法区分是收入还是支出的点（因为getDotColor只给值），
                        // 但这里 datasets 顺序是 [收入, 支出]，chart-kit 会按顺序渲染。
                        // 不过 chart-kit 的 getDotColor 好像对所有 dataset 生效？
                        // 实际上 react-native-chart-kit 的 getDotColor 回调签名是 (dataPoint, index)
                        // 它无法区分是哪条线的点。这是一个已知限制。
                        // 但如果是单选模式（showIncome ^ showExpense），我们可以明确颜色。
                        if (showIncome && !showExpense) return Colors.income;
                        if (!showIncome && showExpense) return Colors.expense;
                        
                        // 双选模式下，只能返回一个颜色，或者根据值的正负？
                        // 但这里 dataPoint 都是正数（金额）。
                        // 这是一个妥协：双选模式下，实心点统一用一种颜色，或者都空心？
                        // 之前的逻辑是：return dataPoint === 0 ? Colors.surface : (showIncome ? Colors.income : Colors.expense);
                        // 这会导致双选时，两条线的点颜色一样。
                        // 鉴于用户主要使用单选模式（趋势图头部有切换），我们优先保证单选模式的体验。
                        return Colors.primary; 
                    }}
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
            </ScrollView>
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
