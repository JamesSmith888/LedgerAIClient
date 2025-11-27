/**
 * ToolCallDisplay - 工具调用展示组件
 * 
 * 将工具调用和结果合并为可折叠的区域显示
 * 默认折叠，点击可展开查看详细结果
 * 
 * 设计原则：
 * 1. 简洁 - 默认折叠，不干扰对话流
 * 2. 可访问 - 用户需要时可轻松查看详情
 * 3. 完整 - 显示请求参数和完整返回结果
 * 4. 可扩展 - 支持不同类型工具的自定义渲染
 */

import React, { useMemo, useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, Clipboard } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { CollapsibleSection } from './CollapsibleSection';
import { Colors, Spacing, FontSizes, BorderRadius, FontWeights } from '../../../constants/theme';

export interface ToolCallData {
  /** 工具名称 */
  toolName: string;
  /** 工具调用状态 */
  status: 'pending' | 'running' | 'completed' | 'error';
  /** 工具调用参数（可选） */
  args?: Record<string, any>;
  /** 工具返回结果 */
  result?: string;
  /** 错误信息 */
  error?: string;
  /** 调用时间 */
  timestamp?: Date;
}

export interface ToolCallDisplayProps {
  /** 工具调用数据 */
  toolCall: ToolCallData;
  /** 是否默认展开 */
  defaultExpanded?: boolean;
}

/**
 * 获取工具名称的友好显示
 */
const getToolDisplayName = (toolName: string): string => {
  const displayNames: Record<string, string> = {
    // 领域聚合工具
    'transaction': '交易管理',
    'category': '分类管理',
    'payment_method': '支付方式',
    'context': '上下文信息',
    // 原有工具
    'get_user_info': '获取用户信息',
    'get_current_ledger': '获取当前账本',
    'get_all_ledgers': '获取账本列表',
    'get_full_context': '获取完整上下文',
    'get_categories_by_ledger_id': '获取分类列表',
    'get_ledger_detail': '获取账本详情',
    'search_category': '搜索分类',
    'create_transaction': '创建交易',
    'query_transactions': '查询交易',
    'get_statistics': '获取统计数据',
    // 渲染工具
    'render_transaction_list': '渲染交易列表',
    'render_transaction_detail': '渲染交易详情',
    'render_statistics_card': '渲染统计卡片',
    'render_action_buttons': '渲染操作按钮',
  };
  return displayNames[toolName] || toolName;
};

/**
 * 获取工具图标
 */
const getToolIcon = (toolName: string): string => {
  if (toolName.includes('user')) return 'person-outline';
  if (toolName.includes('ledger')) return 'book-outline';
  if (toolName.includes('category') || toolName.includes('categories')) return 'folder-outline';
  if (toolName.includes('transaction')) return 'receipt-outline';
  if (toolName.includes('statistics')) return 'stats-chart-outline';
  if (toolName.includes('context')) return 'information-circle-outline';
  return 'construct-outline';
};

/**
 * 格式化 JSON 结果为可读格式
 */
const formatResult = (result: string): string => {
  try {
    const parsed = JSON.parse(result);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return result;
  }
};

export const ToolCallDisplay: React.FC<ToolCallDisplayProps> = ({
  toolCall,
  defaultExpanded = false,
}) => {
  const { toolName, status, result, error, args } = toolCall;
  const [copied, setCopied] = useState(false);

  const displayName = useMemo(() => getToolDisplayName(toolName), [toolName]);
  const toolIcon = useMemo(() => getToolIcon(toolName), [toolName]);
  const formattedResult = useMemo(
    () => (result ? formatResult(result) : undefined),
    [result]
  );

  // 复制结果到剪贴板
  const handleCopyResult = useCallback(() => {
    const textToCopy = error || formattedResult || result || '';
    if (textToCopy) {
      Clipboard.setString(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [error, formattedResult, result]);

  // 根据状态决定变体样式
  const variant = status === 'error' ? 'warning' : status === 'completed' ? 'tool' : 'default';
  
  // 简洁的状态显示文本
  const statusText = status === 'completed' ? '✅ 已完成' : 
                     status === 'running' ? '⏳ 执行中' : 
                     status === 'error' ? '❌ 失败' : '⏳ 等待中';

  return (
    <CollapsibleSection
      title={displayName}
      subtitle={statusText}
      icon={toolIcon}
      variant={variant}
      defaultExpanded={defaultExpanded}
    >
      <View style={styles.content}>
        {/* 工具名称 - 简化显示 */}
        <View style={styles.infoRow}>
          <Text style={styles.label}>工具</Text>
          <Text style={styles.value} numberOfLines={1}>{toolName}</Text>
        </View>

        {/* 请求参数 - 始终显示完整内容 */}
        {args && Object.keys(args).length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>请求参数</Text>
              <TouchableOpacity 
                style={styles.copyButton} 
                onPress={() => {
                  Clipboard.setString(JSON.stringify(args, null, 2));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                activeOpacity={0.7}
              >
                <Icon 
                  name="copy-outline" 
                  size={14} 
                  color={Colors.primary} 
                />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.argsScrollView}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
            >
              <View style={styles.codeBlock}>
                <Text style={styles.codeText} selectable={true}>
                  {JSON.stringify(args, null, 2)}
                </Text>
              </View>
            </ScrollView>
          </View>
        )}

        {/* 返回结果 - 完整显示，可复制 */}
        {(result || error) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {error ? '错误信息' : '返回结果'}
              </Text>
              <TouchableOpacity 
                style={styles.copyButton} 
                onPress={handleCopyResult}
                activeOpacity={0.7}
              >
                <Icon 
                  name={copied ? 'checkmark' : 'copy-outline'} 
                  size={14} 
                  color={copied ? Colors.success : Colors.primary} 
                />
                <Text style={[styles.copyText, copied && styles.copiedText]}>
                  {copied ? '已复制' : '复制'}
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.resultScrollView}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
            >
              <View style={[styles.codeBlock, error && styles.errorBlock]}>
                <Text 
                  style={[styles.codeText, error && styles.errorText]}
                  selectable={true}
                >
                  {error || formattedResult}
                </Text>
              </View>
            </ScrollView>
          </View>
        )}
      </View>
    </CollapsibleSection>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingTop: 2,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },

  label: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    width: 32,
  },

  value: {
    fontSize: FontSizes.xs,
    color: Colors.text,
    flex: 1,
  },

  section: {
    marginTop: 4,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },

  sectionTitle: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },

  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 1,
    paddingHorizontal: 4,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.backgroundSecondary,
  },

  copyText: {
    fontSize: 10,
    color: Colors.primary,
    marginLeft: 2,
  },

  copiedText: {
    color: Colors.success,
  },

  codeScrollView: {
    maxWidth: '100%',
  },

  argsScrollView: {
    maxHeight: 150, // 请求参数最大高度
  },

  resultScrollView: {
    maxHeight: 300, // 返回结果最大高度
  },

  codeBlock: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    padding: Spacing.xs,
  },

  errorBlock: {
    backgroundColor: Colors.error + '10',
    borderColor: Colors.error + '40',
    borderWidth: 1,
  },

  codeText: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: Colors.text,
    lineHeight: 14,
  },

  errorText: {
    color: Colors.error,
  },
});

export default ToolCallDisplay;
