# 🚀 快速入门指南

## 欢迎！

恭喜你已经有了一个完整的 React Native 项目结构！这份指南将帮助你快速上手。

## 📱 运行项目

### 启动 Metro 服务器
```bash
npm start
```

### 运行 Android 应用
```bash
npm run android
```

### 运行 iOS 应用（仅 macOS）
```bash
npm run ios
```

## 🎯 项目已包含的内容

### ✅ 标准目录结构
- `src/screens/` - 页面组件
- `src/components/common/` - 通用 UI 组件
- `src/constants/` - 主题和常量配置
- `src/services/` - API 服务层（示例）
- `src/utils/` - 工具函数（示例）
- `src/hooks/` - 自定义 Hooks（示例）
- `src/types/` - TypeScript 类型定义

### ✅ 可复用组件
1. **Button（按钮）** - 支持 4 种样式，3 种尺寸
2. **Input（输入框）** - 支持标签、错误提示、验证
3. **Card（卡片）** - 支持阴影和轮廓两种样式

### ✅ 完整示例页面（HomeScreen）
展示了以下功能：
- ✨ 表单输入与验证
- 🎨 多种按钮样式
- 📊 统计卡片展示
- 📋 列表渲染
- 🔄 加载状态
- ⚙️ 开关组件

## 🎨 如何使用组件

### 1. 使用按钮
```tsx
import { Button } from './src/components/common';

<Button 
  title="点击我" 
  onPress={() => console.log('按钮被点击')}
  variant="primary"  // primary | secondary | outline | text
  size="medium"      // small | medium | large
/>
```

### 2. 使用输入框
```tsx
import { Input } from './src/components/common';

const [name, setName] = useState('');

<Input
  label="用户名"
  placeholder="请输入用户名"
  value={name}
  onChangeText={setName}
/>
```

### 3. 使用卡片
```tsx
import { Card } from './src/components/common';

<Card>
  <Text>这是卡片内容</Text>
</Card>
```

### 4. 使用主题颜色和样式
```tsx
import { Colors, Spacing, FontSizes } from './src/constants/theme';

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,           // 16
    backgroundColor: Colors.primary, // #007AFF
  },
  title: {
    fontSize: FontSizes.xl,        // 20
    color: Colors.text,            // #000000
  },
});
```

## 📝 创建新页面的步骤

### 步骤 1: 创建页面文件
在 `src/screens/` 下创建新文件，例如 `ProfileScreen.tsx`：

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../constants/theme';

export const ProfileScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>个人资料</Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.md,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
});
```

### 步骤 2: 在 index.ts 中导出
编辑 `src/screens/index.ts`：

```tsx
export { HomeScreen } from './HomeScreen';
export { ProfileScreen } from './ProfileScreen';
```

### 步骤 3: 在 App.tsx 中使用
```tsx
import { ProfileScreen } from './src/screens';

// 然后在适当的位置使用 <ProfileScreen />
```

## 🔧 常用开发技巧

### 1. 调试
- 在模拟器中按 `Cmd + D` (iOS) 或 `Cmd + M` (Android) 打开开发菜单
- 选择 "Debug" 可以在 Chrome 中调试
- 使用 `console.log()` 输出调试信息

### 2. 热更新
- 修改代码后自动刷新
- 按 `R` 键手动刷新

### 3. 样式调试
- 使用 `borderWidth: 1, borderColor: 'red'` 来查看组件边界
- 使用 `backgroundColor: 'lightblue'` 来查看布局

## 📚 学习路径建议

### 第 1 周：熟悉基础
- ✅ 运行项目，查看 HomeScreen
- ✅ 修改文本和颜色，观察变化
- ✅ 尝试添加新的按钮和输入框

### 第 2 周：理解组件
- ✅ 阅读 Button、Input、Card 组件源码
- ✅ 尝试修改组件样式
- ✅ 创建自己的简单组件

### 第 3 周：创建新页面
- ✅ 创建一个新的页面
- ✅ 在页面中使用多个组件
- ✅ 学习状态管理（useState）

### 第 4 周：深入学习
- ✅ 学习表单验证
- ✅ 学习列表渲染（FlatList）
- ✅ 学习网络请求

## 💡 常见问题

### Q: 如何添加新的颜色？
A: 编辑 `src/constants/theme.ts`，在 `Colors` 对象中添加：
```tsx
export const Colors = {
  // ...现有颜色
  myCustomColor: '#FF6B6B',
};
```

### Q: 如何创建可复用组件？
A: 在 `src/components/common/` 下创建新文件，参考 Button.tsx 的写法。

### Q: 如何处理表单验证？
A: 参考 HomeScreen 中的邮箱验证示例，使用 useState 和正则表达式。

### Q: 如何发起网络请求？
A: 查看 `src/services/api.ts` 中的示例代码。

## 🎓 推荐资源

- [React Native 官方文档](https://reactnative.dev/)
- [React 官方文档](https://react.dev/)
- [TypeScript 文档](https://www.typescriptlang.org/)

## 🆘 需要帮助？

1. 查看 `PROJECT_STRUCTURE.md` 了解项目结构
2. 阅读组件源码中的注释
3. 查看 HomeScreen.tsx 中的示例用法

## 🎉 下一步

现在你可以：
1. 运行项目看看效果
2. 修改 HomeScreen 中的文本
3. 尝试改变主题颜色
4. 创建你的第一个新页面

祝你学习愉快！🚀
