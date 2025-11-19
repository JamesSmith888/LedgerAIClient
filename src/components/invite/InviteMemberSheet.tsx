/**
 * 邀请成员弹窗组件
 * 主要功能：生成邀请链接、查看已生成的邀请码
 * 设计风格：Google Material + Telegram
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BorderRadius, Colors, FontSizes, FontWeights, Shadows, Spacing } from '../../constants/theme';
import { toast } from '../../utils/toast';
import { ledgerInviteAPI } from '../../api/services/ledgerInviteAPI';
import { RoleSelector } from './RoleSelector';
import { InviteCodeCard } from './InviteCodeCard';
import type { InviteCode, CreateInviteCodeRequest } from '../../types/invite';
import { LedgerMemberRole } from '../../types/ledger';

interface InviteMemberSheetProps {
  visible: boolean;
  ledgerId: number;
  ledgerName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const InviteMemberSheet: React.FC<InviteMemberSheetProps> = ({
  visible,
  ledgerId,
  ledgerName,
  onClose,
  onSuccess,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);

  // 邀请码配置
  const [selectedRole, setSelectedRole] = useState<number>(LedgerMemberRole.EDITOR);
  const [maxUses, setMaxUses] = useState<number>(1);
  const [expireHours, setExpireHours] = useState<number | undefined>(24);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // 加载已有的邀请码
  const loadInviteCodes = useCallback(async () => {
    if (!visible) return;
    
    try {
      setIsLoading(true);
      const codes = await ledgerInviteAPI.getInviteCodes(ledgerId, false);
      setInviteCodes(codes || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || '加载邀请码失败');
      setInviteCodes([]); // 设置空数组避免undefined
    } finally {
      setIsLoading(false);
    }
  }, [visible, ledgerId]);

  useEffect(() => {
    if (visible) {
      loadInviteCodes();
    }
  }, [visible, loadInviteCodes]);

  // 生成邀请码
  const handleGenerate = async () => {
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
      onSuccess?.();

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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.container}>
          {/* 把手 */}
          <View style={styles.handle} />

          {/* 头部 */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>邀请成员</Text>
              <Text style={styles.subtitle}>{ledgerName}</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
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
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '90%',
    minHeight: '50%',
    paddingBottom: Spacing.xl,
    display: 'flex',
    flexDirection: 'column',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  subtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs / 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: FontSizes.xl,
    color: Colors.textSecondary,
    fontWeight: '300',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
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
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
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
    backgroundColor: Colors.surface,
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
