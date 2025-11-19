# 附件点击放大功能

## 功能概述

在交易详情编辑模式下，用户可以点击附件图片进行放大/全屏查看。

## 实现细节

### 1. 组件使用

在 `AddTransactionScreen.tsx` 中集成了 `AttachmentGallery` 组件：

```typescript
{isEditMode && loadedAttachments.length > 0 && (
  <AttachmentGallery
    attachments={loadedAttachments}
    editable={true}
    onDelete={async (attachmentId) => {
      // 删除逻辑
    }}
  />
)}
```

### 2. 数据流程

#### 加载附件

编辑模式下，useEffect 自动加载附件：

1. **本地附件优先**：
   - 调用 `localAttachmentService.getAttachments(transactionId)`
   - 转换为 `UnifiedAttachment[]` 格式
   - 设置 `loadedAttachments` 状态

2. **云端附件回退**：
   - 如果没有本地附件，调用 `attachmentAPI.list(transactionId)`
   - API 返回的已是完整的 `Attachment[]` 格式
   - 直接设置 `loadedAttachments`

#### 显示附件

- `AttachmentGallery` 接收 `UnifiedAttachment[]` 数组
- 显示为缩略图网格
- 点击任意图片，打开全屏模态框
- 支持左右滑动浏览

#### 删除附件

- 根据 `storageType` 判断删除方式：
  - `'local'`: 调用 `localAttachmentService.deleteAttachment()`
  - `'cloud'`: 调用 `attachmentAPI.delete()`
- 删除后重新加载附件列表，刷新显示

### 3. 状态管理

新增状态：

```typescript
const [loadedAttachments, setLoadedAttachments] = useState<UnifiedAttachment[]>([]);
```

- **用途**：存储编辑模式下已有的附件（UnifiedAttachment 格式）
- **更新时机**：
  - 页面加载时（useEffect）
  - 删除附件后（onDelete 回调）

### 4. UI 布局

```
+----------------------------------+
| 📷 已有附件 (可点击放大)         |
| +--------+  +--------+           |
| | 图片1  |  | 图片2  |           |
| +--------+  +--------+           |
+----------------------------------+
| 📷 新增附件                      |
| [添加图片按钮]  📱本地 ☁️云端 ?  |
+----------------------------------+
```

- **已有附件**：AttachmentGallery 显示，支持点击放大和删除
- **新增附件**：ImageAttachmentPicker 允许继续添加新图片

## 技术要点

### UnifiedAttachment 类型

```typescript
type UnifiedAttachment = Attachment | LocalAttachment;

interface Attachment {
  id: number;
  transactionId: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  width?: number;
  height?: number;
  uploadedByUserId: number;
  createTime: string;
  hasThumbnail: boolean;
  storageType: 'cloud';
}

interface LocalAttachment {
  id: string;
  transactionId: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  width?: number;
  height?: number;
  localPath: string;
  thumbnailPath?: string;
  createTime: string;
  storageType: 'local';
}
```

### AttachmentGallery Props

```typescript
interface AttachmentGalleryProps {
  attachments: UnifiedAttachment[];
  editable?: boolean;
  onDelete?: (attachmentId: number | string) => void;
}
```

## 用户体验

1. **编辑交易时**，自动加载并展示已有附件
2. **点击图片**，全屏查看高清大图
3. **左右滑动**，浏览多张图片
4. **长按或点击删除按钮**，可以删除附件
5. **继续使用 ImageAttachmentPicker**，可以添加新附件

## 注意事项

1. **仅在编辑模式显示**：`isEditMode && loadedAttachments.length > 0`
2. **支持双存储模式**：自动识别本地/云端附件，使用对应的删除方法
3. **删除后自动刷新**：重新加载附件列表，保持数据一致性
4. **不影响新增功能**：ImageAttachmentPicker 依然可用，可以继续添加新附件
