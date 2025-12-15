import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../constants/theme';

// 启用 Android 的 LayoutAnimation (仅在旧架构下)
if (
  Platform.OS === 'android' && 
  UIManager.setLayoutAnimationEnabledExperimental &&
  !global.RN$Bridgeless // 排除 Bridgeless (新架构)
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CollapsibleSectionProps {
  title: string;
  icon?: string;
  defaultCollapsed?: boolean;
  children: React.ReactNode;
  badge?: number; // 显示数量徽章
}

/**
 * 可折叠区域组件
 * 
 * 用法：
 * <CollapsibleSection 
 *   title="附件" 
 *   icon="paperclip"
 *   defaultCollapsed={true}
 *   badge={3}
 * >
 *   <YourContent />
 * </CollapsibleSection>
 */
export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon,
  defaultCollapsed = false,
  children,
  badge,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const toggleCollapse = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsCollapsed(!isCollapsed);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.header} 
        onPress={toggleCollapse}
        activeOpacity={0.7}
      >
        <View style={styles.titleContainer}>
          {icon && (
            <Icon 
              name={icon} 
              size={20} 
              color={Colors.textSecondary} 
              style={styles.icon}
            />
          )}
          <Text style={styles.title}>{title}</Text>
          {badge !== undefined && badge > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
        </View>
        <Icon 
          name={isCollapsed ? 'chevron-down' : 'chevron-up'} 
          size={24} 
          color={Colors.textSecondary}
        />
      </TouchableOpacity>
      
      {!isCollapsed && (
        <View style={styles.content}>
          {children}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.card,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: Spacing.sm,
  },
  title: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  badge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: Spacing.sm,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: Colors.surface,
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  content: {
    padding: Spacing.md,
    paddingTop: 0,
  },
});
