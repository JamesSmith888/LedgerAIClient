import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Animated,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSizes, FontWeights, Spacing, BorderRadius } from '../constants/theme.ts';
import React, { useState, useRef, useEffect } from 'react';
import { useGiftedChat } from '../hooks/useGiftedChat.stomp.tsx';
import {
  Bubble,
  GiftedChat,
  InputToolbar,
  Send,
  Day,
  Time,
  MessageText,
  LoadEarlier,
  SystemMessage,
} from 'react-native-gifted-chat';
import { useAuth } from '../context/AuthContext.tsx';
import type { IMessage } from 'react-native-gifted-chat';

const WS_URL = 'ws://localhost:8080/ws';

// 快捷问题配置
const QUICK_QUESTIONS = [
  { id: '1', text: '今天的支出是多少？', icon: '💰' },
  { id: '2', text: '这个月的收支情况', icon: '📊' },
  { id: '3', text: '帮我分析消费趋势', icon: '📈' },
  { id: '4', text: '推荐省钱建议', icon: '💡' },
];

export const GiftedChatScreen: React.FC = () => {
  const { token, user } = useAuth();
  const { messages, onSend, isConnected, isTyping, currentUser } = useGiftedChat(
    WS_URL,
    token,
    user?._id
  );

  // 状态管理
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isLoadingEarlier, setIsLoadingEarlier] = useState(false);

  // 动画
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollButtonAnim = useRef(new Animated.Value(0)).current;

  // 初始化动画
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  // 监听键盘，隐藏快捷问题栏
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setShowQuickActions(false)
    );

    return () => {
      keyboardDidShowListener.remove();
    };
  }, []);

  /**
   * 📚 学习点1：自定义气泡样式
   * renderBubble 让你可以完全自定义消息气泡的外观
   */
  const renderBubble = (props: any) => {
    return (
      <Bubble
        {...props}
        wrapperStyle={{
          left: {
            backgroundColor: Colors.surface,
            borderWidth: 1,
            borderColor: Colors.border,
            borderRadius: BorderRadius.lg,
            marginVertical: 4,
          },
          right: {
            backgroundColor: Colors.primary,
            borderRadius: BorderRadius.lg,
            marginVertical: 4,
          },
        }}
        textStyle={{
          left: {
            color: Colors.text,
            fontSize: FontSizes.md,
            lineHeight: 22,
          },
          right: {
            color: Colors.surface,
            fontSize: FontSizes.md,
            lineHeight: 22,
          },
        }}
        // 添加时间戳样式
        timeTextStyle={{
          left: {
            color: Colors.textSecondary,
            fontSize: FontSizes.xs,
          },
          right: {
            color: Colors.surface,
            fontSize: FontSizes.xs,
            opacity: 0.8,
          },
        }}
      />
    );
  };

  /**
   * 📚 学习点2：自定义输入工具栏
   * InputToolbar 包含输入框和附加功能按钮
   */
  const renderInputToolbar = (props: any) => {
    return (
      <InputToolbar
        {...props}
        containerStyle={styles.inputToolbar}
        primaryStyle={styles.inputPrimary}
        // 当未连接时禁用输入
        renderActions={() => (
          isConnected ? null : (
            <View style={styles.disabledInputOverlay}>
              <Text style={styles.disabledInputText}>连接已断开</Text>
            </View>
          )
        )}
      />
    );
  };

  /**
   * 📚 学习点3：自定义发送按钮
   * 带有动画和状态反馈的发送按钮
   */
  const renderSend = (props: any) => {
    const { text } = props;
    const isDisabled = !isConnected || !text?.trim();

    return (
      <Send
        {...props}
        containerStyle={styles.sendContainer}
        disabled={isDisabled}
      >
        <View
          style={[
            styles.sendButton,
            isDisabled && styles.sendButtonDisabled
          ]}
        >
          <Text style={styles.sendButtonText}>
            {isTyping ? '⏱' : '发送'}
          </Text>
        </View>
      </Send>
    );
  };

  /**
   * 📚 学习点4：渲染日期分隔符
   * Day 组件用于显示日期分组
   */
  const renderDay = (props: any) => {
    return (
      <Day
        {...props}
        textStyle={styles.dayText}
        containerStyle={styles.dayContainer}
      />
    );
  };

  /**
   * 📚 学习点5：渲染时间戳
   * Time 组件显示每条消息的具体时间
   */
  const renderTime = (props: any) => {
    return (
      <Time
        {...props}
        timeTextStyle={{
          left: styles.timeTextLeft,
          right: styles.timeTextRight,
        }}
      />
    );
  };

  /**
   * 📚 学习点6：自定义消息文本
   * MessageText 可以添加特殊样式或处理链接
   */
  const renderMessageText = (props: any) => {
    return (
      <MessageText
        {...props}
        customTextStyle={styles.messageText}
        linkStyle={{
          left: styles.linkLeft,
          right: styles.linkRight,
        }}
      />
    );
  };

  /**
   * 📚 学习点7：加载更多消息
   * LoadEarlier 用于显示"加载更多"按钮
   */
  const renderLoadEarlier = (props: any) => {
    return (
      <LoadEarlier
        {...props}
        isLoadingEarlier={isLoadingEarlier}
        label="加载历史消息"
        containerStyle={styles.loadEarlierContainer}
        textStyle={styles.loadEarlierText}
      />
    );
  };

  /**
   * 📚 学习点8：系统消息
   * SystemMessage 用于显示系统提示（如"用户加入"）
   */
  const renderSystemMessage = (props: any) => {
    return (
      <SystemMessage
        {...props}
        containerStyle={styles.systemMessageContainer}
        textStyle={styles.systemMessageText}
      />
    );
  };

  /**
   * 📚 学习点9：页面头部
   * 包含标题、连接状态和操作按钮
   */
  const renderHeader = () => {
    return (
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>AI 助手</Text>
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusDot,
                isConnected && styles.statusDotConnected
              ]}
            />
            <Text style={styles.statusText}>
              {isConnected ? '在线' : '离线'}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleClearChat}
          >
            <Text style={styles.headerButtonText}>🗑️</Text>
          </TouchableOpacity>

          {!isConnected && (
            <TouchableOpacity
              style={[styles.headerButton, styles.reconnectButton]}
              onPress={handleReconnect}
            >
              <Text style={styles.headerButtonText}>🔄</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  /**
   * 📚 学习点11：空状态提示
   * 当没有消息时显示友好提示
   */
  const renderEmpty = () => {
    if (messages.length > 0) return null;

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🤖</Text>
        <Text style={styles.emptyTitle}>AI 助手已就绪</Text>
        <Text style={styles.emptySubtitle}>
          问我任何关于记账、理财的问题吧！
        </Text>
      </View>
    );
  };

  /**
   * 📚 学习点12：滚动到底部按钮
   * 当有新消息且用户不在底部时显示
   */
  const renderScrollToBottom = () => {
    if (!showScrollToBottom) return null;

    return (
      <Animated.View
        style={[
          styles.scrollToBottomButton,
          { opacity: scrollButtonAnim }
        ]}
      >
        <TouchableOpacity
          onPress={handleScrollToBottom}
          style={styles.scrollToBottomTouchable}
        >
          <Text style={styles.scrollToBottomText}>↓</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  /**
   * 📚 学习点13：加载指示器
   * 显示连接或加载状态
   */
  const renderLoading = () => {
    if (isConnected) return null;

    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>正在连接...</Text>
      </View>
    );
  };

  /**
   * 📚 学习点14：消息长按菜单
   * 处理消息的长按操作
   */
  const onLongPress = (context: any, message: IMessage) => {
    const options = ['复制', '删除', '取消'];
    const cancelButtonIndex = options.length - 1;

    // 在实际项目中，这里应该使用 ActionSheet
    Alert.alert(
      '消息操作',
      message.text,
      [
        {
          text: '复制',
          onPress: () => handleCopyMessage(message),
        },
        {
          text: '删除',
          onPress: () => handleDeleteMessage(message),
          style: 'destructive',
        },
        {
          text: '取消',
          style: 'cancel',
        },
      ]
    );
  };

  // ==================== 事件处理函数 ====================

  /**
   * 处理快捷问题点击
   */
  const handleQuickQuestion = (text: string) => {
    const newMessage: IMessage = {
      _id: Date.now(),
      text,
      createdAt: new Date(),
      user: currentUser,
    };
    onSend([newMessage]);
    setShowQuickActions(false);
  };

  /**
   * 清空聊天记录
   */
  const handleClearChat = () => {
    Alert.alert(
      '清空聊天记录',
      '确定要清空所有聊天记录吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          style: 'destructive',
          onPress: () => {
            // 这里应该调用清空消息的方法
            console.log('清空聊天记录');
            setShowQuickActions(true);
          },
        },
      ]
    );
  };

  /**
   * 重新连接
   */
  const handleReconnect = () => {
    console.log('尝试重新连接...');
    // 这里应该调用重连方法
  };

  /**
   * 滚动到底部
   */
  const handleScrollToBottom = () => {
    setShowScrollToBottom(false);
    // GiftedChat 会自动滚动到底部
  };

  /**
   * 复制消息
   */
  const handleCopyMessage = (message: IMessage) => {
    // 这里应该使用 Clipboard API
    console.log('复制消息:', message.text);
    Alert.alert('成功', '消息已复制到剪贴板');
  };

  /**
   * 删除消息
   */
  const handleDeleteMessage = (message: IMessage) => {
    console.log('删除消息:', message._id);
    // 这里应该从消息列表中删除
  };

  /**
   * 加载更多历史消息
   */
  const handleLoadEarlier = async () => {
    setIsLoadingEarlier(true);
    // 模拟加载
    setTimeout(() => {
      setIsLoadingEarlier(false);
      console.log('加载历史消息');
    }, 1000);
  };

  /**
   * 监听滚动位置
   */
  const onListViewLayout = () => {
    // 可以在这里处理滚动事件
  };

  const renderFooter = () => {
    if (!showQuickActions || messages.length > 1) {
      return null;
    }

    return (
      <Animated.View
        style={[
          styles.quickActionsFooter,
          { opacity: fadeAnim }
        ]}
      >
        <Text style={styles.quickActionsTitle}>快速提问 💬</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickActionsScroll}
        >
          {QUICK_QUESTIONS.map(question => (
            <TouchableOpacity
              key={question.id}
              style={styles.quickActionButton}
              onPress={() => handleQuickQuestion(question.text)}
            >
              <Text style={styles.quickActionIcon}>{question.icon}</Text>
              <Text style={styles.quickActionText}>{question.text}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
    );

  }

  // ==================== 主渲染 ====================

  return (
    <SafeAreaView style={styles.safeArea}>
      {renderHeader()}
      {renderLoading()}

      <View style={styles.chatContainer}>
        <GiftedChat
          messages={messages}
          onSend={onSend}
          user={currentUser}

          // 自定义渲染器
          renderBubble={renderBubble}
          renderInputToolbar={renderInputToolbar}
          renderSend={renderSend}
          renderDay={renderDay}
          renderTime={renderTime}
          renderMessageText={renderMessageText}
          renderLoadEarlier={renderLoadEarlier}
          renderSystemMessage={renderSystemMessage}
          renderFooter={renderFooter}

          // 行为配置
          isTyping={isTyping}
          alwaysShowSend
          scrollToBottom
          showUserAvatar
          showAvatarForEveryMessage={false}

          // 样式
          messagesContainerStyle={styles.messagesContainer}
          placeholder="输入消息..."
          textInputStyle={styles.textInput}

          // 时间显示
          renderTime={renderTime}
          timeFormat="HH:mm"
          dateFormat="YYYY-MM-DD"

          // 长按消息
          onLongPress={onLongPress}

          // 加载更多
          loadEarlier={messages.length > 10}
          onLoadEarlier={handleLoadEarlier}

          // 其他配置
          inverted={true}
          infiniteScroll
          keyboardShouldPersistTaps="never"

          // 本地化
          locale="zh-CN"
        />

        {renderEmpty()}
        {renderScrollToBottom()}
      </View>
    </SafeAreaView>
  );
};

// ==================== 样式定义 ====================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  chatContainer: {
    flex: 1,
  },

  // 头部样式
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginRight: Spacing.sm,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textSecondary,
    marginRight: Spacing.xs,
  },
  statusDotConnected: {
    backgroundColor: Colors.success,
  },
  statusText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  reconnectButton: {
    backgroundColor: Colors.warning,
  },
  headerButtonText: {
    fontSize: FontSizes.lg,
  },

  // 消息容器样式
  messagesContainer: {
    backgroundColor: Colors.background,
    paddingBottom: Spacing.md,
  },

  // 输入工具栏样式
  inputToolbar: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  inputPrimary: {
    alignItems: 'center',
  },
  textInput: {
    fontSize: FontSizes.md,
    color: Colors.text,
    lineHeight: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  disabledInputOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  disabledInputText: {
    color: Colors.surface,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
  },

  // 发送按钮样式
  sendContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.round,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.textDisabled,
    opacity: 0.5,
  },
  sendButtonText: {
    color: Colors.surface,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },

  // 日期和时间样式
  dayContainer: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  dayText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeights.medium,
  },
  timeTextLeft: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },
  timeTextRight: {
    fontSize: FontSizes.xs,
    color: Colors.surface,
    opacity: 0.8,
    marginRight: Spacing.xs,
  },

  // 消息文本样式
  messageText: {
    fontSize: FontSizes.md,
    lineHeight: 22,
  },
  linkLeft: {
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  linkRight: {
    color: Colors.surface,
    textDecorationLine: 'underline',
  },

  // 加载更多样式
  loadEarlierContainer: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  loadEarlierText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: FontWeights.medium,
  },

  // 系统消息样式
  systemMessageContainer: {
    marginVertical: Spacing.sm,
  },
  systemMessageText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // 快捷问题栏样式
  quickActionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  quickActionsTitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeights.semibold,
    marginBottom: Spacing.sm,
  },
  quickActionsScroll: {
    paddingRight: Spacing.md,
  },
  quickActionButton: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginRight: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickActionIcon: {
    fontSize: FontSizes.md,
    marginRight: Spacing.xs,
  },
  quickActionText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    fontWeight: FontWeights.medium,
  },

  // 空状态样式
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // 滚动到底部按钮
  scrollToBottomButton: {
    position: 'absolute',
    right: Spacing.md,
    bottom: Spacing.xl,
  },
  scrollToBottomTouchable: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  scrollToBottomText: {
    color: Colors.surface,
    fontSize: 24,
    fontWeight: FontWeights.bold,
  },

  // 加载指示器样式
  loadingContainer: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  loadingText: {
    marginTop: Spacing.sm,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  quickActionsFooter: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    minHeight: 100,
  },
});