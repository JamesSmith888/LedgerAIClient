/**
 * 交易列表项组件
 * 使用 React.memo 优化性能
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Swipeable } from 'react-native-gesture-handler';
import { Transaction } from '../../types/transaction';
import { Category } from '../../types/category';
import { Ledger, LedgerType } from '../../types/ledger';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius, Shadows } from '../../theme';

interface TransactionListItemProps {
    item: Transaction;
    category: Category | undefined;
    ledger: Ledger | undefined;
    onPress: (item: Transaction) => void;
    onLongPress: (item: Transaction) => void;
    onDelete: (item: Transaction) => void;
    formatDate: (dateString: string) => string;
    formatTime: (dateString: string) => string;
    swipeableRef?: (ref: Swipeable | null) => void;
}

// 使用 React.memo 优化，只有props改变时才重新渲染
export const TransactionListItem = React.memo<TransactionListItemProps>(({
    item,
    category,
    ledger,
    onPress,
    onLongPress,
    onDelete,
    formatDate,
    formatTime,
    swipeableRef,
}) => {
    // 渲染侧滑删除按钮
    const renderRightActions = (
        progress: any,
        dragX: any
    ) => {
        return (
            <View style={styles.rightActionContainer}>
                <Pressable
                    onPress={() => onDelete(item)}
                    style={({ pressed }) => [
                        styles.rightAction,
                        { opacity: pressed ? 0.6 : 1 }
                    ]}
                >
                    <View style={styles.deleteButton}>
                        <Ionicons name="trash" size={24} color="#fff" />
                        <Text style={styles.deleteButtonText}>删除</Text>
                    </View>
                </Pressable>
            </View>
        );
    };

    return (
        <Swipeable
            ref={swipeableRef}
            renderRightActions={renderRightActions}
            overshootRight={false}
            friction={2}
        >
            <Pressable
                onPress={() => onPress(item)}
                onLongPress={() => onLongPress(item)}
                style={({ pressed }) => [
                    styles.transactionCardWrapper,
                    pressed && styles.transactionCardPressed
                ]}
            >
                <View style={styles.transactionCard}>
                    <View style={styles.transactionRow}>
                        <View style={styles.leftSection}>
                            <View
                                style={[
                                    styles.iconContainer,
                                    {
                                        backgroundColor: category
                                            ? category.color + '20'
                                            : Colors.backgroundSecondary,
                                    },
                                ]}
                            >
                                <Ionicons
                                    name={category?.icon as any || 'help-circle-outline'}
                                    size={24}
                                    color={category?.color || Colors.textSecondary}
                                    style={styles.categoryIcon}
                                />
                            </View>
                            <View style={styles.infoContainer}>
                                <View style={styles.titleRow}>
                                    <Text style={styles.categoryName} numberOfLines={1}>
                                        {category?.name || '未分类'}
                                    </Text>
                                </View>
                                <View style={styles.metaRowContainer}>
                                    <View style={styles.metaRowLeft}>
                                        <Text style={styles.metaText} numberOfLines={1}>
                                            {formatDate(item.transactionDateTime)}
                                        </Text>
                                        <Text style={styles.metaDivider}> · </Text>
                                        <Text style={styles.metaText}>
                                            {formatTime(item.transactionDateTime)}
                                        </Text>
                                        {item.createdByUserNickname && (
                                            <>
                                                <Text style={styles.metaDivider}> · </Text>
                                                <Text style={styles.creatorText} numberOfLines={1}>
                                                    {item.createdByUserNickname}
                                                </Text>
                                            </>
                                        )}
                                    </View>
                                    <View style={styles.metaRowRight}>
                                        {ledger ? (
                                            <View style={styles.ledgerBadge}>
                                                <Ionicons
                                                    name={ledger.type === LedgerType.PERSONAL ? 'person' : 
                                                          ledger.type === LedgerType.SHARED ? 'people' : 'briefcase'}
                                                    size={10}
                                                    color={Colors.primary}
                                                    style={styles.ledgerBadgeIcon}
                                                />
                                                <Text style={styles.ledgerBadgeText} numberOfLines={1}>
                                                    {ledger.name}
                                                </Text>
                                            </View>
                                        ) : item.ledgerId ? (
                                            <View style={styles.unassignedBadge}>
                                                <Text style={styles.unassignedBadgeText}>未分配</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                </View>
                            </View>
                        </View>

                        <View style={styles.rightSection}>
                            <Text
                                style={[
                                    styles.amount,
                                    item.type === 'EXPENSE' ? styles.amountExpense : styles.amountIncome,
                                ]}
                            >
                                {item.type === 'EXPENSE' ? '-' : '+'}¥{item.amount.toFixed(2)}
                            </Text>
                        </View>
                    </View>
                </View>
            </Pressable>
        </Swipeable>
    );
}, (prevProps, nextProps) => {
    // 自定义比较函数，优化性能
    return (
        prevProps.item.id === nextProps.item.id &&
        prevProps.item.amount === nextProps.item.amount &&
        prevProps.item.type === nextProps.item.type &&
        prevProps.category?.id === nextProps.category?.id &&
        prevProps.ledger?.id === nextProps.ledger?.id
    );
});

const styles = StyleSheet.create({
    transactionCardWrapper: {
        marginBottom: Spacing.xs,
    },
    transactionCardPressed: {
        opacity: 0.7,
    },
    transactionCard: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border + '30',
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
    titleRow: {
        height: 20,
        justifyContent: 'center',
        marginBottom: 4,
    },
    categoryName: {
        fontSize: FontSizes.md,
        fontWeight: FontWeights.semibold,
        color: Colors.text,
        lineHeight: 20,
    },
    metaRowContainer: {
        height: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    metaRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: Spacing.xs,
    },
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
    creatorText: {
        fontSize: FontSizes.xs,
        color: Colors.textLight,
        lineHeight: 16,
        fontStyle: 'italic',
        opacity: 0.7,
    },
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
});
