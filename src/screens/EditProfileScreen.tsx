/**
 * 编辑用户信息页面
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { toast } from '../utils/toast';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../api/services/userAPI';

export const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 加载用户信息
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setIsLoading(true);
      const profile = await userAPI.getProfile();
      setNickname(profile.nickname || '');
      setEmail(profile.email || '');
      setAvatarUrl(profile.avatarUrl || '');
    } catch (error) {
      console.error('加载用户信息失败:', error);
      toast.error('加载用户信息失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      await userAPI.updateProfile({
        nickname: nickname.trim() || undefined,
        email: email.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
      });
      
      toast.success('保存成功');
      navigation.goBack();
    } catch (error: any) {
      console.error('保存失败:', error);
      toast.error(error?.message || '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* 头部 */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>编辑个人信息</Text>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Text style={styles.saveButtonText}>保存</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* 用户名（只读） */}
          <View style={styles.section}>
            <Text style={styles.label}>用户名</Text>
            <View style={styles.readOnlyInput}>
              <Text style={styles.readOnlyText}>{user?.username || '未知'}</Text>
            </View>
            <Text style={styles.hint}>用户名不可修改</Text>
          </View>

          {/* 昵称 */}
          <View style={styles.section}>
            <Text style={styles.label}>昵称</Text>
            <TextInput
              style={styles.input}
              value={nickname}
              onChangeText={setNickname}
              placeholder="请输入昵称"
              placeholderTextColor={Colors.textSecondary}
              maxLength={50}
            />
            <Text style={styles.hint}>显示在账本中的名称</Text>
          </View>

          {/* 邮箱 */}
          <View style={styles.section}>
            <Text style={styles.label}>邮箱</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="请输入邮箱"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.hint}>用于找回密码和接收通知</Text>
          </View>

          {/* 头像URL */}
          <View style={styles.section}>
            <Text style={styles.label}>头像URL</Text>
            <TextInput
              style={styles.input}
              value={avatarUrl}
              onChangeText={setAvatarUrl}
              placeholder="请输入头像图片URL"
              placeholderTextColor={Colors.textSecondary}
              autoCapitalize="none"
              multiline
            />
            <Text style={styles.hint}>输入图片链接地址</Text>
          </View>

          {/* 预览区域 */}
          {avatarUrl && (
            <View style={styles.previewSection}>
              <Text style={styles.label}>头像预览</Text>
              <View style={styles.avatarPreview}>
                {/* 这里可以使用 Image 组件显示头像预览 */}
                <Text style={styles.avatarPlaceholder}>🖼️</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    width: 60,
  },
  backButtonText: {
    fontSize: FontSizes.xxl,
    color: Colors.text,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    padding: Spacing.xs,
    width: 60,
    alignItems: 'flex-end',
  },
  saveButtonText: {
    fontSize: FontSizes.md,
    color: Colors.primary,
    fontWeight: FontWeights.semibold,
  },

  // 滚动区域
  scrollView: {
    flex: 1,
    padding: Spacing.lg,
  },

  // 表单区域
  section: {
    marginBottom: Spacing.xl,
  },
  label: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  readOnlyInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  readOnlyText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  hint: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },

  // 预览区域
  previewSection: {
    marginBottom: Spacing.xl,
  },
  avatarPreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarPlaceholder: {
    fontSize: 40,
  },
});
