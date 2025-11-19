# 📦 React Native 应用打包配置完成

## ✅ 已完成的配置

### 1. 构建配置
- ✅ 修改了 `android/app/build.gradle`,添加 release 签名配置
- ✅ 配置了 `android/gradle.properties`,包含签名密钥信息
- ✅ 添加了打包命令到 `package.json`

### 2. 自动化脚本
- ✅ 创建了 `build-release.sh` 一键打包脚本
- ✅ 脚本会自动检查/生成密钥、清理、打包

### 3. 文档
- ✅ `ANDROID_BUILD_GUIDE.md` - 详细打包指南
- ✅ `RELEASE_QUICK_GUIDE.md` - 快速发布指南
- ✅ `SECURITY_NOTICE.md` - 安全注意事项

### 4. 环境配置
你的应用已配置自动环境切换:
- 开发模式 (Debug): `http://localhost:9432`
- 生产模式 (Release): `http://47.114.96.56:9432` ✅

---

## 🚀 立即开始打包

### 方式 1: 使用自动化脚本 (推荐)

```bash
./build-release.sh
```

这是最简单的方式! 脚本会自动完成所有步骤。

### 方式 2: 使用 npm 命令

```bash
npm run build:android
```

### 方式 3: 使用 Gradle

```bash
cd android && ./gradlew assembleRelease
```

---

## 📱 打包产物

成功后,APK 文件位置:
```
android/app/build/outputs/apk/release/app-release.apk
```

---

## 🔑 首次打包需要生成密钥

如果还没有密钥,运行以下命令:

```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 \
  -keystore ledger-release-key.keystore \
  -alias ledger-key-alias \
  -keyalg RSA -keysize 2048 \
  -validity 10000
```

**建议密码:** `ledger2024` (或自定义,务必记住!)

或者直接运行 `./build-release.sh`,脚本会提示你生成。

---

## 📤 分发给测试用户

### 1. 直接发送 APK
将 `app-release.apk` 通过微信/QQ/邮件发送给用户

### 2. 使用蒲公英 (推荐)
- 网址: https://www.pgyer.com/
- 上传 APK,获取下载链接
- 测试用户扫码即可安装

### 3. 上传到你的服务器
```bash
# 上传到服务器
scp android/app/build/outputs/apk/release/app-release.apk user@47.114.96.56:/var/www/downloads/

# 提供下载链接
http://47.114.96.56/downloads/app-release.apk
```

---

## 🔧 常用命令

```bash
# 打包 APK
npm run build:android

# 打包 AAB (Google Play)
npm run build:android:bundle

# 清理构建
npm run build:android:clean

# 安装到手机
adb install android/app/build/outputs/apk/release/app-release.apk
```

---

## ⚠️ 重要提醒

### 安全事项
1. ⚠️ **密钥文件非常重要** - 请备份 `ledger-release-key.keystore`
2. ⚠️ **记住密码** - 丢失密码将无法更新应用
3. ⚠️ **不要公开分享密钥** - 只有发布负责人持有

### 版本管理
每次发布新版本,记得更新版本号 (`android/app/build.gradle`):
```gradle
versionCode 2      // 递增
versionName "1.1"  // 更新
```

### 网络配置
- Release 版本会自动连接: `http://47.114.96.56:9432`
- 确保测试用户能访问该地址
- 如需修改,编辑 `src/api/config.ts`

---

## 📚 更多信息

- 📖 详细文档: [ANDROID_BUILD_GUIDE.md](./ANDROID_BUILD_GUIDE.md)
- 🚀 快速指南: [RELEASE_QUICK_GUIDE.md](./RELEASE_QUICK_GUIDE.md)
- 🔐 安全须知: [SECURITY_NOTICE.md](./SECURITY_NOTICE.md)

---

## 🎯 下一步

1. **生成密钥** (如果还没有)
2. **运行打包命令**
3. **测试 APK**
4. **分发给用户**

开始打包:
```bash
./build-release.sh
```

---

**祝打包顺利! 如有问题,请查看文档或联系技术支持。** 🎉
