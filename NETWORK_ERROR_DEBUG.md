# 🐛 Network Error 调试指南

## 问题描述
- USB 联调 (`npm run android`) 正常
- Release APK 安装后登录显示 "Network Error"
- 只打印了前两行日志,没有后续日志

## 已添加的详细日志

### 1. 请求拦截器日志
```
🔵 [REQUEST START] ================
🔵 Method: POST
🔵 URL: /user/login
🔵 Base URL: http://47.114.96.56:9432
🔵 Full URL: http://47.114.96.56:9432/user/login
🔵 Headers: {...}
🔵 Data: {"username":"test","password":"123456"}
🔵 Token added: ... 或 No token found
🔵 [REQUEST END] ==================
```

### 2. 响应拦截器日志
```
🟢 [RESPONSE START] ================
🟢 Status: 200
🟢 URL: /user/login
🟢 Response Data: {...}
🟢 [RESPONSE END] ==================
```

### 3. 错误日志
```
🔴 [RESPONSE ERROR START] ================
🔴 Error Type: Error
🔴 Error Message: Network Error
🔴 Has Request but NO Response - Network Error!
🔴 This is likely a NETWORK connectivity issue
🔴 [RESPONSE ERROR END] ==================
```

### 4. 登录流程日志
```
🟡 [LOGIN] 开始登录流程...
🟡 [LOGIN] Username: testuser
🟡 [LOGIN] Password length: 8
🟡 [LOGIN] 调用 authAPI.login...
```

## 🔍 调试步骤

### 步骤 1: 重新打包测试

```bash
./test-and-rebuild.sh
```

这会:
1. 清理旧构建
2. 重新打包 APK
3. 安装到手机

### 步骤 2: 查看内置调试器

1. 打开应用
2. 点击右下角 🐛 图标
3. 查看日志输出
4. 尝试登录
5. 观察日志变化

### 步骤 3: 使用 adb logcat (推荐)

**清空并实时查看日志:**
```bash
adb logcat -c && adb logcat | grep -E "LedgerAI|ReactNativeJS"
```

**只看错误:**
```bash
adb logcat | grep -E "🔴|ERROR"
```

**保存日志到文件:**
```bash
adb logcat | grep -E "LedgerAI" > debug.log
```

## 🎯 根据日志判断问题

### 情况 1: 只看到 REQUEST START,没有 REQUEST END
**原因:** 请求拦截器内部出错
**解决:** 检查 AsyncStorage 是否正常

### 情况 2: 看到 REQUEST END,但没有 RESPONSE
**原因:** 网络请求根本没发出去,或者被系统拦截
**可能原因:**
- `usesCleartextTraffic` 配置问题
- 网络权限问题
- DNS 解析问题
- 防火墙/代理设置

### 情况 3: 看到 "Has Request but NO Response"
**原因:** 请求发出了,但服务器没响应
**检查:**
1. 服务器是否运行
2. 手机能否访问服务器 IP
3. 端口是否开放

### 情况 4: 看到 RESPONSE 但有错误
**原因:** 服务器返回了错误
**查看:** Response Data 中的具体错误信息

## 🔧 常见问题修复

### 问题 1: Android 系统拦截 HTTP

**检查配置:**
```bash
# 查看 AndroidManifest.xml
cat android/app/src/main/AndroidManifest.xml | grep cleartext
```

应该看到:
```xml
android:usesCleartextTraffic="${usesCleartextTraffic}"
```

**检查 build.gradle:**
```bash
cat android/app/build.gradle | grep usesCleartextTraffic
```

应该看到:
```gradle
manifestPlaceholders = [usesCleartextTraffic: "true"]
```

### 问题 2: 网络权限

**检查权限:**
```bash
cat android/app/src/main/AndroidManifest.xml | grep INTERNET
```

应该有:
```xml
<uses-permission android:name="android.permission.INTERNET" />
```

### 问题 3: DNS 解析问题

**测试:**
在手机浏览器访问:
```
http://47.114.96.56:9432/user/login
```

如果无法访问,说明网络层面有问题。

### 问题 4: 代理设置

检查手机是否配置了代理,代理可能拦截了请求。

## 📊 完整日志示例

**正常登录流程应该看到:**
```
[LedgerAI] ======================
[LedgerAI] Environment: PRODUCTION
[LedgerAI] API Base URL: http://47.114.96.56:9432
[LedgerAI] ======================

🟡 [LOGIN] 开始登录流程...
🟡 [LOGIN] Username: test
🟡 [LOGIN] Password length: 8
🟡 [LOGIN] 调用 authAPI.login...

🔵 [REQUEST START] ================
🔵 Method: POST
🔵 URL: /user/login
🔵 Base URL: http://47.114.96.56:9432
🔵 Full URL: http://47.114.96.56:9432/user/login
🔵 No token found
🔵 [REQUEST END] ==================

🟢 [RESPONSE START] ================
🟢 Status: 200
🟢 URL: /user/login
🟢 Found wrapped response, code: 200
✅ Success: 登录成功
🟢 Unwrapped data: {"token":"...","userId":1,...}
🟢 [RESPONSE END] ==================

🟢 [LOGIN] 登录成功!
🟢 [LOGIN] Response: {...}
🟢 [LOGIN] 登录流程完成!
```

**Network Error 会看到:**
```
🟡 [LOGIN] 开始登录流程...
🔵 [REQUEST START] ================
🔵 [REQUEST END] ==================

🔴 [RESPONSE ERROR START] ================
🔴 Error Type: Error
🔴 Error Message: Network Error
🔴 Has Request but NO Response - Network Error!
🔴 [RESPONSE ERROR END] ==================

🔴 [LOGIN] 登录失败!
🔴 [LOGIN] Error message: Network Error: 无法连接到服务器
```

## 🎯 下一步

1. **运行测试脚本:**
   ```bash
   ./test-and-rebuild.sh
   ```

2. **同时开启 logcat:**
   ```bash
   adb logcat -c && adb logcat | grep -E "LedgerAI|🔵|🟢|🔴|🟡"
   ```

3. **测试登录,观察完整日志**

4. **根据日志判断问题位置**

5. **复制关键日志给开发团队分析**

---

## 📞 需要提供的信息

如果问题仍未解决,请提供:
1. adb logcat 的完整日志
2. 内置调试器的截图
3. 手机浏览器能否访问 `http://47.114.96.56:9432`
4. 手机系统版本
5. 是否有特殊网络设置(代理/VPN等)
