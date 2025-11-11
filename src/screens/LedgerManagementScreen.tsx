/**
 * 账本管理页面
 * 展示用户的所有账本（个人账本 + 共享账本）
 */
import React, { useCallback } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { showConfirm } from '../utils/toast';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Card } from '../components/common';
import {
  BorderRadius,
  Colors,
  FontSizes,
  FontWeights,
  Shadows,
  Spacing,
} from '../constants/theme';
import { useLedger } from '../context/LedgerContext';
import type { Ledger } from '../types/ledger';
import { LedgerType } from '../types/ledger';

export const LedgerManagementScreen: React.FC = () => {
  const navigation = useNavigation();
  const { ledgers, currentLedger, setCurrentLedger, refreshLedgers, deleteLedger } = useLedger();

  // 页面聚焦时刷新数据
  useFocusEffect(
    useCallback(() => {
      refreshLedgers();
    }, [])
  );

  // 处理账本点击
  const handleLedgerPress = (ledger: Ledger) => {
    (navigation as any).navigate('LedgerDetail', { ledgerId: ledger.id });
  };

  // 处理创建账本
  const handleCreatePersonal = () => {
    (navigation as any).navigate('CreateLedger', { type: 'personal' });
  };

  const handleCreateShared = () => {
    (navigation as any).navigate('CreateLedger', { type: 'shared' });
  };

  // 处理删除账本
  const handleDeleteLedger = (ledger: Ledger) => {
    showConfirm(
      '确认删除',
      `确定要删除账本「${ledger.name}」吗？删除后将无法恢复。`,
      async () => {
        await deleteLedger(ledger.id);
      }
    );
  };

  // 渲染账本卡片
  const renderLedgerItem = ({ item }: { item: Ledger }) => {
    const isActive = currentLedger?.id === item.id;
    const isPersonal = item.type === LedgerType.PERSONAL;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleLedgerPress(item)}
      >
        <Card style={isActive ? styles.ledgerCardActive : styles.ledgerCard}>
          {/* 选中状态圆点 - 右上角徽章 */}
          {isActive && <View style={styles.activeCheckmark} />}
          
          <View style={styles.ledgerCardContent}>
            {/* 左侧图标和信息 */}
            <View style={styles.ledgerInfo}>
              <View
                style={[
                  styles.ledgerIconContainer,
                  isActive && styles.ledgerIconContainerActive,
                  { 
                    backgroundColor: isPersonal 
                      ? Colors.primary + '15' 
                      : Colors.accent.orange + '15' 
                  },
                ]}
              >
                <Text style={styles.ledgerIcon}>
                  {isPersonal ? '📖' : '👨‍👩‍👧‍👦'}
                </Text>
              </View>
              <View style={styles.ledgerTextInfo}>
                <Text style={styles.ledgerName}>{item.name}</Text>
                <Text style={styles.ledgerType}>
                  {item.typeName}
                  {!isPersonal && item.memberCount && ` · ${item.memberCount}名成员`}
                </Text>
                {item.description && (
                  <Text style={styles.ledgerDescription} numberOfLines={1}>
                    {item.description}
                  </Text>
                )}
              </View>
            </View>

            {/* 右侧操作按钮 */}
            <TouchableOpacity
              style={styles.moreButton}
              onPress={() => {
                Alert.alert(
                  item.name,
                  '选择操作',
                  [
                    {
                      text: isActive ? '当前账本' : '切换到此账本',
                      onPress: () => !isActive && setCurrentLedger(item),
                      style: isActive ? 'cancel' : 'default',
                    },
                    {
                      text: '查看详情',
                      onPress: () => handleLedgerPress(item),
                    },
                    {
                      text: '删除账本',
                      onPress: () => handleDeleteLedger(item),
                      style: 'destructive',
                    },
                    { text: '取消', style: 'cancel' },
                  ]
                );
              }}
            >
              <Text style={styles.moreButtonText}>⋯</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  // 空状态
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📖</Text>
      <Text style={styles.emptyText}>还没有账本</Text>
      <Text style={styles.emptyHint}>点击下方按钮创建你的第一个账本</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* 头部 */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>我的账本</Text>
          <View style={styles.headerRight} />
        </View>

        {/* 账本列表 */}
        <FlatList
          data={ledgers}
          renderItem={renderLedgerItem}
          keyExtractor={item => item.id.toString()}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={refreshLedgers}
              tintColor={Colors.primary}
            />
          }
        />

        {/* 底部按钮 */}
        <View style={styles.bottomButtons}>
          <TouchableOpacity
            style={[styles.createButton, styles.createButtonPersonal]}
            onPress={handleCreatePersonal}
            activeOpacity={0.8}
          >
            <Text style={styles.createButtonIcon}>📖</Text>
            <Text style={styles.createButtonText}>创建个人账本</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.createButton, styles.createButtonShared]}
            onPress={handleCreateShared}
            activeOpacity={0.8}
          >
            <Text style={styles.createButtonIcon}>👨‍👩‍👧‍👦</Text>
            <Text style={styles.createButtonText}>创建共享账本</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  container: {
    flex: 1,
  },

  // 头部 - 更轻量的设计
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.surface,
    ...Shadows.sm,
  },
  backButton: {
    padding: Spacing.xs,
    marginLeft: -Spacing.xs,
  },
  backButtonText: {
    fontSize: 28,
    color: Colors.primary,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  headerRight: {
    width: 40,
  },

  // 列表 - 优化间距
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: 180, // 增加底部间距，防止被底部按钮遮挡
  },

  // 账本卡片 - Telegram 风格：微妙的视觉提示
  ledgerCard: {
    marginBottom: Spacing.sm, // 缩小卡片间距，更紧凑
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg, // 稍小的圆角，更精致
    ...Shadows.sm,
  },
  ledgerCardActive: {
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    ...Shadows.md,
    // Telegram 风格：微妙的左侧强调条
    borderLeftWidth: 4, // 增加到 4px，更明显
    borderLeftColor: Colors.primary,
  },
  ledgerCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ledgerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: Spacing.xs, // 右侧留白
  },
  ledgerIconContainer: {
    width: 54, // 稍微缩小图标容器
    height: 54,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  ledgerIconContainerActive: {
    // 选中时图标容器略微增强
    transform: [{ scale: 1.03 }],
  },
  ledgerIcon: {
    fontSize: 28,
  },
  ledgerTextInfo: {
    flex: 1,
    justifyContent: 'center', // 垂直居中对齐
  },
  ledgerName: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.xs / 2, // 恢复原来的间距
  },
  // Telegram 风格的勾选标记 - 右上角圆点徽章
  activeCheckmark: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  ledgerType: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs / 2, // 优化类型与描述的间距
    lineHeight: 18, // 增加行高
  },
  ledgerDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textLight,
    marginTop: Spacing.xs / 2,
    lineHeight: 18,
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent', // 改为透明，更简洁
    marginLeft: Spacing.xs,
  },
  moreButtonText: {
    fontSize: 22,
    color: Colors.textSecondary,
    fontWeight: '600',
  },

  // 空状态 - 更友好的视觉
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2.5,
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    fontSize: 72,
    marginBottom: Spacing.xl,
    opacity: 0.6,
  },
  emptyText: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  emptyHint: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },

  // 底部按钮 - 渐变风格
  bottomButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    gap: Spacing.sm, // 缩小按钮间距
    ...Shadows.xl,
  },
  createButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md + 2, // 稍微增加按钮高度
    borderRadius: BorderRadius.lg, // 统一圆角
    ...Shadows.md, // 减弱阴影
  },
  createButtonPersonal: {
    backgroundColor: Colors.primary,
  },
  createButtonShared: {
    backgroundColor: Colors.accent.orange,
  },
  createButtonIcon: {
    fontSize: 18,
    marginRight: Spacing.xs,
  },
  createButtonText: {
    color: Colors.surface,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    letterSpacing: 0.2,
  },
});
