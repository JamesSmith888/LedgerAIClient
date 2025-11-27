/**
 * ActionButtonsDisplay - 操作按钮显示组件
 * 
 * 在对话框中展示可点击的操作按钮
 * 让用户可以快速执行后续操作
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from '../../common';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius, Shadows } from '../../../constants/theme';

export interface ActionButton {
  id: string;
  label: string;
  action: string; // 'navigate' | 'send_message' | 'custom'
  payload: any;
  style?: 'primary' | 'secondary' | 'danger';
  icon?: string;
}

export interface ActionButtonsData {
  message?: string;
  buttons: ActionButton[];
}

export interface ActionButtonsDisplayProps {
  data: ActionButtonsData;
  onPress?: (action: string, payload: any) => void;
}

export const ActionButtonsDisplay: React.FC<ActionButtonsDisplayProps> = ({
  data,
  onPress,
}) => {
  const { message, buttons } = data;

  const getButtonStyle = (style?: 'primary' | 'secondary' | 'danger') => {
    switch (style) {
      case 'primary':
        return styles.buttonPrimary;
      case 'danger':
        return styles.buttonDanger;
      case 'secondary':
      default:
        return styles.buttonSecondary;
    }
  };

  const getButtonTextStyle = (style?: 'primary' | 'secondary' | 'danger') => {
    switch (style) {
      case 'primary':
        return styles.buttonTextPrimary;
      case 'danger':
        return styles.buttonTextDanger;
      case 'secondary':
      default:
        return styles.buttonTextSecondary;
    }
  };

  const handlePress = (button: ActionButton) => {
    onPress?.(button.action, button.payload);
  };

  return (
    <View style={styles.container}>
      {message && (
        <Text style={styles.message}>{message}</Text>
      )}
      
      <View style={styles.buttonsContainer}>
        {buttons.map((button) => (
          <TouchableOpacity
            key={button.id}
            style={[styles.button, getButtonStyle(button.style)]}
            onPress={() => handlePress(button)}
            activeOpacity={0.7}
          >
            {button.icon && (
              <Icon 
                name={button.icon as any} 
                size={16} 
                color={button.style === 'primary' ? Colors.surface : 
                       button.style === 'danger' ? Colors.error : Colors.primary} 
                style={styles.buttonIcon}
              />
            )}
            <Text style={[styles.buttonText, getButtonTextStyle(button.style)]}>
              {button.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.xs,
  },
  
  message: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  
  buttonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  
  buttonPrimary: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  buttonSecondary: {
    backgroundColor: Colors.surface,
    borderColor: Colors.primary,
  },
  buttonDanger: {
    backgroundColor: Colors.surface,
    borderColor: Colors.error,
  },
  
  buttonIcon: {
    marginRight: Spacing.xs,
  },
  
  buttonText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  buttonTextPrimary: {
    color: Colors.surface,
  },
  buttonTextSecondary: {
    color: Colors.primary,
  },
  buttonTextDanger: {
    color: Colors.error,
  },
});
