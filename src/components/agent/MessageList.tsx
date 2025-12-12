/**
 * MessageList - 消息列表组件
 * 
 * 使用 FlatList 实现高性能消息渲染
 * 支持：
 * - 虚拟化滚动
 * - 自动滚动到底部
 * - 加载更多历史消息（预留）
 * - 嵌入式组件交互事件传递
 * - 消息分组（将 AI 的多轮回复合并显示）
 * - 键盘弹出时自动滚动到底部
 */

import React, { useEffect, useRef, useCallback, useMemo, useImperativeHandle, forwardRef } from 'react';
import { FlatList, StyleSheet, View, ActivityIndicator } from 'react-native';
import { AgentMessage, Attachment } from '../../types/agent';
import { MessageBubble } from './MessageBubble';
import { MessageGroup } from './MessageGroup';
import { TypingIndicator } from './TypingIndicator';
import { Colors, Spacing } from '../../constants/theme';

/**
 * 消息分组类型
 */
interface MessageGroupItem {
  id: string;
  type: 'single' | 'group';
  messages: AgentMessage[];
  isUser: boolean;
}

interface MessageListProps {
  messages: AgentMessage[];
  isTyping?: boolean;
  /** Agent 当前状态（用于显示不同的等待提示） */
  agentState?: 'idle' | 'parsing' | 'planning' | 'executing' | 'reflecting';
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  // 嵌入式组件交互回调
  onTransactionPress?: (transaction: any) => void;
  onActionButtonPress?: (action: string, payload: any) => void;
  /** 后续操作建议按钮点击回调 - 发送新消息 */
  onSuggestedActionPress?: (message: string) => void;
  // 消息操作回调
  onMessageLongPress?: (message: AgentMessage) => void;
  // 附件点击回调
  onAttachmentPress?: (attachment: Attachment) => void;
}

/**
 * MessageList 暴露的方法
 */
export interface MessageListHandle {
  scrollToEnd: (animated?: boolean) => void;
}

/**
 * 将消息列表分组
 * 规则：
 * - 用户消息单独一组
 * - 系统消息单独一组
 * - 连续的 AI 消息（assistant）合并为一组
 */
function groupMessages(messages: AgentMessage[]): MessageGroupItem[] {
  const groups: MessageGroupItem[] = [];
  let currentGroup: AgentMessage[] = [];
  let currentIsUser = false;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const isUser = msg.sender === 'user';
    const isSystem = msg.sender === 'system';

    // 系统消息单独显示
    if (isSystem) {
      // 先保存当前组
      if (currentGroup.length > 0) {
        groups.push({
          id: `group_${currentGroup[0].id}`,
          type: currentGroup.length > 1 ? 'group' : 'single',
          messages: currentGroup,
          isUser: currentIsUser,
        });
        currentGroup = [];
      }
      
      // 系统消息单独一组
      groups.push({
        id: `single_${msg.id}`,
        type: 'single',
        messages: [msg],
        isUser: false,
      });
      continue;
    }

    // 用户消息单独一组
    if (isUser) {
      // 先保存当前 AI 消息组
      if (currentGroup.length > 0) {
        groups.push({
          id: `group_${currentGroup[0].id}`,
          type: currentGroup.length > 1 ? 'group' : 'single',
          messages: currentGroup,
          isUser: currentIsUser,
        });
        currentGroup = [];
      }
      
      // 用户消息单独
      groups.push({
        id: `single_${msg.id}`,
        type: 'single',
        messages: [msg],
        isUser: true,
      });
      currentIsUser = true;
      continue;
    }

    // AI 消息 - 合并到当前组
    if (currentGroup.length === 0) {
      currentIsUser = false;
    }
    
    // 如果当前组是用户消息，先保存
    if (currentGroup.length > 0 && currentIsUser) {
      groups.push({
        id: `group_${currentGroup[0].id}`,
        type: 'single',
        messages: currentGroup,
        isUser: true,
      });
      currentGroup = [];
      currentIsUser = false;
    }
    
    currentGroup.push(msg);
  }

  // 保存最后一组
  if (currentGroup.length > 0) {
    groups.push({
      id: `group_${currentGroup[0].id}`,
      type: currentGroup.length > 1 ? 'group' : 'single',
      messages: currentGroup,
      isUser: currentIsUser,
    });
  }

  return groups;
}

