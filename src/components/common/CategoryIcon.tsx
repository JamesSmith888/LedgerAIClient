/**
 * 分类图标组件
 * 支持解析 "iconType:iconName" 格式的图标字符串
 * 同时向后兼容 emoji 格式
 */
import React from 'react';
import { Text } from 'react-native';
import { Icon, IconType } from './Icon';
import { Colors } from '../../constants/theme';

interface CategoryIconProps {
  icon: string; // 格式: "ionicons:restaurant" 或 "🍜" (兼容emoji)
  size?: number;
  color?: string;
  style?: any;
}

/**
 * CategoryIcon 组件
 * 
 * 使用示例：
 * <CategoryIcon icon="ionicons:restaurant" size={24} color={Colors.primary} />
 * <CategoryIcon icon="🍜" size={24} /> // 兼容 emoji
 */
export const CategoryIcon: React.FC<CategoryIconProps> = ({
  icon,
  size = 24,
  color = Colors.text,
  style,
}) => {
  // 解析图标字符串
  const parseIcon = (iconString: string): { type: IconType; name: string } | null => {
    if (iconString && iconString.includes(':')) {
      const [iconType, iconName] = iconString.split(':');
      return { type: iconType as IconType, name: iconName };
    }
    // 不包含冒号，则视为 emoji 或其他格式
    return null;
  };

  const parsedIcon = parseIcon(icon);

  if (parsedIcon) {
    // 使用新的图标组件
    return (
      <Icon
        type={parsedIcon.type}
        name={parsedIcon.name}
        size={size}
        color={color}
        style={style}
      />
    );
  }

  // 兼容旧的 emoji 显示
  return (
    <Text style={[{ fontSize: size, color }, style]}>{icon}</Text>
  );
};
