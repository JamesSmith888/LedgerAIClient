/**
 * 设置页面
 * 提供各种系统设置入口
 */
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows, FontWeights } from '../constants/theme';
import { Icon, FeatherIcons, AppIcons, IconType } from '../components/common';

interface SettingItem {
    icon: string;
    iconType?: IconType;
    title: string;
    subtitle?: string;
    route?: string;
    onPress?: () => void;
    showArrow?: boolean;
    iconColor?: string;
}

interface SettingSection {
    title: string;
    items: SettingItem[];
}

export const SettingsScreen: React.FC = () => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    // 设置项配置
    const settingSections: SettingSection[] = [
        {
            title: 'AI 设置',
            items: [
                {
                    icon: AppIcons.lockOutline,
                    title: 'API Key 配置',
                    subtitle: '配置您的 AI 模型 API Key',
                    route: 'APIKeySettings',
                    showArrow: true,
                    iconColor: Colors.info,
                },
                {
                    icon: 'brain',
                    iconType: 'material-community',
                    title: '智能记忆',
                    subtitle: '管理 AI 学习到的用户偏好',
                    route: 'UserPreferenceMemory',
                    showArrow: true,
                    iconColor: '#8B5CF6',
                },
            ],
        },
        {
            title: '数据管理',
            items: [
                {
                    icon: AppIcons.cloudOutline,
                    title: '数据存储',
                    subtitle: '配置数据存储位置与智能记忆',
                    route: 'DataStorageSettings',
                    showArrow: true,
                    iconColor: Colors.success,
                },
                {
                    icon: AppIcons.downloadOutline,
                    title: '导出数据',
                    subtitle: '将账本数据导出为标准格式',
                    route: 'DataExport',
                    showArrow: true,
                    iconColor: Colors.primary,
                },
                // 后续可以添加更多功能
                // {
                //     icon: AppIcons.cloudUploadOutline,
                //     title: '导入数据',
                //     subtitle: '从其他应用导入数据',
                //     route: 'DataImport',
                //     showArrow: true,
                //     iconColor: Colors.success,
                // },
            ],
        },
        {
            title: '通用设置',
            items: [
                // {
                //     icon: AppIcons.notificationsOutline,
                //     title: '通知设置',
                //     subtitle: '管理提醒和通知',
                //     route: 'NotificationSettings',
                //     showArrow: true,
                //     iconColor: Colors.warning,
                // },
                // {
                //     icon: AppIcons.colorPaletteOutline,
                //     title: '主题设置',
                //     subtitle: '自定义应用外观',
                //     route: 'ThemeSettings',
                //     showArrow: true,
                //     iconColor: Colors.info,
                // },
            ],
        },
        {
            title: '关于',
            items: [
                // {
                //     icon: AppIcons.informationCircleOutline,
                //     title: '关于应用',
                //     subtitle: '版本信息和更新',
                //     route: 'About',
                //     showArrow: true,
                //     iconColor: Colors.textSecondary,
                // },
            ],
        },
    ];

    // 过滤掉空的section
    const filteredSections = settingSections.filter(section => section.items.length > 0);

    const handleItemPress = (item: SettingItem) => {
        if (item.onPress) {
            item.onPress();
        } else if (item.route) {
            (navigation as any).navigate(item.route);
        }
    };

    const renderSettingItem = (item: SettingItem, isLast: boolean) => (
        <View key={item.title}>
            <TouchableOpacity
                style={styles.settingItem}
                onPress={() => handleItemPress(item)}
                activeOpacity={0.7}
            >
                <View style={[styles.iconContainer, { backgroundColor: (item.iconColor || Colors.primary) + '15' }]}>
                    <Icon
                        type={item.iconType || 'ionicons'}
                        name={item.icon}
                        size={22}
                        color={item.iconColor || Colors.primary}
                    />
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    {item.subtitle && (
                        <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                    )}
                </View>
                {item.showArrow && (
                    <Icon
                        name={AppIcons.chevronForward}
                        size={20}
                        color={Colors.textLight}
                    />
                )}
            </TouchableOpacity>
            {!isLast && <View style={styles.divider} />}
        </View>
    );

    const renderSection = (section: SettingSection) => (
        <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
                {section.items.map((item, index) =>
                    renderSettingItem(item, index === section.items.length - 1)
                )}
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* 头部导航 */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backButtonText}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>设置</Text>
                <View style={styles.placeholder} />
            </View>

            {/* 设置列表 */}
            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
            >
                {filteredSections.map(renderSection)}

                {/* 版本信息 */}
                <View style={styles.versionContainer}>
                    <Text style={styles.versionText}>LedgerAI v1.0.0</Text>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
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
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        gap: Spacing.md,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textContainer: {
        flex: 1,
    },
    itemTitle: {
        fontSize: FontSizes.md,
        fontWeight: FontWeights.medium,
        color: Colors.text,
    },
    itemSubtitle: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.divider,
        marginLeft: 40 + Spacing.md,
    },
    versionContainer: {
        alignItems: 'center',
        paddingVertical: Spacing.xl,
    },
    versionText: {
        fontSize: FontSizes.sm,
        color: Colors.textLight,
    },
});
