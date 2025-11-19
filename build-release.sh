#!/bin/bash

# LedgerAI 客户端 Android 打包脚本
# 使用方法: ./build-release.sh

set -e

echo "🚀 开始打包 LedgerAI Android 应用..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ 错误: 请在项目根目录运行此脚本${NC}"
    exit 1
fi

# 步骤 1: 检查密钥文件
echo "📝 步骤 1/5: 检查签名密钥..."
if [ ! -f "android/app/ledger-release-key.keystore" ]; then
    echo -e "${YELLOW}⚠️  未找到签名密钥文件${NC}"
    echo "正在生成签名密钥..."
    echo ""
    echo "请按提示输入信息 (建议密码: ledger2024)"
    cd android/app
    keytool -genkeypair -v -storetype PKCS12 \
        -keystore ledger-release-key.keystore \
        -alias ledger-key-alias \
        -keyalg RSA -keysize 2048 \
        -validity 10000
    cd ../..
    echo -e "${GREEN}✅ 密钥生成完成${NC}"
else
    echo -e "${GREEN}✅ 签名密钥已存在${NC}"
fi
echo ""

# 步骤 2: 清理旧构建
echo "🧹 步骤 2/5: 清理旧构建..."
cd android
./gradlew clean > /dev/null 2>&1
cd ..
echo -e "${GREEN}✅ 清理完成${NC}"
echo ""

# 步骤 3: 安装依赖
echo "📦 步骤 3/5: 检查依赖..."
if [ ! -d "node_modules" ]; then
    echo "正在安装依赖..."
    npm install
else
    echo -e "${GREEN}✅ 依赖已安装${NC}"
fi
echo ""

# 步骤 4: 打包 APK
echo "🔨 步骤 4/5: 打包 Release APK..."
cd android
./gradlew assembleRelease
cd ..
echo -e "${GREEN}✅ APK 打包完成${NC}"
echo ""

# 步骤 5: 显示结果
echo "📱 步骤 5/5: 打包结果"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
if [ -f "$APK_PATH" ]; then
    APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
    echo -e "${GREEN}✅ 打包成功!${NC}"
    echo ""
    echo "📦 APK 文件位置:"
    echo "   $APK_PATH"
    echo ""
    echo "📊 APK 大小: $APK_SIZE"
    echo ""
    echo "🔗 生产服务器: http://47.114.96.56:9432"
    echo ""
    echo "📲 安装方法:"
    echo "   1. 直接发送 APK 给测试用户安装"
    echo "   2. 使用 adb 安装: adb install $APK_PATH"
    echo "   3. 上传到蒲公英等内测平台"
else
    echo -e "${RED}❌ 打包失败,未找到 APK 文件${NC}"
    exit 1
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}🎉 所有步骤完成!${NC}"
