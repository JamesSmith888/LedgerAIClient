/**
 * APIKeyGuide - API Key 配置引导组件
 * 
 * 当用户首次使用 AI Agent 时，友好地引导用户配置 API Key
 * 设计风格参考 Telegram/Google Material Design
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Icon, AppIcons } from '../common';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius, Shadows } from '../../constants/theme';
import { AI_PROVIDERS, AIProvider } from '../../services/apiKeyStorage';

interface APIKeyGuideProps {
  /** 是否显示 */
  visible: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 配置完成回调 */
  onConfigured?: () => void;
  /** 是否允许跳过（仅首次引导时为 false） */
  allowSkip?: boolean;
}

/**
 * 引导步骤配置
 */
const GUIDE_STEPS = [
  {
    id: 'welcome',
    title: '欢迎使用 AI Agent',
    description: '智能助手可以帮你记账、分析消费、提供建议。\n开始之前，需要配置一个 AI 模型的 API Key。',
    icon: '🤖',
  },
  {
    id: 'choose',
    title: '选择 AI 提供商',
    description: '我们支持多种 AI 模型，请选择一个获取 API Key：',
    icon: '🔑',
  },
  {
    id: 'setup',
    title: '获取 API Key',
    description: '按照以下步骤获取您的 API Key：',
    icon: '📝',
  },
];

/**
 * 提供商卡片组件
 */
