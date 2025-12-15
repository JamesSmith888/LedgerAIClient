/**
 * 账本详情页面
 * 展示账本信息、成员列表（共享账本）、统计数据等
 */
import React, { useCallback, useState, useEffect } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
} from 'react-native';
import { toast, showConfirm } from '../utils/toast';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Card, Icon } from '../components/common';
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
import type { Ledger, LedgerMember } from '../types/ledger';
import { LedgerType, getRoleName, getRoleColor } from '../types/ledger';
import { ledgerAPI } from '../api/services/ledgerAPI';
import { ledgerMemberAPI } from '../api/services/ledgerMemberAPI';
import { budgetAPI } from '../api/services/budgetAPI';
import { BudgetOverview } from '../types/budget';
import { BudgetProgressCard } from '../components/budget/BudgetProgressCard';

export const LedgerDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as { ledgerId: number } | undefined;
  const { refreshLedgers, deleteLedger } = useLedger();
  const { user } = useAuth();

  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [members, setMembers] = useState<LedgerMember[]>([]);
  const [budgetOverview, setBudgetOverview] = useState<BudgetOverview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const ledgerId = params?.ledgerId;
  const isShared = ledger?.type === LedgerType.SHARED;
  const currentUserId = user?._id ? Number(user._id) : 0;

  // 加载账本详情
  const loadLedgerDetail = async () => {
    if (!ledgerId) return;

    try {
      setIsLoading(true);
      const [data, budgetData] = await Promise.all([
        ledgerAPI.getById(ledgerId),
        budgetAPI.getBudgetOverview(ledgerId).catch(() => null) // 允许失败，可能是没有设置预算
      ]);
      
      setLedger(data);
      setBudgetOverview(budgetData);

      // 如果是共享账本，加载成员列表
      if (data.type === LedgerType.SHARED) {
        const memberData = await ledgerMemberAPI.getMembers(ledgerId);
        setMembers(memberData);
      }
    } catch (error) {
      console.error('加载账本详情失败:', error);
      toast.error('加载账本详情失败');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  // 页面聚焦时加载
  useFocusEffect(
    useCallback(() => {
      loadLedgerDetail();
    }, [ledgerId])
  );

  // 下拉刷新
  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadLedgerDetail();
    setIsRefreshing(false);
  };

  // 处理删除账本
  const handleDelete = () => {
    if (!ledger) return;

    showConfirm(
      '确认删除',
      `确定要删除账本「${ledger.name}」吗？删除后将无法恢复。`,
      async () => {
        await deleteLedger(ledger.id);
        navigation.goBack();
      }
    );
  };

  // 处理移除成员
  const handleRemoveMember = (member: LedgerMember) => {
    if (!ledger) return;

    showConfirm(
      '移除成员',
      `确定要移除成员「${member.userName || `用户${member.userId}`}」吗？`,
      async () => {
        try {
          await ledgerMemberAPI.removeMember(ledger.id, member.userId);
          await loadLedgerDetail();
          toast.success('成员已移除');
        } catch (error) {
          console.error('移除成员失败:', error);
          toast.error('移除成员失败');
        }
      }
    );
  };

  // 渲染成员列表
  const renderMemberItem = (member: LedgerMember) => {
    const roleName = getRoleName(member.role);
    const roleColor = getRoleColor(member.role);
    const isCurrentUser = member.userId === currentUserId;
    
    // 显示用户名或账号，优先显示昵称，其次显示用户名，最后显示用户ID
    const displayName = member.nickname || member.username || member.userName || `用户${member.userId}`;

    return (
      <TouchableOpacity
        key={member.id}
        style={styles.memberItem}
        onPress={() => {
          Alert.alert(
            displayName,
            `角色：${roleName}`,
            [
              {
                text: '移除成员',
                onPress: () => handleRemoveMember(member),
                style: 'destructive',
              },
              { text: '取消', style: 'cancel' },
            ]
          );
        }}
      >
        <View style={styles.memberAvatar}>
          <Text style={styles.memberAvatarText}>
            {displayName[0].toUpperCase()}
          </Text>
        </View>
        <View style={styles.memberInfo}>
          <View style={styles.memberNameRow}>
            <Text style={styles.memberName}>{displayName}</Text>
            {isCurrentUser && (
              <View style={styles.currentUserBadge}>
                <Text style={styles.currentUserText}>我</Text>
              </View>
            )}
          </View>
          <Text style={styles.memberJoinDate}>
            加入于 {new Date(member.joinedAt).toLocaleDateString()}
          </Text>
        </View>
        <View style={[styles.roleBadge, { backgroundColor: roleColor + '20' }]}>
          <Text style={[styles.roleBadgeText, { color: roleColor }]}>
            {roleName}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (!ledger) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.headerTitle}>账本详情</Text>
          <TouchableOpacity style={styles.editButton} onPress={() => {}}>
            <Text style={styles.editButtonText}>编辑</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
        >
          {/* 预算卡片或设置按钮 */}
          {budgetOverview ? (
            <BudgetProgressCard 
              budget={budgetOverview} 
              onPress={() => {
                if (ledgerId) {
                  navigation.navigate('BudgetSetting', { ledgerId } as any);
                }
              }} 
            />
          ) : (
            <TouchableOpacity
              style={styles.budgetPlaceholder}
              onPress={() => {
                if (ledgerId) {
                  navigation.navigate('BudgetSetting', { ledgerId } as any);
                }
              }}
            >
              <Icon name="pie-chart-outline" size={24} color={Colors.primary} />
              <Text style={styles.budgetPlaceholderText}>还未设置预算</Text>
              <Text style={styles.budgetPlaceholderSubText}>点击设置月度预算</Text>
            </TouchableOpacity>
          )}

          {/* 基本信息卡片 */}
          <Card style={styles.infoCard}>
            <View style={styles.ledgerHeader}>
              <View
                style={[
                  styles.ledgerIconContainer,
                  {
                    backgroundColor:
                      ledger.type === LedgerType.PERSONAL ? '#667eea20' : '#f6ad5520',
                  },
                ]}
              >
                <Icon
                  name={ledger.type === LedgerType.PERSONAL ? 'book' : 'people'}
                  size={30}
                  color={ledger.type === LedgerType.PERSONAL ? Colors.primary : Colors.accent.orange}
                />
              </View>
              <View style={styles.ledgerHeaderText}>
                <Text style={styles.ledgerName}>{ledger.name}</Text>
                <Text style={styles.ledgerType}>{ledger.typeName}</Text>
              </View>
            </View>

            {ledger.description && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionLabel}>账本描述</Text>
                <Text style={styles.descriptionText}>{ledger.description}</Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>创建时间</Text>
              <Text style={styles.infoValue}>
                {new Date(ledger.createTime).toLocaleDateString()}
              </Text>
            </View>
          </Card>

          {/* 共享账本成员列表 */}
          {isShared && (
            <Card style={styles.membersCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  成员列表 ({members.length}
                  {ledger.maxMembers ? `/${ledger.maxMembers}` : ''})
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    if (ledger && ledgerId) {
                      (navigation as any).navigate('InviteMember', {
                        ledgerId,
                        ledgerName: ledger.name
                      });
                    }
                  }}
                >
                  <Text style={styles.inviteButton}>+ 邀请</Text>
                </TouchableOpacity>
              </View>

              {members.length > 0 ? (
                <View style={styles.membersList}>
                  {members.map(member => renderMemberItem(member))}
                </View>
              ) : (
                <Text style={styles.emptyText}>暂无成员</Text>
              )}
            </Card>
          )}

          {/* 设置区域 */}
          <Card style={styles.settingsCard}>
            <Text style={styles.sectionTitle}>设置</Text>

            {isShared && (
              <>
                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>最大成员数</Text>
                  <Text style={styles.settingValue}>
                    {ledger.maxMembers || '不限制'}
                  </Text>
                </View>

                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>公开设置</Text>
                  <Text style={styles.settingValue}>
                    {ledger.isPublic ? '公开' : '私有'}
                  </Text>
                </View>
              </>
            )}
          </Card>

          {/* 危险操作 */}
          <Card style={styles.dangerCard}>
            <TouchableOpacity style={styles.dangerButton} onPress={handleDelete}>
              <Text style={styles.dangerButtonText}>删除账本</Text>
            </TouchableOpacity>
          </Card>
        </ScrollView>
      </View>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },

  // 头部
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  backButton: {
    padding: Spacing.xs,
  },
  backButtonText: {
    fontSize: FontSizes.xxl,
    color: Colors.text,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  editButton: {
    padding: Spacing.xs,
  },
  editButtonText: {
    fontSize: FontSizes.md,
    color: Colors.primary,
    fontWeight: FontWeights.semibold,
  },

  // 滚动区域
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },

  // 基本信息卡片
  infoCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  ledgerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  ledgerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  ledgerIcon: {
    fontSize: 32,
  },
  ledgerHeaderText: {
    flex: 1,
  },
  ledgerName: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.xs / 2,
  },
  ledgerType: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  descriptionContainer: {
    marginBottom: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  descriptionLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  descriptionText: {
    fontSize: FontSizes.md,
    color: Colors.text,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  infoLabel: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: FontSizes.md,
    color: Colors.text,
    fontWeight: FontWeights.semibold,
  },

  // 成员卡片
  membersCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  inviteButton: {
    fontSize: FontSizes.md,
    color: Colors.primary,
    fontWeight: FontWeights.semibold,
  },
  membersList: {
    gap: Spacing.sm,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  memberAvatarText: {
    fontSize: FontSizes.lg,
    color: Colors.surface,
    fontWeight: FontWeights.bold,
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs / 2,
  },
  memberName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
  },
  currentUserBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  currentUserText: {
    fontSize: FontSizes.xs,
    color: Colors.surface,
    fontWeight: FontWeights.bold,
  },
  memberJoinDate: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  roleBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: BorderRadius.sm,
  },
  roleBadgeText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    paddingVertical: Spacing.lg,
  },

  // 设置卡片
  settingsCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingLabel: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  settingValue: {
    fontSize: FontSizes.md,
    color: Colors.text,
    fontWeight: FontWeights.semibold,
  },

  // 危险操作
  dangerCard: {
    padding: Spacing.lg,
  },
  dangerButton: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  dangerButtonText: {
    fontSize: FontSizes.md,
    color: Colors.expense,
    fontWeight: FontWeights.semibold,
  },

  // 预算占位符
  budgetPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  budgetPlaceholderText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  budgetPlaceholderSubText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
});
