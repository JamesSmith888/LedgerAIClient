# 交易附件功能实现文档

## 📋 功能概述

为交易记录添加图片附件功能，支持：
- ✅ 上传多张图片（最多9张）
- ✅ 图片大小限制（5MB/张）
- ✅ 自动生成缩略图
- ✅ 全屏查看图片
- ✅ 删除附件
- ✅ 预留扩展其他文件类型

## 🏗️ 架构设计

### 数据库设计

**独立表设计** - 使用 `transaction_attachment` 独立表存储附件，避免影响 `transaction` 表性能

```sql
CREATE TABLE transaction_attachment (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    transaction_id BIGINT NOT NULL,          -- 关联交易ID
    file_name VARCHAR(255) NOT NULL,         -- 文件名
    file_type VARCHAR(100) NOT NULL,         -- MIME类型
    file_size BIGINT NOT NULL,               -- 文件大小（字节）
    file_data MEDIUMBLOB NOT NULL,           -- 文件数据（最大16MB）
    thumbnail_data BLOB,                     -- 缩略图（仅图片，最大64KB）
    width INT,                               -- 图片宽度
    height INT,                              -- 图片高度
    uploaded_by_user_id BIGINT NOT NULL,     -- 上传用户ID
    create_time DATETIME,
    update_time DATETIME,
    delete_time DATETIME,                    -- 逻辑删除
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_uploaded_by_user_id (uploaded_by_user_id)
);
```

**设计考虑**：
1. **性能优化**：独立表避免JOIN，支持懒加载
2. **缩略图**：200x200px JPEG，减少列表加载数据量
3. **存储限制**：MEDIUMBLOB支持16MB，实际限制5MB
4. **索引优化**：transaction_id索引加速查询

### 后端实现

#### 1. Entity层
`TransactionAttachmentEntity.java` - JPA实体

```java
@Entity(name = "transaction_attachment")
public class TransactionAttachmentEntity extends BaseEntity {
    private Long transactionId;
    private String fileName;
    private String fileType;
    private Long fileSize;
    
    @Lob
    private byte[] fileData;        // 原始文件
    
    @Lob
    private byte[] thumbnailData;   // 缩略图
    
    private Integer width;
    private Integer height;
    private Long uploadedByUserId;
}
```

#### 2. Repository层
`TransactionAttachmentRepository.java`

```java
@Repository
public interface TransactionAttachmentRepository extends JpaRepository<...> {
    // 查询元数据（不含文件数据）
    List<TransactionAttachmentEntity> findMetadataByTransactionId(Long transactionId);
    
    // 统计数量和大小
    long countByTransactionId(Long transactionId);
    long sumFileSizeByTransactionId(Long transactionId);
}
```

#### 3. Service层
`TransactionAttachmentService.java` - 核心业务逻辑

**关键功能**：
- ✅ 文件验证（类型、大小）
- ✅ 图片压缩和缩略图生成
- ✅ 权限验证
- ✅ 事务管理

```java
@Component
public class TransactionAttachmentService {
    // 文件大小限制
    private static final long MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
    
    // 支持的图片类型
    private static final List<String> SUPPORTED_IMAGE_TYPES = Arrays.asList(
        "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"
    );
    
    @Transactional
    public TransactionAttachmentEntity uploadAttachment(Long transactionId, MultipartFile file) {
        // 1. 验证交易存在
        // 2. 验证用户权限
        // 3. 验证文件类型和大小
        // 4. 生成缩略图（仅图片）
        // 5. 保存到数据库
    }
    
    private byte[] generateThumbnail(BufferedImage originalImage) {
        // 保持比例缩放到 200x200
        // 使用双线性插值提高质量
        // 转换为JPEG格式
    }
}
```

#### 4. Controller层
`TransactionController.java` - REST API

```java
// 上传附件
POST /api/transactions/{transactionId}/attachments
Content-Type: multipart/form-data

// 获取附件列表（元数据）
GET /api/transactions/{transactionId}/attachments

// 下载完整文件
GET /api/transactions/attachments/{attachmentId}/download

// 获取缩略图
GET /api/transactions/attachments/{attachmentId}/thumbnail

// 删除附件
DELETE /api/transactions/attachments/{attachmentId}
```

### 前端实现

#### 1. 类型定义
`src/types/attachment.ts`

```typescript
export interface Attachment {
  id: number;
  transactionId: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  width?: number;
  height?: number;
  hasThumbnail: boolean;
}
```

#### 2. API客户端
`src/api/services/attachmentAPI.ts`

```typescript
export const attachmentAPI = {
  upload: (transactionId: number, file: FormData) => {...},
  list: (transactionId: number) => {...},
  getThumbnailUrl: (attachmentId: number) => string,
  getDownloadUrl: (attachmentId: number) => string,
  delete: (attachmentId: number) => {...},
};
```

#### 3. 组件实现

**ImageAttachmentPicker** - 图片选择器（Google/Telegram风格）

```tsx
<ImageAttachmentPicker
  images={attachments}
  onImagesChange={setAttachments}
  maxImages={9}
  maxSizeInMB={5}
/>
```

特性：
- 📷 横向滚动网格布局
- 🖼️ 实时预览缩略图
- 🗑️ 一键删除
- 📊 显示文件大小
- ⚠️ 尺寸和数量限制提示

**AttachmentGallery** - 附件展示组件

```tsx
<AttachmentGallery
  attachments={attachments}
  onDelete={handleDelete}
  editable={true}
/>
```

