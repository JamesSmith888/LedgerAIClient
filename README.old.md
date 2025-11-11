# LedgerAI Client

一个规范的 React Native 项目，包含完整的目录结构和可复用组件示例。

## ✨ 特性

- 📁 **标准化目录结构** - 符合 React Native 最佳实践
- 🎨 **统一主题系统** - 颜色、字体、间距统一管理
- 🧩 **可复用组件** - Button、Input、Card 等通用组件
- 📱 **完整示例页面** - 包含表单、列表、卡片等常用功能
- 📝 **TypeScript 支持** - 类型安全，更好的开发体验
- 📚 **详细文档** - 适合新手学习

---

This is a [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Getting Started

## 📖 文档

- **[快速入门指南](./GETTING_STARTED.md)** - 新手必读，包含组件使用示例
- **[项目结构说明](./PROJECT_STRUCTURE.md)** - 详细的目录和组件说明

## 📁 项目结构

```
src/
├── screens/           # 页面组件
│   └── HomeScreen.tsx # 主页示例（包含表单、列表、卡片等）
├── components/        # 组件目录
│   └── common/       # 通用组件（Button, Input, Card）
├── constants/        # 常量配置
│   └── theme.ts      # 主题配置（颜色、字体、间距）
├── services/         # API 服务层
├── utils/           # 工具函数
├── hooks/           # 自定义 Hooks
├── types/           # TypeScript 类型定义
└── assets/          # 静态资源
```

## 🎨 组件示例

### Button（按钮）
```tsx
import { Button } from './src/components/common';

<Button 
  title="点击我" 
  onPress={() => alert('Hello!')}
  variant="primary"  // primary | secondary | outline | text
  size="medium"      // small | medium | large
/>
```

### Input（输入框）
```tsx
import { Input } from './src/components/common';

<Input
  label="用户名"
  placeholder="请输入用户名"
  value={username}
  onChangeText={setUsername}
/>
```

### Card（卡片）
```tsx
import { Card } from './src/components/common';

<Card>
  <Text>卡片内容</Text>
</Card>
```

---

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
