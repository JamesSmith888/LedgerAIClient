# 账本管理三点菜单优化说明

## 改进概述

参考 **Telegram** 和 **Google Material Design** 风格，重新设计了账本列表的操作菜单，提升用户体验和视觉美感。

---

## 主要改进

### 1. 🎨 从 Alert 弹窗改为底部抽屉 (Bottom Sheet)

**改进前**: 使用原生 `Alert.alert()` 弹窗
- ❌ 样式单调，无法自定义
- ❌ 操作选项排列不清晰
- ❌ 缺少视觉层次感

**改进后**: 自定义底部抽屉组件 `LedgerActionSheet`
- ✅ 流畅的弹出动画 (Spring 动效)
- ✅ 清晰的信息层级
- ✅ 现代化的视觉设计
- ✅ 更大的点击区域

---

### 2. 📱 设计风格

#### Telegram 风格元素
- **拖拽指示器**: 顶部圆角小横条，提示可拖动关闭
- **圆角卡片**: 大圆角 (24px) 设计，柔和亲和
- **信息密度**: 紧凑但不拥挤的布局
- **扁平化图标**: 使用 emoji 图标，直观易懂

#### Google Material Design 元素
- **卡片式操作项**: 每个操作都是独立的圆角卡片
- **明确的视觉层级**: 通过颜色和字重区分操作类型
- **悬浮效果**: 底部弹窗带阴影，营造悬浮感
- **涟漪效果**: 点击反馈清晰 (activeOpacity)

---

### 3. 🎯 组件结构

```
LedgerActionSheet (底部抽屉)
├─ 背景遮罩 (半透明黑色)
├─ 弹窗主体
│  ├─ 拖拽指示器 ━━━━━━
│  ├─ 账本信息头部
│  │  ├─ 图标 (56x56, 圆角)
│  │  ├─ 账本名称
│  │  ├─ 默认徽章 (如果是默认账本)
│  │  ├─ 账本类型 + 成员数
│  │  └─ 账本描述
│  ├─ 分割线 ─────────
│  ├─ 操作列表
│  │  ├─ [⭐] 设为默认 / 默认账本
│  │  ├─ [👁] 查看详情
│  │  └─ [🗑] 删除账本
│  └─ 取消按钮
```

---

### 4. ✨ 交互优化

#### 三点按钮位置
- **位置**: 卡片右上角 (绝对定位)
- **样式**: 36x36 圆形，浅色背景
- **点击区域**: 独立于卡片主体，避免误触

#### 卡片点击
- **卡片主体**: 点击进入详情页
- **三点按钮**: 点击打开操作菜单
- **清晰分离**: 两个独立的点击区域

#### 操作项状态
```typescript
type ActionType = 'default' | 'primary' | 'destructive' | 'disabled'

// 主要操作 (primary)
[☆] 设为默认 → 蓝色文字 + 右箭头

// 默认状态 (disabled)
[⭐] 默认账本 → 灰色文字 + 禁用状态

// 普通操作 (default)
[👁] 查看详情 → 黑色文字

// 危险操作 (destructive)
[🗑] 删除账本 → 红色文字
```

---

### 5. 🎬 动画效果

#### 弹出动画
```typescript
Animated.spring(slideAnim, {
    toValue: 1,
    tension: 65,  // 张力，控制弹簧强度
    friction: 10, // 摩擦力，控制阻尼
})
```
- **效果**: 从下往上弹出，带弹性效果
- **时长**: 约 300-400ms

#### 关闭动画
```typescript
Animated.timing(slideAnim, {
    toValue: 0,
    duration: 200,
})
```
- **效果**: 快速向下滑出
- **时长**: 200ms

---

### 6. 📐 尺寸规范

| 元素 | 尺寸 | 说明 |
|------|------|------|
| 底部弹窗圆角 | 24px | 顶部左右圆角 |
| 拖拽指示器 | 36×4px | 宽×高 |
| 账本图标容器 | 56×56px | 正方形 |
| 三点按钮 | 36×36px | 圆形 |
| 操作项高度 | 约 60px | 含内边距 |
| 操作图标容器 | 36×36px | 正方形 |

---

### 7. 🎨 配色方案

