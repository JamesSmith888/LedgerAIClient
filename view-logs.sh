#!/bin/bash

# 查看 APK 的详细日志
# 用于调试 Release 版本问题

echo "📋 开始查看应用日志..."
echo ""
echo "🔍 过滤关键词: LedgerAI, AuthAPI, ReactNativeJS, chromium"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 清空旧日志
adb logcat -c

# 查看实时日志
adb logcat -v time | grep -E "LedgerAI|AuthAPI|ReactNativeJS|chromium" --color=always
