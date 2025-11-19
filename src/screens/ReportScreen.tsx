/**
 * 图表主页面
 * 提供多维度数据分析和可视化
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius, Shadows } from '../constants/theme';
import { BaseChart, CustomPieChart, CustomLineChart, CustomBarChart, CategoryLineChart } from '../components/charts';
import { useLedger } from '../context/LedgerContext';
import { LedgerSelector } from '../components/ledger/LedgerSelector';
import { reportAPI } from '../api/services/reportAPI';
import type { CategoryStatistics, TrendStatistics, TimeGranularity } from '../types/report';
import type { Ledger } from '../types/ledger';
import { toast } from '../utils/toast';

type TabType = 'category' | 'trend' | 'dimension';
type ChartType = 'pie' | 'bar' | 'line';
type TimeRangePreset = 'week' | 'month' | 'quarter' | 'year';
type DimensionType = 'category' | 'paymentMethod' | 'ledger';

export const ReportScreen: React.FC = () => {
    const insets = useSafeAreaInsets();
    const { ledgers } = useLedger();

    // ========== 状态管理 ==========
    // 筛选账本（用于报表数据过滤）
    const [filterLedger, setFilterLedger] = useState<Ledger | null>(null);
    
    const [activeTab, setActiveTab] = useState<TabType>('category');
    const [chartType, setChartType] = useState<ChartType>('pie');
    const [timeGranularity, setTimeGranularity] = useState<TimeGranularity>('month');
    const [selectedTimePreset, setSelectedTimePreset] = useState<TimeRangePreset>('month');
    
    // 多维度分析
    const [dimensionType, setDimensionType] = useState<DimensionType>('category');
    const [dimensionData, setDimensionData] = useState<CategoryStatistics | null>(null);
    
    // 数据状态
    const [categoryData, setCategoryData] = useState<CategoryStatistics | null>(null);
    const [trendData, setTrendData] = useState<TrendStatistics | null>(null);
    
    // 加载状态
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 时间范围（默认当月）
    const [timeRange, setTimeRange] = useState<{ startTime: Date; endTime: Date }>(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        return { startTime: startOfMonth, endTime: endOfMonth };
    });

    // ========== 数据加载 ==========
    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [activeTab, timeRange, filterLedger, timeGranularity, dimensionType])
    );

    const loadData = async () => {
        try {
            setIsLoading(true);
            setError(null);

            if (activeTab === 'category') {
                // 分类统计：只查询支出
                const params = {
                    ledgerId: filterLedger?.id || null,
                    startTime: timeRange.startTime.toISOString(),
                    endTime: timeRange.endTime.toISOString(),
                    groupBy: timeGranularity,
                    dimension: 'category' as const,
                    type: 2 as 2, // 只统计支出
                };
                const data = await reportAPI.getStatisticsByCategory(params);
                setCategoryData(data);
            } else if (activeTab === 'trend') {
                // 趋势分析：查询收入+支出，不传type参数
                const params = {
                    ledgerId: filterLedger?.id || null,
                    startTime: timeRange.startTime.toISOString(),
                    endTime: timeRange.endTime.toISOString(),
                    groupBy: timeGranularity,
                    dimension: 'category' as const,
                };
                const data = await reportAPI.getTrendStatistics(params);
                setTrendData(data);
            } else if (activeTab === 'dimension') {
                // 多维度分析：只查询支出
                const params = {
                    ledgerId: filterLedger?.id || null,
                    startTime: timeRange.startTime.toISOString(),
                    endTime: timeRange.endTime.toISOString(),
                    groupBy: timeGranularity,
                    dimension: dimensionType,
                    type: 2 as 2, // 只统计支出
                };
                const data = await reportAPI.getStatisticsByCategory(params);
                setDimensionData(data);
            }
        } catch (err: any) {
            console.error('加载图表数据失败:', err);
            setError(err.message || '加载失败，请稍后重试');
            toast.error('加载失败');
        } finally {
            setIsLoading(false);
        }
    };

    // 下拉刷新
    const onRefresh = async () => {
        setIsRefreshing(true);
        await loadData();
        setIsRefreshing(false);
    };

    // ========== 快捷时间范围 ==========
    const setTimeRangePreset = (preset: TimeRangePreset) => {
        const now = new Date();
        let startTime: Date;
        let endTime: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        switch (preset) {
            case 'week':
                startTime = new Date(now);
                startTime.setDate(now.getDate() - 7);
                setTimeGranularity('day');
                break;
            case 'month':
                startTime = new Date(now.getFullYear(), now.getMonth(), 1);
                endTime = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                setTimeGranularity('day');
                break;
            case 'quarter':
                const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
                startTime = new Date(now.getFullYear(), quarterStartMonth, 1);
                endTime = new Date(now.getFullYear(), quarterStartMonth + 3, 0, 23, 59, 59);
                setTimeGranularity('month');
                break;
            case 'year':
                startTime = new Date(now.getFullYear(), 0, 1);
                endTime = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
                setTimeGranularity('month');
                break;
        }

        setSelectedTimePreset(preset);
        setTimeRange({ startTime, endTime });
    };

    // ========== 渲染函数 ==========
    const renderHeader = () => (
        <View style={styles.header}>
            {ledgers.length > 1 ? (
                <LedgerSelector
                    ledgers={ledgers}
                    currentLedger={filterLedger}
                    onSelect={(ledger) => setFilterLedger(ledger)}
                    mode="dropdown"
                    showAllOption={true}
                />
            ) : (
                <Text style={styles.headerTitle}>
                    {ledgers.length === 1 ? ledgers[0].name : '数据图表'}
                </Text>
            )}
        </View>
    );

    const renderTabs = () => (
        <View style={styles.tabs}>
            <Pressable
                style={[styles.tab, activeTab === 'category' && styles.tabActive]}
                onPress={() => setActiveTab('category')}
            >
                <Text style={[styles.tabText, activeTab === 'category' && styles.tabTextActive]}>
                    分类统计
                </Text>
            </Pressable>
            <Pressable
                style={[styles.tab, activeTab === 'trend' && styles.tabActive]}
                onPress={() => setActiveTab('trend')}
            >
                <Text style={[styles.tabText, activeTab === 'trend' && styles.tabTextActive]}>
                    趋势分析
                </Text>
            </Pressable>
            <Pressable
                style={[styles.tab, activeTab === 'dimension' && styles.tabActive]}
                onPress={() => setActiveTab('dimension')}
            >
                <Text style={[styles.tabText, activeTab === 'dimension' && styles.tabTextActive]}>
                    多维分析
                </Text>
            </Pressable>
        </View>
    );

    const renderTimeRangeSelector = () => (
        <View style={styles.compactSelectorRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.compactSelectorScroll}>
                {(['week', 'month', 'quarter', 'year'] as const).map(preset => (
                    <Pressable
                        key={preset}
                        style={[
                            styles.compactButton,
                            selectedTimePreset === preset && styles.compactButtonActive
                        ]}
                        onPress={() => setTimeRangePreset(preset)}
                    >
                        <Text style={[
                            styles.compactButtonText,
                            selectedTimePreset === preset && styles.compactButtonTextActive
                        ]}>
                            {preset === 'week' && '7天'}
                            {preset === 'month' && '本月'}
                            {preset === 'quarter' && '季度'}
                            {preset === 'year' && '全年'}
                        </Text>
                    </Pressable>
                ))}
            </ScrollView>
        </View>
    );

    const renderChartTypeToggle = () => {
        if (activeTab !== 'category' && activeTab !== 'dimension') return null;

        const getChartIcon = (type: ChartType): string => {
            switch (type) {
                case 'pie': return 'pie-chart-outline';
                case 'bar': return 'bar-chart-outline';
                case 'line': return 'trending-up-outline';
            }
        };

        return (
            <>
                <View style={styles.dividerLine} />
                <View style={styles.chartTypeIconRow}>
                    {(['pie', 'bar', 'line'] as const).map(type => (
                        <Pressable
                            key={type}
                            style={[styles.chartIconButton, chartType === type && styles.chartIconButtonActive]}
                            onPress={() => setChartType(type)}
                        >
                            <Icon 
                                name={getChartIcon(type)} 
                                size={20} 
                                color={chartType === type ? Colors.surface : Colors.textSecondary} 
                            />
                        </Pressable>
                    ))}
                </View>
            </>
        );
    };

    const renderDimensionSelector = () => {
        if (activeTab !== 'dimension') return null;

        return (
            <View style={styles.compactSelectorRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.compactSelectorScroll}>
                    {([
                        { type: 'category', label: '分类' },
                        { type: 'paymentMethod', label: '支付' },
                        { type: 'ledger', label: '账本' },
                    ] as const).map(({ type, label }) => (
                        <Pressable
                            key={type}
                            style={[
                                styles.compactButton,
                                dimensionType === type && styles.compactButtonActive
                            ]}
                            onPress={() => setDimensionType(type)}
                        >
                            <Text style={[
                                styles.compactButtonText,
                                dimensionType === type && styles.compactButtonTextActive
                            ]}>
                                {label}
                            </Text>
                        </Pressable>
                    ))}
                </ScrollView>
            </View>
        );
    };

    const renderCategoryStatistics = () => {
        if (!categoryData) return null;

        const isEmpty = !categoryData.items || categoryData.items.length === 0;

        return (
            <BaseChart
                loading={isLoading}
                error={error}
                isEmpty={isEmpty}
                title="支出分类分析"
                subtitle={`总计：¥${categoryData.totalAmount.toFixed(2)} · ${categoryData.totalCount}笔`}
                emptyMessage="该时间范围内暂无支出记录"
            >
                {chartType === 'pie' ? (
                    <CustomPieChart data={categoryData.items} />
                ) : chartType === 'bar' ? (
                    <CustomBarChart data={categoryData.items} />
                ) : (
                    <CategoryLineChart data={categoryData.items} />
                )}
            </BaseChart>
        );
    };

    const renderDimensionStatistics = () => {
        if (!dimensionData) return null;

        const isEmpty = !dimensionData.items || dimensionData.items.length === 0;

        const getDimensionTitle = () => {
            switch (dimensionType) {
                case 'category':
                    return '分类维度分析';
                case 'paymentMethod':
                    return '支付方式分析';
                case 'ledger':
                    return '账本维度分析';
                default:
                    return '多维度分析';
            }
        };

        return (
            <BaseChart
                loading={isLoading}
                error={error}
                isEmpty={isEmpty}
                title={getDimensionTitle()}
                subtitle={`总计：¥${dimensionData.totalAmount.toFixed(2)} · ${dimensionData.totalCount}笔`}
                emptyMessage="该时间范围内暂无数据"
            >
                {chartType === 'pie' ? (
                    <CustomPieChart data={dimensionData.items} />
                ) : chartType === 'bar' ? (
                    <CustomBarChart data={dimensionData.items} />
                ) : (
                    <CategoryLineChart data={dimensionData.items} />
                )}
            </BaseChart>
        );
    };

    const renderTrendStatistics = () => {
        if (!trendData) return null;

        const isEmpty = !trendData.dataPoints || trendData.dataPoints.length === 0;

        return (
            <>
                {/* 汇总卡片 */}
                {!isEmpty && (
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryRow}>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>总收入</Text>
                                <Text style={[styles.summaryValue, { color: Colors.income }]}>
                                    ¥{trendData.summary.totalIncome.toFixed(2)}
                                </Text>
                            </View>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>总支出</Text>
                                <Text style={[styles.summaryValue, { color: Colors.expense }]}>
                                    ¥{trendData.summary.totalExpense.toFixed(2)}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.summaryDivider} />
                        <View style={styles.summaryRow}>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>净收益</Text>
                                <Text style={[
                                    styles.summaryValue,
                                    { color: trendData.summary.netBalance >= 0 ? Colors.income : Colors.expense }
                                ]}>
                                    ¥{trendData.summary.netBalance.toFixed(2)}
                                </Text>
                            </View>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>记录数</Text>
                                <Text style={styles.summaryValue}>
                                    {trendData.summary.totalCount}笔
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* 趋势图表 */}
                <BaseChart
                    loading={isLoading}
                    error={error}
                    isEmpty={isEmpty}
                    title="收支趋势"
                    subtitle={`${timeGranularity === 'day' ? '按天' : timeGranularity === 'week' ? '按周' : timeGranularity === 'month' ? '按月' : '按年'}统计`}
                    emptyMessage="该时间范围内暂无数据"
                >
                    <CustomLineChart data={trendData.dataPoints} />
                </BaseChart>
            </>
        );
    };

    // ========== 主渲染 ==========
    return (
        <View style={[styles.safeArea, { paddingTop: insets.top }]}>
            {renderHeader()}
            {renderTabs()}
            
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
                }
            >
                {/* 紧凑型工具栏 */}
                <View style={styles.compactToolbar}>
                    {/* 时间范围 */}
                    {renderTimeRangeSelector()}
                    
                    {/* 维度选择（仅多维分析） */}
                    {activeTab === 'dimension' && renderDimensionSelector()}
                    
                    {/* 图表类型（带分隔线） */}
                    {renderChartTypeToggle()}
                </View>
                
                {activeTab === 'category' 
                    ? renderCategoryStatistics() 
                    : activeTab === 'trend' 
                        ? renderTrendStatistics()
                        : renderDimensionStatistics()
                }
            </ScrollView>
        </View>
    );
};

