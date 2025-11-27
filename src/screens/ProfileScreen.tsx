import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView
} from 'react-native';
import { showConfirm } from '../utils/toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows, FontWeights } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useLedger } from '../context/LedgerContext';
import { Icon, FeatherIcons, AppIcons } from '../components/common';

export const ProfileScreen: React.FC = () => {
    const navigation = useNavigation();
    const { user, logout } = useAuth();
    const { ledgers, currentLedger, defaultLedgerId } = useLedger();
    const defaultLedger = defaultLedgerId ? ledgers.find(l => l.id === defaultLedgerId) : null;

    const handleLogout = () => {
        showConfirm(
            "确认退出",
            "您确定要退出登录吗？",
            async () => {
                await logout();
            }
        );
    }

    // 获取显示的用户名：优先显示昵称，然后是用户名
    const displayName = (user?.nickname) || (user?.username) || (user?.name) || '用户';

    return (
        <ScrollView style={styles.container}>
            {/* 头部用户信息 */}
            <View style={styles.header}>
                <View style={styles.avatarContainer}>
                    <Icon name={AppIcons.person} size={40} color={Colors.surface} />
                </View>
                <Text style={styles.username}>{displayName}</Text>
                <TouchableOpacity
                    style={styles.editProfileButton}
                    onPress={() => (navigation as any).navigate('EditProfile')}
                    activeOpacity={0.7}
                >
                    <Icon type="feather" name={FeatherIcons.edit2} size={16} color={Colors.text} />
                    <Text style={styles.editProfileText}>编辑</Text>
                </TouchableOpacity>
            </View>

            {/* 账本管理入口 */}
            <View style={styles.menuSection}>
                <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => (navigation as any).navigate('LedgerManagement')}
                >
                    <Icon name={AppIcons.book} size={24} color={Colors.primary} />
                    <View style={styles.menuTextContainer}>
                        <Text style={styles.menuText}>我的账本</Text>
                        <Text style={styles.menuSubtext}>
                            {defaultLedger?.name || '未设置默认'} · {ledgers.length}个账本
                        </Text>
                    </View>
                    <Icon name={AppIcons.chevronForward} size={20} color={Colors.textSecondary} />
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => (navigation as any).navigate('PaymentMethodManagement')}
                >
                    <Icon name={AppIcons.cardOutline} size={24} color={Colors.primary} />
                    <View style={styles.menuTextContainer}>
                        <Text style={styles.menuText}>支付方式</Text>
                        <Text style={styles.menuSubtext}>
                            管理你的支付方式
                        </Text>
                    </View>
                    <Icon name={AppIcons.chevronForward} size={20} color={Colors.textSecondary} />
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => (navigation as any).navigate('CategoryManagement')}
                >
                    <Icon name="pricetag-outline" size={24} color={Colors.primary} />
                    <View style={styles.menuTextContainer}>
                        <Text style={styles.menuText}>分类管理</Text>
                        <Text style={styles.menuSubtext}>
                            管理你的交易分类
                        </Text>
                    </View>
                    <Icon name={AppIcons.chevronForward} size={20} color={Colors.textSecondary} />
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => (navigation as any).navigate('TemplateManagement')}
                >
                    <Icon name={AppIcons.listOutline} size={24} color={Colors.primary} />
                    <View style={styles.menuTextContainer}>
                        <Text style={styles.menuText}>交易模板</Text>
                        <Text style={styles.menuSubtext}>
                            快速记账模板
                        </Text>
                    </View>
                    <Icon name={AppIcons.chevronForward} size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* 菜单选项 */}
            <View style={styles.menuSection}>
                <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => (navigation as any).navigate('Settings')}
                >
                    <Icon name={AppIcons.settingsOutline} size={24} color={Colors.textSecondary} />
                    <Text style={styles.menuText}>设置</Text>
                    <Icon name={AppIcons.chevronForward} size={20} color={Colors.textSecondary} />
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => (navigation as any).navigate('Feedback')}
                >
                    <Icon name={AppIcons.helpCircle} size={24} color={Colors.textSecondary} />
                    <Text style={styles.menuText}>帮助与反馈</Text>
                    <Icon name={AppIcons.chevronForward} size={20} color={Colors.textSecondary} />
                </TouchableOpacity>

                <View style={styles.divider} />
            </View>

            {/* 退出登录按钮 */}
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutText}>退出登录</Text>
            </TouchableOpacity>

        </ScrollView>

    );


}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        backgroundColor: Colors.surface,
        alignItems: 'center',
        paddingVertical: Spacing.xxl,
        paddingHorizontal: Spacing.lg,
        marginBottom: Spacing.md,
    },
    avatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
    },
    username: {
        fontSize: FontSizes.xl,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: Spacing.xs,
    },
    editProfileButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: Spacing.md,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.round,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: Spacing.xs,
        ...Shadows.sm,
    },
    editProfileText: {
        fontSize: FontSizes.sm,
        color: Colors.text,
        fontWeight: FontWeights.medium,
    },
    userEmail: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
    },
    menuSection: {
        backgroundColor: Colors.surface,
        marginBottom: Spacing.md,
        paddingHorizontal: Spacing.lg,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        gap: Spacing.md,
    },
    menuTextContainer: {
        flex: 1,
    },
    menuText: {
        fontSize: FontSizes.md,
        color: Colors.text,
    },
    menuSubtext: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.divider,
    },
    logoutButton: {
        backgroundColor: Colors.surface,
        marginHorizontal: Spacing.lg,
        marginTop: Spacing.lg,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        ...Shadows.sm,
    },
    logoutText: {
        fontSize: FontSizes.md,
        color: Colors.error,
        fontWeight: '600',
    },
});