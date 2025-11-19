# 附件功能优化 - 可折叠与点击放大

## 更新内容

### 1. 创建可复用的折叠组件 `CollapsibleSection`

**位置**: `src/components/common/CollapsibleSection.tsx`

**功能**:
- 支持任意内容的折叠/展开
- 可配置标题、图标、默认状态
- 支持徽章数量显示
- 平滑动画效果（使用 LayoutAnimation）
- 可在多处复用

**用法示例**:
```tsx
<CollapsibleSection
  title="附件"
  icon="paperclip"
  defaultCollapsed={true}
  badge={attachments.length}
>
  <YourContent />
</CollapsibleSection>
```

**Props**:
- `title: string` - 区域标题
- `icon?: string` - Material Community Icons 图标名
- `defaultCollapsed?: boolean` - 默认是否折叠
- `badge?: number` - 徽章数量（可选）
- `children: React.ReactNode` - 折叠区域的内容

### 2. 附件区域默认折叠

**变更**: 
- 在 `AddTransactionScreen` 中使用 `CollapsibleSection` 包裹附件选择器
- 默认状态: `defaultCollapsed={true}`
- 徽章显示附件数量: `badge={attachments.length}`

**效果**:
```
┌─────────────────────────────────┐
│ 📎 附件 3                    ▼ │  ← 点击展开/折叠
└─────────────────────────────────┘
```

展开后:
```
┌─────────────────────────────────┐
│ 📎 附件 3                    ▲ │
├─────────────────────────────────┤
│ [图片选择器和已有图片]          │
└─────────────────────────────────┘
```

### 3. 复用图片缩略图进行点击放大

**优化前**:
- AttachmentGallery 显示一个独立的缩略图网格
- ImageAttachmentPicker 显示另一个缩略图网格
- 有两组重复的图片显示

**优化后**:
- 只显示 ImageAttachmentPicker 中的缩略图
- 点击缩略图直接打开全屏查看
- AttachmentGallery 设置 `hideThumbnails={true}`，只提供全屏查看功能

**技术实现**:

#### 3.1 ImageAttachmentPicker 添加点击回调

```tsx
interface ImageAttachmentPickerProps {
  // ... 其他 props
  onImagePress?: (index: number) => void; // 点击图片回调
}

// 渲染部分
<TouchableOpacity
  activeOpacity={0.8}
  onPress={() => onImagePress?.(index)}
>
  <Image source={{ uri: image.uri }} style={styles.image} />
</TouchableOpacity>
```

#### 3.2 AttachmentGallery 支持外部控制

新增 Props:
- `hideThumbnails?: boolean` - 隐藏缩略图网格，只提供模态框
- `externalSelectedIndex?: number | null` - 外部控制的选中索引
- `onCloseFullscreen?: () => void` - 全屏关闭回调

内部逻辑:
```tsx
const selectedIndex = externalSelectedIndex !== undefined 
  ? externalSelectedIndex 
  : internalSelectedIndex;

const setSelectedIndex = externalSelectedIndex !== undefined
  ? (index: number | null) => {
      if (index === null && onCloseFullscreen) {
        onCloseFullscreen();
      }
    }
  : setInternalSelectedIndex;
```

#### 3.3 AddTransactionScreen 协调两个组件

```tsx
// 状态
const [showGallery, setShowGallery] = useState(false);
const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);

// ImageAttachmentPicker
<ImageAttachmentPicker
  images={attachments}
  onImagesChange={setAttachments}
  onImagePress={(index) => {
    setGalleryInitialIndex(index);
    setShowGallery(true);
  }}
  // ...其他props
/>

// AttachmentGallery (隐藏缩略图)
<AttachmentGallery
  attachments={loadedAttachments}
  hideThumbnails={true}
  externalSelectedIndex={showGallery ? galleryInitialIndex : null}
  onCloseFullscreen={() => setShowGallery(false)}
  // ...其他props
/>
```

## UI 流程

### 新建交易
1. 默认"附件"区域折叠，只显示标题和徽章 `📎 附件 0 ▼`
2. 点击标题展开，显示 ImageAttachmentPicker
3. 添加图片后，徽章更新 `📎 附件 3 ▼`
4. 点击任意缩略图 → 打开全屏查看
5. 可左右滑动、删除、关闭

### 编辑交易
1. 加载已有附件到 `loadedAttachments`（UnifiedAttachment[]）
2. 同时更新 `attachments`（简单格式，用于 ImageAttachmentPicker 显示）
3. 附件区域显示徽章 `📎 附件 3 ▼`
4. 展开后，ImageAttachmentPicker 显示现有图片
5. 点击图片 → 全屏查看（从 loadedAttachments 加载完整信息）
6. 可以删除已有附件或添加新附件

## 数据流

```
编辑模式加载:
  ↓
localAttachmentService.getAttachments()
  or
attachmentAPI.list()
  ↓
loadedAttachments (UnifiedAttachment[]) ← 完整信息，用于全屏查看
  ↓
attachments (简单格式) ← 只包含 uri/fileName，用于 ImageAttachmentPicker 显示
```

点击图片:
```
ImageAttachmentPicker 缩略图
  ↓
onImagePress(index)
  ↓
setGalleryInitialIndex(index)
setShowGallery(true)
  ↓
AttachmentGallery 接收 externalSelectedIndex
  ↓
显示全屏模态框，从 loadedAttachments[index] 获取完整信息
```

## 优势

1. **UI 简洁**: 只有一组缩略图，不重复显示
2. **操作流畅**: 直接点击即可放大，无需额外步骤
3. **可复用**: CollapsibleSection 可用于其他需要折叠的区域（如备注、标签等）
4. **性能优化**: 减少了重复的图片渲染
5. **默认收起**: 不常用的附件功能不占用屏幕空间

## 文件变更清单

### 新增文件
- `src/components/common/CollapsibleSection.tsx` - 折叠组件

### 修改文件
- `src/components/common/index.ts` - 导出 CollapsibleSection
- `src/components/attachment/ImageAttachmentPicker.tsx` - 添加 onImagePress
- `src/components/attachment/AttachmentGallery.tsx` - 添加外部控制和隐藏缩略图
- `src/screens/AddTransactionScreen.tsx` - 集成折叠和点击放大功能

## 后续可扩展

CollapsibleSection 可用于:
- ✅ 附件区域
- 🔄 备注区域
- 🔄 标签区域
- 🔄 高级设置
- 🔄 重复交易设置

统一的折叠交互，提升用户体验一致性。
