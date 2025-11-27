/**
 * ImageViewer - 图片全屏预览组件
 * 
 * 支持：
 * - 全屏查看图片
 * - 双指缩放
 * - 滑动关闭
 * - 多图切换（预留）
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Icon } from '../common';
import { Attachment } from '../../types/agent';
import { Colors, Spacing, FontSizes, FontWeights } from '../../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ImageViewerProps {
  /** 是否可见 */
  visible: boolean;
  /** 要显示的图片（单张或多张） */
  images: Attachment[];
  /** 初始显示的图片索引 */
  initialIndex?: number;
  /** 关闭回调 */
  onClose: () => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  visible,
  images,
  initialIndex = 0,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [loading, setLoading] = useState(true);

  if (!visible || images.length === 0) {
    return null;
  }

  const currentImage = images[currentIndex];
  const hasMultiple = images.length > 1;

  /**
   * 切换到上一张
   */
  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setLoading(true);
    }
  };

  /**
   * 切换到下一张
   */
  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setLoading(true);
    }
  };

  /**
   * 计算图片显示尺寸（保持宽高比）
   */
  const getImageSize = () => {
    if (!currentImage.width || !currentImage.height) {
      return { width: SCREEN_WIDTH, height: SCREEN_WIDTH };
    }

    const aspectRatio = currentImage.width / currentImage.height;
    const maxWidth = SCREEN_WIDTH;
    const maxHeight = SCREEN_HEIGHT * 0.8;

    let width = maxWidth;
    let height = width / aspectRatio;

    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    return { width, height };
  };

  const imageSize = getImageSize();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* 状态栏占位 */}
        {Platform.OS === 'android' && <StatusBar backgroundColor="black" barStyle="light-content" />}
        
        {/* 顶部工具栏 */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Icon name="close" size={28} color={Colors.surface} />
          </TouchableOpacity>
          
          {hasMultiple && (
            <Text style={styles.indexText}>
              {currentIndex + 1} / {images.length}
            </Text>
          )}
          
          {/* 占位，保持标题居中 */}
          <View style={styles.placeholder} />
        </View>

        {/* 图片区域 */}
        <View style={styles.imageContainer}>
          {/* 加载指示器 */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.surface} />
            </View>
          )}
          
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            maximumZoomScale={3}
            minimumZoomScale={1}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            centerContent
          >
            <Image
              source={{ uri: currentImage.uri }}
              style={[styles.image, imageSize]}
              resizeMode="contain"
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
            />
          </ScrollView>
        </View>

        {/* 底部信息 */}
        {currentImage.name && (
          <View style={styles.footer}>
            <Text style={styles.imageName} numberOfLines={1}>
              {currentImage.name}
            </Text>
            {currentImage.size && (
              <Text style={styles.imageSize}>
                {formatFileSize(currentImage.size)}
              </Text>
            )}
          </View>
        )}

        {/* 多图切换按钮 */}
        {hasMultiple && (
          <>
            {currentIndex > 0 && (
              <TouchableOpacity
                style={[styles.navButton, styles.prevButton]}
                onPress={handlePrev}
              >
                <Icon name="chevron-back" size={32} color={Colors.surface} />
              </TouchableOpacity>
            )}
            {currentIndex < images.length - 1 && (
              <TouchableOpacity
                style={[styles.navButton, styles.nextButton]}
                onPress={handleNext}
              >
                <Icon name="chevron-forward" size={32} color={Colors.surface} />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </Modal>
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
    flex: 1,
    backgroundColor: 'black',
  },
  
  // 顶部工具栏
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 0) + 10,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  indexText: {
    color: Colors.surface,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },
  placeholder: {
    width: 44,
  },
  
  // 图片区域
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  
  // 底部信息
  footer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 34 : Spacing.md,
  },
  imageName: {
    color: Colors.surface,
    fontSize: FontSizes.sm,
    textAlign: 'center',
  },
  imageSize: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: FontSizes.xs,
    textAlign: 'center',
    marginTop: 4,
  },
  
  // 导航按钮
  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 24,
  },
  prevButton: {
    left: Spacing.sm,
  },
  nextButton: {
    right: Spacing.sm,
  },
});
