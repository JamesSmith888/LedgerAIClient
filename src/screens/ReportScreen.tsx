/**
 * 图表主页面
 * 提供多维度数据分析和可视化
 */
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    RefreshControl,
    Modal,
    Dimensions,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius, Shadows } from '../constants/theme';
import { BaseChart, CustomPieChart, CustomLineChart, CustomBarChart, CategoryLineChart } from '../components/charts';
import { useLedger } from '../context/LedgerContext';
import { useAuth } from '../context/AuthContext';
import { LedgerSelector } from '../components/ledger/LedgerSelector';
import { LedgerMembers } from '../components/ledger/LedgerMembers';
import { CategoryIcon } from '../components/common/CategoryIcon';
import { reportAPI } from '../api/services/reportAPI';
import { transactionAPI } from '../api/services/transactionAPI';
import type { CategoryStatistics, TrendStatistics, TimeGranularity, TrendDataPoint, StatisticsItem } from '../types/report';
import type { Transaction } from '../types/transaction';
import { Ledger, LedgerType } from '../types/ledger';
import { toast } from '../utils/toast';
import { formatCurrency } from '../utils/helpers';

type TabType = 'category' | 'trend' | 'dimension';
type ChartType = 'pie' | 'bar' | 'line';
type TimeRangePreset = 'day' | 'week' | 'month' | 'quarter' | 'year';
type DimensionType = 'category' | 'paymentMethod' | 'ledger';

