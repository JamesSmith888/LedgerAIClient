# Agent 工具调用优化 - ReAct 模式实现

## 概述
本次优化实现了基于 ReAct (Reasoning + Acting) 模式的 AI Agent 系统,让 AI 能够主动获取所需的上下文数据和后端信息,而不是向用户索要。

## 核心改进

### 1. 上下文工具系统 (`contextTools.ts`)
创建了一套让 AI 主动获取前端运行时数据的工具:

#### 可用工具:
- **`get_user_info`**: 获取当前登录用户信息
- **`get_current_ledger`**: 获取用户当前选中的账本
- **`get_all_ledgers`**: 获取用户的所有账本列表
- **`get_full_context`**: 一次性获取所有上下文信息

#### 工作原理:
```typescript
// AgentScreen 在初始化时注入上下文
updateAgentContext({
  user: { id, username, email },
  currentLedger: { id, name, description },
  defaultLedgerId,
  allLedgers: [...],
  token,
});

// AI 可以随时调用工具获取
const ledgerInfo = await getCurrentLedgerTool.func({});
// 返回: { id: 1, name: "我的账本", isDefault: true }
```

### 2. API 查询工具 (`apiTools.ts`)
让 AI 能从后端接口获取必要的数据:

#### 可用工具:
- **`get_categories`**: 获取指定账本的所有分类
- **`get_ledger_detail`**: 获取账本详细信息
- **`search_category`**: 根据分类名称搜索分类

#### 使用场景:
当用户说"创建一笔餐饮支出100元"时:
1. AI 调用 `get_current_ledger` 获取账本ID
2. AI 调用 `search_category` 搜索"餐饮"分类
3. AI 调用 `create_transaction` 创建交易

### 3. 优化的交易工具 (`transactionTools.ts`)

#### 智能参数处理:
**之前**: 所有参数都是必填,需要用户提供
```typescript
create_transaction({
  name: "午餐",
  amount: 50,
  type: "EXPENSE",
  ledgerId: 1,        // ❌ 需要用户提供
  categoryId: 5,      // ❌ 需要用户提供
})
```

**现在**: 智能自动填充
```typescript
create_transaction({
  name: "午餐",
  amount: 50,
  type: "EXPENSE",
  // ledgerId 自动从当前账本获取
  categoryName: "餐饮", // 可以用名称代替ID,AI会自动查询
})
```

#### 自动获取逻辑:
```typescript
// 1. 自动获取 ledgerId
if (!ledgerId) {
  const ledgerInfo = await getCurrentLedgerTool.func({});
  ledgerId = JSON.parse(ledgerInfo).id;
}

// 2. 自动查询分类ID
if (!categoryId && categoryName) {
  const categories = await fetch(`/api/categories/ledger/${ledgerId}`);
  const matched = categories.filter(c => c.name.includes(categoryName));
  categoryId = matched[0]?.id;
}
```

### 4. 增强的日志系统

#### Agent 执行日志:
```
🤖 [Agent] Initializing with 10 tools
📋 [Agent] Available tools: get_user_info, get_current_ledger, ...
🚀 [Agent] Starting agent loop with 1 initial messages
🔄 [Agent] Iteration 1/10
💭 [Agent] Calling LLM...
🔧 [Agent] Found 2 tool call(s):
  1. get_current_ledger {}
  2. create_transaction { name: "午餐", amount: 50, ... }
```

#### 工具执行日志:
```
🔍 [getCurrentLedgerTool] Called
🔧 [createTransactionTool] Called with: { name: "午餐", amount: 50, ... }
📍 [createTransactionTool] ledgerId not provided, fetching from current ledger
✅ [createTransactionTool] Using current ledger ID: 1
📍 [createTransactionTool] Searching category by name: 餐饮
✅ [createTransactionTool] Found category: 餐饮 (ID: 5)
📤 [createTransactionTool] Sending request: { ... }
📥 [createTransactionTool] Response: { code: 200, ... }
```

## 使用示例