```typescript
// 主要颜色
- 主色调: Colors.primary (蓝色)
- 警告色: Colors.error (红色)
- 默认徽章: Colors.accent.yellow (黄色)

// 背景颜色
- 弹窗背景: Colors.surface (白色)
- 遮罩背景: rgba(0, 0, 0, 0.5)
- 操作项背景: Colors.backgroundSecondary (浅灰)
- 三点按钮背景: Colors.backgroundSecondary

// 文字颜色
- 主标题: Colors.text (深黑)
- 副标题: Colors.textSecondary (中灰)
- 描述文字: Colors.textLight (浅灰)
- 主要操作: Colors.primary (蓝色)
- 危险操作: Colors.error (红色)
```

---

## 使用示例

### 基本用法

```tsx
import { LedgerActionSheet } from '../components/ledger/LedgerActionSheet';

const [actionSheetVisible, setActionSheetVisible] = useState(false);
const [selectedLedger, setSelectedLedger] = useState<Ledger | null>(null);

// 打开菜单
<TouchableOpacity
  onPress={() => {
    setSelectedLedger(ledger);
    setActionSheetVisible(true);
  }}
>
  <Text>⋯</Text>
</TouchableOpacity>

// 使用组件
<LedgerActionSheet
  visible={actionSheetVisible}
  ledger={selectedLedger}
  isDefault={selectedLedger?.id === defaultLedgerId}
  onClose={() => {
    setActionSheetVisible(false);
    setSelectedLedger(null);
  }}
  onSetDefault={() => {
    // 设置默认账本逻辑
    handleSetDefaultLedger(selectedLedger);
    setActionSheetVisible(false);
  }}
  onViewDetail={() => {
    // 查看详情逻辑
    handleLedgerPress(selectedLedger);
  }}
  onDelete={() => {
    // 删除账本逻辑
    handleDeleteLedger(selectedLedger);
  }}
/>
```

---

## 对比效果

### 改进前 (Alert)
```
┌─────────────────────────┐
│   家庭账本              │
│   选择操作              │
├─────────────────────────┤
│ ✓ 默认账本              │
│ 查看详情                │
│ 删除账本                │
│ 取消                    │
└─────────────────────────┘
```
- 简陋的系统弹窗
- 信息展示单一
- 操作不够直观

### 改进后 (Bottom Sheet)
```
┌─────────────────────────────────┐
│         ━━━━━━                  │ ← 拖拽指示器
│                                 │
│  📖  家庭账本  [⭐ 默认]        │ ← 账本信息头部
│      个人账本 · 用于日常开销    │
│                                 │
│  ─────────────────────────      │ ← 分割线
│                                 │
│  ┌───────────────────────┐      │
│  │ ⭐ 默认账本            │      │ ← 已禁用
│  └───────────────────────┘      │
│  ┌───────────────────────┐      │
│  │ 👁  查看详情           │      │
│  └───────────────────────┘      │
│  ┌───────────────────────┐      │
│  │ 🗑  删除账本           │      │ ← 红色文字
│  └───────────────────────┘      │
│                                 │
│  ┌───────────────────────┐      │
│  │       取消             │      │
│  └───────────────────────┘      │
└─────────────────────────────────┘
```
- 清晰的视觉层级
- 丰富的信息展示
- 直观的操作图标

---

## 技术亮点

### 1. 性能优化
- 使用 `useRef` 存储动画值，避免重复创建
- 使用 `Pressable` 阻止事件冒泡
- 懒加载：只在需要时渲染弹窗内容

### 2. 无障碍支持
- 清晰的视觉提示
- 足够大的点击区域 (最小 36×36)
- 颜色对比度符合 WCAG 标准

### 3. 响应式设计
- `maxHeight: '80%'` 适配不同屏幕
- 弹性布局，自动适应内容高度
- 支持横竖屏切换

---

## 扩展建议

### 短期优化
1. 添加触觉反馈 (Haptic Feedback)
2. 支持下滑手势关闭
3. 添加更多操作选项 (编辑、分享等)

### 长期扩展
1. 支持自定义操作列表
2. 添加账本统计信息展示
3. 支持长按拖动排序

---

## 总结

这次优化将传统的 Alert 弹窗升级为现代化的底部抽屉设计，不仅提升了视觉美感，更重要的是改善了用户体验：

✅ **更直观**: 图标 + 文字，一目了然
✅ **更流畅**: 弹性动画，过渡自然
✅ **更清晰**: 信息层级分明，重点突出
✅ **更易用**: 大点击区域，操作便捷

完美融合了 Telegram 的简洁高效和 Google 的精致友好！
