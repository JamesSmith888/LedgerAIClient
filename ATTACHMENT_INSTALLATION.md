# 附件功能安装指南

## 📦 安装步骤

### 1. 安装依赖

```bash
npm install react-native-image-picker@latest react-native-fs@latest
# 或者使用 yarn
yarn add react-native-image-picker react-native-fs
```

### 2. iOS配置

```bash
cd ios && pod install && cd ..
```

编辑 `ios/LedgerAIClient/Info.plist`，添加权限：

```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>需要访问相册来上传交易凭证</string>
<key>NSCameraUsageDescription</key>
<string>需要使用相机拍摄交易凭证</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>需要保存图片到相册</string>
```

### 3. Android配置

编辑 `android/app/src/main/AndroidManifest.xml`：

```xml
<manifest ...>
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />
    
    <application ...>
        ...
    </application>
</manifest>
```

编辑 `android/app/build.gradle`，确保minSdkVersion >= 21：

```gradle
android {
    defaultConfig {
        minSdkVersion 21  // 必须 >= 21
        ...
    }
}
```

### 4. 后端配置

编辑 `ledger-server/src/main/resources/application.yml`：

```yaml
spring:
  servlet:
    multipart:
      enabled: true
      max-file-size: 10MB      # 单文件最大10MB
      max-request-size: 50MB   # 单次请求最大50MB
```

### 5. 数据库迁移

启动后端服务，Flyway会自动执行迁移：

```bash
cd ledger-server
./mvnw spring-boot:run
```

检查日志确认迁移成功：
```
Flyway: Migrating schema `ledger` to version 1.7 - add transaction attachments
```

## 🧪 测试

### 前端测试

```bash
# Android
npm run android

# iOS
npm run ios
```

进入"添加交易"页面，应该能看到"图片附件"区域。

### 后端测试

使用Postman测试上传接口：

```http
POST http://localhost:9432/api/transactions/1/attachments
Content-Type: multipart/form-data
Authorization: Bearer YOUR_TOKEN

file: [选择图片文件]
```

## 🔍 验证

1. ✅ 能够选择图片
2. ✅ 显示图片预览
3. ✅ 能够删除图片
4. ✅ 创建交易后图片自动上传
5. ✅ 交易列表显示附件数量
6. ✅ 交易详情能查看附件

## 🐛 常见问题

### 1. "react-native-image-picker未找到"

**解决**：
```bash
npm install react-native-image-picker
cd ios && pod install && cd ..
# 重启Metro
npm start -- --reset-cache
```

### 2. iOS权限弹窗不显示

**解决**：
- 检查Info.plist配置
- 卸载应用重新安装
- 清除Xcode缓存：`rm -rf ~/Library/Developer/Xcode/DerivedData`

### 3. Android图片选择崩溃

**解决**：
- 确保minSdkVersion >= 21
- 检查AndroidManifest.xml权限
- 运行时申请权限

### 4. 上传失败"413 Payload Too Large"

**解决**：
- 检查application.yml配置
- 增加max-file-size和max-request-size
- 重启后端服务

### 5. 图片显示不出来

**解决**：
- 检查网络连接
- 确认后端服务运行
- 查看浏览器控制台/React Native调试器

## 📚 下一步

- 阅读 [ATTACHMENT_FEATURE.md](./ATTACHMENT_FEATURE.md) 了解详细实现
- 自定义上传限制和样式
- 集成到其他页面
