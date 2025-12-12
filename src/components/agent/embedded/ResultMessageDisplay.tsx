/**
 * 结果消息显示组件
 * 用于显示操作成功/失败/信息等简单消息
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../../../constants/theme';

export interface ResultMessageData {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  icon?: string;
  title?: string;
}

interface ResultMessageDisplayProps {
  data: ResultMessageData;
}

const typeConfig = {
  success: {
    color: Colors.success,
    bgColor: '#E8F5E9',
    borderColor: Colors.success,
    defaultIcon: 'checkmark-circle',
  },
  error: {
    color: Colors.error,
    bgColor: '#FFEBEE',
    borderColor: Colors.error,
    defaultIcon: 'close-circle',
  },
  info: {
    color: Colors.primary,
    bgColor: '#E3F2FD',
    borderColor: Colors.primary,
    defaultIcon: 'information-circle',
  },
  warning: {
    color: Colors.warning,
    bgColor: '#FFF3E0',
    borderColor: Colors.warning,
    defaultIcon: 'warning',
  },
};

export const ResultMessageDisplay: React.FC<ResultMessageDisplayProps> = ({ data }) => {
  const { message, type = 'success', icon, title } = data;
  const config = typeConfig[type] || typeConfig.success;
  const iconName = icon || config.defaultIcon;

  return (
    <View style={[styles.container, { backgroundColor: config.bgColor, borderLeftColor: config.borderColor }]}>
      <View style={styles.iconContainer}>
        <Icon name={iconName} size={24} color={config.color} />
      </View>
      <View style={styles.contentContainer}>
        {title && (
          <Text style={[styles.title, { color: config.color }]}>{title}</Text>
        )}
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 4,
    marginVertical: Spacing.xs,
  },
  iconContainer: {
    marginRight: Spacing.sm,
    paddingTop: 2,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold as any,
    marginBottom: Spacing.xs,
  },
  message: {
    fontSize: FontSizes.md,
    color: Colors.text,
    lineHeight: 20,
  },
});

export default ResultMessageDisplay;
