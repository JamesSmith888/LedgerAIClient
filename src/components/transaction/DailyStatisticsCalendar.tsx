/**
 * 日历热力图组件（增强版）
 * 以创新的双色对角分割方式展示当月每日的收支统计
 * 设计理念：结合 Google Calendar 的简洁、Telegram 的卡片风格 + 财务类应用的双色设计
 */
import React, { useMemo, useState } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Modal,
    Pressable,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {
    BorderRadius,
    Colors,
    FontSizes,
    FontWeights,
    Shadows,
    Spacing,
} from '../../constants/theme';

interface DailyStatistic {
    date: string; // YYYY-MM-DD
    income: number;
    expense: number;
    count: number;
}

interface DailyStatisticsCalendarProps {
    selectedMonth: Date;
    statistics: DailyStatistic[];
    onDayPress?: (date: Date) => void;
    visible?: boolean;
}

// 格式化金额（智能缩写）
const formatAmount = (amount: number): string => {
    if (amount === 0) return '0';
    if (amount >= 10000) return `${(amount / 10000).toFixed(1)}w`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)}k`;
    return amount.toFixed(0);
};

// 星期名称
const WEEKDAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];

export const DailyStatisticsCalendar: React.FC<DailyStatisticsCalendarProps> = ({
    selectedMonth,
    statistics,
    onDayPress,
    visible = true,
}) => {
    // 详情弹窗状态
    const [detailVisible, setDetailVisible] = useState(false);
    const [selectedDayStat, setSelectedDayStat] = useState<DailyStatistic | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    // 生成日历数据
    const calendarData = useMemo(() => {
        const year = selectedMonth.getFullYear();
        const month = selectedMonth.getMonth();
        
        // 当月第一天和最后一天
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        // 当月的天数
        const daysInMonth = lastDay.getDate();
        
        // 第一天是星期几（0=周日）
        const firstDayOfWeek = firstDay.getDay();
        
        // 构建日历矩阵
        const weeks: (Date | null)[][] = [];
        let currentWeek: (Date | null)[] = [];
        
        // 填充第一周前面的空白
        for (let i = 0; i < firstDayOfWeek; i++) {
            currentWeek.push(null);
        }
        
        // 填充所有日期
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            currentWeek.push(date);
            
            // 如果是周六或者是最后一天，开始新的一周
            if (currentWeek.length === 7) {
                weeks.push(currentWeek);
                currentWeek = [];
            }
        }
        
        // 填充最后一周后面的空白
        if (currentWeek.length > 0) {
            while (currentWeek.length < 7) {
                currentWeek.push(null);
            }
            weeks.push(currentWeek);
        }
        
        return weeks;
    }, [selectedMonth]);

    // 获取某一天的统计数据
    const getStatForDate = (date: Date | null): DailyStatistic | null => {
        if (!date) return null;
        
        const dateStr = formatDateKey(date);
        return statistics.find(stat => stat.date === dateStr) || null;
    };

    // 格式化日期为 YYYY-MM-DD
    const formatDateKey = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // 判断是否是今天
    const isToday = (date: Date | null): boolean => {
        if (!date) return false;
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    // 判断是否是未来日期
    const isFuture = (date: Date | null): boolean => {
        if (!date) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date > today;
    };

    // 根据金额计算热度等级（0-4）
    const getHeatLevel = (stat: DailyStatistic | null): number => {
        if (!stat || stat.count === 0) return 0;
        
        const total = Math.abs(stat.expense) + Math.abs(stat.income);
        
        // 根据金额区间返回热度等级
        if (total === 0) return 0;
        if (total < 100) return 1;
        if (total < 500) return 2;
        if (total < 1000) return 3;
        return 4;
    };

    // 根据热度等级获取背景色
    const getHeatColor = (level: number, isFuture: boolean): string => {
        if (isFuture) return Colors.background;
        
        const heatColors = [
            Colors.background,           // 0: 无数据
            Colors.primary + '15',       // 1: 很少
            Colors.primary + '35',       // 2: 中等
            Colors.primary + '55',       // 3: 较多
            Colors.primary + '85',       // 4: 很多
        ];
        
        return heatColors[level] || heatColors[0];
    };

    // 处理日期点击
    const handleDayPress = (date: Date | null) => {
        if (!date || isFuture(date)) return;
        onDayPress?.(date);
    };

    // 如果不可见，返回 null
    if (!visible) return null;

    return (
        <View style={styles.container}>
            {/* 标题和说明 */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Icon name="bar-chart-outline" size={20} color={Colors.primary} />
                    <Text style={styles.headerTitle}>每日收支热力图</Text>
                </View>
                <View style={styles.heatLegend}>
                    <Text style={styles.legendText}>少</Text>
                    <View style={styles.legendDots}>
                        {[0, 1, 2, 3, 4].map(level => (
                            <View
                                key={level}
                                style={[
                                    styles.legendDot,
                                    { backgroundColor: getHeatColor(level, false) },
                                ]}
                            />
                        ))}
                    </View>
                    <Text style={styles.legendText}>多</Text>
                </View>
            </View>

            {/* 星期标题 */}
            <View style={styles.weekdayHeader}>
                {WEEKDAY_NAMES.map((name, index) => (
                    <View key={index} style={styles.weekdayCell}>
                        <Text style={styles.weekdayText}>{name}</Text>
                    </View>
                ))}
            </View>

            {/* 日历网格 - 双色对角分割设计 */}
            <View style={styles.calendar}>
                {calendarData.map((week, weekIndex) => (
                    <View key={weekIndex} style={styles.weekRow}>
                        {week.map((date, dayIndex) => {
                            const stat = getStatForDate(date);
                            const isCurrentDay = isToday(date);
                            const isFutureDay = isFuture(date);
                            const hasData = stat && stat.count > 0;
                            
                            return (
                                <TouchableOpacity
                                    key={dayIndex}
                                    style={[
                                        styles.dayCell,
                                        isCurrentDay && styles.dayCellToday,
                                        isFutureDay && styles.dayCellFuture,
                                    ]}
                                    onPress={() => {
                                        if (date && !isFutureDay && hasData) {
                                            setSelectedDate(date);
                                            setSelectedDayStat(stat);
                                            setDetailVisible(true);
                                        }
                                        handleDayPress(date);
                                    }}
                                    activeOpacity={0.7}
                                    disabled={!date || isFutureDay}
                                >
                                    {date ? (
                                        <>
                                            {/* 背景分割层 */}
                                            {hasData && !isFutureDay ? (
                                                <View style={styles.splitBackground}>
                                                    {/* 左上角：支出（红色） */}
                                                    <View style={[
                                                        styles.expenseTriangle,
                                                        {
                                                            opacity: stat.expense > 0 ? 
                                                                Math.min(0.3 + (stat.expense / 1000) * 0.7, 1) : 
                                                                0.1
                                                        }
                                                    ]} />
                                                    {/* 右下角：收入（绿色） */}
                                                    <View style={[
                                                        styles.incomeTriangle,
                                                        {
                                                            opacity: stat.income > 0 ? 
                                                                Math.min(0.3 + (stat.income / 1000) * 0.7, 1) : 
                                                                0.1
                                                        }
                                                    ]} />
                                                </View>
                                            ) : null}
                                            
                                            {/* 日期数字 */}
                                            <Text
                                                style={[
                                                    styles.dayNumber,
                                                    isCurrentDay && styles.dayNumberToday,
                                                    isFutureDay && styles.dayNumberFuture,
                                                ]}
                                            >
                                                {date.getDate()}
                                            </Text>
                                            
                                            {/* 收支金额显示 */}
                                            {hasData && !isFutureDay && (
                                                <View style={styles.amountContainer}>
                                                    {stat.expense > 0 && (
                                                        <Text style={styles.expenseAmount}>
                                                            -{formatAmount(stat.expense)}
                                                        </Text>
                                                    )}
                                                    {stat.income > 0 && (
                                                        <Text style={styles.incomeAmount}>
                                                            +{formatAmount(stat.income)}
                                                        </Text>
                                                    )}
                                                </View>
                                            )}
                                        </>
                                    ) : null}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                ))}
            </View>

            {/* 详情弹窗 */}
            <Modal
                visible={detailVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setDetailVisible(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setDetailVisible(false)}
                >
                    <Pressable onPress={(e) => e.stopPropagation()}>
                        <View style={styles.detailSheet}>
                            {selectedDate && selectedDayStat && (
                                <>
                                    <View style={styles.detailHeader}>
                                        <Icon name="calendar" size={24} color={Colors.primary} />
                                        <Text style={styles.detailTitle}>
                                            {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日
                                        </Text>
                                        <TouchableOpacity
                                            style={styles.detailCloseButton}
                                            onPress={() => setDetailVisible(false)}
                                        >
                                            <Icon name="close" size={20} color={Colors.textSecondary} />
                                        </TouchableOpacity>
                                    </View>
                                    
                                    <View style={styles.detailContent}>
                                        <View style={styles.detailRow}>
                                            <View style={styles.detailIcon}>
                                                <Icon name="arrow-down-circle" size={32} color={Colors.expense} />
                                            </View>
                                            <View style={styles.detailInfo}>
                                                <Text style={styles.detailLabel}>支出</Text>
                                                <Text style={styles.detailExpenseValue}>
                                                    ¥{selectedDayStat.expense.toFixed(2)}
                                                </Text>
                                            </View>
                                        </View>
                                        
                                        <View style={styles.detailDivider} />
                                        
                                        <View style={styles.detailRow}>
                                            <View style={styles.detailIcon}>
                                                <Icon name="arrow-up-circle" size={32} color={Colors.income} />
                                            </View>
                                            <View style={styles.detailInfo}>
                                                <Text style={styles.detailLabel}>收入</Text>
                                                <Text style={styles.detailIncomeValue}>
                                                    ¥{selectedDayStat.income.toFixed(2)}
                                                </Text>
                                            </View>
                                        </View>
                                        
                                        <View style={styles.detailDivider} />
                                        
                                        <View style={styles.detailRow}>
                                            <View style={styles.detailIcon}>
                                                <Icon name="list" size={32} color={Colors.primary} />
                                            </View>
                                            <View style={styles.detailInfo}>
                                                <Text style={styles.detailLabel}>交易笔数</Text>
                                                <Text style={styles.detailCountValue}>
                                                    {selectedDayStat.count} 笔
                                                </Text>
                                            </View>
                                        </View>
                                        
                                        <View style={styles.detailBalance}>
                                            <Text style={styles.detailBalanceLabel}>当日结余</Text>
                                            <Text style={[
                                                styles.detailBalanceValue,
                                                {
                                                    color: (selectedDayStat.income - selectedDayStat.expense) >= 0 
                                                        ? Colors.income 
                                                        : Colors.expense
                                                }
                                            ]}>
                                                ¥{(selectedDayStat.income - selectedDayStat.expense).toFixed(2)}
                                            </Text>
                                        </View>
                                    </View>
                                </>
                            )}
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* 底部统计摘要 */}
            <View style={styles.summary}>
                <View style={styles.summaryItem}>
                    <Icon name="arrow-up-circle" size={16} color={Colors.income} />
                    <Text style={styles.summaryLabel}>总收入</Text>
                    <Text style={styles.summaryValueIncome}>
                        ¥{statistics.reduce((sum, s) => sum + s.income, 0).toFixed(2)}
                    </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                    <Icon name="arrow-down-circle" size={16} color={Colors.expense} />
                    <Text style={styles.summaryLabel}>总支出</Text>
                    <Text style={styles.summaryValueExpense}>
                        ¥{statistics.reduce((sum, s) => sum + s.expense, 0).toFixed(2)}
                    </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                    <Icon name="list" size={16} color={Colors.primary} />
                    <Text style={styles.summaryLabel}>总笔数</Text>
                    <Text style={styles.summaryValueCount}>
                        {statistics.reduce((sum, s) => sum + s.count, 0)}
                    </Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border + '30',
        ...Shadows.sm,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    headerTitle: {
        fontSize: FontSizes.md,
        fontWeight: FontWeights.semibold,
        color: Colors.text,
    },
    heatLegend: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    legendText: {
        fontSize: FontSizes.xs,
        color: Colors.textLight,
    },
    legendDots: {
        flexDirection: 'row',
        gap: 3,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 2,
    },
    weekdayHeader: {
        flexDirection: 'row',
        marginBottom: Spacing.xs,
    },
    weekdayCell: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: Spacing.xs,
    },
    weekdayText: {
        fontSize: FontSizes.xs,
        color: Colors.textSecondary,
        fontWeight: FontWeights.medium,
    },
    calendar: {
        marginBottom: Spacing.md,
    },
    weekRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    dayCell: {
        flex: 1,
        aspectRatio: 1,
        borderRadius: BorderRadius.sm,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 2,
        position: 'relative',
        borderWidth: 1,
        borderColor: Colors.border + '20',
        backgroundColor: Colors.background,
        overflow: 'hidden',
    },
    dayCellToday: {
        borderColor: Colors.primary,
        borderWidth: 2,
    },
    dayCellFuture: {
        opacity: 0.3,
    },
    // 双色分割背景
    splitBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
    },
    expenseTriangle: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        borderStyle: 'solid',
        borderLeftWidth: 50,
        borderRightWidth: 0,
        borderTopWidth: 50,
        borderBottomWidth: 0,
        borderLeftColor: 'transparent',
        borderTopColor: Colors.expense,
    },
    incomeTriangle: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 0,
        height: 0,
        borderStyle: 'solid',
        borderLeftWidth: 0,
        borderRightWidth: 50,
        borderTopWidth: 0,
        borderBottomWidth: 50,
        borderRightColor: 'transparent',
        borderBottomColor: Colors.income,
    },
    dayNumber: {
        fontSize: FontSizes.sm,
        fontWeight: FontWeights.bold,
        color: Colors.text,
        marginBottom: 2,
        zIndex: 10,
    },
    dayNumberToday: {
        color: Colors.primary,
        fontWeight: FontWeights.bold,
    },
    dayNumberFuture: {
        color: Colors.textLight,
    },
    // 金额容器
    amountContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    expenseAmount: {
        fontSize: 8,
        fontWeight: FontWeights.bold,
        color: Colors.expense,
        textShadowColor: 'rgba(255, 255, 255, 0.8)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 2,
    },
    incomeAmount: {
        fontSize: 8,
        fontWeight: FontWeights.bold,
        color: Colors.income,
        textShadowColor: 'rgba(255, 255, 255, 0.8)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 2,
    },
    summary: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    summaryLabel: {
        fontSize: FontSizes.xs,
        color: Colors.textSecondary,
    },
    summaryValueIncome: {
        fontSize: FontSizes.sm,
        fontWeight: FontWeights.bold,
        color: Colors.income,
    },
    summaryValueExpense: {
        fontSize: FontSizes.sm,
        fontWeight: FontWeights.bold,
        color: Colors.expense,
    },
    summaryValueCount: {
        fontSize: FontSizes.sm,
        fontWeight: FontWeights.bold,
        color: Colors.primary,
    },
    summaryDivider: {
        width: 1,
        backgroundColor: Colors.border,
    },
    // 详情弹窗样式
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    detailSheet: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        width: '100%',
        maxWidth: 400,
        ...Shadows.xl,
    },
    detailHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.lg,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    detailTitle: {
        flex: 1,
        fontSize: FontSizes.xl,
        fontWeight: FontWeights.bold,
        color: Colors.text,
        marginLeft: Spacing.sm,
    },
    detailCloseButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.backgroundSecondary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailContent: {
        gap: Spacing.md,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    detailIcon: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.backgroundSecondary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailInfo: {
        flex: 1,
    },
    detailLabel: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    detailExpenseValue: {
        fontSize: FontSizes.xxl,
        fontWeight: FontWeights.bold,
        color: Colors.expense,
    },
    detailIncomeValue: {
        fontSize: FontSizes.xxl,
        fontWeight: FontWeights.bold,
        color: Colors.income,
    },
    detailCountValue: {
        fontSize: FontSizes.xxl,
        fontWeight: FontWeights.bold,
        color: Colors.primary,
    },
    detailDivider: {
        height: 1,
        backgroundColor: Colors.border,
    },
    detailBalance: {
        marginTop: Spacing.md,
        paddingTop: Spacing.md,
        borderTopWidth: 2,
        borderTopColor: Colors.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailBalanceLabel: {
        fontSize: FontSizes.lg,
        fontWeight: FontWeights.semibold,
        color: Colors.text,
    },
    detailBalanceValue: {
        fontSize: FontSizes.xxl,
        fontWeight: FontWeights.bold,
    },
});
