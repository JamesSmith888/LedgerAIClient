# 附件本地存储功能指南

## 📌 功能概述

为了降低服务器存储成本，系统现在支持两种附件存储方式：
- **本地存储**（默认）：附件保存在用户设备本地，完全免费
- **云端存储**：附件上传到服务器MySQL数据库，可跨设备同步

## 🎯 设计目标

1. **降低成本**：默认使用本地存储，避免服务器存储费用
2. **用户选择**：让用户根据需求选择存储方式
3. **信息透明**：清晰展示两种方式的优缺点
4. **无缝体验**：统一的UI/UX，无论选择哪种方式

## 💾 本地存储实现

### 存储路径
```
{DocumentDirectory}/attachments/{transactionId}/{uniqueId}.{ext}
```

**示例**：
```
/var/mobile/Containers/Data/Application/xxx/Documents/attachments/123/abc-def-ghi.jpg
```

### 元数据存储
使用 AsyncStorage 存储附件元数据：
```typescript
Key: transaction_attachments_{transactionId}
Value: LocalAttachment[]
```

**LocalAttachment 结构**：
```typescript
{
  id: string;           // UUID
  fileName: string;     // 原始文件名
  fileType: string;     // MIME类型，如 'image/jpeg'
  fileSize: number;     // 文件大小（字节）
  localPath: string;    // 完整本地路径
  uploadedAt: string;   // ISO时间戳
  storageType: 'local'; // 存储类型标识
  width?: number;       // 图片宽度（可选）
  height?: number;      // 图片高度（可选）
}
```

## 🔄 云端 vs 本地对比

### 本地存储优势
- ✅ **完全免费**：不占用服务器空间和流量
- ✅ **访问速度快**：直接从本地读取，无需网络请求
- ✅ **隐私保护**：数据不上传到服务器
- ✅ **离线可用**：无网络也能查看附件

### 本地存储劣势
- ❌ **不能同步**：换设备或重装App后丢失
- ❌ **占用设备空间**：大量附件会占用手机存储
- ❌ **无法共享**：其他人无法查看你的附件

### 云端存储优势
- ✅ **跨设备同步**：任何设备登录都能看到
- ✅ **永久保存**：不受设备影响
- ✅ **可分享**：多人账本可共享附件

### 云端存储劣势
- ❌ **占用服务器**：产生存储和流量费用
- ❌ **需要网络**：必须联网才能查看
- ❌ **上传等待**：需要等待上传完成

## 🎨 用户界面

### 存储方式选择器

在新增交易页面，附件区域顶部显示存储方式选择器：

```
┌─────────────────────────────────────┐
│ 📁 本地存储  ☁️ 云端存储      ❓   │
│   (选中)     (未选中)     (帮助)    │
└─────────────────────────────────────┘
```

**默认状态**：本地存储被选中

**帮助按钮**：点击显示详细对比信息模态框

### 帮助模态框内容

```
┌──────────────────────────────────────┐
│           附件存储方式说明            │
├──────────────────────────────────────┤
│                                      │
│ 📁 本地存储                          │
│   ✅ 完全免费，不占用服务器          │
│   ✅ 访问速度快，离线可用            │
│   ✅ 隐私安全，数据不上传            │
│   ❌ 换设备或重装后会丢失            │
│                                      │
│ ☁️ 云端存储                          │
│   ✅ 跨设备同步，永久保存            │
│   ✅ 可以分享给其他人                │
│   ❌ 需要网络连接                    │
│   ❌ 占用服务器空间                  │
│                                      │
│         [知道了]                     │
└──────────────────────────────────────┘
```

### 附件显示

**缩略图视图**：
- 本地附件右下角显示 "📁 本地" 徽章
- 云端附件无徽章标识

**全屏查看**：
- 本地附件在底部显示文件路径
- 格式：`📁 /var/mobile/.../abc-def.jpg`

## 🔧 技术实现

### 依赖库
```json
{
  "react-native-fs": "^2.20.0",
  "react-native-image-picker": "^7.0.0"
}
```

### 核心服务

**LocalAttachmentService**
```typescript
class LocalAttachmentService {
  // 保存附件到本地
  async saveAttachment(
    transactionId: number,
    uri: string,
    fileName: string,
    fileType: string,
    fileSize: number,
    width?: number,
    height?: number
  ): Promise<LocalAttachment>

  // 获取交易的所有附件
  async getAttachments(transactionId: number): Promise<LocalAttachment[]>

  // 删除附件
  async deleteAttachment(transactionId: number, attachmentId: string): Promise<void>

  // 获取文件URI（用于展示）
  getFileUri(localPath: string): string

  // 清理孤立文件
  async cleanOrphanedFiles(): Promise<void>
}
```

### 统一数据模型

