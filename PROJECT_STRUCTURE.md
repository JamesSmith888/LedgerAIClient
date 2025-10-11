# LedgerAI Client - 项目结构说明

## 📁 目录结构

```
LedgerAIClient/
├── src/                          # 源代码目录
│   ├── screens/                  # 页面组件
│   │   ├── HomeScreen.tsx        # 主页示例
│   │   └── index.ts             # 页面导出文件
│   │
│   ├── components/               # 组件目录
│   │   ├── common/              # 通用组件
│   │   │   ├── Button.tsx       # 按钮组件
│   │   │   ├── Input.tsx        # 输入框组件
│   │   │   ├── Card.tsx         # 卡片组件
│   │   │   └── index.ts         # 组件导出文件
│   │   └── ...                  # 其他业务组件
│   │
│   ├── navigation/               # 导航配置（未来添加）
│   │   └── ...
│   │
│   ├── services/                 # API 服务层
│   │   └── ...                  # API 请求函数
│   │
│   ├── hooks/                    # 自定义 Hooks
│   │   └── ...                  # 如 useAuth, useFetch 等
│   │
│   ├── utils/                    # 工具函数
│   │   └── ...                  # 通用工具方法
│   │
│   ├── constants/                # 常量配置
│   │   └── theme.ts             # 主题配置（颜色、字体、间距等）
│   │
│   ├── types/                    # TypeScript 类型定义
│   │   └── index.ts             # 通用类型
│   │
│   └── assets/                   # 静态资源
│       └── images/              # 图片资源
│
├── android/                      # Android 原生代码
├── ios/                          # iOS 原生代码
├── App.tsx                       # 应用入口文件
├── package.json                  # 项目依赖配置
└── tsconfig.json                # TypeScript 配置

```

## 🎯 各目录说明

### `src/screens/` - 页面组件
存放应用的各个页面组件，每个页面对应一个完整的屏幕。

**命名规范**：使用 `XxxScreen.tsx` 格式
- `HomeScreen.tsx` - 主页
- `LoginScreen.tsx` - 登录页（示例）
- `ProfileScreen.tsx` - 个人资料页（示例）

### `src/components/` - 组件目录

#### `common/` - 通用组件
可复用的基础 UI 组件，不包含业务逻辑。

**已创建的组件**：
- **Button** - 按钮组件
  - 支持多种样式：primary、secondary、outline、text
  - 支持多种尺寸：small、medium、large
  - 支持加载状态和禁用状态
  
- **Input** - 输入框组件
  - 支持标签和错误提示
  - 自动聚焦样式
  - 完整的 TextInput 属性支持
  
- **Card** - 卡片组件
  - 支持默认和轮廓两种样式
  - 带阴影效果
  - 圆角设计

**使用示例**：
```tsx
import { Button, Input, Card } from '../components/common';

// 使用按钮
<Button 
  title="提交" 
  onPress={handleSubmit} 
  variant="primary"
  loading={isLoading}
/>

// 使用输入框
<Input
  label="邮箱"
  placeholder="请输入邮箱"
  value={email}
  onChangeText={setEmail}
  error={emailError}
/>

// 使用卡片
<Card>
  <Text>卡片内容</Text>
</Card>
```

### `src/constants/` - 常量配置

#### `theme.ts` - 主题配置
统一管理设计规范，确保 UI 一致性。

**包含内容**：
- **Colors** - 颜色系统
  - 主色调：primary, primaryDark, primaryLight
  - 功能色：success, warning, error, info
  - 中性色：background, surface, card
  - 文字色：text, textSecondary, textDisabled
  - 边框色：border, divider

- **Spacing** - 间距系统
  - xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48

- **FontSizes** - 字体大小
  - xs: 12, sm: 14, md: 16, lg: 18, xl: 20, xxl: 24, xxxl: 32

- **FontWeights** - 字体粗细
  - regular: '400', medium: '500', semibold: '600', bold: '700'

- **BorderRadius** - 圆角
  - sm: 4, md: 8, lg: 12, xl: 16, round: 999

- **Shadows** - 阴影
  - sm, md, lg（包含完整的阴影配置）

