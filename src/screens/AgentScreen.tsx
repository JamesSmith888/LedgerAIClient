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

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  TextInput,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useLedger } from '../context/LedgerContext';
import { useStatefulAgentChat } from '../hooks/useStatefulAgentChat';
import { AgentState, ConfirmationRequest } from '../agent/statefulAgent';
import { useConversations } from '../hooks/useConversations';
import { useToolManager } from '../hooks/useToolManager';
import { MessageList, InputBar, MessageActionSheet, handleBuiltInAction, ImageViewer, ToolManagerPanel, ToolButton } from '../components/agent';
import { updateAgentContext } from '../agent/tools/contextTools';
import { Icon } from '../components/common';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius, Shadows } from '../constants/theme';
import { Conversation, MessageAction, AgentMessage, PendingAttachment, Attachment, AgentRuntimeContext } from '../types/agent';
import { categoryAPI, CategoryResponse } from '../api/services/categoryAPI';
import { paymentMethodAPI } from '../api/services/paymentMethodAPI';
import { PaymentMethod } from '../types/paymentMethod';

// WebSocket 配置
const DEV_WS_URL = 'ws://localhost:8080/ws';
const PROD_WS_URL = 'ws://47.114.96.56:8080/ws';

export const WS_URL = __DEV__ ? DEV_WS_URL : PROD_WS_URL;

