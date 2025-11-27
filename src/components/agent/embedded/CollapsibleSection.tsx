/**
 * CollapsibleSection - 可折叠区域组件
 * 
 * 通用的可折叠组件，用于：
 * - 工具调用结果的展示
 * - 未来其他可折叠内容（如代码块、详细信息等）
 * 
 * 设计原则：
 * 1. 可复用性 - 通过 props 支持不同的标题、图标、内容
 * 2. 可扩展性 - 支持自定义渲染和样式
 * 3. 性能优化 - 使用 LayoutAnimation 实现平滑动画
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors, Spacing, FontSizes, BorderRadius, FontWeights } from '../../../constants/theme';

// 启用 Android LayoutAnimation
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface CollapsibleSectionProps {
  /** 标题文本 */
  title: string;
  /** 副标题（可选） */
  subtitle?: string;
  /** 左侧图标名称 (Ionicons) */
  icon?: string;
  /** 图标颜色 */
  iconColor?: string;
  /** 子内容 */
  children: React.ReactNode;
  /** 是否默认展开 */
  defaultExpanded?: boolean;
  /** 变体样式 */
  variant?: 'default' | 'tool' | 'info' | 'warning' | 'success';
  /** 展开/折叠状态变化回调 */
  onToggle?: (expanded: boolean) => void;
  /** 自定义样式 */
  containerStyle?: object;
  /** 自定义头部右侧内容 */
  headerRight?: React.ReactNode;
}

/**
 * 根据变体获取颜色配置
 */
const getVariantColors = (variant: CollapsibleSectionProps['variant']) => {
  switch (variant) {
    case 'tool':
      return {
        borderColor: Colors.primary + '40',
        backgroundColor: Colors.backgroundSecondary,
        iconColor: Colors.primary,
        titleColor: Colors.primary,
      };
    case 'success':
      return {
        borderColor: Colors.success + '40',
        backgroundColor: Colors.success + '10',
        iconColor: Colors.success,
        titleColor: Colors.success,
      };
    case 'warning':
      return {
        borderColor: Colors.warning + '40',
        backgroundColor: Colors.warning + '10',
        iconColor: Colors.warning,
        titleColor: Colors.warning,
      };
    case 'info':
      return {
        borderColor: Colors.info + '40',
        backgroundColor: Colors.info + '10',
        iconColor: Colors.info,
        titleColor: Colors.info,
      };
    default:
      return {
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
        iconColor: Colors.textSecondary,
        titleColor: Colors.text,
      };
  }
};

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  subtitle,
  icon,
  iconColor,
  children,
  defaultExpanded = false,
  variant = 'default',
  onToggle,
  containerStyle,
  headerRight,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const variantColors = getVariantColors(variant);

  const toggleExpanded = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newState = !isExpanded;
    setIsExpanded(newState);
    onToggle?.(newState);
  }, [isExpanded, onToggle]);

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: variantColors.borderColor,
          backgroundColor: variantColors.backgroundColor,
        },
        containerStyle,
      ]}
    >
      {/* 可点击的头部 */}
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          {icon && (
            <Icon
              name={icon}
              size={14}
              color={iconColor || variantColors.iconColor}
              style={styles.headerIcon}
            />
          )}
          <View style={styles.titleContainer}>
            <Text
              style={[styles.title, { color: variantColors.titleColor }]}
              numberOfLines={1}
            >
              {title}
            </Text>
            {subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.headerRight}>
          {headerRight}
          <Icon
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={Colors.textSecondary}
            style={styles.chevron}
          />
        </View>
      </TouchableOpacity>

      {/* 可折叠的内容区域 */}
      {isExpanded && (
        <View style={styles.content}>
          {children}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    marginVertical: 2,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4, // 更紧凑的高度
    minHeight: 28, // 固定最小高度，保持一行
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  headerIcon: {
    marginRight: Spacing.xs,
  },

  titleContainer: {
    flex: 1,
    flexDirection: 'row', // 标题和副标题在同一行
    alignItems: 'center',
  },

  title: {
    fontSize: FontSizes.xs, // 更小的字体
    fontWeight: FontWeights.medium,
  },

  subtitle: {
    fontSize: 10, // 更小的副标题
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },

  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  chevron: {
    marginLeft: Spacing.xs,
  },

  content: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border + '40',
  },
});

export default CollapsibleSection;
