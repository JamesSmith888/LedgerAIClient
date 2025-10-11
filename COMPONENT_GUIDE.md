# 组件速查表 (Component Cheat Sheet)

快速查找和使用项目中的组件。

## 🎨 通用组件

### Button（按钮）

#### 基础用法
```tsx
<Button 
  title="提交" 
  onPress={() => console.log('clicked')} 
/>
```

#### 完整属性
```tsx
<Button 
  title="提交"                    // 按钮文字（必填）
  onPress={handleSubmit}           // 点击事件（必填）
  variant="primary"                // 样式类型: primary | secondary | outline | text
  size="medium"                    // 尺寸: small | medium | large
  disabled={false}                 // 是否禁用
  loading={isLoading}              // 加载状态
  style={customStyle}              // 自定义样式
/>
```

#### 样式示例
```tsx
{/* 主要按钮 - 蓝色背景 */}
<Button title="主要" variant="primary" />

{/* 次要按钮 - 橙色背景 */}
<Button title="次要" variant="secondary" />

{/* 轮廓按钮 - 透明背景，蓝色边框 */}
<Button title="轮廓" variant="outline" />

{/* 文本按钮 - 无背景 */}
<Button title="文本" variant="text" />
```

---

### Input（输入框）

#### 基础用法
```tsx
const [text, setText] = useState('');

<Input 
  value={text}
  onChangeText={setText}
  placeholder="请输入内容"
/>
```

#### 完整属性
```tsx
<Input
  label="邮箱"                     // 标签文字
  placeholder="请输入邮箱"          // 占位符
  value={email}                    // 输入值（必填）
  onChangeText={setEmail}          // 变化回调（必填）
  error={emailError}               // 错误提示
  containerStyle={customStyle}     // 容器样式
  // 支持所有 TextInput 属性
  keyboardType="email-address"     // 键盘类型
  autoCapitalize="none"            // 自动大写
  secureTextEntry={true}           // 密码模式
  multiline={false}                // 多行输入
/>
```

#### 常见场景
```tsx
{/* 用户名输入 */}
<Input
  label="用户名"
  placeholder="请输入用户名"
  value={username}
  onChangeText={setUsername}
/>

{/* 邮箱输入（带验证） */}
<Input
  label="邮箱"
  placeholder="请输入邮箱"
  value={email}
  onChangeText={validateEmail}
  error={emailError}
  keyboardType="email-address"
  autoCapitalize="none"
/>

{/* 密码输入 */}
<Input
  label="密码"
  placeholder="请输入密码"
  value={password}
  onChangeText={setPassword}
  secureTextEntry={true}
/>

{/* 多行文本 */}
<Input
  label="备注"
  placeholder="请输入备注"
  value={note}
  onChangeText={setNote}
  multiline={true}
  numberOfLines={4}
/>
```

---

### Card（卡片）

#### 基础用法
```tsx
<Card>
  <Text>卡片内容</Text>
</Card>
```

#### 完整属性
```tsx
<Card
  variant="default"     // 样式: default | outlined
  style={customStyle}   // 自定义样式
>
  {children}
</Card>
```

#### 使用示例
```tsx
{/* 默认卡片（带阴影） */}
<Card>
  <Text>这是一个默认卡片</Text>
</Card>

{/* 轮廓卡片（无阴影，有边框） */}
<Card variant="outlined">
  <Text>这是一个轮廓卡片</Text>
</Card>

{/* 组合使用 */}
<Card style={{ marginBottom: 16 }}>
  <Text style={{ fontSize: 18, fontWeight: 'bold' }}>标题</Text>
  <Text style={{ marginTop: 8, color: '#666' }}>描述信息</Text>
  <Button title="查看详情" variant="outline" size="small" />
</Card>
```

---

## 🎨 主题常量

### Colors（颜色）

