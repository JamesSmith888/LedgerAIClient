/**
 * 账本管理页面
 * 展示用户的所有账本（个人账本 + 共享账本）
 */
import React, { useCallback, useState } from 'react';
import {
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
import { Card, Icon } from '../components/common';
import { LedgerActionSheet } from '../components/ledger/LedgerActionSheet';
import {
  BorderRadius,
  Colors,
  FontSizes,
  FontWeights,
  Shadows,
  Spacing,
} from '../constants/theme';
import { useLedger } from '../context/LedgerContext';
import { useAuth } from '../context/AuthContext';
import type { Ledger } from '../types/ledger';
import { LedgerType } from '../types/ledger';

export const LedgerManagementScreen: React.FC = () => {
  const navigation = useNavigation();
  const { ledgers, currentLedger, defaultLedgerId, setCurrentLedger, setDefaultLedger, refreshLedgers, deleteLedger } = useLedger();
  const { user } = useAuth();

  // 底部弹窗状态
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [selectedLedger, setSelectedLedger] = useState<Ledger | null>(null);

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

  // 处理加入账本
  const handleJoinByCode = () => {
    (navigation as any).navigate('JoinByCode');
  };

  // 处理设置默认账本
  const handleSetDefaultLedger = async (ledger: Ledger) => {
    try {
      await setDefaultLedger(ledger);
    } catch (error) {
      // Error already handled in context
    }
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
    // 在账本管理页面，高亮显示默认账本而不是当前账本
    const isDefault = defaultLedgerId === item.id;
    const isPersonal = item.type === LedgerType.PERSONAL;
    const currentUserId = user?._id ? Number(user._id) : 0;
    const isOwner = currentUserId === item.ownerUserId;
    const isJoined = !isOwner && item.type === LedgerType.SHARED; // 受邀加入的账本

    return (
      <Card style={[
        isDefault ? styles.ledgerCardActive : styles.ledgerCard,
      ] as any}>
        <TouchableOpacity
          style={styles.ledgerCardContent}
          activeOpacity={0.7}
          onPress={() => handleLedgerPress(item)}
        >
          {/* 左侧图标和信息 */}
          <View style={styles.ledgerInfo}>
            <View
              style={[
                styles.ledgerIconContainer,
                isDefault && styles.ledgerIconContainerActive,
                { 
                  backgroundColor: isPersonal 
                    ? Colors.primary + '15' 
                    : Colors.accent.orange + '15' 
                },
              ]}
            >
              <Icon
                name={isPersonal ? 'book' : 'people'}
                size={28}
                color={isPersonal ? Colors.primary : Colors.accent.orange}
              />
            </View>
            <View style={styles.ledgerTextInfo}>
              <View style={styles.ledgerNameRow}>
                <Text style={styles.ledgerName}>{item.name}</Text>
                {/* 默认账本徽章 */}
                {isDefault && (
                  <View style={styles.badgeDefault}>
                    <Text style={styles.badgeDefaultText}>默认</Text>
                  </View>
                )}
                {/* 受邀加入徽章 */}
                {isJoined && (
                  <View style={styles.badgeShared}>
                    <Text style={styles.badgeSharedText}>受邀</Text>
                  </View>
                )}
              </View>
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
        </TouchableOpacity>

        {/* 右侧操作按钮 - 独立点击区域 */}
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => {
            setSelectedLedger(item);
            setActionSheetVisible(true);
          }}
          activeOpacity={0.6}
        >
          <Icon name="ellipsis-vertical" size={18} color={Colors.text} />
        </TouchableOpacity>
      </Card>
    );
  };

  // 空状态
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="book-outline" size={72} color={Colors.textLight} style={styles.emptyIcon} />
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
            <Icon name="arrow-back" size={24} color={Colors.text} />
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
          {/* 第一行：创建按钮 */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.createButton, styles.createButtonPersonal]}
              onPress={handleCreatePersonal}
              activeOpacity={0.8}
            >
              <Icon name="book" size={20} color={Colors.surface} style={styles.createButtonIcon} />
              <Text style={styles.createButtonText}>创建个人</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.createButton, styles.createButtonShared]}
              onPress={handleCreateShared}
              activeOpacity={0.8}
            >
              <Icon name="people" size={20} color={Colors.surface} style={styles.createButtonIcon} />
              <Text style={styles.createButtonText}>创建共享</Text>
            </TouchableOpacity>
          </View>

          {/* 第二行：加入按钮 */}
          <TouchableOpacity
            style={[styles.createButton, styles.createButtonJoin]}
            onPress={handleJoinByCode}
            activeOpacity={0.8}
          >
            <Icon name="link" size={20} color={Colors.surface} style={styles.createButtonIcon} />
            <Text style={styles.createButtonText}>输入邀请码加入</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 账本操作底部弹窗 */}
      <LedgerActionSheet
        visible={actionSheetVisible}
        ledger={selectedLedger}
        isDefault={selectedLedger?.id === defaultLedgerId}
        onClose={() => {
          setActionSheetVisible(false);
          setSelectedLedger(null);
        }}
        onSetDefault={() => {
          if (selectedLedger) {
            handleSetDefaultLedger(selectedLedger);
          }
          setActionSheetVisible(false);
        }}
        onViewDetail={() => {
          if (selectedLedger) {
            handleLedgerPress(selectedLedger);
          }
        }}
        onDelete={() => {
          if (selectedLedger) {
            handleDeleteLedger(selectedLedger);
          }
        }}
      />
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

  // 头部 - 更轻量的设计
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    ...Shadows.sm,
    zIndex: 10,
  },
  backButton: {
    padding: Spacing.xs,
    marginLeft: -Spacing.xs,
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 180, // 增加底部间距，防止被底部按钮遮挡
  },

  // 账本卡片 - Telegram 风格：微妙的视觉提示
  ledgerCard: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
    position: 'relative',
  },
  ledgerCardActive: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    ...Shadows.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    position: 'relative',
  },
  badgeContainer: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    flexDirection: 'row',
    gap: Spacing.xs,
    zIndex: 1,
  },
  ledgerCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  ledgerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: Spacing.xs,
  },
  ledgerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  ledgerIconContainerActive: {
    transform: [{ scale: 1.05 }],
  },
  ledgerIcon: {
    fontSize: 30,
  },
  ledgerTextInfo: {
    flex: 1,
    justifyContent: 'center', // 垂直居中对齐
  },
  ledgerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs / 2,
    flexWrap: 'wrap',
  },
  ledgerName: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginRight: Spacing.xs,
  },
  // 默认账本徽章
  badgeDefault: {
    backgroundColor: Colors.accent.yellow + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: Spacing.xs,
    borderWidth: 0.5,
    borderColor: Colors.accent.yellow + '30',
  },
  badgeDefaultText: {
    fontSize: 10,
    color: Colors.accent.yellow,
    fontWeight: FontWeights.medium,
  },
  // 受邀加入徽章
  badgeShared: {
    backgroundColor: Colors.accent.purple + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: Spacing.xs,
    borderWidth: 0.5,
    borderColor: Colors.accent.purple + '30',
  },
  badgeSharedText: {
    fontSize: 10,
    color: Colors.accent.purple,
    fontWeight: FontWeights.medium,
  },
  badgeIcon: {
    marginRight: Spacing.xs / 2,
  },
  // Telegram 风格的勾选标记 - 右上角圆点徽章（已废弃，使用默认徽章替代）
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
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 36,
    height: 36,
    borderRadius: BorderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundSecondary,
    zIndex: 10,
  },

  // 空状态 - 更友好的视觉
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 3,
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    marginBottom: Spacing.xl,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  emptyHint: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },

  // 底部按钮 - 优化布局
  bottomButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'column',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    backgroundColor: Colors.surface,
    borderTopWidth: 0.5,
    borderTopColor: Colors.divider,
    gap: Spacing.sm,
    ...Shadows.xl,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
    elevation: 3,
    flex: 1,
  },
  createButtonPersonal: {
    backgroundColor: Colors.primary,
  },
  createButtonShared: {
    backgroundColor: Colors.accent.orange,
  },
  createButtonJoin: {
    backgroundColor: Colors.accent.green,
  },
  createButtonIcon: {
    marginRight: Spacing.xs,
  },
  createButtonText: {
    color: Colors.surface,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
  },
});
