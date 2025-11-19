# React Native 前端 - 支付宝登录集成指南

## 📦 安装依赖

### 1. 安装支付宝 SDK

```bash
# 使用 npm
npm install @uiw/react-native-alipay

# 或使用 yarn
yarn add @uiw/react-native-alipay

# 安装 pods (iOS)
cd ios && pod install && cd ..
```

## 🔧 原生配置

### iOS 配置

#### 1. 配置 URL Scheme

编辑 `ios/YourApp/Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleTypeRole</key>
        <string>Editor</string>
        <key>CFBundleURLName</key>
        <string>alipay</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <!-- 替换为你的应用标识 -->
            <string>your-app-scheme</string>
        </array>
    </dict>
</array>

<!-- 允许打开支付宝 -->
<key>LSApplicationQueriesSchemes</key>
<array>
    <string>alipay</string>
    <string>alipayshare</string>
</array>
```

#### 2. 处理回调 (AppDelegate.mm)

```objc
#import <AlipaySDK/AlipaySDK.h>

// 在 AppDelegate.mm 中添加
- (BOOL)application:(UIApplication *)app openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {
    if ([url.host isEqualToString:@"safepay"]) {
        [[AlipaySDK defaultService] processOrderWithPaymentResult:url standbyCallback:nil];
        return YES;
    }
    return NO;
}
```

### Android 配置

#### 1. 配置 AndroidManifest.xml

编辑 `android/app/src/main/AndroidManifest.xml`:

```xml
<application>
    <activity
        android:name=".MainActivity"
        android:launchMode="singleTask">
        
        <!-- 添加 intent-filter -->
        <intent-filter>
            <action android:name="android.intent.action.VIEW" />
            <category android:name="android.intent.category.DEFAULT" />
            <category android:name="android.intent.category.BROWSABLE" />
            <!-- 替换为你的应用标识 -->
            <data android:scheme="your-app-scheme" />
        </intent-filter>
    </activity>
</application>
```

#### 2. 配置混淆规则 (可选)

编辑 `android/app/proguard-rules.pro`:

```
-keep class com.alipay.android.app.IAlixPay{*;}
-keep class com.alipay.android.app.IAlixPay$Stub{*;}
-keep class com.alipay.android.app.IRemoteServiceCallback{*;}
-keep class com.alipay.android.app.IRemoteServiceCallback$Stub{*;}
-keep class com.alipay.sdk.app.PayTask{ public *;}
-keep class com.alipay.sdk.app.AuthTask{ public *;}
```

## 🎯 使用方式

### 1. 登录页面

支付宝登录按钮已添加到 `LoginScreen.tsx`，点击即可调用：

```typescript
// 自动调用支付宝 SDK
// 获取 auth_code
// 发送到后端验证
// 保存登录状态
```

### 2. 注册页面

支付宝快捷注册已添加到 `RegisterScreen.tsx`，首次使用会自动创建账号。

## 🔄 切换为真实实现

当前使用的是**模拟实现**（用于开发测试），切换为真实实现：

### 修改 `src/utils/alipay.ts`

取消注释真实实现代码：

```typescript
// === 方式1: 真实实现（需要安装SDK）===
import Alipay from '@uiw/react-native-alipay';

export const loginWithAlipay = async (): Promise<string> => {
  try {
    // 构造授权信息串（需要在后端生成并签名）
    const authInfo = await getAuthInfoFromBackend();
    
    // 调用支付宝SDK
    const result: AlipayAuthResult = await Alipay.authWithInfo(authInfo);
    
    if (result.resultStatus === '9000') {
      const authCode = parseAuthCode(result.result);
      if (!authCode) {
        throw new Error('无法解析授权码');
      }
      return authCode;
    } else if (result.resultStatus === '6001') {
      throw new Error('USER_CANCEL');
    } else {
      throw new Error(result.memo || '支付宝授权失败');
    }
  } catch (error: any) {
    console.error('支付宝登录失败:', error);
    throw error;
  }
};
```

## 📝 已创建的文件

```
LedgerAIClient/src/
├── services/
│   └── authAPI.ts                          ✅ 已添加 oauthLogin 接口
├── utils/
│   └── alipay.ts                           ✅ 支付宝登录工具类
├── components/
│   └── auth/
│       └── OAuthButtons.tsx                ✅ 第三方登录按钮组件
├── screens/
│   ├── LoginScreen.tsx                     ✅ 已添加支付宝登录
│   └── RegisterScreen.tsx                  ✅ 已添加支付宝注册
```

## 🧪 测试流程

### 1. 开发环境测试（模拟模式）

当前默认使用模拟模式，无需配置即可测试：

```bash
# 启动项目
npm start

# 运行 iOS
npm run ios

# 运行 Android
npm run android
```

点击「支付宝」按钮，会模拟登录流程。

### 2. 真实环境测试

1. 安装 `@uiw/react-native-alipay`
2. 配置原生代码（iOS/Android）
3. 在支付宝开放平台创建应用
4. 配置后端的支付宝密钥
5. 修改 `alipay.ts` 使用真实实现
6. 重新编译原生代码

```bash
# iOS 重新编译
cd ios && pod install && cd ..
npm run ios

# Android 重新编译
npm run android
```

## 🔐 安全建议

1. **authInfo 必须在后端生成**
   - 包含 RSA2 签名
   - 前端只负责调用 SDK

2. **配置敏感信息**
   - AppID、私钥等存储在后端
   - 前端通过 API 获取签名后的 authInfo

3. **验证流程**
   ```
   前端 -> 支付宝SDK -> 获取auth_code
   前端 -> 后端API -> 验证auth_code -> 返回JWT
   ```

## 📚 参考文档

- [支付宝开放平台](https://open.alipay.com/)
- [@uiw/react-native-alipay](https://github.com/uiwjs/react-native-alipay)
- [支付宝移动端接入](https://opendocs.alipay.com/open/218/105325)

## 🎉 功能清单

- ✅ 支付宝登录按钮
- ✅ 支付宝快捷注册
- ✅ 自动创建用户
- ✅ JWT token 保存
- ✅ 错误处理
- ✅ 用户取消处理
- ✅ Loading 状态
- ✅ Toast 提示

---

## 🚀 下一步

1. 安装支付宝 SDK
2. 配置原生代码
3. 测试登录流程
4. 切换为真实实现
5. 上线发布

**前端集成完成！** 🎊
