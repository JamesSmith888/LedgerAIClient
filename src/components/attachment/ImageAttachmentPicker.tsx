/**
 * 图片附件选择器组件
 * Google/Telegram 风格的图片选择器
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { launchImageLibrary, ImagePickerResponse, Asset } from 'react-native-image-picker';
import { Icon } from '../common';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius, Shadows } from '../../constants/theme';
import { StorageType } from '../../types/attachment';
import { StorageTypeSelector } from './StorageTypeSelector';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_SIZE = (SCREEN_WIDTH - Spacing.lg * 3) / 3; // 3列网格

interface ImageAttachment {
  uri: string;
  fileName?: string;
  type?: string;
  fileSize?: number;
  width?: number;
  height?: number;
}

interface ImageAttachmentPickerProps {
  images: ImageAttachment[];
  onImagesChange: (images: ImageAttachment[]) => void;
  storageType: StorageType;
  onStorageTypeChange: (type: StorageType) => void;
  maxImages?: number;
  maxSizeInMB?: number;
  onImagePress?: (index: number) => void; // 点击图片回调
}

export const ImageAttachmentPicker: React.FC<ImageAttachmentPickerProps> = ({
  images,
  onImagesChange,
  storageType,
  onStorageTypeChange,
  maxImages = 9,
  maxSizeInMB = 5,
  onImagePress,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  // 请求 Android 权限
  const requestAndroidPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      if (Platform.Version >= 33) {
        // Android 13+ 使用新的媒体权限
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          {
            title: '访问相册权限',
            message: '需要访问您的相册以选择图片',
            buttonNeutral: '稍后询问',
            buttonNegative: '拒绝',
            buttonPositive: '允许',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        // Android 12 及以下使用旧权限
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          {
            title: '访问相册权限',
            message: '需要访问您的相册以选择图片',
            buttonNeutral: '稍后询问',
            buttonNegative: '拒绝',
            buttonPositive: '允许',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (err) {
      console.warn('权限请求失败:', err);
      return false;
    }
  };

  const handlePickImage = async () => {
    if (images.length >= maxImages) {
      Alert.alert('提示', `最多只能上传 ${maxImages} 张图片`);
      return;
    }

    try {
      setIsLoading(true);

      // Android 需要请求权限
      if (Platform.OS === 'android') {
        const hasPermission = await requestAndroidPermissions();
        if (!hasPermission) {
          Alert.alert('权限被拒绝', '需要相册访问权限才能选择图片');
          setIsLoading(false);
          return;
        }
      }
      
      const result: ImagePickerResponse = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1920,
        maxHeight: 1920,
        selectionLimit: maxImages - images.length,
        includeBase64: false,
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        Alert.alert('错误', result.errorMessage || '选择图片失败');
        return;
      }

      if (result.assets) {
        const validAssets: ImageAttachment[] = [];
        
        for (const asset of result.assets) {
          // 检查文件大小
          const fileSizeInMB = (asset.fileSize || 0) / (1024 * 1024);
          if (fileSizeInMB > maxSizeInMB) {
            Alert.alert('提示', `图片 ${asset.fileName} 超过 ${maxSizeInMB}MB，已跳过`);
            continue;
          }

          if (asset.uri) {
            validAssets.push({
              uri: asset.uri,
              fileName: asset.fileName,
              type: asset.type,
              fileSize: asset.fileSize,
              width: asset.width,
              height: asset.height,
            });
          }
        }

        if (validAssets.length > 0) {
          onImagesChange([...images, ...validAssets]);
        }
      }
    } catch (error) {
      console.error('选择图片失败:', error);
      Alert.alert('错误', '选择图片失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onImagesChange(newImages);
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="images" size={18} color={Colors.textSecondary} />
          <Text style={styles.headerText}>图片附件</Text>
          <Text style={styles.countText}>
            {images.length}/{maxImages}
          </Text>
        </View>
        
        {/* 存储类型选择器 */}
        <StorageTypeSelector
          selectedType={storageType}
          onTypeChange={onStorageTypeChange}
          showCompactMode={true}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.imagesContainer}
      >
        {images.map((image, index) => (
          <View key={index} style={styles.imageWrapper}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onImagePress?.(index)}
            >
              <Image source={{ uri: image.uri }} style={styles.image} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoveImage(index)}
            >
              <Icon name="close-circle" size={24} color={Colors.surface} />
            </TouchableOpacity>
            {image.fileSize && (
              <View style={styles.fileSizeBadge}>
                <Text style={styles.fileSizeText}>
                  {formatFileSize(image.fileSize)}
                </Text>
              </View>
            )}
          </View>
        ))}

        {images.length < maxImages && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={handlePickImage}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <>
                <Icon name="add" size={32} color={Colors.primary} />
                <Text style={styles.addButtonText}>添加图片</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      {images.length > 0 && (
        <Text style={styles.hint}>
          💡 点击图片右上角可删除，支持 JPG、PNG 格式，单张最大 {maxSizeInMB}MB
          {storageType === 'local' && '\n📱 文件将保存在手机本地，卸载应用会丢失'}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  headerText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    fontWeight: FontWeights.medium,
  },
  countText: {
    fontSize: FontSizes.xs,
    color: Colors.textLight,
  },
  imagesContainer: {
    paddingHorizontal: Spacing.sm,
    gap: Spacing.sm,
  },
  imageWrapper: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.border,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeButton: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
  },
  fileSizeBadge: {
    position: 'absolute',
    bottom: Spacing.xs,
    left: Spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  fileSizeText: {
    fontSize: FontSizes.xs,
    color: Colors.surface,
  },
  addButton: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    marginTop: Spacing.xs,
  },
  hint: {
    fontSize: FontSizes.xs,
    color: Colors.textLight,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    lineHeight: 18,
  },
});
