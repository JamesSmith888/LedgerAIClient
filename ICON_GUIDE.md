# 图标使用指南

本项目已集成 `react-native-vector-icons`，提供了丰富的专业图标库。

## 📦 安装类型定义（可选）

如果遇到 TypeScript 类型错误，可以安装类型定义：

```bash
npm install --save-dev @types/react-native-vector-icons
```

## 🎨 使用方法

### 1. 基础使用

```tsx
import { Icon, AppIcons } from '../components/common';

// 使用预定义的图标名称
<Icon name={AppIcons.home} size={24} color={Colors.primary} />

// 使用自定义图标名称
<Icon name="search-outline" size={20} />
```

### 2. 不同图标库

```tsx
// Ionicons（默认）
<Icon name="home" size={24} />

// Feather 图标（简洁优雅）
<Icon type="feather" name="edit" size={20} />

// Material Icons
<Icon type="material" name="home" size={24} />

// Material Community Icons
<Icon type="material-community" name="account" size={24} />

// Font Awesome 5
<Icon type="font-awesome5" name="user" size={20} />
```

### 3. 使用预定义常量

```tsx
import { Icon, AppIcons, FeatherIcons } from '../components/common';

// Ionicons 预设
<Icon name={AppIcons.bookOutline} />
<Icon name={AppIcons.person} />
<Icon name={AppIcons.settings} />

// Feather 预设
<Icon type="feather" name={FeatherIcons.edit2} />
<Icon type="feather" name={FeatherIcons.trash} />
```

## 📚 常用图标分类

### 导航图标
- `home`, `homeOutline` - 主页
- `list`, `listOutline` - 列表
- `person`, `personOutline` - 个人中心
- `arrowBack`, `chevronBack` - 返回
- `chevronForward` - 前进

### 操作图标
- `add`, `addCircle` - 添加
- `create`, `createOutline` - 编辑
- `trash`, `trashOutline` - 删除
- `checkmark`, `checkmarkCircle` - 确认
- `close`, `closeCircle` - 关闭

### 账本相关
- `book`, `bookOutline` - 账本
- `wallet`, `walletOutline` - 钱包
- `people`, `peopleOutline` - 共享账本
- `business` - 企业账本

### 功能图标
- `settings`, `settingsOutline` - 设置
- `search`, `searchOutline` - 搜索
- `filter`, `filterOutline` - 筛选
- `share`, `shareOutline` - 分享

### 支付相关
- `card`, `cardOutline` - 银行卡
- `cash`, `cashOutline` - 现金

### 统计相关
- `stats`, `statsOutline` - 统计图表
- `trending`, `trendingDown` - 趋势
- `pie`, `pieOutline` - 饼图

### 状态图标
- `eye`, `eyeOff` - 显示/隐藏
- `lock`, `unlock` - 锁定/解锁
- `checkmarkCircle` - 成功
- `alertCircle` - 警告
- `informationCircle` - 信息

## 🎯 最佳实践

### 1. 选择合适的图标库

- **Ionicons**: iOS 风格，适合大部分场景（默认）
- **Feather**: 简洁优雅，适合现代扁平化设计
- **Material Icons**: Material Design 风格
- **Font Awesome**: 功能最全面

### 2. 使用 outline 版本

优先使用 `outline` 版本的图标（如 `homeOutline`），视觉上更轻盈：

```tsx
// ✅ 推荐
<Icon name={AppIcons.homeOutline} />

// ❌ 较重
<Icon name={AppIcons.home} />
```

### 3. 保持图标大小一致

在同一页面/组件中保持图标大小统一：

```tsx
// 主要图标: 24px
<Icon name={AppIcons.home} size={24} />

// 小图标: 20px
<Icon name={AppIcons.chevronForward} size={20} />

// 按钮中的图标: 16-18px
<Icon name={FeatherIcons.edit2} size={16} />
```

### 4. 使用主题颜色

```tsx
import { Colors } from '../constants/theme';

// 主色调
<Icon name={AppIcons.home} color={Colors.primary} />

// 次要文字色
<Icon name={AppIcons.settings} color={Colors.textSecondary} />

// 自定义颜色
<Icon name={AppIcons.trash} color={Colors.error} />
```

## 📖 在线图标库

可以在以下网站查找更多图标：

- **Ionicons**: https://ionic.io/ionicons
- **Feather**: https://feathericons.com
- **Material Icons**: https://fonts.google.com/icons
- **Font Awesome**: https://fontawesome.com/icons

## 🔄 从 Emoji 迁移

### 迁移前（Emoji）
```tsx
<Text style={styles.icon}>📖</Text>
<Text style={styles.icon}>👤</Text>
<Text style={styles.icon}>⚙️</Text>
```

### 迁移后（Vector Icons）
```tsx
<Icon name={AppIcons.bookOutline} size={24} color={Colors.primary} />
<Icon name={AppIcons.personOutline} size={24} color={Colors.primary} />
<Icon name={AppIcons.settingsOutline} size={24} color={Colors.textSecondary} />
```

## 🎨 样式示例

### 菜单项
```tsx
<View style={styles.menuItem}>
  <Icon name={AppIcons.bookOutline} size={24} color={Colors.primary} />
  <Text style={styles.menuText}>我的账本</Text>
  <Icon name={AppIcons.chevronForward} size={20} color={Colors.textSecondary} />
</View>
```

### 按钮
```tsx
<TouchableOpacity style={styles.button}>
  <Icon type="feather" name={FeatherIcons.edit2} size={16} color={Colors.text} />
  <Text style={styles.buttonText}>编辑</Text>
</TouchableOpacity>
```

### 标签页图标
```tsx
<Icon 
  name={focused ? AppIcons.home : AppIcons.homeOutline} 
  size={24} 
  color={focused ? Colors.primary : Colors.textSecondary} 
/>
```

## ⚠️ 注意事项

1. **首次使用需要链接原生模块**（已在 package.json 中配置）
2. **Android 可能需要重新构建**: `cd android && ./gradlew clean`
3. **iOS 可能需要 pod install**: `cd ios && pod install`
4. TypeScript 类型错误可以忽略，或安装 `@types/react-native-vector-icons`
