# 工具授权持久化与工具集管理功能

## 功能概述

本次更新实现了两个关键功能：

1. **工具授权持久化** - 用户授权的"始终允许"设置会被保存到本地存储，应用重启后自动恢复
2. **工具集模式切换** - 支持在"聚合模式"和"细粒度模式"之间切换，满足不同用户需求

## 新增/修改文件

### 1. `src/services/toolPermissionStorage.ts` (新增)

工具权限持久化服务，使用 AsyncStorage 存储用户的授权设置。

主要功能：
- `setAlwaysAllowed(toolName)` - 设置工具为始终允许
- `removeAlwaysAllowed(toolName)` - 移除工具的始终允许设置
- `isAlwaysAllowed(toolName)` - 检查工具是否已授权
- `getAllAlwaysAllowed()` - 获取所有已授权工具列表
- `resetAll()` - 重置所有授权设置
- `getByPrefix(prefix)` - 获取指定前缀的所有授权（用于领域工具的子操作）

### 2. `src/agent/utils/permissions.ts` (修改)

更新权限管理模块，集成持久化存储：
- 新增 `initializeToolPermissions()` 函数用于初始化
- `setToolAlwaysAllowed()` 和 `removeToolAlwaysAllowed()` 现在会自动持久化
- 保持原有 API 兼容，对调用方透明

### 3. `src/types/tool.ts` (修改)

新增工具集相关类型定义：
- `ToolSetMode` - 工具集模式类型 ('granular' | 'domain')
- `ToolSet` - 工具集定义接口
- `ToolAction` - 工具操作接口（用于领域工具的子操作）
- `TOOL_SETS` - 预定义的工具集配置
- 为 `ToolMeta` 添加 `toolSet` 和 `actions` 字段
- 新增辅助函数：`getToolsByToolSet()`, `getToolSet()`, `filterToolsByMode()` 等

### 4. `src/hooks/useToolManager.ts` (修改)

扩展工具管理 Hook：
- 新增 `toolMode` 状态和 `setToolMode()` 方法
- 新增 `currentModeTools` - 当前模式下的工具列表
- 更新 `toggleAlwaysAllowed()` 支持子操作格式 (如 `transaction.create`)
- 统计数据增加 `authorized` 字段（已授权工具数量）
- 初始化时自动从持久化存储恢复授权状态

### 5. `src/components/agent/ToolManagerPanel.tsx` (修改)

增强工具管理面板 UI：
- 新增 `ToolSetSelector` 组件用于切换工具集模式
- 新增 `ToolActionItem` 组件用于展示和管理领域工具的子操作
- 工具项支持展开/收起子操作列表
- 显示每个工具的授权状态和子操作授权计数
- 支持直接在面板中授权/取消授权操作

### 6. `src/screens/AgentScreen.tsx` (修改)

更新 Agent 页面：
- 从 `useToolManager` 获取新增的 `toolMode`, `toolSets`, `setToolMode`
- 传递新 props 给 `ToolManagerPanel`

## 数据存储

### 存储键

- `tool_permissions_always_allowed` - 已授权工具列表 (JSON 数组)
- `agent_tool_settings` - 工具启用/禁用设置
- `agent_tool_mode` - 当前工具集模式

### 存储格式

```json
// tool_permissions_always_allowed
["transaction.create", "transaction.query", "category.list"]

// agent_tool_settings
{
  "enabledTools": ["transaction", "category", "context", "render_transaction_list"],
  "version": 1,
  "toolMode": "domain"
}

// agent_tool_mode
"domain"
```

## 工具集模式

### 聚合模式 (domain)

- 4 个领域聚合工具 + 4 个渲染工具
- 每个领域工具包含多个子操作
- AI 更容易选择正确的工具
- 适合大多数用户

### 细粒度模式 (granular)

- 20+ 个独立工具
- 每个操作是独立的工具
- 精细控制每个功能的启用/禁用
- 适合高级用户

## 授权机制

1. **工具级授权** - 授权整个工具，跳过所有该工具的确认弹窗
2. **操作级授权** - 仅授权特定操作（如仅授权 `transaction.query` 但不授权 `transaction.delete`）
3. **持久化** - 所有授权设置会保存到本地，应用重启后自动恢复
4. **重置** - 用户可以在工具管理面板中一键重置所有授权

## 使用示例

```typescript
// 在组件中使用
const { 
  toolMode, 
  setToolMode, 
  toggleAlwaysAllowed,
  currentModeTools,
  toolSets,
} = useToolManager();

// 切换工具集模式
setToolMode('granular');

// 授权工具
toggleAlwaysAllowed('transaction.create', true);

// 取消授权
toggleAlwaysAllowed('transaction.delete', false);
```

## 注意事项

1. 授权设置存储在设备本地，不会同步到服务器
2. 卸载应用会清除所有授权设置
3. `critical` 级别的操作不支持"始终允许"，每次都需要确认
4. 工具集模式切换会立即生效，影响 Agent 可用的工具列表
