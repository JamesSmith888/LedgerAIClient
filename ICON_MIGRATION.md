# 图标迁移示例

本文档展示如何将项目中的 Emoji 图标迁移到专业的 Vector Icons。

## 🔄 ProfileScreen 迁移示例

### 迁移前
```tsx
{/* 头像 */}
<View style={styles.avatarContainer}>
  <Text style={styles.avatarEmoji}>👤</Text>
</View>

{/* 编辑按钮 */}
<TouchableOpacity style={styles.editProfileButton}>
  <Text style={styles.editProfileIcon}>✏️</Text>
  <Text>编辑资料</Text>
</TouchableOpacity>

{/* 菜单项 */}
<TouchableOpacity style={styles.menuItem}>
  <Text style={styles.menuIcon}>📖</Text>
  <Text>我的账本</Text>
  <Text style={styles.menuArrow}>›</Text>
</TouchableOpacity>
```

### 迁移后
```tsx
import { Icon, AppIcons, FeatherIcons } from '../components/common';

{/* 头像 */}
<View style={styles.avatarContainer}>
  <Icon name={AppIcons.person} size={40} color={Colors.surface} />
</View>

{/* 编辑按钮 */}
<TouchableOpacity style={styles.editProfileButton}>
  <Icon type="feather" name={FeatherIcons.edit2} size={16} color={Colors.text} />
  <Text>编辑</Text>
</TouchableOpacity>

{/* 菜单项 */}
<TouchableOpacity style={styles.menuItem}>
  <Icon name={AppIcons.bookOutline} size={24} color={Colors.primary} />
  <Text>我的账本</Text>
  <Icon name={AppIcons.chevronForward} size={20} color={Colors.textSecondary} />
</TouchableOpacity>
```

## 📋 常见 Emoji 替换对照表

| Emoji | 替换为 | 说明 |
|-------|--------|------|
| 👤 | `AppIcons.person` / `personOutline` | 用户/个人 |
| 📖 | `AppIcons.book` / `bookOutline` | 账本 |
| 💳 | `AppIcons.card` / `cardOutline` | 支付方式 |
| ⚙️ | `AppIcons.settings` / `settingsOutline` | 设置 |
| ❓ | `AppIcons.helpCircle` | 帮助 |
| ✏️ | `FeatherIcons.edit2` | 编辑 |
| ➕ | `AppIcons.add` / `addCircle` | 添加 |
| ✅ | `AppIcons.checkmarkCircle` | 完成/确认 |
| ❌ | `AppIcons.closeCircle` | 关闭/取消 |
| 🗑️ | `AppIcons.trash` / `trashOutline` | 删除 |
| 🔍 | `AppIcons.search` / `searchOutline` | 搜索 |
| 📊 | `AppIcons.stats` / `statsOutline` | 统计 |
| 📅 | `AppIcons.calendar` / `calendarOutline` | 日历 |
| 🕐 | `AppIcons.time` / `timeOutline` | 时间 |
| 💰 | `AppIcons.cash` / `cashOutline` | 现金 |
| 👥 | `AppIcons.people` / `peopleOutline` | 多人/共享 |
| 🏢 | `AppIcons.business` / `businessOutline` | 企业 |
| 🔗 | `AppIcons.link` / `linkOutline` | 链接 |
| ℹ️ | `AppIcons.informationCircle` | 信息 |
| ⚠️ | `AppIcons.warning` | 警告 |
| ⭐ | `AppIcons.star` / `starOutline` | 收藏 |
| ❤️ | `AppIcons.heart` / `heartOutline` | 喜欢 |
| 📧 | `AppIcons.mail` / `mailOutline` | 邮件 |
| 🔒 | `AppIcons.lock` | 锁定 |
| 🔓 | `AppIcons.unlock` | 解锁 |
| 👁️ | `AppIcons.eye` | 查看 |
| › | `AppIcons.chevronForward` | 前进箭头 |
| ‹ | `AppIcons.chevronBack` | 返回箭头 |
| ← | `AppIcons.arrowBack` | 返回 |

## 🎨 样式调整建议

### 1. 移除 Emoji 相关样式
```tsx
// ❌ 删除这些
menuIcon: {
  fontSize: 20,
  marginRight: Spacing.md,
},
avatarEmoji: {
  fontSize: 40,
},
```

### 2. 调整布局使用 gap
```tsx
// ✅ 使用 gap 替代 marginRight
menuItem: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: Spacing.md,  // 自动处理间距
},
```

### 3. 统一图标尺寸
```tsx
// 大图标（主要内容）
<Icon size={24} />

// 小图标（辅助元素）
<Icon size={20} />

// 按钮图标
<Icon size={16} />

// 标题图标
<Icon size={28} />
```

## 📱 其他页面迁移清单

### BottomTabNavigator
- [ ] 主页图标
- [ ] 列表图标
- [ ] 个人中心图标

### TransactionListScreen
- [ ] 添加交易按钮
- [ ] 筛选图标
- [ ] 分类图标

### LedgerDetailScreen
- [ ] 账本类型图标（个人/共享/企业）
- [ ] 成员图标
- [ ] 设置图标

### AddTransactionScreen
- [ ] 日历图标
- [ ] 分类选择图标
- [ ] 支付方式图标

### LedgerManagementScreen
- [ ] 创建账本图标
- [ ] 账本列表图标
- [ ] 默认账本标记

## ⚡ 快速迁移步骤

1. **添加导入**
```tsx
import { Icon, AppIcons, FeatherIcons } from '../components/common';
```

2. **替换图标**
```tsx
// 找到类似这样的代码
<Text style={styles.icon}>📖</Text>

// 替换为
<Icon name={AppIcons.bookOutline} size={24} color={Colors.primary} />
```

3. **清理样式**
```tsx
// 删除 emoji 相关的样式定义
// 删除 fontSize、marginRight 等
// 改用 gap 布局
```

4. **测试效果**
- 检查图标显示是否正常
- 确认颜色和大小合适
- 测试点击交互

## 🎯 推荐优先迁移的页面

1. **ProfileScreen** ✅ 已完成
2. **BottomTabNavigator** - 导航栏最常见
3. **TransactionListScreen** - 主要功能页面
4. **LedgerDetailScreen** - 账本详情
5. **AddTransactionScreen** - 添加交易

## 💡 提示

- 优先使用 `outline` 版本的图标
- 保持同类型图标的大小一致
- 使用主题色彩系统（`Colors.primary`, `Colors.textSecondary` 等）
- Feather 图标适合需要简洁优雅的场景
- Ionicons 适合大部分 iOS 风格的场景
