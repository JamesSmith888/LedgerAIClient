/**
 * 基础图表容器
 * 统一处理加载、错误、空状态
 */
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius, Shadows } from '../../constants/theme';

interface BaseChartProps {
    loading?: boolean;
    error?: string | null;
    isEmpty?: boolean;
    title?: string;
    subtitle?: string;
    emptyMessage?: string;
    headerRight?: React.ReactNode;
    children: React.ReactNode;
}

export const BaseChart: React.FC<BaseChartProps> = ({
    loading = false,
    error = null,
    isEmpty = false,
    title,
    subtitle,
    emptyMessage = '暂无数据',
    headerRight,
    children,
}) => {
    return (
        <View style={styles.container}>
            {/* 标题区域 */}
            {(title || subtitle || headerRight) && (
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        {title && <Text style={styles.title}>{title}</Text>}
                        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                    </View>
                    {headerRight && <View style={styles.headerRight}>{headerRight}</View>}
                </View>
            )}

            {/* 图表内容区域 */}
            <View style={styles.content}>
                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                        <Text style={styles.loadingText}>加载中...</Text>
                    </View>
                ) : error ? (
                    <View style={styles.centerContainer}>
                        <Text style={styles.errorIcon}>⚠️</Text>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : isEmpty ? (
                    <View style={styles.centerContainer}>
                        <Text style={styles.emptyIcon}>📊</Text>
                        <Text style={styles.emptyText}>{emptyMessage}</Text>
                    </View>
                ) : (
                    children
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        ...Shadows.sm,
    },
    header: {
        marginBottom: Spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    headerLeft: {
        flex: 1,
    },
    headerRight: {
        marginLeft: Spacing.md,
    },
    title: {
        fontSize: FontSizes.lg,
        fontWeight: FontWeights.bold,
        color: Colors.text,
        marginBottom: Spacing.xs,
    },
    subtitle: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
    },
    content: {
        minHeight: 200,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 200,
    },
    loadingText: {
        marginTop: Spacing.sm,
        fontSize: FontSizes.md,
        color: Colors.textSecondary,
    },
    errorIcon: {
        fontSize: 48,
        marginBottom: Spacing.sm,
    },
    errorText: {
        fontSize: FontSizes.md,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: Spacing.sm,
    },
    emptyText: {
        fontSize: FontSizes.md,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
});
