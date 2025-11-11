/**
 * 记账列表页
 * 展示所有记账记录，支持按类型筛选
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { toast } from '../utils/toast';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import type { Category, Transaction } from '../types/transaction';
import { transactionAPI } from '../api/services';
import { useCategories } from '../context/CategoryContext';
// ========== ✨ 新增导入 ==========
import { LedgerSelector } from '../components/common';
import { useLedger } from '../context/LedgerContext';
import { Ledger, LedgerType } from '../types/ledger';
import { TransactionMoveSheet } from '../components/transaction/TransactionMoveSheet';
import { TransactionDetailSheet } from '../components/transaction/TransactionDetailSheet';

type FilterType = 'ALL' | 'EXPENSE' | 'INCOME';

// 获取账本图标
const getLedgerIcon = (type: LedgerType): string => {
    switch (type) {
        case LedgerType.PERSONAL:
            return '📖';
        case LedgerType.SHARED:
            return '👨‍👩‍👧‍👦';
        case LedgerType.BUSINESS:
            return '🏢';
        default:
            return '📖';
    }
};

export const TransactionListScreen: React.FC = () => {
    const navigation = useNavigation();

    const { categories, refreshCategories } = useCategories();

    // ========== ✨ 新增：账本相关状态 ==========
    const { ledgers, currentLedger, setCurrentLedger } = useLedger();

    // 筛选账本
    const [filterLedger, setFilterLedger] = useState<Ledger | null>(null);

    // ========== 状态管理 ==========
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [filterType, setFilterType] = useState<FilterType>('ALL');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
    const [moveSheetVisible, setMoveSheetVisible] = useState<boolean>(false);
    const [detailSheetVisible, setDetailSheetVisible] = useState<boolean>(false);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [movingLedgerId, setMovingLedgerId] = useState<number | null>(null);

    // 分页相关状态
    const [currentPage, setCurrentPage] = useState<number>(0);
    const [hasMore, setHasMore] = useState<boolean>(true);
    const [totalElements, setTotalElements] = useState<number>(0);

    // ========== 数据加载 ==========
    useFocusEffect(
        useCallback(() => {
            // 页面聚焦时加载数据
            loadTransactions();
        }, [filterType, filterLedger]) // 当筛选条件变化时重新加载
    );

    // 根据categoryId查找category对象
    const getCategoryById = (categoryId: string | number): Category | undefined => {
        return categories.find(c => String(c.id) === String(categoryId));
    }

    // 根据ledgerId查找ledger对象
    const getLedgerById = (ledgerId: number): Ledger | undefined => {
        return ledgers.find(l => l.id === ledgerId);
    }


    // 加载交易记录
    const loadTransactions = async (isLoadMore: boolean = false) => {
        try {
            if (!isLoadMore) {
                setIsLoading(true);
            }

            const page = isLoadMore ? currentPage + 1 : 0;

            const response = await transactionAPI.query({
                ledgerId: filterLedger?.id || null,
                type: filterType === 'ALL' ? null : filterType,
                page,
                size: 20,
                sortBy: 'transactionDateTime',
                sortDirection: 'DESC',
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
        }
    };

    // 下拉刷新
    const onRefresh = async () => {
        setIsRefreshing(true);
        setCurrentPage(0);
        await Promise.all([
            loadTransactions(false),
            refreshCategories(),  // 刷新分类数据
        ])
        setIsRefreshing(false);
    };

    // ========== 数据处理 ==========
    // 显示的交易列表（由于后端已经做了筛选，这里直接使用）
    const filteredTransactions = transactions;

    // 计算统计数据
    const statistics = transactions.reduce(
        (acc, item) => {
            if (item.type === 'EXPENSE') {
                acc.totalExpense += item.amount;
            } else {
                acc.totalIncome += item.amount;
            }
            return acc;
        },
        { totalExpense: 0, totalIncome: 0 },
    );

    // ========== 格式化函数 ==========
    // 格式化日期
    const formatDate = (dateString: string): string => {
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
    };

    // 格式化时间
    const formatTime = (dateString: string): string => {
        const date = new Date(dateString);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };

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

        return (<TouchableOpacity 
            activeOpacity={0.7} 
            onPress={() => handleItemPress(item)}
            onLongPress={() => handleLongPress(item)}
            delayLongPress={250}
        >
            <Card style={styles.transactionCard}>
                <View style={styles.transactionRow}>
                    {/* 左侧：图标和信息 */}
                    <View style={styles.leftSection}>
                        <View
                            style={[
                                styles.iconContainer,
                                { backgroundColor: category.color + '20' },
                            ]}
                        >
                            <Text style={styles.categoryIcon}>{category.icon}</Text>
                        </View>
                        <View style={styles.infoContainer}>
                            {/* 分类名称和账本标签 */}
                            <View style={styles.categoryRow}>
                                <Text style={styles.categoryName}>{category.name}</Text>
                                {shouldShowLedger && (
                                    <>
                                        {ledger ? (
                                            // 有账本：显示账本标签
                                            <View style={styles.ledgerBadge}>
                                                <Text style={styles.ledgerBadgeIcon}>
                                                    {getLedgerIcon(ledger.type)}
                                                </Text>
                                                <Text style={styles.ledgerBadgeText} numberOfLines={1}>
                                                    {ledger.name}
                                                </Text>
                                            </View>
                                        ) : (
                                            // 无账本：显示通用标签（中性样式）
                                            <View style={styles.unassignedBadge}>
                                                <Text style={styles.unassignedBadgeText}>
                                                    默认账本
                                                </Text>
                                            </View>
                                        )}
                                    </>
                                )}
                            </View>
                            <View style={styles.timeRow}>
                                <Text style={styles.dateText}>{formatDate(item.transactionDateTime)}</Text>
                                <Text style={styles.timeText}>{formatTime(item.transactionDateTime)}</Text>
                            </View>
                            {item.description && (
                                <Text style={styles.description} numberOfLines={1}>
                                    {item.description}
                                </Text>
                            )}
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
        </TouchableOpacity>);
    };

    // ========== 点击处理 ==========
    const handleItemPress = (item: Transaction) => {
        setSelectedTransaction(item);
        setDetailSheetVisible(true);
    };

    // 关闭详情页
    const handleCloseDetailSheet = () => {
        setDetailSheetVisible(false);
        setSelectedTransaction(null);
    };

    // 编辑交易
    const handleEditTransaction = (item: Transaction) => {
        // TODO: 导航到编辑页
        console.log('编辑交易:', item);
        toast.info('编辑功能开发中...');
    };

    // 删除交易
    const handleDeleteTransaction = async (item: Transaction) => {
        try {
            await transactionAPI.delete(item.id);
            toast.success('删除成功');
            await loadTransactions();
        } catch (error) {
            console.error('删除交易失败:', error);
            toast.error('删除失败，请稍后重试');
        }
    };

    // 跳转到新增记账页
    const navigateToAddTransaction = () => {
        console.log('🔍 调试导航信息:');
        console.log('当前导航器:', navigation);
        console.log('父级导航器:', navigation.getParent());
        console.log('尝试跳转到 AddTransaction...');

        const parent = navigation.getParent();
        if (parent) {
            console.log('✅ 找到父级导航器，开始跳转');
            parent.navigate('AddTransaction');
        } else {
            console.error('❌ 未找到父级导航器');
            // 备用方案：使用 CommonActions
            console.log('🔄 使用备用导航方案...');
            try {
                navigation.navigate('AddTransaction' as never);
            } catch (error) {
                console.error('备用方案也失败:', error);
            }
        }
    };

    // ========== 空状态 ==========
    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyText}>暂无记账记录</Text>
            <Text style={styles.emptyHint}>点击下方按钮开始记账吧</Text>
        </View>
    );

    // ========== 渲染列表头部 ==========
    const renderHeader = () => (
        <>
            {/* 统计卡片 */}
            <Card style={styles.statsCard}>
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
            </Card>

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
                    <Text
                        style={[
                            styles.filterButtonText,
                            filterType === 'EXPENSE' && styles.filterButtonTextActive,
                        ]}
                    >
                        💸 支出
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.filterButton,
                        filterType === 'INCOME' && styles.filterButtonActive,
                    ]}
                    onPress={() => setFilterType('INCOME')}
                >
                    <Text
                        style={[
                            styles.filterButtonText,
                            filterType === 'INCOME' && styles.filterButtonTextActive,
                        ]}
                    >
                        💰 收入
                    </Text>
                </TouchableOpacity>
            </View>

            {/* 列表标题 */}
            <Text style={styles.listTitle}>
                {filterType === 'ALL'
                    ? '所有记录'
                    : filterType === 'EXPENSE'
                        ? '支出记录'
                        : '收入记录'}
                <Text style={styles.listCount}> ({totalElements})</Text>
            </Text>
        </>
    );

    // ========== 主渲染 ==========
    return (
        <>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
            <View style={styles.container}>
                {/* 头部 - 账本选择器 */}
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
                            {ledgers.length === 1 ? ledgers[0].name : '我的账本'}
                        </Text>
                    )}
                </View>

                {/* 列表 */}
                <FlatList
                    data={filteredTransactions}
                    renderItem={renderTransactionItem}
                    keyExtractor={item => String(item.id)}
                    ListHeaderComponent={renderHeader}
                    ListEmptyComponent={renderEmpty}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={onRefresh}
                            tintColor={Colors.primary}
                        />
                    }
                />

                {/* 悬浮添加按钮 */}
                <TouchableOpacity
                    style={styles.fab}
                    onPress={navigateToAddTransaction}
                    activeOpacity={0.8}
                >
                    <Text style={styles.fabIcon}>+</Text>
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

            <TransactionDetailSheet
                visible={detailSheetVisible}
                transaction={selectedTransaction}
                category={selectedTransaction ? getCategoryById(selectedTransaction.categoryId) : undefined}
                ledger={selectedTransaction?.ledgerId ? getLedgerById(selectedTransaction.ledgerId) : undefined}
                onClose={handleCloseDetailSheet}
                onEdit={handleEditTransaction}
                onDelete={handleDeleteTransaction}
            />
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
    },
    headerTitle: {
        fontSize: FontSizes.xxl,
        fontWeight: FontWeights.bold,
        color: Colors.text,
    },

    // 列表
    listContent: {
        padding: Spacing.md,
        paddingBottom: 100, // 为悬浮按钮留出空间
    },

    // 统计卡片
    statsCard: {
        marginBottom: Spacing.md,
        padding: Spacing.lg,
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
        ...Shadows.sm,
    },
    filterButtonActive: {
        backgroundColor: Colors.primary,
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
    listTitle: {
        fontSize: FontSizes.lg,
        fontWeight: FontWeights.semibold,
        color: Colors.text,
        marginBottom: Spacing.md,
    },
    listCount: {
        fontSize: FontSizes.md,
        color: Colors.textSecondary,
        fontWeight: FontWeights.regular,
    },

    // 交易卡片
    transactionCard: {
        marginBottom: Spacing.sm,
        padding: Spacing.md,
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
        width: 48,
        height: 48,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    categoryIcon: {
        fontSize: 24,
    },
    infoContainer: {
        flex: 1,
    },
    categoryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.xs / 2,
        gap: Spacing.xs,
    },
    categoryName: {
        fontSize: FontSizes.md,
        fontWeight: FontWeights.semibold,
        color: Colors.text,
    },
    // 账本标签样式（参考 Telegram 风格）
    ledgerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary + '15',
        paddingHorizontal: Spacing.xs,
        paddingVertical: 2,
        borderRadius: BorderRadius.sm,
        maxWidth: 120,
        borderWidth: 0.5,
        borderColor: Colors.primary + '30',
    },
    ledgerBadgeIcon: {
        fontSize: 10,
        marginRight: 2,
    },
    ledgerBadgeText: {
        fontSize: FontSizes.xs,
        color: Colors.primary,
        fontWeight: FontWeights.medium,
        flex: 1,
    },
    // 未分配账本标签样式（中性、低调）
    unassignedBadge: {
        paddingHorizontal: Spacing.xs,
        paddingVertical: 2,
        borderRadius: BorderRadius.sm,
        backgroundColor: Colors.backgroundSecondary,
        borderWidth: 0.5,
        borderColor: Colors.border,
    },
    unassignedBadgeText: {
        fontSize: FontSizes.xs,
        color: Colors.textLight,
        fontWeight: FontWeights.regular,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.xs / 2,
    },
    dateText: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginRight: Spacing.xs,
    },
    timeText: {
        fontSize: FontSizes.sm,
        color: Colors.textLight,
    },
    description: {
        fontSize: FontSizes.sm,
        color: Colors.textLight,
        marginTop: Spacing.xs / 2,
    },

    // 右侧金额
    rightSection: {
        alignItems: 'flex-end',
        marginLeft: Spacing.md,
    },
    amount: {
        fontSize: FontSizes.lg,
        fontWeight: FontWeights.bold,
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
        bottom: Spacing.xl,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.xl,
    },
    fabIcon: {
        fontSize: 32,
        color: Colors.surface,
        fontWeight: FontWeights.bold,
    },
    // ========== ✨ 新增：账本筛选器样式 ==========
    ledgerFilterContainer: {
        marginBottom: Spacing.md,
    },
    ledgerFilter: {
        // 继承 LedgerSelector 的样式，无需额外定制
    },
});
