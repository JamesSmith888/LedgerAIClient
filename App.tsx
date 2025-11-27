/**
 * LedgerAI Client App
 * React Native 应用入口
 *
 * @format
 */
// Polyfills for LangChain compatibility
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { BottomTabNavigator } from './src/navigation/BottomTabNavigator';
import {
  AddTransactionScreen,
  LoginScreen,
  RegisterScreen,
  LedgerManagementScreen,
  LedgerDetailScreen,
  CreateLedgerScreen,
  PaymentMethodManagementScreen,
  CategoryManagementScreen,
  TemplateManagementScreen,
  AcceptInviteScreen,
  JoinByCodeScreen,
  FeedbackScreen,
  FeedbackDetailScreen,
  SubmitFeedbackScreen,
  SettingsScreen,
  DataExportScreen,
} from './src/screens';
import { InviteMemberScreen } from './src/screens/InviteMemberScreen';
import { EditProfileScreen } from './src/screens/EditProfileScreen';
import { ActivityIndicator, StatusBar, View } from 'react-native';
import { Colors } from './src/constants/theme';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
// 需要引入 Stack Navigator 而不是 Tab Navigator
import { createStackNavigator } from '@react-navigation/stack';
import { CategoryProvider } from './src/context/CategoryContext';
import { opacity } from 'react-native-reanimated/lib/typescript/Colors';
import { LedgerProvider } from './src/context/LedgerContext';
import { PaymentMethodProvider } from './src/context/PaymentMethodContext';
import { TemplateProvider } from './src/context/TemplateContext';
import Toast from 'react-native-toast-message';
import { NetworkDebugger } from './src/components/NetworkDebugger';

// 创建专门的认证导航栈
const AuthStack = createStackNavigator();

// 认证相关的导航
const AuthNavigator = () => {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen}></AuthStack.Screen>
      <AuthStack.Screen name="Register" component={RegisterScreen}></AuthStack.Screen>
    </AuthStack.Navigator>
  );
};

// 创建主应用的 Stack Navigator
const MainStack = createStackNavigator();

// 主应用的 Stack Navigator（已登录后）
const MainNavigator = () => {
  return (
    <MainStack.Navigator screenOptions={{
      headerShown: false,
      // 设置全局转场动画等选项
      cardStyleInterpolator: ({ current, layouts }) => ({
        cardStyle: {
          opacity: current.progress,
        },
      }),
    }}>
      {/* 底部标签导航作为主页面 */}
      <MainStack.Screen name="MainTabs" component={BottomTabNavigator} />

      {/* 全屏页面 - 记账相关 */}
      <MainStack.Screen
        name="AddTransaction"
        component={AddTransactionScreen}
        options={{
          presentation: 'modal'
        }}
      />

      {/* 全屏页面 - 账本相关 */}
      <MainStack.Screen
        name="LedgerManagement"
        component={LedgerManagementScreen}
      />
      <MainStack.Screen
        name="LedgerDetail"
        component={LedgerDetailScreen}
      />
      <MainStack.Screen
        name="CreateLedger"
        component={CreateLedgerScreen}
      />
      <MainStack.Screen
        name="InviteMember"
        component={InviteMemberScreen}
      />
      <MainStack.Screen
        name="AcceptInvite"
        component={AcceptInviteScreen}
      />
      <MainStack.Screen
        name="JoinByCode"
        component={JoinByCodeScreen}
      />

      {/* 全屏页面 - 支付方式相关 */}
      <MainStack.Screen
        name="PaymentMethodManagement"
        component={PaymentMethodManagementScreen}
      />

      {/* 全屏页面 - 分类相关 */}
      <MainStack.Screen
        name="CategoryManagement"
        component={CategoryManagementScreen}
      />

      {/* 全屏页面 - 模板相关 */}
      <MainStack.Screen
        name="TemplateManagement"
        component={TemplateManagementScreen}
      />

      {/* 全屏页面 - 用户相关 */}
      <MainStack.Screen
        name="EditProfile"
        component={EditProfileScreen}
      />

      {/* 全屏页面 - 反馈相关 */}
      <MainStack.Screen
        name="Feedback"
        component={FeedbackScreen}
      />
      <MainStack.Screen
        name="FeedbackDetail"
        component={FeedbackDetailScreen}
      />
      <MainStack.Screen
        name="SubmitFeedback"
        component={SubmitFeedbackScreen}
      />

      {/* 全屏页面 - 设置相关 */}
      <MainStack.Screen
        name="Settings"
        component={SettingsScreen}
      />
      <MainStack.Screen
        name="DataExport"
        component={DataExportScreen}
      />

      {/* 其他全屏页面 */}
    </MainStack.Navigator>
  );
};

// 根导航
const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // 正在加载认证状态
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // 根据认证状态渲染不同的导航
  return isAuthenticated ? <MainNavigator /> : <AuthNavigator />;
};

function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LedgerProvider>
          <CategoryProvider>
            <PaymentMethodProvider>
              <TemplateProvider>
                <NavigationContainer>
                  <StatusBar barStyle="dark-content" backgroundColor="#F2F2F7" />
                  <AppNavigator />
                  {/* 网络调试器 - 点击右下角🐛图标查看 */}
                  {/*<NetworkDebugger />*/}
                </NavigationContainer>
              </TemplateProvider>
            </PaymentMethodProvider>
          </CategoryProvider>
        </LedgerProvider>
      </AuthProvider>
      <Toast />
    </SafeAreaProvider>
  );
}

export default App;
