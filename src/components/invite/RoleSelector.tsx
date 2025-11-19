/**
 * 角色选择器组件
 * 支持选择管理员/记账员/查看者角色
 * 设计风格参考 Google Material Design
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '../../constants/theme';
import { INVITE_ROLE_OPTIONS, type RoleOption } from '../../types/invite';

interface RoleSelectorProps {
  selectedRole: number;
  onSelectRole: (role: number) => void;
  disabled?: boolean;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({
  selectedRole,
  onSelectRole,
  disabled = false,
}) => {
  const renderRoleOption = (option: RoleOption) => {
    const isSelected = selectedRole === option.code;

    return (
      <TouchableOpacity
        key={option.code}
        style={[
          styles.roleOption,
          isSelected && styles.roleOptionSelected,
          disabled && styles.roleOptionDisabled,
        ]}
        onPress={() => !disabled && onSelectRole(option.code)}
        activeOpacity={0.7}
        disabled={disabled}
      >
        <View style={styles.roleHeader}>
          <View style={styles.roleIconContainer}>
            <Text style={styles.roleIcon}>{option.icon}</Text>
          </View>
          <View style={styles.roleInfo}>
            <Text
              style={[
                styles.roleName,
                isSelected && styles.roleNameSelected,
                disabled && styles.roleNameDisabled,
              ]}
            >
              {option.name}
            </Text>
            <Text
              style={[
                styles.roleDescription,
                disabled && styles.roleDescriptionDisabled,
              ]}
            >
              {option.description}
            </Text>
          </View>
        </View>
        {isSelected && (
          <View style={[styles.checkMark, { backgroundColor: option.color }]}>
            <Text style={styles.checkIcon}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>选择角色权限</Text>
      <View style={styles.optionsContainer}>
        {INVITE_ROLE_OPTIONS.map(option => renderRoleOption(option))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  optionsContainer: {
    gap: Spacing.sm,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  roleOptionSelected: {
    backgroundColor: Colors.primary + '08',
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  roleOptionDisabled: {
    opacity: 0.5,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  roleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  roleIcon: {
    fontSize: 24,
  },
  roleInfo: {
    flex: 1,
  },
  roleName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs / 2,
  },
  roleNameSelected: {
    color: Colors.primary,
  },
  roleNameDisabled: {
    color: Colors.textSecondary,
  },
  roleDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  roleDescriptionDisabled: {
    color: Colors.divider,
  },
  checkMark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  checkIcon: {
    fontSize: 14,
    color: Colors.surface,
    fontWeight: FontWeights.bold,
  },
});