// ========== 样式 ==========
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
    },
    headerTitle: {
        fontSize: FontSizes.xxl,
        fontWeight: FontWeights.bold,
        color: Colors.text,
        marginBottom: Spacing.xs,
    },
    headerSubtitle: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
    },
    tabs: {
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        paddingHorizontal: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
    },
    tab: {
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: Colors.primary,
    },
    tabText: {
        fontSize: FontSizes.md,
        fontWeight: FontWeights.medium,
        color: Colors.textSecondary,
    },
    tabTextActive: {
        color: Colors.primary,
        fontWeight: FontWeights.semibold,
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: Spacing.lg,
    },
    // ===== 紧凑型工具栏 =====
    compactToolbar: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        ...Shadows.sm,
    },
    compactSelectorRow: {
        marginBottom: Spacing.md,
    },
    dividerLine: {
        height: 1,
        backgroundColor: Colors.divider,
        marginVertical: Spacing.md,
    },
    compactSelectorScroll: {
        flexGrow: 0,
    },
    compactButton: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
        marginRight: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
        minHeight: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    compactButtonActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    compactButtonText: {
        fontSize: FontSizes.sm,
        fontWeight: FontWeights.medium,
        color: Colors.textSecondary,
    },
    compactButtonTextActive: {
        color: Colors.surface,
        fontWeight: FontWeights.semibold,
    },
    // ===== 图表类型图标按钮 =====
    chartTypeIconRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    chartIconButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    chartIconButtonActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    summaryCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        ...Shadows.sm,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginBottom: Spacing.xs,
    },
    summaryValue: {
        fontSize: FontSizes.lg,
        fontWeight: FontWeights.bold,
        color: Colors.text,
    },
    summaryDivider: {
        height: 1,
        backgroundColor: Colors.divider,
        marginVertical: Spacing.md,
    },
});
