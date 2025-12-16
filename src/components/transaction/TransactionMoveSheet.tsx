import React, { useMemo } from 'react';
import {
    ActivityIndicator,
    Modal,
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
import { LedgerType, getLedgerTypeName } from '../../types/ledger';

interface TransactionMoveSheetProps {
    visible: boolean;
    transaction: Transaction | null;
    category?: Category;
    ledgers: Ledger[];
    onClose: () => void;
    onSelectLedger: (ledger: Ledger) => void;
    loadingLedgerId?: number | null;
}

const getLedgerIcon = (type: LedgerType): string => {
    switch (type) {
        case LedgerType.PERSONAL:
            return '📖';
        case LedgerType.SHARED:
            return '👥';
        case LedgerType.BUSINESS:
            return '🏢';
        default:
            return '📚';
    }
};

const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
        return '';
    }
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    const hours = `${date.getHours()}`.padStart(2, '0');
    const minutes = `${date.getMinutes()}`.padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
};

export const TransactionMoveSheet: React.FC<TransactionMoveSheetProps> = ({
    visible,
    transaction,
    category,
    ledgers,
    onClose,
    onSelectLedger,
    loadingLedgerId,
}) => {
    const sourceLedger = useMemo(() => {
        if (!transaction?.ledgerId) {
            return null;
        }
        return ledgers.find(item => item.id === transaction.ledgerId) ?? null;
    }, [ledgers, transaction?.ledgerId]);

    const availableLedgers = useMemo(() => {
        if (!transaction) {
            return [] as Ledger[];
        }
        const sourceId = transaction.ledgerId ?? null;
        return ledgers.filter(ledger => (sourceId == null || ledger.id !== sourceId));
    }, [ledgers, transaction]);

    const quickLedgers = useMemo(() => availableLedgers.slice(0, 3), [availableLedgers]);

    if (!transaction) {
        return null;
    }

    const renderLedgerOption = (ledger: Ledger) => {
        const isLoading = loadingLedgerId === ledger.id;
        return (
            <TouchableOpacity
                key={ledger.id}
                style={styles.ledgerItem}
                onPress={() => onSelectLedger(ledger)}
                activeOpacity={0.7}
                disabled={Boolean(loadingLedgerId) && !isLoading}
            >
                <View style={styles.ledgerItemContent}>
                    <View style={styles.ledgerIconWrapper}>
                        <Text style={styles.ledgerIcon}>{getLedgerIcon(ledger.type)}</Text>
                    </View>
                    <View style={styles.ledgerInfo}>
                        <Text style={styles.ledgerName} numberOfLines={1}>
                            {ledger.name}
                        </Text>
                        <Text style={styles.ledgerMeta} numberOfLines={1}>
                            {ledger.typeName ?? getLedgerTypeName(ledger.type)}
                        </Text>
                    </View>
                    {isLoading ? (
                        <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                        <Text style={styles.ledgerArrow}>›</Text>
                    )}
                </View>
            </TouchableOpacity>
        );
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
                    <View style={styles.sheetHandle} />
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.title}>移动到其他账本</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Text style={styles.closeIcon}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.transactionSummary}>
                        <View style={styles.transactionIconWrapper}>
                            <Text style={styles.transactionIcon}>{category?.icon ?? '🧾'}</Text>
                        </View>
                        <View style={styles.transactionInfo}>
                            <Text style={styles.transactionTitle} numberOfLines={1}>
                                {transaction.description || category?.name || '未命名交易'}
                            </Text>
                            <Text style={styles.transactionMeta} numberOfLines={1}>
                                {formatDateTime(transaction.date)}
                                {sourceLedger ? ` · 来自「${sourceLedger.name}」` : ''}
                            </Text>
                        </View>
                        <Text
                            style={[
                                styles.transactionAmount,
                                transaction.type === 'EXPENSE'
                                    ? styles.transactionAmountExpense
                                    : styles.transactionAmountIncome,
                            ]}
                        >
                            {transaction.type === 'EXPENSE' ? '-' : '+'}
                            ¥{transaction.amount.toFixed(2)}
                        </Text>
                    </View>

                    {quickLedgers.length > 0 && (
                        <View style={styles.quickSection}>
                            <Text style={styles.sectionTitle}>快速选择</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.quickList}
                            >
                                {quickLedgers.map(ledger => (
                                    <TouchableOpacity
                                        key={`quick-${ledger.id}`}
                                        style={styles.quickChip}
                                        onPress={() => onSelectLedger(ledger)}
                                        activeOpacity={0.8}
                                        disabled={Boolean(loadingLedgerId)}
                                    >
                                        <Text style={styles.quickChipText}>
                                            {getLedgerIcon(ledger.type)} {ledger.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    <View style={styles.listHeader}>
                        <Text style={styles.listHeaderTitle}>选择目标账本</Text>
                        <Text style={styles.listHeaderHint}>支持跨账本整理，保持收支井然有序</Text>
                    </View>

                    {availableLedgers.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyIcon}>📚</Text>
                            <Text style={styles.emptyText}>暂无可用的其他账本</Text>
                            <Text style={styles.emptyHint}>可以先创建一个新的账本再试试</Text>
                        </View>
                    ) : (
                        <ScrollView
                            style={styles.ledgerList}
                            showsVerticalScrollIndicator={false}
                        >
                            {availableLedgers.map(renderLedgerOption)}
                        </ScrollView>
                    )}
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
        marginBottom: Spacing.sm,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.md,
    },
    title: {
        fontSize: FontSizes.lg,
        fontWeight: FontWeights.bold,
        color: Colors.text,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        lineHeight: 18,
        maxWidth: '88%',
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
    },
    transactionSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.lg,
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.backgroundSecondary,
    },
    transactionIconWrapper: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.surface,
        marginRight: Spacing.md,
    },
    transactionIcon: {
        fontSize: 28,
    },
    transactionInfo: {
        flex: 1,
        marginRight: Spacing.sm,
    },
    transactionTitle: {
        fontSize: FontSizes.md,
        fontWeight: FontWeights.semibold,
        color: Colors.text,
        marginBottom: 4,
    },
    transactionMeta: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
    },
    transactionAmount: {
        fontSize: FontSizes.lg,
        fontWeight: FontWeights.bold,
    },
    transactionAmountExpense: {
        color: Colors.expense,
    },
    transactionAmountIncome: {
        color: Colors.income,
    },
    quickSection: {
        paddingHorizontal: Spacing.lg,
        marginBottom: Spacing.md,
    },
    sectionTitle: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginBottom: Spacing.sm,
    },
    quickList: {
        flexDirection: 'row',
    },
    quickChip: {
        paddingVertical: Spacing.xs,
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        marginRight: Spacing.sm,
    },
    quickChipText: {
        fontSize: FontSizes.sm,
        color: Colors.text,
        fontWeight: FontWeights.medium,
    },
    listHeader: {
        paddingHorizontal: Spacing.lg,
        marginBottom: Spacing.sm,
    },
    listHeaderTitle: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        fontWeight: FontWeights.medium,
        marginBottom: 2,
    },
    listHeaderHint: {
        fontSize: FontSizes.xs,
        color: Colors.textLight,
    },
    ledgerList: {
        maxHeight: '45%',
        paddingHorizontal: Spacing.md,
    },
    ledgerItem: {
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing.sm,
        overflow: 'hidden',
        backgroundColor: Colors.background,
    },
    ledgerItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    ledgerIconWrapper: {
        width: 42,
        height: 42,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.backgroundSecondary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    ledgerIcon: {
        fontSize: 20,
    },
    ledgerInfo: {
        flex: 1,
        marginRight: Spacing.sm,
    },
    ledgerName: {
        fontSize: FontSizes.md,
        fontWeight: FontWeights.semibold,
        color: Colors.text,
    },
    ledgerMeta: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    ledgerArrow: {
        fontSize: FontSizes.lg,
        color: Colors.textLight,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.xl,
    },
    emptyIcon: {
        fontSize: 36,
        marginBottom: Spacing.sm,
    },
    emptyText: {
        fontSize: FontSizes.md,
        color: Colors.text,
        fontWeight: FontWeights.semibold,
        marginBottom: Spacing.xs,
    },
    emptyHint: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
    },
});
