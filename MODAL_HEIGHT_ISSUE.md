# 邀请弹窗渲染问题排查报告

## 🐛 问题描述

用户点击"邀请"按钮后，弹窗没有显示任何内容，看起来像是没有弹出。

## 🔍 问题原因

### 根本原因：容器高度计算问题

弹窗的 `container` 样式设置如下：
```typescript
container: {
  backgroundColor: Colors.surface,
  borderTopLeftRadius: BorderRadius.xl,
  borderTopRightRadius: BorderRadius.xl,
  maxHeight: '90%',  // ❌ 只设置了最大高度
  paddingBottom: Spacing.xl,
}
```

**问题分析**：
1. 只设置了 `maxHeight: '90%'`，没有设置 `minHeight`
2. 当内容较少时，容器高度可能被计算为 0 或极小值
3. 导致弹窗虽然存在，但不可见或高度太小看不见
4. 用户看到的只是半透明的遮罩层，以为弹窗没弹出

### 触发条件
- 初始状态：邀请码列表为空（0条）
- 内容高度不足以撑开容器
- 没有最小高度约束，导致容器塌陷

## ✅ 解决方案

添加 `minHeight` 属性，确保弹窗始终有一个可见的最小高度：

```typescript
container: {
  backgroundColor: Colors.surface,
  borderTopLeftRadius: BorderRadius.xl,
  borderTopRightRadius: BorderRadius.xl,
  maxHeight: '90%',
  minHeight: '50%',  // ✅ 添加最小高度
  paddingBottom: Spacing.xl,
}
```

## 📊 问题表现

### 症状
- ✅ API 请求成功（返回 200）
- ✅ 数据加载成功（返回空数组 []）
- ✅ Modal 组件已挂载
- ❌ 用户看不到弹窗内容

### 调试日志显示
```
=== 加载邀请码列表 ===
账本ID: 18
📥 获取到邀请码: 0 条
邀请码数据: []
```

**关键点**：所有逻辑都正常，只是视觉上不可见。

## 🎯 经验总结

### React Native 布局最佳实践

1. **Modal/BottomSheet 容器必须设置明确的高度**
   ```typescript
   // ❌ 错误：只设置最大值
   maxHeight: '90%'
   
   // ✅ 正确：同时设置最小值和最大值
   minHeight: '50%',
   maxHeight: '90%'
   ```

2. **使用百分比高度时要特别小心**
   - 百分比基于父容器计算
   - 如果父容器高度不确定，可能导致计算错误
   - 建议同时设置最小和最大边界

3. **空状态设计要考虑占位**
   - 即使内容为空，也要有合理的占位高度
   - 避免容器因内容为空而塌陷

4. **底部弹窗的通用模式**
   ```typescript
   container: {
     minHeight: '40%',   // 确保最小可见高度
     maxHeight: '90%',   // 防止过高遮挡
     flex: 0,            // 不使用 flex 自动布局
   }
   ```

## 🔧 调试技巧

当遇到"组件不显示"问题时，按以下步骤排查：

1. **确认组件是否渲染**
   - 添加明显的测试标记（如红色背景）
   - 检查 React DevTools

2. **检查样式问题**
   - 高度/宽度是否为 0
   - 是否被遮挡（z-index）
   - 是否超出屏幕范围

3. **检查条件渲染**
   - visible 状态是否正确
   - 条件判断是否有误

4. **检查透明度**
   - opacity 是否为 0
   - backgroundColor 是否透明

## 📝 修复代码

### 修复前
```typescript
container: {
  backgroundColor: Colors.surface,
  borderTopLeftRadius: BorderRadius.xl,
  borderTopRightRadius: BorderRadius.xl,
  maxHeight: '90%',
  paddingBottom: Spacing.xl,
},
```

### 修复后
```typescript
container: {
  backgroundColor: Colors.surface,
  borderTopLeftRadius: BorderRadius.xl,
  borderTopRightRadius: BorderRadius.xl,
  maxHeight: '90%',
  minHeight: '50%',  // 新增
  paddingBottom: Spacing.xl,
},
```

## ✅ 验证结果

修复后：
- ✅ 弹窗正常显示
- ✅ 内容区域可见
- ✅ 高度合适，不会太小或太大
- ✅ 用户体验正常

---

**日期**: 2025-11-18  
**问题类型**: UI布局问题  
**影响范围**: InviteMemberSheet 组件  
**严重程度**: 高（功能完全不可用）  
**解决时间**: 约10分钟
