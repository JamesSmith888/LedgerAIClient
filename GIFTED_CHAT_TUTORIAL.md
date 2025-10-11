# React Native Gifted Chat 实战教程 💬

## 📚 关于 Gifted Chat

`react-native-gifted-chat` 是 React Native 生态中最流行的聊天 UI 库。

**官方仓库**：https://github.com/FaridSafi/react-native-gifted-chat

**特性**：
- ✅ 完整的聊天 UI（气泡、输入框、头像等）
- ✅ 支持多种消息类型（文本、图片、视频、位置等）
- ✅ 打字指示器
- ✅ 自动滚动
- ✅ 加载更多消息
- ✅ 完全可定制
- ✅ TypeScript 支持

---

## 🛠️ 第一步：安装依赖

```bash
# 安装核心库
npm install react-native-gifted-chat

# 安装必要的依赖
npm install react-native-safe-area-context
npm install @react-native-community/datetimepicker  # 可选：日期选择器
```

### iOS 额外步骤

```bash
cd ios
pod install
cd ..
```

---

## 📁 第二步：项目结构

```
src/
├── screens/
│   └── GiftedChatScreen.tsx    # 使用 Gifted Chat 的聊天页面
├── services/
│   └── websocket.ts            # WebSocket 服务（复用之前的）
├── hooks/
│   └── useGiftedChat.ts        # Gifted Chat Hook
└── types/
    └── chat.ts                 # 类型定义
```

---

## 📝 第三步：更新类型定义

**文件位置**：`src/types/chat.ts`

```typescript
/**
 * Gifted Chat 类型定义
 */

import { IMessage } from 'react-native-gifted-chat';

// Gifted Chat 使用的消息格式
export interface ChatMessage extends IMessage {
  // IMessage 已包含以下字段：
  // _id: string | number;
  // text: string;
  // createdAt: Date | number;
  // user: User;
  
  // 可以添加自定义字段
  status?: 'sending' | 'sent' | 'error';
}

// 用户信息
export interface ChatUser {
  _id: string | number;
  name?: string;
  avatar?: string;
}

// WebSocket 消息格式（与后端约定）
export interface WSMessage {
  type: 'message' | 'typing' | 'error';
  content: string;
  timestamp?: string;
  sender?: 'user' | 'ai';
}
```

---

## 🪝 第四步：创建 Gifted Chat Hook

**文件位置**：`src/hooks/useGiftedChat.ts`

```typescript
/**
 * Gifted Chat WebSocket Hook
 * 封装 Gifted Chat 与 WebSocket 的集成逻辑
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { IMessage } from 'react-native-gifted-chat';
import { WebSocketService } from '../services/websocket';
import { ChatMessage, WSMessage } from '../types/chat';

// 当前用户信息
const CURRENT_USER = {
  _id: 1,
  name: '我',
  avatar: 'https://placehold.co/100x100/png?text=User',
};

// AI 用户信息
const AI_USER = {
  _id: 2,
  name: 'AI 助手',
  avatar: 'https://placehold.co/100x100/0ea5e9/white/png?text=AI',
};

export const useGiftedChat = (wsUrl: string) => {
  // 消息列表（Gifted Chat 要求从新到旧排序）
  const [messages, setMessages] = useState<IMessage[]>([]);
  
  // 连接状态
  const [isConnected, setIsConnected] = useState(false);
  
  // AI 是否正在输入
  const [isTyping, setIsTyping] = useState(false);

  // WebSocket 服务引用
  const wsService = useRef<WebSocketService | null>(null);

  /**
   * 初始化 WebSocket
   */
  useEffect(() => {
    wsService.current = new WebSocketService(wsUrl);

    // 监听消息
    wsService.current.onMessage((wsMessage: WSMessage) => {
      if (wsMessage.type === 'message') {
        // 收到 AI 回复
        const newMessage: IMessage = {
          _id: Math.random().toString(36).substring(7),
          text: wsMessage.content,
          createdAt: new Date(),
          user: AI_USER,
        };
        
        // Gifted Chat 使用 prepend 添加新消息
        setMessages((previousMessages) =>
          [newMessage, ...previousMessages]
        );
        setIsTyping(false);
      } else if (wsMessage.type === 'typing') {
        setIsTyping(true);
      }
    });

    // 监听连接状态
    wsService.current.onConnectionChange((status) => {
      setIsConnected(status === 'connected');
    });

    // 连接
    wsService.current.connect();

    // 添加欢迎消息
    const welcomeMessage: IMessage = {
      _id: 'welcome',
      text: '你好！我是 AI 助手，有什么可以帮你的吗？',
      createdAt: new Date(),
      user: AI_USER,
    };
    setMessages([welcomeMessage]);

    // 清理
    return () => {
      wsService.current?.disconnect();
    };
  }, [wsUrl]);

  /**
   * 发送消息
   * Gifted Chat 的 onSend 回调会传入消息数组
   */
  const onSend = useCallback((newMessages: IMessage[] = []) => {
    // 添加到消息列表
    setMessages((previousMessages) =>
      [...newMessages, ...previousMessages]
    );

    // 发送到服务器（只发送第一条消息）
    if (newMessages.length > 0 && wsService.current) {
      wsService.current.sendMessage(newMessages[0].text);
      // 显示 AI 正在输入
      setIsTyping(true);
    }
  }, []);

  return {
    messages,
    onSend,
    isConnected,
    isTyping,
    currentUser: CURRENT_USER,
  };
};
```

