# WebSocket 聊天页面实战教程 💬

## 🎯 学习目标

通过这个项目，你将学会：
1. ✅ WebSocket 实时通信
2. ✅ 消息列表的渲染和管理
3. ✅ 输入框和发送功能
4. ✅ 聊天气泡 UI 设计
5. ✅ 自动滚动到最新消息
6. ✅ 加载状态和错误处理

---

## 📚 知识准备

### WebSocket 是什么？

WebSocket 是一种网络通信协议，提供**全双工通信**（双向实时通信）。

**对比**：
- **HTTP**：客户端请求 → 服务器响应（单向）
- **WebSocket**：客户端 ↔ 服务器（双向，实时）

**适用场景**：
- 聊天应用
- 实时通知
- 在线游戏
- 股票行情

---

## 🛠️ 第一步：安装依赖

```bash
# 安装 WebSocket 库（原生支持，无需额外安装）
# React Native 已内置 WebSocket 支持

# 如果需要更强大的功能，可以安装：
npm install @react-native-community/netinfo
```

---

## 📁 第二步：创建项目结构

我们需要创建以下文件：

```
src/
├── screens/
│   └── ChatScreen.tsx          # 聊天页面（主要文件）
├── components/
│   └── chat/                   # 聊天相关组件
│       ├── ChatBubble.tsx      # 聊天气泡组件
│       ├── ChatInput.tsx       # 输入框组件
│       └── index.ts            # 导出文件
├── services/
│   └── websocket.ts            # WebSocket 服务封装
├── types/
│   └── chat.ts                 # 聊天相关类型定义
└── hooks/
    └── useWebSocket.ts         # WebSocket Hook
```

---

## 📝 第三步：定义数据类型

**文件位置**：`src/types/chat.ts`

```typescript
/**
 * 聊天相关的类型定义
 */

// 消息类型
export interface Message {
  id: string;              // 消息唯一 ID
  content: string;         // 消息内容
  sender: 'user' | 'ai';   // 发送者（用户或 AI）
  timestamp: Date;         // 发送时间
  status?: 'sending' | 'sent' | 'error';  // 消息状态
}

// WebSocket 连接状态
export enum ConnectionStatus {
  CONNECTING = 'connecting',   // 连接中
  CONNECTED = 'connected',     // 已连接
  DISCONNECTED = 'disconnected', // 已断开
  ERROR = 'error',             // 连接错误
}

// WebSocket 消息格式（与后端约定）
export interface WSMessage {
  type: 'message' | 'typing' | 'error';  // 消息类型
  content: string;                        // 内容
  timestamp?: string;                     // 时间戳
}
```

**学习要点**：
- `interface` 定义对象的结构
- `enum` 定义枚举类型（一组固定的值）
- `?` 表示可选属性

---

## 🔌 第四步：创建 WebSocket 服务

**文件位置**：`src/services/websocket.ts`

```typescript
/**
 * WebSocket 服务封装
 * 负责建立连接、发送和接收消息
 */

import { WSMessage } from '../types/chat';

// WebSocket 服务类
export class WebSocketService {
  private ws: WebSocket | null = null;  // WebSocket 实例
  private url: string;                   // 服务器地址
  private reconnectAttempts = 0;        // 重连次数
  private maxReconnectAttempts = 5;     // 最大重连次数
  private reconnectInterval = 3000;      // 重连间隔（毫秒）

  // 事件监听器
  private onMessageCallback: ((message: WSMessage) => void) | null = null;
  private onConnectionChangeCallback: ((status: string) => void) | null = null;

  constructor(url: string) {
    this.url = url;
  }

  /**
   * 连接 WebSocket
   */
  connect() {
    try {
      // 创建 WebSocket 连接
      this.ws = new WebSocket(this.url);

      // 连接成功
      this.ws.onopen = () => {
        console.log('✅ WebSocket 连接成功');
        this.reconnectAttempts = 0; // 重置重连次数
        this.onConnectionChangeCallback?.('connected');
      };

      // 接收消息
      this.ws.onmessage = (event) => {
        console.log('📨 收到消息:', event.data);
        try {
          // 解析 JSON 数据
          const message: WSMessage = JSON.parse(event.data);
          this.onMessageCallback?.(message);
        } catch (error) {
          console.error('❌ 解析消息失败:', error);
        }
      };

      // 连接关闭
      this.ws.onclose = () => {
        console.log('⚠️ WebSocket 连接关闭');
        this.onConnectionChangeCallback?.('disconnected');
        this.attemptReconnect(); // 尝试重连
      };

      // 连接错误
      this.ws.onerror = (error) => {
        console.error('❌ WebSocket 错误:', error);
        this.onConnectionChangeCallback?.('error');
      };

    } catch (error) {
      console.error('❌ 创建 WebSocket 失败:', error);
    }
  }

  /**
   * 发送消息
   */
  sendMessage(content: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message: WSMessage = {
        type: 'message',
        content,
        timestamp: new Date().toISOString(),
      };
      this.ws.send(JSON.stringify(message));
      console.log('📤 发送消息:', content);
    } else {
      console.error('❌ WebSocket 未连接，无法发送消息');
    }
  }

  /**
   * 尝试重新连接
   */
  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(\`🔄 尝试重连 (\${this.reconnectAttempts}/\${this.maxReconnectAttempts})...\`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectInterval);
    } else {
      console.error('❌ 达到最大重连次数，停止重连');
    }
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * 监听消息
   */
  onMessage(callback: (message: WSMessage) => void) {
    this.onMessageCallback = callback;
  }

  /**
   * 监听连接状态变化
   */
  onConnectionChange(callback: (status: string) => void) {
    this.onConnectionChangeCallback = callback;
  }
}
```

