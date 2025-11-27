/**
 * ConfirmationDialog - 危险操作确认弹窗
 * 
 * 用于 Human-in-the-Loop 确认机制：
 * - 显示操作详情
 * - 风险级别指示
 * - 确认/取消操作
 * - 支持修改参数（可选）
 * 
 * 设计参考：iOS Alert + Material Design Dialog
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Icon } from '../common';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows, FontWeights } from '../../constants/theme';
import type { ConfirmationRequest } from '../../agent/utils/permissions';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============ 类型定义 ============

interface ConfirmationDialogProps {
  /** 是否可见 */
  visible: boolean;
  /** 确认请求 */
  request: ConfirmationRequest | null;
  /** 确认回调 */
  onConfirm: () => void;
  /** 取消回调 */
  onCancel: (reason?: string) => void;
  /** 关闭回调 */
  onClose: () => void;
  /** 是否显示取消原因输入（可选） */
  showReasonInput?: boolean;
  /** 自动关闭延时（毫秒，0表示不自动关闭） */
  autoCloseDelay?: number;
}

// ============ 风险级别配置 ============

const RISK_CONFIG = {
  low: {
    color: Colors.success,
    icon: 'checkmark-circle',
    label: '低风险',
    bgColor: '#E8F5E9',
  },
  medium: {
    color: '#FF9800',
    icon: 'alert-circle',
    label: '中等风险',
    bgColor: '#FFF3E0',
  },
  high: {
    color: '#FF5722',
    icon: 'warning',
    label: '高风险',
    bgColor: '#FBE9E7',
  },
  critical: {
    color: Colors.error,
    icon: 'skull',
    label: '关键危险',
    bgColor: '#FFEBEE',
  },
};

