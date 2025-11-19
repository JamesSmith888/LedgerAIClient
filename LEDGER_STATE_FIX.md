# 账本状态显示修复说明

## 问题描述

在"我的账本"页面，设置某个账本为默认后：
- ✅ 右上角的"⭐ 默认"徽章显示正确
- ❌ 左侧蓝色强调条显示错误（总是显示第一个账本）
- 退出页面再进入后，蓝色强调条又回到第一个账本

## 问题根源

### 两个不同的概念

```typescript
// 1. currentLedger - 当前会话使用的账本（临时状态）
const currentLedger = useLedger().currentLedger;

// 2. defaultLedgerId - 用户设置的默认账本（持久化状态）
const defaultLedgerId = useLedger().defaultLedgerId;
```

### 错误的逻辑

```typescript
// ❌ 旧代码：使用 currentLedger 判断是否高亮
const isActive = currentLedger?.id === item.id;
<Card style={isActive ? styles.ledgerCardActive : styles.ledgerCard}>
```

**问题**：
- `currentLedger` 是临时的会话状态
- 每次进入账本管理页面，`currentLedger` 可能是任意账本
- 导致左侧蓝色强调条不稳定

## 修复方案

### 正确的逻辑

```typescript
// ✅ 新代码：使用 defaultLedgerId 判断是否高亮
const isDefault = defaultLedgerId === item.id;
<Card style={isDefault ? styles.ledgerCardActive : styles.ledgerCard}>
```

**好处**：
- `defaultLedgerId` 是持久化的用户设置
- 每次进入页面，都能正确显示默认账本
- 左侧蓝色强调条和右上角徽章保持一致

## 代码对比

### 修复前

```typescript
const renderLedgerItem = ({ item }: { item: Ledger }) => {
    const isActive = currentLedger?.id === item.id;  // ❌ 使用 currentLedger
    const isDefault = defaultLedgerId === item.id;
    
    return (
      <Card style={isActive ? styles.ledgerCardActive : styles.ledgerCard}>
        {isDefault && (
          <View style={styles.defaultBadge}>
            <Text>⭐ 默认</Text>
          </View>
        )}
        
        <View style={[
          styles.ledgerIconContainer,
          isActive && styles.ledgerIconContainerActive,  // ❌ 使用 isActive
        ]}>
          {/* ... */}
        </View>
      </Card>
    );
};
```

### 修复后

```typescript
const renderLedgerItem = ({ item }: { item: Ledger }) => {
    // ✅ 统一使用 isDefault 判断
    const isDefault = defaultLedgerId === item.id;
    
    return (
      <Card style={isDefault ? styles.ledgerCardActive : styles.ledgerCard}>
        {isDefault && (
          <View style={styles.defaultBadge}>
            <Text>⭐ 默认</Text>
          </View>
        )}
        
        <View style={[
          styles.ledgerIconContainer,
          isDefault && styles.ledgerIconContainerActive,  // ✅ 使用 isDefault
        ]}>
          {/* ... */}
        </View>
      </Card>
    );
};
```

## 视觉效果

### 修复前
```
进入页面:
┌──────────────────────┐
│📖 家庭账本 [⭐ 默认] │ ← 徽章正确
└──────────────────────┘
║
┌──────────────────────┐
║📖 工作账本           │ ← 蓝条错误（第一个）
└──────────────────────┘
┌──────────────────────┐
│📖 旅游账本           │
└──────────────────────┘
```

### 修复后
```
进入页面:
║
┌──────────────────────┐
║📖 家庭账本 [⭐ 默认] │ ← 徽章和蓝条都正确！
└──────────────────────┘
┌──────────────────────┐
│📖 工作账本           │
└──────────────────────┘
┌──────────────────────┐
│📖 旅游账本           │
└──────────────────────┘
```

## 语义澄清

### currentLedger（当前账本）
- **用途**: 记账时使用哪个账本
- **场景**: 交易列表、新增交易
- **特点**: 会话级别，可以临时切换

### defaultLedgerId（默认账本）
- **用途**: 用户的长期偏好设置
- **场景**: 账本管理、初始化选择
- **特点**: 持久化存储，跨设备同步

### 在不同页面的使用

| 页面 | 使用状态 | 说明 |
|------|---------|------|
| **账本管理** | `defaultLedgerId` | 显示用户设置的默认账本 |
| **交易列表** | `currentLedger` | 显示当前正在查看的账本 |
| **新增交易** | `currentLedger` | 记账到当前选中的账本 |

## 测试验证

### 测试步骤

1. **设置默认账本**
   ```
   打开"我的账本" → 点击"工作账本"的 ⋯ 
   → 选择"设为默认" → 确认左侧蓝条出现
   ```

2. **退出并重新进入**
   ```
   返回首页 → 重新进入"我的账本"
   → 验证"工作账本"的左侧蓝条仍然存在 ✅
   ```

3. **切换默认账本**
   ```
   点击"家庭账本"的 ⋯ → 选择"设为默认"
   → 验证蓝条移动到"家庭账本" ✅
   ```

4. **应用重启**
   ```
   完全关闭应用 → 重新打开 → 进入"我的账本"
   → 验证默认账本的蓝条正确显示 ✅
   ```

## 总结

### 核心改变
- 删除了 `isActive` 变量（基于 `currentLedger`）
- 统一使用 `isDefault` 变量（基于 `defaultLedgerId`）
- 确保视觉标识的一致性和持久性

### 用户体验提升
- ✅ 左侧蓝色强调条始终标识默认账本
- ✅ 右上角星标徽章始终标识默认账本
- ✅ 两个标识保持同步，不会错乱
- ✅ 退出页面再进入，状态依然正确

### 技术收益
- 代码逻辑更清晰
- 状态管理更一致
- 减少了混淆的可能性