**学习要点**：
- `class` 面向对象编程
- `private` 私有属性（只能在类内部访问）
- `?.` 可选链操作符（安全访问可能不存在的属性）
- 回调函数模式

---

## 🪝 第五步：创建自定义 Hook

**文件位置**：`src/hooks/useWebSocket.ts`

```typescript
/**
 * WebSocket Hook
 * 封装 WebSocket 逻辑，方便在组件中使用
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { WebSocketService } from '../services/websocket';
import { Message, ConnectionStatus, WSMessage } from '../types/chat';

export const useWebSocket = (url: string) => {
  // 状态管理
  const [messages, setMessages] = useState<Message[]>([]);  // 消息列表
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    ConnectionStatus.DISCONNECTED
  );
  const [isTyping, setIsTyping] = useState(false);  // AI 是否正在输入

  // 使用 ref 保持 WebSocket 实例
  const wsService = useRef<WebSocketService | null>(null);

  /**
   * 初始化 WebSocket 连接
   */
  useEffect(() => {
    // 创建 WebSocket 服务
    wsService.current = new WebSocketService(url);

    // 监听消息
    wsService.current.onMessage((wsMessage: WSMessage) => {
      if (wsMessage.type === 'message') {
        // 收到 AI 回复
        const newMessage: Message = {
          id: Date.now().toString(),
          content: wsMessage.content,
          sender: 'ai',
          timestamp: new Date(),
          status: 'sent',
        };
        setMessages((prev) => [...prev, newMessage]);
        setIsTyping(false);
      } else if (wsMessage.type === 'typing') {
        // AI 正在输入
        setIsTyping(true);
      }
    });

    // 监听连接状态
    wsService.current.onConnectionChange((status) => {
      setConnectionStatus(status as ConnectionStatus);
    });

    // 连接 WebSocket
    wsService.current.connect();

    // 组件卸载时断开连接
    return () => {
      wsService.current?.disconnect();
    };
  }, [url]);

  /**
   * 发送消息
   */
  const sendMessage = useCallback((content: string) => {
    if (!content.trim()) return;

    // 添加用户消息到列表
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      sender: 'user',
      timestamp: new Date(),
      status: 'sending',
    };
    setMessages((prev) => [...prev, userMessage]);

    // 发送到服务器
    wsService.current?.sendMessage(content);

    // 模拟消息发送成功（实际应该由服务器确认）
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === userMessage.id ? { ...msg, status: 'sent' } : msg
        )
      );
    }, 500);
  }, []);

  /**
   * 清空消息
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,           // 消息列表
    connectionStatus,   // 连接状态
    isTyping,          // AI 是否正在输入
    sendMessage,       // 发送消息函数
    clearMessages,     // 清空消息函数
  };
};
```

**学习要点**：
- `useState` 管理组件状态
- `useEffect` 处理副作用（如 WebSocket 连接）
- `useRef` 保持引用（不会触发重新渲染）
- `useCallback` 缓存函数（优化性能）
- 数组展开运算符 `...` 用于不可变更新

---

## 💬 第六步：创建聊天气泡组件

**文件位置**：`src/components/chat/ChatBubble.tsx`

```typescript
/**
 * 聊天气泡组件
 * 显示单条消息
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Message } from '../../types/chat';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';

interface ChatBubbleProps {
  message: Message;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.sender === 'user';

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.aiContainer]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        <Text style={[styles.text, isUser ? styles.userText : styles.aiText]}>
          {message.content}
        </Text>
        <Text style={styles.time}>
          {message.timestamp.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  // 用户消息靠右
  userContainer: {
    justifyContent: 'flex-end',
  },
  // AI 消息靠左
  aiContainer: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  // 用户消息气泡（蓝色）
  userBubble: {
    backgroundColor: Colors.primary,
  },
  // AI 消息气泡（灰色）
  aiBubble: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  text: {
    fontSize: FontSizes.md,
    lineHeight: 22,
  },
  // 用户消息文字（白色）
  userText: {
    color: Colors.surface,
  },
  // AI 消息文字（黑色）
  aiText: {
    color: Colors.text,
  },
  time: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    opacity: 0.7,
  },
});
```

