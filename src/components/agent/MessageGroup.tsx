/**
 * MessageGroup - 消息分组组件
 * 
 * 将同一轮对话中 AI 的多条消息（thinking、tool_call、tool_result、embedded、text）
 * 合并显示在一个统一的对话块中，提供更好的视觉体验。
 */

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Markdown from 'react-native-markdown-display';
import { AgentMessage, EmbeddedContentType, Attachment } from '../../types/agent';
import { Colors, Spacing, FontSizes, BorderRadius, FontWeights, Shadows } from '../../constants/theme';
import { 
  ToolCallDisplay, 
  ToolCallData,
  TransactionListDisplay,
  TransactionDetailDisplay,
  StatisticsCardDisplay,
  ActionButtonsDisplay,
  PlanDisplay,
  ResultMessageDisplay,
  // 增强组件
  DynamicCard,
  KeyValueListDisplay,
  ProgressCard,
  ComparisonCard,
  PieChartDisplay,
  BarChartDisplay,
} from './embedded';

interface MessageGroupProps {
  /** 分组中的所有消息 */
  messages: AgentMessage[];
  /** 是否来自用户 */
  isUser: boolean;
  /** 嵌入式内容交互回调 */
  onTransactionPress?: (transaction: any) => void;
  onActionButtonPress?: (action: string, payload: any) => void;
  /** 后续操作建议按钮点击回调 */
  onSuggestedActionPress?: (message: string) => void;
  /** 长按消息回调 */
  onLongPress?: (message: AgentMessage) => void;
  /** 点击附件回调 */
  onAttachmentPress?: (attachment: Attachment) => void;
}

/**
 * Markdown 样式配置
 */
const markdownStyles = StyleSheet.create({
  body: {
    fontSize: FontSizes.md,
    lineHeight: 22,
    color: Colors.text,
  },
  heading1: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold as any,
    color: Colors.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  heading2: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold as any,
    color: Colors.text,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  heading3: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold as any,
    color: Colors.text,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: Spacing.xs,
  },
  code_inline: {
    backgroundColor: Colors.backgroundSecondary,
    color: Colors.primary,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: 'monospace',
    fontSize: FontSizes.sm,
  },
  fence: {
    backgroundColor: Colors.backgroundSecondary,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginVertical: Spacing.xs,
  },
  code_block: {
    backgroundColor: Colors.backgroundSecondary,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    fontFamily: 'monospace',
    fontSize: FontSizes.sm,
  },
  bullet_list: {
    marginVertical: Spacing.xs,
  },
  ordered_list: {
    marginVertical: Spacing.xs,
  },
  list_item: {
    flexDirection: 'row',
    marginVertical: 2,
  },
  blockquote: {
    backgroundColor: Colors.backgroundSecondary,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    paddingLeft: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginVertical: Spacing.xs,
  },
  link: {
    color: Colors.primary,
    textDecorationLine: 'underline' as any,
  },
  strong: {
    fontWeight: FontWeights.bold as any,
  },
  em: {
    fontStyle: 'italic' as any,
  },
  hr: {
    backgroundColor: Colors.border,
    height: 1,
    marginVertical: Spacing.sm,
  },
});

/**
 * 渲染嵌入式内容
 */
const renderEmbeddedContent = (
  type: EmbeddedContentType, 
  data: any,
  handlers: {
    onTransactionPress?: (transaction: any) => void;
    onActionButtonPress?: (action: string, payload: any) => void;
    onSuggestedActionPress?: (message: string) => void;
  }
): React.ReactNode => {
  switch (type) {
    case 'transaction_list':
      return (
        <TransactionListDisplay
          data={data}
          onTransactionPress={handlers.onTransactionPress}
          onSuggestedActionPress={handlers.onSuggestedActionPress}
        />
      );
    case 'transaction_detail':
      return (
        <TransactionDetailDisplay
          transaction={data}
          onPress={handlers.onTransactionPress}
        />
      );
    case 'result_message':
      return <ResultMessageDisplay data={data} />;
    case 'statistics_card':
      return <StatisticsCardDisplay data={data} />;
    case 'action_buttons':
      return (
        <ActionButtonsDisplay
          data={data}
          onPress={handlers.onActionButtonPress}
        />
      );
    
    // ========== 增强组件 ==========
    
    case 'dynamic_card':
      return (
        <DynamicCard
          data={data}
          onButtonPress={handlers.onActionButtonPress}
        />
      );
    
    case 'key_value_list':
      return <KeyValueListDisplay data={data} />;
    
    case 'progress_card':
      return <ProgressCard data={data} />;
    
    case 'comparison_card':
      return <ComparisonCard data={data} />;
    
    case 'pie_chart':
      return <PieChartDisplay data={data} />;
    
    case 'bar_chart':
      return <BarChartDisplay data={data} />;

    default:
      return null;
  }
};

/**
 * 格式化时间
 */
