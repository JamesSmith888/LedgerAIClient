/**
 * 提交反馈页面
 * 用户可以提交需求、优化建议或BUG报告
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows, FontWeights } from '../constants/theme';
import { toast } from '../utils/toast';
import { feedbackAPI } from '../api/services/feedbackAPI';
import { Icon, FeatherIcons } from '../components/common';

type FeedbackType = '需求' | '优化' | 'BUG';

const FEEDBACK_TYPES: { type: FeedbackType; icon: string; description: string }[] = [
  { type: '需求', icon: '💡', description: '提出新功能需求' },
  { type: '优化', icon: '⚡', description: '改进现有功能' },
  { type: 'BUG', icon: '🐛', description: '报告程序错误' },
];

export const SubmitFeedbackScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [selectedType, setSelectedType] = useState<FeedbackType>('需求');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 提交反馈
  const handleSubmit = async () => {
    // 验证
    if (!title.trim()) {
      toast.info('请输入标题');
      return;
    }

    if (title.trim().length > 200) {
      toast.info('标题不能超过200个字符');
      return;
    }

    if (description.trim().length > 5000) {
      toast.info('描述不能超过5000个字符');
      return;
    }

    try {
      setIsSubmitting(true);
      await feedbackAPI.submit({
        type: selectedType,
        title: title.trim(),
        description: description.trim(),
      });
      toast.success('反馈提交成功');
      navigation.goBack();
    } catch (error) {
      console.error('提交反馈失败:', error);
      toast.error('提交失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* 头部导航 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>提交反馈</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* 反馈类型选择 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>反馈类型</Text>
            <View style={styles.typeContainer}>
              {FEEDBACK_TYPES.map(item => (
                <TouchableOpacity
                  key={item.type}
                  style={[
                    styles.typeButton,
                    selectedType === item.type && styles.typeButtonActive,
                  ]}
                  onPress={() => setSelectedType(item.type)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.typeIcon}>{item.icon}</Text>
                  <Text
                    style={[
                      styles.typeText,
                      selectedType === item.type && styles.typeTextActive,
                    ]}
                  >
                    {item.type}
                  </Text>
                  <Text
                    style={[
                      styles.typeDescription,
                      selectedType === item.type && styles.typeDescriptionActive,
                    ]}
                  >
                    {item.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 标题输入 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              标题 <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.titleInput}
              placeholder="请简要描述您的反馈"
              placeholderTextColor={Colors.textLight}
              value={title}
              onChangeText={setTitle}
              maxLength={200}
            />
            <Text style={styles.charCount}>{title.length}/200</Text>
          </View>

          {/* 详细描述输入 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>详细描述</Text>
            <TextInput
              style={styles.descriptionInput}
              placeholder="请详细描述您的反馈内容..."
              placeholderTextColor={Colors.textLight}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
              maxLength={5000}
            />
            <Text style={styles.charCount}>{description.length}/5000</Text>
          </View>

          {/* 提示信息 */}
          <View style={styles.tipContainer}>
            <Icon
              type="feather"
              name={FeatherIcons.info}
              size={16}
              color={Colors.primary}
            />
            <Text style={styles.tipText}>
              我们会认真处理您的每一条反馈，并及时回复处理结果
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* 提交按钮 */}
      <View style={[styles.footer, { paddingBottom: insets.bottom || Spacing.md }]}>
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color={Colors.surface} size="small" />
          ) : (
            <Text style={styles.submitButtonText}>提交反馈</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  content: {
    padding: Spacing.md,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  required: {
    color: Colors.error,
  },
  typeContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  typeButton: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadows.sm,
  },
  typeButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  typeIcon: {
    fontSize: 32,
    marginBottom: Spacing.xs,
  },
  typeText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: 2,
  },
  typeTextActive: {
    color: Colors.primary,
  },
  typeDescription: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  typeDescriptionActive: {
    color: Colors.primary,
  },
  titleInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  descriptionInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 150,
  },
  charCount: {
    fontSize: FontSizes.xs,
    color: Colors.textLight,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.primary + '10',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  tipText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    lineHeight: 18,
  },
  footer: {
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    ...Shadows.md,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.surface,
  },
});