```tsx
import { Colors } from './src/constants/theme';

// 主色调
Colors.primary          // #007AFF - 蓝色
Colors.primaryDark      // #0051D5 - 深蓝色
Colors.primaryLight     // #5AC8FA - 浅蓝色

// 功能色
Colors.secondary        // #FF9500 - 橙色
Colors.success          // #34C759 - 绿色
Colors.warning          // #FF9500 - 警告色
Colors.error            // #FF3B30 - 错误色
Colors.info             // #5AC8FA - 信息色

// 背景色
Colors.background       // #F2F2F7 - 背景色
Colors.surface          // #FFFFFF - 表面色
Colors.card             // #FFFFFF - 卡片色

// 文字色
Colors.text             // #000000 - 主文字
Colors.textSecondary    // #8E8E93 - 次要文字
Colors.textDisabled     // #C7C7CC - 禁用文字

// 边框色
Colors.border           // #C6C6C8 - 边框
Colors.divider          // #E5E5EA - 分隔线
```

### Spacing（间距）

```tsx
import { Spacing } from './src/constants/theme';

Spacing.xs     // 4
Spacing.sm     // 8
Spacing.md     // 16
Spacing.lg     // 24
Spacing.xl     // 32
Spacing.xxl    // 48

// 使用示例
padding: Spacing.md,        // padding: 16
marginBottom: Spacing.lg,   // marginBottom: 24
```

### FontSizes（字体大小）

```tsx
import { FontSizes } from './src/constants/theme';

FontSizes.xs      // 12
FontSizes.sm      // 14
FontSizes.md      // 16
FontSizes.lg      // 18
FontSizes.xl      // 20
FontSizes.xxl     // 24
FontSizes.xxxl    // 32

// 使用示例
fontSize: FontSizes.lg,     // fontSize: 18
```

### FontWeights（字体粗细）

```tsx
import { FontWeights } from './src/constants/theme';

FontWeights.regular     // '400'
FontWeights.medium      // '500'
FontWeights.semibold    // '600'
FontWeights.bold        // '700'

// 使用示例
fontWeight: FontWeights.bold,  // fontWeight: '700'
```

### BorderRadius（圆角）

```tsx
import { BorderRadius } from './src/constants/theme';

BorderRadius.sm      // 4
BorderRadius.md      // 8
BorderRadius.lg      // 12
BorderRadius.xl      // 16
BorderRadius.round   // 999 - 完全圆角

// 使用示例
borderRadius: BorderRadius.md,  // borderRadius: 8
```

### Shadows（阴影）

```tsx
import { Shadows } from './src/constants/theme';

// 小阴影
...Shadows.sm

// 中等阴影
...Shadows.md

// 大阴影
...Shadows.lg

// 使用示例
const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...Shadows.md,  // 添加阴影
  },
});
```

---

## 📝 完整样式示例

### 标准卡片
```tsx
const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
    ...Shadows.md,
  },
});
```

### 标题文字
```tsx
const styles = StyleSheet.create({
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
});
```

### 按钮行
```tsx
const styles = StyleSheet.create({
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  button: {
    flex: 1,
  },
});

// JSX
<View style={styles.buttonRow}>
  <Button title="取消" variant="outline" style={styles.button} />
  <Button title="确认" variant="primary" style={styles.button} />
</View>
```

---

## 🔍 快速搜索

### 需要...
- **显示按钮** → Button 组件
- **输入文字** → Input 组件
- **包装内容** → Card 组件
- **设置颜色** → Colors
- **调整间距** → Spacing
- **修改字体** → FontSizes, FontWeights
- **添加阴影** → Shadows
- **设置圆角** → BorderRadius

### 常见任务
1. **创建表单** → 使用 Input + Button
2. **展示列表** → 使用 FlatList + Card
3. **弹出提示** → 使用 Alert
4. **显示加载** → Button 的 loading 属性

---

**提示**：更多示例请查看 `src/screens/HomeScreen.tsx` 📱
