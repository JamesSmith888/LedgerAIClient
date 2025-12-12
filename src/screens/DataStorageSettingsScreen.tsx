/**
 * 数据存储设置屏幕
 * 
 * 允许用户配置数据存储位置（云端/本地）
 * 支持全局开关和细粒度功能级别配置
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Switch,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, FontSizes, BorderRadius, FontWeights } from '../constants/theme';
import { Icon, AppIcons } from '../components/common';
import {
    dataStorageSettings,
    DataStorageSettings,
    DataFeatureType,
    FEATURE_METADATA,
    StorageLocation,
} from '../services/dataStorageSettings';

export const DataStorageSettingsScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    
    // 状态
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<DataStorageSettings | null>(null);

    // 加载数据
    const loadData = useCallback(async () => {
        try {
            const settingsData = await dataStorageSettings.getAll();
            setSettings(settingsData);
        } catch (error) {
            console.error('Failed to load settings:', error);
            Alert.alert('加载失败', '无法加载存储设置');
        } finally {
            setLoading(false);
        }
    }, []);

    // 页面聚焦时刷新数据（统计可能有变化）
    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    // 切换全局存储位置
    const handleGlobalToggle = async (isCloud: boolean) => {
        if (!settings) return;

        Alert.alert(
            isCloud ? '切换到云端存储' : '切换到本地存储',
            isCloud
                ? '数据将存储在云端服务器，支持多设备同步'
                : '数据将仅存储在本设备，更加隐私安全',
            [
                { text: '取消', style: 'cancel' },
                {
                    text: '仅修改默认设置',
                    onPress: async () => {
                        await dataStorageSettings.setGlobalDefault(isCloud ? 'cloud' : 'local', false);
                        await loadData();
                    },
                },
                {
                    text: '应用到所有功能',
                    style: 'default',
                    onPress: async () => {
                        await dataStorageSettings.setGlobalDefault(isCloud ? 'cloud' : 'local', true);
                        await loadData();
                    },
                },
            ]
        );
    };

    // 切换单个功能的存储位置
    const handleFeatureToggle = async (feature: DataFeatureType, isCloud: boolean) => {
        const metadata = FEATURE_METADATA[feature];
        
        // 检查云端支持
        if (isCloud && !metadata.cloudSupported) {
            Alert.alert(
                '暂不支持云端',
                `"${metadata.name}" 功能暂时只支持本地存储，未来版本将添加云端支持。`
            );
            return;
        }

        try {
            await dataStorageSettings.setFeatureConfig(feature, {
                location: isCloud ? 'cloud' : 'local',
            });
            await loadData();
        } catch (error) {
            Alert.alert('设置失败', (error as Error).message);
        }
    };

    // 渲染功能项
    const renderFeatureItem = (featureId: DataFeatureType) => {
        const metadata = FEATURE_METADATA[featureId];
        const config = settings?.features[featureId];
        const isCloud = config?.location === 'cloud';
        
        return (
            <View key={featureId} style={styles.featureItem}>
                <View style={styles.featureIcon}>
                    <Text style={styles.featureEmoji}>{metadata.icon}</Text>
                </View>
                <View style={styles.featureInfo}>
                    <Text style={styles.featureName}>{metadata.name}</Text>
                    <Text style={styles.featureDesc}>{metadata.description}</Text>
                    {!metadata.cloudSupported && (
                        <View style={styles.localOnlyBadge}>
                            <Text style={styles.localOnlyText}>仅支持本地</Text>
                        </View>
                    )}
                </View>
                <View style={styles.featureToggle}>
                    <Text style={styles.toggleLabel}>
                        {isCloud ? '☁️' : '📱'}
                    </Text>
                    <Switch
                        value={isCloud}
                        onValueChange={(value) => handleFeatureToggle(featureId, value)}
                        trackColor={{ false: Colors.border, true: Colors.primary + '60' }}
                        thumbColor={isCloud ? Colors.primary : Colors.textLight}
                        disabled={!metadata.cloudSupported}
                    />
                </View>
            </View>
        );
    };

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
                <Text style={styles.headerTitle}>数据存储</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* 全局设置 */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>全局设置</Text>
                    <View style={styles.sectionContent}>
                        <View style={styles.globalRow}>
                            <View style={styles.globalInfo}>
                                <Text style={styles.globalLabel}>默认存储位置</Text>
                                <Text style={styles.globalValue}>
                                    {settings?.globalDefault === 'cloud' ? '☁️ 云端' : '📱 本地'}
                                </Text>
                            </View>
                            <Switch
                                value={settings?.globalDefault === 'cloud'}
                                onValueChange={handleGlobalToggle}
                                trackColor={{ false: Colors.border, true: Colors.primary + '60' }}
                                thumbColor={settings?.globalDefault === 'cloud' ? Colors.primary : Colors.textLight}
                            />
                        </View>
                        <Text style={styles.globalHint}>
                            {settings?.globalDefault === 'cloud'
                                ? '云端存储支持多设备同步，数据更安全'
                                : '本地存储更加隐私，但仅限本设备访问'}
                        </Text>
                    </View>
                </View>

                {/* 功能级别设置 */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>功能级别设置</Text>
                    <View style={styles.sectionContent}>
                        <Text style={styles.featureHint}>
                            可为每个功能单独配置存储位置
                        </Text>
                        {dataStorageSettings.getFeatureMetadataList().map(meta => 
                            renderFeatureItem(meta.id)
                        )}
                    </View>
                </View>

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
        width: 40,
    },
    scrollView: {
        flex: 1,
    },
    section: {
        marginTop: Spacing.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.sm,
    },
    sectionTitle: {
        fontSize: FontSizes.xs,
        fontWeight: FontWeights.semibold,
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.sm,
    },
    sectionContent: {
        backgroundColor: Colors.surface,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
    },
    // 全局设置
    globalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
    },
    globalInfo: {
        flex: 1,
    },
    globalLabel: {
        fontSize: FontSizes.md,
        fontWeight: FontWeights.medium,
        color: Colors.text,
    },
    globalValue: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    globalHint: {
        fontSize: FontSizes.sm,
        color: Colors.textLight,
        marginTop: Spacing.sm,
        paddingTop: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.divider,
    },
    // 功能设置
    featureHint: {
        fontSize: FontSizes.sm,
        color: Colors.textLight,
        marginBottom: Spacing.md,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
    },
    featureIcon: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    featureEmoji: {
        fontSize: 22,
    },
    featureInfo: {
        flex: 1,
    },
    featureName: {
        fontSize: FontSizes.md,
        fontWeight: FontWeights.medium,
        color: Colors.text,
    },
    featureDesc: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    localOnlyBadge: {
        backgroundColor: Colors.warning + '20',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: BorderRadius.sm,
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    localOnlyText: {
        fontSize: FontSizes.xs,
        color: Colors.warning,
        fontWeight: FontWeights.medium,
    },
    featureToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    toggleLabel: {
        fontSize: 16,
    },
});
