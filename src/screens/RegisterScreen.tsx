import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { toast } from '../utils/toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../constants/theme';
import { authAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { OAuthButtons } from '../components/auth/OAuthButtons';
import { loginWithAlipay } from '../utils/alipay';

export const RegisterScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

const [username, setUsername] = useState('');
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');
const [isLoading, setIsLoading] = useState(false);

const [errors, setErrors] = useState<{
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}>({});

// 邮箱验证
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// 表单验证
const validate = (): boolean => {
  const newErrors: typeof errors = {};

  if (!username.trim()) {
    newErrors.username = '请输入用户名';
  } else if (username.length < 3) {
    newErrors.username = '用户名至少3个字符';
  }

  if (!email.trim()) {
    newErrors.email = '请输入邮箱';
  } else if (!validateEmail(email)) {
    newErrors.email = '邮箱格式不正确';
  }

  if (!password) {
    newErrors.password = '请输入密码';
  } else if (password.length < 6) {
    newErrors.password = '密码至少6位';
  }

  if (!confirmPassword) {
    newErrors.confirmPassword = '请确认密码';
  } else if (password !== confirmPassword) {
    newErrors.confirmPassword = '两次密码不一致';
  }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

// 处理注册
const handleRegister = async () => {
  if (!validate()) return;

  try {
    setIsLoading(true);

    const response = await authAPI.register({
      username: username.trim(),
      email: email.trim(),
      password,
    });

    console.log('注册响应:', response);

    // 构建符合 User 类型的用户对象
    const user = {
      _id: response.userId || response.username,
      userId: response.userId,
      username: response.username,
      nickname: response.nickname, // 添加昵称
      name: response.nickname || response.username, // 显示用名称优先使用昵称
      email: response.email,
      avatarUrl: response.avatarUrl,
      avatar: response.avatarUrl,
      role: response.role, // 添加用户角色
      createdAt: response.createdAt,
    };

    // 注册成功后自动登录
    // 注意：如果后端没有返回token，需要提示用户去登录
    if (response.token) {
      await login(user, response.token);
      toast.success(`欢迎加入，${response.username}！`, '注册成功');
    } else {
      // 没有token，提示用户去登录
      toast.success('账号创建成功！请使用您的账号密码登录', '注册成功');
      setTimeout(() => navigation.goBack(), 1500);
    }

  } catch (error: any) {
    console.error('注册失败:', error);

    let errorMessage = '注册失败，请稍后重试';
    if (error.message) {
      errorMessage = error.message;
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    }

    toast.error(errorMessage, '注册失败');
  } finally {
    setIsLoading(false);
  }
};

// 返回登录页面
const goToLogin = () => {
  navigation.goBack();
};

// 支付宝快捷注册/登录
const handleAlipayRegister = async () => {
  try {
    setIsLoading(true);

    // 1. 调用支付宝 SDK 获取 auth_code
    const authCode = await loginWithAlipay();

    // 2. 发送到后端（使用 OAuth 登录接口，后端会自动注册）
    const response = await authAPI.oauthLogin({
      oauthType: 'ALIPAY',
      code: authCode,
    });

    console.log('支付宝注册响应:', response);

    // 3. 构建用户对象
    const user = {
      _id: response.userId || response.username,
      userId: response.userId,
      username: response.username,
      nickname: response.nickname,
      name: response.nickname || response.username,
      email: response.email,
      avatarUrl: response.avatarUrl,
      avatar: response.avatarUrl,
      role: response.role, // 添加用户角色
      createdAt: response.createdAt,
    };

    // 4. 自动登录
    const token = response.token || 'temp-token';
    await login(user, token);

    toast.success(`欢迎加入，${response.username}！`, '注册成功');
  } catch (error: any) {
    console.error('支付宝注册失败:', error);

    // 用户取消不显示错误提示
    if (error.message === 'USER_CANCEL') {
      return;
    }

    let errorMessage = '支付宝注册失败';
    if (error.message) {
      errorMessage = error.message;
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    }

    toast.error(errorMessage, '注册失败');
  } finally {
    setIsLoading(false);
  }
};

return (
  <KeyboardAwareScrollView
    style={styles.container}
    contentContainerStyle={[
      styles.scrollContent,
      { paddingTop: insets.top + Spacing.xl },
    ]}
    keyboardShouldPersistTaps="handled"
    bottomOffset={20}
  >
    {/* Logo区域 */}
      <View style={styles.logoContainer}>
        <Text style={styles.logoEmoji}>✨</Text>
        <Text style={styles.title}>创建账号</Text>
        <Text style={styles.subtitle}>开启智能记账之旅</Text>
      </View>

      {/* 注册表单卡片 */}
      <View style={styles.card}>
        <Input
          label="用户名"
          placeholder="至少3个字符"
          value={username}
          onChangeText={(text) => {
            setUsername(text);
            setErrors({ ...errors, username: undefined });
          }}
          error={errors.username}
          autoCapitalize="none"
        />

        <Input
          label="邮箱"
          placeholder="your@email.com"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setErrors({ ...errors, email: undefined });
          }}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Input
          label="密码"
          placeholder="至少6位"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setErrors({ ...errors, password: undefined });
          }}
          error={errors.password}
          secureTextEntry
        />

        <Input
          label="确认密码"
          placeholder="再次输入密码"
          value={confirmPassword}
          onChangeText={(text) => {
            setConfirmPassword(text);
            setErrors({ ...errors, confirmPassword: undefined });
          }}
          error={errors.confirmPassword}
          secureTextEntry
        />

        <Button
          title="注册"
          onPress={handleRegister}
          loading={isLoading}
          style={styles.registerButton}
        />
      </View>

      {/* 第三方快捷注册 */}
      <OAuthButtons
        onAlipay={handleAlipayRegister}
        loading={isLoading}
      />

      {/* 底部链接 */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>已有账号？</Text>
        <TouchableOpacity onPress={goToLogin}>
          <Text style={styles.linkText}>立即登录</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAwareScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
    marginTop: Spacing.xl,
  },
  logoEmoji: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSizes.xxxl,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.md,
  },
  registerButton: {
    marginTop: Spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  footerText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginRight: Spacing.xs,
  },
  linkText: {
    fontSize: FontSizes.md,
    color: Colors.primary,
    fontWeight: '600',
  },
});
