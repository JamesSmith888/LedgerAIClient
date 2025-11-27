# Android 键盘遮挡输入框问题 - 修复说明

## 问题描述
在 Android 手机上,当输入法弹出时,输入框会被键盘遮挡,无法正常输入。

## 解决方案

### 1. 使用 `KeyboardAvoidingView` 包裹内容区域

在 `AgentScreen.tsx` 中:
```tsx
<KeyboardAvoidingView
  style={styles.keyboardAvoidingView}
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  keyboardVerticalOffset={0}
>
  {/* 头部、消息列表、输入框 */}
</KeyboardAvoidingView>
```

**关键配置**:
- iOS: `behavior='padding'` - 在键盘上方添加 padding
- Android: `behavior='height'` - 调整视图高度
- `keyboardVerticalOffset={0}` - 不需要额外偏移

### 2. 移除子组件中重复的 `KeyboardAvoidingView`

在 `InputBar.tsx` 中移除了重复的 `KeyboardAvoidingView`,避免冲突。

### 3. AndroidManifest.xml 配置

确认 `android:windowSoftInputMode="adjustResize"` 已配置:
```xml
<activity
  android:name=".MainActivity"
  android:windowSoftInputMode="adjustResize"
  ...>
```

**重要**: 如果使用 `adjustResize` 无效,可以尝试:
- `adjustPan` - 平移整个窗口
- `adjustNothing` - 不调整(不推荐)

## 工作原理

### iOS
1. 键盘弹出时,`KeyboardAvoidingView` 检测到键盘高度
2. 使用 `padding` 模式在底部添加相应高度的内边距
3. 输入框自动上移到键盘上方

### Android
1. `adjustResize` 让系统自动调整窗口大小
2. `KeyboardAvoidingView` 使用 `height` 模式调整视图高度
3. 配合布局 flex 属性,输入框保持在可见区域

## 布局结构

```
SafeAreaView (flex: 1)
└── KeyboardAvoidingView (flex: 1) ← 关键!
    ├── Header (固定高度)
    ├── QuickActions (可选显示)
    ├── MessagesContainer (flex: 1) ← 自动填充剩余空间
    │   └── MessageList
    └── InputBar (固定高度) ← 始终在底部
```

**关键点**:
- `KeyboardAvoidingView` 必须有 `flex: 1`
- `MessagesContainer` 有 `flex: 1` 可以被压缩
- 头部和输入框高度固定

## 测试步骤

### 在 Android 设备上测试:

1. **基本测试**
   - 打开 Agent 聊天界面
   - 点击输入框
   - ✅ 键盘弹出,输入框应该上移到键盘上方
   - ✅ 输入框完全可见,不被遮挡

2. **多行输入测试**
   - 输入长文本,让输入框自动扩展
   - ✅ 输入框扩展时仍保持在键盘上方
   - ✅ 最大高度限制(120px)生效

3. **消息列表测试**
   - 在有很多消息的情况下打开键盘
   - ✅ 消息列表应该被压缩,但仍可滚动
   - ✅ 快捷操作栏(如果显示)应该被隐藏或上移

4. **键盘收起测试**
   - 点击空白区域或发送消息
   - ✅ 键盘收起后,布局恢复正常
   - ✅ 没有空白区域或布局错位

### 在 iOS 设备上测试:

1. **基本功能**
   - 所有 Android 测试项目
   - ✅ iOS 键盘弹出动画流畅
   - ✅ SafeArea 适配正确(刘海屏)

2. **横屏测试**
   - 旋转设备到横屏
   - ✅ 键盘弹出时布局仍正确

## 常见问题排查

### Q1: 输入框还是被遮挡
**解决方案**:
1. 检查 `KeyboardAvoidingView` 是否有 `flex: 1`
2. 检查 `AndroidManifest.xml` 中的 `windowSoftInputMode`
3. 尝试修改 `behavior` 属性:
   ```tsx
   behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
   ```

### Q2: 键盘弹出时布局抖动
**解决方案**:
1. 确保 `keyboardVerticalOffset` 设置正确
2. 检查是否有多个 `KeyboardAvoidingView` 嵌套
3. 确认父容器没有额外的 padding

### Q3: 消息列表被挤压太多
**解决方案**:
1. 调整 `MessagesContainer` 的 `minHeight`
2. 在键盘弹出时隐藏快捷操作栏:
   ```tsx
   useEffect(() => {
     const keyboardDidShowListener = Keyboard.addListener(
       'keyboardDidShow',
       () => setShowQuickActions(false)
     );
     return () => keyboardDidShowListener.remove();
   }, []);
   ```

### Q4: Android 使用 `adjustResize` 无效
**原因**: 部分 Android 设备或系统版本不支持

**解决方案**:
改用 `adjustPan`:
```xml
android:windowSoftInputMode="adjustPan"
```

或同时使用:
```xml
android:windowSoftInputMode="adjustResize|stateHidden"
```

## 进阶优化

### 1. 自动隐藏快捷操作栏
```tsx
import { Keyboard } from 'react-native';

useEffect(() => {
  const keyboardDidShowListener = Keyboard.addListener(
    'keyboardDidShow',
    () => setShowQuickActions(false)
  );
  
  const keyboardDidHideListener = Keyboard.addListener(
    'keyboardDidHide',
    () => setShowQuickActions(messages.length <= 3)
  );

  return () => {
    keyboardDidShowListener.remove();
    keyboardDidHideListener.remove();
  };
}, [messages.length]);
```

### 2. 自动滚动到最新消息
```tsx
const scrollToBottom = () => {
  messageListRef.current?.scrollToEnd({ animated: true });
};

useEffect(() => {
  const keyboardDidShowListener = Keyboard.addListener(
    'keyboardDidShow',
    scrollToBottom
  );
  return () => keyboardDidShowListener.remove();
}, []);
```

### 3. 动态调整 offset
```tsx
const [keyboardHeight, setKeyboardHeight] = useState(0);

useEffect(() => {
  const keyboardDidShowListener = Keyboard.addListener(
    'keyboardDidShow',
    (e) => setKeyboardHeight(e.endCoordinates.height)
  );
  
  const keyboardDidHideListener = Keyboard.addListener(
    'keyboardDidHide',
    () => setKeyboardHeight(0)
  );

  return () => {
    keyboardDidShowListener.remove();
    keyboardDidHideListener.remove();
  };
}, []);
```

## 参考资料

- [React Native - KeyboardAvoidingView](https://reactnative.dev/docs/keyboardavoidingview)
- [Android - windowSoftInputMode](https://developer.android.com/guide/topics/manifest/activity-element#wsoft)
- [Managing the Keyboard](https://reactnative.dev/docs/handling-text-input#managing-the-keyboard)

## 总结

通过以下三个步骤解决了键盘遮挡问题:
1. ✅ 在 `AgentScreen` 中添加 `KeyboardAvoidingView`
2. ✅ 移除子组件中重复的 `KeyboardAvoidingView`
3. ✅ 确认 `AndroidManifest.xml` 配置正确

现在 Android 和 iOS 上键盘弹出时,输入框都会正确地上移到可见区域!