export const ReportScreen: React.FC = () => {
    const insets = useSafeAreaInsets();
    const { ledgers, currentLedger, defaultLedgerId, setCurrentLedger } = useLedger();
    const { user } = useAuth();
    const currentUserId = user?._id ? Number(user._id) : null;

    // ========== 状态管理 ==========
    // 筛选账本（用于报表数据过滤）
    const [filterLedger, setFilterLedger] = useState<Ledger | null>(null);
    // 记录上一次的默认账本 ID（用于检测默认账本是否变化）
    const [prevDefaultLedgerId, setPrevDefaultLedgerId] = useState<number | null>(null);

    // 管理默认账本的自动选中逻辑（与 TransactionListScreen 保持一致）
    useEffect(() => {
        if (!ledgers.length) return;

        // 场景1：初始加载（filterLedger 为 null 且 prevDefaultLedgerId 也为 null，说明是首次加载）
        if (!filterLedger && !prevDefaultLedgerId && defaultLedgerId) {
            const defaultLedger = ledgers.find(l => l.id === defaultLedgerId);
            if (defaultLedger) {
                setFilterLedger(defaultLedger);
                setPrevDefaultLedgerId(defaultLedgerId);
            }
            return;
        }

        // 场景2：默认账本变化了（用户在账本管理页面修改了默认账本）
        if (defaultLedgerId && prevDefaultLedgerId !== defaultLedgerId) {
            const newDefaultLedger = ledgers.find(l => l.id === defaultLedgerId);
            if (newDefaultLedger) {
                // 切换到新的默认账本
                setFilterLedger(newDefaultLedger);
                setPrevDefaultLedgerId(defaultLedgerId);
            }
        }
    }, [defaultLedgerId, ledgers, prevDefaultLedgerId]);

    // 监听 currentLedger 变化，实现与交易列表页面的实时同步
    useEffect(() => {
        // 如果 currentLedger 变化了，且与当前 filterLedger 不同，则同步更新
        if (currentLedger && filterLedger?.id !== currentLedger.id) {
            setFilterLedger(currentLedger);
        }
    }, [currentLedger]);
    
    const [activeTab, setActiveTab] = useState<TabType>('trend');
    const [chartType, setChartType] = useState<ChartType>('pie');
    const [timeGranularity, setTimeGranularity] = useState<TimeGranularity>('day');
    const [selectedTimePreset, setSelectedTimePreset] = useState<TimeRangePreset>('month');
    
    // 多维度分析
    const [dimensionType, setDimensionType] = useState<DimensionType>('paymentMethod');
    const [dimensionData, setDimensionData] = useState<CategoryStatistics | null>(null);
    
    // 数据状态
    const [categoryData, setCategoryData] = useState<CategoryStatistics | null>(null);
    const [trendData, setTrendData] = useState<TrendStatistics | null>(null);
    
    // 交易详情（点击趋势图点）
    const [topTransactions, setTopTransactions] = useState<Transaction[]>([]);
    const [loadingTransactions, setLoadingTransactions] = useState(false);
    
    // 趋势图类型：支出 | 收入
    const [trendType, setTrendType] = useState<'expense' | 'income'>('expense');
    
    // 全屏横屏查看
    const [isLandscape, setIsLandscape] = useState(false);

    // 加载状态
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 日期选择
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());

    // 选中的数据点（用于展示详情）
    const [selectedPoint, setSelectedPoint] = useState<TrendDataPoint | null>(null);

    // ========== ✨ 新增：分类详情弹窗状态 ==========
    const [selectedCategoryItem, setSelectedCategoryItem] = useState<StatisticsItem | null>(null);
    const [categoryTransactions, setCategoryTransactions] = useState<Transaction[]>([]);
    const [loadingCategoryTransactions, setLoadingCategoryTransactions] = useState(false);

    // 加载选中点的Top交易
    useEffect(() => {
        const fetchTopTransactions = async () => {
            if (!selectedPoint) {
                setTopTransactions([]);
                return;
            }

            try {
                setLoadingTransactions(true);
                
                let startTime = '';
                let endTime = '';
                
                const dateStr = selectedPoint.date;
                // 简单的日期格式判断
                if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                    // 按天
                    startTime = `${dateStr}T00:00:00`;
                    endTime = `${dateStr}T23:59:59`;
                } else if (/^\d{4}-\d{2}$/.test(dateStr)) {
                    // 按月
                    const [year, month] = dateStr.split('-').map(Number);
                    const start = new Date(year, month - 1, 1);
                    const end = new Date(year, month, 0, 23, 59, 59);
                    startTime = start.toISOString();
                    endTime = end.toISOString();
                } else {
                    // 其他格式暂不处理
                    setTopTransactions([]);
                    setLoadingTransactions(false);
                    return;
                }

                const transactions = await transactionAPI.getTop({
                    ledgerId: filterLedger?.id,
                    startTime,
                    endTime,
                    size: 3,
                    type: 2 // 默认只看支出
                });
                
                setTopTransactions(transactions);
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingTransactions(false);
            }
        };

        fetchTopTransactions();
    }, [selectedPoint, filterLedger]);



    // 时间范围（默认当月）
    const [timeRange, setTimeRange] = useState<{ startTime: Date; endTime: Date }>(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        return { startTime: startOfMonth, endTime: endOfMonth };
    });

    // ========== ✨ 新增：加载分类详情交易 ==========
    useEffect(() => {
        if (!selectedCategoryItem) return;

        const loadCategoryTransactions = async () => {
            setLoadingCategoryTransactions(true);
            try {
                // 使用 query 接口查询该分类下的交易
                const response = await transactionAPI.query({
                    ledgerId: filterLedger?.id || null,
                    categoryId: Number(selectedCategoryItem.key),
                    startTime: timeRange.startTime.toISOString(),
                    endTime: timeRange.endTime.toISOString(),
                    page: 0,
                    size: 500, // 显示前500条，确保显示大部分数据
                    sortBy: 'transactionDateTime',
                    sortDirection: 'DESC'
                });
                setCategoryTransactions(response.content);
            } catch (error) {
                console.error('加载分类交易失败:', error);
                toast.error('加载详情失败');
            } finally {
                setLoadingCategoryTransactions(false);
            }
        };

        loadCategoryTransactions();
    }, [selectedCategoryItem, timeRange, filterLedger]);

    const handleCategoryPress = (item: StatisticsItem) => {
        setSelectedCategoryItem(item);
    };

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
            setSelectedPoint(null); // 清除选中的点

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
                const trendParams = {
                    ledgerId: filterLedger?.id || null,
                    startTime: timeRange.startTime.toISOString(),
                    endTime: timeRange.endTime.toISOString(),
                    groupBy: timeGranularity,
                    dimension: 'category' as const,
                };
                
                // 同时加载分类数据（用于下方展示）
                const categoryParams = {
                    ledgerId: filterLedger?.id || null,
                    startTime: timeRange.startTime.toISOString(),
                    endTime: timeRange.endTime.toISOString(),
                    groupBy: timeGranularity,
                    dimension: 'category' as const,
                    type: 2 as 2, // 只统计支出
                };

                const [trendRes, categoryRes] = await Promise.all([
                    reportAPI.getTrendStatistics(trendParams),
                    reportAPI.getStatisticsByCategory(categoryParams)
                ]);
                
                setTrendData(trendRes);
                setCategoryData(categoryRes);
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
            case 'day':
                // 如果是按天，默认今天，或者保持当前选中的日期
                startTime = new Date(selectedDate);
                startTime.setHours(0, 0, 0, 0);
                endTime = new Date(selectedDate);
                endTime.setHours(23, 59, 59, 999);
                setTimeGranularity('day');
                break;
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

    const onDateChange = (event: any, date?: Date) => {
        setShowDatePicker(false);
        if (date) {
            setSelectedDate(date);
            // 如果当前是按天模式，立即更新时间范围
            if (selectedTimePreset === 'day') {
                const startTime = new Date(date);
                startTime.setHours(0, 0, 0, 0);
                const endTime = new Date(date);
                endTime.setHours(23, 59, 59, 999);
                setTimeRange({ startTime, endTime });
            }
        }
    };

    // ========== 渲染函数 ==========
    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.headerLeft}>
                {ledgers.length > 1 ? (
                    <LedgerSelector
                        ledgers={ledgers}
                        currentLedger={filterLedger}
                        onSelect={(ledger) => {
                            setFilterLedger(ledger);
                            // 同步更新 LedgerContext 的 currentLedger，实现与交易列表的同步
                            if (ledger) {
                                setCurrentLedger(ledger);
                            }
                        }}
                        mode="dropdown"
                        showAllOption={true}
                        defaultLedgerId={defaultLedgerId}
                        currentUserId={currentUserId}
                    />
                ) : (
                    <Text style={styles.headerTitle}>
                        {ledgers.length === 1 ? ledgers[0].name : '数据图表'}
                    </Text>
                )}
            </View>

            {/* ✨ 新增：共享账本成员展示 */}
            {filterLedger && filterLedger.type === LedgerType.SHARED && (
                <LedgerMembers 
                    ledgerId={filterLedger.id} 
                    maxDisplay={3}
                    avatarSize={28}
                />
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
                {(['day', 'week', 'month', 'quarter', 'year'] as const).map(preset => (
                    <Pressable
                        key={preset}
                        style={[
                            styles.compactButton,
                            selectedTimePreset === preset && styles.compactButtonActive
                        ]}
                        onPress={() => {
                            if (preset === 'day' && selectedTimePreset === 'day') {
                                setShowDatePicker(true);
                            } else {
                                setTimeRangePreset(preset);
                            }
                        }}
                    >
                        <Text style={[
                            styles.compactButtonText,
                            selectedTimePreset === preset && styles.compactButtonTextActive
                        ]}>
                            {preset === 'day' 
                                ? (selectedTimePreset === 'day' ? `${selectedDate.getMonth() + 1}/${selectedDate.getDate()}` : '按天')
                                : preset === 'week' ? '近一周'
                                : preset === 'month' ? '本月'
                                : preset === 'quarter' ? '本季'
                                : '本年'}
                        </Text>
                    </Pressable>
                ))}
            </ScrollView>
        </View>
    );

    const renderChartTypeToggle = () => {
        const getChartIcon = (type: ChartType): string => {
            switch (type) {
                case 'pie': return 'pie-chart-outline';
                case 'bar': return 'bar-chart-outline';
                case 'line': return 'trending-up-outline';
            }
        };

        return (
            <View style={styles.chartTypeIconRow}>
                {(['pie', 'bar'] as const).map(type => (
                    <Pressable
                        key={type}
                        style={[styles.chartIconButton, chartType === type && styles.chartIconButtonActive]}
                        onPress={() => setChartType(type)}
                    >
                        <Icon 
                            name={getChartIcon(type)} 
                            size={16} 
                            color={chartType === type ? Colors.surface : Colors.textSecondary} 
                        />
                    </Pressable>
                ))}
            </View>
        );
    };

    const renderDimensionSelector = () => {
        if (activeTab !== 'dimension') return null;

        return (
            <View style={styles.compactSelectorRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.compactSelectorScroll}>
                    {([
                        // { type: 'category', label: '分类' }, // 已有独立Tab，此处移除
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
                subtitle={`总计：${formatCurrency(categoryData.totalAmount)} · ${categoryData.totalCount}笔`}
                emptyMessage="该时间范围内暂无支出记录"
                headerRight={renderChartTypeToggle()}
            >
                {chartType === 'pie' ? (
                    <CustomPieChart 
                        data={categoryData.items} 
                        onItemPress={handleCategoryPress}
                    />
                ) : chartType === 'bar' ? (
                    <CustomBarChart 
                        data={categoryData.items} 
                        onItemPress={handleCategoryPress}
                    />
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
                subtitle={`总计：${formatCurrency(dimensionData.totalAmount)} · ${dimensionData.totalCount}笔`}
                emptyMessage="该时间范围内暂无数据"
                headerRight={renderChartTypeToggle()}
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
        
        const isExpense = trendType === 'expense';
        const totalAmount = isExpense ? trendData.summary.totalExpense : trendData.summary.totalIncome;
        const avgAmount = isExpense ? trendData.summary.avgExpense : trendData.summary.avgIncome;

        return (
            <>
                {/* 趋势图表 */}
                <BaseChart
                    loading={isLoading}
                    error={error}
                    isEmpty={isEmpty}
                    title=""
                    subtitle=""
                    emptyMessage="该时间范围内暂无数据"
                >
                    {/* 自定义头部 */}
                    <View style={{ marginBottom: Spacing.lg, paddingHorizontal: Spacing.xs }}>
                        {/* 标题行：支出 ▼ */}
                        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md, position: 'relative' }}>
                             <Pressable 
                                onPress={() => setTrendType(isExpense ? 'income' : 'expense')}
                                style={{ flexDirection: 'row', alignItems: 'center', padding: Spacing.xs }}
                            >
                                <Text style={{ fontSize: FontSizes.lg, fontWeight: FontWeights.bold, color: Colors.text }}>
                                    {isExpense ? '支出' : '收入'}
                                </Text>
                                <Icon name="caret-down" size={14} color={Colors.text} style={{ marginLeft: 4 }} />
                            </Pressable>
                            
                            {/* 横屏按钮 */}
                            <Pressable 
                                onPress={() => setIsLandscape(true)}
                                style={{ position: 'absolute', right: 0, padding: Spacing.xs }}
                            >
                                <Icon name="expand-outline" size={20} color={Colors.textSecondary} />
                            </Pressable>
                        </View>

                        <Text style={{ fontSize: FontSizes.md, color: Colors.textSecondary, marginBottom: 4 }}>
                            总{isExpense ? '支出' : '收入'}: <Text style={{ color: Colors.text, fontWeight: FontWeights.bold }}>{formatCurrency(totalAmount)}</Text>
                        </Text>
                        <Text style={{ fontSize: FontSizes.md, color: Colors.textSecondary }}>
                            平均值: <Text style={{ color: Colors.text }}>{formatCurrency(avgAmount)}</Text>
                        </Text>
                    </View>

                    <CustomLineChart 
                        data={trendData.dataPoints} 
                        showIncome={!isExpense}
                        showExpense={isExpense}
                        onDataPointClick={(point) => setSelectedPoint(point)}
                    />
                </BaseChart>

                {/* 横屏查看 Modal */}
                <Modal
                    visible={isLandscape}
                    transparent={false}
                    animationType="fade"
                    onRequestClose={() => setIsLandscape(false)}
                >
                    <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
                        {/* 旋转容器 */}
                        <View style={{ 
                            width: Dimensions.get('window').height, 
                            height: Dimensions.get('window').width, 
                            transform: [{ rotate: '90deg' }],
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}>
                            {/* 关闭按钮 */}
                            <Pressable 
                                onPress={() => setIsLandscape(false)}
                                style={{ 
                                    position: 'absolute', 
                                    top: Spacing.lg, 
                                    right: Spacing.lg, 
                                    zIndex: 10,
                                    padding: Spacing.md,
                                    backgroundColor: 'rgba(0,0,0,0.1)',
                                    borderRadius: 20
                                }}
                            >
                                <Icon name="close" size={24} color={Colors.text} />
                            </Pressable>

                            <Text style={{ fontSize: FontSizes.xl, fontWeight: FontWeights.bold, marginBottom: Spacing.lg, color: Colors.text }}>
                                {isExpense ? '支出趋势' : '收入趋势'}
                            </Text>

                            <CustomLineChart 
                                data={trendData.dataPoints} 
                                showIncome={!isExpense}
                                showExpense={isExpense}
                                width={Dimensions.get('window').height - Spacing.lg * 4} // 减去边距
                                height={Dimensions.get('window').width - 100} // 减去标题和边距
                                fitScreen={true} // 强制适应屏幕，不滚动
                                onDataPointClick={(point) => setSelectedPoint(point)}
                            />

                            {/* 横屏下的详情弹窗 (绝对定位) */}
                            {selectedPoint && (
                                <Pressable 
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        backgroundColor: 'rgba(0,0,0,0.5)',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        zIndex: 20,
                                    }}
                                    onPress={() => setSelectedPoint(null)}
                                >
                                    {renderDetailContent()}
                                </Pressable>
                            )}
                        </View>
                    </View>
                </Modal>

                {/* 分类统计概览 (仅在趋势Tab显示) - 已移除，避免重复 */}
                {/* {categoryData && (
                    <View style={{ marginTop: Spacing.md }}>
                        {renderCategoryStatistics()}
                    </View>
                )} */}

                {/* 数据表格 */}
                {!isEmpty && (
                    <View style={styles.tableContainer}>
                        <Text style={styles.tableTitle}>详细数据</Text>
                        <View style={styles.tableHeader}>
                            <Text style={styles.tableHeaderCell}>日期</Text>
                            <Text style={styles.tableHeaderCell}>收入</Text>
                            <Text style={styles.tableHeaderCell}>支出</Text>
                            <Text style={styles.tableHeaderCell}>结余</Text>
                        </View>
                        {trendData.dataPoints.slice().reverse().map((point, index) => (
                            <View key={index} style={styles.tableRow}>
                                <Text style={styles.tableCell}>{point.date}</Text>
                                <Text style={[styles.tableCell, { color: Colors.success }]}>
                                    {point.income === 0 ? '-' : `+${point.income.toFixed(0)}`}
                                </Text>
                                <Text style={[styles.tableCell, { color: Colors.error }]}>
                                    {point.expense === 0 ? '-' : `-${point.expense.toFixed(0)}`}
                                </Text>
                                <Text style={styles.tableCell}>
                                    {point.balance === 0 ? '-' : point.balance.toFixed(0)}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}
            </>
        );
    };

    const renderDetailContent = () => (
        <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedPoint?.date}</Text>
            <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>收入</Text>
                <Text style={[styles.modalValue, { color: Colors.success }]}>
                    {selectedPoint?.income === 0 ? '-' : `+${formatCurrency(selectedPoint?.income || 0).replace('¥', '¥')}`}
                </Text>
            </View>
            <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>支出</Text>
                <Text style={[styles.modalValue, { color: Colors.error }]}>
                    {selectedPoint?.expense === 0 ? '-' : `-${formatCurrency(selectedPoint?.expense || 0).replace('¥', '¥')}`}
                </Text>
            </View>
            <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>结余</Text>
                <Text style={styles.modalValue}>
                    {formatCurrency(selectedPoint?.balance || 0)}
                </Text>
            </View>

            {/* Top 3 Transactions */}
            {loadingTransactions ? (
                <View style={{ marginTop: Spacing.lg, alignItems: 'center' }}>
                    <Text style={{ color: Colors.textSecondary }}>加载详情中...</Text>
                </View>
            ) : topTransactions.length > 0 ? (
                <View style={{ marginTop: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.divider, paddingTop: Spacing.md }}>
                    <Text style={{ fontSize: FontSizes.md, fontWeight: FontWeights.bold, marginBottom: Spacing.sm, color: Colors.text }}>
                        最大3笔支出
                    </Text>
                    {topTransactions.map(t => (
                        <View key={t.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs, alignItems: 'center' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                {/* 这里可以加图标 */}
                                <Text style={{ color: Colors.textSecondary, fontSize: FontSizes.sm }} numberOfLines={1}>
                                    {t.description || '无描述'}
                                </Text>
                            </View>
                            <Text style={{ color: Colors.text, fontWeight: FontWeights.medium, fontSize: FontSizes.sm, marginLeft: Spacing.sm }}>
                                {formatCurrency(t.amount)}
                            </Text>
                        </View>
                    ))}
                </View>
            ) : null}
        </View>
    );

    const renderCategoryDetailModal = () => {
        return (
            <Modal
                visible={!!selectedCategoryItem}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setSelectedCategoryItem(null)}
            >
                <Pressable 
                    style={styles.modalOverlay} 
                    onPress={() => setSelectedCategoryItem(null)}
                >
                    <Pressable 
                        style={styles.detailSheet}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={styles.sheetHandle} />
                        <View style={styles.sheetHeader}>
                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                {selectedCategoryItem?.icon && (
                                    <CategoryIcon icon={selectedCategoryItem.icon} size={24} color={Colors.primary} style={{marginRight: 8}} />
                                )}
                                <Text style={styles.sheetTitle}>{selectedCategoryItem?.label} 详情</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.sheetCloseButton}
                                onPress={() => setSelectedCategoryItem(null)}
                            >
                                <Text style={styles.sheetCloseButtonText}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        
                        <View style={{paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md}}>
                            <Text style={{fontSize: FontSizes.sm, color: Colors.textSecondary}}>
                                {timeRange.startTime.toLocaleDateString()} - {timeRange.endTime.toLocaleDateString()}
                            </Text>
                            <Text style={{fontSize: FontSizes.xxl, fontWeight: FontWeights.bold, marginTop: Spacing.xs}}>
                                {formatCurrency(selectedCategoryItem?.amount || 0)}
                            </Text>
                        </View>

                        <ScrollView style={styles.detailContent}>
                            {loadingCategoryTransactions ? (
                                <ActivityIndicator size="large" color={Colors.primary} style={{marginTop: 20}} />
                            ) : categoryTransactions.length === 0 ? (
                                <Text style={{textAlign: 'center', color: Colors.textSecondary, marginTop: 20}}>暂无记录</Text>
                            ) : (
                                categoryTransactions.map(t => (
                                    <View key={t.id} style={styles.detailItem}>
                                        <View style={styles.detailItemLeft}>
                                            <View style={styles.detailItemInfo}>
                                                <Text style={styles.detailItemName}>{t.description || selectedCategoryItem?.label}</Text>
                                                <Text style={styles.detailItemCount}>{new Date(t.transactionDateTime).toLocaleDateString()}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.detailItemRight}>
                                            <Text style={styles.detailItemAmount}>
                                                {formatCurrency(t.amount)}
                                            </Text>
                                        </View>
                                    </View>
                                ))
                            )}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>
        );
    };

    const renderPointDetailModal = () => {
        // 如果是横屏模式，不渲染这个 Modal，而是由横屏视图自己处理
        if (isLandscape) return null;

        return (
            <Modal
                visible={!!selectedPoint}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSelectedPoint(null)}
            >
                <Pressable 
                    style={styles.modalOverlay} 
                    onPress={() => setSelectedPoint(null)}
                >
                    {renderDetailContent()}
                </Pressable>
            </Modal>
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
                </View>
                
                {activeTab === 'category' 
                    ? renderCategoryStatistics() 
                    : activeTab === 'trend' 
                        ? renderTrendStatistics()
                        : renderDimensionStatistics()
                }
            </ScrollView>

            {showDatePicker && (
                <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                />
            )}
            
            {renderPointDetailModal()}
            {renderCategoryDetailModal()}
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerLeft: {
        flexShrink: 1,
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
        alignItems: 'center',
        gap: Spacing.xs,
    },
    chartIconButton: {
        width: 32,
        height: 32,
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
    // ===== 表格样式 =====
    tableContainer: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginTop: Spacing.md,
        ...Shadows.sm,
    },
    tableTitle: {
        fontSize: FontSizes.md,
        fontWeight: FontWeights.bold,
        color: Colors.text,
        marginBottom: Spacing.md,
    },
    tableHeader: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
        paddingBottom: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    tableHeaderCell: {
        flex: 1,
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.background,
    },
    tableCell: {
        flex: 1,
        fontSize: FontSizes.sm,
        color: Colors.text,
        textAlign: 'center',
    },
    // ===== 模态框样式 =====
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        ...Shadows.md,
    },
    modalTitle: {
        fontSize: FontSizes.xl,
        fontWeight: FontWeights.bold,
        color: Colors.text,
        marginBottom: Spacing.lg,
        textAlign: 'center',
    },
    modalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    modalLabel: {
        fontSize: FontSizes.md,
        color: Colors.textSecondary,
    },
    modalValue: {
        fontSize: FontSizes.lg,
        fontWeight: FontWeights.bold,
        color: Colors.text,
    },
    // ===== 详情弹窗样式 =====
    detailSheet: {
        width: '100%',
        height: '70%',
        backgroundColor: Colors.surface,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        marginTop: 'auto',
        ...Shadows.lg,
    },
    sheetHandle: {
        width: 40,
        height: 4,
        backgroundColor: Colors.border,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: Spacing.sm,
        marginBottom: Spacing.xs,
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
    },
    sheetTitle: {
        fontSize: FontSizes.lg,
        fontWeight: FontWeights.bold,
        color: Colors.text,
    },
    sheetCloseButton: {
        padding: Spacing.xs,
    },
    sheetCloseButtonText: {
        fontSize: FontSizes.lg,
        color: Colors.textSecondary,
    },
    detailContent: {
        flex: 1,
        padding: Spacing.lg,
    },
    detailItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.background,
    },
    detailItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    detailItemInfo: {
        marginLeft: Spacing.sm,
        flex: 1,
    },
    detailItemName: {
        fontSize: FontSizes.md,
        color: Colors.text,
        fontWeight: FontWeights.medium,
    },
    detailItemCount: {
        fontSize: FontSizes.xs,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    detailItemRight: {
        alignItems: 'flex-end',
    },
    detailItemAmount: {
        fontSize: FontSizes.md,
        fontWeight: FontWeights.bold,
        color: Colors.text,
    },
});
