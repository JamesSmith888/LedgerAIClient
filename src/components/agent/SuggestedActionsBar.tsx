/**
 * SuggestedActionsBar - 智能建议栏（统一组件）
 * 
 * 支持两种模式：
 * 1. 初始建议模式（quick-actions）：空对话时显示的快捷操作
 * 2. 后续建议模式（suggestions）：AI 对话后的后续操作建议
 * 
 * 用户可以：
 * - 点击建议按钮直接发送对应消息
 * - 点击关闭按钮隐藏建议栏
 */

import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Animated,
} from 'react-native';
import { Icon } from '../common';
import { SuggestedAction } from '../../types/agent';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius, Shadows } from '../../constants/theme';

/**
 * 初始建议类型（支持 icon）
 */
export interface InitialSuggestion {
  label: string;
  message: string;
  icon?: string;
}

/**
 * 统一的建议栏模式
 */
export type SuggestionsMode = 'quick-actions' | 'suggestions';

interface SuggestedActionsBarProps {
  /** 建议操作列表（用于 suggestions 模式） */
  actions?: SuggestedAction[];
  /** 初始建议列表（用于 quick-actions 模式） */
  initialSuggestions?: InitialSuggestion[];
  /** 当前模式 */
  mode?: SuggestionsMode;
  /** 点击建议按钮的回调 */
  onActionPress: (message: string) => void;
  /** 关闭建议栏的回调 */
  onDismiss: () => void;
}

export const SuggestedActionsBar: React.FC<SuggestedActionsBarProps> = ({
  actions,
  initialSuggestions,
  mode = 'suggestions',
  onActionPress,
  onDismiss,
}) => {
  // 根据模式选择数据源
  const isQuickActionsMode = mode === 'quick-actions';
  
  // 将两种类型统一为相同格式
  const items: Array<{ label: string; message: string; icon?: string }> = isQuickActionsMode 
    ? (initialSuggestions || [])
    : (actions || []).map(a => ({ label: a.label, message: a.message }));

  if (!items || items.length === 0) {
    return null;
  }

  // 获取标题和图标
  const title = isQuickActionsMode ? '快捷操作' : '智能建议';
  const titleIcon = isQuickActionsMode ? 'flash' : 'bulb';

  return (
    <View style={[styles.container, isQuickActionsMode && styles.containerQuickActions]}>
      <View style={styles.header}>
        <View style={styles.labelContainer}>
          <View style={[styles.iconWrapper, isQuickActionsMode && styles.iconWrapperQuickActions]}>
            <Icon name={titleIcon} size={14} color={Colors.surface} />
          </View>
          <Text style={styles.label}>{title}</Text>
        </View>
        <TouchableOpacity 
          onPress={onDismiss}
          style={styles.dismissButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="close" size={16} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.actionsScroll}
      >
        {items.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.actionButton,
              isQuickActionsMode && styles.actionButtonQuickActions
            ]}
            onPress={() => onActionPress(item.message)}
            activeOpacity={0.7}
          >
            {item.icon && <Text style={styles.actionIcon}>{item.icon}</Text>}
            <Text style={[
              styles.actionText,
              isQuickActionsMode && styles.actionTextQuickActions
            ]}>
              {item.label}
            </Text>
            {!isQuickActionsMode && (
              <Icon name="arrow-forward" size={12} color={Colors.primary} style={styles.actionArrow} />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    ...Shadows.md,
  },
  containerQuickActions: {
    // 初始模式下的样式调整
    backgroundColor: Colors.background,
    borderTopWidth: 0,
    ...Shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  iconWrapper: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapperQuickActions: {
    backgroundColor: Colors.secondary || Colors.primary,
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
  },
  dismissButton: {
    padding: 4,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
  },
  actionsScroll: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingBottom: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  actionButtonQuickActions: {
    backgroundColor: Colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  actionIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  actionText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    fontWeight: FontWeights.medium,
    marginRight: 4,
  },
  actionTextQuickActions: {
    marginRight: 0,
  },
  actionArrow: {
    opacity: 0.6,
  },
});
