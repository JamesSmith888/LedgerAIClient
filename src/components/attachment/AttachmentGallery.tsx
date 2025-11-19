/**
 * 附件展示组件
 * 用于交易详情页展示附件
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Icon } from '../common';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../../constants/theme';
import { UnifiedAttachment, LocalAttachment } from '../../types/attachment';
import { attachmentAPI } from '../../api/services';
import { localAttachmentService } from '../../services/localAttachmentService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const THUMBNAIL_SIZE = 80;

interface AttachmentGalleryProps {
  attachments: UnifiedAttachment[];
  onDelete?: (attachmentId: number | string) => void;
  editable?: boolean;
  hideThumbnails?: boolean; // 隐藏缩略图网格，仅用于全屏查看
  externalSelectedIndex?: number | null; // 外部控制的选中索引
  onCloseFullscreen?: () => void; // 全屏关闭回调
}

export const AttachmentGallery: React.FC<AttachmentGalleryProps> = ({
  attachments,
  onDelete,
  editable = false,
  hideThumbnails = false,
  externalSelectedIndex,
  onCloseFullscreen,
}) => {
  const [internalSelectedIndex, setInternalSelectedIndex] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 使用外部控制的索引或内部状态
  const selectedIndex = externalSelectedIndex !== undefined ? externalSelectedIndex : internalSelectedIndex;
  const setSelectedIndex = externalSelectedIndex !== undefined
    ? (index: number | null) => {
        if (index === null && onCloseFullscreen) {
          onCloseFullscreen();
        }
      }
    : setInternalSelectedIndex;

  const handleDelete = async (attachmentId: number | string) => {
    Alert.alert(
      '删除附件',
      '确定要删除这个附件吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              
              // 根据附件类型调用不同的删除方法
              const attachment = attachments.find(a => a.id === attachmentId);
              if (attachment?.storageType === 'local') {
                await localAttachmentService.deleteAttachment(
                  attachment.transactionId,
                  attachmentId as string
                );
              } else {
                await attachmentAPI.delete(attachmentId as number);
              }
              
              onDelete?.(attachmentId);
              setSelectedIndex(null);
            } catch (error) {
              console.error('删除附件失败:', error);
              Alert.alert('错误', '删除附件失败，请稍后重试');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  // 获取图片URI
  const getImageUri = (attachment: UnifiedAttachment): string => {
    if (attachment.storageType === 'local') {
      return localAttachmentService.getFileUri((attachment as LocalAttachment).localPath);
    }
    return attachmentAPI.getThumbnailUrl(attachment.id as number);
  };

  // 获取完整图片URI
  const getFullImageUri = (attachment: UnifiedAttachment): string => {
    if (attachment.storageType === 'local') {
      return localAttachmentService.getFileUri((attachment as LocalAttachment).localPath);
    }
    return attachmentAPI.getDownloadUrl(attachment.id as number);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  if (attachments.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {!hideThumbnails && (
        <View style={styles.header}>
          <Icon name="images" size={20} color={Colors.primary} />
          <Text style={styles.headerText}>图片附件 ({attachments.length})</Text>
        </View>
      )}

      {!hideThumbnails && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbnailsContainer}
        >
          {attachments.map((attachment, index) => (
            <TouchableOpacity
              key={attachment.id}
              style={styles.thumbnailWrapper}
              onPress={() => setSelectedIndex(index)}
            >
              <Image
                source={{ uri: getImageUri(attachment) }}
                style={styles.thumbnail}
              />
              <View style={styles.thumbnailOverlay}>
                <Icon name="expand" size={20} color={Colors.surface} />
                {attachment.storageType === 'local' && (
                  <View style={styles.localBadge}>
                    <Text style={styles.localBadgeText}>本地</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* 全屏查看器 */}
      <Modal
        visible={selectedIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedIndex(null)}
      >
        <View style={styles.modalContainer}>
          {/* 顶部工具栏 */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedIndex(null)}
            >
              <Icon name="close" size={28} color={Colors.surface} />
            </TouchableOpacity>

            <View style={styles.modalTitle}>
              <Text style={styles.modalTitleText}>
                {selectedIndex !== null ? selectedIndex + 1 : 0} / {attachments.length}
              </Text>
            </View>

            {editable && selectedIndex !== null && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(attachments[selectedIndex].id)}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator color={Colors.surface} />
                ) : (
                  <Icon name="trash" size={24} color={Colors.surface} />
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* 图片内容 */}
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              if (newIndex !== selectedIndex) {
                setSelectedIndex(newIndex);
              }
            }}
            scrollEventThrottle={16}
            contentOffset={{ x: (selectedIndex || 0) * SCREEN_WIDTH, y: 0 }}
          >
            {attachments.map((attachment) => (
              <View key={attachment.id} style={styles.imageContainer}>
                <Image
                  source={{ uri: getFullImageUri(attachment) }}
                  style={styles.fullImage}
                  resizeMode="contain"
                />
              </View>
            ))}
          </ScrollView>

          {/* 底部信息 */}
          {selectedIndex !== null && (
            <View style={styles.modalFooter}>
              <Text style={styles.fileName}>
                {attachments[selectedIndex].fileName}
              </Text>
              <Text style={styles.fileInfo}>
                {formatFileSize(attachments[selectedIndex].fileSize)}
                {attachments[selectedIndex].width && attachments[selectedIndex].height && (
                  <Text>
                    {' • '}
                    {attachments[selectedIndex].width} × {attachments[selectedIndex].height}
                  </Text>
                )}
              </Text>
              {/* 显示本地存储路径 */}
              {attachments[selectedIndex].storageType === 'local' && (
                <View style={styles.localPathContainer}>
                  <Icon name="folder" size={14} color={Colors.textLight} />
                  <Text style={styles.localPathText} numberOfLines={1}>
                    {(attachments[selectedIndex] as LocalAttachment).localPath}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  headerText: {
    fontSize: FontSizes.md,
    color: Colors.text,
    marginLeft: Spacing.xs,
  },
  thumbnailsContainer: {
    paddingHorizontal: Spacing.sm,
    gap: Spacing.sm,
  },
  thumbnailWrapper: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: Colors.border,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  thumbnailOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    flex: 1,
    alignItems: 'center',
  },
  modalTitleText: {
    fontSize: FontSizes.lg,
    color: Colors.surface,
    fontWeight: '600',
  },
  deleteButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 200,
  },
  modalFooter: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  fileName: {
    fontSize: FontSizes.md,
    color: Colors.surface,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  fileInfo: {
    fontSize: FontSizes.sm,
    color: Colors.textLight,
    textAlign: 'center',
  },
  localBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  localBadgeText: {
    fontSize: 10,
    color: Colors.surface,
  },
  localPathContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  localPathText: {
    flex: 1,
    fontSize: FontSizes.xs,
    color: Colors.textLight,
  },
});