**使用示例**：
```tsx
import { Colors, Spacing, FontSizes } from '../constants/theme';

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: FontSizes.xl,
    color: Colors.text,
  },
});
```

### `src/types/` - 类型定义
存放 TypeScript 接口和类型定义。

### `src/services/` - API 服务层
存放所有 API 请求相关的代码。

**未来示例**：
```tsx
// src/services/userService.ts
export const userService = {
  login: async (email: string, password: string) => {
    // API 请求逻辑
  },
  getUserInfo: async (userId: string) => {
    // API 请求逻辑
  },
};
```

### `src/hooks/` - 自定义 Hooks
存放可复用的 React Hooks。

**未来示例**：
```tsx
// src/hooks/useAuth.ts
export const useAuth = () => {
  // 认证逻辑
};
```

### `src/utils/` - 工具函数
存放通用的工具方法。

**未来示例**：
```tsx
// src/utils/formatters.ts
export const formatDate = (date: Date) => {
  // 日期格式化
};
```

### `src/navigation/` - 导航配置
未来如果需要多页面导航，可以在这里配置路由。

**建议使用**：
- `@react-navigation/native` - React Navigation
- `@react-navigation/stack` - 堆栈导航
- `@react-navigation/bottom-tabs` - 底部标签导航

## 🎨 HomeScreen 示例说明

当前的 `HomeScreen.tsx` 展示了以下功能：

### 1. **表单功能**
- 文本输入（姓名、邮箱）
- 实时邮箱验证
- 表单提交与加载状态
- 开关组件（Switch）

### 2. **按钮样式**
- 主要按钮（Primary）
- 次要按钮（Secondary）
- 轮廓按钮（Outline）
- 文本按钮（Text）
- 禁用状态

### 3. **数据展示**
- 统计卡片（用户数、项目数、完成率）
- 列表渲染（FlatList）
- 头像和文本展示

### 4. **布局技巧**
- SafeAreaView 安全区域
- ScrollView 滚动容器
- Flexbox 布局
- Card 卡片布局

## 🚀 如何运行

### Android
```bash
npm run android
# 或
npx react-native run-android
```

### iOS
```bash
npm run ios
# 或
npx react-native run-ios
```

## 📝 最佳实践

### 1. **组件设计原则**
- 单一职责：每个组件只做一件事
- 可复用性：通用组件放在 `components/common/`
- Props 类型：使用 TypeScript 定义清晰的 Props 接口

### 2. **样式规范**
- 使用 `StyleSheet.create()` 创建样式
- 从 `theme.ts` 引入颜色、间距等常量
- 避免内联样式

### 3. **命名规范**
- 组件文件：大驼峰命名（PascalCase）
- 工具函数：小驼峰命名（camelCase）
- 常量：大写下划线（UPPER_SNAKE_CASE）

### 4. **代码组织**
- 使用 `index.ts` 统一导出
- 相关文件放在同一目录
- 保持文件简洁（建议不超过 300 行）

## 🔧 下一步建议

### 1. **添加导航**
安装 React Navigation：
```bash
npm install @react-navigation/native @react-navigation/stack
npm install react-native-screens react-native-safe-area-context
```

### 2. **状态管理**
根据项目复杂度选择：
- 简单项目：React Context + useReducer
- 复杂项目：Redux Toolkit 或 Zustand

### 3. **网络请求**
安装 Axios：
```bash
npm install axios
```

### 4. **图标库**
安装 React Native Vector Icons：
```bash
npm install react-native-vector-icons
```

### 5. **表单管理**
安装 React Hook Form：
```bash
npm install react-hook-form
```

## 📚 学习资源

- [React Native 官方文档](https://reactnative.dev/)
- [React Navigation 文档](https://reactnavigation.org/)
- [TypeScript 文档](https://www.typescriptlang.org/)

## 💡 提示

作为新手，建议按以下顺序学习：
1. 先熟悉现有的 HomeScreen 示例
2. 尝试修改样式和文本
3. 创建新的简单页面
4. 学习组件间的数据传递
5. 逐步添加导航和状态管理

遇到问题可以：
- 查看组件的 Props 类型定义
- 参考 HomeScreen 的实现方式
- 阅读 React Native 官方文档
