/**
 * ToolManagerPanel - 工具管理面板组件
 * 
 * 让用户查看和管理 AI Agent 可用的工具
 * 支持按分类查看、启用/禁用单个工具或整个分类
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Modal,
  Animated,
} from 'react-native';
import { Icon } from '../common';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius, Shadows } from '../../constants/theme';
import { ToolMeta, ToolCategory, TOOL_CATEGORIES } from '../../types/tool';

interface ToolManagerPanelProps {
  visible: boolean;
  onClose: () => void;
  tools: ToolMeta[];
  toolsByCategory: Record<ToolCategory, ToolMeta[]>;
  stats: {
    enabled: number;
    total: number;
    core: number;
    optional: number;
    enabledOptional: number;
  };
  onToggleTool: (toolName: string) => void;
  onToggleCategory: (category: ToolCategory, enabled: boolean) => void;
  onReset: () => void;
  onToggleAlwaysAllowed?: (toolName: string, allowed: boolean) => void;
}

/**
 * 单个工具项组件
 */
const ToolItem: React.FC<{
  tool: ToolMeta;
  onToggle: () => void;
  onToggleAlwaysAllowed?: (allowed: boolean) => void;
}> = ({ tool, onToggle, onToggleAlwaysAllowed }) => {
  return (
    <View style={[styles.toolItem, !tool.isEnabled && styles.toolItemDisabled]}>
      <View style={styles.toolIcon}>
        <Text style={styles.toolIconText}>{tool.icon}</Text>
      </View>
      
      <View style={styles.toolInfo}>
        <View style={styles.toolNameRow}>
          <Text style={[styles.toolName, !tool.isEnabled && styles.toolNameDisabled]}>
            {tool.displayName}
          </Text>
          {tool.isCore && (
            <View style={styles.coreBadge}>
              <Text style={styles.coreBadgeText}>核心</Text>
            </View>
          )}
          {tool.isAlwaysAllowed && (
            <TouchableOpacity
              style={styles.alwaysAllowedBadge}
              onPress={() => onToggleAlwaysAllowed?.(false)}
              activeOpacity={0.6}
            >
              <Text style={styles.alwaysAllowedBadgeText}>已授权</Text>
              <View style={styles.revokeButton}>
                <Icon name="close" size={10} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.toolDescription} numberOfLines={1}>
          {tool.description}
        </Text>
      </View>
      
      <Switch
        value={tool.isEnabled}
        onValueChange={onToggle}
        disabled={tool.isCore}
        trackColor={{ false: Colors.border, true: Colors.primaryLight }}
        thumbColor={tool.isEnabled ? Colors.primary : Colors.textSecondary}
        ios_backgroundColor={Colors.border}
      />
    </View>
  );
};

/**
 * 工具分类组件
 */
const ToolCategorySection: React.FC<{
  category: typeof TOOL_CATEGORIES[0];
  tools: ToolMeta[];
  onToggleTool: (toolName: string) => void;
  onToggleCategory: (enabled: boolean) => void;
  onToggleAlwaysAllowed?: (toolName: string, allowed: boolean) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}> = ({ category, tools, onToggleTool, onToggleCategory, onToggleAlwaysAllowed, isExpanded, onToggleExpand }) => {
  // 防御性检查
  const safeTools = tools || [];
  
  console.log(`🔧 [ToolCategorySection] ${category.id}:`, {
    toolsReceived: tools?.length,
    safeToolsCount: safeTools.length,
    isExpanded,
  });
  
  const enabledCount = safeTools.filter(t => t.isEnabled).length;
  const allEnabled = safeTools.length > 0 && enabledCount === safeTools.length;
  const someEnabled = enabledCount > 0 && enabledCount < safeTools.length;
  const coreCount = safeTools.filter(t => t.isCore).length;
  
  return (
    <View style={styles.categorySection}>
      {/* 分类头部 */}
      <TouchableOpacity 
        style={styles.categoryHeader}
        onPress={onToggleExpand}
        activeOpacity={0.7}
      >
        <View style={styles.categoryLeft}>
          <Text style={styles.categoryIcon}>{category.icon}</Text>
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryName}>{category.name}</Text>
            <Text style={styles.categoryStats}>
              {enabledCount}/{safeTools.length} 已启用
              {coreCount > 0 && ` • ${coreCount} 核心`}
            </Text>
          </View>
        </View>
        
        <View style={styles.categoryRight}>
          {/* 分类开关（仅当有非核心工具时显示） */}
          {coreCount < safeTools.length && (
            <TouchableOpacity
              style={[
                styles.categoryToggle,
                allEnabled && styles.categoryToggleOn,
                someEnabled && styles.categoryTogglePartial,
              ]}
              onPress={() => onToggleCategory(!allEnabled)}
            >
              <Text style={[
                styles.categoryToggleText,
                (allEnabled || someEnabled) && styles.categoryToggleTextOn,
              ]}>
                {allEnabled ? '全部' : someEnabled ? '部分' : '关闭'}
              </Text>
            </TouchableOpacity>
          )}
          
          <Icon 
            name={isExpanded ? 'chevron-up' : 'chevron-down'} 
            size={20} 
            color={Colors.textSecondary} 
          />
        </View>
      </TouchableOpacity>
      
      {/* 工具列表 */}
      {isExpanded && safeTools.length > 0 && (
        <View style={styles.toolsList}>
          {safeTools.map(tool => (
            <ToolItem
              key={tool.name}
              tool={tool}
              onToggle={() => onToggleTool(tool.name)}
              onToggleAlwaysAllowed={(allowed) => onToggleAlwaysAllowed?.(tool.name, allowed)}
            />
          ))}
        </View>
      )}
      {isExpanded && safeTools.length === 0 && (
        <View style={styles.toolsList}>
          <Text style={{ padding: Spacing.md, color: Colors.textSecondary }}>
            该分类暂无工具
          </Text>
        </View>
      )}
    </View>
  );
};

