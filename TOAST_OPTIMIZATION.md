# Toast 弹窗优化说明

## 概述

项目已成功将原始的 `Alert` 弹窗替换为更现代化的 `react-native-toast-message` 组件，提供更好的用户体验。

## 改动内容

### 1. 新增依赖
- 安装了 `react-native-toast-message` 库

### 2. 创建 Toast 工具类
- 文件位置: `src/utils/toast.ts`
- 提供了统一的 Toast API:
  - `toast.success(message, title?)` - 成功提示
  - `toast.error(message, title?)` - 错误提示
  - `toast.info(message, title?)` - 信息提示
  - `toast.warning(message, title?)` - 警告提示
  - `toast.hide()` - 隐藏当前 Toast
  - `showConfirm(title, message, onConfirm, onCancel?)` - 确认对话框（保留原生 Alert）

### 3. App.tsx 集成
- 在根组件添加了 `<Toast />` 组件，确保全局可用

### 4. 更新的文件

#### 屏幕文件 (Screens)
- ✅ `LoginScreen.tsx` - 登录成功/失败提示
- ✅ `RegisterScreen.tsx` - 注册成功/失败提示
- ✅ `AddTransactionScreen.tsx` - 记账保存提示
- ✅ `CreateLedgerScreen.tsx` - 账本创建提示
- ✅ `LedgerManagementScreen.tsx` - 账本删除确认
- ✅ `LedgerDetailScreen.tsx` - 账本详情相关操作
- ✅ `TransactionListScreen.tsx` - 数据加载错误提示
- ✅ `ProfileScreen.tsx` - 退出登录确认

#### Context 文件
- ✅ `LedgerContext.tsx` - 账本相关操作提示

## 使用方法

### 简单提示（推荐使用 Toast）

```typescript
import { toast } from '../utils/toast';

// 成功提示
toast.success('操作成功');
toast.success('账本创建成功', '成功');

// 错误提示
toast.error('操作失败，请重试');
toast.error(errorMessage, '错误');

// 信息提示
toast.info('请先选择分类');
toast.info('功能开发中...', '提示');

// 警告提示
toast.warning('此操作不可逆', '警告');
```

### 需要用户确认的操作（使用 showConfirm）

```typescript
import { showConfirm } from '../utils/toast';

showConfirm(
  '确认删除',
  '确定要删除这个账本吗？',
  async () => {
    // 用户点击确定后的操作
    await deleteAction();
  },
  () => {
    // 用户点击取消后的操作（可选）
    console.log('用户取消了操作');
  }
);
```

### 需要多个选项的操作（保留原生 Alert）

对于需要提供多个选项的场景（如操作菜单），仍然使用原生 `Alert.alert`:

```typescript
import { Alert } from 'react-native';

Alert.alert(
  '选择操作',
  '请选择您要执行的操作',
  [
    { text: '选项1', onPress: () => action1() },
    { text: '选项2', onPress: () => action2() },
    { text: '取消', style: 'cancel' },
  ]
);
```

## Toast 配置

Toast 的默认配置在 `src/utils/toast.ts` 中，您可以根据需要调整：

- `position`: 显示位置（'top' | 'bottom'）
- `visibilityTime`: 显示时长（毫秒）
- `autoHide`: 是否自动隐藏
- `topOffset`: 顶部偏移量

## 优势

1. **更好的用户体验**: Toast 提示不会打断用户操作流程
2. **视觉效果**: 现代化的 UI 设计，更符合移动应用习惯
3. **统一管理**: 通过工具类统一管理所有提示，便于后续维护
4. **灵活配置**: 支持自定义样式、位置、显示时长等
5. **类型安全**: 完整的 TypeScript 支持

## 注意事项

1. 对于**需要用户确认**的重要操作（如删除、退出等），仍使用 `showConfirm` 函数
2. 对于**需要多个选项**的场景，保留使用原生 `Alert`
3. 对于**简单的提示信息**，统一使用 `toast` 方法
4. TestScreen.tsx 保留原生 Alert（用于测试目的）

## 后续优化建议

1. 可以自定义 Toast 的样式和动画效果
2. 可以添加更多 Toast 类型（如 loading 状态）
3. 可以考虑添加音效或振动反馈
4. 可以针对不同的错误类型显示不同的图标