**学习要点**：
- 条件样式：`isUser ? styleA : styleB`
- 数组样式合并：`[style1, style2]`
- `maxWidth` 限制气泡宽度

---

## ⌨️ 第七步：创建输入框组件

**文件位置**：`src/components/chat/ChatInput.tsx`

```typescript
/**
 * 聊天输入框组件
 * 包含输入框和发送按钮
 */

import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';

interface ChatInputProps {
  onSend: (message: string) => void;  // 发送消息回调
  disabled?: boolean;                  // 是否禁用
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled = false }) => {
  const [inputText, setInputText] = useState('');

  // 处理发送
  const handleSend = () => {
    if (inputText.trim() && !disabled) {
      onSend(inputText.trim());
      setInputText(''); // 清空输入框
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="输入消息..."
          placeholderTextColor={Colors.textSecondary}
          multiline
          maxLength={500}
          editable={!disabled}
          onSubmitEditing={handleSend}  // 回车发送
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || disabled) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || disabled}
        >
          <Text style={styles.sendButtonText}>发送</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.md,
    color: Colors.text,
    maxHeight: 100,
    marginRight: Spacing.sm,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: Colors.surface,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
});
```

**学习要点**：
- `KeyboardAvoidingView` 避免键盘遮挡
- `Platform.OS` 判断操作系统
- `multiline` 多行输入
- `onSubmitEditing` 回车事件

---

## 📱 第八步：创建聊天页面

**文件位置**：`src/screens/ChatScreen.tsx`

```typescript
/**
 * AI 聊天页面
 * 整合所有聊天功能
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChatBubble } from '../components/chat/ChatBubble';
import { ChatInput } from '../components/chat/ChatInput';
import { useWebSocket } from '../hooks/useWebSocket';
import { ConnectionStatus } from '../types/chat';
import { Colors, Spacing, FontSizes, FontWeights } from '../constants/theme';

// WebSocket 服务器地址（替换为你的实际地址）
const WS_URL = 'ws://localhost:8080'; // 开发环境
// const WS_URL = 'wss://your-server.com'; // 生产环境

export const ChatScreen: React.FC = () => {
  // 使用 WebSocket Hook
  const { messages, connectionStatus, isTyping, sendMessage } = useWebSocket(WS_URL);
  
  // 列表引用，用于自动滚动
  const flatListRef = useRef<FlatList>(null);

  // 当消息更新时，滚动到底部
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // 渲染连接状态
  const renderConnectionStatus = () => {
    if (connectionStatus === ConnectionStatus.CONNECTING) {
      return (
        <View style={styles.statusBar}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.statusText}>连接中...</Text>
        </View>
      );
    }
    if (connectionStatus === ConnectionStatus.ERROR || 
        connectionStatus === ConnectionStatus.DISCONNECTED) {
      return (
        <View style={[styles.statusBar, styles.statusBarError]}>
          <Text style={styles.statusTextError}>连接已断开</Text>
        </View>
      );
    }
    return null;
  };

  // 渲染空状态
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateEmoji}>🤖</Text>
      <Text style={styles.emptyStateTitle}>开始对话</Text>
      <Text style={styles.emptyStateText}>向 AI 助手发送消息吧！</Text>
    </View>
  );

  // 渲染 AI 正在输入
  const renderTypingIndicator = () => {
    if (!isTyping) return null;
    return (
      <View style={styles.typingContainer}>
        <View style={styles.typingBubble}>
          <Text style={styles.typingText}>AI 正在输入</Text>
          <View style={styles.typingDots}>
            <View style={styles.typingDot} />
            <View style={styles.typingDot} />
            <View style={styles.typingDot} />
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* 顶部标题栏 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>AI 助手</Text>
          <View style={[
            styles.statusDot,
            connectionStatus === ConnectionStatus.CONNECTED && styles.statusDotConnected
          ]} />
        </View>

        {/* 连接状态提示 */}
        {renderConnectionStatus()}

        {/* 消息列表 */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={({ item }) => <ChatBubble message={item} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderTypingIndicator}
        />

        {/* 输入框 */}
        <ChatInput
          onSend={sendMessage}
          disabled={connectionStatus !== ConnectionStatus.CONNECTED}
        />
      </View>
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
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.info,
  },
  statusBarError: {
    backgroundColor: Colors.error,
  },
  statusText: {
    fontSize: FontSizes.sm,
    color: Colors.surface,
    marginLeft: Spacing.xs,
  },
  statusTextError: {
    fontSize: FontSizes.sm,
    color: Colors.surface,
  },
  messageList: {
    paddingVertical: Spacing.md,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyStateEmoji: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  emptyStateTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  emptyStateText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  typingContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  typingBubble: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  typingText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginRight: Spacing.sm,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.textSecondary,
  },
});
```

