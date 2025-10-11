/**
 * 通用按钮组件
 */
import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
}) => {
  const buttonStyle = [
    styles.button,
    styles[`button_${variant}`],
    styles[`button_${size}`],
    disabled && styles.buttonDisabled,
    style,
  ];

  const textStyle = [
    styles.text,
    styles[`text_${variant}`],
    styles[`text_${size}`],
    disabled && styles.textDisabled,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}>
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? Colors.surface : Colors.primary}
        />
      ) : (
        <Text style={textStyle}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 变体样式
  button_primary: {
    backgroundColor: Colors.primary,
    ...Shadows.sm,
  },
  button_secondary: {
    backgroundColor: Colors.secondary,
    ...Shadows.sm,
  },
  button_outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  button_text: {
    backgroundColor: 'transparent',
  },
  // 尺寸样式
  button_small: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    minHeight: 32,
  },
  button_medium: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    minHeight: 44,
  },
  button_large: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    minHeight: 52,
  },
  // 禁用状态
  buttonDisabled: {
    opacity: 0.5,
  },
  // 文字样式
  text: {
    fontWeight: '600',
  },
  text_primary: {
    color: Colors.surface,
  },
  text_secondary: {
    color: Colors.surface,
  },
  text_outline: {
    color: Colors.primary,
  },
  text_text: {
    color: Colors.primary,
  },
  text_small: {
    fontSize: FontSizes.sm,
  },
  text_medium: {
    fontSize: FontSizes.md,
  },
  text_large: {
    fontSize: FontSizes.lg,
  },
  textDisabled: {
    opacity: 0.5,
  },
});
