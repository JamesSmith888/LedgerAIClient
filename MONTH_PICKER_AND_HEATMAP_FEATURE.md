# 月份选择器与日历热力图功能

## 功能概述

为 TransactionListScreen 添加了两个新功能：

### 1. 月份快速选择器 (MonthPickerSheet)
用户可以点击顶部的月份标题，打开一个优雅的抽屉式选择器，快速跳转到任意月份。

#### 设计特点
- **参考设计**: Google Material Design + Telegram 底部抽屉
- **交互方式**: 
  - 点击月份标题打开选择器
  - 横向滚动选择年份
  - 网格布局选择月份（3列布局）
  - 快速跳转按钮（本月）
- **视觉反馈**:
  - 当前年份标记"今年"徽章
  - 当前月份显示小圆点标识
  - 未来月份灰显不可选
  - 选中状态蓝色高亮

#### 使用方式
```tsx
import { MonthPickerSheet } from '../components/transaction/MonthPickerSheet';

<MonthPickerSheet
  visible={monthPickerVisible}
  selectedDate={selectedMonth}
  onClose={() => setMonthPickerVisible(false)}
  onSelectMonth={(date) => setSelectedMonth(date)}
/>
```

### 2. 日历热力图 (DailyStatisticsCalendar)
在交易列表上方展示当月每日的收支统计热力图，让用户一目了然地了解消费模式。

#### 设计特点
- **可视化方式**: 热力图 + 日历网格
- **热度等级**: 
  - 0级（无数据）: 背景色
  - 1级（< 100元）: 浅蓝紫 15%
  - 2级（< 500元）: 中蓝紫 35%
  - 3级（< 1000元）: 深蓝紫 55%
  - 4级（≥ 1000元）: 超深蓝紫 85%
- **信息展示**:
  - 每个日期显示日期数字和交易笔数
  - 今天用蓝色边框高亮
  - 未来日期灰显
  - 底部展示月度汇总（总收入、总支出、总笔数）
- **交互功能**:
  - 点击日期可触发自定义操作（如滚动到对应交易）
  - 可收起/展开热力图

#### 使用方式
```tsx
import { DailyStatisticsCalendar } from '../components/transaction/DailyStatisticsCalendar';

// 准备统计数据
const dailyStatistics = [
  { date: '2024-11-19', income: 500, expense: 320, count: 5 },
  { date: '2024-11-18', income: 0, expense: 150, count: 2 },
  // ...
];

<DailyStatisticsCalendar
  selectedMonth={selectedMonth}
  statistics={dailyStatistics}
  visible={calendarVisible}
  onDayPress={(date) => console.log('点击日期:', date)}
/>
```

## 数据结构

### DailyStatistic
```typescript
interface DailyStatistic {
  date: string;      // 日期 YYYY-MM-DD
  income: number;    // 当日总收入
  expense: number;   // 当日总支出
  count: number;     // 当日交易笔数
}
```

## 集成到 TransactionListScreen

### 新增状态
```typescript
// 月份选择器
const [monthPickerVisible, setMonthPickerVisible] = useState(false);

// 日历热力图
const [calendarVisible, setCalendarVisible] = useState(true);
```

### 数据计算
```typescript
// 计算每日统计数据
const dailyStatistics = useMemo(() => {
  const statsMap = new Map();
  transactions.forEach(transaction => {
    const dateKey = formatDate(transaction.transactionDateTime);
    // 聚合统计...
  });
  return Array.from(statsMap.entries());
}, [transactions]);
```

### UI 集成
1. **月份标题可点击**: 点击打开 MonthPickerSheet
2. **月份标题添加下拉箭头图标**: 提示可点击
3. **筛选器下方展示热力图**: DailyStatisticsCalendar
4. **切换按钮**: 收起/展开热力图

## 样式规范

### 颜色主题
- 主色调: `Colors.primary` (#6366F1)
- 背景色: `Colors.surface` (#FFFFFF)
- 边框: `Colors.border` (#E2E8F0)
- 文字: `Colors.text` / `Colors.textSecondary`
- 收入色: `Colors.income` (#10B981)
- 支出色: `Colors.expense` (#F43F5E)

### 间距规范
- 统一使用 `Spacing` 常量
- 圆角使用 `BorderRadius` 常量
- 阴影使用 `Shadows` 常量

### 字体规范
- 统一使用 `FontSizes` 常量
- 字重使用 `FontWeights` 常量

## 性能优化

1. **useMemo 缓存**: dailyStatistics 使用 useMemo 避免重复计算
2. **条件渲染**: 热力图可收起，减少渲染压力
3. **日历数据预计算**: 月份切换时才重新计算日历矩阵

## 用户体验亮点

1. **流畅动画**: Modal 使用 slide 动画
2. **手势支持**: 月份选择器保留左右滑动切换
3. **视觉层次**: 热力图颜色渐变清晰表达消费强度
4. **信息密度**: 在有限空间内展示丰富信息
5. **快捷操作**: 一键跳转本月
6. **智能反馈**: 未来日期不可选，当前日期高亮

## 后续优化建议

1. **点击日期跳转**: 实现点击热力图日期后滚动到对应交易
2. **长按查看详情**: 长按日期弹出当日交易摘要
3. **自定义热度阈值**: 根据用户消费水平动态调整热度分级
4. **动画效果**: 添加热力图展开/收起动画
5. **数据预加载**: 提前加载前后月份数据，提升切换体验
6. **分享功能**: 支持分享月度消费热力图截图

## 技术栈

- React Native
- TypeScript
- React Hooks (useState, useMemo, useCallback)
- React Navigation
- Ionicons

## 文件清单

```
src/
├── components/
│   └── transaction/
│       ├── MonthPickerSheet.tsx          # 月份选择器组件
│       └── DailyStatisticsCalendar.tsx   # 日历热力图组件
└── screens/
    └── TransactionListScreen.tsx         # 集成页面
```

## 更新日志

### v1.0.0 (2024-11-19)
- ✨ 新增月份快速选择器
- ✨ 新增日历热力图展示每日收支
- 🎨 优化月份标题交互（可点击）
- 🎨 添加热力图收起/展开功能
- 📝 完善代码注释和文档