const ProviderOptionCard: React.FC<{
  provider: AIProvider;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ provider, isSelected, onSelect }) => {
  const config = AI_PROVIDERS[provider];
  
  return (
    <TouchableOpacity
      style={[
        styles.providerOption,
        isSelected && styles.providerOptionSelected,
      ]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={styles.providerOptionLeft}>
        <Text style={styles.providerIcon}>{config.icon}</Text>
        <View style={styles.providerTextContainer}>
          <Text style={styles.providerName}>{config.name}</Text>
          <Text style={styles.providerDesc}>{config.description}</Text>
        </View>
      </View>
      <View style={[
        styles.radioOuter,
        isSelected && styles.radioOuterSelected,
      ]}>
        {isSelected && <View style={styles.radioInner} />}
      </View>
    </TouchableOpacity>
  );
};

/**
 * 获取 API Key 步骤卡片
 */
const SetupStepCard: React.FC<{
  step: number;
  title: string;
  description: string;
  action?: {
    text: string;
    onPress: () => void;
  };
}> = ({ step, title, description, action }) => (
  <View style={styles.setupStep}>
    <View style={styles.stepNumber}>
      <Text style={styles.stepNumberText}>{step}</Text>
    </View>
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepDescription}>{description}</Text>
      {action && (
        <TouchableOpacity
          style={styles.stepAction}
          onPress={action.onPress}
          activeOpacity={0.7}
        >
          <Text style={styles.stepActionText}>{action.text}</Text>
          <Icon name={AppIcons.link} size={14} color={Colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  </View>
);

export const APIKeyGuide: React.FC<APIKeyGuideProps> = ({
  visible,
  onClose,
  onConfigured,
  allowSkip = false,
}) => {
  const navigation = useNavigation<any>();
  
  // 当前步骤索引
  const [currentStep, setCurrentStep] = useState(0);
  // 选中的提供商
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('gemini');
  // 动画值
  const [fadeAnim] = useState(new Animated.Value(0));
  
  // 显示时播放动画
  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible]);
  
  // 下一步
  const handleNext = useCallback(() => {
    if (currentStep < GUIDE_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep]);
  
  // 上一步
  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);
  
  // 打开获取 API Key 的链接
  const handleOpenLink = useCallback(() => {
    const url = AI_PROVIDERS[selectedProvider].helpUrl;
    Linking.openURL(url).catch(() => {
      // 如果无法打开链接，可以提示用户
    });
  }, [selectedProvider]);
  
  // 前往设置页面
  const handleGoToSettings = useCallback(() => {
    onClose();
    // 延迟导航以确保 Modal 完全关闭
    setTimeout(() => {
      navigation.navigate('APIKeySettings');
    }, 100);
  }, [navigation, onClose]);
  
  // 跳过
  const handleSkip = useCallback(() => {
    onClose();
  }, [onClose]);
  
  // 获取当前步骤的设置指引
  const getSetupSteps = useCallback(() => {
    const provider = AI_PROVIDERS[selectedProvider];
    return [
      {
        title: '访问官方网站',
        description: `前往 ${provider.name} 的 API 控制台`,
        action: {
          text: '打开链接',
          onPress: handleOpenLink,
        },
      },
      {
        title: '登录或注册账号',
        description: provider.id === 'gemini' 
          ? '使用 Google 账号登录 Google AI Studio'
          : '使用手机号或邮箱注册 DeepSeek 账号',
      },
      {
        title: '创建 API Key',
        description: provider.id === 'gemini'
          ? '点击 "Create API Key" 按钮生成新的密钥'
          : '在 API Keys 页面点击 "创建 API Key"',
      },
      {
        title: '复制并配置',
        description: '复制生成的 API Key，然后在设置页面中粘贴',
        action: {
          text: '前往设置',
          onPress: handleGoToSettings,
        },
      },
    ];
  }, [selectedProvider, handleOpenLink, handleGoToSettings]);
  
  // 渲染步骤内容
  const renderStepContent = () => {
    const step = GUIDE_STEPS[currentStep];
    
    switch (step.id) {
      case 'welcome':
        return (
          <ScrollView 
            style={styles.stepScroll}
            contentContainerStyle={styles.welcomeContentContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.welcomeIconContainer}>
              <Text style={styles.welcomeIcon}>{step.icon}</Text>
            </View>
            <Text style={styles.welcomeTitle}>{step.title}</Text>
            <Text style={styles.welcomeDescription}>{step.description}</Text>
            
            {/* 功能亮点 */}
            <View style={styles.features}>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>💬</Text>
                <Text style={styles.featureText}>自然语言记账</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>📊</Text>
                <Text style={styles.featureText}>智能分析</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>🔮</Text>
                <Text style={styles.featureText}>消费建议</Text>
              </View>
            </View>
          </ScrollView>
        );
        
      case 'choose':
        return (
          <ScrollView 
            style={styles.stepScroll}
            contentContainerStyle={styles.chooseContentContainer}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionTitle}>{step.description}</Text>
            
            <View style={styles.providersList}>
              {(Object.keys(AI_PROVIDERS) as AIProvider[]).map((provider) => (
                <ProviderOptionCard
                  key={provider}
                  provider={provider}
                  isSelected={selectedProvider === provider}
                  onSelect={() => setSelectedProvider(provider)}
                />
              ))}
            </View>
            
            {/* 提供商特点说明 */}
            <View style={styles.providerTips}>
              <Icon name={AppIcons.informationCircle} size={16} color={Colors.primary} />
              <Text style={styles.providerTipsText}>
                {selectedProvider === 'gemini' 
                  ? 'Google Gemini 支持图片识别，可以拍照记账'
                  : 'DeepSeek 性价比高，中文理解能力强'}
              </Text>
            </View>
          </ScrollView>
        );
        
      case 'setup':
        return (
          <ScrollView 
            style={styles.setupContent}
            contentContainerStyle={styles.setupContentContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.selectedProviderBadge}>
              <Text style={styles.selectedProviderIcon}>
                {AI_PROVIDERS[selectedProvider].icon}
              </Text>
              <Text style={styles.selectedProviderName}>
                {AI_PROVIDERS[selectedProvider].name}
              </Text>
            </View>
            
            {getSetupSteps().map((step, index) => (
              <SetupStepCard
                key={index}
                step={index + 1}
                title={step.title}
                description={step.description}
                action={step.action}
              />
            ))}
            
            {/* 安全提示 */}
            <View style={styles.securityNote}>
              <Icon name={AppIcons.checkmarkCircle} size={16} color={Colors.success} />
              <Text style={styles.securityNoteText}>
                API Key 仅存储在您的设备本地，不会上传到任何服务器
              </Text>
            </View>
          </ScrollView>
        );
        
      default:
        return null;
    }
  };
  
  if (!visible) return null;
  
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={allowSkip ? onClose : undefined}
    >
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.container,
            { opacity: fadeAnim },
          ]}
        >
          {/* 头部 */}
          <View style={styles.header}>
            {currentStep > 0 ? (
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleBack}
                activeOpacity={0.7}
              >
                <Icon name={AppIcons.chevronBack} size={24} color={Colors.text} />
              </TouchableOpacity>
            ) : (
              <View style={styles.backButton} />
            )}
            
            {/* 步骤指示器 */}
            <View style={styles.stepIndicator}>
              {GUIDE_STEPS.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.stepDot,
                    index === currentStep && styles.stepDotActive,
                    index < currentStep && styles.stepDotCompleted,
                  ]}
                />
              ))}
            </View>
            
            {allowSkip ? (
              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleSkip}
                activeOpacity={0.7}
              >
                <Text style={styles.skipButtonText}>跳过</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.skipButton} />
            )}
          </View>
          
          {/* 内容区域 */}
          <View style={styles.content}>
            {renderStepContent()}
          </View>
          
          {/* 底部按钮 */}
          <View style={styles.footer}>
            {currentStep < GUIDE_STEPS.length - 1 ? (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleNext}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>继续</Text>
                <Icon name={AppIcons.arrowForward} size={20} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleGoToSettings}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>前往配置</Text>
                <Icon name={AppIcons.settingsOutline} size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    minHeight: 450,
    maxHeight: '90%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    ...Shadows.xl,
  },
  
  // 头部
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  stepDotActive: {
    width: 24,
    backgroundColor: Colors.primary,
  },
  stepDotCompleted: {
    backgroundColor: Colors.success,
  },
  skipButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  
  // 内容区域
  content: {
    flex: 1,
  },
  stepScroll: {
    flex: 1,
  },
  
  // 欢迎页
  welcomeContentContainer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  welcomeIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  welcomeIcon: {
    fontSize: 40,
  },
  welcomeTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  welcomeDescription: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xl,
    marginTop: Spacing.md,
  },
  featureItem: {
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 28,
    marginBottom: Spacing.xs,
  },
  featureText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    fontWeight: FontWeights.medium,
  },
  
  // 选择提供商页
  chooseContentContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  providersList: {
    gap: Spacing.sm,
  },
  providerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  providerOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '08',
  },
  providerOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  providerIcon: {
    fontSize: 32,
    marginRight: Spacing.md,
  },
  providerTextContainer: {
    flex: 1,
  },
  providerName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: 2,
  },
  providerDesc: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  providerTips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.primary + '10',
    borderRadius: BorderRadius.md,
  },
  providerTipsText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    lineHeight: 20,
  },
  
  // 设置步骤页
  setupContent: {
    flex: 1,
  },
  setupContentContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  selectedProviderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.round,
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  selectedProviderIcon: {
    fontSize: 20,
  },
  selectedProviderName: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.text,
  },
  setupStep: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: '#FFFFFF',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  stepAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.xs,
  },
  stepActionText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: FontWeights.medium,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.success + '10',
    borderRadius: BorderRadius.md,
  },
  securityNoteText: {
    flex: 1,
    fontSize: FontSizes.xs,
    color: Colors.success,
    lineHeight: 18,
  },
  
  // 底部按钮
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    ...Shadows.md,
  },
  primaryButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: '#FFFFFF',
  },
});