特性：
- 🖼️ 缩略图列表展示
- 🔍 点击全屏查看
- 👆 左右滑动浏览
- 🗑️ 长按删除（可编辑模式）
- 📏 显示尺寸和大小信息

## 🚀 使用指南

### 前置条件

1. **安装依赖**：
```bash
npm install react-native-image-picker
# iOS
cd ios && pod install
```

2. **配置权限**：

**iOS** - `ios/LedgerAIClient/Info.plist`：
```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>需要访问相册来上传图片</string>
<key>NSCameraUsageDescription</key>
<string>需要使用相机拍照</string>
```

**Android** - `android/app/src/main/AndroidManifest.xml`：
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
```

### 在交易创建页面使用

```tsx
import { ImageAttachmentPicker } from '../components/attachment';
import { attachmentAPI } from '../api/services';

// 1. 添加状态
const [attachments, setAttachments] = useState<ImageAttachment[]>([]);

// 2. 添加组件
<ImageAttachmentPicker
  images={attachments}
  onImagesChange={setAttachments}
/>

// 3. 提交时上传
const handleSave = async () => {
  // 先创建交易
  const transaction = await transactionAPI.create(data);
  
  // 再上传附件
  for (const attachment of attachments) {
    const formData = new FormData();
    formData.append('file', {
      uri: attachment.uri,
      type: attachment.type || 'image/jpeg',
      name: attachment.fileName || 'image.jpg',
    });
    await attachmentAPI.upload(transaction.id, formData);
  }
};
```

### 在交易详情页面展示

```tsx
import { AttachmentGallery } from '../components/attachment';

// 1. 加载附件列表
const [attachments, setAttachments] = useState<Attachment[]>([]);

useEffect(() => {
  const loadAttachments = async () => {
    const list = await attachmentAPI.list(transactionId);
    setAttachments(list);
  };
  loadAttachments();
}, [transactionId]);

// 2. 显示组件
<AttachmentGallery
  attachments={attachments}
  onDelete={(id) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  }}
  editable={canEdit}
/>
```

## 📊 性能优化策略

### 1. 数据加载优化
- **懒加载**：附件列表仅返回元数据，不包含文件数据
- **缩略图**：列表显示200x200缩略图（<10KB），减少传输量
- **按需加载**：全屏查看时才加载完整文件

### 2. 缓存策略
```tsx
// 缩略图设置HTTP缓存
headers.setCacheControl("max-age=86400"); // 缓存1天
```

### 3. 数据库优化
- 独立表避免影响transaction表查询性能
- transaction表添加attachmentCount字段，避免JOIN
- 适当的索引提升查询速度

### 4. 前端优化
- 图片压缩：上传前压缩到1920px以内
- 质量控制：质量设置0.8，平衡大小和清晰度
- 批量上传：并行上传提高效率

## 🔒 安全考虑

### 1. 权限验证
```java
// 上传：需要对交易的编辑权限
if (!hasTransactionEditPermission(transaction.getLedgerId(), currentUserId)) {
    throw new BusinessException("无权限上传附件");
}

// 删除：仅上传者可删除
if (!currentUserId.equals(attachment.getUploadedByUserId())) {
    throw new BusinessException("无权限删除该附件");
}
```

### 2. 文件验证
- 类型白名单：仅允许图片类型
- 大小限制：单文件5MB，单交易总计50MB
- MIME类型验证：防止伪造文件类型

### 3. 防止注入
- 文件名过滤和转义
- 使用参数化查询
- 逻辑删除而非物理删除

## 🔮 未来扩展

### 1. 支持更多文件类型
```java
// 预留的文件类型支持
private static final List<String> SUPPORTED_DOCUMENT_TYPES = Arrays.asList(
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
);
```

### 2. 云存储迁移
考虑迁移到OSS（对象存储服务）：
- 减轻数据库压力
- 更好的扩展性
- CDN加速

### 3. 图片识别
- OCR识别票据信息
- 自动填充金额、商家等信息
- AI分类建议

### 4. 批量操作
- 批量上传
- 批量下载
- 批量删除

## 📝 注意事项

1. **生产环境配置**
   - 修改文件大小限制
   - 配置Spring Boot文件上传大小：
     ```yaml
     spring:
       servlet:
         multipart:
           max-file-size: 10MB
           max-request-size: 50MB
     ```

2. **数据库维护**
   - 定期清理逻辑删除的附件
   - 监控存储空间使用情况
   - 考虑归档策略

3. **监控和告警**
   - 监控上传失败率
   - 监控平均文件大小
   - 设置存储空间告警

## 🐛 常见问题

**Q: 为什么附件存在MySQL而不是文件系统？**
A: 
- 简化部署和备份
- 事务一致性保证
- 小规模应用足够（预留云存储迁移）

**Q: 如何处理大文件？**
A: 
- 前端限制5MB/张
- 后端验证文件大小
- 考虑使用流式上传

**Q: 图片压缩会损失质量吗？**
A: 
- 缩略图使用JPEG压缩，质量损失可接受
- 原图保持原始质量
- 可调整质量参数平衡

## 🎨 UI/UX设计参考

- **Google Photos**：网格布局、滑动查看
- **Telegram**：简洁的附件选择器
- **微信**：图片预览和编辑

## 📚 相关文档

- [React Native Image Picker](https://github.com/react-native-image-picker/react-native-image-picker)
- [Spring Boot File Upload](https://spring.io/guides/gs/uploading-files/)
- [MySQL BLOB Types](https://dev.mysql.com/doc/refman/8.0/en/blob.html)