/**
 * 工具管理面板主组件
 */
export const ToolManagerPanel: React.FC<ToolManagerPanelProps> = ({
  visible,
  onClose,
  tools,
  toolsByCategory,
  stats,
  onToggleTool,
  onToggleCategory,
  onReset,
  onToggleAlwaysAllowed,
}) => {
  // 展开状态 - 默认收起所有分类
  const [expandedCategories, setExpandedCategories] = useState<Set<ToolCategory>>(
    new Set() // 默认为空，即所有分类收起
  );

  // 调试日志
  console.log('🔧 [ToolManagerPanel] Rendering with data:', {
    visible,
    toolsCount: tools?.length,
    tools: tools?.map(t => t.name),
    toolsByCategory: toolsByCategory ? Object.keys(toolsByCategory).map(k => `${k}: ${toolsByCategory[k as ToolCategory]?.length || 0}`) : 'undefined',
    stats,
    TOOL_CATEGORIES_count: TOOL_CATEGORIES.length,
  });

  const toggleCategoryExpand = useCallback((category: ToolCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.panel}>
          {/* 头部 */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>🛠️ 工具管理</Text>
              <Text style={styles.headerSubtitle}>
                已启用 {stats.enabled}/{stats.total} 个工具
              </Text>
            </View>
            
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={onReset}
              >
                <Icon name="refresh" size={18} color={Colors.primary} />
                <Text style={styles.resetButtonText}>重置</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
              >
                <Icon name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* 说明文字 */}
          <View style={styles.infoBar}>
            <Icon name="information-circle-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.infoText}>
              禁用工具后，AI 将无法使用该功能。核心工具无法禁用。
            </Text>
          </View>
          
          {/* 工具列表 */}
          <ScrollView 
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {TOOL_CATEGORIES.map(category => (
              <ToolCategorySection
                key={category.id}
                category={category}
                tools={toolsByCategory[category.id]}
                onToggleTool={onToggleTool}
                onToggleCategory={(enabled) => onToggleCategory(category.id, enabled)}
                onToggleAlwaysAllowed={onToggleAlwaysAllowed}
                isExpanded={expandedCategories.has(category.id)}
                onToggleExpand={() => toggleCategoryExpand(category.id)}
              />
            ))}
            
            {/* 底部留白 */}
            <View style={styles.bottomSpacer} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    height: '80%', // 固定高度而不是 maxHeight
    ...Shadows.lg,
  },
  
  // 头部
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginRight: Spacing.sm,
  },
  resetButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    marginLeft: 4,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  
  // 信息栏
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  infoText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
    flex: 1,
  },
  
  // 内容区
  content: {
    flex: 1,
  },
  bottomSpacer: {
    height: Spacing.xl,
  },
  
  // 分类部分
  categorySection: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: Spacing.sm,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
  },
  categoryStats: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryToggle: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.backgroundSecondary,
    marginRight: Spacing.sm,
  },
  categoryToggleOn: {
    backgroundColor: Colors.primaryLight,
  },
  categoryTogglePartial: {
    backgroundColor: `${Colors.warning}20`, // 使用 warning 颜色的 12% 透明度
  },
  categoryToggleText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  categoryToggleTextOn: {
    color: Colors.primary,
  },
  
  // 工具列表
  toolsList: {
    backgroundColor: Colors.backgroundSecondary,
  },
  toolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.sm,
    marginVertical: 2,
    borderRadius: BorderRadius.md,
  },
  toolItemDisabled: {
    opacity: 0.6,
  },
  toolIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  toolIconText: {
    fontSize: 18,
  },
  toolInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  toolNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolName: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.text,
  },
  toolNameDisabled: {
    color: Colors.textSecondary,
  },
  coreBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.xs,
  },
  coreBadgeText: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: FontWeights.semibold,
  },
  alwaysAllowedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.success}20`,
    paddingLeft: 6,
    paddingRight: 3,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.xs,
    borderWidth: 1,
    borderColor: `${Colors.success}40`,
  },
  alwaysAllowedBadgeText: {
    fontSize: 10,
    color: Colors.success,
    fontWeight: FontWeights.semibold,
    marginRight: 4,
  },
  revokeButton: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolDescription: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});

export default ToolManagerPanel;
