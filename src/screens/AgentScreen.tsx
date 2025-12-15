/**
 * AgentScreen - AI Agent 聊天页面
 * 
 * 完全自定义实现，替代 GiftedChat
 * 设计目标：
 * 1. 完全控制 UI 和交互
 * 2. 支持扩展（工具调用、中间步骤等）
 * 3. 为 LangChain.js 集成预留接口
 * 4. 高性能，流畅的用户体验
 * 5. 成熟的产品级功能（对话管理、消息操作、智能建议等）
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  TextInput,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView, useKeyboardHandler } from 'react-native-keyboard-controller';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useLedger } from '../context/LedgerContext';
import { useStatefulAgentChat } from '../hooks/useStatefulAgentChat';
import { useAgentBackground } from '../hooks/useAgentBackground';
import { AgentState, ConfirmationRequest } from '../agent/statefulAgent';
import { useConversations } from '../hooks/useConversations';
import { useToolManager } from '../hooks/useToolManager';
import { MessageList, InputBar, MessageActionSheet, handleBuiltInAction, ImageViewer, ToolManagerPanel, ConfirmationDialog, MessageListHandle, AgentHeaderMenu, AgentMenuAction, APIKeyGuide, SuggestedActionsBar, SuggestionSettingsModal, InputBarHandle } from '../components/agent';
import { updateAgentContext } from '../agent/tools/contextTools';
import { Icon } from '../components/common';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius, Shadows } from '../constants/theme';
import { Conversation, MessageAction, AgentMessage, PendingAttachment, Attachment, AgentRuntimeContext } from '../types/agent';
import { categoryAPI, CategoryResponse } from '../api/services/categoryAPI';
import { paymentMethodAPI } from '../api/services/paymentMethodAPI';
import { PaymentMethod } from '../types/paymentMethod';
import { AI_PROVIDERS, apiKeyStorage } from '../services/apiKeyStorage';
import { userPreferenceMemory } from '../services/userPreferenceMemory';
import { completionService } from '../services/completionService';
import { agentConfigStorage, AgentConfig } from '../services/agentConfigStorage';

// WebSocket 配置
const DEV_WS_URL = 'ws://localhost:8080/ws';
const PROD_WS_URL = 'ws://47.114.96.56:8080/ws';

export const WS_URL = __DEV__ ? DEV_WS_URL : PROD_WS_URL;

export const AgentScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { token, user } = useAuth();
  const { currentLedger, defaultLedgerId, ledgers } = useLedger();
  const insets = useSafeAreaInsets();

  // 检查用户权限 - 仅管理员可用
  const isAdmin = user?.role === 'ADMIN' || user?.username === 'admin';

  // 工具管理
  const {
    tools,
    toolsByCategory,
    enabledToolNames,
    stats: toolStats,
    isLoaded: isToolsLoaded,
    toggleTool,
    toggleCategory,
    resetToDefault: resetToolsToDefault,
    toggleAlwaysAllowed,
    refreshAlwaysAllowedStatus,
  } = useToolManager();
  
  // 工具管理面板状态
  const [showToolManager, setShowToolManager] = useState(false);
  // 更多菜单状态
  const [showMenu, setShowMenu] = useState(false);
  // AI 建议操作是否被用户关闭
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  // 智能建议设置
  const [showSuggestionSettings, setShowSuggestionSettings] = useState(false);
  const [suggestionSettings, setSuggestionSettings] = useState({
    enabled: true, // 默认开启（修复建议不显示问题）
    maxCount: 3,
  });

  // 分类和支付方式状态
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoadingContext, setIsLoadingContext] = useState(true);
  const [userPreferenceContext, setUserPreferenceContext] = useState<string>('');
  
  // Agent 配置状态
  const [agentConfig, setAgentConfig] = useState<AgentConfig>({});

  // 获取分类、支付方式和用户偏好记忆数据
  useEffect(() => {
    const fetchContextData = async () => {
      if (!currentLedger?.id) {
        setIsLoadingContext(false);
        return;
      }
      
      console.log('📋 [AgentScreen] Fetching context data for ledger:', currentLedger.id);
      setIsLoadingContext(true);
      
      try {
        // 并行获取分类、支付方式、用户偏好和 Agent 配置
        const [categoriesData, paymentMethodsData, prefContext, savedAgentConfig] = await Promise.all([
          categoryAPI.getAll().catch(err => {
            console.warn('⚠️ [AgentScreen] Failed to fetch categories:', err);
            return [];
          }),
          paymentMethodAPI.getAll().catch(err => {
            console.warn('⚠️ [AgentScreen] Failed to fetch payment methods:', err);
            return [];
          }),
          userPreferenceMemory.generatePromptContext().catch(err => {
            console.warn('⚠️ [AgentScreen] Failed to generate preference context:', err);
            return '';
          }),
          agentConfigStorage.getConfig().catch(err => {
            console.warn('⚠️ [AgentScreen] Failed to load agent config:', err);
            return {};
          }),
        ]);
        
        setCategories(categoriesData);
        setPaymentMethods(paymentMethodsData);
        setUserPreferenceContext(prefContext);
        setAgentConfig(savedAgentConfig);
        console.log('✅ [AgentScreen] Context data loaded:', {
          categories: categoriesData.length,
          paymentMethods: paymentMethodsData.length,
          hasPreferenceContext: prefContext.length > 0,
          agentConfig: savedAgentConfig,
        });
      } catch (error) {
        console.error('❌ [AgentScreen] Failed to fetch context data:', error);
      } finally {
        setIsLoadingContext(false);
      }
    };
    
    fetchContextData();
  }, [currentLedger?.id]);

  /**
   * 构建运行时上下文
   * 这个上下文会被注入到 Agent 的 System Prompt 中
   * AI 可以直接使用这些数据，无需调用工具查询
   */
  const runtimeContext: AgentRuntimeContext | undefined = useMemo(() => {
    if (!user || !currentLedger) return undefined;
    
    return {
      user: {
        id: user._id || '',
        username: user.username || '',
        nickname: user.nickname,
      },
      currentLedger: {
        id: currentLedger.id,
        name: currentLedger.name,
        description: currentLedger.description,
      },
      defaultLedgerId,
      allLedgers: ledgers.map(l => ({
        id: l.id,
        name: l.name,
      })),
      categories: categories.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        icon: c.icon,
      })),
      paymentMethods: paymentMethods.map(p => ({
        id: p.id,
        name: p.name,
        icon: p.icon,
        isDefault: p.isDefault || false,
      })),
      currentDateTime: new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
      }),
      // 注入用户偏好记忆
      userPreferenceContext: userPreferenceContext || undefined,
    };
  }, [user, currentLedger, defaultLedgerId, ledgers, categories, paymentMethods, userPreferenceContext]);

  // 使用对话管理 Hook（持久化存储）
  const {
    conversations,
    currentConversationId,
    isLoading: isLoadingConversations,
    createConversation,
    deleteConversation,
    renameConversation,
    switchConversation,
    refreshConversations,
  } = useConversations();

  // 使用状态机驱动的 Agent Chat Hook
  // 支持：Planning 模式、Human-in-the-Loop 确认、ReAct 反思模式、状态可视化
  const {
    messages,
    sendMessage,
    clearMessages,
    cancelChat,
    isConnected,
    isTyping,
    isInitialized,
    switchToConversation,
    // 状态机扩展功能
    agentState,
    currentIntent,
    pendingConfirmation,
    confirmOperation,
    rejectOperation,
    isAwaitingConfirmation,
    // 反思模式扩展
    lastReflection,
    isReflecting,
    // 智能建议
    suggestions,
    clearSuggestions,
    // 模型信息
    currentProvider,
    currentModelName,
    refreshModelInfo,
  } = useStatefulAgentChat({
    wsUrl: WS_URL,
    userId: user?._id,
    token,
    enableToolCalls: true,
    enableStreaming: true,
    conversationId: currentConversationId || undefined,
    runtimeContext, // 传入运行时上下文，AI 可直接感知
    enabledToolNames, // 传入启用的工具列表
    // 状态机配置
    enableIntentRewriting: true, // 启用意图改写（用户输入优化）
    enableConfirmation: true, // 启用危险操作确认
    enableReflection: agentConfig.enableReflection ?? true, // 从配置读取，默认开启（ReAct 核心特性）
    reflectorConfig: {
      frequency: agentConfig.reflectionFrequency ?? 'on_error', // 从配置读取，默认出错时反思
      showThoughts: true, // 展示反思过程
      confidenceThresholds: agentConfig.reflectorConfidenceThresholds, // 从配置读取
    },
    userPreferences: {
      confirmHighRisk: agentConfig.confirmationPolicy?.confirmHighRisk ?? true,
      confirmMediumRisk: agentConfig.confirmationPolicy?.confirmMediumRisk ?? false,
      batchThreshold: agentConfig.confirmationPolicy?.batchThreshold ?? 5,
      intentRewriterConfidenceThresholds: agentConfig.intentRewriterConfidenceThresholds, // 从配置读取
      reflectorConfidenceThresholds: agentConfig.reflectorConfidenceThresholds, // 从配置读取
    },
  });

  // 当用户或账本上下文变化时，更新 Agent 的上下文（保留原有逻辑作为 fallback）
  useEffect(() => {
    console.log('🔄 [AgentScreen] Updating agent context (fallback)');
    updateAgentContext({
      user: user ? {
        id: user._id || '',
        username: user.username || '',
        email: user.email,
      } : null,
      currentLedger: currentLedger ? {
        id: currentLedger.id,
        name: currentLedger.name,
        description: currentLedger.description,
      } : null,
      defaultLedgerId,
      allLedgers: ledgers.map(l => ({
        id: l.id,
        name: l.name,
        description: l.description,
      })),
      token,
    });
  }, [user, currentLedger, defaultLedgerId, ledgers, token]);

  // 屏幕获得焦点时刷新模型信息和对话列表（从设置页面返回时）
  useFocusEffect(
    useCallback(() => {
      refreshModelInfo();
      // 刷新对话列表，以便显示自动生成的标题
      refreshConversations();
    }, [refreshModelInfo, refreshConversations])
  );

  // 定时刷新对话列表，以便及时显示自动生成的标题
  // 只在 AI 正在输入时启用轮询
  useEffect(() => {
    if (!isTyping) {
      return;
    }

    // AI 输入时每 3 秒刷新一次对话列表
    const intervalId = setInterval(() => {
      refreshConversations();
    }, 3000);

    return () => {
      clearInterval(intervalId);
    };
  }, [isTyping, refreshConversations]);

  // 消息列表 ref - 用于键盘弹出时滚动
  const messageListRef = useRef<MessageListHandle>(null);
  
  // 输入框 ref - 用于外部控制（如清空输入）
  const inputBarRef = useRef<InputBarHandle>(null);

  // 键盘高度动画值
  const keyboardHeight = useSharedValue(0);

  // 使用 react-native-keyboard-controller 监听键盘事件
  useKeyboardHandler({
    onMove: (e) => {
      'worklet';
      keyboardHeight.value = e.height;
    },
    onEnd: (e) => {
      'worklet';
      keyboardHeight.value = e.height;
    },
  });

  // 键盘弹出时滚动消息列表到底部
  useEffect(() => {
    // 当键盘高度变化且大于0时，滚动到底部
    const unsubscribe = () => {
      if (keyboardHeight.value > 0 && messages.length > 0) {
        setTimeout(() => {
          messageListRef.current?.scrollToEnd(true);
        }, 100);
      }
    };
    // 触发一次初始检查
    return unsubscribe;
  }, [messages.length]);

  // 更新补全服务的对话上下文（用于智能补全时理解当前对话内容）
  useEffect(() => {
    if (messages.length === 0) {
      completionService.clearConversationContext();
      return;
    }
    
    // 提取对话内容
    const conversationContext = messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.content || '',
    })).filter(m => m.content.length > 0);
    
    completionService.setConversationContext(conversationContext);
  }, [messages]);

  // API Key 配置状态
  const [hasAPIKey, setHasAPIKey] = useState<boolean | null>(null); // null 表示正在检查
  const [showAPIKeyGuide, setShowAPIKeyGuide] = useState(false);

  // 背景图片管理
  const { backgroundImage, setBackground, clearBackground } = useAgentBackground();

  // 检查用户是否已配置 API Key
  useEffect(() => {
    const checkAPIKey = async () => {
      try {
        const hasKey = await apiKeyStorage.hasAnyAPIKey();
        setHasAPIKey(hasKey);
        
        // 如果没有配置 API Key，显示引导
        if (!hasKey) {
          setShowAPIKeyGuide(true);
        }
        
        console.log('🔑 [AgentScreen] API Key status:', hasKey ? '已配置' : '未配置');
      } catch (error) {
        console.error('❌ [AgentScreen] Failed to check API Key:', error);
        setHasAPIKey(false);
        setShowAPIKeyGuide(true);
      }
    };
    
    checkAPIKey();
  }, []);

  // 页面获得焦点时重新检查 API Key 状态（从设置页面返回后）
  useFocusEffect(
    useCallback(() => {
      const recheckAPIKey = async () => {
        const hasKey = await apiKeyStorage.hasAnyAPIKey();
        setHasAPIKey(hasKey);
        
        // 如果已配置，关闭引导
        if (hasKey && showAPIKeyGuide) {
          setShowAPIKeyGuide(false);
        }
      };
      
      recheckAPIKey();
    }, [showAPIKeyGuide])
  );

  // UI 状态
  const [showConversations, setShowConversations] = useState(false);
  const [showMessageActions, setShowMessageActions] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<AgentMessage | null>(null);
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [newConversationTitle, setNewConversationTitle] = useState('');
  
  // 初始建议（AI 推荐的快捷操作）- 不再使用预设，仅在 AI 对话后由反思生成
  // 注意：初始建议功能已移除，统一使用 AI 对话后的 suggestedActions
  
  // 图片预览状态
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [previewImages, setPreviewImages] = useState<Attachment[]>([]);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);

  // 从 AgentContext 获取建议（由 render_action_buttons 工具设置）
  // 支持两种来源：
  // 1. AgentContext.suggestions（render_action_buttons 工具专用，优先级最高）
  // 2. 消息 metadata 中的 suggestedActions（AI 直接生成，备用）
  const currentSuggestedActions = useMemo(() => {
    // 如果功能未启用，直接返回空
    if (!suggestionSettings.enabled) return [];

    if (suggestionsDismissed || isTyping || agentState !== AgentState.IDLE) {
      return [];
    }
    
    // 优先使用 AgentContext 的 suggestions（由 render_action_buttons 设置）
    if (suggestions && suggestions.length > 0) {
      return suggestions.slice(0, suggestionSettings.maxCount);
    }
    
    // 备用：从后往前查找最后一条有建议的 AI 消息
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.sender === 'assistant') {
        // 检查消息级别的 suggestedActions
        if (msg.metadata?.suggestedActions?.length) {
          return msg.metadata.suggestedActions.slice(0, suggestionSettings.maxCount);
        }
        // 检查嵌入内容中的 suggestedActions
        if (msg.metadata?.embeddedContent?.data?.suggestedActions?.length) {
          return msg.metadata.embeddedContent.data.suggestedActions.slice(0, suggestionSettings.maxCount);
        }
      }
    }
    return [];
  }, [suggestions, messages, suggestionsDismissed, isTyping, agentState, suggestionSettings]);

  // 获取第一条建议作为自动填充内容
  const topSuggestion = useMemo(() => {
    if (currentSuggestedActions.length > 0) {
      return currentSuggestedActions[0].message;
    }
    return undefined;
  }, [currentSuggestedActions]);

  /**
   * 处理发送消息（支持附件）
   * 
   * 附件处理流程：
   * 1. PendingAttachment 包含 base64 数据，用于 AI 图片识别
   * 2. sendMessage 内部会提取 base64 构建多模态消息发送给 LLM
   * 3. UI 显示时仅使用 URI，不保存 base64 到消息历史
   */
  const handleSend = useCallback((text: string, attachments?: PendingAttachment[]) => {
    // 用户发送新消息时，重置建议栏的关闭状态
    setSuggestionsDismissed(false);
    
    if (attachments && attachments.length > 0) {
      console.log('📎 [AgentScreen] 发送带附件的消息:', attachments.length, '个附件');
      console.log('📎 [AgentScreen] 附件 base64 状态:', attachments.map(a => ({ 
        name: a.name, 
        hasBase64: !!a.base64,
        size: a.size 
      })));
      
      // 直接传递 PendingAttachment（包含 base64），sendMessage 会处理多模态消息构建
      sendMessage(text, attachments);
    } else {
      sendMessage(text);
    }
  }, [sendMessage]);

  /**
   * 处理建议操作按钮点击
   * 当用户点击AI推荐的后续操作按钮时，自动发送对应的消息
   */
  const handleSuggestedActionPress = useCallback((message: string) => {
    console.log('🎯 [AgentScreen] 建议操作点击:', message);
    // 点击建议后重置 dismissed 状态，这样新的回复可以继续显示建议
    setSuggestionsDismissed(false);
    sendMessage(message);
  }, [sendMessage]);

  /**
   * 处理关闭建议栏
   */
  const handleDismissSuggestions = useCallback(() => {
    setSuggestionsDismissed(true);
    // 同时清除 AgentContext 的 suggestions
    clearSuggestions();
  }, [clearSuggestions]);

  /**
   * 处理附件点击（全屏预览）
   */
  const handleAttachmentPress = useCallback((attachment: Attachment) => {
    console.log('📷 [AgentScreen] 附件点击:', attachment.uri);
    
    if (attachment.type === 'image') {
      // 显示图片全屏预览
      setPreviewImages([attachment]);
      setPreviewImageIndex(0);
      setShowImageViewer(true);
    } else {
      // 其他类型附件暂不支持预览
      Alert.alert('提示', '暂不支持预览此类型文件');
    }
  }, []);

  /**
   * 处理清空聊天
   */
  const handleClearChat = useCallback(() => {
    Alert.alert(
      '清空聊天记录',
      '确定要清空当前对话的所有消息吗？此操作无法撤销。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '清空',
          style: 'destructive',
          onPress: () => {
            clearMessages();
            // 清空后重置建议状态
            setSuggestionsDismissed(false);
            // 清空对话上下文
            completionService.clearConversationContext();
          },
        },
      ]
    );
  }, [clearMessages]);

  /**
   * 新建对话
   */
  const handleNewConversation = useCallback(async () => {
    try {
      const newConv = await createConversation(`新对话 ${conversations.length + 1}`);
      await switchToConversation(newConv.id);
      setShowConversations(false);
      // 新对话时重置建议状态，清除之前的 AI 推荐
      setSuggestionsDismissed(false);
      // 清空补全服务的对话上下文
      completionService.clearConversationContext();
      // 清空输入框
      inputBarRef.current?.clear();
    } catch (error) {
      console.error('❌ [AgentScreen] Failed to create conversation:', error);
      Alert.alert('错误', '创建对话失败');
    }
  }, [conversations.length, createConversation, switchToConversation]);

  /**
   * 切换对话
   */
  const handleSwitchConversation = useCallback(async (convId: string) => {
    try {
      await switchConversation(convId);
      await switchToConversation(convId);
      setShowConversations(false);
      // 切换对话时重置建议状态
      setSuggestionsDismissed(false);
      // 清空输入框
      inputBarRef.current?.clear();
    } catch (error) {
      console.error('❌ [AgentScreen] Failed to switch conversation:', error);
    }
  }, [switchConversation, switchToConversation]);

  /**
   * 重命名对话
   */
  const handleRenameConversation = useCallback(async (convId: string, newTitle: string) => {
    try {
      await renameConversation(convId, newTitle);
    } catch (error) {
      console.error('❌ [AgentScreen] Failed to rename conversation:', error);
    }
    setEditingConversationId(null);
    setNewConversationTitle('');
  }, [renameConversation]);

  /**
   * 删除对话
   */
  const handleDeleteConversation = useCallback((convId: string) => {
    Alert.alert(
      '删除对话',
      '确定要删除这个对话吗？此操作无法撤销。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteConversation(convId);
              // 如果删除的是当前对话，会自动切换到第一个对话
              if (currentConversationId === convId && conversations.length > 1) {
                const nextConv = conversations.find(c => c.id !== convId);
                if (nextConv) {
                  await switchToConversation(nextConv.id);
                }
              }
            } catch (error) {
              console.error('❌ [AgentScreen] Failed to delete conversation:', error);
              Alert.alert('错误', '删除对话失败');
            }
          },
        },
      ]
    );
  }, [currentConversationId, conversations, deleteConversation, switchToConversation]);

  /**
   * 处理背景设置
   */
  const handleBackgroundSetting = useCallback(() => {
    Alert.alert(
      '聊天背景设置',
      '请选择背景图片来源',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '恢复默认',
          style: 'destructive',
          onPress: clearBackground,
        },
        {
          text: '从相册选择',
          onPress: async () => {
            try {
              const result = await launchImageLibrary({
                mediaType: 'photo',
                selectionLimit: 1,
                quality: 0.8,
              });
              
              if (result.assets && result.assets.length > 0 && result.assets[0].uri) {
                setBackground(result.assets[0].uri);
              }
            } catch (error) {
              console.error('Failed to pick image:', error);
              Alert.alert('错误', '选择图片失败');
            }
          },
        },
      ]
    );
  }, [setBackground, clearBackground]);

  /**
   * 处理菜单操作
   */
  const handleMenuAction = useCallback((action: AgentMenuAction) => {
    switch (action) {
      case 'new_chat':
        handleNewConversation();
        break;
      case 'tools':
        setShowToolManager(true);
        break;
      case 'memory':
        navigation.navigate('UserPreferenceMemory');
        break;
      case 'background':
        handleBackgroundSetting();
        break;
      case 'suggestion_settings':
        setShowSuggestionSettings(true);
        break;
      case 'agent_config':
        navigation.navigate('AgentConfig');
        break;
      case 'settings':
        navigation.navigate('APIKeySettings');
        break;
      case 'clear_chat':
        handleClearChat();
        break;
      case 'reconnect':
        // 重连功能已移除，无操作
        break;
    }
  }, [handleNewConversation, handleClearChat, navigation, handleBackgroundSetting]);

  /**
   * 消息操作回调 - 使用内置处理器
   */
  const handleMessageAction = useCallback((action: MessageAction | string, message: AgentMessage) => {
    handleBuiltInAction(action, message, {
      onCopy: () => {
        // 可选：显示 Toast 提示
        console.log('✅ 已复制到剪贴板');
      },
      onRetry: (content) => {
        sendMessage(content);
      },
      onQuote: (msg) => {
        // TODO: 实现引用消息功能
        console.log('引用消息:', msg.content);
      },
      onDelete: (messageId) => {
        // TODO: 实现消息删除
        console.log('删除消息:', messageId);
      },
    });
    
    setShowMessageActions(false);
    setSelectedMessage(null);
  }, [sendMessage]);

  /**
   * 长按消息
   */
  const handleMessageLongPress = useCallback((message: AgentMessage) => {
    setSelectedMessage(message);
    setShowMessageActions(true);
  }, []);

  /**
   * 处理嵌入式交易卡片点击 - 跳转到编辑交易页面
   */
  const handleTransactionPress = useCallback((transaction: any) => {
    console.log('📄 [AgentScreen] Transaction pressed:', transaction.id);
    
    // 将交易数据转换为编辑页面需要的格式
    const transactionForEdit = {
      id: transaction.id,
      description: transaction.description,
      amount: transaction.amount,
      type: transaction.type,
      transactionDateTime: transaction.transactionDateTime,
      ledgerId: transaction.ledgerId,
      categoryId: transaction.categoryId,
      paymentMethodId: transaction.paymentMethodId,
      attachmentCount: transaction.attachmentCount,
    };
    
    // 跳转到编辑交易页面
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate('AddTransaction', { transaction: transactionForEdit });
    } else {
      // 备用方案：直接使用 navigation
      try {
        navigation.navigate('AddTransaction', { transaction: transactionForEdit });
      } catch (error) {
        console.error('❌ [AgentScreen] Navigation failed:', error);
        // 如果导航失败，fallback 到发送消息
        sendMessage(`请告诉我交易 ID ${transaction.id} 的详细信息`);
      }
    }
  }, [navigation, sendMessage]);

  /**
   * 处理嵌入式操作按钮点击
   */
  const handleActionButtonPress = useCallback((action: string, payload: any) => {
    console.log('🔘 [AgentScreen] Action button pressed:', action, payload);
    
    switch (action) {
      case 'send_message':
        // 发送预设消息
        if (typeof payload === 'string') {
          sendMessage(payload);
        } else if (payload?.message) {
          sendMessage(payload.message);
        }
        break;
      
      case 'navigate':
        // TODO: 实现导航逻辑
        console.log('Navigate to:', payload);
        break;
      
      default:
        console.log('Unknown action:', action);
    }
  }, [sendMessage]);

  /**
   * 计算当前对话标题（使用 useMemo 确保更新时自动刷新）
   */
  const currentConversationTitle = useMemo(() => {
    const currentConv = conversations.find(c => c.id === currentConversationId);
    return currentConv?.title || 'AI Agent';
  }, [conversations, currentConversationId]);

  /**
   * 渲染头部
   */
  const renderHeader = () => {
    return (
      <View style={styles.header}>
        {/* 左侧：对话列表按钮和标题 */}
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.conversationButton}
            onPress={() => setShowConversations(true)}
          >
            <Icon name="menu" size={22} color={Colors.text} />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {currentConversationTitle}
            </Text>
            <View style={styles.statusContainer}>
              <View style={[styles.statusDot, isConnected && styles.statusDotConnected]} />
              <Text style={styles.statusText}>
                {isConnected ? '在线' : '离线'}
              </Text>
              {/* 模型信息显示 - 可点击导航到设置 */}
              {currentModelName && (
                <TouchableOpacity 
                  onPress={() => navigation.navigate('APIKeySettings')}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <Text style={styles.modelInfoText}>
                    {' • '}{AI_PROVIDERS[currentProvider]?.icon || '🤖'} {currentModelName}
                  </Text>
                </TouchableOpacity>
              )}
              {/* Agent 状态指示器 */}
              {agentState !== AgentState.IDLE && agentState !== AgentState.COMPLETED && (
                <Text style={styles.agentStateText}>
                  {' • '}
                  {agentState === AgentState.PARSING && '🔍 解析中...'}
                  {agentState === AgentState.PLANNING && '📝 规划中...'}
                  {agentState === AgentState.EXECUTING && '⚡ 执行中...'}
                  {agentState === AgentState.AWAITING_CONFIRMATION && '⚠️ 等待确认'}
                  {agentState === AgentState.ERROR && '❌ 出错了'}
                </Text>
              )}
              {isTyping && agentState === AgentState.IDLE && (
                <Text style={styles.typingText}> • 正在输入...</Text>
              )}
            </View>
          </View>
        </View>

        {/* 右侧：操作按钮 */}
        <View style={styles.headerRight}>
          {/* 新建对话按钮 - 简化为图标 */}
          <TouchableOpacity
            style={[styles.headerIconButton, styles.primaryIconButton]}
            onPress={handleNewConversation}
            activeOpacity={0.7}
          >
            <Icon name="add" size={22} color={Colors.primary} />
          </TouchableOpacity>

          {/* 更多操作菜单 */}
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => setShowMenu(true)}
            activeOpacity={0.7}
          >
            <Icon name="ellipsis-vertical" size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  /**
   * 渲染对话历史抽屉
   */
  const renderConversationsDrawer = () => {
    return (
      <Modal
        visible={showConversations}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowConversations(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.conversationsDrawer}>
            {/* 抽屉头部 */}
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>对话历史</Text>
              <View style={styles.drawerActions}>
                <TouchableOpacity
                  style={styles.drawerButton}
                  onPress={handleNewConversation}
                >
                  <Icon name="add" size={24} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.drawerButton}
                  onPress={() => setShowConversations(false)}
                >
                  <Icon name="close" size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* 对话列表 */}
            <ScrollView style={styles.conversationsList}>
              {conversations.map((conv) => (
                <View key={conv.id}>
                  <TouchableOpacity
                    style={[
                      styles.conversationItem,
                      conv.id === currentConversationId && styles.conversationItemActive,
                    ]}
                    onPress={() => handleSwitchConversation(conv.id)}
                  >
                    {/* 选中指示器 - 左侧蓝色边框 */}
                    {conv.id === currentConversationId && (
                      <View style={styles.conversationActiveIndicator} />
                    )}
                    
                    <View style={styles.conversationContent}>
                      {editingConversationId === conv.id ? (
                        <TextInput
                          style={styles.conversationTitleInput}
                          value={newConversationTitle}
                          onChangeText={setNewConversationTitle}
                          onSubmitEditing={() =>
                            handleRenameConversation(conv.id, newConversationTitle)
                          }
                          autoFocus
                        />
                      ) : (
                        <>
                          <View style={styles.conversationTitleRow}>
                            <Text style={[
                              styles.conversationTitle,
                              conv.id === currentConversationId && styles.conversationTitleActive
                            ]} numberOfLines={1}>
                              {conv.title}
                            </Text>
                            {conv.id === currentConversationId && (
                              <Icon name="checkmark-circle" size={16} color={Colors.primary} />
                            )}
                          </View>
                          <Text style={styles.conversationMeta}>
                            {conv.messageCount} 条消息 •{' '}
                            {conv.updatedAt.toLocaleDateString()}
                          </Text>
                          {conv.preview && (
                            <Text style={styles.conversationPreview} numberOfLines={2}>
                              {conv.preview}
                            </Text>
                          )}
                        </>
                      )}
                    </View>

                    <View style={styles.conversationActions}>
                      <TouchableOpacity
                        onPress={() => {
                          setEditingConversationId(conv.id);
                          setNewConversationTitle(conv.title);
                        }}
                      >
                        <Icon name="pencil" size={18} color={Colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteConversation(conv.id)}
                      >
                        <Icon name="trash-outline" size={18} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  /**
   * 渲染加载中状态
   */
  const renderLoading = () => {
    // 对话数据或上下文数据加载中
    if (isLoadingConversations || !isInitialized || isLoadingContext) {
      return (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>
            {isLoadingContext ? '加载数据中...' : '加载对话中...'}
          </Text>
        </View>
      );
    }
    
    if (!isConnected) {
      return (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>正在连接...</Text>
        </View>
      );
    }
    
    return null;
  };

  /**
   * 渲染空状态
   */
  const renderEmptyState = () => {
    if (messages.length > 0) return null;

    // 如果没有配置 API Key，显示配置提示
    if (hasAPIKey === false) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔑</Text>
          <Text style={styles.emptyTitle}>配置 AI 模型</Text>
          <Text style={styles.emptySubtitle}>
            需要配置 API Key 才能使用 AI Agent
          </Text>
          <TouchableOpacity
            style={styles.configButton}
            onPress={() => setShowAPIKeyGuide(true)}
            activeOpacity={0.8}
          >
            <Icon name="settings-outline" size={18} color="#FFFFFF" />
            <Text style={styles.configButtonText}>开始配置</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>🤖</Text>
        <Text style={styles.emptyTitle}>AI Agent 助手</Text>
        <Text style={styles.emptySubtitle}>
          我可以帮你管理账本、分析消费、提供建议
        </Text>
        <View style={styles.emptyTip}>
          <Icon name="bulb-outline" size={14} color={Colors.primary} />
          <Text style={styles.emptyTipText}>
            💡 每次新话题建议新开对话，响应更快更省钱
          </Text>
        </View>
      </View>
    );
  };

  /**
   * 渲染权限拒绝界面
   */
  const renderPermissionDenied = () => {
    return (
      <View style={styles.permissionDeniedContainer}>
        <Text style={styles.permissionDeniedIcon}>🔒</Text>
        <Text style={styles.permissionDeniedTitle}>权限不足</Text>
        <Text style={styles.permissionDeniedText}>
          AI Agent 功能仅对管理员开放
        </Text>
        <Text style={styles.permissionDeniedSubtext}>
          当前用户：{user?.username || '未知'}
        </Text>
        <Text style={styles.permissionDeniedSubtext}>
          角色：{user?.role || 'USER'}
        </Text>
      </View>
    );
  };

  // 如果不是管理员，显示权限拒绝界面
  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar 
          backgroundColor={Colors.surface} 
          barStyle="dark-content" 
        />
        {renderHeader()}
        {renderPermissionDenied()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 状态栏配置 */}
      <StatusBar 
        backgroundColor={Colors.surface} 
        barStyle="dark-content" 
      />
      
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* 头部 */}
        {renderHeader()}

        {/* 消息列表 */}
        <View style={styles.messagesContainer}>
          {backgroundImage && (
            <>
              <Image 
                source={{ uri: backgroundImage }} 
                style={StyleSheet.absoluteFill} 
                resizeMode="cover"
              />
              {/* 半透明遮罩，确保文字可读性 */}
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.75)' }]} />
            </>
          )}
          {renderEmptyState()}
          <MessageList 
            ref={messageListRef}
            messages={messages} 
            isTyping={isTyping}
            agentState={
              agentState === AgentState.PARSING ? 'parsing' :
              agentState === AgentState.PLANNING ? 'planning' :
              agentState === AgentState.EXECUTING ? 'executing' :
              agentState === AgentState.REFLECTING ? 'reflecting' :
              'idle'
            }
            onTransactionPress={handleTransactionPress}
            onActionButtonPress={handleActionButtonPress}
            onMessageLongPress={handleMessageLongPress}
            onAttachmentPress={handleAttachmentPress}
            onSuggestedActionPress={handleSuggestedActionPress}
          />
        </View>

        {/* 智能建议栏 - 仅显示 AI 对话后的后续建议 */}
        {currentSuggestedActions.length > 0 && (
          <SuggestedActionsBar
            mode="suggestions"
            actions={currentSuggestedActions}
            onActionPress={handleSuggestedActionPress}
            onDismiss={handleDismissSuggestions}
          />
        )}

        {/* 输入栏 */}
        <InputBar 
          ref={inputBarRef}
          onSend={handleSend} 
          disabled={!isConnected}
          isProcessing={isTyping || agentState !== AgentState.IDLE}
          onCancel={cancelChat}
          enableVoice={true}
          currentProvider={currentProvider}
          topSuggestion={topSuggestion}
        />
      </KeyboardAvoidingView>

      {/* 对话历史抽屉 */}
      {renderConversationsDrawer()}

      {/* 消息操作菜单 - 使用新的 ActionSheet 组件 */}
      <MessageActionSheet
        visible={showMessageActions}
        message={selectedMessage}
        onClose={() => {
          setShowMessageActions(false);
          setSelectedMessage(null);
        }}
        onAction={handleMessageAction}
      />

      {/* 图片全屏预览 */}
      <ImageViewer
        visible={showImageViewer}
        images={previewImages}
        initialIndex={previewImageIndex}
        onClose={() => setShowImageViewer(false)}
      />

      {/* 工具管理面板 */}
      <ToolManagerPanel
        visible={showToolManager}
        onClose={() => setShowToolManager(false)}
        tools={tools}
        toolsByCategory={toolsByCategory}
        stats={toolStats}
        onToggleTool={toggleTool}
        onToggleCategory={toggleCategory}
        onReset={resetToolsToDefault}
        onToggleAlwaysAllowed={toggleAlwaysAllowed}
      />

      {/* 危险操作确认对话框 - 使用优化后的 ConfirmationDialog 组件 */}
      <ConfirmationDialog
        visible={isAwaitingConfirmation && !!pendingConfirmation}
        request={pendingConfirmation}
        onConfirm={confirmOperation}
        onCancel={(reason?: string) => rejectOperation(reason || '用户取消')}
        onClose={() => {}}
        onAlwaysAllow={(toolName: string) => {
          // 对于领域工具，需要使用完整的 key（toolName.action）
          const action = pendingConfirmation?.toolArgs?.action as string | undefined;
          const key = action ? toolName : pendingConfirmation?.toolName || toolName;
          toggleAlwaysAllowed(key, true);
        }}
      />

      {/* 更多操作菜单 */}
      <AgentHeaderMenu
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        onAction={handleMenuAction}
        isConnected={isConnected}
        toolCount={toolStats.enabled}
        totalToolCount={toolStats.total}
      />

      {/* 加载指示器 */}
      {renderLoading()}

      {/* API Key 配置引导 */}
      <APIKeyGuide
        visible={showAPIKeyGuide}
        onClose={() => setShowAPIKeyGuide(false)}
        onConfigured={() => {
          setShowAPIKeyGuide(false);
          // 重新检查 API Key 状态
          apiKeyStorage.hasAnyAPIKey().then(setHasAPIKey);
        }}
        allowSkip={false}
      />

      {/* 智能建议设置 */}
      <SuggestionSettingsModal
        visible={showSuggestionSettings}
        onClose={() => setShowSuggestionSettings(false)}
        enabled={suggestionSettings.enabled}
        onEnableChange={(enabled) => setSuggestionSettings(prev => ({ ...prev, enabled }))}
        maxCount={suggestionSettings.maxCount}
        onMaxCountChange={(maxCount) => setSuggestionSettings(prev => ({ ...prev, maxCount }))}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },

  // 头部样式
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    minHeight: 48,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0, // 允许收缩
  },
  conversationButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.xs,
    flexShrink: 0,
  },
  headerTitleContainer: {
    flex: 1,
    minWidth: 0, // 允许标题文字收缩
  },
  headerTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.textSecondary,
    marginRight: Spacing.xs,
  },
  statusDotConnected: {
    backgroundColor: Colors.success,
  },
  statusText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  modelInfoText: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    fontWeight: FontWeights.medium,
  },
  typingText: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    fontStyle: 'italic',
  },
  agentStateText: {
    fontSize: FontSizes.xs,
    color: Colors.warning,
    fontWeight: FontWeights.medium,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 8,
  },
  // 主操作图标按钮（如新建对话）
  primaryIconButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  // 统一的头部图标按钮样式
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconButtonWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  headerIconButtonDanger: {
    backgroundColor: Colors.warning,
  },
  iconButtonBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.warning,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonBadgeText: {
    fontSize: 9,
    fontWeight: FontWeights.bold,
    color: Colors.surface,
  },

  // 消息容器
  messagesContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // 空状态
  emptyState: {
    position: 'absolute',
    top: '35%',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptyTip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.lg,
  },
  emptyTipText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },

  // 对话历史抽屉
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  conversationsDrawer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '80%',
    ...Shadows.lg,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  drawerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  drawerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  drawerButton: {
    marginLeft: Spacing.md,
  },
  conversationsList: {
    maxHeight: 500,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    position: 'relative',
  },
  conversationItemActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)', // 更明显的蓝色背景
  },
  // 选中指示器 - 左侧竖条
  conversationActiveIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: Colors.primary,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  conversationContent: {
    flex: 1,
    marginRight: Spacing.md,
  },
  conversationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 4,
  },
  conversationTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    flex: 1,
  },
  conversationTitleActive: {
    color: Colors.primary,
    fontWeight: FontWeights.bold,
  },
  conversationMeta: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  conversationPreview: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  conversationTitleInput: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary,
    paddingVertical: 4,
  },
  conversationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },

  // 加载指示器
  loadingOverlay: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  loadingText: {
    marginTop: Spacing.sm,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },

  // 权限拒绝界面
  permissionDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.background,
  },
  permissionDeniedIcon: {
    fontSize: 80,
    marginBottom: Spacing.lg,
  },
  permissionDeniedTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  permissionDeniedText: {
    fontSize: FontSizes.lg,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  permissionDeniedSubtext: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },

  // API Key 配置按钮
  configButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
    ...Shadows.md,
  },
  configButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: '#FFFFFF',
  },
});
