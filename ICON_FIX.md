# 修复图标显示问题

如果图标显示为 X 或方块，说明字体文件没有正确链接。

## 🔧 Android 修复步骤

### 1. 已完成的配置
在 `android/app/build.gradle` 中已添加：
```gradle
apply from: file("../../node_modules/react-native-vector-icons/fonts.gradle")
```

### 2. 重新构建应用

```bash
# 清理构建缓存
cd android
./gradlew clean

# 返回项目根目录
cd ..

# 重新运行应用
npm run android
```

## 🍎 iOS 修复步骤（如果也有问题）

### 1. 安装 pods
```bash
cd ios
pod install
cd ..
```

### 2. 重新运行
```bash
npm run ios
```

## ⚡ 快速修复命令

在项目根目录执行：

```bash
# Android
cd android && ./gradlew clean && cd .. && npm run android

# iOS（如需要）
cd ios && pod install && cd .. && npm run ios
```

## 🔍 验证图标是否正常

打开应用后，检查：
- [ ] 个人中心页面的用户图标
- [ ] 编辑按钮的笔图标
- [ ] 菜单项的图标（账本、支付方式、设置等）
- [ ] 箭头图标

如果仍然显示 X，请尝试：

### 方案 1: 完全重新安装
```bash
# 删除 node_modules 和重新安装
rm -rf node_modules
npm install

# Android 重新构建
cd android
./gradlew clean
cd ..
npm run android
```

### 方案 2: 手动检查配置

检查 `android/app/build.gradle` 文件中是否有这行：
```gradle
apply from: file("../../node_modules/react-native-vector-icons/fonts.gradle")
```

确保这行在 `dependencies` 块之前。

## 📱 测试所有图标

修复后，可以创建一个测试页面查看所有图标：

```tsx
import { Icon, AppIcons } from '../components/common';

const IconTest = () => (
  <ScrollView>
    <Icon name={AppIcons.home} size={24} />
    <Icon name={AppIcons.person} size={24} />
    <Icon name={AppIcons.book} size={24} />
    <Icon type="feather" name="edit" size={24} />
    // ... 更多图标
  </ScrollView>
);
```

## ⚠️ 常见问题

**Q: 图标还是显示 X**
A: 确保已经重新构建应用（不是热重载）

**Q: 某些图标正常，某些显示 X**
A: 可能是图标名称错误，检查拼写或参考 ICON_GUIDE.md

**Q: iOS 上显示正常，Android 显示 X**
A: 确保执行了 `cd android && ./gradlew clean`

## 📝 备注

- 字体配置修改后必须重新构建，热重载无效
- 确保使用正确的图标名称
- 图标库文档：https://oblador.github.io/react-native-vector-icons/