**学习要点**：
- Gifted Chat 消息从新到旧排序（最新消息在前）
- `onSend` 接收消息数组
- 使用 `prepend` 模式添加新消息

---

## 📱 第五步：创建聊天页面

**文件位置**：`src/screens/GiftedChatScreen.tsx`

```typescript
/**
 * Gifted Chat 聊天页面
 * 使用成熟的 UI 库快速实现聊天功能
 */

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GiftedChat, Bubble, InputToolbar, Send } from 'react-native-gifted-chat';
import { useGiftedChat } from '../hooks/useGiftedChat';
import { Colors, Spacing, FontSizes, FontWeights } from '../constants/theme';

// WebSocket 服务器地址
const WS_URL = 'ws://localhost:8080';
// const WS_URL = 'wss://echo.websocket.org/'; // 测试服务器

export const GiftedChatScreen: React.FC = () => {
  const { messages, onSend, isConnected, isTyping, currentUser } = useGiftedChat(WS_URL);

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
  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>AI 助手</Text>
      <View style={[
        styles.statusDot,
        isConnected && styles.statusDotConnected
      ]} />
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {renderHeader()}
        
        <GiftedChat
          messages={messages}
          onSend={onSend}
          user={currentUser}
          
          // UI 配置
          placeholder="输入消息..."
          alwaysShowSend
          showUserAvatar
          showAvatarForEveryMessage
          
          // 状态
          isTyping={isTyping}
          
          // 自定义渲染
          renderBubble={renderBubble}
          renderInputToolbar={renderInputToolbar}
          renderSend={renderSend}
          
          // 时间格式
          locale="zh-CN"
          timeFormat="HH:mm"
          dateFormat="YYYY年MM月DD日"
          
          // 样式
          messagesContainerStyle={styles.messagesContainer}
          
          // 文本配置
          textInputProps={{
            maxLength: 500,
            returnKeyType: 'send',
            blurOnSubmit: false,
          }}
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
```

---

## 🎨 第六步：高级定制

### 1. 添加系统消息

```typescript
const systemMessage: IMessage = {
  _id: Math.random(),
  text: '欢迎来到聊天室',
  createdAt: new Date(),
  system: true,  // 系统消息标记
};
```

### 2. 添加图片消息

```typescript
const imageMessage: IMessage = {
  _id: Math.random(),
  text: '',
  createdAt: new Date(),
  user: currentUser,
  image: 'https://example.com/image.jpg',  // 图片 URL
};
```

### 3. 添加快捷回复

```typescript
import { GiftedChat, QuickReplies } from 'react-native-gifted-chat';

// 在消息中添加
const messageWithQuickReplies: IMessage = {
  _id: Math.random(),
  text: '请选择一个选项：',
  createdAt: new Date(),
  user: AI_USER,
  quickReplies: {
    type: 'radio', // 或 'checkbox'
    values: [
      { title: '选项 1', value: 'option1' },
      { title: '选项 2', value: 'option2' },
      { title: '选项 3', value: 'option3' },
    ],
  },
};

// 处理快捷回复
const onQuickReply = (replies: any[]) => {
  console.log('选择了:', replies[0].value);
};

// 在 GiftedChat 中使用
<GiftedChat
  onQuickReply={onQuickReply}
  // ...其他属性
/>
```

### 4. 自定义消息渲染

```typescript
import { Message } from 'react-native-gifted-chat';

const renderMessage = (props: any) => {
  return (
    <Message
      {...props}
      containerStyle={{
        left: { backgroundColor: 'lightgray' },
        right: { backgroundColor: 'lightblue' },
      }}
    />
  );
};

<GiftedChat renderMessage={renderMessage} />
```

