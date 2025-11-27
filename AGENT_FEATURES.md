# Agent Screen 产品级功能说明

## 🎯 概述

Agent Screen 现已升级为产品级的 AI 助手界面，参考 GitHub Copilot、Cursor 等成熟产品的交互设计，提供完整的对话管理和智能交互功能。

## ✨ 核心功能

### 1. 沉浸式体验 🎨

**底部导航栏自动隐藏**
- 进入 Agent 页面时自动隐藏底部导航栏
- 提供全屏聊天体验
- 退出页面时自动恢复导航栏

**实现方式**:
```typescript
// BottomTabNavigator.tsx
<Tab.Screen
  name="Agent"
  options={{
    tabBarStyle: { display: 'none' }, // 隐藏导航栏
  }}
  listeners={({ navigation }) => ({
    blur: () => {
      // 离开时恢复
      navigation.setOptions({ tabBarStyle: {...} });
    },
  })}
/>
```

### 2. 对话历史管理 📚

#### 功能清单
- ✅ **新建对话** - 创建新的对话会话
- ✅ **切换对话** - 在多个对话之间切换
- ✅ **重命名对话** - 自定义对话标题
- ✅ **删除对话** - 移除不需要的对话
- ✅ **对话预览** - 显示最后一条消息
- ✅ **消息计数** - 显示对话中的消息数量

#### 交互设计
```
┌─────────────────────────────────┐
│  ☰  当前对话  ⚡ 🔄 ⋮           │ ← 点击☰打开对话列表
├─────────────────────────────────┤
│                                 │
│  对话历史              +  ✕    │ ← 新建/关闭
│  ─────────────────────────────  │
│  📋 当前对话                    │ ← 激活状态
│     5条消息 • 2024-11-24        │
│                                 │
│  💬 新对话 1           ✏️ 🗑️   │ ← 重命名/删除
│     0条消息 • 2024-11-23        │
│                                 │
└─────────────────────────────────┘
```

### 3. 智能建议系统 💡

#### 上下文感知推荐
根据对话历史动态调整建议问题：

**初始状态**（无历史消息）
- 💰 今天的支出是多少？
- 📊 这个月的收支情况
- 📈 帮我分析消费趋势
- 💡 推荐省钱建议

**Follow-up 建议**（基于上下文）
```typescript
// 示例：用户问了"支出"相关问题后
if (lastUserMessage?.content.includes('支出')) {
  return [
    { text: '那收入情况呢？', icon: '💵' },
    // ... 其他相关建议
  ];
}
```

#### 动态显示逻辑
- 空对话时：显示欢迎建议
- 3条消息内：显示智能推荐
- 超过3条消息：自动隐藏（减少干扰）
- 可手动开关（⚡ 按钮）

### 4. 消息操作菜单 📋

#### 长按消息触发
- ✅ **复制** - 复制消息到剪贴板
- ✅ **重试** - 重新发送消息（用户消息）
- ✅ **引用** - 引用消息进行回复（预留）
- ✅ **删除** - 删除单条消息

#### 交互流程
```
用户长按消息
    ↓
弹出操作菜单（Modal）
    ↓
┌─────────────────┐
│ 📋 复制         │
│ 🔄 重试         │ ← 仅用户消息
│ 💬 引用         │
│ ────────────    │
│ 🗑️ 删除         │ ← 红色警告
└─────────────────┘
```

### 5. 实时状态展示 🔄

#### 连接状态
- 🟢 **在线** - WebSocket 已连接
- 🔴 **离线** - 连接断开
- 🔄 **重连按钮** - 离线时显示

#### 输入状态
- ⌨️ **正在输入...** - AI 正在生成回复
- 动画效果的三点提示

```
AI Agent          🟢 在线 • 正在输入...
```

### 6. 空状态引导 🎯

**首次进入体验**
```
        🤖
   AI Agent 助手
 
 我可以帮你管理账本、
 分析消费、提供建议

  ──────────────────
  
  💡 试试这些问题
  
  [💰 今天的支出是多少？]
  [📊 这个月的收支情况]
```

### 7. 优化的快捷操作 ⚡

#### 水平滚动设计
- 使用 `ScrollView horizontal`
- 更多建议选项
- 流畅滑动体验

#### 视觉优化
- 边框装饰（`borderWidth: 1`）
- Emoji 图标增强识别
- 清晰的文字层次

## 🏗️ 技术架构

### 状态管理

```typescript
// 对话管理
const [conversations, setConversations] = useState<Conversation[]>([]);
const [currentConversationId, setCurrentConversationId] = useState('current');

// UI 状态
const [showQuickActions, setShowQuickActions] = useState(true);
const [showConversations, setShowConversations] = useState(false);
const [showMessageActions, setShowMessageActions] = useState(false);

// 智能建议
const smartSuggestions = useMemo(() => {
  // 基于消息历史动态生成
}, [messages]);
```

