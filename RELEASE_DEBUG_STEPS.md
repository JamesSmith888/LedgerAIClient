# 🐛 Release APK 调试步骤

## 问题描述
- ✅ USB 联调(Debug 模式)正常: `npm run android` 
- ❌ Release APK 安装后登录/注册失败
- ✅ 网络是通的,可以访问服务器

## 可能的原因

### 1. JS Bundle 打包问题
Release 构建时,JS 代码会被打包成 bundle,如果打包失败或不完整,会导致功能异常。

### 2. Hermes 编译问题
Hermes 在 Release 模式下会编译和优化 JS 代码,可能导致某些代码行为不一致。

### 3. ProGuard/R8 混淆问题
代码混淆可能导致某些代码被错误优化掉。

## 🔍 诊断步骤

### 步骤 1: 查看 APK 是否包含 JS Bundle

```bash
# 解压 APK 查看内容
cd android/app/build/outputs/apk/release
unzip -l app-release.apk | grep -i "bundle\|hermes"
```

应该看到类似:
```
assets/index.android.bundle  (如果使用 JSC)
或
assets/index.android.bundle.hbc  (如果使用 Hermes)
```

### 步骤 2: 构建时查看完整日志

```bash
cd android
./gradlew assembleRelease --info > build.log 2>&1
```

然后检查 `build.log` 中是否有错误或警告。

### 步骤 3: 查看 APK 中的日志

连接手机,安装 APK 后:

```bash
# 清空日志
adb logcat -c

# 启动应用并查看日志
adb logcat | tee app.log

# 或者只看错误
adb logcat *:E | grep -i "react\|ledger"
```

### 步骤 4: 检查 Metro Bundler 日志

打包时 Metro 会生成 bundle,查看是否有错误:

```bash
# 手动触发 bundle 生成
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res/
```

## 🔧 解决方案

### 方案 1: 禁用 Hermes (测试用)

编辑 `android/gradle.properties`:
```properties
hermesEnabled=false
```

然后重新打包:
```bash
npm run build:android:clean
npm run build:android
```

### 方案 2: 禁用代码压缩和混淆

编辑 `android/app/build.gradle`:
```gradle
def enableProguardInReleaseBuilds = false  // 已经是 false
```

并在 release 配置中添加:
```gradle
release {
    signingConfig signingConfigs.release
    minifyEnabled false
    shrinkResources false
    proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
    manifestPlaceholders = [usesCleartextTraffic: "true"]
}
```

### 方案 3: 添加 ProGuard 规则

如果启用了混淆,创建/编辑 `android/app/proguard-rules.pro`:
```proguard
# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }

# Axios
-keep class axios.** { *; }

# AsyncStorage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# 保留所有 native 方法
-keepclasseswithmembernames class * {
    native <methods>;
}

# 保留枚举
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}
```

### 方案 4: 构建 Release 但可调试的 APK

修改 `android/app/build.gradle`:
```gradle
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
        debuggable true  // 添加这行,允许调试
        manifestPlaceholders = [usesCleartextTraffic: "true"]
    }
}
```

这样可以用 Chrome DevTools 调试 Release 版本。

### 方案 5: 使用 staging 构建类型

在 `android/app/build.gradle` 中添加 staging 构建:
```gradle
buildTypes {
    debug {
        signingConfig signingConfigs.debug
        manifestPlaceholders = [usesCleartextTraffic: "true"]
    }
    
    staging {
        initWith debug
        signingConfig signingConfigs.release
        matchingFallbacks = ['debug', 'release']
        manifestPlaceholders = [usesCleartextTraffic: "true"]
    }
    
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
        manifestPlaceholders = [usesCleartextTraffic: "true"]
    }
}
```

打包 staging:
```bash
cd android
./gradlew assembleStaging
```

## 📱 测试建议

### 1. 先构建一个简化版本测试

临时注释掉复杂功能,只保留最基本的:
- 简单的 UI
- 基本的网络请求
- 最小依赖

如果简化版本能工作,说明是某个特定功能或依赖的问题。

### 2. 对比 Debug 和 Release 的区别

```bash
# 构建 debug APK
cd android
./gradlew assembleDebug

# 构建 release APK  
./gradlew assembleRelease

# 对比两个 APK 的内容
unzip -l app/build/outputs/apk/debug/app-debug.apk > debug-contents.txt
unzip -l app/build/outputs/apk/release/app-release.apk > release-contents.txt
diff debug-contents.txt release-contents.txt
```

### 3. 检查 Bundle 的大小

```bash
# Debug bundle
ls -lh app/build/intermediates/assets/debug/mergeDebugAssets/index.android.bundle

# Release bundle  
ls -lh app/build/intermediates/assets/release/mergeReleaseAssets/index.android.bundle
```

如果 Release bundle 明显小很多或不存在,说明打包有问题。

## 🎯 快速测试脚本

创建 `test-release.sh`:
```bash
#!/bin/bash

echo "🧹 清理..."
cd android
./gradlew clean

echo "📦 构建 Release APK (带详细日志)..."
./gradlew assembleRelease --info --stacktrace 2>&1 | tee build.log

echo ""
echo "📊 检查 APK 内容..."
APK_PATH="app/build/outputs/apk/release/app-release.apk"
if [ -f "$APK_PATH" ]; then
    echo "✅ APK 已生成"
    
    echo ""
    echo "📦 APK 内容:"
    unzip -l "$APK_PATH" | grep -E "bundle|assets|res"
    
    echo ""
    echo "📏 Bundle 文件:"
    unzip -l "$APK_PATH" | grep "index.android"
    
    echo ""
    echo "💾 APK 大小:"
    ls -lh "$APK_PATH"
else
    echo "❌ APK 未生成"
    exit 1
fi

cd ..
echo ""
echo "📱 准备安装,请连接手机..."
echo "运行: adb install -r android/app/build/outputs/apk/release/app-release.apk"
```

## 🔍 关键检查点

- [ ] APK 中包含 JS bundle 文件
- [ ] bundle 文件大小合理(不是 0 或特别小)
- [ ] 构建日志没有错误
- [ ] adb logcat 能看到应用日志
- [ ] 调试器能看到环境变量正确
- [ ] 网络请求能在日志中看到

## 💡 终极测试

如果以上都不行,尝试构建一个**完全独立的测试应用**:

```bash
# 创建新的测试项目
npx react-native init TestApp
cd TestApp

# 只添加最基本的网络请求
npm install axios

# 修改 App.tsx 添加简单的网络测试
# 然后打包 Release 测试

cd android
./gradlew assembleRelease
```

如果测试应用的 Release 能工作,说明主项目的配置有问题。

---

**下一步:** 运行诊断步骤,查看日志,确定具体问题所在!
