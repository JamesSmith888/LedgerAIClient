#!/bin/bash

echo "🔨 重新打包并安装测试..."
echo ""

# 1. 清理
echo "1️⃣ 清理旧构建..."
cd android
./gradlew clean > /dev/null 2>&1
cd ..

# 2. 打包
echo "2️⃣ 打包 Release APK..."
cd android
./gradlew assembleRelease
cd ..

if [ ! -f "android/app/build/outputs/apk/release/app-release.apk" ]; then
    echo "❌ 打包失败"
    exit 1
fi

echo ""
echo "✅ 打包成功"
echo ""

# 3. 安装
echo "3️⃣ 安装到手机..."
adb install -r android/app/build/outputs/apk/release/app-release.apk

echo ""
echo "4️⃣ 清空日志并准备查看..."
adb logcat -c

echo ""
echo "📱 请打开应用并尝试登录"
echo "👀 同时观察以下日志:"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
adb logcat | grep --line-buffered "LedgerAI"
