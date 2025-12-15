/**
 * API Key 设置页面
 * 
 * 允许用户配置自己的 AI 模型 API Key
 * 支持 Google Gemini 和 DeepSeek
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Linking,
  ActivityIndicator,
  Modal,
  Pressable,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows, FontWeights } from '../constants/theme';
import { Icon, AppIcons } from '../components/common';
import {
  apiKeyStorage,
  AI_PROVIDERS,
  AIProvider,
  AIProviderConfig,
  MODEL_ROLES,
  ModelRole,
  ModelConfigs,
  RoleModelConfig,
  DEFAULT_MODEL_CONFIGS,
} from '../services/apiKeyStorage';
import { fetchAvailableModels, ModelInfo, clearModelListCache } from '../agent/modelFactory';
import { completionService, CompletionSettings } from '../services/completionService';
import { Switch } from 'react-native';

interface ProviderCardProps {
  config: AIProviderConfig;
  apiKey: string;
  isSelected: boolean;
  isEditing: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onSave: (key: string) => void;
  onCancel: () => void;
  onClear: () => void;
  onOpenHelp: () => void;
}

/**
 * 提供商卡片组件
 */
const ProviderCard: React.FC<ProviderCardProps> = ({
  config,
  apiKey,
  isSelected,
  isEditing,
  onSelect,
  onEdit,
  onSave,
  onCancel,
  onClear,
  onOpenHelp,
}) => {
  // 输入框初始为空，用户需要手动粘贴 Key
  const [inputValue, setInputValue] = useState('');
  const hasKey = !!apiKey;

  useEffect(() => {
    // 编辑时如果有已保存的 Key，则填充
    if (isEditing && apiKey) {
      setInputValue(apiKey);
    } else if (!isEditing) {
      setInputValue('');
    }
  }, [apiKey, isEditing]);

  const handleSave = () => {
    const validation = apiKeyStorage.validateAPIKeyFormat(config.id, inputValue);
    if (!validation.valid) {
      Alert.alert('格式错误', validation.message);
      return;
    }
    onSave(inputValue);
  };

  return (
    <View style={[styles.providerCard, isSelected && styles.providerCardSelected]}>
      {/* 头部：图标、名称、选中状态 */}
      <TouchableOpacity
        style={styles.providerHeader}
        onPress={onSelect}
        activeOpacity={0.7}
      >
        <View style={styles.providerInfo}>
          <Text style={styles.providerIcon}>{config.icon}</Text>
          <View style={styles.providerText}>
            <Text style={styles.providerName}>{config.name}</Text>
            <Text style={styles.providerDescription}>{config.description}</Text>
          </View>
        </View>
        <View style={[
          styles.radioButton,
          isSelected && styles.radioButtonSelected,
        ]}>
          {isSelected && <View style={styles.radioButtonInner} />}
        </View>
      </TouchableOpacity>

      {/* API Key 配置区域 */}
      <View style={styles.keySection}>
        {isEditing ? (
          // 编辑模式
          <View style={styles.editSection}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.keyInput}
                value={inputValue}
                onChangeText={setInputValue}
                placeholder={`粘贴您的 ${config.name} API Key`}
                placeholderTextColor={Colors.textLight}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                textContentType="none"
              />
            </View>
            <View style={styles.editActions}>
              <TouchableOpacity
                style={styles.helpLink}
                onPress={onOpenHelp}
              >
                <Icon name={AppIcons.helpCircle} size={14} color={Colors.primary} />
                <Text style={styles.helpLinkText}>获取 API Key</Text>
              </TouchableOpacity>
              <View style={styles.editButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onCancel}
                >
                  <Text style={styles.cancelButtonText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSave}
                >
                  <Text style={styles.saveButtonText}>保存</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          // 显示模式
          <View style={styles.displaySection}>
            {hasKey ? (
              <View style={styles.keyDisplay}>
                <View style={styles.keyStatus}>
                  <Icon name={AppIcons.checkmarkCircle} size={16} color={Colors.success} />
                  <Text style={styles.keyStatusText}>
                    {apiKeyStorage.maskAPIKey(apiKey)}
                  </Text>
                </View>
                <View style={styles.keyActions}>
                  <TouchableOpacity
                    style={styles.keyActionButton}
                    onPress={onEdit}
                  >
                    <Icon name={AppIcons.createOutline} size={18} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.keyActionButton}
                    onPress={() => {
                      Alert.alert(
                        '删除 API Key',
                        `确定要删除 ${config.name} 的 API Key 吗？`,
                        [
                          { text: '取消', style: 'cancel' },
                          { text: '删除', style: 'destructive', onPress: onClear },
                        ]
                      );
                    }}
                  >
                    <Icon name={AppIcons.trashOutline} size={18} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addKeyButton}
                onPress={onEdit}
              >
                <Icon name={AppIcons.addCircleOutline} size={18} color={Colors.primary} />
                <Text style={styles.addKeyText}>添加 API Key</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

/**
 * 智能模型选择器组件
 * 
 * 特性：
 * 1. 模型少时（≤5）：显示为水平滚动的按钮组
 * 2. 模型多时（>5）：显示为可搜索的下拉列表
 * 3. 始终支持手动输入自定义模型名称
 */
interface ModelSelectorProps {
  models: ModelInfo[];
  selectedModel: string;
  onModelChange: (model: string) => void;
  providerName: string;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  selectedModel,
  onModelChange,
  providerName,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // 检查当前选中的模型是否是自定义的（不在列表中）
  const isCustomModel = !models.some(m => m.id === selectedModel);
  
  // 过滤模型列表
  const filteredModels = useMemo(() => models.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.id.toLowerCase().includes(searchQuery.toLowerCase())
  ), [models, searchQuery]);

  const MODEL_THRESHOLD = 5; // 超过这个数量就切换到下拉模式
  const useDropdownMode = models.length > MODEL_THRESHOLD;

  const handleSelectModel = (modelId: string) => {
    onModelChange(modelId);
    setShowDropdown(false);
    setSearchQuery('');
  };

  const handleCustomModelSubmit = () => {
    if (customModel.trim()) {
      onModelChange(customModel.trim());
      setShowCustomInput(false);
      setCustomModel('');
    }
  };

  // 模式1: 按钮组模式（模型较少）
  if (!useDropdownMode) {
    return (
      <View style={styles.modelSelectorContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.modelButtonGroup}
        >
          {models.map((model) => (
            <TouchableOpacity
              key={model.id}
              style={[
                styles.modelButton,
                selectedModel === model.id && styles.modelButtonSelected,
              ]}
              onPress={() => handleSelectModel(model.id)}
              activeOpacity={0.7}
            >
              <Text 
                style={[
                  styles.modelButtonText,
                  selectedModel === model.id && styles.modelButtonTextSelected,
                ]}
                numberOfLines={1}
              >
                {model.name}
              </Text>
            </TouchableOpacity>
          ))}
          
          {/* 自定义模型按钮 */}
          <TouchableOpacity
            style={[
              styles.modelButton,
              styles.customModelButton,
              isCustomModel && styles.modelButtonSelected,
            ]}
            onPress={() => setShowCustomInput(true)}
            activeOpacity={0.7}
          >
            <Icon name={AppIcons.addCircleOutline} size={16} color={isCustomModel ? Colors.surface : Colors.primary} />
            <Text 
              style={[
                styles.modelButtonText,
                styles.customModelButtonText,
                isCustomModel && styles.modelButtonTextSelected,
              ]}
            >
              {isCustomModel ? selectedModel : '自定义'}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* 自定义模型输入弹窗 */}
        {showCustomInput && (
          <View style={styles.customInputOverlay}>
            <View style={styles.customInputBox}>
              <Text style={styles.customInputTitle}>输入自定义模型名称</Text>
              <TextInput
                style={styles.customInput}
                value={customModel}
                onChangeText={setCustomModel}
                placeholder={`例如: ${providerName === '阿里云百炼' ? 'qwen-max-latest' : 'gpt-4'}`}
                placeholderTextColor={Colors.textSecondary}
                autoFocus
              />
              <View style={styles.customInputActions}>
                <TouchableOpacity
                  style={[styles.customInputButton, styles.customInputCancelButton]}
                  onPress={() => {
                    setShowCustomInput(false);
                    setCustomModel('');
                  }}
                >
                  <Text style={styles.customInputCancelText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.customInputButton, styles.customInputConfirmButton]}
                  onPress={handleCustomModelSubmit}
                >
                  <Text style={styles.customInputConfirmText}>确定</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  }

  // 模式2: 下拉模式（模型较多）
  return (
    <View style={styles.modelSelectorContainer}>
      {/* 当前选择 */}
      <TouchableOpacity
        style={styles.dropdownTrigger}
        onPress={() => setShowDropdown(!showDropdown)}
        activeOpacity={0.7}
      >
        <Text style={styles.dropdownTriggerText} numberOfLines={1}>
          {isCustomModel ? `${selectedModel} (自定义)` : selectedModel}
        </Text>
        <Icon 
          name={showDropdown ? AppIcons.chevronUpOutline : AppIcons.chevronDownOutline} 
          size={20} 
          color={Colors.textSecondary} 
        />
      </TouchableOpacity>

      {/* 下拉列表 - 使用 Modal */}
      <Modal
        visible={showDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {}} // 空函数，避免输入法收起时自动关闭
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowDropdown(false)}
        >
          <Pressable 
            style={styles.dropdownMenuModal} 
            onPress={(e) => e.stopPropagation()}
          >
            {/* 搜索框 */}
            <View style={styles.searchContainer}>
              <Icon name={AppIcons.searchOutline} size={18} color={Colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="搜索模型..."
                placeholderTextColor={Colors.textSecondary}
              />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name={AppIcons.closeCircle} size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* 模型列表 */}
          <FlatList
            data={filteredModels}
            keyExtractor={(item) => item.id}
            style={styles.dropdownList}
            nestedScrollEnabled
            renderItem={({ item: model }) => (
              <TouchableOpacity
                style={[
                  styles.dropdownItem,
                  selectedModel === model.id && styles.dropdownItemSelected,
                ]}
                onPress={() => handleSelectModel(model.id)}
              >
                <Text 
                  style={[
                    styles.dropdownItemText,
                    selectedModel === model.id && styles.dropdownItemTextSelected,
                  ]}
                  numberOfLines={1}
                >
                  {model.name}
                </Text>
                {selectedModel === model.id && (
                  <Icon name={AppIcons.checkmarkCircle} size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.noResultsText}>未找到匹配的模型</Text>
            }
            ListFooterComponent={
              <>
                <View style={styles.dropdownDivider} />
                <TouchableOpacity
                  style={[styles.dropdownItem, styles.customModelItem]}
                  onPress={() => {
                    setShowDropdown(false);
                    setShowCustomInput(true);
                  }}
                >
                  <Icon name={AppIcons.addCircleOutline} size={20} color={Colors.primary} />
                  <Text style={styles.customModelItemText}>自定义模型名称</Text>
                </TouchableOpacity>
              </>
            }
          />
          </Pressable>
        </Pressable>
      </Modal>

      {/* 自定义模型输入弹窗 */}
      {showCustomInput && (
        <View style={styles.customInputOverlay}>
          <View style={styles.customInputBox}>
            <Text style={styles.customInputTitle}>输入自定义模型名称</Text>
            <Text style={styles.customInputHint}>
              当前 {providerName} 提供商支持的模型可能未全部列出，您可以手动输入模型名称。
            </Text>
            <TextInput
              style={styles.customInput}
              value={customModel}
              onChangeText={setCustomModel}
              placeholder={`例如: ${providerName === '阿里云百炼' ? 'qwen-max-latest' : 'gpt-4'}`}
              placeholderTextColor={Colors.textSecondary}
              autoFocus
            />
            <View style={styles.customInputActions}>
              <TouchableOpacity
                style={[styles.customInputButton, styles.customInputCancelButton]}
                onPress={() => {
                  setShowCustomInput(false);
                  setCustomModel('');
                }}
              >
                <Text style={styles.customInputCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.customInputButton, styles.customInputConfirmButton]}
                onPress={handleCustomModelSubmit}
                disabled={!customModel.trim()}
              >
                <Text style={[
                  styles.customInputConfirmText,
                  !customModel.trim() && styles.customInputConfirmTextDisabled
                ]}>确定</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

/**
 * API Key 设置页面主组件
 */
export const APIKeySettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [isLoading, setIsLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState<Record<AIProvider, string>>({
    gemini: '',
    deepseek: '',
    alibaba: '',
  });
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('alibaba');
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null);
  
  // 模型配置状态（使用默认配置初始化）
  const [modelConfigs, setModelConfigs] = useState<ModelConfigs>({ ...DEFAULT_MODEL_CONFIGS });
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // 智能补全设置
  const [completionSettings, setCompletionSettings] = useState<CompletionSettings>(completionService.getSettings());
  // 智能补全设置已合并到高级设置的 completion 角色中

  // 动态模型列表状态
  const [dynamicModels, setDynamicModels] = useState<Record<AIProvider, ModelInfo[]>>({
    gemini: [],
    deepseek: [],
    alibaba: [],
  });
  const [loadingModels, setLoadingModels] = useState<AIProvider | null>(null);
  const [modelLoadError, setModelLoadError] = useState<string | null>(null);

  // 加载数据
  useEffect(() => {
    loadData();
  }, []);

  // 当 API Key 变化时，自动获取动态模型列表
  useEffect(() => {
    const fetchModels = async () => {
      // 为有 API Key 的提供商获取模型列表
      for (const provider of ['gemini', 'deepseek', 'alibaba'] as AIProvider[]) {
        const key = apiKeys[provider];
        if (key) {
          await loadDynamicModels(provider, key);
        }
      }
    };
    
    if (!isLoading) {
      fetchModels();
    }
  }, [apiKeys, isLoading]);

  // 动态获取模型列表
  const loadDynamicModels = async (provider: AIProvider, apiKey: string) => {
    setLoadingModels(provider);
    setModelLoadError(null);
    
    try {
      const result = await fetchAvailableModels(provider, apiKey);
      if (result.success) {
        setDynamicModels(prev => ({
          ...prev,
          [provider]: result.models,
        }));
        console.log(`✅ Loaded ${result.models.length} models for ${provider}`);
      } else {
        console.warn(`⚠️ Failed to load models for ${provider}: ${result.error}`);
        setModelLoadError(result.error || '获取模型列表失败');
      }
    } catch (error) {
      console.error(`❌ Error loading models for ${provider}:`, error);
      setModelLoadError('网络请求失败');
    } finally {
      setLoadingModels(null);
    }
  };

  // 刷新模型列表
  const handleRefreshModels = useCallback(async (provider: AIProvider) => {
    const key = apiKeys[provider];
    if (!key) {
      Alert.alert('提示', '请先配置 API Key');
      return;
    }
    
    // 清除缓存后重新获取
    clearModelListCache(provider);
    await loadDynamicModels(provider, key);
  }, [apiKeys]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 确保补全服务已初始化
      await completionService.initialize();
      
      const geminiKey = await apiKeyStorage.getAPIKey('gemini');
      const deepseekKey = await apiKeyStorage.getAPIKey('deepseek');
      const alibabaKey = await apiKeyStorage.getAPIKey('alibaba');
      const selected = await apiKeyStorage.getSelectedProvider();
      const configs = await apiKeyStorage.getAllModelConfigs();

      setApiKeys({
        gemini: geminiKey || '',
        deepseek: deepseekKey || '',
        alibaba: alibabaKey || '',
      });
      setSelectedProvider(selected);
      // 确保加载的配置包含所有角色，缺失的使用默认值
      setModelConfigs({ ...DEFAULT_MODEL_CONFIGS, ...configs });
      setCompletionSettings(completionService.getSettings());
    } catch (error) {
      console.error('Failed to load API keys:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectProvider = useCallback(async (provider: AIProvider) => {
    // 需要用户配置 Key 才能选择提供商
    const hasAvailableKey = !!apiKeys[provider];
    
    if (!hasAvailableKey) {
      Alert.alert(
        '尚未配置',
        `请先添加 ${AI_PROVIDERS[provider].name} 的 API Key`,
        [{ text: '确定' }]
      );
      return;
    }

    try {
      await apiKeyStorage.setSelectedProvider(provider);
      setSelectedProvider(provider);
      
      // 自动更新模型配置为选中提供商的模型
      // 检查当前模型配置是否属于新选择的提供商
      const needsUpdate = Object.values(modelConfigs).some(
        config => config.provider !== provider
      );
      if (needsUpdate) {
        const defaultModel = AI_PROVIDERS[provider].defaultModel;
        await apiKeyStorage.setUnifiedModelConfig(provider, defaultModel);
        const newConfig: RoleModelConfig = { provider, model: defaultModel };
        setModelConfigs({
          executor: newConfig,
          intentRewriter: newConfig,
          reflector: newConfig,
        });
      }
    } catch (error) {
      Alert.alert('错误', '保存失败，请重试');
    }
  }, [apiKeys, modelConfigs]);

  const handleSaveKey = useCallback(async (provider: AIProvider, key: string) => {
    try {
      await apiKeyStorage.setAPIKey(provider, key);
      setApiKeys(prev => ({ ...prev, [provider]: key }));
      setEditingProvider(null);

      // 如果是第一个配置的 Key，自动选中并更新模型配置
      if (!apiKeys.gemini && !apiKeys.deepseek && !apiKeys.alibaba) {
        await apiKeyStorage.setSelectedProvider(provider);
        setSelectedProvider(provider);
        
        // 自动更新模型配置为该提供商的默认模型
        const defaultModel = AI_PROVIDERS[provider].defaultModel;
        await apiKeyStorage.setUnifiedModelConfig(provider, defaultModel);
        const newConfig: RoleModelConfig = { provider, model: defaultModel };
        setModelConfigs({
          executor: newConfig,
          intentRewriter: newConfig,
          reflector: newConfig,
          completion: newConfig,
        });
      } else {
        // 如果保存的是当前选中的提供商，也需要更新模型配置
        if (selectedProvider === provider) {
          // 检查当前模型配置是否属于该提供商
          const needsUpdate = Object.values(modelConfigs).some(
            config => config.provider !== provider
          );
          if (needsUpdate) {
            const defaultModel = AI_PROVIDERS[provider].defaultModel;
            await apiKeyStorage.setUnifiedModelConfig(provider, defaultModel);
            const newConfig: RoleModelConfig = { provider, model: defaultModel };
            setModelConfigs({
              executor: newConfig,
              intentRewriter: newConfig,
              reflector: newConfig,
            });
          }
        }
      }

      Alert.alert('成功', 'API Key 已保存');
    } catch (error) {
      Alert.alert('错误', '保存失败，请重试');
    }
  }, [apiKeys, selectedProvider, modelConfigs]);

  const handleClearKey = useCallback(async (provider: AIProvider) => {
    try {
      await apiKeyStorage.setAPIKey(provider, undefined);
      setApiKeys(prev => ({ ...prev, [provider]: '' }));

      // 如果清除的是当前选中的，切换到另一个（如果有）
      if (selectedProvider === provider) {
        const other = provider === 'gemini' ? 'deepseek' : 'gemini';
        if (apiKeys[other]) {
          await apiKeyStorage.setSelectedProvider(other);
          setSelectedProvider(other);
        }
      }
    } catch (error) {
      Alert.alert('错误', '删除失败，请重试');
    }
  }, [selectedProvider, apiKeys]);

  const handleOpenHelp = useCallback((provider: AIProvider) => {
    const url = AI_PROVIDERS[provider].helpUrl;
    Linking.openURL(url).catch(() => {
      Alert.alert('错误', '无法打开链接');
    });
  }, []);

  // 处理模型配置变更
  const handleModelConfigChange = useCallback(async (role: ModelRole, config: RoleModelConfig) => {
    try {
      await apiKeyStorage.setRoleModelConfig(role, config);
      setModelConfigs(prev => ({ ...prev, [role]: config }));
    } catch (error) {
      Alert.alert('错误', '保存模型配置失败');
    }
  }, []);

  // 统一所有模型配置
  const handleUnifyModels = useCallback(async () => {
    const provider = selectedProvider;
    const model = AI_PROVIDERS[provider].defaultModel;
    
    try {
      await apiKeyStorage.setUnifiedModelConfig(provider, model);
      const newConfig: RoleModelConfig = { provider, model };
      setModelConfigs({
        executor: newConfig,
        intentRewriter: newConfig,
        reflector: newConfig,
        completion: newConfig,
      });
      Alert.alert('成功', '已统一所有模型配置');
    } catch (error) {
      Alert.alert('错误', '统一配置失败');
    }
  }, [selectedProvider]);

  // 处理补全设置变更
  const handleCompletionSettingChange = useCallback(async (key: keyof CompletionSettings, value: any) => {
    const newSettings = { ...completionSettings, [key]: value };
    setCompletionSettings(newSettings);
    await completionService.saveSettings({ [key]: value });
  }, [completionSettings]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 头部导航 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>API Key 设置</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 说明区域 */}
        <View style={styles.infoSection}>
          <View style={styles.infoIcon}>
            <Icon name={AppIcons.lockOutline} size={24} color={Colors.primary} />
          </View>
          <Text style={styles.infoTitle}>配置您的 AI 模型</Text>
          <Text style={styles.infoDescription}>
            配置 API Key 后，AI Agent 将使用您的账户额度。
            您可以随时切换不同的 AI 提供商。
          </Text>
        </View>

        {/* 提供商列表 */}
        <View style={styles.providersSection}>
          <Text style={styles.sectionTitle}>选择 AI 提供商</Text>
          
          {Object.values(AI_PROVIDERS).map((config) => (
              <ProviderCard
                key={config.id}
                config={config}
                apiKey={apiKeys[config.id]}
                isSelected={selectedProvider === config.id}
                isEditing={editingProvider === config.id}
                onSelect={() => handleSelectProvider(config.id)}
                onEdit={() => setEditingProvider(config.id)}
                onSave={(key) => handleSaveKey(config.id, key)}
                onCancel={() => setEditingProvider(null)}
                onClear={() => handleClearKey(config.id)}
                onOpenHelp={() => handleOpenHelp(config.id)}
              />
            ))}
        </View>

        {/* 高级配置：模型角色配置 */}
        <View style={styles.advancedSection}>
          <TouchableOpacity
            style={styles.advancedHeader}
            onPress={() => setShowAdvanced(!showAdvanced)}
            activeOpacity={0.7}
          >
            <View style={styles.advancedHeaderLeft}>
              <Icon name={AppIcons.settingsOutline} size={18} color={Colors.textSecondary} />
              <Text style={styles.advancedHeaderText}>高级设置</Text>
            </View>
            <Icon 
              name={showAdvanced ? AppIcons.chevronUp : AppIcons.chevronDown} 
              size={18} 
              color={Colors.textSecondary} 
            />
          </TouchableOpacity>
          
          {showAdvanced && (
            <View style={styles.advancedContent}>
              <Text style={styles.advancedDescription}>
                为不同的 AI 模块配置不同的模型。所有模块共享同一个提供商的 API Key。
              </Text>

              {/* 刷新模型列表按钮 */}
              <View style={styles.refreshSection}>
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={() => handleRefreshModels(selectedProvider)}
                  disabled={loadingModels !== null}
                  activeOpacity={0.7}
                >
                  {loadingModels === selectedProvider ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <Icon name={AppIcons.refreshOutline} size={16} color={Colors.primary} />
                  )}
                  <Text style={styles.refreshButtonText}>
                    {loadingModels === selectedProvider ? '获取中...' : '刷新模型列表'}
                  </Text>
                </TouchableOpacity>
                {(dynamicModels[selectedProvider]?.length ?? 0) > 0 && (
                  <Text style={styles.modelCountText}>
                    已获取 {dynamicModels[selectedProvider]?.length ?? 0} 个模型
                  </Text>
                )}
              </View>

              {/* 错误提示 */}
              {modelLoadError && (
                <View style={styles.errorBanner}>
                  <Icon name={AppIcons.closeCircle} size={14} color={Colors.error} />
                  <Text style={styles.errorText}>{modelLoadError}</Text>
                </View>
              )}

              {/* 统一配置按钮 */}
              <TouchableOpacity
                style={styles.unifyButton}
                onPress={handleUnifyModels}
                activeOpacity={0.7}
              >
                <Text style={styles.unifyButtonText}>
                  统一使用 {AI_PROVIDERS[selectedProvider].name}
                </Text>
              </TouchableOpacity>

              {/* 各角色配置 */}
              {(Object.keys(MODEL_ROLES) as ModelRole[]).map((role) => {
                const roleConfig = MODEL_ROLES[role];
                const currentConfig = modelConfigs[role] || { provider: selectedProvider, model: AI_PROVIDERS[selectedProvider].defaultModel };
                const providerConfig = AI_PROVIDERS[selectedProvider];
                
                // 优先使用动态获取的模型列表，否则使用静态配置（统一使用 selectedProvider 的模型列表）
                const availableModels = (dynamicModels[selectedProvider]?.length ?? 0) > 0
                  ? dynamicModels[selectedProvider]
                  : providerConfig.models.map(m => ({ id: m, name: m }));
                
                return (
                  <View key={role} style={styles.roleConfigCard}>
                    <View style={styles.roleHeader}>
                      <Text style={styles.roleIcon}>{roleConfig.icon}</Text>
                      <View style={styles.roleInfo}>
                        <Text style={styles.roleName}>{roleConfig.name}</Text>
                        <Text style={styles.roleDescription}>{roleConfig.description}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.roleModelSelect}>
                      <Text style={styles.roleModelLabel}>模型：</Text>
                      <ModelSelector
                        models={availableModels}
                        selectedModel={currentConfig.model}
                        onModelChange={(model) => handleModelConfigChange(role, { 
                          provider: currentConfig.provider, 
                          model 
                        })}
                        providerName={providerConfig.name}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* 安全提示 */}
        <View style={styles.securitySection}>
          <Icon name={AppIcons.checkmarkCircle} size={16} color={Colors.success} />
          <Text style={styles.securityText}>
            API Key 仅存储在您的设备本地，不会上传到服务器
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 32,
    color: Colors.text,
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },

  // 说明区域
  infoSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.md,
  },
  infoIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  infoTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  infoDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // 提供商列表
  providersSection: {
    paddingHorizontal: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },

  // 提供商卡片
  providerCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadows.sm,
  },
  providerCardSelected: {
    borderColor: Colors.primary,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  providerIcon: {
    fontSize: 28,
    marginRight: Spacing.md,
  },
  providerText: {
    flex: 1,
  },
  providerName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: 2,
  },
  providerDescription: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: Colors.primary,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },

  // Key 配置区域
  keySection: {
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  displaySection: {},
  keyDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  keyStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  keyStatusText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
  keyActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  keyActionButton: {
    padding: Spacing.xs,
  },
  addKeyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  addKeyText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: FontWeights.medium,
  },

  // 编辑模式
  editSection: {},
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  keyInput: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.text,
    paddingVertical: Spacing.sm,
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  helpLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  helpLinkText: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
  },
  editButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  cancelButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  cancelButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  saveButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
  },
  saveButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.surface,
    fontWeight: FontWeights.medium,
  },

  // 安全提示
  securitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  securityText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },

  // 高级配置
  advancedSection: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  advancedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
  },
  advancedHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  advancedHeaderText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeights.medium,
  },
  advancedContent: {
    marginTop: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
  },
  advancedDescription: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  refreshSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  refreshButtonText: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    fontWeight: FontWeights.medium,
  },
  modelCountText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.error + '15',
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  errorText: {
    fontSize: FontSizes.xs,
    color: Colors.error,
    flex: 1,
  },
  unifyButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  unifyButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: FontWeights.medium,
  },
  roleConfigCard: {
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  roleIcon: {
    fontSize: 20,
  },
  roleInfo: {
    flex: 1,
  },
  roleName: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    fontWeight: FontWeights.medium,
    marginBottom: 2,
  },
  roleDescription: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  roleModelSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  roleModelLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  modelPicker: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  modelOption: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modelOptionSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  modelOptionText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  modelOptionTextSelected: {
    color: Colors.primary,
    fontWeight: FontWeights.medium,
  },
  
  // 设置行样式
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  disabledRow: {
    opacity: 0.5,
  },
  settingInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  settingLabel: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    fontWeight: FontWeights.medium,
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  debounceControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.sm,
    padding: 2,
  },
  debounceBtn: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
  },
  debounceBtnText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: 'bold',
  },
  debounceValue: {
    fontSize: FontSizes.xs,
    color: Colors.text,
    marginHorizontal: Spacing.sm,
    minWidth: 40,
    textAlign: 'center',
  },
  modelPickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  modelChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modelChipActive: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  modelChipDisabled: {
    opacity: 0.5,
  },
  modelChipText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  modelChipTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },

  // ModelSelector 样式
  modelSelectorContainer: {
    flex: 1,
  },
  
  // 按钮组模式
  modelButtonGroup: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingRight: Spacing.sm,
  },
  modelButton: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modelButtonSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  modelButtonText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  modelButtonTextSelected: {
    color: Colors.primary,
    fontWeight: FontWeights.medium,
  },
  customModelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  customModelButtonText: {
    color: Colors.primary,
  },

  // 下拉模式
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 36,
  },
  dropdownTriggerText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    flex: 1,
    marginRight: Spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  dropdownMenuModal: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.md,
    maxHeight: '60%',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.md,
    maxHeight: 300,
    zIndex: 1000,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.text,
    paddingVertical: 4,
  },
  dropdownList: {
    maxHeight: 240,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  dropdownItemSelected: {
    backgroundColor: Colors.primaryLight,
  },
  dropdownItemText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    flex: 1,
  },
  dropdownItemTextSelected: {
    color: Colors.primary,
    fontWeight: FontWeights.medium,
  },
  noResultsText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.xs,
  },
  customModelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderBottomWidth: 0,
  },
  customModelItemText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: FontWeights.medium,
  },

  // 自定义输入弹窗
  customInputOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  customInputBox: {
    width: '80%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.lg,
  },
  customInputTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  customInputHint: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 16,
  },
  customInput: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.sm,
    color: Colors.text,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  customInputActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  customInputButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    minWidth: 80,
    alignItems: 'center',
  },
  customInputCancelButton: {
    backgroundColor: Colors.backgroundSecondary,
  },
  customInputConfirmButton: {
    backgroundColor: Colors.primary,
  },
  customInputCancelText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeights.medium,
  },
  customInputConfirmText: {
    fontSize: FontSizes.sm,
    color: Colors.surface,
    fontWeight: FontWeights.medium,
  },
  customInputConfirmTextDisabled: {
    opacity: 0.5,
  },
});
