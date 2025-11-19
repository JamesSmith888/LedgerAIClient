import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosInstance } from 'axios';

// 定义开发、生产环境的API地址
//const DEV_API_URL = 'http://localhost:3000';
//const DEV_API_URL = 'http://10.18.221.82:9432';
const DEV_API_URL = 'http://localhost:9432';
//const DEV_API_URL = 'http://47.114.96.56:9432';
const PROD_API_URL = 'http://47.114.96.56:9432';

// __DEV__ 是 React Native 内置的全局变量，用于区分开发和生产环境
// Release 构建时 __DEV__ = false, Debug 构建时 __DEV__ = true
export const API_BASE_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;

// 日志函数 - 在生产环境也能看到关键信息
const logInfo = (message: string, ...args: any[]) => {
    console.log(`[LedgerAI] ${message}`, ...args);
};

const logError = (message: string, ...args: any[]) => {
    console.error(`[LedgerAI ERROR] ${message}`, ...args);
};

// 启动时打印环境信息
logInfo('======================');
logInfo('Environment:', __DEV__ ? 'DEVELOPMENT' : 'PRODUCTION');
logInfo('API Base URL:', API_BASE_URL);
logInfo('======================');

// 创建 Axios 实例时的默认配置
logInfo('🔧 Creating axios instance...');
export const apiClient: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000, // 10秒超时
    headers: {
        'Content-Type': 'application/json',
    },
});
logInfo('✅ Axios instance created');

// 请求拦截器
logInfo('🔧 Setting up request interceptor...');
apiClient.interceptors.request.use(
    async (config) => {
        logInfo('🚀 [Interceptor] Request interceptor triggered');

        try {
            // 从本地存储或上下文中获取token（如果有的话）
            logInfo('🔑 [Interceptor] Getting token from AsyncStorage...');
            const token = await AsyncStorage.getItem('token');
            logInfo('🔑 [Interceptor] Token:', token ? 'EXISTS' : 'NONE');

            // 如果有token,添加到请求头中
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
                logInfo('🔑 [Interceptor] Authorization header set');
            }

            // 总是打印请求信息,方便调试
            logInfo('📤 Request:', config.method?.toUpperCase(), config.url);
            logInfo('📤 Full URL:', `${config.baseURL || ''}${config.url || ''}`);
            logInfo('📤 Headers:', JSON.stringify(config.headers));
            logInfo('📤 Data:', JSON.stringify(config.data));

            logInfo('✅ [Interceptor] Request config ready, returning...');
            return config;
        } catch (error) {
            logError('❌ [Interceptor] Error in request interceptor:', error);
            throw error;
        }
    },
    (error) => {
        logError('❌ [Interceptor] Request interceptor error:', error);
        logError('❌ [Interceptor] Error details:', JSON.stringify(error));
        return Promise.reject(error);
    }
);
logInfo('✅ Request interceptor set up');

// 响应拦截器
logInfo('🔧 Setting up response interceptor...');
apiClient.interceptors.response.use(
    (response) => {
        logInfo('🎉 [Interceptor] Response received!');
        // 总是打印响应信息
        logInfo('📥 Response:', response.status, response.config.url);
        logInfo('📥 Response data:', JSON.stringify(response.data).substring(0, 200));

        // 处理后端统一响应格式: { code, message, data }
        if (response.data && typeof response.data === 'object') {
            if ('code' in response.data && 'data' in response.data) {
                // 检查响应码
                if (response.data.code === 200) {
                    logInfo('✅ Success:', response.data.message || 'OK');
                    // 将实际数据提升到 response.data
                    response.data = response.data.data;
                } else {
                    logError('❌ API Error Code:', response.data.code, response.data.message);
                    // 非200状态码，抛出错误
                    const error: any = new Error(response.data.message || 'Request failed');
                    error.code = response.data.code;
                    error.response = response;
                    return Promise.reject(error);
                }
            }
        }

        return response;
    },
    (error) => {
        logError('💥 [Interceptor] Response interceptor caught error!');
        // 详细的错误日志
        logError('❗ API Error:', error.message);
        logError('❗ Error type:', error.constructor.name);
        logError('❗ Error code:', error.code);

        if (error.response) {
            // 服务器返回了错误响应
            logError('❗ Response exists!');
            logError('❗ Response Status:', error.response.status);
            logError('❗ Response Data:', JSON.stringify(error.response.data));
            logError('❗ Response Headers:', JSON.stringify(error.response.headers));
        } else if (error.request) {
            // 请求发出但没有收到响应 - 可能是网络问题
            logError('❗ No Response Received - Network Error!');
            logError('❗ Request type:', typeof error.request);
            logError('❗ Request:', error.request ? 'EXISTS' : 'NULL');
            // 尝试打印更多信息
            try {
                logError('❗ Request details:', JSON.stringify(error.request));
            } catch (e) {
                logError('❗ Cannot stringify request:', e);
            }
        } else {
            // 请求配置出错
            logError('❗ Request Setup Error:', error.message);
            logError('❗ Error stack:', error.stack);
        }

        // 增强错误信息
        if (error.response?.data?.message) {
            error.message = error.response.data.message;
        } else if (!error.response && !error.request) {
            error.message = '网络连接失败,请检查网络设置';
        }

        return Promise.reject(error);
    }
);
logInfo('✅ Response interceptor set up');
logInfo('🎉 API Client configuration completed!');