### 组件复用

**Modal 组件**
- 对话历史抽屉
- 消息操作菜单
- 统一的遮罩层设计

**TouchableOpacity**
- 所有可点击区域
- 反馈清晰
- 无障碍支持

### 性能优化

```typescript
// 使用 useCallback 避免重渲染
const handleSend = useCallback((text: string) => {
  sendMessage(text);
}, [sendMessage]);

// 使用 useMemo 缓存计算结果
const smartSuggestions = useMemo(() => {
  // 复杂计算逻辑
}, [messages]);
```

## 🎨 设计规范

### 颜色系统
- **主色**: `Colors.primary` (#6366F1) - 强调、激活
- **成功**: `Colors.success` (#10B981) - 在线状态
- **警告**: `Colors.warning` (#F59E0B) - 重连按钮
- **错误**: `Colors.error` (#F43F5E) - 删除操作

### 间距规范
- **xs**: 4px - 微小间距
- **sm**: 8px - 小间距
- **md**: 16px - 标准间距
- **lg**: 24px - 大间距
- **xl**: 32px - 超大间距

### 圆角规范
- **lg**: 12px - 卡片、按钮
- **xl**: 16px - 抽屉
- **round**: 999px - 圆形按钮

## 📱 用户场景

### 场景1：首次使用
1. 用户点击底部 "Agent" 标签
2. 导航栏自动隐藏，进入全屏模式
3. 显示空状态引导和智能建议
4. 用户点击建议问题，开始对话

### 场景2：多对话管理
1. 用户点击左上角 ☰ 按钮
2. 抽屉滑出显示对话历史
3. 点击 + 创建新对话
4. 在不同对话间切换

### 场景3：消息操作
1. 用户长按某条消息
2. 弹出操作菜单
3. 选择"复制"将内容复制到剪贴板
4. 或选择"重试"重新发送

### 场景4：离线重连
1. 网络断开，状态变为 🔴 离线
2. 右上角出现重连按钮（橙色）
3. 用户点击重连
4. 连接成功，恢复 🟢 在线状态

## 🔄 未来扩展

### 已预留接口

#### 1. 对话持久化
```typescript
interface Conversation {
  id: string;
  title: string;
  messages?: AgentMessage[]; // 预留消息存储
  // ... 可添加更多字段
}
```

#### 2. 搜索功能
- 搜索历史对话
- 搜索消息内容
- 过滤特定类型

#### 3. 消息引用
```typescript
interface AgentMessage {
  metadata?: {
    quotedMessage?: string; // 引用的消息ID
    // ...
  };
}
```

#### 4. 多模态支持
- 图片上传
- 语音输入
- 文件附件

#### 5. 高级分析
- 对话统计
- 使用频率
- 最常问问题

## 📊 对比参考产品

### GitHub Copilot Chat
✅ 对话历史管理
✅ 上下文感知建议
✅ 消息操作菜单
⭐ 代码块渲染（不适用）

### Cursor AI
✅ 沉浸式全屏体验
✅ 智能问题推荐
✅ 实时输入状态
⭐ 文件引用（未来扩展）

### ChatGPT
✅ 新建/切换对话
✅ 重命名对话
✅ 消息复制/重试
⭐ 分享对话（未来扩展）

## 🚀 使用建议

### 最佳实践

1. **首次使用引导**
   - 空状态提示清晰明确
   - 智能建议帮助快速上手

2. **对话管理**
   - 定期整理对话历史
   - 使用描述性标题命名

3. **消息操作**
   - 长按触发菜单（符合移动端习惯）
   - 危险操作二次确认

4. **性能考虑**
   - 建议单个对话不超过100条消息
   - 超过后创建新对话

### 开发扩展

1. **添加新的智能建议**
```typescript
const smartSuggestions = useMemo(() => {
  // 添加你的逻辑
  if (/* 某个条件 */) {
    return [
      { id: 'new-1', text: '新建议', icon: '🎯' },
      ...baseQuestions
    ];
  }
}, [messages]);
```

2. **自定义消息操作**
```typescript
const handleMessageAction = (action: MessageAction) => {
  switch (action) {
    case 'custom_action':
      // 你的自定义逻辑
      break;
  }
};
```

## 📝 更新日志

### v2.0.0 (2024-11-24)
- ✅ 实现底部导航栏自动隐藏
- ✅ 添加完整的对话历史管理
- ✅ 实现智能建议系统
- ✅ 添加消息长按操作菜单
- ✅ 优化空状态引导
- ✅ 改进实时状态展示
- ✅ 性能优化（useCallback、useMemo）

### v1.0.0 (2024-11-24)
- ✅ 基础聊天功能
- ✅ WebSocket 连接
- ✅ 流式消息传输

---

**维护者**: Development Team  
**最后更新**: 2024-11-24  
**文档版本**: 2.0.0
