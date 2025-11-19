/**
 * 月份选择器抽屉
 * 参考 Google/Telegram 风格，提供快速选择年份和月份的交互
 */
import React, { useState, useMemo } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
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

interface MonthPickerSheetProps {
    visible: boolean;
    selectedDate: Date;
    onClose: () => void;
    onSelectMonth: (date: Date) => void;
}

// 月份名称
const MONTH_NAMES = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月',
];

// 月份简称（用于卡片显示）
const MONTH_NAMES_SHORT = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月',
];

export const MonthPickerSheet: React.FC<MonthPickerSheetProps> = ({
    visible,
    selectedDate,
    onClose,
    onSelectMonth,
}) => {
    const currentDate = new Date();
    const [selectedYear, setSelectedYear] = useState(selectedDate.getFullYear());

    // 生成可选年份列表（前后各5年）
    const yearRange = useMemo(() => {
        const current = currentDate.getFullYear();
        const years: number[] = [];
        for (let i = current - 5; i <= current + 1; i++) {
            years.push(i);
        }
        return years.reverse(); // 从最近的年份开始
    }, []);

    // 处理月份选择
    const handleMonthSelect = (monthIndex: number) => {
        const newDate = new Date(selectedYear, monthIndex, 1);
        onSelectMonth(newDate);
        onClose();
    };

    // 判断月份是否是当前月
    const isCurrentMonth = (year: number, monthIndex: number): boolean => {
        return year === currentDate.getFullYear() && monthIndex === currentDate.getMonth();
    };

    // 判断月份是否被选中
    const isSelectedMonth = (year: number, monthIndex: number): boolean => {
        return year === selectedDate.getFullYear() && monthIndex === selectedDate.getMonth();
    };

    // 判断月份是否是未来月份
    const isFutureMonth = (year: number, monthIndex: number): boolean => {
        const targetDate = new Date(year, monthIndex, 1);
        const now = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        return targetDate > now;
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <TouchableOpacity
                    style={styles.overlayBackdrop}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <View style={styles.sheetContainer}>
                    {/* 拖动手柄 */}
                    <View style={styles.sheetHandle} />

                    {/* 头部 */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <Icon name="calendar-outline" size={24} color={Colors.primary} />
                            <View style={styles.headerTextContainer}>
                                <Text style={styles.title}>选择月份</Text>
                                <Text style={styles.subtitle}>快速跳转到任意月份查看记账</Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Text style={styles.closeIcon}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* 快速跳转：今天 */}
                    <View style={styles.quickActions}>
                        <TouchableOpacity
                            style={styles.quickButton}
                            onPress={() => {
                                const today = new Date();
                                onSelectMonth(today);
                                onClose();
                            }}
                            activeOpacity={0.8}
                        >
                            <Icon name="today-outline" size={18} color={Colors.primary} />
                            <Text style={styles.quickButtonText}>本月</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.scrollContainer}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* 年份选择器（横向滚动） */}
                        <View style={styles.yearSection}>
                            <Text style={styles.sectionTitle}>选择年份</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.yearList}
                            >
                                {yearRange.map(year => {
                                    const isCurrentYear = year === currentDate.getFullYear();
                                    const isSelected = year === selectedYear;
                                    return (
                                        <TouchableOpacity
                                            key={year}
                                            style={[
                                                styles.yearChip,
                                                isSelected && styles.yearChipSelected,
                                            ]}
                                            onPress={() => setSelectedYear(year)}
                                            activeOpacity={0.7}
                                        >
                                            <Text
                                                style={[
                                                    styles.yearChipText,
                                                    isSelected && styles.yearChipTextSelected,
                                                ]}
                                            >
                                                {year}
                                            </Text>
                                            {isCurrentYear && (
                                                <View style={styles.currentYearBadge}>
                                                    <Text style={styles.currentYearBadgeText}>今年</Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>

                        {/* 月份选择器（网格布局） */}
                        <View style={styles.monthSection}>
                            <Text style={styles.sectionTitle}>
                                选择 {selectedYear} 年的月份
                            </Text>
                            <View style={styles.monthGrid}>
                                {MONTH_NAMES_SHORT.map((monthName, index) => {
                                    const isCurrent = isCurrentMonth(selectedYear, index);
                                    const isSelected = isSelectedMonth(selectedYear, index);
                                    const isFuture = isFutureMonth(selectedYear, index);

                                    return (
                                        <TouchableOpacity
                                            key={index}
                                            style={[
                                                styles.monthCard,
                                                isSelected && styles.monthCardSelected,
                                                isFuture && styles.monthCardDisabled,
                                            ]}
                                            onPress={() => !isFuture && handleMonthSelect(index)}
                                            activeOpacity={0.7}
                                            disabled={isFuture}
                                        >
                                            <Text
                                                style={[
                                                    styles.monthCardText,
                                                    isSelected && styles.monthCardTextSelected,
                                                    isFuture && styles.monthCardTextDisabled,
                                                ]}
                                            >
                                                {monthName}
                                            </Text>
                                            {isCurrent && !isFuture && (
                                                <View style={styles.currentMonthDot} />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        justifyContent: 'flex-end',
    },
    overlayBackdrop: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
    },
    sheetContainer: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        maxHeight: '80%',
        paddingBottom: Spacing.xl,
        ...Shadows.lg,
    },
    sheetHandle: {
        alignSelf: 'center',
        width: 48,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: Colors.border,
        marginTop: Spacing.sm,
        marginBottom: Spacing.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: Spacing.sm,
    },
    headerTextContainer: {
        flex: 1,
    },
    title: {
        fontSize: FontSizes.lg,
        fontWeight: FontWeights.bold,
        color: Colors.text,
        marginBottom: 2,
    },
    subtitle: {
        fontSize: FontSizes.xs,
        color: Colors.textSecondary,
        lineHeight: 16,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.backgroundSecondary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeIcon: {
        fontSize: FontSizes.lg,
        color: Colors.textSecondary,
        fontWeight: '300',
    },
    quickActions: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        gap: Spacing.sm,
    },
    quickButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.primary + '10',
        gap: Spacing.xs,
    },
    quickButtonText: {
        fontSize: FontSizes.sm,
        color: Colors.primary,
        fontWeight: FontWeights.semibold,
    },
    scrollContainer: {
        paddingHorizontal: Spacing.lg,
    },
    yearSection: {
        marginBottom: Spacing.lg,
    },
    sectionTitle: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        fontWeight: FontWeights.medium,
        marginBottom: Spacing.sm,
    },
    yearList: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    yearChip: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.background,
        borderWidth: 1.5,
        borderColor: Colors.border,
        minWidth: 80,
        alignItems: 'center',
    },
    yearChipSelected: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    yearChipText: {
        fontSize: FontSizes.md,
        fontWeight: FontWeights.semibold,
        color: Colors.text,
    },
    yearChipTextSelected: {
        color: Colors.surface,
    },
    currentYearBadge: {
        marginTop: 4,
        paddingHorizontal: Spacing.xs,
        paddingVertical: 2,
        borderRadius: BorderRadius.sm,
        backgroundColor: Colors.primary + '20',
    },
    currentYearBadgeText: {
        fontSize: 10,
        color: Colors.primary,
        fontWeight: FontWeights.medium,
    },
    monthSection: {
        marginBottom: Spacing.lg,
    },
    monthGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    monthCard: {
        width: '30%',
        minHeight: 56, // 使用固定最小高度替代 aspectRatio
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.background,
        borderWidth: 1.5,
        borderColor: Colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    monthCardSelected: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    monthCardDisabled: {
        opacity: 0.4,
    },
    monthCardText: {
        fontSize: FontSizes.md,
        fontWeight: FontWeights.semibold,
        color: Colors.text,
        lineHeight: FontSizes.md * 1.2, // 修复垂直对齐
        textAlign: 'center',
        textAlignVertical: 'center', // Android 专用
    },
    monthCardTextSelected: {
        color: Colors.surface,
    },
    monthCardTextDisabled: {
        color: Colors.textLight,
    },
    currentMonthDot: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.primary,
    },
});
