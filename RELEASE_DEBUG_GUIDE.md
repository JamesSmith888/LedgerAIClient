# 🐛 Release 版本网络问题调试指南

## 问题现象
- USB 联调 `npm run android` 正常
- Release 打包后网络请求失败
- 只打印前两行日志,后续日志缺失
- 提示: **"登录失败 network error"**

## 🔍 已添加的详细日志

### 1. API 配置层 (`src/api/config.ts`)
```
[LedgerAI] ======================
[LedgerAI] Environment: PRODUCTION
[LedgerAI] API Base URL: http://47.114.96.56:9432
[LedgerAI] ======================
[LedgerAI] 🔧 Creating axios instance...
[LedgerAI] ✅ Axios instance created
[LedgerAI] 🔧 Setting up request interceptor...
[LedgerAI] ✅ Request interceptor set up
[LedgerAI] 🔧 Setting up response interceptor...
[LedgerAI] ✅ Response interceptor set up
[LedgerAI] 🎉 API Client configuration completed!
```

### 2. 请求拦截器日志
```
[LedgerAI] 🚀 [Interceptor] Request interceptor triggered
[LedgerAI] 🔑 [Interceptor] Getting token from AsyncStorage...
[LedgerAI] 🔑 [Interceptor] Token: NONE
[LedgerAI] 📤 Request: POST /user/login
[LedgerAI] 📤 Full URL: http://47.114.96.56:9432/user/login
[LedgerAI] 📤 Headers: {...}
[LedgerAI] 📤 Data: {"username":"test","password":"***"}
[LedgerAI] ✅ [Interceptor] Request config ready, returning...
```

### 3. AuthAPI 层日志
```
[AuthAPI] 🔐 Starting login request...
[AuthAPI] 📝 Login data: {username: "test", password: "***"}
[AuthAPI] 🌐 Calling apiClient.post...
```

### 4. 响应/错误日志
```
成功时:
[LedgerAI] 🎉 [Interceptor] Response received!
[LedgerAI] 📥 Response: 200 /user/login
[AuthAPI] ✅ Login response received: 200

失败时:
[LedgerAI] 💥 [Interceptor] Response interceptor caught error!
[LedgerAI] ❗ API Error: Network Error
[LedgerAI] ❗ Error type: AxiosError
[LedgerAI] ❗ No Response Received - Network Error!
[AuthAPI] ❌ Login request failed!
```

## 🚀 测试步骤

### 1. 重新打包并安装
```bash
./test-and-rebuild.sh
```

### 2. 查看实时日志
```bash
./view-logs.sh
```

或手动:
```bash
adb logcat -c
adb logcat | grep -E "LedgerAI|AuthAPI|ReactNativeJS"
```

### 3. 使用内置调试器
1. 打开 APK
2. 点击右下角 🐛 图标
3. 查看环境和日志信息
4. 尝试登录
5. 观察日志输出

## 📋 关键日志检查点

### ✅ 应该看到的日志
1. **启动日志** - 环境配置
2. **Axios 初始化** - 实例创建
3. **拦截器设置** - request/response 拦截器
4. **点击登录** - AuthAPI 开始请求
5. **请求拦截器** - 准备请求配置
6. **发送请求** - axios 发起网络请求

### ❌ 如果日志到某一步就停止了

**停在 "📤 Request" 之后:**
- 说明请求拦截器运行了
- 但实际网络请求没发出
- **可能原因:**
  - Android 网络权限问题
  - Cleartext traffic 被阻止
  - DNS 解析失败
  - 防火墙/代理问题

**停在 "🌐 Calling apiClient.post..." 之后:**
- axios.post 调用了但没响应
- **可能原因:**
  - 超时(默认10秒)
  - 网络连接问题
  - 服务器不可达

**完全没有 "🚀 Request interceptor triggered":**
- 请求拦截器没触发
- **可能原因:**
  - axios 实例配置问题
  - 代码执行就失败了

## 🔧 可能的问题和解决方案

### 1. Android 网络权限
检查 `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<application
    android:usesCleartextTraffic="true">
```

### 2. DNS 问题
尝试使用 IP 直接访问,或检查手机 DNS 设置

### 3. 超时设置
如果网络慢,增加超时时间 (config.ts):
```typescript
timeout: 30000, // 30秒
```

### 4. 代理/VPN
确保手机没有使用代理或 VPN 阻止请求

### 5. 防火墙
服务器端口 9432 是否开放:
```bash
# 在服务器上
sudo ufw status
sudo ufw allow 9432
```

## 📊 日志分析工具

### 完整日志
```bash
adb logcat -d > full-log.txt
cat full-log.txt | grep -E "LedgerAI|AuthAPI|Error|Exception"
```

### 网络相关日志
```bash
adb logcat | grep -i "network\|connect\|socket"
```

### React Native 日志
```bash
adb logcat | grep "ReactNativeJS"
```

## 🎯 下一步

1. **运行 `./test-and-rebuild.sh`** 重新打包
2. **运行 `./view-logs.sh`** 查看实时日志
3. **打开应用,点击登录**
4. **观察日志在哪一步停止**
5. **根据停止的位置判断问题**

---

## 📝 反馈信息模板

如果问题仍未解决,请提供以下信息:

```
1. 最后看到的日志行:
   [最后一行日志内容]

2. 内置调试器显示:
   - 环境: [DEVELOPMENT/PRODUCTION]
   - API 地址: [显示的地址]

3. 手机网络状态:
   - 能否访问其他网站
   - 浏览器能否访问 http://47.114.96.56:9432

4. 完整日志:
   [粘贴关键日志]
```
