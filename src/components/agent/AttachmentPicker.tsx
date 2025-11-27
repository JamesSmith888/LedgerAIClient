/**
 * AttachmentPicker - 附件选择器组件
 * 
 * 可扩展的附件选择器，支持：
 * - 图片选择（相册/相机）
 * - 文件选择（预留）
 * - 更多类型扩展
 * 
 * 设计参考：Telegram/WeChat 附件选择面板
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  Platform,
  Alert,
} from 'react-native';
import {
  launchImageLibrary,
  launchCamera,
  ImagePickerResponse,
  Asset,
  MediaType,
} from 'react-native-image-picker';
import { Icon } from '../common';
import { PendingAttachment } from '../../types/agent';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows, FontWeights } from '../../constants/theme';

/**
 * 附件选择器选项
 */
export interface AttachmentOption {
  id: string;
  label: string;
  icon: string;
  color: string;
  /** 是否启用 */
  enabled?: boolean;
  /** 点击回调 */
  onPress?: () => void;
}

interface AttachmentPickerProps {
  /** 是否可见 */
  visible: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 选择附件回调 */
  onAttachmentSelected: (attachments: PendingAttachment[]) => void;
  /** 最大选择数量 */
  maxCount?: number;
  /** 自定义选项（扩展用） */
  customOptions?: AttachmentOption[];
}

/**
 * 生成唯一 ID
 */
const generateId = (): string => {
  return `attachment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 将 ImagePicker Asset 转换为 PendingAttachment
 */
const assetToAttachment = (asset: Asset): PendingAttachment => {
  return {
    id: generateId(),
    type: 'image',
    uri: asset.uri || '',
    name: asset.fileName || `image_${Date.now()}.jpg`,
    size: asset.fileSize,
    mimeType: asset.type,
    width: asset.width,
    height: asset.height,
    base64: asset.base64,
    uploadStatus: 'pending',
  };
};

export const AttachmentPicker: React.FC<AttachmentPickerProps> = ({
  visible,
  onClose,
  onAttachmentSelected,
  maxCount = 9,
  customOptions,
}) => {
  /**
   * 处理图片选择结果
   */
  const handleImageResult = useCallback((response: ImagePickerResponse) => {
    if (response.didCancel) {
      console.log('📷 用户取消了图片选择');
      return;
    }

    if (response.errorCode) {
      console.error('📷 图片选择错误:', response.errorCode, response.errorMessage);
      Alert.alert('错误', response.errorMessage || '选择图片失败');
      return;
    }

    if (response.assets && response.assets.length > 0) {
      const attachments = response.assets.map(assetToAttachment);
      console.log('📷 选择了', attachments.length, '张图片');
      onAttachmentSelected(attachments);
      onClose();
    }
  }, [onAttachmentSelected, onClose]);

  /**
   * 从相册选择图片
   */
  const handlePickFromGallery = useCallback(async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo' as MediaType,
        selectionLimit: maxCount,
        includeBase64: true, // 为 AI 处理准备
        quality: 0.8,
        maxWidth: 1920,
        maxHeight: 1920,
      });
      handleImageResult(result);
    } catch (error) {
      console.error('📷 打开相册失败:', error);
      Alert.alert('错误', '无法打开相册，请检查权限设置');
    }
  }, [maxCount, handleImageResult]);

  /**
   * 使用相机拍照
   */
  const handleTakePhoto = useCallback(async () => {
    try {
      const result = await launchCamera({
        mediaType: 'photo' as MediaType,
        includeBase64: true,
        quality: 0.8,
        maxWidth: 1920,
        maxHeight: 1920,
        saveToPhotos: false,
      });
      handleImageResult(result);
    } catch (error) {
      console.error('📷 打开相机失败:', error);
      Alert.alert('错误', '无法打开相机，请检查权限设置');
    }
  }, [handleImageResult]);

  /**
   * 默认选项
   */
  const defaultOptions: AttachmentOption[] = [
    {
      id: 'gallery',
      label: '相册',
      icon: 'images',
      color: Colors.accent.purple,
      enabled: true,
      onPress: handlePickFromGallery,
    },
    {
      id: 'camera',
      label: '拍照',
      icon: 'camera',
      color: Colors.accent.blue,
      enabled: true,
      onPress: handleTakePhoto,
    },
    {
      id: 'file',
      label: '文件',
      icon: 'document',
      color: Colors.accent.orange,
      enabled: false, // 暂未实现
      onPress: () => Alert.alert('提示', '文件选择功能开发中...'),
    },
    {
      id: 'location',
      label: '位置',
      icon: 'location',
      color: Colors.accent.green,
      enabled: false, // 暂未实现
      onPress: () => Alert.alert('提示', '位置分享功能开发中...'),
    },
  ];

  // 合并自定义选项
  const options = customOptions || defaultOptions;

  /**
   * 渲染选项按钮
   */
  const renderOption = (option: AttachmentOption) => {
    const isDisabled = option.enabled === false;
    
    return (
      <TouchableOpacity
        key={option.id}
        style={[styles.optionButton, isDisabled && styles.optionButtonDisabled]}
        onPress={option.onPress}
        disabled={isDisabled}
        activeOpacity={0.7}
      >
        <View style={[styles.optionIcon, { backgroundColor: option.color }]}>
          <Icon name={option.icon} size={24} color={Colors.surface} />
        </View>
        <Text style={[styles.optionLabel, isDisabled && styles.optionLabelDisabled]}>
          {option.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              {/* 拖动指示条 */}
              <View style={styles.dragIndicator} />
              
              {/* 标题 */}
              <Text style={styles.title}>添加附件</Text>
              
              {/* 选项网格 */}
              <View style={styles.optionsGrid}>
                {options.map(renderOption)}
              </View>
              
              {/* 取消按钮 */}
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelText}>取消</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.md,
    ...Shadows.lg,
  },
  dragIndicator: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    justifyContent: 'flex-start',
  },
  optionButton: {
    width: '25%',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  optionButtonDisabled: {
    opacity: 0.5,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  optionLabel: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    fontWeight: FontWeights.medium,
  },
  optionLabelDisabled: {
    color: Colors.textDisabled,
  },
  cancelButton: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    fontWeight: FontWeights.medium,
  },
});