### 5. 添加加载更多功能

```typescript
const [isLoadingEarlier, setIsLoadingEarlier] = useState(false);

const onLoadEarlier = async () => {
  setIsLoadingEarlier(true);
  
  // 模拟加载历史消息
  setTimeout(() => {
    const olderMessages = [
      // ... 更早的消息
    ];
    setMessages((prev) => [...prev, ...olderMessages]);
    setIsLoadingEarlier(false);
  }, 1000);
};

<GiftedChat
  loadEarlier={true}
  isLoadingEarlier={isLoadingEarlier}
  onLoadEarlier={onLoadEarlier}
  // ...
/>
```

---

## 🔧 第七步：集成到导航

**更新**：`src/screens/index.ts`

```typescript
export { HomeScreen } from './HomeScreen';
export { DiscoverScreen } from './DiscoverScreen';
export { MessagesScreen } from './MessagesScreen';
export { ProfileScreen } from './ProfileScreen';
export { ChatScreen } from './ChatScreen';              // 自己实现的版本
export { GiftedChatScreen } from './GiftedChatScreen';  // Gifted Chat 版本
```

**在导航中使用**：

```typescript
// src/navigation/BottomTabNavigator.tsx
import { GiftedChatScreen } from '../screens';

<Tab.Screen 
  name="Chat" 
  component={GiftedChatScreen}
  options={{
    tabBarLabel: '聊天',
    tabBarIcon: ({ color, size }) => (
      <Text style={{ fontSize: size, color }}>💬</Text>
    ),
  }}
/>
```

---

## 📚 完整功能清单

### Gifted Chat 内置功能

✅ **基础功能**
- 消息发送和接收
- 自动滚动到最新消息
- 时间戳显示
- 用户头像

✅ **高级功能**
- 打字指示器
- 加载更多（历史消息）
- 快捷回复
- 系统消息
- 图片消息
- 位置消息
- 自定义消息类型

✅ **UI 定制**
- 自定义气泡样式
- 自定义输入框
- 自定义发送按钮
- 自定义头像
- 自定义时间格式

---

## 💡 最佳实践

### 1. 消息 ID 生成

```typescript
// 使用时间戳 + 随机数
const generateMessageId = () => {
  return `${Date.now()}_${Math.random().toString(36).substring(7)}`;
};
```

### 2. 消息状态管理

```typescript
// 发送消息时标记为 pending
const pendingMessage = {
  _id: messageId,
  text: 'Hello',
  pending: true,  // 标记为待发送
  user: currentUser,
  createdAt: new Date(),
};

// 收到服务器确认后更新状态
setMessages((prev) =>
  prev.map((msg) =>
    msg._id === messageId ? { ...msg, pending: false, sent: true } : msg
  )
);
```

### 3. 错误处理

```typescript
const onSend = useCallback((newMessages: IMessage[] = []) => {
  try {
    setMessages((prev) => [...newMessages, ...prev]);
    wsService.current?.sendMessage(newMessages[0].text);
  } catch (error) {
    console.error('发送失败:', error);
    // 显示错误提示
    Alert.alert('错误', '消息发送失败，请重试');
  }
}, []);
```

---

## 🎓 学习对比

### 自己实现 vs Gifted Chat

| 特性 | 自己实现 | Gifted Chat |
|------|---------|-------------|
| 学习价值 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| 开发速度 | 慢 | 快 |
| 功能完整性 | 基础 | 丰富 |
| 定制灵活性 | 完全自由 | 受限但足够 |
| 适用场景 | 学习、简单需求 | 生产环境 |

---

## 💪 练习任务

### 基础练习
1. ✅ 修改聊天气泡的颜色和圆角
2. ✅ 自定义发送按钮的文字
3. ✅ 添加欢迎消息

### 进阶练习
1. ✅ 实现消息复制功能
2. ✅ 添加快捷回复
3. ✅ 实现图片消息发送

### 高级练习
1. ✅ 集成消息本地存储
2. ✅ 实现消息搜索功能
3. ✅ 添加表情包支持

---

## 📖 官方文档和资源

- **GitHub**: https://github.com/FaridSafi/react-native-gifted-chat
- **示例**: https://gifted.chat/
- **API 文档**: 查看 TypeScript 类型定义

---

## 🎉 总结

**建议学习路径**：

1. **第一阶段**：跟着我的自定义教程学习（理解原理）
2. **第二阶段**：使用 Gifted Chat 快速开发（实践应用）
3. **第三阶段**：对比两种实现方式（深入理解）

这样你既能掌握底层原理，又能高效开发实际项目！🚀
