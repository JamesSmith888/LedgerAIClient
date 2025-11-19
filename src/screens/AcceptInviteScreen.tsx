/**
 * 接受邀请页面
 * 用户通过邀请码加入共享账本
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BorderRadius, Colors, FontSizes, FontWeights, Shadows, Spacing } from '../constants/theme';
import { toast } from '../utils/toast';
import { ledgerInviteAPI } from '../api/services/ledgerInviteAPI';
import type { InviteValidateResponse } from '../types/invite';
import { useLedger } from '../context/LedgerContext';

export const AcceptInviteScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as { inviteCode: string } | undefined;
  const { refreshLedgers } = useLedger();

  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<InviteValidateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inviteCode = params?.inviteCode;

  // 加载邀请信息
  const loadInviteInfo = useCallback(async () => {
    if (!inviteCode) {
      setError('邀请码无效');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const info = await ledgerInviteAPI.validateInviteCode(inviteCode);
      
      if (info.isValid) {
        setInviteInfo(info);
      } else {
        setError(info.errorMessage || '邀请码无效');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || '加载邀请信息失败');
    } finally {
      setIsLoading(false);
    }
  }, [inviteCode]);

  useEffect(() => {
    loadInviteInfo();
  }, [loadInviteInfo]);

  // 接受邀请
  const handleAccept = async () => {
    if (!inviteCode) return;

    try {
      setIsAccepting(true);
      await ledgerInviteAPI.acceptInvite(inviteCode);
      
      toast.success('成功加入账本！');
      
      // 刷新账本列表
      await refreshLedgers();
      
      // 返回到账本列表或详情页
      navigation.goBack();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || '加入账本失败');
    } finally {
      setIsAccepting(false);
    }
  };

  // 格式化日期时间
  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return '永久有效';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 渲染加载中状态
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>接受邀请</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>加载邀请信息...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 渲染错误状态
  if (error || !inviteInfo) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>接受邀请</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>❌</Text>
          <Text style={styles.errorTitle}>邀请码无效</Text>
          <Text style={styles.errorMessage}>{error || '无法加载邀请信息'}</Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.errorButtonText}>返回</Text>
          </TouchableOpacity>
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
        <Text style={styles.headerTitle}>接受邀请</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 邀请图标 */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🎉</Text>
          <Text style={styles.welcomeText}>您收到了一个账本邀请</Text>
        </View>

        {/* 账本信息卡片 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📖 账本信息</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>账本名称</Text>
            <Text style={styles.infoValue}>{inviteInfo.ledgerName}</Text>
          </View>

          {inviteInfo.ledgerDescription && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>账本描述</Text>
              <Text style={styles.infoValue}>{inviteInfo.ledgerDescription}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>邀请人</Text>
            <Text style={styles.infoValue}>{inviteInfo.inviterName}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>您的角色</Text>
            <View style={styles.roleTag}>
              <Text style={styles.roleTagText}>{inviteInfo.roleName}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>当前成员</Text>
            <Text style={styles.infoValue}>
              {inviteInfo.memberCount}
              {inviteInfo.maxMembers && ` / ${inviteInfo.maxMembers}`} 人
            </Text>
          </View>

          {inviteInfo.expireTime && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>有效期至</Text>
              <Text style={styles.infoValue}>{formatDateTime(inviteInfo.expireTime)}</Text>
            </View>
          )}
        </View>

        {/* 角色权限说明 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔐 角色权限说明</Text>
          <View style={styles.permissionList}>
            {inviteInfo.role === 2 && (
              <>
                <View style={styles.permissionItem}>
                  <Text style={styles.permissionIcon}>✓</Text>
                  <Text style={styles.permissionText}>管理账本设置和成员</Text>
                </View>
                <View style={styles.permissionItem}>
                  <Text style={styles.permissionIcon}>✓</Text>
                  <Text style={styles.permissionText}>添加、编辑、删除记账记录</Text>
                </View>
                <View style={styles.permissionItem}>
                  <Text style={styles.permissionIcon}>✓</Text>
                  <Text style={styles.permissionText}>查看所有数据和统计</Text>
                </View>
              </>
            )}
            {inviteInfo.role === 3 && (
              <>
                <View style={styles.permissionItem}>
                  <Text style={styles.permissionIcon}>✓</Text>
                  <Text style={styles.permissionText}>添加、编辑、删除记账记录</Text>
                </View>
                <View style={styles.permissionItem}>
                  <Text style={styles.permissionIcon}>✓</Text>
                  <Text style={styles.permissionText}>查看所有数据和统计</Text>
                </View>
                <View style={styles.permissionItem}>
                  <Text style={styles.permissionIcon}>✗</Text>
                  <Text style={[styles.permissionText, styles.permissionDisabled]}>
                    无法管理账本设置和成员
                  </Text>
                </View>
              </>
            )}
            {inviteInfo.role === 4 && (
              <>
                <View style={styles.permissionItem}>
                  <Text style={styles.permissionIcon}>✓</Text>
                  <Text style={styles.permissionText}>查看所有数据和统计</Text>
                </View>
                <View style={styles.permissionItem}>
                  <Text style={styles.permissionIcon}>✗</Text>
                  <Text style={[styles.permissionText, styles.permissionDisabled]}>
                    无法添加或修改记账记录
                  </Text>
                </View>
                <View style={styles.permissionItem}>
                  <Text style={styles.permissionIcon}>✗</Text>
                  <Text style={[styles.permissionText, styles.permissionDisabled]}>
                    无法管理账本设置和成员
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* 操作按钮 */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.acceptButton, isAccepting && styles.acceptButtonDisabled]}
            onPress={handleAccept}
            disabled={isAccepting}
            activeOpacity={0.7}
          >
            {isAccepting ? (
              <ActivityIndicator color={Colors.surface} />
            ) : (
              <Text style={styles.acceptButtonText}>✓ 接受邀请，加入账本</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={isAccepting}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>取消</Text>
          </TouchableOpacity>
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
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  headerPlaceholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  errorTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  errorMessage: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  errorButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  errorButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.surface,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  icon: {
    fontSize: 80,
    marginBottom: Spacing.md,
  },
  welcomeText: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },
  cardTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoLabel: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    flex: 2,
    textAlign: 'right',
  },
  roleTag: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  roleTagText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: Colors.surface,
  },
  permissionList: {
    gap: Spacing.sm,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  permissionIcon: {
    fontSize: FontSizes.lg,
    width: 24,
    color: Colors.primary,
  },
  permissionText: {
    fontSize: FontSizes.md,
    color: Colors.text,
    flex: 1,
  },
  permissionDisabled: {
    color: Colors.textSecondary,
  },
  actionContainer: {
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  acceptButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  acceptButtonDisabled: {
    opacity: 0.6,
  },
  acceptButtonText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.surface,
  },
  cancelButton: {
    backgroundColor: Colors.backgroundSecondary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.textSecondary,
  },
});