export const AgentScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { token, user } = useAuth();
  const { currentLedger, defaultLedgerId, ledgers } = useLedger();

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

  // 分类和支付方式状态
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoadingContext, setIsLoadingContext] = useState(true);

  // 获取分类和支付方式数据
  useEffect(() => {
    const fetchContextData = async () => {
      if (!currentLedger?.id) {
        setIsLoadingContext(false);
        return;
      }
      
      console.log('📋 [AgentScreen] Fetching context data for ledger:', currentLedger.id);
      setIsLoadingContext(true);
      
      try {
        // 并行获取分类和支付方式
        const [categoriesData, paymentMethodsData] = await Promise.all([
          categoryAPI.getAll().catch(err => {
            console.warn('⚠️ [AgentScreen] Failed to fetch categories:', err);
            return [];
          }),
          paymentMethodAPI.getAll().catch(err => {
            console.warn('⚠️ [AgentScreen] Failed to fetch payment methods:', err);
            return [];
          }),
        ]);
        
        setCategories(categoriesData);
        setPaymentMethods(paymentMethodsData);
        console.log('✅ [AgentScreen] Context data loaded:', {
          categories: categoriesData.length,
          paymentMethods: paymentMethodsData.length,
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
    };
  }, [user, currentLedger, defaultLedgerId, ledgers, categories, paymentMethods]);

  // 使用对话管理 Hook（持久化存储）
  const {
    conversations,
    currentConversationId,
    isLoading: isLoadingConversations,
    createConversation,
    deleteConversation,
    renameConversation,
    switchConversation,
  } = useConversations();

  // 使用状态机驱动的 Agent Chat Hook
  // 支持：Planning 模式、Human-in-the-Loop 确认、状态可视化
  const {
    messages,
    sendMessage,
    clearMessages,
    reconnect,
    isConnected,
    isTyping,
    isInitialized,
    switchToConversation,
    // 状态机扩展功能
    agentState,
    currentPlan,
    pendingConfirmation,
    confirmOperation,
    rejectOperation,
    isAwaitingConfirmation,
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
    enablePlanning: true, // 启用任务规划
    enableConfirmation: true, // 启用危险操作确认
    userPreferences: {
      confirmHighRisk: true, // 高风险操作需确认
      confirmMediumRisk: false, // 中等风险操作不需确认
      batchThreshold: 5, // 批量操作超过5条需确认
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

  // UI 状态
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [showConversations, setShowConversations] = useState(false);
  const [showMessageActions, setShowMessageActions] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<AgentMessage | null>(null);
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [newConversationTitle, setNewConversationTitle] = useState('');
  
  // 图片预览状态
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [previewImages, setPreviewImages] = useState<Attachment[]>([]);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);

  // 智能建议（固定3个最实用的快捷操作）
  const smartSuggestions = useMemo(() => {
    return [
      { id: '1', text: '本月收支统计', icon: '📊' },
      { id: '2', text: '记一笔支出', icon: '💸' },
      { id: '3', text: '查看最近交易', icon: '📋' },
    ];
  }, []);

  /**
   * 处理发送消息（支持附件）
   * 
   * 附件处理流程：
   * 1. PendingAttachment 包含 base64 数据，用于 AI 图片识别
   * 2. sendMessage 内部会提取 base64 构建多模态消息发送给 LLM
   * 3. UI 显示时仅使用 URI，不保存 base64 到消息历史
   */
  const handleSend = useCallback((text: string, attachments?: PendingAttachment[]) => {
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
    setShowQuickActions(false);
  }, [sendMessage]);

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
            setShowQuickActions(true);
          },
        },
      ]
    );
  }, [clearMessages]);

  /**
   * 处理重新连接
   */
  const handleReconnect = useCallback(() => {
    reconnect();
  }, [reconnect]);

  /**
   * 新建对话
   */
  const handleNewConversation = useCallback(async () => {
    try {
      const newConv = await createConversation(`新对话 ${conversations.length + 1}`);
      await switchToConversation(newConv.id);
      setShowConversations(false);
      setShowQuickActions(true);
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
      name: transaction.name,
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
   * 渲染头部
   */
  const renderHeader = () => {
    const currentConv = conversations.find(c => c.id === currentConversationId);
    const messageCount = messages.length;

    return (
      <View style={styles.header}>
        {/* 左侧：对话列表按钮和标题 */}
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.conversationButton}
            onPress={() => setShowConversations(true)}
          >
            <Icon name="menu" size={24} color={Colors.text} />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {currentConv?.title || 'AI Agent'}
            </Text>
            <View style={styles.statusContainer}>
              <View style={[styles.statusDot, isConnected && styles.statusDotConnected]} />
              <Text style={styles.statusText}>
                {isConnected ? '在线' : '离线'}
              </Text>
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
          {/* 新建对话按钮 - 最醒目的位置 */}
          <TouchableOpacity
            style={[
              styles.newChatButton,
              messageCount > 10 && styles.newChatButtonHighlight, // 消息多时高亮提示
            ]}
            onPress={handleNewConversation}
          >
            <Icon 
              name="add-circle" 
              size={20} 
              color={messageCount > 10 ? Colors.surface : Colors.primary} 
            />
            <Text style={[
              styles.newChatButtonText,
              messageCount > 10 && styles.newChatButtonTextHighlight,
            ]}>
              新对话
            </Text>
          </TouchableOpacity>

          {/* 工具管理按钮 */}
          <ToolButton
            enabledCount={toolStats.enabled}
            totalCount={toolStats.total}
            onPress={() => setShowToolManager(true)}
          />

          {/* 重连按钮（仅在未连接时显示） */}
          {!isConnected && (
            <TouchableOpacity
              style={[styles.headerButton, styles.reconnectButton]}
              onPress={handleReconnect}
            >
              <Icon name="refresh" size={20} color={Colors.surface} />
            </TouchableOpacity>
          )}

          {/* 更多操作 */}
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleClearChat}
          >
            <Icon name="ellipsis-vertical" size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  /**
   * 渲染快捷操作栏
   */
  const renderQuickActions = () => {
    if (!showQuickActions) return null;

    return (
      <View style={styles.quickActionsContainer}>
        <View style={styles.quickActionsHeader}>
          <Text style={styles.quickActionsTitle}>💡 快捷操作</Text>
          <TouchableOpacity onPress={() => setShowQuickActions(false)}>
            <Icon name="close" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickActionsScroll}
        >
          {smartSuggestions.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.quickActionButton}
              onPress={() => handleSend(item.text)}
            >
              <Text style={styles.quickActionIcon}>{item.icon}</Text>
              <Text style={styles.quickActionText}>{item.text}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
                          <Text style={styles.conversationTitle} numberOfLines={1}>
                            {conv.title}
                          </Text>
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
      <SafeAreaView style={styles.safeArea}>
        {Platform.OS === 'android' && (
          <StatusBar 
            backgroundColor={Colors.surface} 
            barStyle="dark-content" 
          />
        )}
        {renderHeader()}
        {renderPermissionDenied()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Android 状态栏 */}
      {Platform.OS === 'android' && (
        <StatusBar 
          backgroundColor={Colors.surface} 
          barStyle="dark-content" 
        />
      )}
      
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* 头部 */}
        {renderHeader()}

        {/* 快捷操作栏（智能建议） */}
        {renderQuickActions()}

        {/* 消息列表 */}
        <View style={styles.messagesContainer}>
          {renderEmptyState()}
          <MessageList 
            messages={messages} 
            isTyping={isTyping}
            onTransactionPress={handleTransactionPress}
            onActionButtonPress={handleActionButtonPress}
            onMessageLongPress={handleMessageLongPress}
            onAttachmentPress={handleAttachmentPress}
          />
        </View>

        {/* 输入栏 */}
        <InputBar onSend={handleSend} disabled={!isConnected} />
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

      {/* 危险操作确认对话框 */}
      <Modal
        visible={isAwaitingConfirmation && !!pendingConfirmation}
        animationType="fade"
        transparent={true}
        onRequestClose={() => rejectOperation('用户取消')}
      >
        <View style={styles.confirmationOverlay}>
          <View style={styles.confirmationDialog}>
            {/* 对话框头部 */}
            <View style={styles.confirmationHeader}>
              <Text style={styles.confirmationIcon}>
                {pendingConfirmation?.riskLevel === 'critical' ? '🔴' : '⚠️'}
              </Text>
              <Text style={styles.confirmationTitle}>
                {pendingConfirmation?.riskLevel === 'critical' ? '危险操作' : '操作确认'}
              </Text>
            </View>
            
            {/* 操作描述 */}
            <Text style={styles.confirmationMessage}>
              {pendingConfirmation?.message}
            </Text>
            
            {/* 操作详情 */}
            {pendingConfirmation?.details && pendingConfirmation.details.length > 0 && (
              <View style={styles.confirmationDetails}>
                {pendingConfirmation.details.map((detail, index) => (
                  <Text key={index} style={styles.confirmationDetailItem}>
                    • {detail}
                  </Text>
                ))}
              </View>
            )}
            
            {/* 风险提示 */}
            {pendingConfirmation?.riskLevel === 'critical' && (
              <View style={styles.confirmationWarning}>
                <Text style={styles.confirmationWarningText}>
                  ⚠️ 此操作不可撤销，请谨慎确认
                </Text>
              </View>
            )}
            
            {/* 按钮区域 */}
            <View style={styles.confirmationButtons}>
              <TouchableOpacity
                style={[styles.confirmationButton, styles.confirmationButtonCancel]}
                onPress={() => rejectOperation('用户取消')}
              >
                <Text style={styles.confirmationButtonCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmationButton, 
                  styles.confirmationButtonConfirm,
                  pendingConfirmation?.riskLevel === 'critical' && styles.confirmationButtonDanger
                ]}
                onPress={confirmOperation}
              >
                <Text style={styles.confirmationButtonConfirmText}>
                  {pendingConfirmation?.riskLevel === 'critical' ? '确认执行' : '确认'}
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* 始终允许按钮（仅对非 critical 级别显示） */}
            {pendingConfirmation?.riskLevel !== 'critical' && (
              <TouchableOpacity
                style={styles.alwaysAllowButton}
                onPress={() => {
                  if (pendingConfirmation?.toolName) {
                    // 使用 toggleAlwaysAllowed 以同步更新 UI 状态
                    toggleAlwaysAllowed(pendingConfirmation.toolName, true);
                    confirmOperation();
                  }
                }}
              >
                <Icon name="checkmark-circle-outline" size={16} color={Colors.primary} />
                <Text style={styles.alwaysAllowButtonText}>始终允许此操作</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* 加载指示器 */}
      {renderLoading()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
    // Android 需要额外的顶部间距
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  keyboardAvoidingView: {
    flex: 1,
  },

  // 头部样式
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  conversationButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.xs,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
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
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  reconnectButton: {
    backgroundColor: Colors.warning,
  },

  // 新建对话按钮样式
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.primary,
    marginRight: Spacing.xs,
  },
  newChatButtonHighlight: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  newChatButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.primary,
    marginLeft: 4,
  },
  newChatButtonTextHighlight: {
    color: Colors.surface,
  },

  // 快捷操作样式
  quickActionsContainer: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: Spacing.md,
  },
  quickActionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  quickActionsTitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeights.semibold,
  },
  quickActionsScroll: {
    paddingHorizontal: Spacing.md,
  },
  quickActionButton: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginRight: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickActionIcon: {
    fontSize: FontSizes.md,
    marginRight: Spacing.xs,
  },
  quickActionText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    fontWeight: FontWeights.medium,
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
  },
  conversationItemActive: {
    backgroundColor: Colors.backgroundSecondary,
  },
  conversationContent: {
    flex: 1,
    marginRight: Spacing.md,
  },
  conversationTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: 4,
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

  // 确认对话框样式
  confirmationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  confirmationDialog: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 340,
    ...Shadows.lg,
  },
  confirmationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  confirmationIcon: {
    fontSize: 28,
    marginRight: Spacing.sm,
  },
  confirmationTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  confirmationMessage: {
    fontSize: FontSizes.md,
    color: Colors.text,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  confirmationDetails: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  confirmationDetailItem: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  confirmationWarning: {
    backgroundColor: '#FFF3F3',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  confirmationWarningText: {
    fontSize: FontSizes.sm,
    color: Colors.error,
    textAlign: 'center',
    fontWeight: FontWeights.medium,
  },
  confirmationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  confirmationButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmationButtonCancel: {
    backgroundColor: Colors.backgroundSecondary,
    marginRight: Spacing.sm,
  },
  confirmationButtonConfirm: {
    backgroundColor: Colors.primary,
    marginLeft: Spacing.sm,
  },
  confirmationButtonDanger: {
    backgroundColor: Colors.error,
  },
  confirmationButtonCancelText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
  },
  confirmationButtonConfirmText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.surface,
  },
  alwaysAllowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    marginTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  alwaysAllowButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    marginLeft: Spacing.xs,
  },
});
