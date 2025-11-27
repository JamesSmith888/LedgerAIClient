/**
 * MessageActionSheet - 消息操作菜单组件
 * 
 * 可扩展的消息操作菜单，支持：
 * - 复制文本
 * - 重试消息
 * - 引用回复
 * - 删除消息
 * - 自定义操作（通过扩展 actions 配置）
 * 
 * 设计参考：Telegram 长按消息菜单
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Clipboard,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { Icon } from '../common';
import { AgentMessage, MessageAction } from '../../types/agent';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows, FontWeights } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * 操作项配置
 */
export interface MessageActionItem {
  id: MessageAction | string;
  label: string;
  icon: string;
  color?: string;
  /** 是否为危险操作（红色显示） */
  danger?: boolean;
  /** 是否显示分隔线 */
  dividerBefore?: boolean;
  /** 显示条件：根据消息类型决定是否显示 */
  showCondition?: (message: AgentMessage) => boolean;
}

/**
 * 默认操作项配置
 */
const DEFAULT_ACTIONS: MessageActionItem[] = [
  {
    id: 'copy',
    label: '复制',
    icon: 'copy-outline',
    showCondition: (msg) => !!msg.content && msg.type !== 'tool_call' && msg.type !== 'tool_result',
  },
  {
    id: 'retry',
    label: '重新发送',
    icon: 'refresh',
    showCondition: (msg) => msg.sender === 'user',
  },
  {
    id: 'quote',
    label: '引用回复',
    icon: 'chatbox-outline',
    showCondition: (msg) => msg.type === 'text' || !msg.type,
  },
  {
    id: 'delete',
    label: '删除',
    icon: 'trash-outline',
    danger: true,
    dividerBefore: true,
  },
];

interface MessageActionSheetProps {
  /** 是否可见 */
  visible: boolean;
  /** 当前选中的消息 */
  message: AgentMessage | null;
  /** 关闭回调 */
  onClose: () => void;
  /** 操作回调 */
  onAction: (action: MessageAction | string, message: AgentMessage) => void;
  /** 自定义操作项（会与默认项合并） */
  customActions?: MessageActionItem[];
  /** 完全自定义操作项（替换默认项） */
  overrideActions?: MessageActionItem[];
}

export const MessageActionSheet: React.FC<MessageActionSheetProps> = ({
  visible,
  message,
  onClose,
  onAction,
  customActions = [],
  overrideActions,
}) => {
  // 合并操作项
  const actions = useMemo(() => {
    const baseActions = overrideActions ?? [...DEFAULT_ACTIONS, ...customActions];
    
    if (!message) return [];
    
    // 根据条件过滤显示的操作
    return baseActions.filter(action => {
      if (action.showCondition) {
        return action.showCondition(message);
      }
      return true;
    });
  }, [message, customActions, overrideActions]);

  /**
   * 处理操作点击
   */
  const handleActionPress = useCallback((action: MessageActionItem) => {
    if (!message) return;
    
    onAction(action.id, message);
    onClose();
  }, [message, onAction, onClose]);

  /**
   * 渲染消息预览
   */
  const renderMessagePreview = () => {
    if (!message) return null;
    
    const isUser = message.sender === 'user';
    const previewText = message.content.length > 100 
      ? message.content.substring(0, 100) + '...' 
      : message.content;
    
    return (
      <View style={[
        styles.previewContainer,
        isUser ? styles.previewUser : styles.previewAssistant,
      ]}>
        <Text 
          style={[
            styles.previewText,
            isUser && styles.previewTextUser,
          ]} 
          numberOfLines={3}
        >
          {previewText}
        </Text>
      </View>
    );
  };

  /**
   * 渲染操作项
   */
  const renderActionItem = (action: MessageActionItem, index: number) => {
    const isLast = index === actions.length - 1;
    
    return (
      <React.Fragment key={action.id}>
        {action.dividerBefore && <View style={styles.divider} />}
        <TouchableOpacity
          style={[
            styles.actionItem,
            isLast && styles.actionItemLast,
          ]}
          onPress={() => handleActionPress(action)}
          activeOpacity={0.6}
        >
          <Icon 
            name={action.icon} 
            size={20} 
            color={action.danger ? Colors.error : (action.color || Colors.text)} 
          />
          <Text style={[
            styles.actionLabel,
            action.danger && styles.actionLabelDanger,
            action.color && { color: action.color },
          ]}>
            {action.label}
          </Text>
        </TouchableOpacity>
      </React.Fragment>
    );
  };

  if (!message) return null;

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
            <View style={styles.sheetContainer}>
              {/* 消息预览 */}
              {renderMessagePreview()}
              
              {/* 操作菜单 */}
              <View style={styles.actionsContainer}>
                {actions.map((action, index) => renderActionItem(action, index))}
              </View>
              
              {/* 取消按钮 */}
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={onClose}
                activeOpacity={0.7}
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

/**
 * 内置操作处理器 - 可在组件外部使用
 */
export const handleBuiltInAction = (
  action: MessageAction | string,
  message: AgentMessage,
  callbacks?: {
    onCopy?: () => void;
    onRetry?: (content: string) => void;
    onQuote?: (message: AgentMessage) => void;
    onDelete?: (messageId: string) => void;
  }
) => {
  switch (action) {
    case 'copy':
      Clipboard.setString(message.content);
      callbacks?.onCopy?.();
      // 可选：显示轻量提示
      break;

    case 'retry':
      if (message.sender === 'user') {
        callbacks?.onRetry?.(message.content);
      }
      break;

    case 'quote':
      callbacks?.onQuote?.(message);
      break;

    case 'delete':
      Alert.alert(
        '删除消息',
        '确定要删除这条消息吗？',
        [
          { text: '取消', style: 'cancel' },
          {
            text: '删除',
            style: 'destructive',
            onPress: () => callbacks?.onDelete?.(message.id),
          },
        ]
      );
      break;

    default:
      console.log('未处理的操作:', action);
  }
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    marginHorizontal: Spacing.md,
    marginBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.md,
  },
  
  // 消息预览
  previewContainer: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    maxWidth: '80%',
  },
  previewUser: {
    backgroundColor: Colors.primary,
    alignSelf: 'flex-end',
  },
  previewAssistant: {
    backgroundColor: Colors.surface,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  previewText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    lineHeight: 20,
  },
  previewTextUser: {
    color: Colors.surface,
  },
  
  // 操作菜单
  actionsContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  actionItemLast: {
    borderBottomWidth: 0,
  },
  actionLabel: {
    fontSize: FontSizes.md,
    color: Colors.text,
    marginLeft: Spacing.md,
    fontWeight: FontWeights.medium,
  },
  actionLabelDanger: {
    color: Colors.error,
  },
  divider: {
    height: Spacing.xs,
    backgroundColor: Colors.backgroundSecondary,
  },
  
  // 取消按钮
  cancelButton: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    ...Shadows.md,
  },
  cancelText: {
    fontSize: FontSizes.md,
    color: Colors.primary,
    fontWeight: FontWeights.semibold,
  },
});
