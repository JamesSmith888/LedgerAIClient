import React, { useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { toast } from '../utils/toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import {
  BorderRadius,
  Colors,
  FontSizes,
  Shadows,
  Spacing,
} from '../constants/theme';
import { authAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { OAuthButtons } from '../components/auth/OAuthButtons';
import { loginWithAlipay } from '../utils/alipay';

export const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 表单验证
  const [errors, setErrors] = useState<{
    username?: string;
    password?: string;
  }>({});

  // 验证函数
  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    if (!username.trim()) {
      newErrors.username = '请输入用户名';
    }

    if (!password) {
      newErrors.password = '请输入密码';
    } else if (password.length < 6) {
      newErrors.password = '密码至少6位';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 处理登录
  const handleLogin = async () => {
    if (!validate()) return;

    try {
      setIsLoading(true);

      const response = await authAPI.login({
        username: username.trim(),
        password,
      });

      console.log('登录响应:', response);

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

      console.log('🔍 [LoginScreen] 构建的用户对象:', user);
      console.log('🔍 [LoginScreen] 用户角色:', user.role);

      // 保存登录状态
      const token = response.token || 'temp-token'; // 如果没有token，使用临时值
      await login(user, token);

      toast.success(`欢迎回来，${response.username}！`);
    } catch (error: any) {
      console.error('登录失败:', error);

      let errorMessage = '登录失败,请稍后重试';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      toast.error(errorMessage, '登录失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 跳转到注册页面
  const goToRegister = () => {
    navigation.navigate('Register');
  };

  // 支付宝登录
  const handleAlipayLogin = async () => {
    try {
      setIsLoading(true);

      // 1. 调用支付宝 SDK 获取 auth_code
      const authCode = await loginWithAlipay();

      // 2. 发送到后端
      const response = await authAPI.oauthLogin({
        oauthType: 'ALIPAY',
        code: authCode,
      });

      console.log('支付宝登录响应:', response);

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
        createdAt: response.createdAt,
      };

      // 4. 保存登录状态
      const token = response.token || 'temp-token';
      await login(user, token);

      toast.success(`欢迎回来，${response.username}！`);
    } catch (error: any) {
      console.error('支付宝登录失败:', error);

      // 用户取消不显示错误提示
      if (error.message === 'USER_CANCEL') {
        return;
      }

      let errorMessage = '支付宝登录失败';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      toast.error(errorMessage, '登录失败');
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
          <Text style={styles.logoEmoji}>💰</Text>
          <Text style={styles.title}>LedgerAI</Text>
          <Text style={styles.subtitle}>智能记账助手</Text>
        </View>

        {/* 登录表单卡片 */}
        <View style={styles.card}>
          <Input
            label="用户名"
            placeholder="请输入用户名"
            value={username}
            onChangeText={text => {
              setUsername(text);
              setErrors({ ...errors, username: undefined });
            }}
            error={errors.username}
            autoCapitalize="none"
          />

          <Input
            label="密码"
            placeholder="请输入密码"
            value={password}
            onChangeText={text => {
              setPassword(text);
              setErrors({ ...errors, password: undefined });
            }}
            error={errors.password}
            secureTextEntry
          />

          <Button
            title="登录"
            onPress={handleLogin}
            loading={isLoading}
            style={styles.loginButton}
          />
        </View>

        {/* 第三方登录 */}
        <OAuthButtons
          onAlipay={handleAlipayLogin}
          loading={isLoading}
        />

        {/* 底部链接 */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>还没有账号？</Text>
          <TouchableOpacity onPress={goToRegister}>
            <Text style={styles.linkText}>立即注册</Text>
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
  loginButton: {
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
