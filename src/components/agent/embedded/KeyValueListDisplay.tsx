/**
 * KeyValueListDisplay - 键值对列表组件
 * 
 * 用于在对话中展示多个键值对数据
 * 比如：账单详情、用户信息、配置项等
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from '../../common';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius, Shadows } from '../../../constants/theme';

export interface KeyValueItem {
  label: string;
  value: string;
  icon?: string;
  valueColor?: 'normal' | 'primary' | 'success' | 'warning' | 'error';
  copyable?: boolean;
}

export interface KeyValueListData {
  title?: string;
  titleIcon?: string;
  items: KeyValueItem[];
  footer?: string;
  compact?: boolean;
}

export interface KeyValueListDisplayProps {
  data: KeyValueListData;
}

const getValueColor = (color?: string): string => {
  switch (color) {
    case 'primary': return Colors.primary;
    case 'success': return Colors.success;
    case 'warning': return Colors.warning;
    case 'error': return Colors.error;
    default: return Colors.text;
  }
};

export const KeyValueListDisplay: React.FC<KeyValueListDisplayProps> = ({ data }) => {
  const { title, titleIcon, items, footer, compact } = data;

  return (
    <View style={styles.container}>
      {/* 标题 */}
      {title && (
        <View style={styles.header}>
          {titleIcon && (
            <Icon name={titleIcon} size={18} color={Colors.primary} />
          )}
          <Text style={[styles.title, titleIcon && styles.titleWithIcon]}>{title}</Text>
        </View>
      )}

      {/* 键值对列表 */}
      <View style={styles.listContainer}>
        {items.map((item, index) => (
          <View 
            key={index} 
            style={[
              styles.itemRow, 
              compact && styles.itemRowCompact,
              index < items.length - 1 && styles.itemRowBorder,
            ]}
          >
            <View style={styles.labelContainer}>
              {item.icon && (
                <Icon name={item.icon} size={16} color={Colors.textSecondary} />
              )}
              <Text style={[styles.label, item.icon && styles.labelWithIcon]}>
                {item.label}
              </Text>
            </View>
            <Text 
              style={[styles.value, { color: getValueColor(item.valueColor) }]}
              numberOfLines={2}
            >
              {item.value}
            </Text>
          </View>
        ))}
      </View>

      {/* 底部 */}
      {footer && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>{footer}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.backgroundSecondary,
  },
  title: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
  },
  titleWithIcon: {
    marginLeft: Spacing.xs,
  },

  listContainer: {
    paddingHorizontal: Spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  itemRowCompact: {
    paddingVertical: Spacing.xs,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  label: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  labelWithIcon: {
    marginLeft: Spacing.xs,
  },
  value: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    textAlign: 'right',
    flex: 1,
    marginLeft: Spacing.md,
  },

  footer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.backgroundSecondary,
  },
  footerText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
