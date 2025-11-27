# Agent 上下文注入优化

## 概述

本优化采用 LangChain 标准做法，通过 **动态 System Prompt** 将业务上下文直接注入给 AI，让其在对话开始时就能感知所有必要信息，无需通过工具调用获取。

## 架构设计

### 方案对比

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| **System Prompt 注入** ⭐ | AI 立即可用，减少延迟和成本 | 上下文可能过期 | 首选方案 |
| 工具调用获取 | 数据实时最新 | 增加延迟和成本 | Fallback |
| RunnablePassthrough | 每次调用注入最新上下文 | 实现复杂 | 高级场景 |

### 选择方案：动态 System Prompt + 工具 Fallback

1. **主要方式**：通过 `AgentRuntimeContext` 将上下文嵌入 System Prompt
2. **Fallback**：保留 `contextTools` 作为刷新机制，当上下文过期时可用

## 实现细节

### 1. 定义运行时上下文接口

```typescript
// src/agent/agent.ts
export interface AgentRuntimeContext {
  user: {
    id: string | number;
    username: string;
    nickname?: string;
  } | null;
  currentLedger: {
    id: number;
    name: string;
    description?: string;
  } | null;
  defaultLedgerId: number | null;
  allLedgers: Array<{ id: number; name: string }>;
  categories: Array<{
    id: number;
    name: string;
    type: 'INCOME' | 'EXPENSE';
    icon?: string;
  }>;
  paymentMethods: Array<{
    id: number;
    name: string;
    icon?: string;
    isDefault: boolean;
  }>;
  currentDateTime: string;
}
```

### 2. 动态构建 System Prompt

```typescript
// src/agent/agent.ts
function buildSystemPrompt(context?: AgentRuntimeContext): string {
  const basePrompt = `帮助用户记账、查账、分析财务。...`;
  
  if (!context) return basePrompt;
  
  // 构建上下文信息块
  const contextBlocks: string[] = [];
  
  // 当前时间
  contextBlocks.push(`## 当前时间\n${context.currentDateTime}`);
  
  // 用户信息
  if (context.user) {
    contextBlocks.push(`## 当前用户\n- ID: ${context.user.id}\n...`);
  }
  
  // 当前账本、分类、支付方式等...
  
  return `${basePrompt}\n\n---\n# 当前上下文信息\n${contextBlocks.join('\n\n')}`;
}
```

### 3. Agent 创建时注入上下文

```typescript
// src/agent/agent.ts
export const createAgent = (apiKey: string, runtimeContext?: AgentRuntimeContext) => {
  const systemPrompt = buildSystemPrompt(runtimeContext);
  // ...
};
```

### 4. Hook 中管理上下文

```typescript
// src/hooks/useAgentChat.ts
export const useAgentChat = (config: AgentChatConfig & { 
  conversationId?: string;
  runtimeContext?: AgentRuntimeContext;  // 新增
}) => {
  // 当上下文变化时重新创建 Agent
  useEffect(() => {
    agentRef.current = createAgent(API_KEY, runtimeContext);
  }, [runtimeContext]);
};
```

### 5. Screen 层准备上下文

```typescript
// src/screens/AgentScreen.tsx
const runtimeContext = useMemo(() => ({
  user: { id: user._id, username: user.username },
  currentLedger: { id: currentLedger.id, name: currentLedger.name },
  categories: categories.map(c => ({ id: c.id, name: c.name, type: c.type })),
  paymentMethods: paymentMethods.map(p => ({ id: p.id, name: p.name, isDefault: p.isDefault })),
  currentDateTime: new Date().toLocaleString('zh-CN'),
}), [user, currentLedger, categories, paymentMethods]);

// 传给 useAgentChat
useAgentChat({ runtimeContext });
```

## 生成的 System Prompt 示例

```
帮助用户记账、查账、分析财务。

## 核心规则
- 直接使用下方提供的上下文信息（用户、账本、分类、支付方式）
- 只有当上下文信息不完整或需要刷新时，才调用 get_xxx 工具查询
- ...

---
# 当前上下文信息
以下是当前用户的业务数据，可直接使用，无需调用工具获取：

## 当前时间
2024年1月15日 星期一 14:30

## 当前用户
- ID: 123
- 用户名: zhangsan
- 昵称: 张三

## 当前账本
- ID: 1
- 名称: 我的账本 (默认)

## 当前账本的分类
### 支出分类
  - 餐饮 (ID: 1, 图标: 🍔)
  - 交通 (ID: 2, 图标: 🚗)
  - 购物 (ID: 3, 图标: 🛒)
### 收入分类
  - 工资 (ID: 10, 图标: 💰)
  - 奖金 (ID: 11, 图标: 🎁)

## 支付方式
默认支付方式: 微信支付 (ID: 1)
  - 微信支付 (ID: 1, 默认)
  - 支付宝 (ID: 2)
  - 现金 (ID: 3)
```

## 优势

1. **减少工具调用**：AI 可直接使用账本 ID、分类 ID 等，无需先查询
2. **降低延迟**：省去 2-3 次工具调用的往返时间
3. **节省成本**：减少 API 调用次数
4. **更智能**：AI 能根据分类列表智能匹配，如用户说"午饭"能自动选择"餐饮"分类

## 注意事项

1. **上下文大小**：避免注入过多数据，控制 System Prompt 长度
2. **上下文过期**：长对话中上下文可能过期，保留工具作为刷新机制
3. **敏感信息**：不要在 Prompt 中包含敏感数据（如 token）

## 相关文件

- `src/agent/agent.ts` - Agent 核心，包含 `buildSystemPrompt` 和 `createAgent`
- `src/hooks/useAgentChat.ts` - 聊天 Hook，管理上下文注入
- `src/screens/AgentScreen.tsx` - 准备运行时上下文
- `src/types/agent.ts` - 类型定义
- `src/agent/tools/contextTools.ts` - 工具 Fallback（保留）
