/**
 * ConfirmationDialog - 危险操作确认弹窗
 * 
 * 用于 Human-in-the-Loop 确认机制：
 * - 用户友好的操作描述（让普通用户一眼看懂）
 * - 可折叠的技术详情（给高级用户/调试用）
 * - 风险级别视觉区分
 * - 确认/取消/始终允许操作
 * 
 * 设计参考：iOS Alert + Material Design Dialog + 用户体验优先
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
  LayoutAnimation,
} from 'react-native';
import { Icon } from '../common';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows, FontWeights } from '../../constants/theme';
import type { ConfirmationRequest } from '../../agent/utils/permissions';

// 注意：新架构下 LayoutAnimation 默认可用，无需调用 setLayoutAnimationEnabledExperimental

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
  /** "始终允许"回调（可选） */
  onAlwaysAllow?: (toolName: string) => void;
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
    label: '安全操作',
    headerBg: '#E8F5E9',
    headerBorder: '#4CAF50',
    titleColor: '#1B5E20',
    emoji: '✅',
  },
  medium: {
    color: Colors.primary,
    icon: 'information-circle',
    label: '需要确认',
    headerBg: '#E3F2FD',
    headerBorder: '#2196F3',
    titleColor: '#0D47A1',
    emoji: '📝',
  },
  high: {
    color: '#FF9800',
    icon: 'alert-circle',
    label: '请谨慎操作',
    headerBg: '#FFF3E0',
    headerBorder: '#FF9800',
    titleColor: '#E65100',
    emoji: '⚠️',
  },
  critical: {
    color: Colors.error,
    icon: 'warning',
    label: '危险操作',
    headerBg: '#FFEBEE',
    headerBorder: '#F44336',
    titleColor: '#B71C1C',
    emoji: '🔴',
  },
};

