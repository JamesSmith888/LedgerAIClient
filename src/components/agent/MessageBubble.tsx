/**
 * MessageBubble - 消息气泡组件
 * 
 * 可扩展的消息展示组件，支持：
 * - 文本消息
 * - 系统消息
 * - 工具调用（可折叠）
 * - 思考过程（实时显示，低调样式）
 * - 嵌入式富内容（交易列表、交易详情、统计卡片等）
 * - 附件（图片、文件等）
 */

import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
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
  // 增强组件
  DynamicCard,
  KeyValueListDisplay,
  ProgressCard,
  ComparisonCard,
  PieChartDisplay,
  BarChartDisplay,
} from './embedded';

interface MessageBubbleProps {
  message: AgentMessage;
  showTimestamp?: boolean;
  onTransactionPress?: (transaction: any) => void;
  onActionButtonPress?: (action: string, payload: any) => void;
  /** 长按消息回调 - 用于显示操作菜单 */
  onLongPress?: (message: AgentMessage) => void;
  /** 点击附件回调（用于全屏预览） */
  onAttachmentPress?: (attachment: Attachment) => void;
}

/**
 * 渲染附件列表
 */
const renderAttachments = (
  attachments: Attachment[],
  isUser: boolean,
  onPress?: (attachment: Attachment) => void
): React.ReactNode => {
  if (!attachments || attachments.length === 0) return null;

  const imageAttachments = attachments.filter(a => a.type === 'image');
  
  if (imageAttachments.length === 0) return null;

  // 单图布局
  if (imageAttachments.length === 1) {
    const attachment = imageAttachments[0];
    return (
      <Pressable
        style={styles.singleImageContainer}
        onPress={() => onPress?.(attachment)}
      >
        <Image
          source={{ uri: attachment.uri }}
          style={styles.singleImage}
          resizeMode="cover"
        />
      </Pressable>
    );
  }

  // 多图网格布局
  return (
    <View style={styles.imageGrid}>
      {imageAttachments.slice(0, 4).map((attachment, index) => (
        <Pressable
          key={attachment.id}
          style={[
            styles.gridImageContainer,
            imageAttachments.length === 2 && styles.gridImageHalf,
            imageAttachments.length === 3 && index === 0 && styles.gridImageLarge,
          ]}
          onPress={() => onPress?.(attachment)}
        >
          <Image
            source={{ uri: attachment.uri }}
            style={styles.gridImage}
            resizeMode="cover"
          />
          {/* 显示更多图片数量 */}
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
 * 渲染嵌入式内容
 */
const renderEmbeddedContent = (
  type: EmbeddedContentType, 
  data: any,
  handlers: {
    onTransactionPress?: (transaction: any) => void;
    onActionButtonPress?: (action: string, payload: any) => void;
  }
): React.ReactNode => {
  switch (type) {
    case 'transaction_list':
      return (
        <TransactionListDisplay
          data={data}
          onTransactionPress={handlers.onTransactionPress}
        />
      );
    
    case 'transaction_detail':
      return (
        <TransactionDetailDisplay
          transaction={data}
          onPress={handlers.onTransactionPress}
        />
      );
    
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
 * Markdown 样式配置 - 用于 Assistant 消息的 Markdown 渲染
 * 保持与原有 assistantText 样式一致的基础上，增加 Markdown 特有样式
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
  // 代码块
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
  // 列表
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
  // 引用
  blockquote: {
    backgroundColor: Colors.backgroundSecondary,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    paddingLeft: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginVertical: Spacing.xs,
  },
  // 链接
  link: {
    color: Colors.primary,
    textDecorationLine: 'underline' as any,
  },
  // 加粗和斜体
  strong: {
    fontWeight: FontWeights.bold as any,
  },
  em: {
    fontStyle: 'italic' as any,
  },
  // 分隔线
  hr: {
    backgroundColor: Colors.border,
    height: 1,
    marginVertical: Spacing.sm,
  },
  // 表格（如果需要）
  table: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    marginVertical: Spacing.xs,
  },
  th: {
    backgroundColor: Colors.backgroundSecondary,
    padding: Spacing.xs,
    fontWeight: FontWeights.semibold as any,
  },
  td: {
    padding: Spacing.xs,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
});

export const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  showTimestamp = true,
  onTransactionPress,
  onActionButtonPress,
  onLongPress,
  onAttachmentPress,
}) => {
  /**
   * 处理长按事件
   */
  const handleLongPress = useCallback(() => {
    onLongPress?.(message);
  }, [message, onLongPress]);

  /**
   * Markdown 规则配置 - 禁用图片渲染（我们有专门的附件处理）
   */
  const markdownRules = useMemo(() => ({
    image: () => null, // 禁用内联图片，使用附件系统处理
  }), []);

  const isUser = message.sender === 'user';
  const isSystem = message.sender === 'system';
  const isToolCall = message.type === 'tool_call';
  const isToolResult = message.type === 'tool_result';
  const isThinking = message.type === 'thinking';
  const isEmbedded = message.type === 'embedded';
  const isPlan = message.type === 'plan';
  const hasAttachments = message.metadata?.attachments && message.metadata.attachments.length > 0;
  const hasContent = message.content && message.content.trim().length > 0;

  // 系统消息特殊样式
  if (isSystem) {
    return (
      <View style={styles.systemContainer}>
        <Text style={styles.systemText}>{message.content}</Text>
      </View>
    );
  }

  // 执行计划消息 - 使用 PlanDisplay 组件
  if (isPlan && message.metadata?.plan) {
    return (
      <View style={styles.toolCallWrapper}>
        <PlanDisplay plan={message.metadata.plan} defaultExpanded={false} />
      </View>
    );
  }

  // 工具调用消息 - 使用可折叠组件
  if (isToolCall) {
    const toolCallData: ToolCallData = message.metadata?.toolCallData || {
      toolName: message.metadata?.toolName || 'unknown_tool',
      status: 'running',
      timestamp: message.timestamp,
    };
    
    return (
      <View style={styles.toolCallWrapper}>
        <ToolCallDisplay toolCall={toolCallData} />
      </View>
    );
  }

  // 工具结果消息 - 使用可折叠组件
  if (isToolResult) {
    const toolCallData: ToolCallData = message.metadata?.toolCallData || {
      toolName: message.metadata?.toolName || 'unknown_tool',
      status: 'completed',
      result: message.content,
      timestamp: message.timestamp,
    };
    
    return (
      <View style={styles.toolCallWrapper}>
        <ToolCallDisplay toolCall={toolCallData} />
      </View>
    );
  }

  // 思考过程消息 - 更低调的样式
  if (isThinking) {
    return (
      <View style={styles.thinkingContainer}>
        <View style={styles.thinkingDot} />
        <Text style={styles.thinkingText}>{message.content}</Text>
      </View>
    );
  }

  // 嵌入式内容消息 - 从 metadata.embeddedContent 读取
  if (isEmbedded && message.metadata?.embeddedContent) {
    const { type, data } = message.metadata.embeddedContent;
    return (
      <View style={[styles.container, styles.assistantContainer]}>
        <View style={styles.embeddedMessageContainer}>
          <View style={styles.embeddedContentWrapper}>
            {renderEmbeddedContent(type, data, {
              onTransactionPress,
              onActionButtonPress,
            })}
          </View>
          
          {showTimestamp && (
            <Text style={[styles.timestamp, styles.assistantTimestamp, styles.embeddedTimestamp]}>
              {formatTime(message.timestamp)}
            </Text>
          )}
        </View>
      </View>
    );
  }

  // 用户消息
  if (isUser) {
    // 带附件的用户消息
    if (hasAttachments) {
      return (
        <View style={[styles.container, styles.userContainer]}>
          <Pressable
            style={({ pressed }) => [
              styles.attachmentBubble,
              styles.userAttachmentBubble,
              pressed && styles.bubblePressed,
            ]}
            onLongPress={handleLongPress}
            delayLongPress={300}
          >
            {/* 附件区域 */}
            {renderAttachments(message.metadata!.attachments!, isUser, onAttachmentPress)}
            
            {/* 文本内容（如果有） */}
            {hasContent && (
              <View style={styles.attachmentTextContainer}>
                <Text style={[styles.messageText, styles.userText]}>
                  {message.content}
                </Text>
              </View>
            )}
            
            {showTimestamp && (
              <Text style={[styles.timestamp, styles.userTimestamp, styles.attachmentTimestamp]}>
                {formatTime(message.timestamp)}
              </Text>
            )}
          </Pressable>

          {message.status === 'error' && (
            <Text style={styles.errorIndicator}>!</Text>
          )}
        </View>
      );
    }

    // 纯文本用户消息
    return (
      <View style={[styles.container, styles.userContainer]}>
        <Pressable
          style={({ pressed }) => [
            styles.bubble,
            styles.userBubble,
            pressed && styles.bubblePressed,
          ]}
          onLongPress={handleLongPress}
          delayLongPress={300}
          android_ripple={{ color: 'rgba(255, 255, 255, 0.2)', borderless: false }}
        >
          <Text style={[styles.messageText, styles.userText]}>
            {message.content}
          </Text>
          
          {showTimestamp && (
            <Text style={[styles.timestamp, styles.userTimestamp]}>
              {formatTime(message.timestamp)}
            </Text>
          )}
        </Pressable>

        {message.status === 'error' && (
          <Text style={styles.errorIndicator}>!</Text>
        )}
      </View>
    );
  }

  // 普通 Assistant 消息
  return (
    <View style={[styles.container, styles.assistantContainer]}>
      <Pressable
        style={({ pressed }) => [
          styles.bubble,
          styles.assistantBubble,
          pressed && styles.bubblePressed,
        ]}
        onLongPress={handleLongPress}
        delayLongPress={300}
        android_ripple={{ color: 'rgba(0, 0, 0, 0.1)', borderless: false }}
      >
        <Markdown style={markdownStyles} rules={markdownRules}>
          {message.content}
        </Markdown>
        
        {showTimestamp && (
          <Text style={[styles.timestamp, styles.assistantTimestamp]}>
            {formatTime(message.timestamp)}
          </Text>
        )}
      </Pressable>

      {message.status === 'error' && (
        <Text style={styles.errorIndicator}>!</Text>
      )}
    </View>
  );
};

/**
 * 格式化时间
 */
const formatTime = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
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

  // 气泡
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.lg,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    width: '95%', // 固定宽度，确保嵌入式内容有足够空间
    maxWidth: '95%',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: 4,
  },
  bubblePressed: {
    opacity: 0.7,
  },

  // 文本
  messageText: {
    fontSize: FontSizes.md,
    lineHeight: 22,
  },
  userText: {
    color: Colors.surface,
  },
  assistantText: {
    color: Colors.text,
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
  },
  assistantTimestamp: {
    color: Colors.textSecondary,
  },

  // 系统消息
  systemContainer: {
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  systemText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.round,
  },

  // 错误指示器
  errorIndicator: {
    color: Colors.error,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    marginLeft: Spacing.xs,
  },

  // 工具调用包装器 - 可折叠组件的容器
  toolCallWrapper: {
    paddingHorizontal: Spacing.sm,
    marginVertical: 2,
  },

  // 思考过程消息 - 更低调的样式
  thinkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 2,
  },
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

  // 嵌入式内容样式
  embeddedMessageContainer: {
    maxWidth: '98%', // 增加宽度，让嵌入内容有足够空间
    minWidth: '85%', // 确保最小宽度，避免内容被压缩
  },
  embeddedTextBubble: {
    marginBottom: Spacing.xs,
  },
  embeddedContentWrapper: {
    marginVertical: 2,
  },
  embeddedTimestamp: {
    marginTop: 2,
    paddingLeft: Spacing.xs,
  },

  // 附件消息样式
  attachmentBubble: {
    maxWidth: '75%',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  userAttachmentBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  assistantAttachmentBubble: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: 4,
  },
  attachmentTextContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  attachmentTimestamp: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },

  // 单图样式
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

  // 多图网格样式
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
  gridImageLarge: {
    width: '100%',
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
