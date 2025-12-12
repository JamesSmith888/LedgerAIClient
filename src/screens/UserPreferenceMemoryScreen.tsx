/**
 * 智能记忆管理屏幕
 * 
 * 展示和管理 AI 学习的用户个性化偏好
 * 例如：青桔 -> 青桔单车（交通）
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, FontSizes, BorderRadius, FontWeights } from '../constants/theme';
import { Icon, AppIcons } from '../components/common';
import {
    userPreferenceMemory,
    PreferenceItem,
    PreferenceType,
} from '../services/userPreferenceMemory';

// 偏好类型的中文名称和图标
const PREFERENCE_TYPE_META: Record<PreferenceType, { name: string; icon: string }> = {
    category_mapping: { name: '分类映射', icon: '🏷️' },
    merchant_alias: { name: '商户别名', icon: '🏪' },
    amount_pattern: { name: '金额模式', icon: '💰' },
    payment_preference: { name: '支付偏好', icon: '💳' },
    custom_correction: { name: '自定义', icon: '✏️' },
};

export const UserPreferenceMemoryScreen: React.FC = () => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    // 状态
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [preferences, setPreferences] = useState<PreferenceItem[]>([]);
    const [stats, setStats] = useState({ total: 0, enabled: 0, byType: {} as Record<PreferenceType, number> });

    // 加载数据
    const loadData = useCallback(async () => {
        try {
            const [prefsData, statsData] = await Promise.all([
                userPreferenceMemory.getAllPreferences(),
                userPreferenceMemory.getStats(),
            ]);
            // 按更新时间倒序排列
            prefsData.sort((a, b) => b.updatedAt - a.updatedAt);
            setPreferences(prefsData);
            setStats(statsData);
        } catch (error) {
            console.error('Failed to load preferences:', error);
            Alert.alert('加载失败', '无法加载智能记忆数据');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // 页面聚焦时刷新数据
    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    // 下拉刷新
    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        loadData();
    }, [loadData]);

    // 切换偏好启用状态
    const handleTogglePreference = async (item: PreferenceItem) => {
        try {
            await userPreferenceMemory.togglePreference(item.id, !item.enabled);
            await loadData();
        } catch (error) {
            Alert.alert('操作失败', '无法切换记忆状态');
        }
    };

    // 删除单条记忆
    const handleDeletePreference = (item: PreferenceItem) => {
        Alert.alert(
            '删除记忆',
            `确定删除 "${item.keyword}" → "${item.correction}" 这条记录吗？`,
            [
                { text: '取消', style: 'cancel' },
                {
                    text: '删除',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await userPreferenceMemory.deletePreference(item.id);
                            await loadData();
                        } catch (error) {
                            Alert.alert('删除失败', '无法删除该记忆');
                        }
                    },
                },
            ]
        );
    };

    // 清除所有记忆
    const handleClearAll = () => {
        if (preferences.length === 0) {
            Alert.alert('提示', '暂无记忆可清除');
            return;
        }

        Alert.alert(
            '清除所有记忆',
            `确定要清除全部 ${stats.total} 条学习记录吗？\n\nAI 将不再记住您的偏好设置。此操作不可恢复。`,
            [
                { text: '取消', style: 'cancel' },
                {
                    text: '清除全部',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await userPreferenceMemory.clearAll();
                            await loadData();
                            Alert.alert('已清除', '所有智能记忆已删除');
                        } catch (error) {
                            Alert.alert('清除失败', '无法清除记忆');
                        }
                    },
                },
            ]
        );
    };

    // 渲染单条记忆
    const renderPreferenceItem = (item: PreferenceItem) => {
        const typeMeta = PREFERENCE_TYPE_META[item.type];
        
        return (
            <View key={item.id} style={styles.prefItem}>
                <TouchableOpacity
                    style={styles.prefMain}
                    onPress={() => handleTogglePreference(item)}
                    activeOpacity={0.7}
                >
                    <View style={styles.prefHeader}>
                        <Text style={styles.prefTypeIcon}>{typeMeta.icon}</Text>
                        <Text style={styles.prefTypeName}>{typeMeta.name}</Text>
                        <View style={[
                            styles.prefStatusBadge,
                            { backgroundColor: item.enabled ? Colors.success + '20' : Colors.textLight + '20' }
                        ]}>
                            <Text style={[
                                styles.prefStatusText,
                                { color: item.enabled ? Colors.success : Colors.textLight }
                            ]}>
                                {item.enabled ? '启用' : '禁用'}
                            </Text>
                        </View>
                    </View>
                    
                    <View style={styles.prefContent}>
                        <Text style={styles.prefKeyword}>"{item.keyword}"</Text>
                        <Text style={styles.prefArrow}>→</Text>
                        <Text style={styles.prefCorrection}>"{item.correction}"</Text>
                    </View>
                    
                    {item.note && (
                        <Text style={styles.prefNote}>{item.note}</Text>
                    )}
                    
                    <View style={styles.prefMeta}>
                        <Text style={styles.prefMetaText}>
                            使用 {item.usageCount} 次
                        </Text>
                        <Text style={styles.prefMetaText}>·</Text>
                        <Text style={styles.prefMetaText}>
                            {new Date(item.updatedAt).toLocaleDateString('zh-CN')}
                        </Text>
                    </View>
                </TouchableOpacity>
                
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeletePreference(item)}
                >
                    <Icon name={AppIcons.trashOutline} size={18} color={Colors.error} />
                </TouchableOpacity>
            </View>
        );
    };

    // 渲染统计信息
    const renderStats = () => {
        if (stats.total === 0) return null;

        return (
            <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{stats.total}</Text>
                    <Text style={styles.statLabel}>总记忆</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: Colors.success }]}>{stats.enabled}</Text>
                    <Text style={styles.statLabel}>已启用</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: Colors.textLight }]}>{stats.total - stats.enabled}</Text>
                    <Text style={styles.statLabel}>已禁用</Text>
                </View>
            </View>
        );
    };

    // 渲染空状态
    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🧠</Text>
            <Text style={styles.emptyTitle}>暂无智能记忆</Text>
            <Text style={styles.emptyDesc}>
                在与 AI 对话时纠正它的理解，{'\n'}
                AI 会自动学习并记住您的偏好
            </Text>
            <View style={styles.exampleContainer}>
                <Text style={styles.exampleTitle}>💡 示例</Text>
                <Text style={styles.exampleText}>
                    告诉 AI："青桔是共享单车，不是水果"{'\n'}
                    AI 会记住：青桔 → 交通出行
                </Text>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* 头部 */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backButtonText}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>智能记忆</Text>
                {preferences.length > 0 ? (
                    <TouchableOpacity
                        style={styles.clearAllButton}
                        onPress={handleClearAll}
                    >
                        <Text style={styles.clearAllText}>清除全部</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.placeholder} />
                )}
            </View>

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={Colors.primary}
                    />
                }
            >
                {/* 说明文字 */}
                <View style={styles.introSection}>
                    <Text style={styles.introText}>
                        AI 会学习您的纠正和偏好，在后续交互中自动应用这些记忆。
                    </Text>
                </View>

                {/* 统计信息 */}
                {renderStats()}

                {/* 记忆列表 */}
                {preferences.length > 0 ? (
                    <View style={styles.listSection}>
                        <Text style={styles.sectionTitle}>记忆列表</Text>
                        <View style={styles.listContainer}>
                            {preferences.map(renderPreferenceItem)}
                        </View>
                    </View>
                ) : (
                    renderEmpty()
                )}

                {/* 底部留白 */}
                <View style={{ height: Spacing.xl * 2 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButtonText: {
        fontSize: 32,
        color: Colors.text,
        fontWeight: '300',
    },
    headerTitle: {
        fontSize: FontSizes.lg,
        fontWeight: FontWeights.bold,
        color: Colors.text,
    },
    placeholder: {
        width: 60,
    },
    clearAllButton: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
    },
    clearAllText: {
        fontSize: FontSizes.sm,
        color: Colors.error,
        fontWeight: FontWeights.medium,
    },
    scrollView: {
        flex: 1,
    },
    introSection: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
    },
    introText: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        lineHeight: 20,
    },
    // 统计信息
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.lg,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        fontSize: FontSizes.xl,
        fontWeight: FontWeights.bold,
        color: Colors.primary,
    },
    statLabel: {
        fontSize: FontSizes.xs,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: Colors.divider,
    },
    // 列表
    listSection: {
        marginTop: Spacing.sm,
    },
    sectionTitle: {
        fontSize: FontSizes.xs,
        fontWeight: FontWeights.semibold,
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.sm,
    },
    listContainer: {
        backgroundColor: Colors.surface,
        paddingHorizontal: Spacing.lg,
    },
    prefItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
    },
    prefMain: {
        flex: 1,
    },
    prefHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    prefTypeIcon: {
        fontSize: 14,
        marginRight: 4,
    },
    prefTypeName: {
        fontSize: FontSizes.xs,
        color: Colors.textSecondary,
        marginRight: Spacing.sm,
    },
    prefStatusBadge: {
        paddingHorizontal: Spacing.xs,
        paddingVertical: 2,
        borderRadius: BorderRadius.sm,
    },
    prefStatusText: {
        fontSize: FontSizes.xs,
        fontWeight: FontWeights.medium,
    },
    prefContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: Spacing.xs,
    },
    prefKeyword: {
        fontSize: FontSizes.md,
        fontWeight: FontWeights.medium,
        color: Colors.primary,
    },
    prefArrow: {
        fontSize: FontSizes.md,
        color: Colors.textLight,
    },
    prefCorrection: {
        fontSize: FontSizes.md,
        fontWeight: FontWeights.medium,
        color: Colors.success,
    },
    prefNote: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginTop: Spacing.xs,
    },
    prefMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: Spacing.xs,
        gap: Spacing.xs,
    },
    prefMetaText: {
        fontSize: FontSizes.xs,
        color: Colors.textLight,
    },
    deleteButton: {
        padding: Spacing.sm,
        marginLeft: Spacing.sm,
    },
    // 空状态
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: Spacing.xl * 2,
        paddingHorizontal: Spacing.lg,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: Spacing.md,
    },
    emptyTitle: {
        fontSize: FontSizes.lg,
        fontWeight: FontWeights.semibold,
        color: Colors.text,
        marginBottom: Spacing.sm,
    },
    emptyDesc: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    exampleContainer: {
        backgroundColor: Colors.surface,
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        marginTop: Spacing.lg,
        width: '100%',
    },
    exampleTitle: {
        fontSize: FontSizes.sm,
        fontWeight: FontWeights.medium,
        color: Colors.text,
        marginBottom: Spacing.xs,
    },
    exampleText: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        lineHeight: 20,
    },
});
