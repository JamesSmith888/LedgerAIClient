import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSizes, FontWeights, Spacing } from '../constants/theme.ts';
import React from 'react';
import { useGiftedChat } from '../hooks/useGiftedChat.stomp.tsx';
import { Bubble, GiftedChat, InputToolbar, Send, } from 'react-native-gifted-chat';

//const WS_URL = 'ws://localhost:8080/ws';
// Try different endpoints - check your Spring Boot WebSocket configuration
const WS_URL = 'ws://10.0.2.2:8080/ws'; // Most common endpoint
//const WS_URL = 'ws://10.18.221.82:8080/ws'; // Most common endpoint
// const WS_URL = 'ws://10.0.2.2:8080/chat'; // Alternative
// const WS_URL = 'ws://10.0.2.2:8080/websocket'; // Alternative
// const WS_URL = 'wss://echo.websocket.org/'; // 测试服务器

export const GiftedChatScreen: React.FC = () => {
  const { messages, onSend, isConnected, isTyping, currentUser } =useGiftedChat(WS_URL);

  /**
   * 自定义气泡样式
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
          },
          right: {
            backgroundColor: Colors.primary,
          },
        }}
        textStyle={{
          left: {
            color: Colors.text,
          },
          right: {
            color: Colors.surface,
          },
        }}
      />
    );
  };

  /**
   * 自定义输入框样式
   */
  const renderInputToolbar = (props: any) => {
    return (
      <InputToolbar
        {...props}
        containerStyle={styles.inputToolbar}
        primaryStyle={styles.inputPrimary}
      />
    );
  };

  /**
   * 自定义发送按钮
   */
  const renderSend = (props: any) => {
    return (
      <Send {...props} containerStyle={styles.sendContainer}>
        <View style={styles.sendButton}>
          <Text style={styles.sendButtonText}>发送</Text>
        </View>
      </Send>
    );
  };

  /**
   * 渲染页头
   */
  const renderHeader = () => {
    return (
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Assistant</Text>
        <View
          style={[styles.statusDot, isConnected && styles.statusDotConnected]}
        />
        <Text style={styles.statusText}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {renderHeader()}
      <GiftedChat
        messages={messages}
        onSend={onSend}
        user={currentUser}
        renderBubble={renderBubble}
        renderInputToolbar={renderInputToolbar}
        renderSend={renderSend}
        isTyping={isTyping}
        messagesContainerStyle={styles.messagesContainer}
        alwaysShowSend
        placeholder="Type a message..."
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginRight: Spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textSecondary,
  },
  statusDotConnected: {
    backgroundColor: Colors.success,
  },
  statusText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },
  messagesContainer: {
    backgroundColor: Colors.background,
  },
  inputToolbar: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: Spacing.xs,
  },
  inputPrimary: {
    alignItems: 'center',
  },
  sendContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
  },
  sendButtonText: {
    color: Colors.surface,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
});
