/**
 * DynamicCard - 通用动态卡片组件
 * 
 * 允许 AI 灵活组合各种原子组件来构建自定义卡片
 * 
 * 支持的 Section 类型：
 * - text: 文本段落
 * - title: 标题
 * - key_value: 键值对
 * - key_value_row: 水平键值对行
 * - divider: 分隔线
 * - spacer: 空白间距
 * - icon_text: 图标+文本
 * - highlight: 高亮文本块
 * - list: 列表
 * - progress: 进度条
 * - tag_row: 标签行
 * - button: 按钮
 * - button_row: 按钮行
 * - amount: 金额显示
 * - image: 图片（暂不支持）
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from '../../common';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius, Shadows } from '../../../constants/theme';

// Section 类型定义
export type DynamicSectionType = 
  | 'text'
  | 'title'
  | 'key_value'
  | 'key_value_row'
  | 'divider'
  | 'spacer'
  | 'icon_text'
  | 'highlight'
  | 'list'
  | 'progress'
  | 'tag_row'
  | 'button'
  | 'button_row'
  | 'amount';

// 基础 Section 接口
interface BaseSection {
  type: DynamicSectionType;
  id?: string;
}

// 文本 Section
interface TextSection extends BaseSection {
  type: 'text';
  content: string;
  style?: 'normal' | 'secondary' | 'small' | 'bold';
  align?: 'left' | 'center' | 'right';
}

// 标题 Section
interface TitleSection extends BaseSection {
  type: 'title';
  content: string;
  level?: 1 | 2 | 3;
  icon?: string;
}

// 键值对 Section
interface KeyValueSection extends BaseSection {
  type: 'key_value';
  label: string;
  value: string;
  valueColor?: 'normal' | 'primary' | 'success' | 'warning' | 'error';
  icon?: string;
}

// 水平键值对行 Section
interface KeyValueRowSection extends BaseSection {
  type: 'key_value_row';
  items: Array<{
    label: string;
    value: string;
    valueColor?: 'normal' | 'primary' | 'success' | 'warning' | 'error';
  }>;
}

// 分隔线 Section
interface DividerSection extends BaseSection {
  type: 'divider';
  style?: 'solid' | 'dashed';
}

// 空白间距 Section
interface SpacerSection extends BaseSection {
  type: 'spacer';
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

// 图标+文本 Section
interface IconTextSection extends BaseSection {
  type: 'icon_text';
  icon: string;
  content: string;
  iconColor?: string;
}

// 高亮块 Section
interface HighlightSection extends BaseSection {
  type: 'highlight';
  content: string;
  variant?: 'info' | 'success' | 'warning' | 'error';
  icon?: string;
}

// 列表 Section
interface ListSection extends BaseSection {
  type: 'list';
  items: string[];
  style?: 'bullet' | 'numbered' | 'check';
}

// 进度条 Section
interface ProgressSection extends BaseSection {
  type: 'progress';
  label?: string;
  value: number; // 0-100
  maxValue?: number;
  showPercentage?: boolean;
  color?: 'primary' | 'success' | 'warning' | 'error';
}

// 标签行 Section
interface TagRowSection extends BaseSection {
  type: 'tag_row';
  tags: Array<{
    text: string;
    color?: 'primary' | 'success' | 'warning' | 'error' | 'default';
  }>;
}

// 按钮 Section
interface ButtonSection extends BaseSection {
  type: 'button';
  label: string;
  action: string;
  payload?: any;
  style?: 'primary' | 'secondary' | 'danger';
}

// 按钮行 Section
interface ButtonRowSection extends BaseSection {
  type: 'button_row';
  buttons: Array<{
    label: string;
    action: string;
    payload?: any;
    style?: 'primary' | 'secondary' | 'danger';
  }>;
}

// 金额 Section
interface AmountSection extends BaseSection {
  type: 'amount';
  value: number;
  label?: string;
  size?: 'normal' | 'large' | 'xlarge';
  showSign?: boolean;
}

// 所有 Section 类型联合
export type DynamicSection = 
  | TextSection
  | TitleSection
  | KeyValueSection
  | KeyValueRowSection
  | DividerSection
  | SpacerSection
  | IconTextSection
  | HighlightSection
  | ListSection
  | ProgressSection
  | TagRowSection
  | ButtonSection
  | ButtonRowSection
  | AmountSection;

// DynamicCard 数据结构
export interface DynamicCardData {
  title?: string;
  titleIcon?: string;
  subtitle?: string;
  sections: DynamicSection[];
  footer?: string;
  variant?: 'default' | 'outlined' | 'elevated';
}

export interface DynamicCardProps {
  data: DynamicCardData;
  onButtonPress?: (action: string, payload?: any) => void;
}

// 颜色映射
const getValueColor = (color?: string): string => {
  switch (color) {
    case 'primary': return Colors.primary;
    case 'success': return Colors.success;
    case 'warning': return Colors.warning;
    case 'error': return Colors.error;
    default: return Colors.text;
  }
};

const getHighlightStyle = (variant?: string) => {
  switch (variant) {
    case 'success':
      return { backgroundColor: Colors.incomeLight, borderColor: Colors.success };
    case 'warning':
      return { backgroundColor: '#FFF8E1', borderColor: Colors.warning };
    case 'error':
      return { backgroundColor: Colors.expenseLight, borderColor: Colors.error };
    default:
      return { backgroundColor: '#E8F4FD', borderColor: Colors.info };
  }
};

const getProgressColor = (color?: string): string => {
  switch (color) {
    case 'success': return Colors.success;
    case 'warning': return Colors.warning;
    case 'error': return Colors.error;
    default: return Colors.primary;
  }
};

const getTagColor = (color?: string) => {
  switch (color) {
    case 'primary':
      return { bg: '#EEF2FF', text: Colors.primary };
    case 'success':
      return { bg: Colors.incomeLight, text: Colors.success };
    case 'warning':
      return { bg: '#FFF8E1', text: Colors.warning };
    case 'error':
      return { bg: Colors.expenseLight, text: Colors.error };
    default:
      return { bg: Colors.backgroundSecondary, text: Colors.textSecondary };
  }
};

const getButtonStyle = (style?: string) => {
  switch (style) {
    case 'secondary':
      return { bg: Colors.backgroundSecondary, text: Colors.text };
    case 'danger':
      return { bg: Colors.error, text: Colors.surface };
    default:
      return { bg: Colors.primary, text: Colors.surface };
  }
};

// Section 渲染器
const renderSection = (
  section: DynamicSection, 
  index: number,
  onButtonPress?: (action: string, payload?: any) => void
): React.ReactNode => {
  const key = section.id || `section_${index}`;

  switch (section.type) {
    case 'text': {
      const s = section as TextSection;
      const textStyle = [
        styles.text,
        s.style === 'secondary' && styles.textSecondary,
        s.style === 'small' && styles.textSmall,
        s.style === 'bold' && styles.textBold,
        s.align === 'center' && styles.textCenter,
        s.align === 'right' && styles.textRight,
      ];
      return <Text key={key} style={textStyle}>{s.content}</Text>;
    }

    case 'title': {
      const s = section as TitleSection;
      const titleStyle = [
        styles.sectionTitle,
        s.level === 2 && styles.titleLevel2,
        s.level === 3 && styles.titleLevel3,
      ];
      return (
        <View key={key} style={styles.titleRow}>
          {s.icon && <Icon name={s.icon} size={s.level === 1 ? 20 : 16} color={Colors.text} />}
          <Text style={[titleStyle, s.icon && styles.titleWithIcon]}>{s.content}</Text>
        </View>
      );
    }

    case 'key_value': {
      const s = section as KeyValueSection;
      return (
        <View key={key} style={styles.keyValueRow}>
          <View style={styles.keyValueLeft}>
            {s.icon && <Icon name={s.icon} size={16} color={Colors.textSecondary} />}
            <Text style={[styles.keyLabel, s.icon && styles.labelWithIcon]}>{s.label}</Text>
          </View>
          <Text style={[styles.keyValue, { color: getValueColor(s.valueColor) }]}>
            {s.value}
          </Text>
        </View>
      );
    }

    case 'key_value_row': {
      const s = section as KeyValueRowSection;
      return (
        <View key={key} style={styles.kvRowContainer}>
          {s.items.map((item, i) => (
            <View key={i} style={styles.kvRowItem}>
              <Text style={styles.kvRowLabel}>{item.label}</Text>
              <Text style={[styles.kvRowValue, { color: getValueColor(item.valueColor) }]}>
                {item.value}
              </Text>
            </View>
          ))}
        </View>
      );
    }

    case 'divider': {
      const s = section as DividerSection;
      return (
        <View 
          key={key} 
          style={[
            styles.divider, 
            s.style === 'dashed' && styles.dividerDashed
          ]} 
        />
      );
    }

    case 'spacer': {
      const s = section as SpacerSection;
      const spacerSize = {
        xs: Spacing.xs,
        sm: Spacing.sm,
        md: Spacing.md,
        lg: Spacing.lg,
      }[s.size || 'sm'];
      return <View key={key} style={{ height: spacerSize }} />;
    }

    case 'icon_text': {
      const s = section as IconTextSection;
      return (
        <View key={key} style={styles.iconTextRow}>
          <Icon name={s.icon} size={18} color={s.iconColor || Colors.primary} />
          <Text style={styles.iconTextContent}>{s.content}</Text>
        </View>
      );
    }

    case 'highlight': {
      const s = section as HighlightSection;
      const highlightStyle = getHighlightStyle(s.variant);
      return (
        <View key={key} style={[styles.highlight, highlightStyle]}>
          {s.icon && <Icon name={s.icon} size={16} color={highlightStyle.borderColor} />}
          <Text style={[styles.highlightText, s.icon && styles.highlightTextWithIcon]}>
            {s.content}
          </Text>
        </View>
      );
    }

    case 'list': {
      const s = section as ListSection;
      return (
        <View key={key} style={styles.listContainer}>
          {s.items.map((item, i) => (
            <View key={i} style={styles.listItem}>
              <Text style={styles.listBullet}>
                {s.style === 'numbered' ? `${i + 1}.` : s.style === 'check' ? '✓' : '•'}
              </Text>
              <Text style={styles.listItemText}>{item}</Text>
            </View>
          ))}
        </View>
      );
    }

    case 'progress': {
      const s = section as ProgressSection;
      const percentage = Math.min(100, Math.max(0, s.value / (s.maxValue || 100) * 100));
      const progressColor = getProgressColor(s.color);
      return (
        <View key={key} style={styles.progressContainer}>
          {s.label && (
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>{s.label}</Text>
              {s.showPercentage && (
                <Text style={styles.progressPercentage}>{percentage.toFixed(0)}%</Text>
              )}
            </View>
          )}
          <View style={styles.progressTrack}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${percentage}%`, backgroundColor: progressColor }
              ]} 
            />
          </View>
        </View>
      );
    }

    case 'tag_row': {
      const s = section as TagRowSection;
      return (
        <View key={key} style={styles.tagRow}>
          {s.tags.map((tag, i) => {
            const colors = getTagColor(tag.color);
            return (
              <View key={i} style={[styles.tag, { backgroundColor: colors.bg }]}>
                <Text style={[styles.tagText, { color: colors.text }]}>{tag.text}</Text>
              </View>
            );
          })}
        </View>
      );
    }

    case 'button': {
      const s = section as ButtonSection;
      const buttonColors = getButtonStyle(s.style);
      return (
        <TouchableOpacity
          key={key}
          style={[styles.button, { backgroundColor: buttonColors.bg }]}
          onPress={() => onButtonPress?.(s.action, s.payload)}
          activeOpacity={0.7}
        >
          <Text style={[styles.buttonText, { color: buttonColors.text }]}>{s.label}</Text>
        </TouchableOpacity>
      );
    }

    case 'button_row': {
      const s = section as ButtonRowSection;
      return (
        <View key={key} style={styles.buttonRow}>
          {s.buttons.map((btn, i) => {
            const buttonColors = getButtonStyle(btn.style);
            return (
              <TouchableOpacity
                key={i}
                style={[styles.buttonRowItem, { backgroundColor: buttonColors.bg }]}
                onPress={() => onButtonPress?.(btn.action, btn.payload)}
                activeOpacity={0.7}
              >
                <Text style={[styles.buttonText, { color: buttonColors.text }]}>{btn.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }

    case 'amount': {
      const s = section as AmountSection;
      const isPositive = s.value >= 0;
      const amountStyle = [
        styles.amount,
        s.size === 'large' && styles.amountLarge,
        s.size === 'xlarge' && styles.amountXLarge,
        { color: isPositive ? Colors.income : Colors.expense },
      ];
      const displayValue = s.showSign 
        ? `${isPositive ? '+' : ''}¥${Math.abs(s.value).toFixed(2)}`
        : `¥${Math.abs(s.value).toFixed(2)}`;
      return (
        <View key={key} style={styles.amountContainer}>
          {s.label && <Text style={styles.amountLabel}>{s.label}</Text>}
          <Text style={amountStyle}>{displayValue}</Text>
        </View>
      );
    }

    default:
      return null;
  }
};

export const DynamicCard: React.FC<DynamicCardProps> = ({ data, onButtonPress }) => {
  const { title, titleIcon, subtitle, sections, footer, variant } = data;

  const containerStyle = [
    styles.container,
    variant === 'outlined' && styles.containerOutlined,
    variant === 'elevated' && styles.containerElevated,
  ];

  return (
    <View style={containerStyle}>
      {/* 头部 */}
      {(title || subtitle) && (
        <View style={styles.header}>
          {title && (
            <View style={styles.titleContainer}>
              {titleIcon && (
                <Icon name={titleIcon} size={20} color={Colors.primary} />
              )}
              <Text style={[styles.title, titleIcon && styles.titleWithIcon]}>{title}</Text>
            </View>
          )}
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      )}

      {/* 内容区 */}
      <View style={styles.content}>
        {sections.map((section, index) => renderSection(section, index, onButtonPress))}
      </View>

      {/* 底部 */}
      {footer && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>{footer}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  containerOutlined: {
    backgroundColor: 'transparent',
  },
  containerElevated: {
    ...Shadows.md,
    borderWidth: 0,
  },

  // 头部
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.backgroundSecondary,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
  },
  titleWithIcon: {
    marginLeft: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // 内容区
  content: {
    padding: Spacing.md,
  },

  // 底部
  footer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.backgroundSecondary,
  },
  footerText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // Text Section
  text: {
    fontSize: FontSizes.md,
    color: Colors.text,
    lineHeight: 22,
    marginBottom: Spacing.xs,
  },
  textSecondary: {
    color: Colors.textSecondary,
  },
  textSmall: {
    fontSize: FontSizes.sm,
  },
  textBold: {
    fontWeight: FontWeights.bold,
  },
  textCenter: {
    textAlign: 'center',
  },
  textRight: {
    textAlign: 'right',
  },

  // Title Section
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  titleLevel2: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  titleLevel3: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
  },

  // Key-Value Section
  keyValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  keyValueLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  keyLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  labelWithIcon: {
    marginLeft: Spacing.xs,
  },
  keyValue: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },

  // Key-Value Row Section
  kvRowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.sm,
  },
  kvRowItem: {
    alignItems: 'center',
    flex: 1,
  },
  kvRowLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  kvRowValue: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
  },

  // Divider Section
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  dividerDashed: {
    borderStyle: 'dashed',
  },

  // Icon-Text Section
  iconTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  iconTextContent: {
    fontSize: FontSizes.md,
    color: Colors.text,
    marginLeft: Spacing.sm,
    flex: 1,
  },

  // Highlight Section
  highlight: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
    marginVertical: Spacing.xs,
  },
  highlightText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    flex: 1,
  },
  highlightTextWithIcon: {
    marginLeft: Spacing.sm,
  },

  // List Section
  listContainer: {
    marginVertical: Spacing.xs,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  listBullet: {
    width: 20,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  listItemText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.text,
    lineHeight: 20,
  },

  // Progress Section
  progressContainer: {
    marginVertical: Spacing.xs,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  progressPercentage: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    fontWeight: FontWeights.medium,
  },
  progressTrack: {
    height: 8,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.round,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.round,
  },

  // Tag Row Section
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  tag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.round,
  },
  tagText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
  },

  // Button Section
  button: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginVertical: Spacing.xs,
  },
  buttonText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
  },

  // Button Row Section
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginVertical: Spacing.xs,
  },
  buttonRowItem: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },

  // Amount Section
  amountContainer: {
    alignItems: 'center',
    marginVertical: Spacing.xs,
  },
  amountLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  amount: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
  },
  amountLarge: {
    fontSize: FontSizes.xxl,
  },
  amountXLarge: {
    fontSize: FontSizes.xxxl,
  },
});
