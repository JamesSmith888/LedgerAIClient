# 🐛 生产环境调试指南

## 问题诊断

你遇到的问题可能是:
1. ✅ `__DEV__` 判断正确,Release 构建时为 `false`
2. ❌ 但网络可能有其他问题

## 已添加的调试功能

### 1️⃣ 增强日志系统

修改了 `src/api/config.ts`:
- ✅ 现在所有环境都会打印网络请求日志
- ✅ 启动时会显示当前环境和 API 地址
- ✅ 详细的错误信息,包括网络错误诊断

### 2️⃣ 内置网络调试器

新增了 `NetworkDebugger` 组件:
- 📱 点击屏幕右下角的 🐛 图标打开
- 🔍 可以查看实时网络请求日志
- 🌐 显示当前环境和 API 地址
- 📊 查看所有网络请求和错误

## 🔍 查看日志的方法

### 方法 1: 使用内置调试器 (最简单)

1. 打开安装好的 APK
2. 点击屏幕右下角的 🐛 图标
3. 查看日志信息:
   - 当前环境(开发/生产)
   - API 地址
   - 实时网络请求
   - 错误信息

### 方法 2: 使用 adb logcat (最详细)

```bash
# 连接手机到电脑
# 过滤查看 LedgerAI 相关日志
adb logcat | grep -i "LedgerAI"

# 或者查看所有 React Native 日志
adb logcat *:S ReactNative:V ReactNativeJS:V

# 清空日志后再查看
adb logcat -c && adb logcat | grep -i "ledger"
```

### 方法 3: Chrome DevTools (需要开发版本)

如果是 Debug 版本:
```bash
# 启动应用后
adb reverse tcp:8081 tcp:8081
# 在 Chrome 打开: chrome://inspect
```

## 🌐 网络问题排查

### 检查 1: 确认环境配置

启动应用后,查看日志应该显示:
```
[LedgerAI] ======================
[LedgerAI] Environment: PRODUCTION
[LedgerAI] API Base URL: http://47.114.96.56:9432
[LedgerAI] ======================
```

如果显示 DEVELOPMENT,说明打包有问题。

### 检查 2: 测试服务器连接

在手机浏览器中访问:
```
http://47.114.96.56:9432
```

如果无法访问,可能是:
- ❌ 服务器未启动
- ❌ 防火墙阻止
- ❌ 手机网络问题

### 检查 3: 检查服务器配置

服务器需要允许 HTTP 明文流量,检查:

#### Android 端配置
`android/app/src/main/AndroidManifest.xml`:
```xml
<application
    android:usesCleartextTraffic="true">
```

已在 build.gradle 中配置:
```gradle
release {
    manifestPlaceholders = [usesCleartextTraffic: "false"]
}
```

**注意:** 生产环境设置为 false,可能需要改为 true!

### 检查 4: 服务器防火墙

在服务器上:
```bash
# 检查端口是否开放
sudo netstat -tulpn | grep 9432

# 检查防火墙
sudo ufw status
sudo ufw allow 9432

# 或 firewalld
sudo firewall-cmd --list-ports
sudo firewall-cmd --add-port=9432/tcp --permanent
sudo firewall-cmd --reload
```

## 🔧 修复网络问题

### 修复 1: 允许明文流量

如果服务器使用 HTTP (非 HTTPS):

编辑 `android/app/build.gradle`:
```gradle
release {
    manifestPlaceholders = [usesCleartextTraffic: "true"]  // 改为 true
}
```

### 修复 2: 添加网络安全配置

创建 `android/app/src/main/res/xml/network_security_config.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">47.114.96.56</domain>
    </domain-config>
</network-security-config>
```

在 `AndroidManifest.xml` 中引用:
```xml
<application
    android:networkSecurityConfig="@xml/network_security_config">
```

### 修复 3: 测试网络连接

添加测试按钮,在登录界面测试连接:

```typescript
// 在登录组件中添加
const testConnection = async () => {
    try {
        const response = await fetch('http://47.114.96.56:9432/api/health');
        console.log('✅ 连接成功:', response.status);
        Alert.alert('成功', '服务器连接正常');
    } catch (error) {
        console.error('❌ 连接失败:', error);
        Alert.alert('失败', '无法连接到服务器: ' + error.message);
    }
};
```

## 📱 重新打包

修改配置后,需要重新打包:

```bash
# 清理旧构建
npm run build:android:clean

# 重新打包
./build-release.sh
```

## 🧪 快速测试脚本

创建测试文件 `test-network.sh`:
```bash
#!/bin/bash
echo "🔍 测试服务器连接..."
curl -v http://47.114.96.56:9432/api/health
```

## 📋 常见错误及解决方案

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| Network Error | 无法连接服务器 | 检查服务器是否运行,防火墙配置 |
| CLEARTEXT communication not permitted | Android 阻止 HTTP | 设置 `usesCleartextTraffic: "true"` |
| Connection refused | 端口未开放 | 检查服务器端口和防火墙 |
| Timeout | 连接超时 | 检查网络,增加超时时间 |

## ✅ 调试清单

- [ ] 查看内置调试器确认环境是 PRODUCTION
- [ ] 确认 API 地址是 `http://47.114.96.56:9432`
- [ ] 手机浏览器能访问服务器地址
- [ ] 使用 adb logcat 查看详细日志
- [ ] 检查 usesCleartextTraffic 配置
- [ ] 服务器端口 9432 已开放
- [ ] 检查服务器日志是否收到请求

## 🚀 下一步

1. **立即测试**: 打开 APK,点击 🐛 查看环境信息
2. **查看日志**: 使用 `adb logcat | grep LedgerAI`
3. **修复问题**: 根据日志信息修复配置
4. **重新打包**: 修改后重新运行 `./build-release.sh`

---

## 📞 技术支持

如果问题仍未解决:
1. 截图调试器信息
2. 复制 adb logcat 日志
3. 提供给开发团队分析