### 场景 1: 创建交易
**用户**: "帮我记录一笔午餐支出50元"

**AI 执行流程**:
1. 调用 `get_current_ledger` 获取账本ID
2. 调用 `search_category` 搜索"餐饮"或"午餐"相关分类
3. 调用 `create_transaction` 创建交易
4. 返回: "✅ 交易创建成功！ID: 123, 名称: 午餐, 金额: 50, 类型: EXPENSE"

### 场景 2: 查询交易
**用户**: "今天的支出有哪些?"

**AI 执行流程**:
1. 调用 `get_current_ledger` 获取账本ID
2. 计算今天的日期范围
3. 调用 `query_transactions` 查询
4. 返回格式化的交易列表

### 场景 3: 智能对话
**用户**: "我的账本里有哪些分类?"

**AI 执行流程**:
1. 调用 `get_current_ledger` 获取账本ID
2. 调用 `get_categories` 获取分类列表
3. 返回分类信息

## 技术架构

```
┌─────────────────┐
│  AgentScreen    │  更新上下文
│                 │  ──────────────────┐
└─────────────────┘                    │
                                       ▼
┌─────────────────┐         ┌──────────────────┐
│  User Input     │────────▶│   Agent Loop     │
└─────────────────┘         │  (agent.ts)      │
                            └──────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    ▼                ▼                ▼
           ┌────────────┐   ┌────────────┐  ┌────────────┐
           │  Context   │   │  API Tools │  │Transaction │
           │   Tools    │   │            │  │   Tools    │
           └────────────┘   └────────────┘  └────────────┘
                    │                │                │
                    └────────────────┼────────────────┘
                                     ▼
                            ┌──────────────────┐
                            │   Backend API    │
                            └──────────────────┘
```

## 配置说明

### 工具列表合并 (agent.ts)
```typescript
import { tools as transactionTools } from "./tools/transactionTools";
import { contextTools } from "./tools/contextTools";
import { apiTools } from "./tools/apiTools";

// 合并所有工具
const tools = [...contextTools, ...apiTools, ...transactionTools];
```

### 上下文注入 (AgentScreen.tsx)
```typescript
useEffect(() => {
  updateAgentContext({
    user,
    currentLedger,
    defaultLedgerId,
    allLedgers,
    token,
  });
}, [user, currentLedger, defaultLedgerId, ledgers, token]);
```

## 调试建议

### 1. 查看完整日志
所有工具调用都有详细的日志输出,包括:
- 🔧 工具被调用
- 📍 中间步骤
- ✅ 成功结果
- ❌ 错误信息

### 2. 检查上下文
在 AgentScreen 启动时会看到:
```
🔄 [AgentScreen] Updating agent context
```

在控制台查看 contextTools 的日志:
```
🔄 [ContextTools] Context updated: { user: {...}, currentLedger: {...} }
```

### 3. 追踪 Agent 决策
查看 Agent 的迭代过程:
```
🔄 [Agent] Iteration 1/10
💭 [Agent] Calling LLM...
🔧 [Agent] Found 2 tool call(s):
  1. get_current_ledger {}
  2. create_transaction {...}
```

## 性能优化

1. **减少不必要的工具调用**: AI 可以一次性用 `get_full_context` 获取所有信息
2. **缓存上下文**: 前端上下文变化时才更新,不是每次对话都更新
3. **智能参数推断**: 工具自动填充参数,减少 AI 的推理步骤

## 后续扩展

可以继续添加更多工具:
- 预算管理工具
- 报表生成工具
- 智能分析工具
- 数据导出工具

只需:
1. 在对应的 tools 文件中定义工具
2. 在 agent.ts 中导入并合并到工具列表
3. AI 就能自动使用这些新工具

## 总结

通过这次优化:
✅ AI 能够主动获取所需信息,不再向用户索要
✅ 工具调用更智能,参数自动填充
✅ 完整的日志系统,便于调试
✅ 可扩展的架构,易于添加新功能
✅ 符合 ReAct 范式的最佳实践
