# 🔧 网络安全配置修复

## ✅ 问题找到了!

**Android 9+ (API 28+) 默认禁止 HTTP 明文请求**,这就是为什么 Release 版本网络不通的原因!

## 已完成的修复

### 1. 创建网络安全配置文件
📁 `android/app/src/main/res/xml/network_security_config.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- 允许所有 HTTP 明文流量 -->
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
    
    <!-- 明确允许你的服务器 -->
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="false">47.114.96.56</domain>
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">10.0.2.2</domain>
    </domain-config>
</network-security-config>
```

### 2. 在 AndroidManifest.xml 中引用
```xml
<application
    android:networkSecurityConfig="@xml/network_security_config"
    ...>
```

## 🚀 立即测试

重新打包并安装:

```bash
./test-and-rebuild.sh
```

或手动:
```bash
cd android
./gradlew clean
./gradlew assembleRelease
cd ..
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

## 🎯 现在应该可以正常工作了!

网络请求应该能成功发出,不再提示 "network error"。

## ⚠️ 安全提醒

当前配置允许 HTTP 明文流量用于开发测试。**正式上线前应该:**

1. **服务器配置 HTTPS**
2. **修改 API 地址为 HTTPS**
   ```typescript
   const PROD_API_URL = 'https://47.114.96.56:9432';
   ```
3. **移除或限制 cleartext 配置**
   ```xml
   <base-config cleartextTrafficPermitted="false">
   ```

## 📋 为什么 Debug 版本正常?

Debug 版本通过 USB 连接,使用的是 `adb reverse`,不受这个限制影响。但 Release 版本在真实网络环境下,Android 9+ 会严格执行安全策略。

---

**现在重新打包试试,应该能连上服务器了!** 🎉
