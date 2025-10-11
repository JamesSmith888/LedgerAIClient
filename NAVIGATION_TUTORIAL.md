# 底部导航栏实战教程 📱

## 🎯 目标

创建一个包含 3-4 个标签的底部导航栏，就像微信、支付宝那样。

## 📋 准备工作

### 第一步：安装依赖包

打开终端，在项目根目录运行以下命令：

```bash
# 1. 安装 React Navigation 核心库
npm install @react-navigation/native

# 2. 安装必要的依赖
npm install react-native-screens react-native-safe-area-context

# 3. 安装底部标签导航
npm install @react-navigation/bottom-tabs

# 4. 安装图标库（可选，但强烈推荐）
npm install react-native-vector-icons
```

### iOS 额外步骤（如果你要运行 iOS）

```bash
cd ios
bundle exec pod install
cd ..
```

---

## 🏗️ 第二步：创建多个页面

我们需要创建几个页面供导航使用。按照以下步骤操作：

### 2.1 创建「发现」页面

**文件位置**：`src/screens/DiscoverScreen.tsx`

```tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../components/common';
import { Colors, Spacing, FontSizes, FontWeights } from '../constants/theme';

export const DiscoverScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>发现</Text>
        
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>🎯 推荐内容</Text>
          <Text style={styles.cardText}>这里可以展示推荐的内容</Text>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>📰 最新动态</Text>
          <Text style={styles.cardText}>这里可以展示最新的动态信息</Text>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>🔥 热门话题</Text>
          <Text style={styles.cardText}>这里可以展示热门话题</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  title: {
    fontSize: FontSizes.xxxl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  card: {
    margin: Spacing.md,
    marginTop: 0,
  },
  cardTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  cardText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
});
```

### 2.2 创建「消息」页面

**文件位置**：`src/screens/MessagesScreen.tsx`

```tsx
import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../components/common';
import { Colors, Spacing, FontSizes, FontWeights } from '../constants/theme';

// 模拟消息数据
const messages = [
  { id: '1', name: '张三', message: '明天一起去吃饭吧', time: '10:30' },
  { id: '2', name: '李四', message: '项目进度怎么样了？', time: '昨天' },
  { id: '3', name: '王五', message: '收到，马上处理', time: '星期一' },
];

export const MessagesScreen: React.FC = () => {
  const renderMessage = ({ item }: any) => (
    <Card style={styles.messageCard}>
      <View style={styles.messageHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name[0]}</Text>
        </View>
        <View style={styles.messageContent}>
          <View style={styles.messageTop}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.time}>{item.time}</Text>
          </View>
          <Text style={styles.messageText} numberOfLines={1}>
            {item.message}
          </Text>
        </View>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.title}>消息</Text>
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  title: {
    fontSize: FontSizes.xxxl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  list: {
    paddingHorizontal: Spacing.md,
  },
  messageCard: {
    marginBottom: Spacing.sm,
    padding: Spacing.md,
  },
  messageHeader: {
    flexDirection: 'row',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.surface,
  },
  messageContent: {
    flex: 1,
  },
  messageTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  name: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
  },
  time: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  messageText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
});
```

### 2.3 创建「我的」页面

**文件位置**：`src/screens/ProfileScreen.tsx`

```tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../components/common';
import { Colors, Spacing, FontSizes, FontWeights } from '../constants/theme';

export const ProfileScreen: React.FC = () => {
  const MenuItem = ({ icon, title }: { icon: string; title: string }) => (
    <TouchableOpacity style={styles.menuItem}>
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={styles.menuTitle}>{title}</Text>
      <Text style={styles.menuArrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container}>
        {/* 用户信息卡片 */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>我</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.name}>用户名</Text>
              <Text style={styles.bio}>这是一段个人简介</Text>
            </View>
          </View>
        </Card>

        {/* 菜单列表 */}
        <Card style={styles.menuCard}>
          <MenuItem icon="⚙️" title="设置" />
          <View style={styles.divider} />
          <MenuItem icon="🔔" title="通知" />
          <View style={styles.divider} />
          <MenuItem icon="❤️" title="我的收藏" />
        </Card>

        <Card style={styles.menuCard}>
          <MenuItem icon="📊" title="数据统计" />
          <View style={styles.divider} />
          <MenuItem icon="💡" title="帮助与反馈" />
          <View style={styles.divider} />
          <MenuItem icon="ℹ️" title="关于" />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  profileCard: {
    margin: Spacing.md,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.surface,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  bio: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  menuCard: {
    margin: Spacing.md,
    marginTop: 0,
    padding: 0,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  menuIcon: {
    fontSize: FontSizes.xl,
    marginRight: Spacing.md,
  },
  menuTitle: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  menuArrow: {
    fontSize: FontSizes.xxl,
    color: Colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: Spacing.md + Spacing.xl + Spacing.md,
  },
});
```

### 2.4 更新页面导出文件

**文件位置**：`src/screens/index.ts`

```tsx
export { HomeScreen } from './HomeScreen';
export { DiscoverScreen } from './DiscoverScreen';
export { MessagesScreen } from './MessagesScreen';
export { ProfileScreen } from './ProfileScreen';
```

---

## 🧭 第三步：配置导航

### 3.1 创建导航配置文件

**文件位置**：`src/navigation/BottomTabNavigator.tsx`

```tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { 
  HomeScreen, 
  DiscoverScreen, 
  MessagesScreen, 
  ProfileScreen 
} from '../screens';
import { Colors } from '../constants/theme';

const Tab = createBottomTabNavigator();

export const BottomTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false, // 隐藏顶部导航栏
        tabBarActiveTintColor: Colors.primary, // 选中时的颜色
        tabBarInactiveTintColor: Colors.textSecondary, // 未选中时的颜色
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.divider,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarLabel: '首页',
          tabBarIcon: ({ color, size }) => (
            <TabIcon icon="🏠" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen 
        name="Discover" 
        component={DiscoverScreen}
        options={{
          tabBarLabel: '发现',
          tabBarIcon: ({ color, size }) => (
            <TabIcon icon="🔍" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen 
        name="Messages" 
        component={MessagesScreen}
        options={{
          tabBarLabel: '消息',
          tabBarIcon: ({ color, size }) => (
            <TabIcon icon="💬" color={color} size={size} />
          ),
          tabBarBadge: 3, // 显示未读消息数量
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarLabel: '我的',
          tabBarIcon: ({ color, size }) => (
            <TabIcon icon="👤" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// 简单的图标组件（使用 Emoji）
const TabIcon = ({ icon, color, size }: { icon: string; color: string; size: number }) => {
  return <Text style={{ fontSize: size, color }}>{icon}</Text>;
};

// 如果你安装了 react-native-vector-icons，可以这样使用：
/*
import Icon from 'react-native-vector-icons/Ionicons';

const TabIcon = ({ name, color, size }: { name: string; color: string; size: number }) => {
  return <Icon name={name} size={size} color={color} />;
};

// 然后在 tabBarIcon 中使用：
tabBarIcon: ({ color, size }) => (
  <TabIcon name="home" color={color} size={size} />
),
*/
```

需要在文件顶部添加 Text 的导入：

```tsx
import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
// ... 其他导入
```

### 3.2 创建导航导出文件

**文件位置**：`src/navigation/index.ts`

```tsx
export { BottomTabNavigator } from './BottomTabNavigator';
```

---

## 🎨 第四步：更新 App.tsx

**文件位置**：`App.tsx`

```tsx
import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { BottomTabNavigator } from './src/navigation';

function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar barStyle="dark-content" backgroundColor="#F2F2F7" />
        <BottomTabNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
```

---

## 🚀 第五步：运行项目

在终端运行：

```bash
# 清理缓存（可选，但推荐）
npm start -- --reset-cache

# 在另一个终端运行
npm run android
# 或
npm run ios
```

---

## 🎓 学习要点

### 1. **理解导航结构**
- `NavigationContainer` 是整个导航的容器
- `Tab.Navigator` 是底部标签导航容器
- `Tab.Screen` 定义每个标签页

### 2. **自定义样式**
- `screenOptions` 可以全局配置所有标签页
- `options` 可以单独配置每个标签页
- 颜色、字体、图标都可以自定义

### 3. **图标的使用**
- 目前使用 Emoji 作为图标（简单但功能有限）
- 推荐使用 `react-native-vector-icons` 获得更多图标选择

### 4. **页面组件**
- 每个页面都是独立的组件
- 使用 `SafeAreaView` 避免刘海屏遮挡
- 保持代码结构清晰

---

## 💪 练习任务

完成以上步骤后，尝试以下挑战：

### 初级练习
1. ✅ 修改标签页的文字和图标
2. ✅ 调整底部导航栏的颜色
3. ✅ 在某个页面添加新的内容

### 中级练习
1. ✅ 添加第 5 个标签页
2. ✅ 使用 `react-native-vector-icons` 替换 Emoji 图标
3. ✅ 为不同页面设置不同的状态栏颜色

### 高级练习
1. ✅ 实现页面间的参数传递
2. ✅ 添加堆栈导航（Stack Navigator）
3. ✅ 实现自定义的底部导航栏样式

---

## 📚 扩展学习

### 使用 Vector Icons（推荐）

1. **安装图标库**
```bash
npm install react-native-vector-icons
```

2. **Android 配置**
编辑 `android/app/build.gradle`，添加：
```gradle
apply from: file("../../node_modules/react-native-vector-icons/fonts.gradle")
```

3. **iOS 配置**
编辑 `ios/LedgerAIClient/Info.plist`，添加字体：
```xml
<key>UIAppFonts</key>
<array>
  <string>Ionicons.ttf</string>
</array>
```

4. **使用示例**
```tsx
import Icon from 'react-native-vector-icons/Ionicons';

<Icon name="home" size={24} color="#007AFF" />
```

可用的图标名称：[https://oblador.github.io/react-native-vector-icons/](https://oblador.github.io/react-native-vector-icons/)

---

## ❓ 常见问题

### Q1: 底部导航栏显示不出来？
A: 检查是否正确包裹了 `NavigationContainer`

### Q2: 图标不显示？
A: 确保已经导入 `Text` 组件，或正确安装了 vector icons

### Q3: 页面切换没有动画？
A: 这是正常的，底部导航默认是淡入淡出效果

### Q4: 想要顶部导航栏怎么办？
A: 可以在 `screenOptions` 中设置 `headerShown: true`

---

## 🎉 完成检查清单

- [ ] 安装了所有必要的依赖
- [ ] 创建了 3-4 个页面
- [ ] 配置了底部导航
- [ ] 更新了 App.tsx
- [ ] 成功运行了应用
- [ ] 可以在不同标签页间切换
- [ ] 理解了导航的基本概念

完成后，你就掌握了 React Native 导航的基础！🚀

---

**下一步学习建议**：
1. 堆栈导航（Stack Navigator）- 实现页面跳转
2. 状态管理（Context API 或 Redux）
3. 数据持久化（AsyncStorage）
4. 网络请求和 API 集成
