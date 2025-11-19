/**
 * 邀请成员页面
 * 主要功能：生成邀请链接、查看已生成的邀请码
 * 设计风格：Google Material + Telegram
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BorderRadius, Colors, FontSizes, FontWeights, Shadows, Spacing } from '../constants/theme';
import { toast } from '../utils/toast';
import { ledgerInviteAPI } from '../api/services/ledgerInviteAPI';
import { RoleSelector } from '../components/invite/RoleSelector';
import { InviteCodeCard } from '../components/invite/InviteCodeCard';
import type { InviteCode, CreateInviteCodeRequest } from '../types/invite';
import { LedgerMemberRole } from '../types/ledger';

export const InviteMemberScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as { ledgerId: number; ledgerName: string } | undefined;

  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);

  // 邀请码配置
  const [selectedRole, setSelectedRole] = useState<number>(LedgerMemberRole.EDITOR);
  const [maxUses, setMaxUses] = useState<number>(1);
  const [expireHours, setExpireHours] = useState<number | undefined>(24);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const ledgerId = params?.ledgerId;
  const ledgerName = params?.ledgerName || '账本';

  // 加载已有的邀请码
  const loadInviteCodes = useCallback(async () => {
    if (!ledgerId) return;

    try {
      setIsLoading(true);
      const codes = await ledgerInviteAPI.getInviteCodes(ledgerId, false);
      setInviteCodes(codes || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || '加载邀请码失败');
      setInviteCodes([]);
    } finally {
      setIsLoading(false);
    }
  }, [ledgerId]);

  // 下拉刷新
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadInviteCodes();
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadInviteCodes();
  }, [loadInviteCodes]);

  // 生成邀请码
  const handleGenerate = async () => {
    if (!ledgerId) return;

    try {
      setIsGenerating(true);

      const request: CreateInviteCodeRequest = {
        role: selectedRole,
        maxUses,
        expireHours,
      };

      await ledgerInviteAPI.createInviteCode(ledgerId, request);
      toast.success('邀请码生成成功');

      // 刷新列表
      await loadInviteCodes();

      // 重置表单
      setShowAdvancedSettings(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || '生成邀请码失败');
    } finally {
      setIsGenerating(false);
    }
  };

  // 禁用邀请码
  const handleDisableInviteCode = async (inviteCodeId: number) => {
    if (!ledgerId) return;
    await ledgerInviteAPI.disableInviteCode(ledgerId, inviteCodeId);
  };

  // 使用次数选项
  const maxUsesOptions = [
    { label: '1次', value: 1 },
    { label: '5次', value: 5 },
    { label: '10次', value: 10 },
    { label: '无限制', value: -1 },
  ];

  // 有效期选项
  const expireOptions = [
    { label: '1小时', value: 1 },
    { label: '24小时', value: 24 },
    { label: '7天', value: 168 },
    { label: '永久', value: undefined },
  ];

  if (!ledgerId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>账本ID无效</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>邀请成员</Text>
          <Text style={styles.headerSubtitle}>{ledgerName}</Text>
        </View>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* 生成邀请码区域 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔗 生成邀请链接</Text>

          {/* 角色选择 */}
          <RoleSelector
            selectedRole={selectedRole}
            onSelectRole={setSelectedRole}
            disabled={isGenerating}
          />

          {/* 高级设置 */}
          <TouchableOpacity
            style={styles.advancedToggle}
            onPress={() => setShowAdvancedSettings(!showAdvancedSettings)}
            activeOpacity={0.7}
          >
            <Text style={styles.advancedToggleText}>
              {showAdvancedSettings ? '▼' : '▶'} 高级设置
            </Text>
          </TouchableOpacity>

          {showAdvancedSettings && (
            <View style={styles.advancedSettings}>
              {/* 使用次数 */}
              <View style={styles.settingGroup}>
                <Text style={styles.settingLabel}>使用次数</Text>
                <View style={styles.optionButtons}>
                  {maxUsesOptions.map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.optionButton,
                        maxUses === option.value && styles.optionButtonActive,
                      ]}
                      onPress={() => setMaxUses(option.value)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.optionButtonText,
                          maxUses === option.value && styles.optionButtonTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 有效期 */}
              <View style={styles.settingGroup}>
                <Text style={styles.settingLabel}>有效期</Text>
                <View style={styles.optionButtons}>
                  {expireOptions.map(option => (
                    <TouchableOpacity
                      key={option.label}
                      style={[
                        styles.optionButton,
                        expireHours === option.value && styles.optionButtonActive,
                      ]}
                      onPress={() => setExpireHours(option.value)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.optionButtonText,
                          expireHours === option.value && styles.optionButtonTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* 生成按钮 */}
          <TouchableOpacity
            style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
            onPress={handleGenerate}
            disabled={isGenerating}
            activeOpacity={0.7}
          >
            {isGenerating ? (
              <ActivityIndicator color={Colors.surface} />
            ) : (
              <Text style={styles.generateButtonText}>✨ 生成邀请码</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* 已生成的邀请码列表 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            📋 已生成的邀请码 ({inviteCodes?.length || 0})
          </Text>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>加载中...</Text>
            </View>
          ) : inviteCodes && inviteCodes.length > 0 ? (
            inviteCodes.map(code => (
              <InviteCodeCard
                key={code.id}
                inviteCode={code}
                onDisable={handleDisableInviteCode}
                onRefresh={loadInviteCodes}
              />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔗</Text>
              <Text style={styles.emptyText}>还没有邀请码</Text>
              <Text style={styles.emptyHint}>点击上方按钮生成邀请链接</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    ...Shadows.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: FontSizes.xxl,
    color: Colors.text,
    fontWeight: '300',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  headerPlaceholder: {
    width: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: FontSizes.lg,
    color: Colors.error,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  advancedToggle: {
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  advancedToggleText: {
    fontSize: FontSizes.md,
    color: Colors.primary,
    fontWeight: FontWeights.semibold,
  },
  advancedSettings: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  settingGroup: {
    marginBottom: Spacing.md,
  },
  settingLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  optionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  optionButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  optionButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    fontWeight: FontWeights.medium,
  },
  optionButtonTextActive: {
    color: Colors.surface,
    fontWeight: FontWeights.bold,
  },
  generateButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.surface,
  },
  loadingContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  emptyContainer: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  emptyHint: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
});
