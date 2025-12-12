import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
  PermissionsAndroid,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import { toast } from '../utils/toast';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../api/services/userAPI';
import { API_BASE_URL } from '../api/config';

export const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, updateUser } = useAuth();
  
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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
      // 如果是相对路径，拼接完整路径
      let url = profile.avatarUrl || '';
      if (url && !url.startsWith('http')) {
        url = `${API_BASE_URL}${url}`;
      }
      setAvatarUrl(url);
    } catch (error) {
      console.error('加载用户信息失败:', error);
      toast.error('加载用户信息失败');
    } finally {
      setIsLoading(false);
    }
  };

  const requestAndroidPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          {
            title: '访问相册权限',
            message: '需要访问您的相册以选择图片',
            buttonNeutral: '稍后询问',
            buttonNegative: '拒绝',
            buttonPositive: '允许',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          {
            title: '访问相册权限',
            message: '需要访问您的相册以选择图片',
            buttonNeutral: '稍后询问',
            buttonNegative: '拒绝',
            buttonPositive: '允许',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (err) {
      console.warn('权限请求失败:', err);
      return false;
    }
  };

  const handlePickAvatar = async () => {
    try {
      if (Platform.OS === 'android') {
        const hasPermission = await requestAndroidPermissions();
        if (!hasPermission) {
          Alert.alert('权限被拒绝', '需要相册访问权限才能选择图片');
          return;
        }
      }

      const result: ImagePickerResponse = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 800,
        maxHeight: 800,
        selectionLimit: 1,
        includeBase64: false,
      });

      if (result.didCancel) return;
      if (result.errorCode) {
        Alert.alert('错误', result.errorMessage || '选择图片失败');
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await uploadAvatar(asset);
      }
    } catch (error) {
      console.error('选择图片失败:', error);
      Alert.alert('错误', '选择图片失败');
    }
  };

  const uploadAvatar = async (asset: any) => {
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        type: asset.type,
        name: asset.fileName || 'avatar.jpg',
      } as any);

      const url = await userAPI.uploadAvatar(formData);
      // 如果返回的是相对路径，拼接完整路径
      const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
      setAvatarUrl(fullUrl);
      toast.success('头像上传成功');
    } catch (error) {
      console.error('头像上传失败:', error);
      toast.error('头像上传失败');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      const updatedProfile = await userAPI.updateProfile({
        nickname: nickname.trim() || undefined,
        email: email.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
      });
      
      // 更新 AuthContext 中的用户信息
      await updateUser({
        nickname: updatedProfile.nickname,
        email: updatedProfile.email,
        avatarUrl: updatedProfile.avatarUrl,
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

          {/* 头像 */}
          <View style={styles.section}>
            <Text style={styles.label}>头像</Text>
            
            {/* 头像预览与上传 */}
            <View style={styles.avatarContainer}>
              <TouchableOpacity onPress={handlePickAvatar} style={styles.avatarWrapper}>
                {avatarUrl ? (
                  <Image 
                    source={{ uri: avatarUrl }} 
                    style={styles.avatarImage} 
                    onError={() => console.log('Image load error')}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarPlaceholderText}>🖼️</Text>
                  </View>
                )}
                {isUploading && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator color={Colors.primary} />
                  </View>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.uploadButton}
                onPress={handlePickAvatar}
                disabled={isUploading}
              >
                <Text style={styles.uploadButtonText}>
                  {isUploading ? '上传中...' : '更换头像'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { marginTop: Spacing.md }]}>头像URL (可选)</Text>
            <TextInput
              style={styles.input}
              value={avatarUrl}
              onChangeText={setAvatarUrl}
              placeholder="请输入头像图片URL"
              placeholderTextColor={Colors.textSecondary}
              autoCapitalize="none"
              multiline
            />
            <Text style={styles.hint}>支持上传图片或直接输入图片链接</Text>
          </View>
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

  // 头像区域
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatarWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundSecondary,
  },
  avatarPlaceholderText: {
    fontSize: 40,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
  },
  uploadButtonText: {
    color: Colors.surface,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },
});