使用 `UnifiedAttachment` 联合类型处理两种存储：

```typescript
type UnifiedAttachment = Attachment | LocalAttachment;

// 类型判断
if (attachment.storageType === 'local') {
  // 本地附件逻辑
  const localPath = (attachment as LocalAttachment).localPath;
} else {
  // 云端附件逻辑
  const url = attachmentAPI.getDownloadUrl(attachment.id as number);
}
```

## 📱 使用流程

### 用户视角

1. **新增交易时**
   - 默认看到"本地存储"被选中
   - 如需云端同步，点击切换到"云端存储"
   - 不确定选哪个，点击"❓"查看说明

2. **选择图片后**
   - 本地存储：即时保存到手机，无需等待
   - 云端存储：显示上传进度

3. **查看附件时**
   - 本地附件：瞬间打开，显示本地路径
   - 云端附件：需加载，但可跨设备访问

### 开发者视角

**AddTransactionScreen 保存逻辑**：
```typescript
const saveAttachments = async (transactionId: number) => {
  if (storageType === 'cloud') {
    // 上传到服务器
    for (const att of attachments) {
      await attachmentAPI.upload(transactionId, formData);
    }
  } else {
    // 保存到本地
    for (const att of attachments) {
      await localAttachmentService.saveAttachment(
        transactionId,
        att.uri,
        att.fileName,
        att.type,
        att.fileSize
      );
    }
  }
};
```

**AttachmentGallery 加载逻辑**：
```typescript
const getFullImageUri = (attachment: UnifiedAttachment): string => {
  if (attachment.storageType === 'local') {
    return localAttachmentService.getFileUri(attachment.localPath);
  }
  return attachmentAPI.getDownloadUrl(attachment.id);
};
```

## ⚠️ 注意事项

### 本地存储限制
1. **设备空间**：确保用户有足够存储空间
2. **备份提醒**：建议用户定期备份设备
3. **迁移困难**：换设备时无法自动迁移

### 推荐使用场景

**推荐本地存储**：
- 个人记账
- 隐私要求高
- 网络不稳定
- 附件量大（节省服务器费用）

**推荐云端存储**：
- 多设备使用
- 共享账本
- 重要凭证需永久保存
- 网络条件好

## 🚀 未来优化

### 可能的增强功能
1. **混合模式**：允许同一交易部分附件本地、部分云端
2. **自动备份**：本地附件定期自动上传到云端
3. **智能建议**：根据用户习惯推荐存储方式
4. **批量迁移**：本地附件一键上传到云端
5. **压缩优化**：本地存储自动压缩大图片

### 性能监控
- 本地存储占用空间统计
- 云端存储使用量统计
- 附件访问速度对比

## 📊 数据迁移

### 从云端迁移到本地
```typescript
async function migrateCloudToLocal(transactionId: number) {
  const cloudAttachments = await attachmentAPI.list(transactionId);
  for (const att of cloudAttachments) {
    const blob = await attachmentAPI.download(att.id);
    await localAttachmentService.saveAttachment(...);
    await attachmentAPI.delete(att.id);
  }
}
```

### 从本地迁移到云端
```typescript
async function migrateLocalToCloud(transactionId: number) {
  const localAttachments = await localAttachmentService.getAttachments(transactionId);
  for (const att of localAttachments) {
    const formData = createFormData(att.localPath);
    await attachmentAPI.upload(transactionId, formData);
    await localAttachmentService.deleteAttachment(transactionId, att.id);
  }
}
```

## 🔍 调试技巧

### 查看本地文件
```bash
# iOS模拟器
open ~/Library/Developer/CoreSimulator/Devices/[DEVICE_ID]/data/Containers/Data/Application/[APP_ID]/Documents/attachments

# Android模拟器
adb shell run-as com.ledgeraiclient ls /data/data/com.ledgeraiclient/files/attachments
```

### 清空测试数据
```typescript
// 清空所有本地附件
await AsyncStorage.getAllKeys().then(keys => {
  const attachmentKeys = keys.filter(k => k.startsWith('transaction_attachments_'));
  return AsyncStorage.multiRemove(attachmentKeys);
});
await RNFS.unlink(`${RNFS.DocumentDirectoryPath}/attachments`);
```

## 📞 常见问题

**Q: 本地存储的附件会丢失吗？**
A: 只要不卸载App，附件就不会丢失。但换设备、重装App会丢失。

**Q: 可以混合使用两种存储吗？**
A: 当前版本不支持同一交易混合使用，但不同交易可以选择不同方式。

**Q: 云端存储会产生多少费用？**
A: 取决于使用量。假设平均每张图片300KB，1000张图片约300MB。

**Q: 如何选择存储方式？**
A: 如果只在一台设备上使用，推荐本地存储。如果需要多设备同步，选择云端存储。
