# Agent Screen 自定义实现指南

## 📋 概述

本文档描述了从 GiftedChat 迁移到自定义 Agent Screen 的实现。新的实现完全控制 UI 和交互逻辑，为未来集成 LangChain.js 和复杂 AI Agent 功能预留了扩展接口。

## 🎯 设计目标

1. **完全控制** - 摆脱第三方库限制，完全控制 UI 和交互
2. **可扩展性** - 为 LangChain.js、工具调用、中间步骤等高级功能预留接口
3. **高性能** - 使用 FlatList 虚拟化滚动，优化大量消息场景
4. **代码复用** - 组件化设计，便于在其他场景复用

## 📁 文件结构

```
src/
├── types/
│   └── agent.ts                    # Agent 类型定义（可扩展）
├── hooks/
│   └── useAgentChat.ts             # Agent Chat Hook（状态管理）
├── components/
│   └── agent/
│       ├── MessageBubble.tsx       # 消息气泡组件
│       ├── MessageList.tsx         # 消息列表组件
│       ├── InputBar.tsx            # 输入栏组件
│       └── index.ts                # 统一导出
├── screens/
│   ├── AgentScreen.tsx             # 新的 Agent 页面 ✅
│   └── GiftedChatScreen.tsx        # 旧版本（已停用，保留参考）
└── navigation/
    └── BottomTabNavigator.tsx      # 导航配置（已更新）
```

## 🔧 核心组件

### 1. 类型定义 (`types/agent.ts`)

#### AgentMessage
```typescript
export interface AgentMessage {
  id: string;
  type: MessageType;              // 'text' | 'system' | 'action' | 'tool_call' | 'tool_result'
  sender: MessageSender;          // 'user' | 'assistant' | 'system'
  content: string;
  timestamp: Date;
  status?: MessageStatus;         // 'sending' | 'sent' | 'delivered' | 'error'
  
  // 扩展字段 - 为未来功能预留
  metadata?: {
    toolCalls?: ToolCall[];       // 工具调用信息（LangChain Agent）
    toolResults?: ToolResult[];   // 工具执行结果
    intermediateSteps?: IntermediateStep[];  // Agent 推理中间步骤
    attachments?: Attachment[];   // 附件
    [key: string]: any;           // 自定义扩展
  };
}
```

#### 扩展接口（预留给 LangChain）

- **ToolCall** - 工具调用信息
- **ToolResult** - 工具执行结果
- **IntermediateStep** - Agent 推理步骤
- **Attachment** - 附件支持

### 2. 状态管理 Hook (`hooks/useAgentChat.ts`)

#### 功能特性

✅ WebSocket 连接管理（基于 STOMP）
✅ 消息流式传输
✅ 自动重连
✅ 消息状态追踪
✅ 类型安全
🔜 工具调用支持（预留）
🔜 中间步骤展示（预留）

#### API

```typescript
const {
  messages,          // 消息列表
  sendMessage,       // 发送消息
  clearMessages,     // 清空聊天
  reconnect,         // 重新连接
  isConnected,       // 连接状态
  isTyping,          // AI 正在输入
} = useAgentChat({
  wsUrl: WS_URL,
  userId: user?._id,
  token,
  enableToolCalls: true,    // 启用工具调用
  enableStreaming: true,    // 启用流式传输
});
```

### 3. UI 组件

#### MessageBubble (`components/agent/MessageBubble.tsx`)

消息气泡组件，支持：
- ✅ 用户/助手/系统消息
- ✅ 时间戳
- ✅ 消息状态指示器
- 🔜 工具调用展示（扩展点）
- 🔜 附件展示（扩展点）

#### MessageList (`components/agent/MessageList.tsx`)

消息列表组件，特性：
- ✅ 使用 FlatList 虚拟化滚动（高性能）
- ✅ 自动滚动到底部
- ✅ "正在输入"指示器
- 🔜 加载历史消息（预留）
- ✅ 性能优化配置

#### InputBar (`components/agent/InputBar.tsx`)

输入栏组件，支持：
- ✅ 多行输入自动扩展
- ✅ 发送按钮状态管理
- ✅ 禁用状态
- 🔜 附件上传（预留）
- 🔜 语音输入（预留）

### 4. 主屏幕 (`screens/AgentScreen.tsx`)

完整的 Agent 聊天页面，包含：
- ✅ 头部（标题、连接状态、操作按钮）
- ✅ 快捷问题栏
- ✅ 消息列表
- ✅ 输入栏
- ✅ 加载状态
- ✅ 清空聊天确认

## 🔄 与后端集成

### WebSocket 消息格式

**发送（前端 -> 后端）**
```json
{
  "userId": "123",
  "message": "今天的支出是多少？",
  "messageId": "msg_1234567890_abc",
  "token": "jwt_token_here"
}
```

