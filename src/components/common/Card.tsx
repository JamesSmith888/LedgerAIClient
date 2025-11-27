/**
 * 通用卡片组件
 */
import React from 'react';
import { View, StyleSheet, ViewStyle, ViewProps } from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/theme';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'outlined' | 'flat';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'default',
  ...rest
}) => {
  return (
    <View style={[styles.card, styles[`card_${variant}`], style]} {...rest}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  card_default: {
    ...Shadows.md,
  },
  card_outlined: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
  card_flat: {
    // 无阴影、无边框的扁平样式
  },
});
