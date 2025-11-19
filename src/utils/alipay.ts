/**
 * 支付宝登录工具类
 * 
 * 注意：实际使用需要安装依赖：
 * npm install @uiw/react-native-alipay
 * 或
 * yarn add @uiw/react-native-alipay
 */

// 支付宝配置（生产环境应从环境变量读取）
const ALIPAY_CONFIG = {
  // 支付宝应用ID（需要在支付宝开放平台创建应用）
  appId: '2021001234567890',
  
  // PID（合作伙伴ID）
  pid: '2088xxxxxxxxxxxxx',
  
  // 应用名称
  appName: 'LedgerAI',
};

/**
 * 支付宝授权结果
 */
export interface AlipayAuthResult {
  resultStatus: string;  // 9000-成功, 6001-用户取消, 4000-失败
  result: string;        // 包含 auth_code 的结果字符串
  memo?: string;         // 错误描述
}

/**
 * 解析授权结果中的 auth_code
 */
export const parseAuthCode = (resultStr: string): string | null => {
  try {
    // 支付宝返回格式: auth_code=xxx&xxx=xxx
    const match = resultStr.match(/auth_code=([^&]+)/);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
    return null;
  } catch (error) {
    console.error('解析 auth_code 失败:', error);
    return null;
  }
};

/**
 * 支付宝登录
 * 
 * @returns auth_code 用于后端换取用户信息
 */
export const loginWithAlipay = async (): Promise<string> => {
  try {
    // 注意：实际使用时需要安装 @uiw/react-native-alipay
    // 这里提供模拟实现和真实实现两种方式
    
    // === 方式1: 真实实现（需要安装SDK）===
    // import Alipay from '@uiw/react-native-alipay';
    
    // 构造授权信息串（需要在后端生成并签名）
    // const authInfo = await getAuthInfoFromBackend();
    
    // // 调用支付宝SDK
    // const result: AlipayAuthResult = await Alipay.authWithInfo(authInfo);
    
    // if (result.resultStatus === '9000') {
    //   const authCode = parseAuthCode(result.result);
    //   if (!authCode) {
    //     throw new Error('无法解析授权码');
    //   }
    //   return authCode;
    // } else if (result.resultStatus === '6001') {
    //   throw new Error('USER_CANCEL'); // 特殊标记，表示用户取消
    // } else {
    //   throw new Error(result.memo || '支付宝授权失败');
    // }
    
    // === 方式2: 模拟实现（用于开发测试）===
    console.log('📱 模拟支付宝登录流程...');
    console.log('⚠️  实际使用需要安装 @uiw/react-native-alipay 并配置原生代码');
    
    // 模拟异步操作
    await new Promise<void>(resolve => setTimeout(() => resolve(), 1000));
    
    // 返回模拟的 auth_code
    return `mock_auth_code_${Date.now()}`;
    
  } catch (error: any) {
    console.error('支付宝登录失败:', error);
    throw error;
  }
};

/**
 * 从后端获取签名后的授权信息串
 * 实际使用时应该调用后端接口
 */
const getAuthInfoFromBackend = async (): Promise<string> => {
  // TODO: 调用后端接口获取签名后的 authInfo
  // const response = await fetch('https://your-backend/oauth/alipay/auth-info');
  // const { authInfo } = await response.json();
  // return authInfo;
  
  // 临时方案：前端拼接（不安全，生产环境必须在后端签名）
  const authInfo = `apiname=com.alipay.account.auth` +
    `&app_id=${ALIPAY_CONFIG.appId}` +
    `&app_name=${ALIPAY_CONFIG.appName}` +
    `&auth_type=AUTHACCOUNT` +
    `&biz_type=openservice` +
    `&pid=${ALIPAY_CONFIG.pid}` +
    `&product_id=APP_FAST_LOGIN` +
    `&scope=kuaijie` +
    `&sign_type=RSA2`;
  
  return authInfo;
};

/**
 * 检查是否安装了支付宝 APP
 */
export const isAlipayInstalled = async (): Promise<boolean> => {
  try {
    // 实际实现需要使用 Linking.canOpenURL
    // import { Linking } from 'react-native';
    // return await Linking.canOpenURL('alipay://');
    
    // 模拟返回
    return true;
  } catch (error) {
    return false;
  }
};
