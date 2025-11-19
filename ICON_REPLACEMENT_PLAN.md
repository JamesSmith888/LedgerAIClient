# 分类图标替换方案

## 📌 目标
将分类的 Emoji 图标替换为 react-native-vector-icons 的图标组件

## 🎯 方案选择

### 推荐方案：存储图标名称字符串

**存储格式**：`iconType:iconName`
- 例如：`"ionicons:restaurant"` (餐饮)
- 例如：`"material-community:cart"` (购物)

## 📝 实施步骤

### 第一步：定义图标映射关系

#### 支出分类图标映射
| 分类名 | 原 Emoji | 新图标 | 图标库 | 图标名称 |
|--------|----------|--------|--------|----------|
| 餐饮   | 🍜      | 🍽️      | ionicons | restaurant |
| 购物   | 🛍️      | 🛒      | material-community | cart |
| 交通   | 🚗      | 🚗      | ionicons | car |
| 日用   | 🏠      | 🏠      | ionicons | home |
| 娱乐   | 🎮      | 🎮      | ionicons | game-controller |
| 医疗   | 💊      | 💊      | ionicons | medical |
| 教育   | 📚      | 📚      | ionicons | book |
| 通讯   | 📱      | 📱      | ionicons | phone-portrait |

#### 收入分类图标映射
| 分类名 | 原 Emoji | 新图标 | 图标库 | 图标名称 |
|--------|----------|--------|--------|----------|
| 工资   | 💰      | 💰      | ionicons | wallet |
| 奖金   | 🎁      | 🎁      | ionicons | gift |
| 理财   | 📈      | 📈      | ionicons | trending-up |
| 兼职   | 💼      | 💼      | ionicons | briefcase |

### 第二步：修改后端 CategoryService.java

```java
/**
 * 创建系统预设的支出分类
 */
private void createSystemExpenseCategories() {
    String[][] expenseCategories = {
        {"餐饮", "ionicons:restaurant", "#FF9500"},
        {"购物", "material-community:cart", "#FF2D55"},
        {"交通", "ionicons:car", "#5AC8FA"},
        {"日用", "ionicons:home", "#34C759"},
        {"娱乐", "ionicons:game-controller", "#AF52DE"},
        {"医疗", "ionicons:medical", "#FF3B30"},
        {"教育", "ionicons:book", "#007AFF"},
        {"通讯", "ionicons:phone-portrait", "#5AC8FA"}
    };
    // ... 保持原有逻辑
}

/**
 * 创建系统预设的收入分类
 */
private void createSystemIncomeCategories() {
    String[][] incomeCategories = {
        {"工资", "ionicons:wallet", "#34C759"},
        {"奖金", "ionicons:gift", "#FF9500"},
        {"理财", "ionicons:trending-up", "#FFD60A"},
        {"兼职", "ionicons:briefcase", "#00C7BE"}
    };
    // ... 保持原有逻辑
}
```

### 第三步：创建前端图标解析组件

```tsx
// src/components/common/CategoryIcon.tsx
import React from 'react';
import { Icon, IconType } from './Icon';
import { Colors } from '../../constants/theme';

interface CategoryIconProps {
  icon: string; // 格式: "ionicons:restaurant" 或 "🍜" (兼容emoji)
  size?: number;
  color?: string;
  style?: any;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  icon,
  size = 24,
  color = Colors.text,
  style,
}) => {
  // 解析图标字符串
  const parseIcon = (iconString: string) => {
    if (iconString.includes(':')) {
      const [iconType, iconName] = iconString.split(':');
      return { type: iconType as IconType, name: iconName };
    }
    // 兼容旧的 emoji 格式
    return null;
  };

  const parsedIcon = parseIcon(icon);

  if (parsedIcon) {
    // 使用新的图标组件
    return (
      <Icon
        type={parsedIcon.type}
        name={parsedIcon.name}
        size={size}
        color={color}
        style={style}
      />
    );
  }

  // 兼容旧的 emoji 显示
  return (
    <Text style={[{ fontSize: size }, style]}>{icon}</Text>
  );
};
```

### 第四步：替换前端使用的地方

需要修改以下文件：

1. **CategoryPicker.tsx** (2处)
   - 第 61 行：`<Text style={styles.icon}>{item.icon}</Text>`
   - 第 114 行：`{category.icon} {category.name}`

2. **AddTransactionScreen.tsx** (1处)
   - 第 518 行：`<Text style={styles.detailIcon}>{selectedCategory.icon}</Text>`

3. **TransactionListScreen.tsx** (多处)
   - 分类图标显示

4. **CategorySelector.tsx** (1处)
   - 第 43 行

5. **TransactionDetailSheet.tsx** (1处)
   - 第 126 行

### 第五步：数据库迁移（可选）

如果需要迁移现有数据：

```sql
-- 更新支出分类图标
UPDATE category SET icon = 'ionicons:restaurant' WHERE name = '餐饮' AND is_system = true;
UPDATE category SET icon = 'material-community:cart' WHERE name = '购物' AND is_system = true;
UPDATE category SET icon = 'ionicons:car' WHERE name = '交通' AND is_system = true;
UPDATE category SET icon = 'ionicons:home' WHERE name = '日用' AND is_system = true;
UPDATE category SET icon = 'ionicons:game-controller' WHERE name = '娱乐' AND is_system = true;
UPDATE category SET icon = 'ionicons:medical' WHERE name = '医疗' AND is_system = true;
UPDATE category SET icon = 'ionicons:book' WHERE name = '教育' AND is_system = true;
UPDATE category SET icon = 'ionicons:phone-portrait' WHERE name = '通讯' AND is_system = true;

-- 更新收入分类图标
UPDATE category SET icon = 'ionicons:wallet' WHERE name = '工资' AND is_system = true;
UPDATE category SET icon = 'ionicons:gift' WHERE name = '奖金' AND is_system = true;
UPDATE category SET icon = 'ionicons:trending-up' WHERE name = '理财' AND is_system = true;
UPDATE category SET icon = 'ionicons:briefcase' WHERE name = '兼职' AND is_system = true;
```

## 🎨 备选图标方案

### 方案A：全部使用 Ionicons（更统一）
```
餐饮: restaurant-outline
购物: cart-outline
交通: car-outline
日用: home-outline
娱乐: game-controller-outline
医疗: medical-outline
教育: book-outline
通讯: phone-portrait-outline
工资: wallet-outline
奖金: gift-outline
理财: trending-up-outline
兼职: briefcase-outline
```

### 方案B：使用 Material Community Icons（图标更丰富）
```
餐饮: food
购物: shopping
交通: car
日用: home
娱乐: gamepad-variant
医疗: hospital-box
教育: book-open-variant
通讯: cellphone
工资: wallet
奖金: gift
理财: chart-line
兼职: briefcase
```

## ✅ 实施建议

1. **先创建 CategoryIcon 组件**（向后兼容）
2. **前端先替换使用**（测试显示效果）
3. **后端修改初始化代码**
4. **清理数据库重新初始化**（或运行迁移脚本）

## 🚀 优势

- ✅ 图标统一、专业
- ✅ 支持自定义颜色
- ✅ 矢量图标，清晰度高
- ✅ 向后兼容 emoji
- ✅ 易于扩展新图标

## ⚠️ 注意事项

1. 确保所有图标名称在对应的图标库中存在
2. 保持前后端图标格式一致
3. 考虑用户自定义分类的兼容性
4. 测试不同屏幕尺寸下的显示效果
