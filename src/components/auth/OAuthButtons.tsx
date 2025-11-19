import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';

export interface OAuthButtonProps {
  type: 'alipay' | 'wechat' | 'google' | 'apple';
  onPress: () => void;
  disabled?: boolean;
}

/**
 * 第三方登录按钮组件
 */
export const OAuthButton: React.FC<OAuthButtonProps> = ({ 
  type, 
  onPress, 
  disabled = false 
}) => {
  const config = getButtonConfig(type);
  
  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: config.backgroundColor },
        disabled && styles.buttonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.icon}>{config.icon}</Text>
      <Text style={[styles.text, { color: config.textColor }]}>
        {config.text}
      </Text>
    </TouchableOpacity>
  );
};

/**
 * 第三方登录按钮组
 */
export interface OAuthButtonsProps {
  onAlipay?: () => void;
  onWechat?: () => void;
  onGoogle?: () => void;
  onApple?: () => void;
  loading?: boolean;
}

export const OAuthButtons: React.FC<OAuthButtonsProps> = ({
  onAlipay,
  onWechat,
  onGoogle,
  onApple,
  loading = false,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>或使用以下方式登录</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.buttonsRow}>
        {onAlipay && (
          <OAuthButton 
            type="alipay" 
            onPress={onAlipay} 
            disabled={loading}
          />
        )}
        
        {onWechat && (
          <OAuthButton 
            type="wechat" 
            onPress={onWechat} 
            disabled={loading}
          />
        )}
        
        {onGoogle && (
          <OAuthButton 
            type="google" 
            onPress={onGoogle} 
            disabled={loading}
          />
        )}
        
        {onApple && (
          <OAuthButton 
            type="apple" 
            onPress={onApple} 
            disabled={loading}
          />
        )}
      </View>
    </View>
  );
};

/**
 * 获取按钮配置
 */
const getButtonConfig = (type: OAuthButtonProps['type']) => {
  switch (type) {
    case 'alipay':
      return {
        icon: '💰',
        text: '支付宝',
        backgroundColor: '#1677FF',
        textColor: '#FFFFFF',
      };
    case 'wechat':
      return {
        icon: '💬',
        text: '微信',
        backgroundColor: '#07C160',
        textColor: '#FFFFFF',
      };
    case 'google':
      return {
        icon: '🔍',
        text: 'Google',
        backgroundColor: '#FFFFFF',
        textColor: '#000000',
      };
    case 'apple':
      return {
        icon: '',
        text: 'Apple',
        backgroundColor: '#000000',
        textColor: '#FFFFFF',
      };
  }
};

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.lg,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    marginHorizontal: Spacing.md,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    minWidth: 100,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  icon: {
    fontSize: 20,
    marginRight: Spacing.xs,
  },
  text: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
});
