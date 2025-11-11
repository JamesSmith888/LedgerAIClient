/**
 * 交易详情底部抽屉
 * 展示交易的详细信息，支持编辑和删除
 */
import React from 'react';
import {
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    BorderRadius,
    Colors,
    FontSizes,
    FontWeights,
    Shadows,
    Spacing,
} from '../../constants/theme';
import type { Transaction, Category } from '../../types/transaction';
import type { Ledger } from '../../types/ledger';
import { LedgerType } from '../../types/ledger';

interface TransactionDetailSheetProps {
    visible: boolean;
    transaction: Transaction | null;
    category?: Category;
    ledger?: Ledger;
    onClose: () => void;
    onEdit?: (transaction: Transaction) => void;
    onDelete?: (transaction: Transaction) => void;
}

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

// 格式化日期时间
const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
        return '';
    }
    
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    const hours = `${date.getHours()}`.padStart(2, '0');
    const minutes = `${date.getMinutes()}`.padStart(2, '0');
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekDay = weekDays[date.getDay()];
    
    return `${year}年${month}月${day}日 ${weekDay} ${hours}:${minutes}`;
};

export const TransactionDetailSheet: React.FC<TransactionDetailSheetProps> = ({
    visible,
    transaction,
    category,
    ledger,
    onClose,
    onEdit,
    onDelete,
}) => {
    console.log('TransactionDetailSheet渲染，交易ID:', transaction);
    if (!transaction) {
        return null;
    }

    const isExpense = transaction.type === 'EXPENSE';

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable onPress={(e) => e.stopPropagation()}>
                    <View style={styles.container}>
                        {/* 顶部把手 */}
                        <View style={styles.handleBar} />

                        {/* 头部 */}
                        <View style={styles.header}>
                            <Text style={styles.headerTitle}>交易详情</Text>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={onClose}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.closeButtonText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.content}
                            showsVerticalScrollIndicator={false}
                            bounces={false}
                        >
                        {/* 金额卡片 */}
                        <View style={styles.amountCard}>
                            <View style={styles.amountHeader}>
                                {category && (
                                    <View
                                        style={[
                                            styles.categoryIconContainer,
                                            { backgroundColor: category.color + '20' },
                                        ]}
                                    >
                                        <Text style={styles.categoryIcon}>{category.icon}</Text>
                                    </View>
                                )}
                                <View style={styles.amountHeaderText}>
                                    <Text style={styles.categoryName}>
                                        {category?.name || '未知分类'}
                                    </Text>
                                    <Text style={styles.transactionType}>
                                        {isExpense ? '支出' : '收入'}
                                    </Text>
                                </View>
                            </View>
                            <Text
                                style={[
                                    styles.amount,
                                    isExpense ? styles.amountExpense : styles.amountIncome,
                                ]}
                            >
                                {isExpense ? '-' : '+'}¥{transaction.amount.toFixed(2)}
                            </Text>
                        </View>

                        {/* 详细信息 */}
                        <View style={styles.detailsCard}>
                            {/* 时间 */}
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>📅 时间</Text>
                                <Text style={styles.detailValue}>
                                    {formatDateTime(transaction.transactionDateTime)}
                                </Text>
                            </View>

                            {/* 账本 */}
                            {ledger && (
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>
                                        {getLedgerIcon(ledger.type)} 账本
                                    </Text>
                                    <Text style={styles.detailValue}>{ledger.name}</Text>
                                </View>
                            )}

                            {/* 备注 */}
                            {transaction.description && (
                                <View style={[styles.detailRow, styles.detailRowColumn]}>
                                    <Text style={styles.detailLabel}>📝 备注</Text>
                                    <Text style={styles.detailValueDescription}>
                                        {transaction.description}
                                    </Text>
                                </View>
                            )}

                            {/* 交易ID */}
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>🔖 ID</Text>
                                <Text style={styles.detailValueId}>{transaction.id}</Text>
                            </View>
                        </View>

                        {/* 操作按钮 */}
                        <View style={styles.actions}>
                            {onEdit && (
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.editButton]}
                                    onPress={() => {
                                        onEdit(transaction);
                                        onClose();
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.actionButtonText}>✏️ 编辑</Text>
                                </TouchableOpacity>
                            )}

                            {onDelete && (
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.deleteButton]}
                                    onPress={() => {
                                        onDelete(transaction);
                                        onClose();
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
                                        🗑️ 删除
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* 底部间距 */}
                        <View style={styles.bottomSpacer} />
                    </ScrollView>
                </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        maxHeight: '85%',
        paddingBottom: Spacing.xl,
    },

    // 把手
    handleBar: {
        width: 40,
        height: 4,
        backgroundColor: Colors.border,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: Spacing.sm,
        marginBottom: Spacing.md,
    },

    // 头部
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    headerTitle: {
        fontSize: FontSizes.lg,
        fontWeight: FontWeights.bold,
        color: Colors.text,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.backgroundSecondary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: FontSizes.lg,
        color: Colors.textSecondary,
        fontWeight: '300',
    },

    // 内容
    content: {
        flex: 1,
    },

    // 金额卡片
    amountCard: {
        margin: Spacing.lg,
        padding: Spacing.lg,
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.lg,
        ...Shadows.sm,
    },
    amountHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    categoryIconContainer: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.lg,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    categoryIcon: {
        fontSize: 24,
    },
    amountHeaderText: {
        flex: 1,
    },
    categoryName: {
        fontSize: FontSizes.lg,
        fontWeight: FontWeights.semibold,
        color: Colors.text,
        marginBottom: Spacing.xs / 2,
    },
    transactionType: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
    },
    amount: {
        fontSize: 36,
        fontWeight: FontWeights.bold,
        textAlign: 'center',
    },
    amountExpense: {
        color: Colors.expense,
    },
    amountIncome: {
        color: Colors.income,
    },

    // 详细信息卡片
    detailsCard: {
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.lg,
        padding: Spacing.lg,
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.lg,
        ...Shadows.sm,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border + '30',
    },
    detailRowColumn: {
        flexDirection: 'column',
        alignItems: 'flex-start',
    },
    detailLabel: {
        fontSize: FontSizes.md,
        color: Colors.text,
        fontWeight: FontWeights.medium,
        marginBottom: Spacing.xs,
    },
    detailValue: {
        fontSize: FontSizes.md,
        color: Colors.textSecondary,
        textAlign: 'right',
        flex: 1,
        marginLeft: Spacing.md,
    },
    detailValueDescription: {
        fontSize: FontSizes.md,
        color: Colors.textSecondary,
        lineHeight: 22,
        marginTop: Spacing.xs,
    },
    detailValueId: {
        fontSize: FontSizes.sm,
        color: Colors.textLight,
        fontFamily: 'monospace',
        textAlign: 'right',
        flex: 1,
        marginLeft: Spacing.md,
    },

    // 操作按钮
    actions: {
        flexDirection: 'row',
        gap: Spacing.md,
        paddingHorizontal: Spacing.lg,
        marginBottom: Spacing.md,
    },
    actionButton: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        ...Shadows.sm,
    },
    editButton: {
        backgroundColor: Colors.primary,
    },
    deleteButton: {
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.expense,
    },
    actionButtonText: {
        fontSize: FontSizes.md,
        fontWeight: FontWeights.semibold,
        color: Colors.surface,
    },
    deleteButtonText: {
        color: Colors.expense,
    },

    // 底部间距
    bottomSpacer: {
        height: Spacing.lg,
    },
});
