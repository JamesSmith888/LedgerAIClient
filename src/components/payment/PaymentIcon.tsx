/**
 * 支付方式图标组件
 * 为不同支付方式显示合适的图标（优先使用 emoji，降级到 Ionicons）
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from '../common';
import { Colors } from '../../constants/theme';
import type { PaymentMethodType } from '../../types/paymentMethod';

interface PaymentIconProps {
  type?: PaymentMethodType;
  iconName?: string;
  size?: number;
  color?: string;
  style?: any;
}

/**
 * 支付方式类型到 emoji 的映射
 */
const PAYMENT_EMOJIS: Record<PaymentMethodType, string> = {
  CASH: '💵',
  ALIPAY: '🔵',  // 支付宝蓝色
  WECHAT: '💚',  // 微信绿色
  BANK_CARD: '💳',
  OTHER: '💰',
};

/**
 * 支付方式类型到 Ionicon 的映射（作为降级方案）
 */
const PAYMENT_ICONS: Record<PaymentMethodType, string> = {
  CASH: 'cash',
  ALIPAY: 'phone-portrait',
  WECHAT: 'chatbubble-ellipses',
  BANK_CARD: 'card',
  OTHER: 'wallet',
};

export const PaymentIcon: React.FC<PaymentIconProps> = ({
  type,
  iconName,
  size = 24,
  color = Colors.text,
  style,
}) => {
  // 如果提供了自定义图标名，优先使用
  if (iconName) {
    // 检查是否是 emoji（单个字符且是 emoji）
    if (iconName.length <= 4 && /[\p{Emoji}]/u.test(iconName)) {
      return (
        <Text style={[{ fontSize: size }, style]}>
          {iconName}
        </Text>
      );
    }
    // 否则作为 Ionicon 名称
    return <Icon name={iconName} size={size} color={color} style={style} />;
  }

  // 使用类型映射
  if (type) {
    const emoji = PAYMENT_EMOJIS[type];
    return (
      <Text style={[{ fontSize: size }, style]}>
        {emoji}
      </Text>
    );
  }

  // 降级：显示默认图标
  return <Icon name="wallet" size={size} color={color} style={style} />;
};

/**
 * 获取支付方式的图标名称（用于选择器）
 */
export const getPaymentIconName = (type: PaymentMethodType): string => {
  return PAYMENT_EMOJIS[type];
};

/**
 * 所有支付方式类型及其图标配置
 */
export const PAYMENT_METHOD_CONFIGS: Array<{
  type: PaymentMethodType;
  iconName: string;
  name: string;
}> = [
  { type: 'CASH', iconName: '💵', name: '现金' },
  { type: 'ALIPAY', iconName: '🔵', name: '支付宝' },
  { type: 'WECHAT', iconName: '💚', name: '微信' },
  { type: 'BANK_CARD', iconName: '💳', name: '银行卡' },
  { type: 'OTHER', iconName: '💰', name: '其他' },
];
