/**
 * Agent 配置设置页面
 * 
 * 允许用户自定义 AI Agent 的行为，包括置信度阈值、确认策略等
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius, Shadows } from '../constants/theme';
import { Icon, AppIcons } from '../components/common';
import { agentConfigStorage, AgentConfig, AGENT_CONFIG_PRESETS } from '../services/agentConfigStorage';

export const AgentConfigScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<AgentConfig>({});

  // 加载配置
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const savedConfig = await agentConfigStorage.getConfig();
      setConfig(savedConfig);
    } catch (error) {
      console.error('Failed to load config:', error);
      Alert.alert('错误', '加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      setSaving(true);
      await agentConfigStorage.saveConfig(config);
      Alert.alert('成功', '配置已保存，重启对话后生效');
    } catch (error) {
      console.error('Failed to save config:', error);
      Alert.alert('错误', '保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = async (presetName: keyof typeof AGENT_CONFIG_PRESETS) => {
    const preset = AGENT_CONFIG_PRESETS[presetName];
    Alert.alert(
      `应用「${preset.name}」`,
      preset.description + '\n\n确定要应用此预设吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: async () => {
            try {
              setSaving(true);
              await agentConfigStorage.applyPreset(presetName);
              await loadConfig();
              Alert.alert('成功', '预设已应用');
            } catch (error) {
              Alert.alert('错误', '应用预设失败');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const resetToDefault = () => {
    Alert.alert(
      '重置为默认',
      '确定要重置为默认配置吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '重置',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              await agentConfigStorage.resetToDefault();
              await loadConfig();
              Alert.alert('成功', '已重置为默认配置');
            } catch (error) {
              Alert.alert('错误', '重置失败');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const updateConfig = (updates: Partial<AgentConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const updateIntentRewriterThresholds = (updates: Partial<NonNullable<AgentConfig['intentRewriterConfidenceThresholds']>>) => {
    setConfig(prev => ({
      ...prev,
      intentRewriterConfidenceThresholds: {
        ...prev.intentRewriterConfidenceThresholds,
        ...updates,
      },
    }));
  };

  const updateReflectorThresholds = (updates: Partial<NonNullable<AgentConfig['reflectorConfidenceThresholds']>>) => {
    setConfig(prev => ({
      ...prev,
      reflectorConfidenceThresholds: {
        ...prev.reflectorConfidenceThresholds,
        ...updates,
      },
    }));
  };

  const updateConfirmationPolicy = (updates: Partial<NonNullable<AgentConfig['confirmationPolicy']>>) => {
    setConfig(prev => ({
      ...prev,
      confirmationPolicy: {
        ...prev.confirmationPolicy,
        ...updates,
      },
    }));
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>加载配置中...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name={AppIcons.chevronBack} size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI 行为配置</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveConfig}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Text style={styles.saveButtonText}>保存</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 预设配置 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>快速选择预设</Text>
          <Text style={styles.sectionDescription}>
            根据您的使用习惯选择合适的预设配置
          </Text>
          <View style={styles.presetContainer}>
            {Object.entries(AGENT_CONFIG_PRESETS).map(([key, preset]) => (
              <TouchableOpacity
                key={key}
                style={styles.presetButton}
                onPress={() => applyPreset(key as keyof typeof AGENT_CONFIG_PRESETS)}
              >
                <Text style={styles.presetName}>{preset.name}</Text>
                <Text style={styles.presetDescription}>{preset.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 置信度阈值配置 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>置信度阈值</Text>
          <Text style={styles.sectionDescription}>
            控制 AI 在不同置信度下的行为：询问、推测还是直接执行
          </Text>

          {/* 意图识别 - 高置信度阈值 */}
          <View style={styles.settingItem}>
            <View style={styles.settingHeader}>
              <Text style={styles.settingLabel}>意图识别 - 高置信度</Text>
              <Text style={styles.settingValue}>
                {(config.intentRewriterConfidenceThresholds?.high ?? 0.7).toFixed(2)}
              </Text>
            </View>
            <Text style={styles.settingDescription}>
              达到此阈值时直接执行（推荐 0.6-0.8）
            </Text>
            <View style={styles.sliderContainer}>
              <TouchableOpacity
                style={styles.sliderButton}
                onPress={() => {
                  const newValue = Math.max(0.5, (config.intentRewriterConfidenceThresholds?.high ?? 0.7) - 0.05);
                  updateIntentRewriterThresholds({ high: newValue });
                }}
              >
                <Text style={styles.sliderButtonText}>−</Text>
              </TouchableOpacity>
              <View style={styles.sliderTrack} />
              <TouchableOpacity
                style={styles.sliderButton}
                onPress={() => {
                  const newValue = Math.min(1.0, (config.intentRewriterConfidenceThresholds?.high ?? 0.7) + 0.05);
                  updateIntentRewriterThresholds({ high: newValue });
                }}
              >
                <Text style={styles.sliderButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 意图识别 - 低置信度阈值 */}
          <View style={styles.settingItem}>
            <View style={styles.settingHeader}>
              <Text style={styles.settingLabel}>意图识别 - 低置信度</Text>
              <Text style={styles.settingValue}>
                {(config.intentRewriterConfidenceThresholds?.low ?? 0.4).toFixed(2)}
              </Text>
            </View>
            <Text style={styles.settingDescription}>
              低于此阈值时询问用户（推荐 0.3-0.5）
            </Text>
            <View style={styles.sliderContainer}>
              <TouchableOpacity
                style={styles.sliderButton}
                onPress={() => {
                  const newValue = Math.max(0.0, (config.intentRewriterConfidenceThresholds?.low ?? 0.4) - 0.05);
                  updateIntentRewriterThresholds({ low: newValue });
                }}
              >
                <Text style={styles.sliderButtonText}>−</Text>
              </TouchableOpacity>
              <View style={styles.sliderTrack} />
              <TouchableOpacity
                style={styles.sliderButton}
                onPress={() => {
                  const newValue = Math.min(0.5, (config.intentRewriterConfidenceThresholds?.low ?? 0.4) + 0.05);
                  updateIntentRewriterThresholds({ low: newValue });
                }}
              >
                <Text style={styles.sliderButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 反思评估 - 低置信度阈值 */}
          <View style={styles.settingItem}>
            <View style={styles.settingHeader}>
              <Text style={styles.settingLabel}>反思评估 - 低置信度</Text>
              <Text style={styles.settingValue}>
                {(config.reflectorConfidenceThresholds?.low ?? 0.3).toFixed(2)}
              </Text>
            </View>
            <Text style={styles.settingDescription}>
              低于此阈值时建议询问用户（推荐 0.2-0.4）
            </Text>
            <View style={styles.sliderContainer}>
              <TouchableOpacity
                style={styles.sliderButton}
                onPress={() => {
                  const newValue = Math.max(0.0, (config.reflectorConfidenceThresholds?.low ?? 0.3) - 0.05);
                  updateReflectorThresholds({ low: newValue });
                }}
              >
                <Text style={styles.sliderButtonText}>−</Text>
              </TouchableOpacity>
              <View style={styles.sliderTrack} />
              <TouchableOpacity
                style={styles.sliderButton}
                onPress={() => {
                  const newValue = Math.min(0.5, (config.reflectorConfidenceThresholds?.low ?? 0.3) + 0.05);
                  updateReflectorThresholds({ low: newValue });
                }}
              >
                <Text style={styles.sliderButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 说明 */}
          <View style={styles.infoBox}>
            <Icon name="information-circle-outline" size={20} color={Colors.info} />
            <Text style={styles.infoText}>
              阈值越高，AI 越谨慎；阈值越低，AI 越主动。建议先使用默认值。
            </Text>
          </View>
        </View>

        {/* 确认策略 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>确认策略</Text>
          <Text style={styles.sectionDescription}>
            配置哪些操作需要用户确认
          </Text>

          <View style={styles.switchItem}>
            <View style={styles.switchLabel}>
              <Text style={styles.settingLabel}>高风险操作确认</Text>
              <Text style={styles.settingDescription}>删除、批量操作等</Text>
            </View>
            <Switch
              value={config.confirmationPolicy?.confirmHighRisk ?? true}
              onValueChange={(value: boolean) => updateConfirmationPolicy({ confirmHighRisk: value })}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.surface}
            />
          </View>

          <View style={styles.switchItem}>
            <View style={styles.switchLabel}>
              <Text style={styles.settingLabel}>中等风险操作确认</Text>
              <Text style={styles.settingDescription}>修改记录等</Text>
            </View>
            <Switch
              value={config.confirmationPolicy?.confirmMediumRisk ?? false}
              onValueChange={(value: boolean) => updateConfirmationPolicy({ confirmMediumRisk: value })}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.surface}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingHeader}>
              <Text style={styles.settingLabel}>批量操作阈值</Text>
              <Text style={styles.settingValue}>
                {config.confirmationPolicy?.batchThreshold ?? 5} 条
              </Text>
            </View>
            <Text style={styles.settingDescription}>
              超过此数量的批量操作需要确认
            </Text>
            <View style={styles.sliderContainer}>
              <TouchableOpacity
                style={styles.sliderButton}
                onPress={() => {
                  const newValue = Math.max(1, (config.confirmationPolicy?.batchThreshold ?? 5) - 1);
                  updateConfirmationPolicy({ batchThreshold: newValue });
                }}
              >
                <Text style={styles.sliderButtonText}>−</Text>
              </TouchableOpacity>
              <View style={styles.sliderTrack} />
              <TouchableOpacity
                style={styles.sliderButton}
                onPress={() => {
                  const newValue = Math.min(20, (config.confirmationPolicy?.batchThreshold ?? 5) + 1);
                  updateConfirmationPolicy({ batchThreshold: newValue });
                }}
              >
                <Text style={styles.sliderButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 反思模式 - 始终开启 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>反思模式（ReAct）</Text>
            <View style={styles.enabledBadge}>
              <Text style={styles.enabledBadgeText}>已启用</Text>
            </View>
          </View>
          <Text style={styles.sectionDescription}>
            AI 在执行步骤后进行反思和评估，提高准确性
          </Text>

          <View style={styles.radioGroup}>
            <Text style={styles.radioGroupLabel}>反思频率</Text>
            {[
              { value: 'every_step', label: '每步反思', description: '最谨慎，但速度较慢' },
              { value: 'on_error', label: '出错时反思', description: '平衡速度和准确性（推荐）' },
              { value: 'on_milestone', label: '里程碑时反思', description: '关键节点反思（开发中）', disabled: true },
            ].map(option => (
              <TouchableOpacity
                key={option.value}
                style={[styles.radioItem, option.disabled && styles.radioItemDisabled]}
                onPress={() => {
                  if (option.disabled) {
                    Alert.alert('功能开发中', '该功能正在开发中，敬请期待');
                    return;
                  }
                  updateConfig({ reflectionFrequency: option.value as any });
                }}
              >
                <View style={styles.radioCircle}>
                  {config.reflectionFrequency === option.value && (
                    <View style={styles.radioInner} />
                  )}
                </View>
                <View style={styles.radioLabel}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[styles.radioText, option.disabled && styles.radioTextDisabled]}>
                      {option.label}
                    </Text>
                    {option.disabled && (
                      <View style={styles.devBadge}>
                        <Text style={styles.devBadgeText}>开发中</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.radioDescription, option.disabled && styles.radioDescriptionDisabled]}>
                    {option.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 重置按钮 */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetToDefault}
          >
            <Icon name="refresh-outline" size={20} color={Colors.error} />
            <Text style={styles.resetButtonText}>重置为默认配置</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.sm,
    marginLeft: -Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
  },
  saveButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  saveButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: Colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  sectionDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  presetContainer: {
    gap: Spacing.md,
  },
  presetButton: {
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  presetName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  presetDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  settingItem: {
    marginBottom: Spacing.lg,
  },
  settingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  settingLabel: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: Colors.text,
  },
  settingValue: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
  settingDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    lineHeight: 18,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  sliderButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderButtonText: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
  sliderTrack: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.border,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.info + '15',
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.info,
    lineHeight: 20,
  },
  switchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  switchLabel: {
    flex: 1,
    marginRight: Spacing.md,
  },
  radioGroup: {
    marginTop: Spacing.md,
  },
  radioGroupLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  radioLabel: {
    flex: 1,
  },
  radioText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: Colors.text,
    marginBottom: 2,
  },
  radioDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  radioItemDisabled: {
    opacity: 0.5,
  },
  radioTextDisabled: {
    color: Colors.textSecondary,
  },
  radioDescriptionDisabled: {
    color: Colors.textSecondary,
    opacity: 0.7,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  enabledBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  enabledBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    color: Colors.success,
  },
  devBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  devBadgeText: {
    fontSize: 10,
    fontWeight: FontWeights.medium,
    color: Colors.warning,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  resetButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: Colors.error,
  },
});