const formatTime = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const MessageGroup: React.FC<MessageGroupProps> = ({
  messages,
  isUser,
  onTransactionPress,
  onActionButtonPress,
  onSuggestedActionPress,
  onLongPress,
  onAttachmentPress,
}) => {
  const markdownRules = useMemo(() => ({
    image: () => null,
  }), []);

  const thinkingMessages = useMemo(
    () => messages.filter(m => m.type === 'thinking' && m.content && m.content.trim()),
    [messages]
  );
  const [thinkingCollapsed, setThinkingCollapsed] = useState(true);

  // 获取最后一条消息的时间戳
  const lastMessage = messages[messages.length - 1];
  const timestamp = lastMessage?.timestamp;

  /**
   * 渲染附件
   */
  const renderAttachments = (attachments: Attachment[]) => {
    if (!attachments || attachments.length === 0) return null;

    const imageAttachments = attachments.filter(a => a.type === 'image');
    if (imageAttachments.length === 0) return null;

    if (imageAttachments.length === 1) {
      const attachment = imageAttachments[0];
      return (
        <Pressable
          style={styles.singleImageContainer}
          onPress={() => onAttachmentPress?.(attachment)}
        >
          <Image
            source={{ uri: attachment.uri }}
            style={styles.singleImage}
            resizeMode="cover"
          />
        </Pressable>
      );
    }

    return (
      <View style={styles.imageGrid}>
        {imageAttachments.slice(0, 4).map((attachment, index) => (
          <Pressable
            key={attachment.id}
            style={[
              styles.gridImageContainer,
              imageAttachments.length === 2 && styles.gridImageHalf,
            ]}
            onPress={() => onAttachmentPress?.(attachment)}
          >
            <Image
              source={{ uri: attachment.uri }}
              style={styles.gridImage}
              resizeMode="cover"
            />
            {index === 3 && imageAttachments.length > 4 && (
              <View style={styles.moreOverlay}>
                <Text style={styles.moreText}>+{imageAttachments.length - 4}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>
    );
  };

  /**
   * 渲染单条消息内容（不带容器）
   */
  const renderMessageContent = (message: AgentMessage, index: number) => {
    const isToolCall = message.type === 'tool_call';
    const isToolResult = message.type === 'tool_result';
    const isThinking = message.type === 'thinking';
    const isReflection = message.type === 'reflection';
    const isEmbedded = message.type === 'embedded';
    const isPlan = message.type === 'plan';
    const hasAttachments = message.metadata?.attachments && message.metadata.attachments.length > 0;

    // 思考过程 - 小字体，低调显示
    if (isThinking) {
      return null;
    }

    // 反思消息 - 以低调方式显示，类似思考过程
    if (isReflection) {
      return (
        <View key={message.id} style={styles.reflectionRow}>
          <Icon name="bulb-outline" size={12} color={Colors.textSecondary} style={styles.reflectionIcon} />
          <Text style={styles.reflectionText}>{message.content}</Text>
        </View>
      );
    }

    // 执行计划 - 使用 PlanDisplay 组件
    if (isPlan && message.metadata?.plan) {
      return (
        <View key={message.id} style={styles.toolCallRow}>
          <PlanDisplay plan={message.metadata.plan} defaultExpanded={false} />
        </View>
      );
    }

    // 工具调用/结果 - 使用可折叠组件
    if (isToolCall || isToolResult) {
      const toolCallData: ToolCallData = message.metadata?.toolCallData || {
        toolName: message.metadata?.toolName || 'unknown_tool',
        status: isToolCall ? 'running' : 'completed',
        result: isToolResult ? message.content : undefined,
        timestamp: message.timestamp,
      };
      
      return (
        <View key={message.id} style={styles.toolCallRow}>
          <ToolCallDisplay toolCall={toolCallData} />
        </View>
      );
    }

    // 嵌入式内容
    if (isEmbedded && message.metadata?.embeddedContent) {
      const { type, data } = message.metadata.embeddedContent;
      return (
        <View key={message.id} style={styles.embeddedRow}>
          {renderEmbeddedContent(type, data, {
            onTransactionPress,
            onActionButtonPress,
            onSuggestedActionPress,
          })}
        </View>
      );
    }

    // 带附件的消息
    if (hasAttachments) {
      return (
        <View key={message.id} style={styles.attachmentRow}>
          {renderAttachments(message.metadata!.attachments!)}
          {message.content && message.content.trim() && (
            <View style={styles.attachmentTextContainer}>
              {isUser ? (
                <Text style={[styles.messageText, styles.userText]}>
                  {message.content}
                </Text>
              ) : (
                <Markdown style={markdownStyles} rules={markdownRules}>
                  {message.content}
                </Markdown>
              )}
            </View>
          )}
        </View>
      );
    }

    // 普通文本消息
    if (message.content && message.content.trim()) {
      return (
        <View key={message.id} style={styles.textRow}>
          {isUser ? (
            <Text style={[styles.messageText, styles.userText]}>
              {message.content}
            </Text>
          ) : (
            <Markdown style={markdownStyles} rules={markdownRules}>
              {message.content}
            </Markdown>
          )}
        </View>
      );
    }

    return null;
  };

  // 用户消息
  if (isUser) {
    const firstMessage = messages[0];
    const hasAttachments = firstMessage?.metadata?.attachments && firstMessage.metadata.attachments.length > 0;

    return (
      <View style={[styles.container, styles.userContainer]}>
        <Pressable
          style={({ pressed }) => [
            styles.bubble,
            styles.userBubble,
            hasAttachments && styles.attachmentBubble,
            pressed && styles.bubblePressed,
          ]}
          onLongPress={() => onLongPress?.(firstMessage)}
          delayLongPress={300}
        >
          {messages.map((msg, index) => renderMessageContent(msg, index))}
          
          <Text style={[styles.timestamp, styles.userTimestamp]}>
            {formatTime(timestamp)}
          </Text>
        </Pressable>
      </View>
    );
  }

  // AI 消息组 - 统一容器
  return (
    <View style={[styles.container, styles.assistantContainer]}>
      <Pressable
        style={({ pressed }) => [
          styles.groupBubble,
          pressed && styles.bubblePressed,
        ]}
        onLongPress={() => onLongPress?.(lastMessage)}
        delayLongPress={300}
      >
        {thinkingMessages.length > 0 && (
          <View style={styles.thinkingSection}>
            <Pressable
              style={styles.thinkingHeader}
              onPress={() => setThinkingCollapsed(v => !v)}
              hitSlop={10}
            >
              <View style={styles.thinkingHeaderLeft}>
                <View style={styles.thinkingDot} />
                <Text style={styles.thinkingHeaderText}>思考过程</Text>
              </View>
              <Icon
                name={thinkingCollapsed ? 'chevron-down-outline' : 'chevron-up-outline'}
                size={14}
                color={Colors.textSecondary}
              />
            </Pressable>

            {!thinkingCollapsed && (
              <View style={styles.thinkingBody}>
                {thinkingMessages.map(m => (
                  <View key={m.id} style={styles.thinkingRow}>
                    <Text style={styles.thinkingText}>{m.content}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {messages.map((msg, index) => renderMessageContent(msg, index))}
        
        <Text style={[styles.timestamp, styles.assistantTimestamp]}>
          {formatTime(timestamp)}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  // 容器
  container: {
    flexDirection: 'row',
    marginVertical: 2,
    paddingHorizontal: Spacing.sm,
    alignItems: 'flex-end',
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  assistantContainer: {
    justifyContent: 'flex-start',
  },

  // 用户消息气泡
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  attachmentBubble: {
    overflow: 'hidden',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  bubblePressed: {
    opacity: 0.7,
  },

  // AI 消息组气泡 - 固定 95% 宽度，容纳多种内容和嵌入式组件
  groupBubble: {
    width: '95%',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    borderBottomLeftRadius: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },

  // 消息内容行
  textRow: {
    marginVertical: 2,
  },
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 1,
    paddingVertical: 1,
  },
  thinkingSection: {
    marginVertical: 2,
  },
  thinkingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  thinkingHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thinkingHeaderText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginLeft: 6,
  },
  thinkingBody: {
    paddingLeft: 14,
    paddingRight: 4,
    paddingBottom: 4,
  },
  toolCallRow: {
    marginVertical: 2,
  },
  embeddedRow: {
    marginVertical: Spacing.xs,
  },
  attachmentRow: {
    marginVertical: 2,
  },

  // 思考样式
  thinkingDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textDisabled,
    marginRight: Spacing.xs,
  },
  thinkingText: {
    fontSize: FontSizes.xs,
    color: Colors.textLight,
    fontStyle: 'italic',
    opacity: 0.8,
  },
  reflectionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 1,
    paddingVertical: 1,
    opacity: 0.6,
  },
  reflectionIcon: {
    marginRight: Spacing.xs,
    marginTop: 2,
  },
  reflectionText: {
    flex: 1,
    fontSize: FontSizes.xs,
    color: Colors.textLight,
    fontStyle: 'italic',
    lineHeight: 16,
  },

  // 文本样式
  messageText: {
    fontSize: FontSizes.md,
    lineHeight: 22,
  },
  userText: {
    color: Colors.surface,
  },

  // 时间戳
  timestamp: {
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
  userTimestamp: {
    color: Colors.surface,
    opacity: 0.8,
    textAlign: 'right',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  assistantTimestamp: {
    color: Colors.textSecondary,
    textAlign: 'right',
  },

  // 附件样式
  attachmentTextContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  singleImageContainer: {
    width: 200,
    height: 200,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  singleImage: {
    width: '100%',
    height: '100%',
  },
  imageGrid: {
    width: 200,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridImageContainer: {
    width: '50%',
    aspectRatio: 1,
    padding: 1,
  },
  gridImageHalf: {
    width: '50%',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.sm,
  },
  moreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  moreText: {
    color: Colors.surface,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
  },
});
