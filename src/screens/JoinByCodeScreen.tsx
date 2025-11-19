/**
 * 输入邀请码页面
 * 用户手动输入邀请码加入账本
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
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BorderRadius, Colors, FontSizes, FontWeights, Shadows, Spacing } from '../constants/theme';
import { toast } from '../utils/toast';

export const JoinByCodeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [inviteCode, setInviteCode] = useState('');

  const handleSubmit = () => {
    const code = inviteCode.trim().toUpperCase();
    
    if (!code) {
      toast.info('请输入邀请码');
      return;
    }

    if (code.length !== 12) {
      toast.info('邀请码应为12位字符');
      return;
    }

    // 跳转到接受邀请页面
    (navigation as any).navigate('AcceptInvite', { inviteCode: code });
  };

  const handlePaste = async () => {
    try {
      const text = await Clipboard.getString();
      
      if (text) {
        const code = text.trim().toUpperCase();
        setInviteCode(code);
        
        // 如果粘贴的是12位字符，自动提交
        if (code.length === 12 && /^[A-Z0-9]+$/.test(code)) {
          setTimeout(() => {
            handleSubmit();
          }, 300);
        }
      }
    } catch (error) {
      toast.error('粘贴失败');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* 头部 */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>加入账本</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 图标和标题 */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🔗</Text>
            <Text style={styles.title}>输入邀请码</Text>
            <Text style={styles.subtitle}>输入12位邀请码即可加入共享账本</Text>
          </View>

          {/* 输入框 */}
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>邀请码</Text>
            <TextInput
              style={styles.input}
              value={inviteCode}
              onChangeText={setInviteCode}
              placeholder="请输入12位邀请码"
              placeholderTextColor={Colors.textSecondary}
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect={false}
              maxLength={12}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
            <TouchableOpacity
              style={styles.pasteButton}
              onPress={handlePaste}
              activeOpacity={0.7}
            >
              <Text style={styles.pasteButtonText}>📋 粘贴</Text>
            </TouchableOpacity>
          </View>

          {/* 示例说明 */}
          <View style={styles.exampleCard}>
            <Text style={styles.exampleTitle}>💡 使用说明</Text>
            <View style={styles.exampleList}>
              <View style={styles.exampleItem}>
                <Text style={styles.exampleBullet}>1.</Text>
                <Text style={styles.exampleText}>向账本管理员获取12位邀请码</Text>
              </View>
              <View style={styles.exampleItem}>
                <Text style={styles.exampleBullet}>2.</Text>
                <Text style={styles.exampleText}>在上方输入框中输入或粘贴邀请码</Text>
              </View>
              <View style={styles.exampleItem}>
                <Text style={styles.exampleBullet}>3.</Text>
                <Text style={styles.exampleText}>确认账本信息后即可加入</Text>
              </View>
            </View>
            <View style={styles.exampleDivider} />
            <Text style={styles.exampleCodeLabel}>邀请码示例：</Text>
            <View style={styles.exampleCodeBox}>
              <Text style={styles.exampleCode}>ABC123XYZ789</Text>
            </View>
          </View>

          {/* 提交按钮 */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              !inviteCode.trim() && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!inviteCode.trim()}
            activeOpacity={0.7}
          >
            <Text style={styles.submitButtonText}>下一步</Text>
          </TouchableOpacity>

          {/* 底部提示 */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              💡 提示：邀请码通常由账本创建者或管理员生成和分享
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    ...Shadows.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: FontSizes.xxl,
    color: Colors.text,
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  headerPlaceholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  icon: {
    fontSize: 80,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  inputCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },
  inputLabel: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  pasteButton: {
    backgroundColor: Colors.backgroundSecondary,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  pasteButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
  exampleCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  exampleTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  exampleList: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  exampleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  exampleBullet: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
    width: 24,
  },
  exampleText: {
    fontSize: FontSizes.md,
    color: Colors.text,
    flex: 1,
  },
  exampleDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  exampleCodeLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  exampleCodeBox: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  exampleCode: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.textSecondary,
    letterSpacing: 2,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.surface,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
