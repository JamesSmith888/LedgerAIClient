/**
 * AttachmentPreview - 附件预览组件
 * 
 * 用于在输入栏上方显示待发送的附件预览
 * 支持：
 * - 图片缩略图显示
 * - 删除附件
 * - 多附件横向滚动
 * - 上传进度显示（预留）
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Icon } from '../common';
import { PendingAttachment } from '../../types/agent';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows, FontWeights } from '../../constants/theme';

interface AttachmentPreviewProps {
  /** 附件列表 */
  attachments: PendingAttachment[];
  /** 删除附件回调 */
  onRemove: (attachmentId: string) => void;
  /** 点击附件回调（用于全屏预览） */
  onPress?: (attachment: PendingAttachment) => void;
  /** 是否显示上传进度 */
  showProgress?: boolean;
}

export const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({
  attachments,
  onRemove,
  onPress,
  showProgress = false,
}) => {
  if (attachments.length === 0) {
    return null;
  }

  /**
   * 渲染单个图片附件
   */
  const renderImageAttachment = (attachment: PendingAttachment) => {
    const isUploading = attachment.uploadStatus === 'uploading';
    const hasError = attachment.uploadStatus === 'error';

    return (
      <View key={attachment.id} style={styles.attachmentItem}>
        <TouchableOpacity
          style={styles.imageContainer}
          onPress={() => onPress?.(attachment)}
          activeOpacity={0.9}
        >
          <Image
            source={{ uri: attachment.uri }}
            style={styles.image}
            resizeMode="cover"
          />
          
          {/* 上传状态遮罩 */}
          {(isUploading || hasError) && (
            <View style={styles.statusOverlay}>
              {isUploading && (
                <>
                  <ActivityIndicator size="small" color={Colors.surface} />
                  {showProgress && attachment.uploadProgress !== undefined && (
                    <Text style={styles.progressText}>
                      {attachment.uploadProgress}%
                    </Text>
                  )}
                </>
              )}
              {hasError && (
                <Icon name="alert-circle" size={24} color={Colors.error} />
              )}
            </View>
          )}
        </TouchableOpacity>

        {/* 删除按钮 */}
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => onRemove(attachment.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="close-circle" size={20} color={Colors.surface} />
        </TouchableOpacity>
      </View>
    );
  };

  /**
   * 渲染文件附件（预留）
   */
  const renderFileAttachment = (attachment: PendingAttachment) => {
    return (
      <View key={attachment.id} style={styles.attachmentItem}>
        <View style={styles.fileContainer}>
          <Icon name="document" size={28} color={Colors.primary} />
          <Text style={styles.fileName} numberOfLines={1}>
            {attachment.name || '未知文件'}
          </Text>
          {attachment.size && (
            <Text style={styles.fileSize}>
              {formatFileSize(attachment.size)}
            </Text>
          )}
        </View>

        {/* 删除按钮 */}
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => onRemove(attachment.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="close-circle" size={20} color={Colors.surface} />
        </TouchableOpacity>
      </View>
    );
  };

  /**
   * 渲染附件
   */
  const renderAttachment = (attachment: PendingAttachment) => {
    switch (attachment.type) {
      case 'image':
        return renderImageAttachment(attachment);
      case 'file':
        return renderFileAttachment(attachment);
      default:
        return renderFileAttachment(attachment);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {attachments.map(renderAttachment)}
      </ScrollView>
      
      {/* 附件数量提示 */}
      {attachments.length > 1 && (
        <Text style={styles.countText}>
          {attachments.length} 个附件
        </Text>
      )}
    </View>
  );
};

/**
 * 格式化文件大小
 */
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,  // 增加顶部间距，给删除按钮留出空间
    paddingBottom: Spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,  // 额外的顶部内边距
  },
  attachmentItem: {
    marginRight: Spacing.sm,
    position: 'relative',
    paddingTop: 8,  // 给删除按钮留出顶部空间
    paddingRight: 8, // 给删除按钮留出右侧空间
  },
  
  // 图片样式
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: Colors.backgroundSecondary,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  statusOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    color: Colors.surface,
    fontSize: FontSizes.xs,
    marginTop: Spacing.xs,
  },
  
  // 文件样式
  fileContainer: {
    width: 100,
    height: 80,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundSecondary,
    padding: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileName: {
    fontSize: FontSizes.xs,
    color: Colors.text,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  fileSize: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  
  // 删除按钮 - 相对于 attachmentItem 的 padding 定位
  removeButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
    zIndex: 10,
  },
  
  // 数量提示
  countText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});