// ============ 组件实现 ============

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  visible,
  request,
  onConfirm,
  onCancel,
  onClose,
  showReasonInput = false,
  autoCloseDelay = 0,
}) => {
  // 动画
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.9));
  
  // 倒计时
  const [countdown, setCountdown] = useState(0);
  const [isExpired, setIsExpired] = useState(false);

  // 打开动画
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
      
      // 计算过期倒计时
      if (request?.expiresAt) {
        const remaining = Math.max(0, request.expiresAt - Date.now());
        setCountdown(Math.ceil(remaining / 1000));
        setIsExpired(remaining <= 0);
      }
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [visible, request]);

  // 倒计时效果
  useEffect(() => {
    if (!visible || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setIsExpired(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [visible, countdown > 0]);

  // 自动关闭
  useEffect(() => {
    if (isExpired && autoCloseDelay > 0) {
      const timer = setTimeout(() => {
        onCancel('确认请求已过期');
        onClose();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [isExpired, autoCloseDelay]);

  /**
   * 处理确认
   */
  const handleConfirm = useCallback(() => {
    if (isExpired) return;
    
    // 高风险操作添加触觉反馈
    if (request?.riskLevel === 'high' || request?.riskLevel === 'critical') {
      // Haptic feedback would go here
    }
    
    onConfirm();
    onClose();
  }, [isExpired, request, onConfirm, onClose]);

  /**
   * 处理取消
   */
  const handleCancel = useCallback(() => {
    onCancel();
    onClose();
  }, [onCancel, onClose]);

  /**
   * 渲染风险指示器
   */
  const renderRiskIndicator = () => {
    if (!request) return null;
    
    const config = RISK_CONFIG[request.riskLevel];
    
    return (
      <View style={[styles.riskBadge, { backgroundColor: config.bgColor }]}>
        <Icon name={config.icon} size={16} color={config.color} />
        <Text style={[styles.riskLabel, { color: config.color }]}>
          {config.label}
        </Text>
      </View>
    );
  };

  /**
   * 渲染操作详情
   */
  const renderDetails = () => {
    if (!request?.details || request.details.length === 0) return null;
    
    return (
      <View style={styles.detailsContainer}>
        <Text style={styles.detailsTitle}>操作详情</Text>
        {request.details.map((detail, index) => (
          <View key={index} style={styles.detailRow}>
            <Icon name="chevron-forward" size={14} color={Colors.textSecondary} />
            <Text style={styles.detailText}>{detail}</Text>
          </View>
        ))}
      </View>
    );
  };

  /**
   * 渲染倒计时
   */
  const renderCountdown = () => {
    if (countdown <= 0) return null;
    
    const isUrgent = countdown <= 30;
    
    return (
      <View style={styles.countdownContainer}>
        <Icon 
          name="time-outline" 
          size={14} 
          color={isUrgent ? Colors.error : Colors.textSecondary} 
        />
        <Text style={[
          styles.countdownText,
          isUrgent && styles.countdownUrgent,
        ]}>
          {countdown}秒后过期
        </Text>
      </View>
    );
  };

  /**
   * 渲染过期提示
   */
  const renderExpiredMessage = () => {
    if (!isExpired) return null;
    
    return (
      <View style={styles.expiredContainer}>
        <Icon name="alert-circle" size={20} color={Colors.error} />
        <Text style={styles.expiredText}>确认请求已过期，请重新操作</Text>
      </View>
    );
  };

  if (!request) return null;

  const riskConfig = RISK_CONFIG[request.riskLevel];
  const isCritical = request.riskLevel === 'critical';

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={handleCancel}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View 
          style={[
            styles.dialogContainer,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* 头部：风险指示 */}
          <View style={[styles.header, { backgroundColor: riskConfig.bgColor }]}>
            <View style={styles.iconContainer}>
              <Icon name={riskConfig.icon} size={32} color={riskConfig.color} />
            </View>
            {renderRiskIndicator()}
          </View>

          {/* 内容区域 */}
          <ScrollView 
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
          >
            {/* 标题 */}
            <Text style={styles.title}>需要确认</Text>
            
            {/* 主要消息 */}
            <Text style={styles.message}>{request.message}</Text>
            
            {/* 工具名称 */}
            <View style={styles.toolBadge}>
              <Icon name="construct-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.toolName}>{request.toolName}</Text>
            </View>
            
            {/* 操作详情 */}
            {renderDetails()}
            
            {/* 倒计时 */}
            {renderCountdown()}
            
            {/* 过期提示 */}
            {renderExpiredMessage()}
            
            {/* 关键危险警告 */}
            {isCritical && !isExpired && (
              <View style={styles.criticalWarning}>
                <Icon name="warning" size={18} color={Colors.error} />
                <Text style={styles.criticalText}>
                  这是一个不可逆操作，请谨慎确认！
                </Text>
              </View>
            )}
          </ScrollView>

          {/* 按钮区域 */}
          <View style={styles.buttonContainer}>
            {/* 取消按钮 */}
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>取消</Text>
            </TouchableOpacity>
            
            {/* 确认按钮 */}
            <TouchableOpacity
              style={[
                styles.button, 
                styles.confirmButton,
                { backgroundColor: riskConfig.color },
                isExpired && styles.buttonDisabled,
              ]}
              onPress={handleConfirm}
              activeOpacity={0.7}
              disabled={isExpired}
            >
              <Icon 
                name={isCritical ? 'skull' : 'checkmark'} 
                size={18} 
                color={Colors.surface} 
              />
              <Text style={styles.confirmButtonText}>
                {isCritical ? '我确认执行' : '确认'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// ============ 简化版确认弹窗 ============

interface SimpleConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * 简化版确认弹窗 - 用于简单场景
 */
export const SimpleConfirmDialog: React.FC<SimpleConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  danger = false,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.simpleDialogContainer}>
          <Text style={styles.simpleTitle}>{title}</Text>
          <Text style={styles.simpleMessage}>{message}</Text>
          
          <View style={styles.simpleButtonContainer}>
            <TouchableOpacity
              style={[styles.simpleButton, styles.simpleCancelButton]}
              onPress={onCancel}
            >
              <Text style={styles.simpleCancelText}>{cancelText}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.simpleButton, 
                styles.simpleConfirmButton,
                danger && styles.simpleConfirmDanger,
              ]}
              onPress={onConfirm}
            >
              <Text style={[
                styles.simpleConfirmText,
                danger && styles.simpleConfirmTextDanger,
              ]}>
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ============ 执行计划确认弹窗 ============

interface PlanConfirmDialogProps {
  visible: boolean;
  planDescription: string;
  steps: Array<{ description: string; type: string }>;
  estimatedDuration?: string;
  warnings?: string[];
  onConfirm: () => void;
  onCancel: () => void;
  onModify?: () => void;
}

/**
 * 执行计划确认弹窗
 */
export const PlanConfirmDialog: React.FC<PlanConfirmDialogProps> = ({
  visible,
  planDescription,
  steps,
  estimatedDuration,
  warnings = [],
  onConfirm,
  onCancel,
  onModify,
}) => {
  const getStepIcon = (type: string) => {
    switch (type) {
      case 'llm_call': return 'chatbubble-outline';
      case 'tool_call': return 'construct-outline';
      case 'confirmation': return 'hand-left-outline';
      default: return 'ellipse-outline';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onCancel}
    >
      <View style={styles.planOverlay}>
        <View style={styles.planDialogContainer}>
          {/* 头部 */}
          <View style={styles.planHeader}>
            <Icon name="document-text-outline" size={24} color={Colors.primary} />
            <Text style={styles.planTitle}>执行计划确认</Text>
          </View>

          {/* 计划描述 */}
          <Text style={styles.planDescription}>{planDescription}</Text>

          {/* 预估时间 */}
          {estimatedDuration && (
            <View style={styles.estimateContainer}>
              <Icon name="time-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.estimateText}>预计耗时: {estimatedDuration}</Text>
            </View>
          )}

          {/* 步骤列表 */}
          <ScrollView style={styles.stepsContainer}>
            {steps.map((step, index) => (
              <View key={index} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Icon name={getStepIcon(step.type)} size={16} color={Colors.textSecondary} />
                <Text style={styles.stepText}>{step.description}</Text>
              </View>
            ))}
          </ScrollView>

          {/* 警告 */}
          {warnings.length > 0 && (
            <View style={styles.warningsContainer}>
              {warnings.map((warning, index) => (
                <Text key={index} style={styles.warningText}>{warning}</Text>
              ))}
            </View>
          )}

          {/* 按钮 */}
          <View style={styles.planButtonContainer}>
            <TouchableOpacity
              style={[styles.planButton, styles.planCancelButton]}
              onPress={onCancel}
            >
              <Text style={styles.planCancelText}>取消</Text>
            </TouchableOpacity>
            
            {onModify && (
              <TouchableOpacity
                style={[styles.planButton, styles.planModifyButton]}
                onPress={onModify}
              >
                <Icon name="create-outline" size={16} color={Colors.primary} />
                <Text style={styles.planModifyText}>修改</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.planButton, styles.planConfirmButton]}
              onPress={onConfirm}
            >
              <Icon name="play" size={16} color={Colors.surface} />
              <Text style={styles.planConfirmText}>执行</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ============ 样式 ============

const styles = StyleSheet.create({
  // 主确认弹窗
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogContainer: {
    width: SCREEN_WIDTH * 0.85,
    maxWidth: 400,
    maxHeight: SCREEN_HEIGHT * 0.7,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  
  // 头部
  header: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    ...Shadows.md,
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.round,
  },
  riskLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    marginLeft: Spacing.xs,
  },
  
  // 内容
  content: {
    maxHeight: SCREEN_HEIGHT * 0.35,
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: FontSizes.md,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  toolBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  toolName: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },
  
  // 详情
  detailsContainer: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  detailsTitle: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  detailText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    marginLeft: Spacing.xs,
    flex: 1,
  },
  
  // 倒计时
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  countdownText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },
  countdownUrgent: {
    color: Colors.error,
    fontWeight: FontWeights.semibold,
  },
  
  // 过期
  expiredContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEBEE',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  expiredText: {
    fontSize: FontSizes.sm,
    color: Colors.error,
    marginLeft: Spacing.sm,
    fontWeight: FontWeights.medium,
  },
  
  // 关键警告
  criticalWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  criticalText: {
    fontSize: FontSizes.sm,
    color: Colors.error,
    marginLeft: Spacing.sm,
    flex: 1,
    fontWeight: FontWeights.medium,
  },
  
  // 按钮
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.xs,
  },
  cancelButton: {
    backgroundColor: Colors.backgroundSecondary,
  },
  confirmButton: {
    backgroundColor: Colors.primary,
  },
  cancelButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
  },
  confirmButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.surface,
    marginLeft: Spacing.xs,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  
  // 简化弹窗
  simpleDialogContainer: {
    width: SCREEN_WIDTH * 0.8,
    maxWidth: 320,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.lg,
  },
  simpleTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  simpleMessage: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  simpleButtonContainer: {
    flexDirection: 'row',
  },
  simpleButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.xs,
    alignItems: 'center',
  },
  simpleCancelButton: {
    backgroundColor: Colors.backgroundSecondary,
  },
  simpleConfirmButton: {
    backgroundColor: Colors.primary,
  },
  simpleConfirmDanger: {
    backgroundColor: Colors.error,
  },
  simpleCancelText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
  },
  simpleConfirmText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.surface,
  },
  simpleConfirmTextDanger: {
    color: Colors.surface,
  },
  
  // 计划确认弹窗
  planOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  planDialogContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: SCREEN_HEIGHT * 0.75,
    paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.lg,
    ...Shadows.lg,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  planTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  planDescription: {
    fontSize: FontSizes.md,
    color: Colors.text,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    lineHeight: 22,
  },
  estimateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  estimateText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },
  stepsContainer: {
    maxHeight: SCREEN_HEIGHT * 0.3,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  stepNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  stepNumberText: {
    fontSize: FontSizes.xs,
    color: Colors.surface,
    fontWeight: FontWeights.bold,
  },
  stepText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  warningsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  warningText: {
    fontSize: FontSizes.sm,
    color: '#FF9800',
    marginBottom: Spacing.xs,
  },
  planButtonContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  planButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.xs,
  },
  planCancelButton: {
    backgroundColor: Colors.backgroundSecondary,
  },
  planModifyButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  planConfirmButton: {
    backgroundColor: Colors.primary,
  },
  planCancelText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
  },
  planModifyText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
    marginLeft: Spacing.xs,
  },
  planConfirmText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.surface,
    marginLeft: Spacing.xs,
  },
});

export default ConfirmationDialog;
