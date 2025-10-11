/**
 * 我的页面
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../components/common';
import { Colors, Spacing, FontSizes, FontWeights } from '../constants/theme';

export const ProfileScreen: React.FC = () => {
  const MenuItem = ({ icon, title }: { icon: string; title: string }) => (
    <TouchableOpacity style={styles.menuItem}>
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={styles.menuTitle}>{title}</Text>
      <Text style={styles.menuArrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container}>
        {/* 用户信息卡片 */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>我</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.name}>用户名</Text>
              <Text style={styles.bio}>这是一段个人简介</Text>
            </View>
          </View>
        </Card>

        {/* 菜单列表 */}
        <Card style={styles.menuCard}>
          <MenuItem icon="⚙️" title="设置" />
          <View style={styles.divider} />
          <MenuItem icon="🔔" title="通知" />
          <View style={styles.divider} />
          <MenuItem icon="❤️" title="我的收藏" />
        </Card>

        <Card style={styles.menuCard}>
          <MenuItem icon="📊" title="数据统计" />
          <View style={styles.divider} />
          <MenuItem icon="💡" title="帮助与反馈" />
          <View style={styles.divider} />
          <MenuItem icon="ℹ️" title="关于" />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  profileCard: {
    margin: Spacing.md,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.surface,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  bio: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  menuCard: {
    margin: Spacing.md,
    marginTop: 0,
    padding: 0,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  menuIcon: {
    fontSize: FontSizes.xl,
    marginRight: Spacing.md,
  },
  menuTitle: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  menuArrow: {
    fontSize: FontSizes.xxl,
    color: Colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: Spacing.md + Spacing.xl + Spacing.md,
  },
});
