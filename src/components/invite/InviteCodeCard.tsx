/**
 * 邀请码卡片组件
 * 显示邀请码信息和操作按钮
 * 设计风格参考 Telegram 的链接卡片
 */
import React, { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Share,
  Clipboard,
} from 'react-native';
import { BorderRadius, Colors, FontSizes, FontWeights, Shadows, Spacing } from '../../constants/theme';
import { toast } from '../../utils/toast';
import type { InviteCode } from '../../types/invite';
import { getRoleColor, getRoleIcon } from '../../types/invite';

interface InviteCodeCardProps {
  inviteCode: InviteCode;
  onDisable?: (inviteCodeId: number) => void;
  onRefresh?: () => void;
}

export const InviteCodeCard: React.FC<InviteCodeCardProps> = ({
  inviteCode,
  onDisable,
  onRefresh,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const roleColor = getRoleColor(inviteCode.role);
  const roleIcon = getRoleIcon(inviteCode.role);

  // 复制邀请码
  const handleCopy = async () => {
    try {
      await Clipboard.setString(inviteCode.code);
      toast.success('邀请码已复制');
    } catch (error) {
      toast.error('复制失败');
    }
  };

  // 分享邀请链接
  const handleShare = async () => {
    try {
      const message = `邀请你加入「${inviteCode.ledgerName}」账本\n\n邀请码：${inviteCode.code}\n角色：${inviteCode.roleName}`;

      await Share.share({
        message,
        title: '账本邀请',
      });
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        toast.error('分享失败');
      }
    }
  };

  // 禁用邀请码
  const handleDisable = () => {
    Alert.alert(
      '禁用邀请码',
      '确定要禁用这个邀请码吗？禁用后将无法再使用。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '禁用',
          style: 'destructive',
          onPress: async () => {
            if (!onDisable) return;
            
            setIsProcessing(true);
            try {
              await onDisable(inviteCode.id);
              toast.success('邀请码已禁用');
              onRefresh?.();
            } catch (error) {
              toast.error('禁用失败');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  // 格式化过期时间
  const formatExpireTime = () => {
    if (!inviteCode.expireTime) return '永不过期';
    
    const expireDate = new Date(inviteCode.expireTime);
    const now = new Date();
    const diffMs = expireDate.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffMs < 0) return '已过期';
    if (diffDays > 0) return `${diffDays}天后过期`;
    if (diffHours > 0) return `${diffHours}小时后过期`;
    return '即将过期';
  };

  // 使用情况
  const usageText = inviteCode.maxUses === -1 
    ? `已使用 ${inviteCode.usedCount} 次`
    : `已使用 ${inviteCode.usedCount}/${inviteCode.maxUses} 次`;

  const isInactive = !inviteCode.status || inviteCode.isExpired || inviteCode.isExhausted;

  return (
    <View style={[styles.card, isInactive && styles.cardInactive]}>
      {/* 左侧色条 */}
      <View style={[styles.colorBar, { backgroundColor: roleColor }]} />

      {/* 卡片内容 */}
      <View style={styles.content}>
        {/* 头部 */}
        <View style={styles.header}>
          <View style={styles.roleInfo}>
            <Text style={styles.roleIcon}>{roleIcon}</Text>
            <View>
              <Text style={styles.roleName}>{inviteCode.roleName}</Text>
              {isInactive && (
                <Text style={styles.statusBadge}>
                  {inviteCode.isExpired ? '已过期' : inviteCode.isExhausted ? '已达上限' : '已禁用'}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* 邀请码 */}
        <View style={styles.codeContainer}>
          <Text style={styles.codeLabel}>邀请码</Text>
          <Text style={styles.codeText}>{inviteCode.code}</Text>
        </View>

        {/* 详情信息 */}
        <View style={styles.details}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>📊 {usageText}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>⏰ {formatExpireTime()}</Text>
          </View>
        </View>

        {/* 操作按钮 */}
        {!isInactive && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.copyButton]}
              onPress={handleCopy}
              activeOpacity={0.7}
            >
              <Text style={styles.actionButtonText}>📋 复制</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.shareButton]}
              onPress={handleShare}
              activeOpacity={0.7}
            >
              <Text style={styles.actionButtonText}>📤 分享</Text>
            </TouchableOpacity>

            {onDisable && (
              <TouchableOpacity
                style={[styles.actionButton, styles.disableButton]}
                onPress={handleDisable}
                disabled={isProcessing}
                activeOpacity={0.7}
              >
                <Text style={[styles.actionButtonText, styles.disableButtonText]}>
                  {isProcessing ? '...' : '🚫 禁用'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  cardInactive: {
    opacity: 0.6,
  },
  colorBar: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  roleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  roleIcon: {
    fontSize: 24,
  },
  roleName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  statusBadge: {
    fontSize: FontSizes.xs,
    color: Colors.expense,
    marginTop: 2,
  },
  codeContainer: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  codeLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs / 2,
  },
  codeText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
    letterSpacing: 2,
  },
  details: {
    marginBottom: Spacing.sm,
  },
  detailItem: {
    marginBottom: Spacing.xs / 2,
  },
  detailLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  actionButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyButton: {
    backgroundColor: Colors.primary + '15',
  },
  shareButton: {
    backgroundColor: Colors.income + '15',
  },
  disableButton: {
    backgroundColor: Colors.expense + '10',
  },
  actionButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
  },
  disableButtonText: {
    color: Colors.expense,
  },
});
