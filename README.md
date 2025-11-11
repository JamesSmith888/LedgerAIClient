# LedgerAI Client - AI 智能记账 App# LedgerAI Client - AI 智能记账 App# LedgerAI Client



<div align="center">



[![React Native](https://img.shields.io/badge/React%20Native-0.82.0-blue.svg)](https://reactnative.dev/)<div align="center">一个规范的 React Native 项目，包含完整的目录结构和可复用组件示例。

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg)](https://www.typescriptlang.org/)

[![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20Android-green.svg)]()

[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[![React Native](https://img.shields.io/badge/React%20Native-0.82.0-blue.svg)](https://reactnative.dev/)## ✨ 特性

**基于 React Native 的跨平台 AI 智能记账移动应用**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg)](https://www.typescriptlang.org/)

</div>

[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)- 📁 **标准化目录结构** - 符合 React Native 最佳实践

## 🔗 相关项目

[![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20Android-green.svg)]()- 🎨 **统一主题系统** - 颜色、字体、间距统一管理

- **[MCP Client](https://github.com/JamesSmith888/mcp-client)** - AI Agent 对话客户端，智能任务编排

- **[Ledger Server](https://github.com/JamesSmith888/ledger-server)** - 业务后端 & MCP Server，提供记账业务工具[![Status](https://img.shields.io/badge/Status-In%20Development-red.svg)]()- 🧩 **可复用组件** - Button、Input、Card 等通用组件



## 📖 项目简介- 📱 **完整示例页面** - 包含表单、列表、卡片等常用功能



LedgerAI Client 是**AI 驱动的智能记账移动应用**，通过**自然语言对话**完成记账、查询、分析等操作。**基于 React Native 的跨平台 AI 智能记账移动应用**- 📝 **TypeScript 支持** - 类型安全，更好的开发体验



### ✨ 核心特性- 📚 **详细文档** - 适合新手学习



- 🤖 **AI 对话记账**: 通过自然语言与 AI 对话完成记账[English](README_EN.md) | 简体中文

- 💬 **实时智能助手**: WebSocket 实时对话，流式响应

- 📚 **多账本管理**: 个人/共享/商业账本---

- 🏷️ **智能分类**: 预置分类 + 自定义分类

- 📊 **统计分析**: 收支统计、趋势分析</div>

- 🔍 **高级筛选**: 多维度筛选查询

- 🎨 **现代 UI**: 参考 Telegram、Google 设计This is a [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

- 🔐 **安全认证**: JWT Token 认证

## 📖 项目简介

## 🏗️ 技术栈

# Getting Started

- React Native 0.82.0

- TypeScript 5.8.3LedgerAI Client 是一款**创新的 AI 驱动智能记账应用**，将传统记账与人工智能完美结合。用户可以通过**自然语言对话**完成记账、查询、分析等操作，极大简化了记账流程，让理财变得更加轻松和智能。

- React Navigation 7.x (导航)

- react-native-gifted-chat (聊天界面)## 📖 文档

- axios + @stomp/stompjs (HTTP + WebSocket)

- Context API (状态管理)### ✨ 核心特性



## 🚀 核心功能- **[快速入门指南](./GETTING_STARTED.md)** - 新手必读，包含组件使用示例



### 1. AI 智能对话- 🤖 **AI 对话记账**: 通过自然语言与 AI 对话完成记账，无需复杂操作- **[项目结构说明](./PROJECT_STRUCTURE.md)** - 详细的目录和组件说明



通过自然语言与 AI 对话：- 💬 **实时智能助手**: 基于 WebSocket 的实时对话，流式响应体验

- "帮我记一笔午餐支出，50元"

- "今天我花了多少钱？"- 📊 **可视化统计**: 直观的收支统计、趋势分析## 📁 项目结构

- "这个月的支出情况怎么样？"

- 📚 **多账本管理**: 支持个人账本、共享账本、商业账本

基于 WebSocket (STOMP) 实时通信，支持流式响应。

- 🏷️ **智能分类**: 预置分类 + 自定义分类，智能匹配```

### 2. 交易管理

- 🔍 **高级筛选**: 按时间、类型、分类、账本多维度筛选src/

- 创建/查看/编辑/删除交易

- 移动交易到其他账本- 🎨 **现代UI设计**: 参考 Telegram、Google 等优秀应用的设计理念├── screens/           # 页面组件

- 按时间/类型/账本筛选

- 分页加载- 🔐 **安全可靠**: JWT 认证，数据加密传输│   └── HomeScreen.tsx # 主页示例（包含表单、列表、卡片等）



### 3. 账本管理├── components/        # 组件目录



- 个人账本、共享账本、商业账本## 🎬 产品截图│   └── common/       # 通用组件（Button, Input, Card）

- 创建/编辑账本

- 成员管理与权限控制├── constants/        # 常量配置

- 账本切换

> 正在开发中，截图即将更新...│   └── theme.ts      # 主题配置（颜色、字体、间距）

### 4. 分类管理

├── services/         # API 服务层

**预置分类**:

- 支出：餐饮、购物、交通、日用、娱乐、医疗、教育、通讯## 🏗️ 技术架构├── utils/           # 工具函数

- 收入：工资、奖金、理财、兼职

├── hooks/           # 自定义 Hooks

支持创建自定义分类。

### 技术栈├── types/           # TypeScript 类型定义

### 5. 统计分析

└── assets/          # 静态资源

- 总收入/总支出/结余

- 按账本筛选**前端框架**:```

- 时间范围筛选

- 高级查询- React Native 0.82.0



## 🚀 快速开始- TypeScript 5.8.3## 🎨 组件示例



### 前置要求- React 19.1.1



- Node.js >= 20### Button（按钮）

- React Native 开发环境

  - Android: Android Studio + JDK**导航 & 状态管理**:```tsx

  - iOS: Xcode (仅 macOS)

- @react-navigation/native 7.1.18import { Button } from './src/components/common';

### 安装步骤

- @react-navigation/bottom-tabs 7.4.8

1. **克隆项目**

```bash- @react-navigation/stack 7.5.0<Button 

git clone https://github.com/JamesSmith888/LedgerAIClient.git

cd LedgerAIClient- Context API (全局状态)  title="点击我" 

```

  onPress={() => alert('Hello!')}

2. **安装依赖**

```bash**UI 组件**:  variant="primary"  // primary | secondary | outline | text

npm install

- react-native-gifted-chat 2.8.1 (聊天界面)  size="medium"      // small | medium | large

# iOS 依赖 (仅 macOS)

cd ios && pod install && cd ..- react-native-calendars 1.1313.0 (日历选择)/>

```

- react-native-vector-icons 10.3.0 (图标库)```

3. **配置后端地址**

- react-native-toast-message 2.3.3 (消息提示)

编辑 `src/api/config.ts`:

```typescript### Input（输入框）

export const API_BASE_URL = 'http://localhost:8082';

export const WS_URL = 'ws://localhost:8080/ws';**通信 & 数据**:```tsx

```

- axios 1.12.2 (HTTP 请求)import { Input } from './src/components/common';

4. **启动后端服务**

- @stomp/stompjs 7.2.1 (WebSocket 通信)

确保 [Ledger Server](https://github.com/JamesSmith888/ledger-server) 和 [MCP Client](https://github.com/JamesSmith888/mcp-client) 已启动。

- @react-native-async-storage/async-storage 2.2.0 (本地存储)<Input

5. **运行应用**

  label="用户名"

```bash

# Android**开发工具**:  placeholder="请输入用户名"

npm run android

- ESLint (代码规范)  value={username}

# iOS

npm run ios- Jest (单元测试)  onChangeText={setUsername}

```

- Prettier (代码格式化)/>

## 💡 核心代码示例

```

### API 调用

```typescript### 架构设计

const response = await transactionAPI.query({

    ledgerId: filterLedger?.id || null,### Card（卡片）

    type: filterType === 'ALL' ? null : filterType,

    page: 0,``````tsx

    size: 20,

    sortBy: 'transactionDateTime',┌─────────────────────────────────────────────┐import { Card } from './src/components/common';

    sortDirection: 'DESC',

});│           LedgerAI Client (App)             │

```

│  ┌──────────────────────────────────────┐  │<Card>

### WebSocket 聊天

```typescript│  │          Presentation Layer           │  │  <Text>卡片内容</Text>

const { messages, onSend, isConnected } = useGiftedChat(

  WS_URL,│  │  ┌────────────┐  ┌─────────────┐    │  │</Card>

  token,

  user?._id│  │  │  Screens   │  │ Components  │    │  │```

);

```│  │  └────────────┘  └─────────────┘    │  │



### Context 状态管理│  └──────────────────────────────────────┘  │---

```typescript

const { ledgers, currentLedger, setCurrentLedger } = useLedger();│  ┌──────────────────────────────────────┐  │

const { isAuthenticated, user, token, login, logout } = useAuth();

```│  │          Business Layer               │  │> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.



## 📦 项目结构│  │  ┌──────┐  ┌────────┐  ┌─────────┐  │  │



```│  │  │Context│  │ Hooks  │  │Services │  │  │## Step 1: Start Metro

LedgerAIClient/

├── src/│  │  └──────┘  └────────┘  └─────────┘  │  │

│   ├── api/              # API 服务层

│   ├── components/       # 通用组件│  └──────────────────────────────────────┘  │First, you will need to run **Metro**, the JavaScript build tool for React Native.

│   ├── screens/          # 页面组件

│   ├── navigation/       # 导航配置│  ┌──────────────────────────────────────┐  │

│   ├── context/          # 全局状态

│   ├── hooks/            # 自定义 Hooks│  │            Data Layer                 │  │To start the Metro dev server, run the following command from the root of your React Native project:

│   ├── types/            # TypeScript 类型

│   ├── constants/        # 常量配置│  │  ┌──────────┐  ┌──────────────────┐  │  │

│   └── utils/            # 工具函数

├── android/              # Android 项目│  │  │   API    │  │  Local Storage   │  │  │```sh

├── ios/                  # iOS 项目

└── App.tsx               # 应用入口│  │  └──────────┘  └──────────────────┘  │  │# Using npm

```

│  └──────────────────────────────────────┘  │npm start

## 🎨 UI 设计

└─────────────────────────────────────────────┘

- 简洁现代的设计风格

- 卡片式布局         │                        │# OR using Yarn

- 流畅的过渡动画

- 响应式设计         │ REST API              │ WebSocketyarn start



## 📱 支持平台         ▼                        ▼```



- ✅ iOS 13.0+┌──────────────────┐    ┌──────────────────┐

- ✅ Android 5.0+ (API Level 21+)

│  Ledger Server   │    │   MCP Client     │## Step 2: Build and run your app

## 📝 许可证

│  (Business API)  │    │  (AI Assistant)  │

本项目采用 MIT 许可证。

└──────────────────┘    └──────────────────┘With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

## 🤝 贡献

```

欢迎提交 Issue 和 Pull Request！

### Android

---

## 🚀 核心功能

⭐ 如果这个项目对你有帮助，请给它一个星标！

```sh

**享受智能记账，让理财更简单！** 💰📊🚀

### 1. AI 智能对话 💬# Using npm

npm run android

**亮点功能**: 通过自然语言与 AI 对话完成各种操作

# OR using Yarn

<details>yarn android

<summary>点击查看功能详情</summary>```



**支持的对话类型**:### iOS

- 📝 记账: "帮我记一笔午餐支出，50元"

- 📊 查询: "今天我花了多少钱？"For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

- 📈 分析: "这个月的支出情况怎么样？"

- 🔍 统计: "餐饮类的支出有多少？"The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

- 📚 账本: "创建一个新的旅游账本"

```sh

**技术实现**:bundle install

- WebSocket (STOMP) 实时通信```

- 流式响应，逐字展示 AI 回复

- 会话上下文记忆Then, and every time you update your native dependencies, run:

- 自动重连机制

```sh

**代码示例**:bundle exec pod install

```typescript```

const { messages, onSend, isConnected } = useGiftedChat(

  WS_URL,For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

  token,

  userId```sh

);# Using npm

```npm run ios



</details># OR using Yarn

yarn ios

### 2. 交易管理 💰```



**核心功能**: 完整的交易记录管理系统If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.



<details>This is one way to run your app — you can also build it directly from Android Studio or Xcode.

<summary>点击查看功能详情</summary>

## Step 3: Modify your app

**主要特性**:

- ✅ 创建收支记录Now that you have successfully run the app, let's make changes!

- ✅ 查看交易详情

- ✅ 编辑/删除交易Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

- ✅ 移动到其他账本

- ✅ 按时间/类型/账本筛选When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- ✅ 分页加载，性能优化

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).

**交易列表**:- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

- 卡片式设计

- 显示分类图标、金额、时间## Congratulations! :tada:

- 账本标签（多账本场景）

- 长按快速移动账本You've successfully run and modified your React Native App. :partying_face:

- 点击查看详情

### Now what?

**交易详情弹窗**:

- 完整信息展示- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).

- 编辑/删除操作- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

- 流畅的底部抽屉动画

# Troubleshooting

</details>

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

### 3. 账本管理 📚

# Learn More

**核心功能**: 支持多账本并行管理

To learn more about React Native, take a look at the following resources:

<details>

<summary>点击查看功能详情</summary>- [React Native Website](https://reactnative.dev) - learn more about React Native.

- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.

**账本类型**:- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.

- 📖 **个人账本**: 个人私有记账- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.

- 👨‍👩‍👧‍👦 **共享账本**: 家庭、室友共同记账- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.

- 🏢 **商业账本**: 企业、团队财务管理

**功能列表**:
- 创建/编辑账本
- 账本详情查看
- 成员管理（共享账本）
- 权限控制
- 账本切换
- 统计数据

**账本选择器**:
- 顶部下拉式选择器
- 超链接风格，简洁优雅
- 支持"所有账本"视图

</details>

### 4. 分类管理 🏷️

<details>
<summary>点击查看功能详情</summary>

**预置分类**:

支出类:
- 🍜 餐饮 | 🛍️ 购物 | 🚗 交通 | 🏠 日用
- 🎮 娱乐 | 💊 医疗 | 📚 教育 | 📱 通讯

收入类:
- 💰 工资 | 🎁 奖金 | 📈 理财 | 💼 兼职

**自定义分类**:
- 创建自定义分类
- 选择图标和颜色
- 分类管理

</details>

### 5. 统计分析 📊

<details>
<summary>点击查看功能详情</summary>

**统计卡片**:
- 总收入
- 总支出
- 结余

**筛选维度**:
- 全部 / 支出 / 收入
- 按账本筛选
- 按时间范围筛选

**高级查询**:
- 分页加载
- 自定义排序
- 多条件组合

</details>

### 6. 用户系统 👤

<details>
<summary>点击查看功能详情</summary>

- 用户注册/登录
- JWT Token 认证
- 自动登录
- 个人信息管理
- 安全退出

</details>

## 📦 项目结构

```
LedgerAIClient/
├── src/
│   ├── api/                          # API 服务层
│   │   ├── config.ts                 # Axios 配置
│   │   ├── services/                 # API 服务
│   │   │   ├── index.ts              # 导出所有服务
│   │   │   ├── transactionAPI.ts     # 交易 API ⭐
│   │   │   ├── ledgerAPI.ts          # 账本 API
│   │   │   ├── categoryAPI.ts        # 分类 API
│   │   │   └── ledgerMemberAPI.ts    # 成员 API
│   │   └── types/                    # API 类型定义
│   ├── components/                   # 通用组件
│   │   ├── common/                   # 基础组件
│   │   │   ├── Card.tsx              # 卡片组件
│   │   │   ├── LedgerSelector.tsx    # 账本选择器 ⭐
│   │   │   └── ...
│   │   ├── transaction/              # 交易相关组件
│   │   │   ├── TransactionDetailSheet.tsx    # 详情弹窗 ⭐
│   │   │   ├── TransactionMoveSheet.tsx      # 移动弹窗
│   │   │   └── ...
│   │   └── ledger/                   # 账本相关组件
│   ├── screens/                      # 页面组件
│   │   ├── TransactionListScreen.tsx # 交易列表页 ⭐
│   │   ├── GiftedChatScreen.tsx      # AI 聊天页 ⭐
│   │   ├── AddTransactionScreen.tsx  # 记账页
│   │   ├── LedgerManagementScreen.tsx# 账本管理页
│   │   ├── LoginScreen.tsx           # 登录页
│   │   └── ...
│   ├── navigation/                   # 导航配置
│   │   └── BottomTabNavigator.tsx    # 底部导航
│   ├── context/                      # 全局状态
│   │   ├── AuthContext.tsx           # 认证状态 ⭐
│   │   ├── LedgerContext.tsx         # 账本状态
│   │   └── CategoryContext.tsx       # 分类状态
│   ├── hooks/                        # 自定义 Hooks
│   │   ├── useGiftedChat.ts          # 聊天 Hook ⭐
│   │   └── ...
│   ├── services/                     # 业务服务
│   │   └── websocket.ts              # WebSocket 服务
│   ├── types/                        # TypeScript 类型
│   │   ├── transaction.ts            # 交易类型 ⭐
│   │   ├── ledger.ts                 # 账本类型
│   │   └── ...
│   ├── constants/                    # 常量配置
│   │   └── theme.ts                  # 主题配置
│   └── utils/                        # 工具函数
│       └── toast.ts                  # Toast 提示
├── android/                          # Android 项目
├── ios/                              # iOS 项目
├── App.tsx                           # 应用入口 ⭐
├── package.json                      # 依赖配置
└── tsconfig.json                     # TS 配置
```

## 🚀 快速开始

### 前置要求

- Node.js >= 20
- npm 或 yarn
- React Native 开发环境
  - Android: Android Studio + JDK
  - iOS: Xcode (仅 macOS)

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd LedgerAIClient
```

2. **安装依赖**
```bash
npm install
# 或
yarn install
```

3. **iOS 依赖 (仅 macOS)**
```bash
cd ios && pod install && cd ..
```

4. **配置后端地址**

编辑 `src/api/config.ts`:

```typescript
// 开发环境
export const API_BASE_URL = 'http://localhost:8082';
export const WS_URL = 'ws://localhost:8080/ws';

// 生产环境
// export const API_BASE_URL = 'https://your-api.com';
```

5. **启动 Metro**
```bash
npm start
```

6. **运行应用**

Android:
```bash
npm run android
```

iOS:
```bash
npm run ios
```

## 🎨 UI 设计理念

### 设计风格

- **简洁现代**: 借鉴 Telegram、Google 等优秀应用的设计语言
- **卡片式布局**: 清晰的信息层级
- **流畅动画**: 自然的过渡动画
- **响应式设计**: 适配不同屏幕尺寸

### 主题配置

```typescript
// src/constants/theme.ts
export const Colors = {
  primary: '#007AFF',
  background: '#F2F2F7',
  surface: '#FFFFFF',
  text: '#000000',
  expense: '#FF3B30',
  income: '#34C759',
  // ...
};
```

### 组件风格

**卡片组件**:
- 白色背景
- 圆角阴影
- 适当间距

**账本选择器**:
- 超链接风格
- 下拉箭头
- 点击展开选项

**交易列表**:
- 卡片式项目
- 分类图标
- 账本标签
- 时间显示

## 💡 核心代码示例

### 1. API 调用

```typescript
// 查询交易列表（支持分页和筛选）
const response = await transactionAPI.query({
    ledgerId: filterLedger?.id || null,
    type: filterType === 'ALL' ? null : filterType,
    page: 0,
    size: 20,
    sortBy: 'transactionDateTime',
    sortDirection: 'DESC',
});
```

### 2. WebSocket 聊天

```typescript
const { messages, onSend, isConnected } = useGiftedChat(
  WS_URL,
  token,
  user?._id
);

// 发送消息
onSend([{
  text: '今天花了多少钱？',
  user: currentUser,
}]);
```

### 3. Context 状态管理

```typescript
// 使用账本上下文
const { ledgers, currentLedger, setCurrentLedger } = useLedger();

// 使用认证上下文
const { isAuthenticated, user, token, login, logout } = useAuth();
```

### 4. 交易详情弹窗

```typescript
<TransactionDetailSheet
  visible={detailSheetVisible}
  transaction={selectedTransaction}
  category={category}
  ledger={ledger}
  onClose={handleCloseDetailSheet}
  onEdit={handleEditTransaction}
  onDelete={handleDeleteTransaction}
/>
```

## 🔧 开发指南

### 添加新页面

1. 在 `src/screens/` 创建新页面组件
2. 在 `App.tsx` 或导航配置中注册路由
3. 添加到底部导航（如需要）

### 添加新 API

1. 在 `src/api/services/` 创建新服务文件
2. 定义接口类型
3. 实现 API 调用方法
4. 在 `index.ts` 中导出

### 自定义主题

编辑 `src/constants/theme.ts` 修改颜色、字体、间距等

### 调试

```bash
# 打开开发者菜单
# Android: Cmd/Ctrl + M
# iOS: Cmd + D

# 查看日志
npm run log-android
npm run log-ios
```

## 📱 支持平台

- ✅ iOS 13.0+
- ✅ Android 5.0+ (API Level 21+)

## 🐛 常见问题

<details>
<summary>WebSocket 连接失败</summary>

- 检查后端服务是否启动
- 确认 WS_URL 配置正确
- 检查网络权限配置
</details>

<details>
<summary>图标不显示</summary>

```bash
# 重新链接资源
npx react-native-asset
```
</details>

<details>
<summary>构建失败</summary>

```bash
# 清理缓存
npm start -- --reset-cache

# Android
cd android && ./gradlew clean && cd ..

# iOS
cd ios && pod install && cd ..
```
</details>

## 🚧 开发路线图

- [ ] 数据可视化图表
- [ ] 预算管理功能
- [ ] 账单提醒
- [ ] 数据导出功能
- [ ] 深色模式
- [ ] 多语言支持
- [ ] 生物识别认证
- [ ] 离线模式

## 🧪 测试

```bash
# 运行单元测试
npm test

# 运行特定测试
npm test -- TransactionListScreen
```

## 📝 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 贡献流程

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📧 联系方式

- 作者: James Smith
- Email: your.email@example.com
- GitHub: [@your-username](https://github.com/your-username)

## 🙏 致谢

- React Native 团队
- Spring AI 团队
- 所有开源贡献者

---

⭐ 如果这个项目对你有帮助，请给它一个星标！

**享受智能记账，让理财更简单！** 💰📊🚀
