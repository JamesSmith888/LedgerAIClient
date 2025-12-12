/**
 * 记账列表页
 * 展示所有记账记录，支持按类型筛选
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    SectionList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    PanResponder,
    Animated,
} from 'react-native';
import { toast } from '../utils/toast';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Card } from '../components/common';
import {
    BorderRadius,
    Colors,
    FontSizes,
    FontWeights,
    Shadows,
    Spacing,
} from '../constants/theme';
import { TransactionIcons } from '../constants/icons';
import type { Category, Transaction } from '../types/transaction';
import { transactionAPI } from '../api/services';
import { useCategories } from '../context/CategoryContext';
import { useAuth } from '../context/AuthContext';
import { useTemplate } from '../context/TemplateContext';
import { QuickTransactionPanel } from '../components/QuickTransactionPanel';
// ========== ✨ 新增导入 ==========
import { LedgerSelector } from '../components/common';
import { LedgerMembers } from '../components/ledger/LedgerMembers';
import { useLedger } from '../context/LedgerContext';
import { Ledger, LedgerType } from '../types/ledger';
import { TransactionMoveSheet } from '../components/transaction/TransactionMoveSheet';
import { Icon } from '../components/common';
import { CategoryIcon } from '../components/common/CategoryIcon';
import { MonthPickerSheet } from '../components/transaction/MonthPickerSheet';
import { DailyStatisticsCalendar } from '../components/transaction/DailyStatisticsCalendar';
import { CollapsibleSearchBar } from '../components/transaction/SearchBar';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { usePaymentMethod } from '../context/PaymentMethodContext';
import { PaymentIcon } from '../components/payment/PaymentIcon';

type FilterType = 'ALL' | 'EXPENSE' | 'INCOME';

type SortField = 'transactionDateTime' | 'amount' | 'createTime';
type SortDirection = 'ASC' | 'DESC';

interface SortOption {
    field: SortField;
    direction: SortDirection;
    label: string;
    icon: string;
}

// 排序选项配置
const SORT_OPTIONS: SortOption[] = [
    { field: 'transactionDateTime', direction: 'DESC', label: '时间降序', icon: 'time' },
    { field: 'transactionDateTime', direction: 'ASC', label: '时间升序', icon: 'time' },
    { field: 'amount', direction: 'DESC', label: '金额降序', icon: 'cash' },
    { field: 'amount', direction: 'ASC', label: '金额升序', icon: 'cash' },
];

// 分组类型定义
type GroupByType = 'none' | 'day' | 'category' | 'amount' | 'creator' | 'paymentMethod';

interface GroupByOption {
    type: GroupByType;
    label: string;
    icon: string;
    description: string;
}

// 分组选项配置
const GROUP_BY_OPTIONS: GroupByOption[] = [
    { type: 'none', label: '不分组', icon: 'list', description: '平铺显示所有记录' },
    { type: 'day', label: '按天', icon: 'calendar-outline', description: '按日期分组显示' },
    { type: 'category', label: '按分类', icon: 'pricetag', description: '按消费分类分组显示' },
    { type: 'paymentMethod', label: '按账户', icon: 'card', description: '按收付账户分组显示' },
    { type: 'amount', label: '按金额', icon: 'cash', description: '按金额区间分组显示' },
    { type: 'creator', label: '按创建人', icon: 'person', description: '按记录创建人分组' },
];

// 金额区间定义
interface AmountRange {
    min: number;
    max: number;
    label: string;
    icon: string;
}

const AMOUNT_RANGES: AmountRange[] = [
    { min: 0, max: 50, label: '小额消费', icon: 'cash-outline' },
    { min: 50, max: 200, label: '中等消费', icon: 'cash' },
    { min: 200, max: 1000, label: '大额消费', icon: 'diamond-outline' },
    { min: 1000, max: Infinity, label: '特大消费', icon: 'trophy' },
];

// 分组数据结构
interface TransactionGroup {
    key: string;
    title: string;
    icon: string;
    data: Transaction[]; // Rename transactions to data for SectionList compatibility
    transactions: Transaction[]; // Keep for backward compatibility if needed, or just use data
    totalAmount: number;
    count: number;
    totalExpense: number;  // 分组内支出总和
    totalIncome: number;   // 分组内收入总和
}

// 获取账本图标
const getLedgerIcon = (type: LedgerType): string => {
    switch (type) {
        case LedgerType.PERSONAL:
            return 'book-outline';
        case LedgerType.SHARED:
            return 'people';
        case LedgerType.BUSINESS:
            return 'business';
        default:
            return 'book-outline';
    }
};

export const TransactionListScreen: React.FC = () => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    const { categories, refreshCategories } = useCategories();
    const { user } = useAuth();
    const currentUserId = user?._id ? Number(user._id) : null;
    const { quickPanelTemplates } = useTemplate();
    const { paymentMethods } = usePaymentMethod();

    // ========== ✨ 新增：账本相关状态 ==========
    const { ledgers, currentLedger, defaultLedgerId, setCurrentLedger } = useLedger();

    // 筛选账本
    const [filterLedger, setFilterLedger] = useState<Ledger | null>(null);
    // 记录上一次的默认账本 ID（用于检测默认账本是否变化）
    const [prevDefaultLedgerId, setPrevDefaultLedgerId] = useState<number | null>(null);

    // 管理默认账本的自动选中逻辑
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

    // 监听 currentLedger 变化，实现与图表页面的实时同步
    useEffect(() => {
        // 如果 currentLedger 变化了，且与当前 filterLedger 不同，则同步更新
        if (currentLedger && filterLedger?.id !== currentLedger.id) {
            setFilterLedger(currentLedger);
        }
    }, [currentLedger]);

    // ========== 状态管理 ==========
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [filterType, setFilterType] = useState<FilterType>('ALL');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
    const [moveSheetVisible, setMoveSheetVisible] = useState<boolean>(false);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [movingLedgerId, setMovingLedgerId] = useState<number | null>(null);

    // 当前选中的月份（默认当前月）
    const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
    // ✨ 新增：当前选中的日期（用于按天筛选）
    const [selectedDay, setSelectedDay] = useState<Date | null>(null);

    // ========== ✨ 新增：月度汇总统计状态 ==========
    const [monthlySummary, setMonthlySummary] = useState({
        totalIncome: 0,
        totalExpense: 0,
        balance: 0,
        totalCount: 0,
    });

    // 排序相关状态
    const [sortField, setSortField] = useState<SortField>('transactionDateTime');
    const [sortDirection, setSortDirection] = useState<SortDirection>('DESC');
    const [sortSheetVisible, setSortSheetVisible] = useState<boolean>(false);

    // 分组相关状态 - ✨ 默认按天分组
    const [groupBy, setGroupBy] = useState<GroupByType>('day');
    const [groupSheetVisible, setGroupSheetVisible] = useState<boolean>(false);

    // 分页相关状态
    const [currentPage, setCurrentPage] = useState<number>(0);
    const [hasMore, setHasMore] = useState<boolean>(true);
    const [totalElements, setTotalElements] = useState<number>(0);

    // ========== ✨ 新增：月份选择器和日历热力图状态 ==========
    const [monthPickerVisible, setMonthPickerVisible] = useState<boolean>(false);
    const [calendarVisible, setCalendarVisible] = useState<boolean>(false); // 默认收起
    const [monthlyStatistics, setMonthlyStatistics] = useState<Array<{ date: string; income: number; expense: number; count: number }>>([]);

    // ========== ✨ 搜索相关状态 ==========
    const [searchExpanded, setSearchExpanded] = useState<boolean>(false);
    const [searchKeyword, setSearchKeyword] = useState<string>('');
    const [isSearching, setIsSearching] = useState<boolean>(false);

    // ========== 删除相关状态 ==========
    const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false);
    const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
    // 记录当前打开的 Swipeable引用，用于自动关闭
    const swipeableRefs = useMemo(() => new Map<number, Swipeable>(), []);

    // 处理删除点击
    const handleDeletePress = (transaction: Transaction) => {
        setDeletingTransaction(transaction);
        setDeleteModalVisible(true);
        
        // 关闭侧滑
        const ref = swipeableRefs.get(transaction.id);
        if (ref) {
            ref.close();
        }
    };

    // 确认删除
    const confirmDelete = async () => {
        if (!deletingTransaction) return;
        
        try {
            await transactionAPI.delete(deletingTransaction.id);
            toast.success('删除成功');
            setDeleteModalVisible(false);
            setDeletingTransaction(null);
            // 刷新列表
            loadTransactions();
        } catch (error) {
            console.error('删除交易失败:', error);
            toast.error('删除失败，请稍后重试');
        }
    };

    // ========== 数据加载 ==========
    useFocusEffect(
        useCallback(() => {
            // ✨ 页面聚焦时并行加载所有数据（互不等待）
            loadTransactions();
            // 仅在非搜索模式下加载统计数据
            if (!searchKeyword) {
                loadMonthlyStatistics();
                loadMonthlySummary();
            }
        }, [filterType, filterLedger, selectedMonth, selectedDay, sortField, sortDirection, searchKeyword]) // 当筛选条件、月份、日期、排序或搜索关键词变化时重新加载
    );

    // 根据categoryId查找category对象
    const getCategoryById = (categoryId: string | number): Category | undefined => {
        return categories.find(c => String(c.id) === String(categoryId));
    }

    // 根据ledgerId查找ledger对象
    const getLedgerById = (ledgerId: number): Ledger | undefined => {
        return ledgers.find(l => l.id === ledgerId);
    }

    // 根据paymentMethodId查找paymentMethod对象
    const getPaymentMethodById = (paymentMethodId: number | undefined) => {
        if (!paymentMethodId) return undefined;
        return paymentMethods.find(p => p.id === paymentMethodId);
    }


    // 加载交易记录
    const loadTransactions = async (isLoadMore: boolean = false) => {
        try {
            if (!isLoadMore) {
                setIsLoading(true);
            }
            
            // 搜索模式下显示搜索指示器
            if (searchKeyword && !isLoadMore) {
                setIsSearching(true);
            }

            const page = isLoadMore ? currentPage + 1 : 0;

            // 将前端枚举转换为后端数字代码
            // INCOME -> 1, EXPENSE -> 2
            let typeCode: number | null = null;
            if (filterType === 'INCOME') {
                typeCode = 1;
            } else if (filterType === 'EXPENSE') {
                typeCode = 2;
            }

            // 计算当月的开始和结束时间（搜索模式下不限制时间范围，搜索全部数据）
            let startTime: Date | null = null;
            let endTime: Date | null = null;
            
            if (!searchKeyword) {
                if (selectedDay) {
                    // ✨ 按天筛选
                    startTime = new Date(selectedDay);
                    startTime.setHours(0, 0, 0, 0);
                    
                    endTime = new Date(selectedDay);
                    endTime.setHours(23, 59, 59, 999);
                } else {
                    // 非搜索模式且未选具体日期：按月份筛选
                    startTime = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
                    endTime = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59, 999);
                }
            }

            const response = await transactionAPI.query({
                ledgerId: filterLedger?.id || null,
                type: typeCode,
                startTime: startTime?.toISOString() || null,
                endTime: endTime?.toISOString() || null,
                page,
                size: searchKeyword ? 20 : (selectedDay ? 100 : 10), // 按天查看时加载更多，避免分页
                sortBy: sortField,
                sortDirection: sortDirection,
                keyword: searchKeyword || null,
            });

            console.log('获取到的交易记录:', response);

            if (isLoadMore) {
                setTransactions(prev => [...prev, ...response.content]);
            } else {
                setTransactions(response.content);
            }

            setCurrentPage(response.page);
            setHasMore(response.hasNext);
            setTotalElements(response.totalElements);
        } catch (error) {
            console.error('加载交易记录失败:', error);
            toast.error('加载数据失败，请稍后重试');
        } finally {
            setIsLoading(false);
            setIsSearching(false);
        }
    };

    // 加载月度统计数据（用于热力图）
    const loadMonthlyStatistics = async () => {
        try {
            // 计算当月的开始和结束时间
            const startTime = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
            const endTime = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59, 999);

            const stats = await transactionAPI.getDailyStatistics(
                filterLedger?.id || null,
                startTime.toISOString(),
                endTime.toISOString()
            );

            setMonthlyStatistics(stats);
        } catch (error) {
            console.error('加载月度统计失败:', error);
        }
    };

    // ========== ✨ 新增：加载月度汇总统计（用于顶部汇总区域） ==========
    const loadMonthlySummary = async () => {
        try {
            // 计算当月的开始和结束时间
            const startTime = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
            const endTime = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59, 999);

            const summary = await transactionAPI.getMonthlySummary(
                filterLedger?.id || null,
                startTime.toISOString(),
                endTime.toISOString()
            );

            setMonthlySummary(summary);
        } catch (error) {
            console.error('加载月度汇总失败:', error);
            // 出错时设置默认值
            setMonthlySummary({
                totalIncome: 0,
                totalExpense: 0,
                balance: 0,
                totalCount: 0,
            });
        }
    };

    // 下拉刷新
    const onRefresh = async () => {
        setIsRefreshing(true);
        setCurrentPage(0);
        // ✨ 并行加载所有数据（互不等待）
        await Promise.all([
            loadTransactions(false),
            refreshCategories(),  // 刷新分类数据
            loadMonthlyStatistics(),  // 刷新月度统计（热力图）
            loadMonthlySummary(),  // 刷新月度汇总（顶部统计）
        ])
        setIsRefreshing(false);
    };

    // 上拉加载更多
    const handleLoadMore = useCallback(() => {
        if (!isLoading && hasMore && transactions.length > 0) {
            loadTransactions(true);
        }
    }, [isLoading, hasMore, transactions.length]);

    // 渲染列表底部（加载指示器）
    const renderFooter = useCallback(() => {
        if (!hasMore) {
            return transactions.length > 0 ? (
                <View style={styles.footerContainer}>
                    <Icon name="checkmark-circle" size={16} color={Colors.success} />
                    <Text style={styles.footerText}>没有更多数据了</Text>
                </View>
            ) : null;
        }

        if (isLoading && transactions.length > 0) {
            return (
                <View style={styles.footerContainer}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text style={[styles.footerText, styles.footerLoadingText]}>正在加载更多...</Text>
                </View>
            );
        }

        return null;
    }, [hasMore, isLoading, transactions.length]);

    // ========== 数据处理 ==========
    // 显示的交易列表（由于后端已经做了筛选，这里直接使用）
    const filteredTransactions = transactions;

    // ========== ✨ 修改：使用独立的月度汇总数据，而非基于分页数据计算 ==========
    // 统计数据直接来自 monthlySummary 状态，由专门的接口获取
    const statistics = useMemo(() => {
        return {
            totalExpense: monthlySummary.totalExpense,
            totalIncome: monthlySummary.totalIncome,
        };
    }, [monthlySummary]);

    // ========== 格式化函数 ==========
    // 使用 useCallback 缓存格式化函数，避免子组件不必要的重新渲染
    // 格式化月份标题（例如：2024年11月）
    const formatMonthTitle = useCallback((date: Date): string => {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        return `${year}年${month}月`;
    }, []);

    // 格式化日期
    const formatDate = useCallback((dateString: string): string => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const isToday = date.toDateString() === today.toDateString();
        const isYesterday = date.toDateString() === yesterday.toDateString();

        if (isToday) return '今天';
        if (isYesterday) return '昨天';

        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${month}月${day}日`;
    }, []);

    // 格式化时间
    const formatTime = useCallback((dateString: string): string => {
        const date = new Date(dateString);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }, []);

    // ========== 月份切换 ==========
    const goToPreviousMonth = () => {
        setSelectedMonth(prevMonth => {
            const newMonth = new Date(prevMonth);
            newMonth.setMonth(newMonth.getMonth() - 1);
            return newMonth;
        });
    };

    const goToNextMonth = () => {
        setSelectedMonth(prevMonth => {
            const newMonth = new Date(prevMonth);
            newMonth.setMonth(newMonth.getMonth() + 1);
            return newMonth;
        });
    };

    // 判断是否是当前月
    const isCurrentMonth = () => {
        const now = new Date();
        return selectedMonth.getFullYear() === now.getFullYear() &&
               selectedMonth.getMonth() === now.getMonth();
    };

    // ========== ✨ 新增：月份选择器处理 ==========
    const handleMonthSelect = (date: Date) => {
        setSelectedMonth(date);
    };

    const handleToggleCalendar = () => {
        setCalendarVisible(!calendarVisible);
    };

    // ========== 月份选择器手势识别 ==========
    const monthPanResponder = useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => false,
                onMoveShouldSetPanResponder: (_, gestureState) => {
                    // 只有当水平滑动距离大于垂直滑动距离时才响应
                    return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
                },
                onPanResponderRelease: (_, gestureState) => {
                    // 判断滑动方向和距离
                    const swipeThreshold = 50; // 最小滑动距离
                    if (Math.abs(gestureState.dx) > swipeThreshold) {
                        if (gestureState.dx > 0) {
                            // 向右滑动 -> 上个月
                            goToPreviousMonth();
                        } else if (gestureState.dx < 0 && !isCurrentMonth()) {
                            // 向左滑动 -> 下个月（但不能超过当前月）
                            goToNextMonth();
                        }
                    }
                },
            }),
        [selectedMonth]
    );

    // ========== 排序处理 ==========
    const handleSortChange = (option: SortOption) => {
        setSortField(option.field);
        setSortDirection(option.direction);
        setSortSheetVisible(false);
    };

    // 获取当前排序选项
    const getCurrentSortOption = (): SortOption => {
        return SORT_OPTIONS.find(
            opt => opt.field === sortField && opt.direction === sortDirection
        ) || SORT_OPTIONS[0];
    };

    // ========== ✨ 搜索处理 ==========
    const handleSearch = useCallback((keyword: string) => {
        setSearchKeyword(keyword);
        // 搜索时重置分页
        setCurrentPage(0);
    }, []);

    const handleToggleSearch = useCallback(() => {
        setSearchExpanded(prev => {
            if (prev) {
                // 收起搜索时，清空关键词并重新加载
                setSearchKeyword('');
                setCurrentPage(0);
            }
            return !prev;
        });
    }, []);

    // ========== 分组处理 ==========
    const handleGroupByChange = (option: GroupByOption) => {
        setGroupBy(option.type);
        setGroupSheetVisible(false);
    };

    // 获取当前分组选项
    const getCurrentGroupByOption = (): GroupByOption => {
        return GROUP_BY_OPTIONS.find(opt => opt.type === groupBy) || GROUP_BY_OPTIONS[0];
    };

    // 分组数据处理 - 使用 useCallback 优化性能
    const groupTransactions = useCallback((transactions: Transaction[]): TransactionGroup[] => {
        if (groupBy === 'none') {
            return [];
        }

        const groupMap = new Map<string, TransactionGroup>();

        transactions.forEach(transaction => {
            let groupKey: string;
            let groupTitle: string;
            let groupIcon: string;

            switch (groupBy) {
                case 'day': {
                    // ✨ 按天分组 - 按日期降序显示
                    const date = new Date(transaction.transactionDateTime);
                    const year = date.getFullYear();
                    const month = date.getMonth() + 1;
                    const day = date.getDate();
                    
                    // 生成分组key（用于排序）
                    groupKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    
                    // 格式化显示标题
                    const today = new Date();
                    const tomorrow = new Date(today);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    
                    if (date.toDateString() === today.toDateString()) {
                        groupTitle = '今天';
                    } else if (date.toDateString() === yesterday.toDateString()) {
                        groupTitle = '昨天';
                    } else if (date.toDateString() === tomorrow.toDateString()) {
                        groupTitle = '明天';
                    } else {
                        groupTitle = `${month}月${day}日`;
                    }
                    
                    groupIcon = 'calendar-outline';
                    break;
                }
                case 'category': {
                    // 按分类分组
                    const category = getCategoryById(transaction.categoryId);
                    if (!category) return;
                    groupKey = String(transaction.categoryId);
                    groupTitle = category.name;
                    groupIcon = category.icon;
                    break;
                }
                case 'paymentMethod': {
                    // 按收付账户分组
                    const paymentMethod = getPaymentMethodById(transaction.paymentMethodId);
                    if (paymentMethod) {
                        groupKey = String(paymentMethod.id);
                        groupTitle = paymentMethod.name;
                        groupIcon = paymentMethod.icon || 'card';
                    } else {
                        groupKey = 'unknown';
                        groupTitle = '未指定账户';
                        groupIcon = 'card-outline';
                    }
                    break;
                }
                case 'amount': {
                    // 按金额区间分组
                    const range = AMOUNT_RANGES.find(
                        r => transaction.amount >= r.min && transaction.amount < r.max
                    ) || AMOUNT_RANGES[AMOUNT_RANGES.length - 1];
                    groupKey = `${range.min}-${range.max}`;
                    groupTitle = range.label;
                    groupIcon = range.icon;
                    break;
                }
                case 'creator': {
                    // 按创建人分组
                    const userId = transaction.createdByUserId || 0;
                    groupKey = String(userId);
                    groupTitle = userId === 0 ? '未知用户' : `用户 ${userId}`;
                    groupIcon = 'person';
                    break;
                }
                default:
                    return;
            }

            if (!groupMap.has(groupKey)) {
                groupMap.set(groupKey, {
                    key: groupKey,
                    title: groupTitle,
                    icon: groupIcon,
                    data: [], // Initialize data
                    transactions: [],
                    totalAmount: 0,
                    count: 0,
                    totalExpense: 0,
                    totalIncome: 0,
                });
            }

            const group = groupMap.get(groupKey)!;
            group.transactions.push(transaction);
            group.data.push(transaction); // Push to data as well
            group.totalAmount += transaction.amount;
            group.count += 1;
            
            // 分别统计支出和收入
            if (transaction.type === 'EXPENSE') {
                group.totalExpense += transaction.amount;
            } else {
                group.totalIncome += transaction.amount;
            }
        });

        // 转换为数组并排序
        // 按天分组时按日期降序，其他分组按总金额降序
        return Array.from(groupMap.values()).sort((a, b) => {
            if (groupBy === 'day') {
                // 按天分组：按key（日期）降序排序，最近的在前
                return b.key.localeCompare(a.key);
            }
            // 其他分组：按总金额降序
            return b.totalAmount - a.totalAmount;
        });
    }, [groupBy, getCategoryById, getPaymentMethodById]);

    // 获取分组后的数据 - 使用 useMemo 优化
    const groupedTransactions = useMemo(() => {
        return groupTransactions(transactions);
    }, [transactions, groupTransactions]);

    // ========== ✨ 热力图数据（使用完整的月度统计，而非分页数据） ==========
    // 直接使用从后端获取的完整月度统计数据，不受分页影响
    const dailyStatistics = monthlyStatistics;

    // ========== 长按处理 ==========
    const handleLongPress = (item: Transaction) => {
        if (ledgers.length <= 1) {
            toast.info('仅有一个账本，无需切换');
            return;
        }
        setSelectedTransaction(item);
        setMoveSheetVisible(true);
    }

    /**
     * 移动交易到其他账本
     */
    const handleMoveTransaction = async (
        transaction: Transaction,
        targetLedger: Ledger
    ) => {
        try {
            setMovingLedgerId(targetLedger.id);
            await transactionAPI.moveToLedger(transaction.id, targetLedger.id);
            toast.success(`已移动到「${targetLedger.name}」`);
            setMoveSheetVisible(false);
            setSelectedTransaction(null);
            await loadTransactions();
        } catch (error) {
            console.error('移动交易失败:', error);
            toast.error('移动交易失败，请稍后重试');
        } finally {
            setMovingLedgerId(null);
        }
    };

    const handleCloseMoveSheet = () => {
        setMoveSheetVisible(false);
        setSelectedTransaction(null);
    };

    const orderedLedgers = useMemo(() => {
        const preferredIds = new Set<number>();
        if (filterLedger) {
            preferredIds.add(filterLedger.id);
        } else if (currentLedger) {
            preferredIds.add(currentLedger.id);
        }

        return ledgers.slice().sort((a, b) => {
            const aPriority = preferredIds.has(a.id) ? 0 : 1;
            const bPriority = preferredIds.has(b.id) ? 0 : 1;
            if (aPriority !== bPriority) {
                return aPriority - bPriority;
            }
            return a.name.localeCompare(b.name, 'zh-Hans');
        });
    }, [ledgers, filterLedger, currentLedger]);

    // ========== 渲染列表项 ==========
    const renderGroupHeader = (group: TransactionGroup) => {
        // 根据分组类型渲染不同的图标
        const renderGroupIcon = () => {
            if (groupBy === 'category') {
                return <CategoryIcon icon={group.icon} size={16} color={Colors.textSecondary} />;
            }
            if (groupBy === 'paymentMethod') {
                // 获取支付方式信息以显示正确的图标
                const paymentMethod = paymentMethods.find(p => String(p.id) === group.key);
                if (paymentMethod) {
                    return <PaymentIcon type={paymentMethod.type} iconName={paymentMethod.icon} size={16} />;
                }
                return <Icon name="card-outline" size={16} color={Colors.textSecondary} />;
            }
            return <Icon name={group.icon as any} size={16} color={Colors.textSecondary} />;
        };

        return (
            <View style={styles.groupHeader}>
                <View style={styles.groupHeaderLeft}>
                    {renderGroupIcon()}
                    <Text style={styles.groupHeaderTitle}>{group.title}</Text>
                    <Text style={styles.groupHeaderCount}>({group.count}笔)</Text>
                </View>
                <View style={styles.groupHeaderRight}>
                    {/* 支出 */}
                    {group.totalExpense > 0 && (
                        <View style={styles.groupStatItem}>
                            <Text style={styles.groupStatLabel}>支</Text>
                            <Text style={styles.groupStatValue}>
                                {group.totalExpense.toFixed(2)}
                            </Text>
                        </View>
                    )}
                    
                    {/* 收入 */}
                    {group.totalIncome > 0 && (
                        <View style={styles.groupStatItem}>
                            <Text style={styles.groupStatLabel}>收</Text>
                            <Text style={styles.groupStatValue}>
                                {group.totalIncome.toFixed(2)}
                            </Text>
                        </View>
                    )}

                    {group.totalExpense === 0 && group.totalIncome === 0 && (
                        <Text style={styles.groupHeaderEmpty}>-</Text>
                    )}
                </View>
            </View>
        );
    };

    // 渲染侧滑删除按钮
    const renderRightActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>, item: Transaction) => {
        const trans = dragX.interpolate({
            inputRange: [-80, 0],
            outputRange: [0, 80],
            extrapolate: 'clamp',
        });
        
        return (
            <View style={styles.rightActionContainer}>
                <Animated.View
                    style={[
                        styles.rightAction,
                        {
                            transform: [{ translateX: trans }],
                        },
                    ]}
                >
                    <View style={styles.deleteButton}>
                        <Icon name="trash-outline" size={24} color="#fff" />
                        <Text style={styles.deleteButtonText}>删除</Text>
                    </View>
                </Animated.View>
            </View>
        );
    };

    const renderTransactionItem = ({ item }: { item: Transaction }) => {
        // 根据 categoryId 获取完整的 category 对象
        const category = getCategoryById(item.categoryId);
        // 如果找不到对应的分类，则使用默认值
        if (!category) {
            console.error(`未找到分类 ID 为 ${item.categoryId} 的分类`);
            return null; // 或者返回一个占位符
        }

        // 获取账本信息
        const ledger = item.ledgerId ? getLedgerById(item.ledgerId) : undefined;
        // 是否显示账本标签（仅在查看全部账本且有多个账本时显示）
        const shouldShowLedger = !filterLedger && ledgers.length > 1;

        // ========== ✨ 新增：判断是否显示创建人（共享账本才显示）==========
        const shouldShowCreator = ledger?.type === 2; // LedgerType.SHARED = 2
        // 优先显示昵称，其次用户名，最后显示用户ID
        const creatorName = item.createdByUserNickname || item.createdByUserName || `用户${item.createdByUserId || '未知'}`;

        return (
            <Swipeable
                ref={(ref) => {
                    if (ref) {
                        swipeableRefs.set(item.id, ref);
                    } else {
                        swipeableRefs.delete(item.id);
                    }
                }}
                renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}
                overshootRight={false}
                onSwipeableWillOpen={() => handleDeletePress(item)}
            >
                <Pressable
                    onPress={() => handleItemPress(item)}
                    onLongPress={() => handleLongPress(item)}
                    delayLongPress={250}
                    style={({ pressed }) => [
                        styles.transactionCardWrapper,
                        pressed && styles.transactionCardPressed
                    ]}
                >
                    <Card variant="flat" style={styles.transactionCard}>
                        <View style={styles.transactionRow}>
                            {/* 左侧：图标和信息 */}
                            <View style={styles.leftSection}>
                                <View
                                    style={[
                                        styles.iconContainer,
                                        { backgroundColor: category.color + '20' },
                                    ]}
                                >
                                    <CategoryIcon icon={category.icon} size={24} color={category.color} />
                                </View>
                                <View style={styles.infoContainer}>
                                    {/* 第一行：主标题（固定高度） */}
                                    <View style={styles.titleRow}>
                                        <Text style={styles.categoryName} numberOfLines={1}>
                                            {item.description || category.name}
                                        </Text>
                                        {/* AI 来源标识 - 在标题旁边显示小图标 */}
                                        {item.source === 'AI' && (
                                            <View style={styles.aiTitleBadge}>
                                                <Icon name="sparkles" size={12} color={Colors.primary} />
                                            </View>
                                        )}
                                    </View>
                                    
                                    {/* 第二行：元信息（固定高度，绝对定位的元素） */}
                                    <View style={styles.metaRowContainer}>
                                        {/* 左侧：分类和时间（总是显示） */}
                                        <View style={styles.metaRowLeft}>
                                            {item.description && (
                                                <>
                                                    <Text style={styles.metaText}>{category.name}</Text>
                                                    <Text style={styles.metaDivider}> · </Text>
                                                </>
                                            )}
                                            <Text style={styles.metaText}>{formatDate(item.transactionDateTime)}</Text>
                                            {shouldShowCreator && (
                                                <>
                                                    <Text style={styles.metaDivider}> · </Text>
                                                    <Text style={styles.creatorText}>{creatorName}</Text>
                                                </>
                                            )}
                                        </View>
                                        
                                        {/* 右侧：账本标签（绝对定位，不影响左侧内容） */}
                                        {shouldShowLedger && (
                                            <View style={styles.metaRowRight}>
                                                {ledger ? (
                                                    <View style={styles.ledgerBadge}>
                                                        <Icon 
                                                            name={getLedgerIcon(ledger.type) as any} 
                                                            size={9} 
                                                            color={Colors.primary}
                                                            style={styles.ledgerBadgeIcon}
                                                        />
                                                        <Text style={styles.ledgerBadgeText} numberOfLines={1}>
                                                            {ledger.name}
                                                        </Text>
                                                    </View>
                                                ) : (
                                                    <View style={styles.unassignedBadge}>
                                                        <Text style={styles.unassignedBadgeText}>
                                                            默认账本
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>

                            {/* 右侧：金额 */}
                            <View style={styles.rightSection}>
                                <Text
                                    style={[
                                        styles.amount,
                                        item.type === 'EXPENSE'
                                            ? styles.amountExpense
                                            : styles.amountIncome,
                                    ]}
                                >
                                    {item.type === 'EXPENSE' ? '-' : '+'}¥{item.amount.toFixed(2)}
                                </Text>
                            </View>
                        </View>
                    </Card>
                </Pressable>
            </Swipeable>
        );
    };

    // ========== 点击处理 ==========
    const handleItemPress = (item: Transaction) => {
        const parent = navigation.getParent();
        if (parent) {
            parent.navigate('AddTransaction', { transaction: item });
        }
    };

    // 跳转到新增记账页
    const navigateToAddTransaction = () => {
        console.log('🔍 调试导航信息:');
        console.log('当前导航器:', navigation);
        console.log('父级导航器:', navigation.getParent());
        console.log('尝试跳转到 AddTransaction...');
        console.log('当前选中的账本:', filterLedger);

        const parent = navigation.getParent();
        if (parent) {
            console.log('✅ 找到父级导航器，开始跳转');
            // 传递当前选中的账本给新增交易页
            parent.navigate('AddTransaction', { selectedLedger: filterLedger });
        } else {
            console.error('❌ 未找到父级导航器');
            // 备用方案：直接使用 navigation
            console.log('🔄 使用备用导航方案...');
            try {
                (navigation as any).navigate('AddTransaction', { selectedLedger: filterLedger });
            } catch (error) {
                console.error('备用方案也失败:', error);
            }
        }
    };

    // ========== 空状态 ==========
    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Icon name="document-text-outline" size={64} color={Colors.textLight} />
            <Text style={styles.emptyText}>暂无记账记录</Text>
            <Text style={styles.emptyHint}>点击下方按钮开始记账吧</Text>
        </View>
    );

    // ========== 渲染列表头部 ==========
    const renderHeader = () => (
        <>
            {/* 统计卡片 - 根据筛选条件自适应显示 */}
            <Card style={styles.statsCard} {...monthPanResponder.panHandlers}>
                {/* 左右切换箭头 - 绝对定位垂直居中 */}
                <TouchableOpacity
                    style={styles.navArrowLeft}
                    onPress={goToPreviousMonth}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Icon name="chevron-back" size={24} color={Colors.textLight} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.navArrowRight}
                    onPress={goToNextMonth}
                    disabled={isCurrentMonth()}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Icon 
                        name="chevron-forward" 
                        size={24} 
                        color={isCurrentMonth() ? Colors.border : Colors.textLight} 
                    />
                </TouchableOpacity>

                {/* 月份标题 */}
                <View style={styles.monthHeader}>
                    <TouchableOpacity
                        style={styles.monthTitleContainer}
                        onPress={() => setMonthPickerVisible(true)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.monthTitle}>{formatMonthTitle(selectedMonth)}</Text>
                        <Icon name="chevron-down" size={16} color={Colors.textSecondary} />
                        {isCurrentMonth() && (
                            <View style={styles.currentMonthBadge}>
                                <Text style={styles.currentMonthBadgeText}>本月</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* 统计数据 */}
                {filterType === 'ALL' ? (
                    // 全部：显示支出、收入和结余
                    <>
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>总支出</Text>
                                <Text style={[styles.statValue, styles.statValueExpense]}>
                                    ¥{statistics.totalExpense.toFixed(2)}
                                </Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>总收入</Text>
                                <Text style={[styles.statValue, styles.statValueIncome]}>
                                    ¥{statistics.totalIncome.toFixed(2)}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.balanceRow}>
                            <Text style={styles.balanceLabel}>结余</Text>
                            <Text style={styles.balanceValue}>
                                ¥{(statistics.totalIncome - statistics.totalExpense).toFixed(2)}
                            </Text>
                        </View>
                    </>
                ) : filterType === 'EXPENSE' ? (
                    // 支出：只显示总支出（大号居中）
                    <View style={styles.singleStatContainer}>
                        <Text style={styles.singleStatLabel}>总支出</Text>
                        <Text style={[styles.singleStatValue, styles.statValueExpense]}>
                            ¥{statistics.totalExpense.toFixed(2)}
                        </Text>
                    </View>
                ) : (
                    // 收入：只显示总收入（大号居中）
                    <View style={styles.singleStatContainer}>
                        <Text style={styles.singleStatLabel}>总收入</Text>
                        <Text style={[styles.singleStatValue, styles.statValueIncome]}>
                            ¥{statistics.totalIncome.toFixed(2)}
                        </Text>
                    </View>
                )}

                {/* 日历显示/隐藏切换按钮 */}
                <TouchableOpacity
                    style={styles.calendarToggle}
                    onPress={handleToggleCalendar}
                    activeOpacity={0.7}
                >
                    <Icon
                        name={calendarVisible ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={Colors.primary}
                    />
                    <Text style={styles.calendarToggleText}>
                        {calendarVisible ? '收起热力图' : '展开热力图'}
                    </Text>
                </TouchableOpacity>

                {/* ========== ✨ 新增：日历热力图 ========== */}
                <DailyStatisticsCalendar
                    selectedMonth={selectedMonth}
                    statistics={dailyStatistics}
                    visible={calendarVisible}
                    selectedDay={selectedDay}
                    showDetailModal={false} // Disable modal, use list filtering instead
                    onDayPress={(date) => {
                        // 点击某一天，切换到该天视图
                        console.log('点击日期:', date);
                        // 如果点击的是已选中的日期，则取消选中（回到月视图）
                        if (selectedDay && date.toDateString() === selectedDay.toDateString()) {
                            setSelectedDay(null);
                        } else {
                            setSelectedDay(date);
                        }
                        // 重置分页
                        setCurrentPage(0);
                    }}
                />
            </Card>

            {/* ✨ 查看特定日期提示栏 */}
            {selectedDay && (
                <View style={styles.selectedDayBanner}>
                    <View style={styles.selectedDayInfo}>
                        <Icon name="calendar" size={16} color={Colors.primary} />
                        <Text style={styles.selectedDayText}>
                            正在查看 {selectedDay.getMonth() + 1}月{selectedDay.getDate()}日 的记录
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.clearDayButton}
                        onPress={() => setSelectedDay(null)}
                    >
                        <Text style={styles.clearDayText}>查看全月</Text>
                        <Icon name="close-circle" size={16} color={Colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            )}

            {/* ========== ✨ 快捷记账面板 ========== */}
            {quickPanelTemplates.length > 0 && (
                <QuickTransactionPanel
                    templates={quickPanelTemplates}
                    onTransactionCreated={loadTransactions}
                />
            )}

            {/* 筛选器 */}
            <View style={styles.filterContainer}>
                <TouchableOpacity
                    style={[
                        styles.filterButton,
                        filterType === 'ALL' && styles.filterButtonActive,
                    ]}
                    onPress={() => setFilterType('ALL')}
                >
                    <Text
                        style={[
                            styles.filterButtonText,
                            filterType === 'ALL' && styles.filterButtonTextActive,
                        ]}
                    >
                        全部
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.filterButton,
                        filterType === 'EXPENSE' && styles.filterButtonActive,
                    ]}
                    onPress={() => setFilterType('EXPENSE')}
                >
                    <View style={styles.filterButtonContent}>
                        <Icon 
                            name={TransactionIcons.expense} 
                            size={16} 
                            color={filterType === 'EXPENSE' ? Colors.surface : Colors.textSecondary} 
                        />
                        <Text
                            style={[
                                styles.filterButtonText,
                                filterType === 'EXPENSE' && styles.filterButtonTextActive,
                            ]}
                        >
                            支出
                        </Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.filterButton,
                        filterType === 'INCOME' && styles.filterButtonActive,
                    ]}
                    onPress={() => setFilterType('INCOME')}
                >
                    <View style={styles.filterButtonContent}>
                        <Icon 
                            name={TransactionIcons.income} 
                            size={16} 
                            color={filterType === 'INCOME' ? Colors.surface : Colors.textSecondary} 
                        />
                        <Text
                            style={[
                                styles.filterButtonText,
                                filterType === 'INCOME' && styles.filterButtonTextActive,
                            ]}
                        >
                            收入
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* 列表标题和操作按钮 */}
            <View style={styles.listHeader}>
                <Text style={styles.listTitle}>
                    {filterType === 'ALL'
                        ? '所有记录'
                        : filterType === 'EXPENSE'
                            ? '支出记录'
                            : '收入记录'}
                    <Text style={styles.listCount}> ({totalElements})</Text>
                </Text>
                
                <View style={styles.listActions}>
                    {/* 分组按钮 */}
                    <TouchableOpacity
                        style={[styles.actionButton, groupBy !== 'none' && styles.actionButtonActive]}
                        onPress={() => setGroupSheetVisible(true)}
                        activeOpacity={0.7}
                    >
                        <Icon name={getCurrentGroupByOption().icon as any} size={16} color={Colors.primary} />
                        {groupBy !== 'none' && (
                            <>
                                <Text style={styles.actionButtonText}>{getCurrentGroupByOption().label}</Text>
                                {/* ✨ 清除按钮 - 快速取消分组 */}
                                <TouchableOpacity
                                    style={styles.actionButtonClear}
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        setGroupBy('none');
                                    }}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Icon name="close-circle" size={14} color={Colors.textLight} />
                                </TouchableOpacity>
                            </>
                        )}
                        {groupBy === 'none' && (
                            <Text style={styles.actionButtonArrow}>▼</Text>
                        )}
                    </TouchableOpacity>
                    
                    {/* 排序按钮 */}
                    <TouchableOpacity
                        style={[
                            styles.actionButton,
                            (sortField !== 'transactionDateTime' || sortDirection !== 'DESC') && styles.actionButtonActive
                        ]}
                        onPress={() => setSortSheetVisible(true)}
                        activeOpacity={0.7}
                    >
                        <Icon name={getCurrentSortOption().icon as any} size={16} color={Colors.primary} />
                        {(sortField !== 'transactionDateTime' || sortDirection !== 'DESC') && (
                            <>
                                <Text style={styles.actionButtonText}>{getCurrentSortOption().label}</Text>
                                {/* ✨ 清除按钮 - 快速恢复默认排序 */}
                                <TouchableOpacity
                                    style={styles.actionButtonClear}
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        setSortField('transactionDateTime');
                                        setSortDirection('DESC');
                                    }}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Icon name="close-circle" size={14} color={Colors.textLight} />
                                </TouchableOpacity>
                            </>
                        )}
                        {(sortField === 'transactionDateTime' && sortDirection === 'DESC') && (
                            <Text style={styles.actionButtonArrow}>▼</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </>
    );

    // ========== 主渲染 ==========
    return (
        <>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <View style={styles.container}>
                    {/* 头部 - 账本选择器 */}
                    <View style={styles.header}>
            <View style={styles.headerLeft}>
                {ledgers.length > 1 ? (
                    <LedgerSelector
                        ledgers={ledgers}
                        currentLedger={filterLedger}
                        onSelect={(ledger) => {
                            setFilterLedger(ledger);
                            // 同步更新 LedgerContext 的 currentLedger，实现与图表页的同步
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
                        {ledgers.length === 1 ? ledgers[0].name : '我的账本'}
                    </Text>
                )}
            </View>
                        <View style={styles.headerRight}>
                            {/* ✨ 新增：共享账本成员展示 */}
                            {filterLedger && filterLedger.type === LedgerType.SHARED && (
                                <LedgerMembers 
                                    ledgerId={filterLedger.id} 
                                    maxDisplay={3}
                                    avatarSize={28}
                                />
                            )}
                            {/* ✨ 新增：搜索按钮 */}
                            <TouchableOpacity
                                style={[
                                    styles.searchButton,
                                    (searchExpanded || searchKeyword) && styles.searchButtonActive
                                ]}
                                onPress={handleToggleSearch}
                                activeOpacity={0.7}
                            >
                                <Icon 
                                    name={searchExpanded ? "close" : "search"} 
                                    size={20} 
                                    color={(searchExpanded || searchKeyword) ? Colors.primary : Colors.textSecondary} 
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* ✨ 新增：可折叠搜索栏 */}
                    <CollapsibleSearchBar
                        expanded={searchExpanded}
                        onToggle={handleToggleSearch}
                        onSearch={handleSearch}
                        placeholder="搜索交易备注、分类..."
                        isSearching={isSearching}
                        initialKeyword={searchKeyword}
                    />

                    {/* 搜索模式提示 */}
                    {searchKeyword && (
                        <View style={styles.searchModeHint}>
                            <Icon name="search" size={14} color={Colors.primary} />
                            <Text style={styles.searchModeHintText}>
                                搜索 "{searchKeyword}" · 找到 {totalElements} 条记录
                            </Text>
                            <TouchableOpacity
                                style={styles.searchModeClearButton}
                                onPress={() => {
                                    setSearchKeyword('');
                                    setSearchExpanded(false);
                                }}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Text style={styles.searchModeClearText}>清除</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* 列表 */}
                    {groupBy === 'none' ? (
                        // 不分组：平铺显示
                        <FlatList
                            data={filteredTransactions}
                            renderItem={renderTransactionItem}
                            keyExtractor={item => String(item.id)}
                            ListHeaderComponent={renderHeader}
                            ListEmptyComponent={renderEmpty}
                            ListFooterComponent={renderFooter}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                            refreshControl={
                                <RefreshControl
                                    refreshing={isRefreshing}
                                    onRefresh={onRefresh}
                                    tintColor={Colors.primary}
                                />
                            }
                            // 上拉加载更多
                            onEndReached={handleLoadMore}
                            onEndReachedThreshold={0.5}
                            // 性能优化属性
                            removeClippedSubviews={true}
                            maxToRenderPerBatch={10}
                            updateCellsBatchingPeriod={50}
                            initialNumToRender={15}
                            windowSize={10}
                            getItemLayout={(data, index) => ({
                                length: 80,
                                offset: 80 * index,
                                index,
                            })}
                        />
                    ) : (
                        // 分组显示 - 使用 SectionList 优化性能
                        <SectionList
                            sections={groupedTransactions}
                            keyExtractor={(item) => String(item.id)}
                            renderItem={renderTransactionItem}
                            renderSectionHeader={({ section: group }) => renderGroupHeader(group)}
                            ListHeaderComponent={renderHeader}
                            ListEmptyComponent={renderEmpty}
                            ListFooterComponent={renderFooter}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                            refreshControl={
                                <RefreshControl
                                    refreshing={isRefreshing}
                                    onRefresh={onRefresh}
                                    tintColor={Colors.primary}
                                />
                            }
                            // 上拉加载更多
                            onEndReached={handleLoadMore}
                            onEndReachedThreshold={0.5}
                            // 性能优化属性
                            removeClippedSubviews={true}
                            maxToRenderPerBatch={10}
                            updateCellsBatchingPeriod={50}
                            initialNumToRender={15}
                            windowSize={10}
                            stickySectionHeadersEnabled={false} // 不吸顶，避免遮挡
                        />
                    )}

                    {/* 悬浮添加按钮 */}
                    <TouchableOpacity
                        style={[
                            styles.fab,
                            { bottom: Spacing.xl + insets.bottom }
                        ]}
                        onPress={navigateToAddTransaction}
                        activeOpacity={0.8}
                    >
                        <Icon name="add" size={32} color={Colors.surface} />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            <TransactionMoveSheet
                visible={moveSheetVisible}
                transaction={selectedTransaction}
                category={selectedTransaction ? getCategoryById(selectedTransaction.categoryId) : undefined}
                ledgers={orderedLedgers}
                onClose={handleCloseMoveSheet}
                onSelectLedger={(ledger) => {
                    if (selectedTransaction) {
                        handleMoveTransaction(selectedTransaction, ledger);
                    }
                }}
                loadingLedgerId={movingLedgerId}
            />

            {/* ========== ✨ 新增：月份选择器抽屉 ========== */}
            <MonthPickerSheet
                visible={monthPickerVisible}
                selectedDate={selectedMonth}
                onClose={() => setMonthPickerVisible(false)}
                onSelectMonth={handleMonthSelect}
            />

            {/* 排序选择抽屉 */}
            <Modal
                visible={sortSheetVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setSortSheetVisible(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setSortSheetVisible(false)}
                >
                    <Pressable onPress={(e) => e.stopPropagation()}>
                        <View style={styles.sortSheet}>
                            {/* 把手 */}
                            <View style={styles.sheetHandle} />

                            {/* 标题 */}
                            <View style={styles.sheetHeader}>
                                <Text style={styles.sheetTitle}>选择排序方式</Text>
                                <TouchableOpacity
                                    style={styles.sheetCloseButton}
                                    onPress={() => setSortSheetVisible(false)}
                                    activeOpacity={0.7}
                                >
                                    <Icon name="close" size={20} color={Colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            {/* 排序选项 */}
                            <View style={styles.sortOptions}>
                                {SORT_OPTIONS.map((option, index) => {
                                    const isSelected = option.field === sortField && option.direction === sortDirection;
                                    return (
                                        <TouchableOpacity
                                            key={index}
                                            style={[
                                                styles.sortOption,
                                                isSelected && styles.sortOptionSelected
                                            ]}
                                            onPress={() => handleSortChange(option)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.sortOptionLeft}>
                                                <Icon name={option.icon as any} size={20} color={isSelected ? Colors.primary : Colors.text} />
                                                <Text style={[
                                                    styles.sortOptionText,
                                                    isSelected && styles.sortOptionTextSelected
                                                ]}>
                                                    {option.label}
                                                </Text>
                                            </View>
                                            {isSelected && (
                                                <Icon name="checkmark" size={20} color={Colors.primary} />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* 分组选择抽屉 */}
            <Modal
                visible={groupSheetVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setGroupSheetVisible(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setGroupSheetVisible(false)}
                >
                    <Pressable onPress={(e) => e.stopPropagation()}>
                        <View style={styles.sortSheet}>
                            {/* 把手 */}
                            <View style={styles.sheetHandle} />

                            {/* 标题 */}
                            <View style={styles.sheetHeader}>
                                <Text style={styles.sheetTitle}>选择分组方式</Text>
                                <TouchableOpacity
                                    style={styles.sheetCloseButton}
                                    onPress={() => setGroupSheetVisible(false)}
                                    activeOpacity={0.7}
                                >
                                    <Icon name="close" size={20} color={Colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            {/* 分组选项 */}
                            <View style={styles.sortOptions}>
                                {GROUP_BY_OPTIONS.map((option) => {
                                    const isSelected = option.type === groupBy;
                                    return (
                                        <TouchableOpacity
                                            key={option.type}
                                            style={[
                                                styles.sortOption,
                                                isSelected && styles.sortOptionSelected
                                            ]}
                                            onPress={() => handleGroupByChange(option)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.sortOptionLeft}>
                                                <Icon name={option.icon as any} size={20} color={isSelected ? Colors.primary : Colors.text} />
                                                <View style={styles.groupOptionTextContainer}>
                                                    <Text style={[
                                                        styles.sortOptionText,
                                                        isSelected && styles.sortOptionTextSelected
                                                    ]}>
                                                        {option.label}
                                                    </Text>
                                                    <Text style={styles.groupOptionDescription}>
                                                        {option.description}
                                                    </Text>
                                                </View>
                                            </View>
                                            {isSelected && (
                                                <Icon name="checkmark" size={20} color={Colors.primary} />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* 删除确认弹窗 */}
            <Modal
                visible={deleteModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setDeleteModalVisible(false)}
            >
                <Pressable
                    style={styles.deleteModalOverlay}
                    onPress={() => setDeleteModalVisible(false)}
                >
                    <View style={styles.deleteModalContainer}>
                        <View style={styles.deleteModalIconContainer}>
                                <Icon name="trash" size={32} color={Colors.expense} />
                            </View>
                            <Text style={styles.deleteModalTitle}>确认删除</Text>
                            <Text style={styles.deleteModalMessage}>
                                确定要删除这条记录吗？此操作无法撤销。
                            </Text>
                            
                            {deletingTransaction && (
                                <View style={styles.deletePreviewCard}>
                                    <Text style={styles.deletePreviewText} numberOfLines={1}>
                                        {deletingTransaction.description || '无备注'}
                                    </Text>
                                    <Text style={[
                                        styles.deletePreviewAmount,
                                        deletingTransaction.type === 'EXPENSE' ? styles.amountExpense : styles.amountIncome
                                    ]}>
                                        {deletingTransaction.type === 'EXPENSE' ? '-' : '+'}¥{deletingTransaction.amount.toFixed(2)}
                                    </Text>
                                </View>
                            )}

                            <View style={styles.deleteModalActions}>
                                <TouchableOpacity
                                    style={styles.deleteModalCancelButton}
                                    onPress={() => setDeleteModalVisible(false)}
                                >
                                    <Text style={styles.deleteModalCancelText}>取消</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.deleteModalConfirmButton}
                                    onPress={confirmDelete}
                                >
                                    <Text style={styles.deleteModalConfirmText}>删除</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                </Pressable>
            </Modal>
        </>
    );
};

// ========== 样式 ==========
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    container: {
        flex: 1,
    },

    // 头部
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
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    headerTitle: {
        fontSize: FontSizes.xxl,
        fontWeight: FontWeights.bold,
        color: Colors.text,
    },

    // ✨ 搜索按钮
    searchButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchButtonActive: {
        backgroundColor: Colors.primary + '15',
    },

    // ✨ 搜索模式提示
    searchModeHint: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary + '10',
        paddingVertical: Spacing.xs,
        paddingHorizontal: Spacing.md,
        gap: Spacing.xs,
    },
    searchModeHintText: {
        fontSize: FontSizes.sm,
        color: Colors.primary,
        fontWeight: FontWeights.medium,
        flex: 1,
    },
    searchModeClearButton: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
    },
    searchModeClearText: {
        fontSize: FontSizes.sm,
        color: Colors.primary,
        fontWeight: FontWeights.semibold,
    },

    // 列表
    listContent: {
        padding: Spacing.md,
        paddingBottom: 140, // 为悬浮按钮留出足够空间，确保最后的交易项不被遮挡
    },

    // 统计卡片
    statsCard: {
        marginBottom: Spacing.md,
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.lg,
        position: 'relative',
    },
    // 导航箭头
    navArrowLeft: {
        position: 'absolute',
        left: 4,
        top: '50%',
        marginTop: -20, // 居中微调
        zIndex: 10,
        padding: Spacing.sm,
    },
    navArrowRight: {
        position: 'absolute',
        right: 4,
        top: '50%',
        marginTop: -20,
        zIndex: 10,
        padding: Spacing.sm,
    },
    monthHeader: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border + '20',
    },
    monthTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    monthTitle: {
        fontSize: FontSizes.xl,
        fontWeight: FontWeights.bold,
        color: Colors.text,
    },
    currentMonthBadge: {
        backgroundColor: Colors.primary + '15',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: BorderRadius.md,
    },
    currentMonthBadgeText: {
        fontSize: 11,
        color: Colors.primary,
        fontWeight: FontWeights.semibold,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: Spacing.md,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        backgroundColor: Colors.border,
        marginHorizontal: Spacing.md,
    },
    statLabel: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginBottom: Spacing.xs,
    },
    statValue: {
        fontSize: FontSizes.xl,
        fontWeight: FontWeights.bold,
    },
    statValueExpense: {
        color: Colors.expense,
    },
    statValueIncome: {
        color: Colors.income,
    },
    balanceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    balanceLabel: {
        fontSize: FontSizes.md,
        color: Colors.text,
        fontWeight: FontWeights.semibold,
    },
    balanceValue: {
        fontSize: FontSizes.lg,
        fontWeight: FontWeights.bold,
        color: Colors.primary,
    },
    // 单项统计样式（支出或收入筛选时使用）
    singleStatContainer: {
        alignItems: 'center',
        paddingVertical: Spacing.xs,
    },
    singleStatLabel: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginBottom: Spacing.xs,
        fontWeight: FontWeights.medium,
    },
    singleStatValue: {
        fontSize: 40,
        fontWeight: FontWeights.bold,
        marginBottom: Spacing.xs,
        lineHeight: 48,
    },
    singleStatCount: {
        fontSize: FontSizes.xs,
        color: Colors.textLight,
        fontWeight: FontWeights.regular,
    },

    // 筛选器
    filterContainer: {
        flexDirection: 'row',
        marginBottom: Spacing.md,
        gap: Spacing.sm,
    },
    filterButton: {
        flex: 1,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.sm,
    },
    filterButtonActive: {
        backgroundColor: Colors.primary,
    },
    filterButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    filterButtonText: {
        fontSize: FontSizes.md,
        color: Colors.textSecondary,
        fontWeight: FontWeights.semibold,
    },
    filterButtonTextActive: {
        color: Colors.surface,
    },

    // 列表标题
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    listTitle: {
        fontSize: FontSizes.lg,
        fontWeight: FontWeights.semibold,
        color: Colors.text,
    },
    listCount: {
        fontSize: FontSizes.md,
        color: Colors.textSecondary,
        fontWeight: FontWeights.regular,
    },
    // 操作按钮容器
    listActions: {
        flexDirection: 'row',
        gap: Spacing.xs,
    },
    // 通用操作按钮（分组、排序）
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.xs,
        paddingHorizontal: Spacing.sm,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: 'transparent',
        gap: 4,
        ...Shadows.sm,
    },
    actionButtonActive: {
        backgroundColor: Colors.surface,
        borderColor: Colors.primary,
        borderWidth: 1.5,
    },
    actionButtonIcon: {
        fontSize: 16,
    },
    actionButtonText: {
        fontSize: FontSizes.sm,
        color: Colors.primary,
        fontWeight: FontWeights.semibold,
    },
    actionButtonArrow: {
        fontSize: 10,
        color: Colors.textLight,
        marginLeft: 2,
    },
    // ✨ 新增：操作按钮清除图标样式
    actionButtonClear: {
        padding: 4,
        marginLeft: 2,
    },

    // 分组标题
    groupHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.xs,
        paddingHorizontal: Spacing.md,
        marginTop: Spacing.md,
        marginBottom: 4,
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
    },
    groupHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
    },
    groupHeaderIcon: {
        fontSize: 20,
    },
    groupHeaderTitle: {
        fontSize: FontSizes.sm,
        fontWeight: FontWeights.medium,
        color: Colors.textSecondary,
    },
    groupHeaderCount: {
        fontSize: FontSizes.xs,
        color: Colors.textLight,
    },
    groupHeaderAmount: {
        fontSize: FontSizes.lg,
        fontWeight: FontWeights.bold,
        color: Colors.primary,
    },
    // 分组标题右侧（支出+收入）
    groupHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    groupStatItem: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 2,
    },
    groupStatLabel: {
        fontSize: 10,
        color: Colors.textLight,
    },
    groupStatValue: {
        fontSize: 12,
        color: Colors.textSecondary,
        fontWeight: FontWeights.medium,
    },
    groupHeaderEmpty: {
        fontSize: 12,
        color: Colors.textLight,
    },

    // 交易卡片 - 优化高度，参考 Google/Telegram 风格
    transactionCardWrapper: {
        marginBottom: Spacing.xs,
        borderRadius: BorderRadius.lg,
    },
    transactionCardPressed: {
        // 点击时使用缩放效果，避免背景色叠加问题
        transform: [{ scale: 0.98 }],
        opacity: 0.9,
    },
    transactionCard: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border + '30',
        // 使用非常柔和的阴影
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 2,
        elevation: 1,
    },
    transactionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    // 左侧内容
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.sm,
    },
    categoryIcon: {
        fontSize: 20,
    },
    infoContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    // 第一行：主标题（固定高度）
    titleRow: {
        height: 20,
        justifyContent: 'flex-start',
        marginBottom: 4,
        flexDirection: 'row',
        alignItems: 'center',
    },
    categoryName: {
        fontSize: FontSizes.md,
        fontWeight: FontWeights.semibold,
        color: Colors.text,
        lineHeight: 20,
    },
    // AI 来源标识 - 标题旁的小图标
    aiTitleBadge: {
        marginLeft: 4,
        opacity: 0.5,
    },
    // 第二行容器（固定高度）
    metaRowContainer: {
        height: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    // 元信息左侧（分类 + 时间 + 创建人）
    metaRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: Spacing.xs,
    },
    // 元信息右侧（账本标签，绝对定位效果）
    metaRowRight: {
        flexShrink: 0,
    },
    metaText: {
        fontSize: FontSizes.xs,
        color: Colors.textSecondary,
        lineHeight: 16,
    },
    metaDivider: {
        fontSize: FontSizes.xs,
        color: Colors.textLight,
        lineHeight: 16,
    },
    // 创建人文本样式（低调、不显眼）
    creatorText: {
        fontSize: FontSizes.xs,
        color: Colors.textLight,
        lineHeight: 16,
        fontStyle: 'italic',
        opacity: 0.7,
    },
    // 账本标签样式（参考 Telegram 风格）
    ledgerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary + '15',
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: BorderRadius.sm,
        maxWidth: 120,
        borderWidth: 0.5,
        borderColor: Colors.primary + '30',
    },
    ledgerBadgeIcon: {
        marginRight: 2,
    },
    ledgerBadgeText: {
        fontSize: 10,
        color: Colors.primary,
        fontWeight: FontWeights.medium,
        flex: 1,
        lineHeight: 14,
    },
    // 未分配账本标签样式（中性、低调）
    unassignedBadge: {
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: BorderRadius.sm,
        backgroundColor: Colors.backgroundSecondary,
        borderWidth: 0.5,
        borderColor: Colors.border,
    },
    unassignedBadgeText: {
        fontSize: 10,
        color: Colors.textLight,
        fontWeight: FontWeights.regular,
        lineHeight: 14,
    },

    // 右侧金额
    rightSection: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        marginLeft: Spacing.sm,
    },
    amount: {
        fontSize: FontSizes.lg,
        fontWeight: FontWeights.bold,
        lineHeight: 24,
    },
    amountExpense: {
        color: Colors.expense,
    },
    amountIncome: {
        color: Colors.income,
    },

    // 空状态
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.xxl * 2,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: Spacing.md,
    },
    emptyText: {
        fontSize: FontSizes.lg,
        fontWeight: FontWeights.semibold,
        color: Colors.text,
        marginBottom: Spacing.xs,
    },
    emptyHint: {
        fontSize: FontSizes.md,
        color: Colors.textSecondary,
    },

    // 悬浮按钮
    fab: {
        position: 'absolute',
        right: Spacing.lg,
        // bottom 值通过内联样式动态设置（考虑安全区域）
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.88, // 添加适度透明度，避免完全遮挡
        ...Shadows.xl,
    },
    fabIcon: {
        fontSize: 32,
        color: Colors.surface,
        fontWeight: FontWeights.bold,
    },
    // 列表底部加载指示器
    footerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: Spacing.lg,
        gap: Spacing.sm,
    },
    footerText: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
    },
    footerLoadingText: {
        color: Colors.primary,
        fontWeight: FontWeights.medium,
    },
    // ========== ✨ 新增：账本筛选器样式 ==========
    ledgerFilterContainer: {
        marginBottom: Spacing.md,
    },
    ledgerFilter: {
        // 继承 LedgerSelector 的样式，无需额外定制
    },

    // ========== 排序抽屉样式 ==========
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    sortSheet: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        paddingBottom: Spacing.xl,
    },
    sheetHandle: {
        width: 40,
        height: 4,
        backgroundColor: Colors.border,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: Spacing.sm,
        marginBottom: Spacing.md,
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        marginBottom: Spacing.md,
    },
    sheetTitle: {
        fontSize: FontSizes.lg,
        fontWeight: FontWeights.bold,
        color: Colors.text,
    },
    sheetCloseButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.backgroundSecondary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sheetCloseButtonText: {
        fontSize: FontSizes.lg,
        color: Colors.textSecondary,
        fontWeight: '300',
    },
    sortOptions: {
        paddingHorizontal: Spacing.lg,
    },
    sortOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing.xs,
        backgroundColor: Colors.background,
    },
    sortOptionSelected: {
        backgroundColor: Colors.primary + '10',
        borderWidth: 1,
        borderColor: Colors.primary + '30',
    },
    sortOptionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    sortOptionIcon: {
        fontSize: 20,
    },
    sortOptionText: {
        fontSize: FontSizes.md,
        color: Colors.text,
        fontWeight: FontWeights.medium,
    },
    sortOptionTextSelected: {
        color: Colors.primary,
        fontWeight: FontWeights.semibold,
    },
    sortOptionCheck: {
        fontSize: FontSizes.lg,
        color: Colors.primary,
        fontWeight: FontWeights.bold,
    },
    // 分组选项的文本容器
    groupOptionTextContainer: {
        flex: 1,
    },
    groupOptionDescription: {
        fontSize: FontSizes.xs,
        color: Colors.textLight,
        marginTop: 2,
    },
    // ========== ✨ 新增：日历热力图切换按钮样式 ==========
    calendarToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.sm,
        marginTop: Spacing.md,
        gap: Spacing.xs,
        borderTopWidth: 1,
        borderTopColor: Colors.border + '30',
    },
    calendarToggleText: {
        fontSize: FontSizes.sm,
        color: Colors.primary,
        fontWeight: FontWeights.medium,
    },

    // ✨ 选中日期提示栏
    selectedDayBanner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.primary + '10',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        marginBottom: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.primary + '20',
    },
    selectedDayInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    selectedDayText: {
        fontSize: FontSizes.sm,
        color: Colors.primary,
        fontWeight: FontWeights.semibold,
    },
    clearDayButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        padding: 4,
    },
    clearDayText: {
        fontSize: FontSizes.xs,
        color: Colors.textSecondary,
    },

    // ========== 侧滑删除样式 ==========
    rightActionContainer: {
        width: 80,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    rightAction: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Colors.expense,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.sm,
    },
    deleteButtonText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
        marginTop: 2,
    },

    // ========== 删除确认弹窗样式 ==========
    deleteModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteModalContainer: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        width: '80%',
        maxWidth: 340,
        alignItems: 'center',
        ...Shadows.xl,
    },
    deleteModalIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: Colors.expense + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    deleteModalTitle: {
        fontSize: FontSizes.xl,
        fontWeight: FontWeights.bold,
        color: Colors.text,
        marginBottom: Spacing.sm,
    },
    deleteModalMessage: {
        fontSize: FontSizes.md,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: Spacing.lg,
        lineHeight: 22,
    },
    deletePreviewCard: {
        width: '100%',
        backgroundColor: Colors.background,
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.lg,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    deletePreviewText: {
        flex: 1,
        fontSize: FontSizes.md,
        color: Colors.text,
        marginRight: Spacing.md,
    },
    deletePreviewAmount: {
        fontSize: FontSizes.md,
        fontWeight: FontWeights.bold,
    },
    deleteModalActions: {
        flexDirection: 'row',
        gap: Spacing.md,
        width: '100%',
    },
    deleteModalCancelButton: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.backgroundSecondary,
        alignItems: 'center',
    },
    deleteModalCancelText: {
        fontSize: FontSizes.md,
        fontWeight: FontWeights.semibold,
        color: Colors.text,
    },
    deleteModalConfirmButton: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.expense,
        alignItems: 'center',
    },
    deleteModalConfirmText: {
        fontSize: FontSizes.md,
        fontWeight: FontWeights.semibold,
        color: '#fff',
    },
});
