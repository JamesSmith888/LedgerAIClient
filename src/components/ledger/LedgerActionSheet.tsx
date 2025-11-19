/**
 * 账本操作底部抽屉
 * 参考 Telegram + Google Material Design 风格
 */
import React from 'react';
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Animated,
} from 'react-native';
import {
    BorderRadius,
    Colors,
    FontSizes,
    FontWeights,
    Shadows,
    Spacing,
} from '../../constants/theme';
import type { Ledger } from '../../types/ledger';
import { LedgerType } from '../../types/ledger';

interface ActionOption {
    icon: string;
    label: string;
    onPress: () => void;
    type?: 'default' | 'primary' | 'destructive' | 'disabled';
    disabled?: boolean;
}

interface LedgerActionSheetProps {
    visible: boolean;
    ledger: Ledger | null;
    isDefault: boolean;
    onClose: () => void;
    onSetDefault: () => void;
    onViewDetail: () => void;
    onDelete: () => void;
}

export const LedgerActionSheet: React.FC<LedgerActionSheetProps> = ({
    visible,
    ledger,
    isDefault,
    onClose,
    onSetDefault,
    onViewDetail,
    onDelete,
}) => {
    const slideAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, {
                toValue: 1,
                useNativeDriver: true,
                tension: 65,
                friction: 10,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    if (!ledger) {
        return null;
    }

    const isPersonal = ledger.type === LedgerType.PERSONAL;
    const ledgerIcon = isPersonal ? '📖' : '👨‍👩‍👧‍👦';

    const actions: ActionOption[] = [
        {
            icon: isDefault ? '⭐' : '☆',
            label: isDefault ? '默认账本' : '设为默认',
            onPress: onSetDefault,
            type: isDefault ? 'disabled' : 'primary',
            disabled: isDefault,
        },
        {
            icon: '👁',
            label: '查看详情',
            onPress: () => {
                onClose();
                onViewDetail();
            },
            type: 'default',
        },
        {
            icon: '🗑',
            label: '删除账本',
            onPress: () => {
                onClose();
                onDelete();
            },
            type: 'destructive',
        },
    ];

    const translateY = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [400, 0],
    });

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Animated.View
                    style={[
                        styles.sheet,
                        {
                            transform: [{ translateY }],
                        },
                    ]}
                >
                    <Pressable>
                        {/* 拖拽指示器 */}
                        <View style={styles.dragIndicator} />

                        {/* 账本信息头部 */}
                        <View style={styles.header}>
                            <View
                                style={[
                                    styles.ledgerIconContainer,
                                    {
                                        backgroundColor: isPersonal
                                            ? Colors.primary + '15'
                                            : Colors.accent.orange + '15',
                                    },
                                ]}
                            >
                                <Text style={styles.ledgerIcon}>{ledgerIcon}</Text>
                            </View>
                            <View style={styles.headerInfo}>
                                <View style={styles.headerTitleRow}>
                                    <Text style={styles.ledgerName}>{ledger.name}</Text>
                                    {isDefault && (
                                        <View style={styles.defaultBadge}>
                                            <Text style={styles.defaultBadgeText}>默认</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={styles.ledgerType}>
                                    {ledger.typeName}
                                    {!isPersonal && ledger.memberCount && ` · ${ledger.memberCount}人`}
                                </Text>
                                {ledger.description && (
                                    <Text style={styles.ledgerDescription} numberOfLines={2}>
                                        {ledger.description}
                                    </Text>
                                )}
                            </View>
                        </View>

                        {/* 分割线 */}
                        <View style={styles.divider} />

                        {/* 操作列表 */}
                        <View style={styles.actionsContainer}>
                            {actions.map((action, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.actionItem,
                                        action.disabled && styles.actionItemDisabled,
                                    ]}
                                    onPress={action.onPress}
                                    disabled={action.disabled}
                                    activeOpacity={0.6}
                                >
                                    <View style={styles.actionIconContainer}>
                                        <Text style={styles.actionIcon}>{action.icon}</Text>
                                    </View>
                                    <Text
                                        style={[
                                            styles.actionLabel,
                                            action.type === 'primary' && styles.actionLabelPrimary,
                                            action.type === 'destructive' && styles.actionLabelDestructive,
                                            action.disabled && styles.actionLabelDisabled,
                                        ]}
                                    >
                                        {action.label}
                                    </Text>
                                    {action.type === 'primary' && !action.disabled && (
                                        <View style={styles.actionArrow}>
                                            <Text style={styles.actionArrowText}>→</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* 取消按钮 */}
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={onClose}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.cancelButtonText}>取消</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Animated.View>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: Spacing.xl,
        maxHeight: '80%',
        ...Shadows.xl,
    },
    dragIndicator: {
        width: 36,
        height: 4,
        backgroundColor: Colors.border,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: Spacing.md,
        marginBottom: Spacing.lg,
    },

    // 头部信息
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: Spacing.xl,
        marginBottom: Spacing.lg,
    },
    ledgerIconContainer: {
        width: 56,
        height: 56,
        borderRadius: BorderRadius.xl,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    ledgerIcon: {
        fontSize: 28,
    },
    headerInfo: {
        flex: 1,
        paddingTop: Spacing.xs,
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    ledgerName: {
        fontSize: FontSizes.xl,
        fontWeight: FontWeights.bold,
        color: Colors.text,
        marginRight: Spacing.sm,
    },
    defaultBadge: {
        backgroundColor: Colors.accent.yellow + '20',
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs / 2,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: Colors.accent.yellow + '40',
    },
    defaultBadgeText: {
        fontSize: FontSizes.xs,
        fontWeight: FontWeights.semibold,
        color: Colors.accent.yellow,
    },
    ledgerType: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginBottom: Spacing.xs / 2,
    },
    ledgerDescription: {
        fontSize: FontSizes.sm,
        color: Colors.textLight,
        lineHeight: 20,
        marginTop: Spacing.xs / 2,
    },

    // 分割线
    divider: {
        height: 1,
        backgroundColor: Colors.divider,
        marginHorizontal: Spacing.xl,
        marginBottom: Spacing.md,
    },

    // 操作列表
    actionsContainer: {
        paddingHorizontal: Spacing.md,
    },
    actionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing.xs,
        backgroundColor: Colors.backgroundSecondary,
    },
    actionItemDisabled: {
        opacity: 0.5,
    },
    actionIconContainer: {
        width: 36,
        height: 36,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    actionIcon: {
        fontSize: 22,
    },
    actionLabel: {
        flex: 1,
        fontSize: FontSizes.lg,
        fontWeight: FontWeights.medium,
        color: Colors.text,
    },
    actionLabelPrimary: {
        color: Colors.primary,
        fontWeight: FontWeights.semibold,
    },
    actionLabelDestructive: {
        color: Colors.error,
        fontWeight: FontWeights.semibold,
    },
    actionLabelDisabled: {
        color: Colors.textLight,
    },
    actionArrow: {
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionArrowText: {
        fontSize: 16,
        color: Colors.primary,
        fontWeight: FontWeights.bold,
    },

    // 取消按钮
    cancelButton: {
        marginHorizontal: Spacing.xl,
        marginTop: Spacing.lg,
        paddingVertical: Spacing.md + 2,
        borderRadius: BorderRadius.xl,
        backgroundColor: Colors.surface,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    cancelButtonText: {
        fontSize: FontSizes.lg,
        fontWeight: FontWeights.semibold,
        color: Colors.text,
    },
});
