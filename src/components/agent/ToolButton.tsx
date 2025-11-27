/**
 * ToolButton - 工具管理按钮组件
 * 
 * 显示在聊天界面头部，点击打开工具管理面板
 * 显示当前启用的工具数量
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
} from 'react-native';
import { Icon } from '../common';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../../constants/theme';

interface ToolButtonProps {
  enabledCount: number;
  totalCount: number;
  onPress: () => void;
}

export const ToolButton: React.FC<ToolButtonProps> = ({
  enabledCount,
  totalCount,
  onPress,
}) => {
  const allEnabled = enabledCount === totalCount;
  
  return (
    <TouchableOpacity
      style={[
        styles.button,
        !allEnabled && styles.buttonPartial,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Icon 
        name="construct-outline" 
        size={18} 
        color={allEnabled ? Colors.text : Colors.warning} 
      />
      <View style={styles.badge}>
        <Text style={[
          styles.badgeText,
          !allEnabled && styles.badgeTextWarning,
        ]}>
          {enabledCount}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundSecondary,
    marginLeft: Spacing.sm,
    position: 'relative',
  },
  buttonPartial: {
    backgroundColor: `${Colors.warning}20`, // 使用 warning 颜色的 12% 透明度
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: FontWeights.bold,
    color: Colors.surface,
  },
  badgeTextWarning: {
    color: Colors.surface,
  },
});

export default ToolButton;