// ============ 组件实现 ============

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  visible,
  request,
  onConfirm,
  onCancel,
  onClose,
  onAlwaysAllow,
  showReasonInput = false,
  autoCloseDelay = 0,
}) => {
  // 动画
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.9));
  
  // 技术详情展开状态
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  
  // 倒计时
  const [countdown, setCountdown] = useState(0);
  const [isExpired, setIsExpired] = useState(false);

  // 切换技术详情
  const toggleTechnicalDetails = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowTechnicalDetails(prev => !prev);
  }, []);

  // 打开动画
  useEffect(() => {
    if (visible) {
      // 重置技术详情状态
      setShowTechnicalDetails(false);
      
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
    setShowTechnicalDetails(false);
    onCancel();
    onClose();
  }, [onCancel, onClose]);

  /**
   * 处理"始终允许"
   */
  const handleAlwaysAllow = useCallback(() => {
    if (!request || !onAlwaysAllow) return;
    
    // 对于领域工具，使用 toolName.action 作为 key
    const action = request.toolArgs?.action as string | undefined;
    const key = action ? `${request.toolName}.${action}` : request.toolName;
    onAlwaysAllow(key);
    handleConfirm();
  }, [request, onAlwaysAllow, handleConfirm]);

  /**
   * 渲染用户友好的关键信息点
   */
  const renderKeyPoints = () => {
    const userFriendly = request?.userFriendly;
    if (!userFriendly?.keyPoints || userFriendly.keyPoints.length === 0) return null;
    
    return (
      <View style={styles.keyPointsContainer}>
        {userFriendly.keyPoints.map((point, index) => (
          <View key={index} style={styles.keyPointItem}>
            <Text style={styles.keyPointText}>{point}</Text>
          </View>
        ))}
      </View>
    );
  };

  /**
   * 渲染影响说明
   */
  const renderImpact = () => {
    const userFriendly = request?.userFriendly;
    const riskLevel = request?.riskLevel;
    
    if (!userFriendly?.impact) return null;
    
    const isDanger = riskLevel === 'critical' || riskLevel === 'high';
    
    return (
      <View style={[
        styles.impactContainer,
        isDanger && styles.impactContainerDanger,
      ]}>
        <Text style={[
          styles.impactText,
          isDanger && styles.impactTextDanger,
        ]}>
          {userFriendly.impact}
        </Text>
      </View>
    );
  };

  /**
   * 渲染技术详情（可折叠）
   */
  const renderTechnicalDetails = () => {
    const technicalDetails = request?.technicalDetails;
    if (!technicalDetails) return null;
    
    return (
      <View style={styles.technicalSection}>
        {/* 展开/收起按钮 */}
        <TouchableOpacity
          style={styles.technicalToggle}
          onPress={toggleTechnicalDetails}
          activeOpacity={0.7}
        >
          <Icon
            name="help-circle-outline"
            size={16}
            color={Colors.textSecondary}
          />
          <Text style={styles.technicalToggleText}>
            {showTechnicalDetails ? '收起技术详情' : '这是什么？查看详情'}
          </Text>
          <Icon
            name={showTechnicalDetails ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={Colors.textSecondary}
          />
        </TouchableOpacity>
        
        {/* 技术详情内容 */}
        {showTechnicalDetails && (
          <View style={styles.technicalContent}>
            <View style={styles.technicalHeader}>
              <Icon name="code-slash-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.technicalTitle}>技术信息</Text>
            </View>
            
            <Text style={styles.technicalExplain}>
              AI 助手正在请求执行以下操作，这些是发送给服务器的具体指令：
            </Text>
            
            <View style={styles.technicalItem}>
              <Text style={styles.technicalLabel}>接口名称</Text>
              <Text style={styles.technicalValue}>{technicalDetails.toolName}</Text>
            </View>
            
            {technicalDetails.action && (
              <View style={styles.technicalItem}>
                <Text style={styles.technicalLabel}>操作类型</Text>
                <Text style={styles.technicalValue}>{technicalDetails.action}</Text>
              </View>
            )}
            
            {technicalDetails.formattedArgs && technicalDetails.formattedArgs.length > 0 && (
              <View style={styles.technicalArgsSection}>
                <Text style={styles.technicalArgsTitle}>请求参数：</Text>
                {technicalDetails.formattedArgs.map((arg, index) => (
                  <Text key={index} style={styles.technicalArgItem}>
                    • {arg}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}
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
  const userFriendly = request.userFriendly;
  
  // 获取显示标题（优先使用用户友好版本）
  const displayTitle = userFriendly?.title || '需要确认';
  const displayDescription = userFriendly?.description || request.message;

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
          {/* 头部：使用用户友好的标题 */}
          <View style={[styles.header, { backgroundColor: riskConfig.headerBg, borderBottomColor: riskConfig.headerBorder }]}>
            <Text style={styles.headerEmoji}>{riskConfig.emoji}</Text>
            <Text style={[styles.headerTitle, { color: riskConfig.titleColor }]}>
              {displayTitle}
            </Text>
          </View>

          {/* 内容区域 */}
          <ScrollView 
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* 主要描述（用户友好版） */}
            <Text style={styles.message}>{displayDescription}</Text>
            
            {/* 关键信息点 */}
            {renderKeyPoints()}
            
            {/* 影响说明 */}
            {renderImpact()}
            
            {/* 倒计时 */}
            {renderCountdown()}
            
            {/* 过期提示 */}
            {renderExpiredMessage()}
            
            {/* 关键危险警告 */}
            {isCritical && !isExpired && (
              <View style={styles.criticalWarning}>
                <Icon name="warning" size={18} color={Colors.error} />
                <Text style={styles.criticalText}>
                  ⚠️ 此操作执行后无法撤销，请仔细确认！
                </Text>
              </View>
            )}
            
            {/* 技术详情（可折叠） */}
            {renderTechnicalDetails()}
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
                name={isCritical ? 'warning' : 'checkmark'} 
                size={18} 
                color={Colors.surface} 
              />
              <Text style={styles.confirmButtonText}>
                {isCritical ? '我确认执行' : '确认'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* 始终允许按钮（非 critical 级别且提供了回调） */}
          {request.riskLevel !== 'critical' && onAlwaysAllow && !isExpired && (
            <TouchableOpacity
              style={styles.alwaysAllowButton}
              onPress={handleAlwaysAllow}
              activeOpacity={0.7}
            >
              <Icon name="checkmark-circle-outline" size={16} color={Colors.primary} />
              <Text style={styles.alwaysAllowText}>始终允许此操作</Text>
            </TouchableOpacity>
          )}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 2,
  },
  headerEmoji: {
    fontSize: 24,
    marginRight: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    flex: 1,
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
    maxHeight: SCREEN_HEIGHT * 0.4,
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
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
    lineHeight: 24,
    marginBottom: Spacing.md,
  },
  
  // 关键信息点（用户友好版）
  keyPointsContainer: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  keyPointItem: {
    paddingVertical: 4,
  },
  keyPointText: {
    fontSize: FontSizes.md,
    color: Colors.text,
    lineHeight: 22,
  },
  
  // 影响说明
  impactContainer: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  impactContainerDanger: {
    backgroundColor: '#FFF3E0',
  },
  impactText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  impactTextDanger: {
    color: '#E65100',
  },
  
  // 技术详情区域
  technicalSection: {
    marginTop: Spacing.sm,
  },
  technicalToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  },
  technicalToggleText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginHorizontal: Spacing.xs,
  },
  technicalContent: {
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  technicalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  technicalTitle: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeights.medium,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  technicalExplain: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  technicalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  technicalLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  technicalValue: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  technicalArgsSection: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  technicalArgsTitle: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  technicalArgItem: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 18,
    paddingLeft: Spacing.xs,
  },
  
  // 始终允许按钮
  alwaysAllowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  alwaysAllowText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    marginLeft: Spacing.xs,
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