**接收（后端 -> 前端）**
```json
// 开始输入
{ "type": "START", "timestamp": 1234567890 }

// 消息块（流式传输）
{ "type": "CHUNK", "content": "今天的", "timestamp": 1234567890 }
{ "type": "CHUNK", "content": "支出是", "timestamp": 1234567890 }

// 结束
{ "type": "END", "timestamp": 1234567890 }

// 错误
{ "type": "ERROR", "error": "错误信息", "timestamp": 1234567890 }
```

### STOMP 路径

- **发送目的地**: `/app/chat/stream`
- **订阅队列**: `/queue/messages/{userId}`

## 🚀 未来扩展计划

### 第一阶段：基础功能 ✅ 
- [x] 自定义消息组件
- [x] WebSocket 集成
- [x] 流式传输
- [x] 快捷问题

### 第二阶段：LangChain.js 集成 🔜

1. **安装 LangChain.js**
   ```bash
   npm install langchain @langchain/core
   ```

2. **实现 Agent 执行器**
   - 工具定义和注册
   - Agent 推理链
   - 工具调用拦截

3. **UI 扩展**
   - 工具调用展示卡片
   - 推理步骤时间线
   - 结果可视化

### 第三阶段：高级功能 🔜
- [ ] 多模态输入（图片、语音）
- [ ] 消息编辑和重试
- [ ] 对话分支管理
- [ ] 持久化聊天历史
- [ ] 导出对话记录

## 📝 扩展示例

### 添加工具调用展示

在 `MessageBubble.tsx` 中：

```typescript
// 渲染工具调用
if (message.metadata?.toolCalls) {
  return (
    <View style={styles.toolCallContainer}>
      <Text style={styles.toolCallTitle}>
        🔧 调用工具: {message.metadata.toolCalls[0].name}
      </Text>
      <Text style={styles.toolCallArgs}>
        {JSON.stringify(message.metadata.toolCalls[0].arguments, null, 2)}
      </Text>
    </View>
  );
}
```

### 添加中间步骤展示

在 `MessageList.tsx` 中：

```typescript
// 渲染推理步骤
const renderIntermediateSteps = (steps: IntermediateStep[]) => {
  return steps.map((step, index) => (
    <View key={index} style={styles.stepContainer}>
      <Text style={styles.stepAction}>{step.action}</Text>
      <Text style={styles.stepObservation}>{step.observation}</Text>
    </View>
  ));
};
```

## 🎨 样式规范

遵循现有主题系统 (`constants/theme.ts`)：

- **主色调**: `Colors.primary` (#6366F1)
- **成功色**: `Colors.success` (#10B981)
- **错误色**: `Colors.error` (#F43F5E)
- **间距**: `Spacing.xs/sm/md/lg/xl`
- **字体**: `FontSizes.xs/sm/md/lg/xl`
- **圆角**: `BorderRadius.sm/md/lg/round`

## 🔍 性能优化

### FlatList 优化配置
```typescript
<FlatList
  removeClippedSubviews={true}    // 移除屏幕外视图
  maxToRenderPerBatch={10}        // 每批渲染数量
  updateCellsBatchingPeriod={50}  // 批处理周期
  windowSize={10}                 // 渲染窗口大小
/>
```

### 消息组件优化
- 使用 `React.memo` 避免不必要的重渲染
- 消息 ID 作为稳定的 key
- 避免在 render 中创建新对象

## 🧪 测试建议

### 单元测试
- `useAgentChat` Hook 状态管理
- 消息格式转换逻辑
- WebSocket 连接处理

### 集成测试
- 完整消息流（发送 -> 接收 -> 展示）
- 重连机制
- 错误处理

### E2E 测试
- 用户发送消息
- 查看快捷问题
- 清空聊天记录

## 📚 相关文档

- [GiftedChat 教程](./GIFTED_CHAT_TUTORIAL.md) - 旧版实现参考
- [STOMP 集成](./STOMP_ISSUE_SOLUTION.md) - WebSocket 配置
- [设计规范](./guidelines.md) - 代码规范

## 🤝 迁移注意事项

### GiftedChatScreen.tsx
- ✅ 已从导航中移除
- ✅ 文件保留作为参考
- ⚠️ 不要删除，可能需要参考其功能实现

### useGiftedChat Hook
- ✅ 保留文件
- ✅ 核心逻辑已迁移到 `useAgentChat`
- ℹ️ 可以借鉴消息处理逻辑

## 🎓 学习要点

1. **组件化设计** - 每个组件职责单一，易于维护和扩展
2. **类型安全** - 完整的 TypeScript 类型定义
3. **扩展预留** - metadata 字段预留了丰富的扩展可能
4. **性能优先** - 使用虚拟化滚动处理大量消息
5. **用户体验** - 流式传输、自动滚动、状态反馈

## 📞 支持

如有问题或建议，请：
1. 查看现有代码注释
2. 参考相关文档
3. 创建 Issue 或 PR

---

**版本**: 1.0.0  
**创建日期**: 2025-11-24  
**最后更新**: 2025-11-24
