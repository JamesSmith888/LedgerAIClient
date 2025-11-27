/**
 * PlanDisplay - 执行计划展示组件
 * 
 * 显示 AI 生成的任务执行计划
 * 默认折叠，可展开查看具体步骤
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CollapsibleSection } from './CollapsibleSection';
import { Colors, Spacing, FontSizes, BorderRadius, FontWeights } from '../../../constants/theme';
import { ExecutionPlan, PlanStep } from '../../../agent/stateMachine';

export interface PlanDisplayProps {
  /** 执行计划 */
  plan: ExecutionPlan;
  /** 是否默认展开 */
  defaultExpanded?: boolean;
}

/**
 * 获取步骤类型图标
 */
const getStepIcon = (type: PlanStep['type']): string => {
  switch (type) {
    case 'llm_call': return '🤖';
    case 'tool_call': return '🔧';
    case 'confirmation': return '✋';
    default: return '•';
  }
};

/**
 * 获取步骤状态图标
 */
const getStatusIcon = (status: PlanStep['status']): string => {
  switch (status) {
    case 'pending': return '⏳';
    case 'running': return '🔄';
    case 'completed': return '✅';
    case 'failed': return '❌';
    case 'skipped': return '⏭️';
    default: return '';
  }
};

/**
 * 获取风险级别显示
 */
const getRiskDisplay = (requiresConfirmation: boolean): { label: string; color: string } => {
  if (requiresConfirmation) {
    return { label: '需确认', color: Colors.warning };
  }
  return { label: '安全', color: Colors.success };
};

export const PlanDisplay: React.FC<PlanDisplayProps> = ({
  plan,
  defaultExpanded = false,
}) => {
  const riskDisplay = useMemo(() => getRiskDisplay(plan.requiresConfirmation), [plan.requiresConfirmation]);

  const subtitle = useMemo(() => {
    const stepCount = plan.steps.length;
    return `${stepCount} 个步骤`;
  }, [plan.steps.length]);

  return (
    <CollapsibleSection
      title={`📋 ${plan.description}`}
      subtitle={subtitle}
      icon="list-outline"
      variant="default"
      defaultExpanded={defaultExpanded}
    >
      <View style={styles.content}>
        {/* 计划概要 */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>步骤数</Text>
            <Text style={styles.summaryValue}>{plan.steps.length}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>状态</Text>
            <View style={[styles.riskBadge, { backgroundColor: riskDisplay.color + '20' }]}>
              <Text style={[styles.riskText, { color: riskDisplay.color }]}>
                {riskDisplay.label}
              </Text>
            </View>
          </View>
        </View>

        {/* 步骤列表 */}
        <View style={styles.stepsContainer}>
          <Text style={styles.sectionTitle}>步骤详情</Text>
          {plan.steps.map((step, index) => (
            <View key={step.id} style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.stepContent}>
                <View style={styles.stepHeader}>
                  <Text style={styles.stepIcon}>{getStepIcon(step.type)}</Text>
                  <Text style={styles.stepDescription} numberOfLines={2}>
                    {step.description}
                  </Text>
                  <Text style={styles.statusIcon}>{getStatusIcon(step.status)}</Text>
                </View>
                {step.toolName && (
                  <Text style={styles.toolName}>
                    工具: {step.toolName}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* 确认提示 */}
        {plan.requiresConfirmation && (
          <View style={styles.confirmationNote}>
            <Text style={styles.confirmationIcon}>⚠️</Text>
            <Text style={styles.confirmationText}>
              此计划包含需要确认的操作
            </Text>
          </View>
        )}
      </View>
    </CollapsibleSection>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingTop: Spacing.xs,
  },

  // 概要行
  summaryRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
  },
  riskBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  riskText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
  },

  // 步骤容器
  stepsContainer: {
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },

  // 步骤项
  stepItem: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.xs,
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 10,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
  },
  stepContent: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    padding: Spacing.xs,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  stepDescription: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.text,
    lineHeight: 18,
  },
  statusIcon: {
    fontSize: 12,
    marginLeft: 4,
  },
  toolName: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
    marginLeft: 16,
  },

  // 确认提示
  confirmationNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '15',
    borderRadius: BorderRadius.sm,
    padding: Spacing.xs,
    marginTop: Spacing.sm,
  },
  confirmationIcon: {
    fontSize: 14,
    marginRight: Spacing.xs,
  },
  confirmationText: {
    fontSize: FontSizes.xs,
    color: Colors.warning,
    flex: 1,
  },
});

export default PlanDisplay;
