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
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useLedger } from '../context/LedgerContext';

export const ProfileScreen: React.FC = () => {
    const navigation = useNavigation();
    const { user, logout } = useAuth();
    const { ledgers, currentLedger } = useLedger();

    const handleLogout = () => {
        showConfirm(
            "确认退出",
            "您确定要退出登录吗？",
            async () => {
                await logout();
            }
        );
    }

    return (
        <ScrollView style={styles.container}>
            {/* 头部用户信息 */}
            <View style={styles.header}>
                <View style={styles.avatarContainer}>
                    <Text style={styles.avatarEmoji}>👤</Text>
                </View>
                <Text style={styles.username}>{user?.name || '用户'}</Text>
            </View>

            {/* 账本管理入口 */}
            <View style={styles.menuSection}>
                <TouchableOpacity 
                    style={styles.menuItem}
                    onPress={() => (navigation as any).navigate('LedgerManagement')}
                >
                    <Text style={styles.menuIcon}>📖</Text>
                    <View style={styles.menuTextContainer}>
                        <Text style={styles.menuText}>我的账本</Text>
                        <Text style={styles.menuSubtext}>
                            {currentLedger?.name || '未选择'} · {ledgers.length}个账本
                        </Text>
                    </View>
                    <Text style={styles.menuArrow}>›</Text>
                </TouchableOpacity>
            </View>

            {/* 菜单选项 */}
            <View style={styles.menuSection}>
                <TouchableOpacity style={styles.menuItem}>
                    <Text style={styles.menuIcon}>⚙️</Text>
                    <Text style={styles.menuText}>设置</Text>
                    <Text style={styles.menuArrow}>›</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity style={styles.menuItem}>
                    <Text style={styles.menuIcon}>❓</Text>
                    <Text style={styles.menuText}>帮助与反馈</Text>
                    <Text style={styles.menuArrow}>›</Text>
                </TouchableOpacity>
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
    avatarEmoji: {
        fontSize: 40,
    },
    username: {
        fontSize: FontSizes.xl,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: Spacing.xs,
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
    },
    menuIcon: {
        fontSize: 20,
        marginRight: Spacing.md,
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
    menuArrow: {
        fontSize: 24,
        color: Colors.textSecondary,
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