---

## 🔧 第九步：导出组件

**文件位置**：`src/components/chat/index.ts`

```typescript
export { ChatBubble } from './ChatBubble';
export { ChatInput } from './ChatInput';
```

**文件位置**：`src/screens/index.ts`

```typescript
export { HomeScreen } from './HomeScreen';
export { DiscoverScreen } from './DiscoverScreen';
export { MessagesScreen } from './MessagesScreen';
export { ProfileScreen } from './ProfileScreen';
export { ChatScreen } from './ChatScreen';
```

---

## 🧪 第十步：测试 WebSocket

### 方式一：使用在线 WebSocket 测试服务器

```typescript
// 在 ChatScreen.tsx 中修改
const WS_URL = 'wss://echo.websocket.org/'; // 回显服务器
```

### 方式二：创建本地测试服务器（Node.js）

创建 `server.js`：

```javascript
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  console.log('客户端已连接');

  ws.on('message', (message) => {
    console.log('收到消息:', message);
    
    // 模拟 AI 思考
    setTimeout(() => {
      ws.send(JSON.stringify({
        type: 'message',
        content: \`你说: \${JSON.parse(message).content}\`,
        timestamp: new Date().toISOString(),
      }));
    }, 1000);
  });

  ws.on('close', () => {
    console.log('客户端已断开');
  });
});

console.log('WebSocket 服务器运行在 ws://localhost:8080');
```

运行服务器：
```bash
npm install ws
node server.js
```

---

## 📚 学习总结

### 核心概念

1. **WebSocket 生命周期**
   - `onopen` - 连接建立
   - `onmessage` - 接收消息
   - `onclose` - 连接关闭
   - `onerror` - 发生错误

2. **状态管理**
   - 消息列表状态
   - 连接状态
   - 输入框状态

3. **组件通信**
   - Props 传递数据
   - 回调函数处理事件
   - Context 共享状态（高级）

---

## 💪 练习任务

### 初级
1. ✅ 修改聊天气泡的颜色
2. ✅ 添加更多的消息状态图标
3. ✅ 自定义空状态的文案

### 中级
1. ✅ 添加消息重发功能
2. ✅ 实现消息复制功能
3. ✅ 添加滚动到顶部加载历史消息

### 高级
1. ✅ 支持发送图片
2. ✅ 实现消息本地持久化（AsyncStorage）
3. ✅ 添加 Markdown 渲染支持
4. ✅ 实现消息流式输出（逐字显示）

---

## 🎓 扩展学习

### 1. 消息持久化

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// 保存消息
const saveMessages = async (messages: Message[]) => {
  await AsyncStorage.setItem('chat_messages', JSON.stringify(messages));
};

// 加载消息
const loadMessages = async () => {
  const data = await AsyncStorage.getItem('chat_messages');
  return data ? JSON.parse(data) : [];
};
```

### 2. 流式输出

```typescript
// 逐字显示 AI 回复
const streamMessage = (content: string) => {
  let index = 0;
  const interval = setInterval(() => {
    if (index < content.length) {
      // 更新消息内容
      index++;
    } else {
      clearInterval(interval);
    }
  }, 50);
};
```

### 3. 消息分组（按日期）

```typescript
// 按日期分组消息
const groupMessagesByDate = (messages: Message[]) => {
  // 实现分组逻辑
};
```

---

## ❓ 常见问题

**Q: WebSocket 连接失败怎么办？**
A: 检查服务器地址、网络权限、防火墙设置

**Q: 如何处理消息顺序？**
A: 使用时间戳或消息 ID 排序

**Q: 消息太多会不会卡？**
A: 使用 FlatList 的虚拟化特性，只渲染可见项

**Q: 如何实现消息已读未读？**
A: 在 Message 类型中添加 `isRead` 字段

---

## 🎉 完成检查清单

- [ ] 创建了所有必要的文件
- [ ] 理解了 WebSocket 的工作原理
- [ ] 成功连接到 WebSocket 服务器
- [ ] 可以发送和接收消息
- [ ] UI 显示正常
- [ ] 理解了状态管理和 Hook 的使用

完成后，你就掌握了 React Native 中的实时通信功能！🚀
