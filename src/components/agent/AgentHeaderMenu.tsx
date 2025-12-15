/**
 * AgentHeaderMenu - Agent 屏幕头部更多菜单
 * 
 * 整合了 Agent 屏幕的常用操作，作为二级菜单展示
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { Icon } from '../common';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows, FontWeights } from '../../constants/theme';

export type AgentMenuAction = 'new_chat' | 'tools' | 'memory' | 'settings' | 'suggestion_settings' | 'clear_chat' | 'reconnect' | 'background' | 'agent_config';

interface AgentHeaderMenuProps {
  visible: boolean;
  onClose: () => void;
  onAction: (action: AgentMenuAction) => void;
  isConnected: boolean;
  toolCount: number;
  totalToolCount: number;
}

export const AgentHeaderMenu: React.FC<AgentHeaderMenuProps> = ({
  visible,
  onClose,
  onAction,
  isConnected,
  toolCount,
  totalToolCount,
}) => {
  const handleAction = (action: AgentMenuAction) => {
    onClose();
    // 给一点延迟，让菜单先关闭，体验更好
    setTimeout(() => {
      onAction(action);
    }, 100);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.menuContainer}>
              {/* 菜单标题 */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>更多操作</Text>
              </View>

              {/* 菜单项列表 */}
              <View style={styles.itemsContainer}>
                {/* 新建对话 */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleAction('new_chat')}
                >
                  <View style={[styles.iconContainer, { backgroundColor: Colors.primaryLight }]}>
                    <Icon name="add" size={20} color={Colors.primary} />
                  </View>
                  <Text style={styles.menuLabel}>新建对话</Text>
                  <Icon name="chevron-forward" size={16} color={Colors.textSecondary} />
                </TouchableOpacity>

                <View style={styles.divider} />

                {/* 工具管理 */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleAction('tools')}
                >
                  <View style={[styles.iconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                    <Icon name="construct-outline" size={20} color={Colors.warning} />
                  </View>
                  <View style={styles.labelContainer}>
                    <Text style={styles.menuLabel}>工具管理</Text>
                    <Text style={styles.subLabel}>
                      已启用 {toolCount}/{totalToolCount}
                    </Text>
                  </View>
                  <Icon name="chevron-forward" size={16} color={Colors.textSecondary} />
                </TouchableOpacity>

                <View style={styles.divider} />

                {/* 智能建议设置 */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleAction('suggestion_settings')}
                >
                  <View style={[styles.iconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
                    <Icon name="bulb-outline" size={20} color={Colors.primary} />
                  </View>
                  <Text style={styles.menuLabel}>智能建议</Text>
                  <Icon name="chevron-forward" size={16} color={Colors.textSecondary} />
                </TouchableOpacity>

                <View style={styles.divider} />

                {/* AI 行为配置 */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleAction('agent_config')}
                >
                  <View style={[styles.iconContainer, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                    <Icon name="options-outline" size={20} color="#8B5CF6" />
                  </View>
                  <Text style={styles.menuLabel}>AI 行为配置</Text>
                  <Icon name="chevron-forward" size={16} color={Colors.textSecondary} />
                </TouchableOpacity>

                <View style={styles.divider} />

                {/* 智能记忆 */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleAction('memory')}
                >
                  <View style={[styles.iconContainer, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                    <Icon type="material-community" name="brain" size={20} color="#8B5CF6" />
                  </View>
                  <Text style={styles.menuLabel}>智能记忆</Text>
                  <Icon name="chevron-forward" size={16} color={Colors.textSecondary} />
                </TouchableOpacity>

                <View style={styles.divider} />

                {/* 背景设置 */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleAction('background')}
                >
                  <View style={[styles.iconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                    <Icon name="image-outline" size={20} color={Colors.success} />
                  </View>
                  <Text style={styles.menuLabel}>聊天背景</Text>
                  <Icon name="chevron-forward" size={16} color={Colors.textSecondary} />
                </TouchableOpacity>

                <View style={styles.divider} />

                {/* 模型设置 */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleAction('settings')}
                >
                  <View style={[styles.iconContainer, { backgroundColor: Colors.backgroundSecondary }]}>
                    <Icon name="settings-outline" size={20} color={Colors.text} />
                  </View>
                  <Text style={styles.menuLabel}>模型设置</Text>
                  <Icon name="chevron-forward" size={16} color={Colors.textSecondary} />
                </TouchableOpacity>

                {/* 重连 (仅离线显示) */}
                {!isConnected && (
                  <>
                    <View style={styles.divider} />
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => handleAction('reconnect')}
                    >
                      <View style={[styles.iconContainer, { backgroundColor: Colors.error }]}>
                        <Icon name="refresh" size={20} color={Colors.surface} />
                      </View>
                      <Text style={[styles.menuLabel, { color: Colors.error }]}>重新连接</Text>
                    </TouchableOpacity>
                  </>
                )}

                <View style={styles.divider} />

                {/* 清空聊天 */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleAction('clear_chat')}
                >
                  <View style={[styles.iconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                    <Icon name="trash-outline" size={20} color={Colors.error} />
                  </View>
                  <Text style={[styles.menuLabel, { color: Colors.error }]}>清空聊天记录</Text>
                </TouchableOpacity>
              </View>

              {/* 取消按钮 */}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
              >
                <Text style={styles.cancelText}>取消</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.md,
    ...Shadows.lg,
  },
  header: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.textSecondary,
  },
  itemsContainer: {
    paddingVertical: Spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  labelContainer: {
    flex: 1,
  },
  menuLabel: {
    fontSize: FontSizes.md,
    color: Colors.text,
    fontWeight: FontWeights.medium,
    flex: 1,
  },
  subLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginLeft: Spacing.lg + 36 + Spacing.md, // 对齐文字
  },
  cancelButton: {
    marginTop: Spacing.sm,
    marginHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.lg,
  },
  cancelText: {
    fontSize: FontSizes.md,
    color: Colors.text,
    fontWeight: FontWeights.medium,
  },
});
