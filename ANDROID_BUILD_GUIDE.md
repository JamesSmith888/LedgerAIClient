# Android 打包发布指南

## 前置要求
- 确保已安装 JDK 17 或以上
- 确保已安装 Android SDK
- 确保已配置好 React Native 开发环境

## 步骤 1: 生成签名密钥

在项目根目录下运行以下命令生成发布密钥:

```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore ledger-release-key.keystore -alias ledger-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

**重要提示:** 
- 执行命令时会提示输入密码和信息,请务必记住你设置的密码!
- 建议密码: `ledger2024` (或自定义,但要记住)
- 名字: 可以填写你的名字或公司名
- 组织单位: 可以填写 Development
- 组织: 可以填写你的公司名或个人名
- 城市: 你的城市
- 省份: 你的省份
- 国家代码: CN

**密钥文件保管:**
- 生成的 `ledger-release-key.keystore` 文件非常重要,请妥善保管
- 丢失此文件将无法更新已发布的应用
- 建议备份到安全的地方

## 步骤 2: 配置签名信息

密钥已经在 `gradle.properties` 中配置(不要提交到 Git)

## 步骤 3: 打包 APK

### 方式 1: 使用 Gradle 命令 (推荐)

```bash
cd android
./gradlew assembleRelease
```

打包完成后,APK 文件位置:
```
android/app/build/outputs/apk/release/app-release.apk
```

### 方式 2: 使用 npm 脚本

在项目根目录运行:
```bash
npm run build:android
```

## 步骤 4: 打包 AAB (用于 Google Play)

如果要上传到 Google Play Store,需要打包 AAB 格式:

```bash
cd android
./gradlew bundleRelease
```

AAB 文件位置:
```
android/app/build/outputs/bundle/release/app-release.aab
```

## 步骤 5: 测试 APK

将生成的 APK 文件传输到 Android 设备上安装测试:

```bash
# 通过 adb 安装
adb install android/app/build/outputs/apk/release/app-release.apk
```

或者直接将 APK 文件发送给测试用户安装。

## 环境配置说明

应用已配置自动环境切换:
- **开发模式 (Debug)**: 使用 `http://localhost:9432`
- **生产模式 (Release)**: 使用 `http://47.114.96.56:9432`

发布的 APK 会自动连接到生产服务器 `http://47.114.96.56:9432`

## 常见问题

### Q1: keytool 命令找不到
确保已正确安装 JDK,并配置了 JAVA_HOME 环境变量。

### Q2: 打包失败
1. 清理项目: `cd android && ./gradlew clean`
2. 删除 node_modules 重新安装: `rm -rf node_modules && npm install`
3. 清理 Metro 缓存: `npm start -- --reset-cache`

### Q3: APK 安装后闪退
检查是否有权限问题,或查看 logcat 日志:
```bash
adb logcat | grep -i "ledger"
```

### Q4: 网络请求失败
确保手机能访问服务器地址 `http://47.114.96.56:9432`

## 版本管理

每次发布新版本前,记得更新版本号:

编辑 `android/app/build.gradle`:
```gradle
defaultConfig {
    versionCode 2  // 递增这个数字
    versionName "1.1"  // 更新版本名称
}
```

## 发布清单

- [ ] 生成或确认有签名密钥文件
- [ ] 配置 gradle.properties 签名信息
- [ ] 更新版本号 (versionCode 和 versionName)
- [ ] 确认 API 地址配置正确
- [ ] 执行打包命令
- [ ] 在真机上测试 APK
- [ ] 准备发布说明文档
- [ ] 分发给测试用户

## 分发给测试用户

1. **直接分发 APK**
   - 将 `app-release.apk` 文件发送给测试用户
   - 用户需要在手机设置中允许"安装未知来源应用"
   
2. **使用内测平台**
   - [蒲公英](https://www.pgyer.com/) - 国内常用
   - [Firebase App Distribution](https://firebase.google.com/products/app-distribution)
   - [TestFlight](https://testflight.apple.com/) (iOS)

3. **自建下载服务**
   - 将 APK 上传到你的服务器
   - 提供下载链接给测试用户
