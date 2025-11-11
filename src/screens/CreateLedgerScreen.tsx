/**
 * 创建账本页面
 */
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Switch,
} from 'react-native';
import { toast, showConfirm } from '../utils/toast';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Card } from '../components/common';
import {
  BorderRadius,
  Colors,
  FontSizes,
  FontWeights,
  Shadows,
  Spacing,
} from '../constants/theme';
import { useLedger } from '../context/LedgerContext';
import { ledgerAPI } from '../api/services';

type LedgerTypeParam = 'personal' | 'shared';

export const CreateLedgerScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as { type?: LedgerTypeParam } | undefined;
  const { refreshLedgers } = useLedger();

  const ledgerType = params?.type || 'personal';
  const isShared = ledgerType === 'shared';

  // 表单状态
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [maxMembers, setMaxMembers] = useState('10');
  const [isPublic, setIsPublic] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 处理创建
  const handleCreate = async () => {
    // 验证
    if (!name.trim()) {
      toast.info('请输入账本名称');
      return;
    }

    if (name.length > 50) {
      toast.info('账本名称不能超过50个字符');
      return;
    }

    if (description.length > 200) {
      toast.info('账本描述不能超过200个字符');
      return;
    }

    try {
      setIsLoading(true);

      const data = {
        name: name.trim(),
        description: description.trim() || undefined,
        maxMembers: isShared ? parseInt(maxMembers) : undefined,
        isPublic: isShared ? isPublic : undefined,
      };

      if (isShared) {
        await ledgerAPI.createShared(data);
      } else {
        await ledgerAPI.create(data);
      }

      await refreshLedgers();
      toast.success('账本创建成功');
      setTimeout(() => navigation.goBack(), 500);
    } catch (error: any) {
      console.error('创建账本失败:', error);
      let errorMessage = '创建失败，请稍后重试';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      toast.error(errorMessage, '创建失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* 头部 */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            创建{isShared ? '共享' : '个人'}账本
          </Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 账本类型提示 */}
          <Card style={styles.typeCard}>
            <View style={styles.typeIconContainer}>
              <Text style={styles.typeIcon}>
                {isShared ? '👨‍👩‍👧‍👦' : '📖'}
              </Text>
            </View>
            <Text style={styles.typeTitle}>
              {isShared ? '共享账本' : '个人账本'}
            </Text>
            <Text style={styles.typeDescription}>
              {isShared
                ? '邀请他人共同记账，适合家庭、情侣、室友等场景'
                : '仅自己可见，适合个人日常理财记录'}
            </Text>
          </Card>

          {/* 表单卡片 */}
          <Card style={styles.formCard}>
            {/* 账本名称 */}
            <View style={styles.formItem}>
              <Text style={styles.label}>
                账本名称 <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="例如：日常开销、家庭账本"
                placeholderTextColor={Colors.textLight}
                value={name}
                onChangeText={setName}
                maxLength={50}
              />
              <Text style={styles.hint}>{name.length}/50</Text>
            </View>

            {/* 账本描述 */}
            <View style={styles.formItem}>
              <Text style={styles.label}>账本描述（可选）</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="添加账本说明..."
                placeholderTextColor={Colors.textLight}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                maxLength={200}
              />
              <Text style={styles.hint}>{description.length}/200</Text>
            </View>

            {/* 共享账本专属设置 */}
            {isShared && (
              <>
                {/* 最大成员数 */}
                <View style={styles.formItem}>
                  <Text style={styles.label}>最大成员数</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="10"
                    placeholderTextColor={Colors.textLight}
                    value={maxMembers}
                    onChangeText={setMaxMembers}
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                  <Text style={styles.hint}>
                    建议设置为2-50人，留空表示不限制
                  </Text>
                </View>

                {/* 是否公开 */}
                <View style={styles.formItem}>
                  <View style={styles.switchRow}>
                    <View style={styles.switchLabel}>
                      <Text style={styles.label}>公开账本</Text>
                      <Text style={styles.hint}>
                        公开后其他用户可以搜索并申请加入
                      </Text>
                    </View>
                    <Switch
                      value={isPublic}
                      onValueChange={setIsPublic}
                      trackColor={{
                        false: Colors.border,
                        true: Colors.primary + '80',
                      }}
                      thumbColor={isPublic ? Colors.primary : Colors.surface}
                    />
                  </View>
                </View>
              </>
            )}
          </Card>

          {/* 底部占位 */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* 底部按钮 */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.createButton, isLoading && styles.createButtonDisabled]}
            onPress={handleCreate}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            <Text style={styles.createButtonText}>
              {isLoading ? '创建中...' : '创建账本'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },

  // 头部
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  backButton: {
    padding: Spacing.xs,
  },
  backButtonText: {
    fontSize: FontSizes.xxl,
    color: Colors.text,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  headerRight: {
    width: 40,
  },

  // 滚动区域
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },

  // 类型卡片
  typeCard: {
    alignItems: 'center',
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  typeIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  typeIcon: {
    fontSize: 40,
  },
  typeTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  typeDescription: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // 表单卡片
  formCard: {
    padding: Spacing.lg,
  },
  formItem: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  required: {
    color: Colors.expense,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: Spacing.sm,
  },
  hint: {
    fontSize: FontSizes.sm,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    flex: 1,
    marginRight: Spacing.md,
  },

  // 底部按钮
  bottomBar: {
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  createButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    ...Shadows.md,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: Colors.surface,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
  },
});