export const MessageList = forwardRef<MessageListHandle, MessageListProps>(({
  messages,
  isTyping = false,
  agentState = 'idle',
  onLoadMore,
  isLoadingMore = false,
  onTransactionPress,
  onActionButtonPress,
  onSuggestedActionPress,
  onMessageLongPress,
  onAttachmentPress,
}, ref) => {
  const flatListRef = useRef<FlatList>(null);

  // 暴露 scrollToEnd 方法给父组件
  useImperativeHandle(ref, () => ({
    scrollToEnd: (animated = true) => {
      flatListRef.current?.scrollToEnd({ animated });
    },
  }), []);

  // 将消息分组
  const groupedMessages = useMemo(() => groupMessages(messages), [messages]);

  // 自动滚动到底部（新消息到来时）
  useEffect(() => {
    if (groupedMessages.length > 0) {
      // 延迟滚动，确保内容已渲染
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [groupedMessages.length, messages.length]);

  /**
   * 渲染消息组
   */
  const renderMessageGroup = useCallback(({ item }: { item: MessageGroupItem }) => {
    // 系统消息使用原来的 MessageBubble
    if (item.messages[0]?.sender === 'system') {
      return (
        <MessageBubble 
          message={item.messages[0]}
          onTransactionPress={onTransactionPress}
          onActionButtonPress={onActionButtonPress}
          onSuggestedActionPress={onSuggestedActionPress}
          onLongPress={onMessageLongPress}
          onAttachmentPress={onAttachmentPress}
        />
      );
    }

    // 单条消息或用户消息使用原来的 MessageBubble
    if (item.type === 'single' || item.isUser) {
      return (
        <MessageBubble 
          message={item.messages[0]}
          onTransactionPress={onTransactionPress}
          onActionButtonPress={onActionButtonPress}
          onSuggestedActionPress={onSuggestedActionPress}
          onLongPress={onMessageLongPress}
          onAttachmentPress={onAttachmentPress}
        />
      );
    }

    // AI 多条消息组使用 MessageGroup
    return (
      <MessageGroup
        messages={item.messages}
        isUser={false}
        onTransactionPress={onTransactionPress}
        onActionButtonPress={onActionButtonPress}
        onSuggestedActionPress={onSuggestedActionPress}
        onLongPress={onMessageLongPress}
        onAttachmentPress={onAttachmentPress}
      />
    );
  }, [onTransactionPress, onActionButtonPress, onSuggestedActionPress, onMessageLongPress, onAttachmentPress]);

  /**
   * 渲染正在输入指示器
   */
  const renderTypingIndicator = () => {
    return <TypingIndicator visible={isTyping} agentState={agentState} />;
  };

  /**
   * 渲染列表底部
   */
  const renderFooter = () => {
    return (
      <View>
        {renderTypingIndicator()}
        <View style={styles.bottomSpace} />
      </View>
    );
  };

  /**
   * 渲染列表头部（加载更多）
   */
  const renderHeader = () => {
    if (!isLoadingMore) return null;

    return (
      <View style={styles.loadingHeader}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  };

  return (
    <FlatList
      ref={flatListRef}
      data={groupedMessages}
      renderItem={renderMessageGroup}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.contentContainer}
      ListFooterComponent={renderFooter}
      ListHeaderComponent={renderHeader}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.5}
      showsVerticalScrollIndicator={false}
      // 性能优化
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      windowSize={10}
    />
  );
});

const styles = StyleSheet.create({
  contentContainer: {
    paddingVertical: Spacing.md,
    flexGrow: 1,
  },

  // 底部间距
  bottomSpace: {
    height: Spacing.sm,
  },

  // 加载头部
  loadingHeader: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
});

