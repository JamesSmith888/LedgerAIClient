/**
 * 📚 学习点：可复用的账本选择器组件
 *
 * 这是一个通用组件，可以在多个页面使用
 * 支持两种模式：
 * 1. dropdown - 下拉选择模式（用于页面顶部）
 * 2. modal - 弹窗选择模式（用于新增交易）
 */
import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    FlatList,
    StyleSheet,
    ScrollView,
} from 'react-native';
import { Colors, FontSizes, FontWeights, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import type { Ledger } from '../../types/ledger';
import { LedgerType } from '../../types/ledger';

// ========== 🔧 Props 类型定义 ==========
interface LedgerSelectorProps {
    // 账本列表
    ledgers: Ledger[];

    // 当前选中的账本
    currentLedger: Ledger | null;

    // 选择回调 - 支持 null 以表示"全部账本"
    onSelect: (ledger: Ledger | null) => void;

    // 显示模式
    mode?: 'dropdown' | 'compact' | 'button' | 'flat';

    // 是否显示"全部账本"选项
    showAllOption?: boolean;

    // 自定义样式
    style?: any;

    // 是否禁用
    disabled?: boolean;
}

// ========== 🎨 主组件 ==========
export const LedgerSelector: React.FC<LedgerSelectorProps> = ({
    ledgers,
    currentLedger,
    onSelect,
    mode = 'dropdown',
    showAllOption = false,
    style,
    disabled = false,
}) => {
    const [modalVisible, setModalVisible] = useState(false);

    // ========== 🎯 事件处理 ==========

    /**
     * 处理账本选择
     */
    const handleSelect = (ledger: Ledger | null) => {
        onSelect(ledger);
        setModalVisible(false);
    };

    /**
     * 获取账本图标
     */
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

    // ========== 🎨 渲染账本项 ==========

    /**
     * 📚 学习点：渲染单个账本选项
     * 统一的账本项样式，在列表中复用
     */
    const renderLedgerItem = (item: Ledger | null, isActive: boolean) => {
        const isAllOption = item === null;
        const icon = isAllOption ? '📚' : getLedgerIcon(item.type);
        const name = isAllOption ? '全部账本' : item.name;
        const typeName = isAllOption ? '' : item.typeName;

        return (
            <TouchableOpacity
                key={isAllOption ? 'all' : item.id}
                style={[
                    styles.ledgerItem,
                    isActive && styles.ledgerItemActive,
                ]}
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
            >
                <View style={styles.ledgerItemContent}>
                    {/* 左侧图标 */}
                    <View
                        style={[
                            styles.ledgerItemIconContainer,
                            isActive && styles.ledgerItemIconContainerActive,
                        ]}
                    >
                        <Text style={styles.ledgerItemIcon}>{icon}</Text>
                    </View>

                    {/* 中间信息 */}
                    <View style={styles.ledgerItemInfo}>
                        <Text
                            style={[
                                styles.ledgerItemName,
                                isActive && styles.ledgerItemNameActive,
                            ]}
                        >
                            {name}
                        </Text>
                        {typeName && (
                            <Text style={styles.ledgerItemType}>{typeName}</Text>
                        )}
                    </View>

                    {/* 右侧选中标记 */}
                    {isActive && (
                        <Text style={styles.ledgerItemCheck}>✓</Text>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    // ========== 🎨 渲染模态框 ==========

    /**
     * 📚 学习点：模态框选择器
     * 从底部滑出的选择器，用户体验更好
     */
    const renderModal = () => (
        <Modal
            visible={modalVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setModalVisible(false)}
        >
            <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    {/* 顶部标题栏 */}
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>选择账本</Text>
                        <TouchableOpacity
                            onPress={() => setModalVisible(false)}
                            style={styles.modalCloseButton}
                        >
                            <Text style={styles.modalCloseText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* 账本列表 */}
                    <ScrollView
                        style={styles.modalList}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* "全部账本"选项 */}
                        {showAllOption && renderLedgerItem(null, currentLedger === null)}

                        {/* 账本列表 */}
                        {ledgers.map(ledger =>
                            renderLedgerItem(
                                ledger,
                                currentLedger?.id === ledger.id
                            )
                        )}
                    </ScrollView>
                </View>
            </TouchableOpacity>
        </Modal>
    );

    // ========== 🎨 根据模式渲染触发器 ==========

    /**
     * 📚 学习点：下拉模式（用于页面顶部）
     * 显示当前账本名称，点击弹出选择器
     * 类似超链接的轻量风格
     */
    const renderDropdownTrigger = () => (
        <TouchableOpacity
            style={[styles.dropdownTrigger, style]}
            onPress={() => !disabled && setModalVisible(true)}
            activeOpacity={0.6}
            disabled={disabled}
        >
            <Text style={styles.dropdownIcon}>
                {currentLedger ? getLedgerIcon(currentLedger.type) : '📚'}
            </Text>
            <Text style={styles.dropdownTitle} numberOfLines={1}>
                {currentLedger?.name || '全部账本'}
            </Text>
            <Text style={styles.dropdownArrow}>▾</Text>
        </TouchableOpacity>
    );

    /**
     * 📚 学习点：紧凑模式（用于输入表单）
     * 更小巧的显示，适合在表单中使用
     */
    const renderCompactTrigger = () => (
        <TouchableOpacity
            style={[styles.compactTrigger, style]}
            onPress={() => !disabled && setModalVisible(true)}
            activeOpacity={0.7}
            disabled={disabled}
        >
            <Text style={styles.compactIcon}>
                {currentLedger ? getLedgerIcon(currentLedger.type) : '📚'}
            </Text>
            <Text style={styles.compactText} numberOfLines={1}>
                {currentLedger?.name || '全部账本'}
            </Text>
            <Text style={styles.compactArrow}>▼</Text>
        </TouchableOpacity>
    );

    /**
     * 📚 学习点：按钮模式（用于独立按钮）
     * 类似普通按钮的样式
     */
    const renderButtonTrigger = () => (
        <TouchableOpacity
            style={[styles.buttonTrigger, style]}
            onPress={() => !disabled && setModalVisible(true)}
            activeOpacity={0.8}
            disabled={disabled}
        >
            <Text style={styles.buttonIcon}>
                {currentLedger ? getLedgerIcon(currentLedger.type) : '📚'}
            </Text>
            <Text style={styles.buttonText}>
                {currentLedger?.name || '全部账本'}
            </Text>
        </TouchableOpacity>
    );

    /**
     * 📚 学习点：表单内联模式（用于设置页面）
     * 与表单中的其他行项目具有一致的外观
     */
    const renderFlatTrigger = () => (
        <TouchableOpacity
            style={[styles.flatTrigger, style]}
            onPress={() => !disabled && setModalVisible(true)}
            activeOpacity={0.7}
            disabled={disabled}
        >
            <View style={styles.flatTriggerLeft}>
                <Text style={styles.flatTriggerIcon}>
                    {currentLedger ? getLedgerIcon(currentLedger.type) : '📖'}
                </Text>
                <Text style={styles.flatTriggerLabel}>账本</Text>
            </View>
            <View style={styles.flatTriggerRight}>
                <Text style={styles.flatTriggerValue}>
                    {currentLedger?.name || '默认账本'}
                </Text>
                <Text style={styles.flatTriggerArrow}>›</Text>
            </View>
        </TouchableOpacity>
    );

    // ========== 🎯 主渲染 ==========

    return (
        <>
            {/* 根据模式渲染不同的触发器 */}
            {mode === 'dropdown' && renderDropdownTrigger()}
            {mode === 'compact' && renderCompactTrigger()}
            {mode === 'button' && renderButtonTrigger()}
            {mode === 'flat' && renderFlatTrigger()}

            {/* 选择模态框 */}
            {renderModal()}
        </>
    );
};

// ========== 🎨 样式定义 ==========

const styles = StyleSheet.create({
    // ========== 下拉触发器样式（超链接风格）==========
    dropdownTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start', // 不占满整行，内容决定宽度
        backgroundColor: 'transparent',
        paddingHorizontal: 0,
        paddingVertical: 0,
    },
    dropdownIcon: {
        fontSize: 20,
        marginRight: Spacing.xs,
    },
    dropdownTitle: {
        fontSize: FontSizes.xl,
        fontWeight: FontWeights.bold,
        color: Colors.text,
        marginRight: Spacing.xs,
    },
    dropdownArrow: {
        fontSize: FontSizes.md,
        color: Colors.textSecondary,
        fontWeight: FontWeights.bold,
        marginTop: 2, // 微调垂直对齐
    },

    // ========== 紧凑触发器样式 ==========
    compactTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm + 2,
        borderRadius: BorderRadius.lg,
        borderWidth: 0,
        ...Shadows.sm,
    },
    compactIcon: {
        fontSize: 16,
        marginRight: Spacing.xs,
    },
    compactText: {
        flex: 1,
        fontSize: FontSizes.md,
        color: Colors.text,
        fontWeight: FontWeights.medium,
    },
    compactArrow: {
        fontSize: 10,
        color: Colors.textSecondary,
        marginLeft: Spacing.xs,
    },

    // ========== 按钮触发器样式 ==========
    buttonTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        ...Shadows.md,
    },
    buttonIcon: {
        fontSize: 20,
        marginRight: Spacing.sm,
    },
    buttonText: {
        fontSize: FontSizes.md,
        fontWeight: FontWeights.semibold,
        color: Colors.surface,
    },

    // ========== 表单内联触发器样式 ==========
    flatTrigger: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        // 与 AddTransactionScreen 中的 detailRow 样式对齐
    },
    flatTriggerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    flatTriggerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    flatTriggerIcon: {
        fontSize: 22,
        marginRight: Spacing.md,
        width: 24,
        textAlign: 'center',
    },
    flatTriggerLabel: {
        fontSize: FontSizes.lg,
        color: Colors.text,
    },
    flatTriggerValue: {
        fontSize: FontSizes.lg,
        color: Colors.textSecondary,
        marginRight: Spacing.sm,
    },
    flatTriggerArrow: {
        fontSize: FontSizes.lg,
        color: Colors.textLight,
    },

    // ========== 模态框样式 ==========
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        maxHeight: '70%',
        paddingBottom: Spacing.xl,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    modalTitle: {
        fontSize: FontSizes.lg,
        fontWeight: FontWeights.bold,
        color: Colors.text,
    },
    modalCloseButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.backgroundSecondary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCloseText: {
        fontSize: FontSizes.lg,
        color: Colors.textSecondary,
        fontWeight: '300',
    },
    modalList: {
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.sm,
    },

    // ========== 账本项样式 ==========
    ledgerItem: {
        marginVertical: Spacing.xs,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
    },
    ledgerItemActive: {
        backgroundColor: Colors.primary + '10',
        borderWidth: 2,
        borderColor: Colors.primary,
    },
    ledgerItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        backgroundColor: Colors.background,
    },
    ledgerItemIconContainer: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.backgroundSecondary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    ledgerItemIconContainerActive: {
        backgroundColor: Colors.primary + '20',
    },
    ledgerItemIcon: {
        fontSize: 22,
    },
    ledgerItemInfo: {
        flex: 1,
    },
    ledgerItemName: {
        fontSize: FontSizes.md,
        fontWeight: FontWeights.semibold,
        color: Colors.text,
        marginBottom: 2,
    },
    ledgerItemNameActive: {
        color: Colors.primary,
    },
    ledgerItemType: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
    },
    ledgerItemCheck: {
        fontSize: FontSizes.xl,
        color: Colors.primary,
        fontWeight: FontWeights.bold,
        marginLeft: Spacing.sm,
    },
});
