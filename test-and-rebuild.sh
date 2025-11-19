#!/bin/bash

# 测试并重新打包脚本
set -e

echo "🔍 测试并重新打包..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}📝 步骤 1: 清理旧构建${NC}"
cd android
./gradlew clean > /dev/null 2>&1
cd ..
echo -e "${GREEN}✅ 清理完成${NC}"
echo ""

echo -e "${BLUE}🔨 步骤 2: 重新打包 APK${NC}"
./build-release.sh

echo ""
echo -e "${BLUE}📱 步骤 3: 安装到手机${NC}"
adb install -r android/app/build/outputs/apk/release/app-release.apk

echo ""
echo -e "${GREEN}✅ 安装完成!${NC}"
echo ""
echo -e "${YELLOW}现在测试:${NC}"
echo "1. 打开应用"
echo "2. 点击右下角 🐛 图标查看日志"
echo "3. 尝试登录"
echo ""
echo -e "${BLUE}同时运行以下命令查看完整日志:${NC}"
echo "adb logcat -c && adb logcat | grep -E 'LedgerAI|ReactNativeJS'"
