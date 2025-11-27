# Agent Components

自定义 AI Agent 聊天组件库

## 组件列表

### MessageBubble
消息气泡组件，展示单条消息

**特性:**
- 支持用户/助手/系统消息
- 时间戳显示
- 消息状态指示
- 可扩展样式

**使用:**
```tsx
<MessageBubble 
  message={message} 
  showTimestamp={true} 
/>
```

### MessageList
消息列表组件，使用 FlatList 实现高性能渲染

**特性:**
- 虚拟化滚动
- 自动滚动到底部
- "正在输入"指示器
- 支持加载更多（预留）

**使用:**
```tsx
<MessageList 
  messages={messages}
  isTyping={isTyping}
  onLoadMore={() => {}}
/>
```

### InputBar
消息输入栏组件

**特性:**
- 多行输入自动扩展
- 发送按钮状态管理
- 附件按钮（预留）
- 键盘避让

**使用:**
```tsx
<InputBar 
  onSend={(text) => console.log(text)}
  disabled={!isConnected}
  placeholder="输入消息..."
/>
```

## 扩展性

所有组件都设计为可扩展的，通过 `metadata` 字段支持：
- 工具调用展示
- 中间步骤显示
- 附件支持
- 自定义渲染

## 性能

- 使用 FlatList 虚拟化滚动
- React.memo 优化重渲染
- 稳定的 key 值
- 批量更新配置

## 主题

遵循 `constants/theme.ts` 中的设计规范
