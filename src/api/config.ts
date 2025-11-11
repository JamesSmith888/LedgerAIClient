import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosInstance } from 'axios';

// 定义开发、生产环境的API地址
//const DEV_API_URL = 'http://localhost:3000';
//const DEV_API_URL = 'http://10.18.221.82:9432';
const DEV_API_URL = 'http://localhost:9432';
const PROD_API_URL = 'https://api.example.com';

// __DEV__ 是 React Native 内置的全局变量，用于区分开发和生产环境
export const API_BASE_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;

// 创建 Axios 实例时的默认配置
export const apiClient: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000, // 10秒超时
    headers: {
        'Content-Type': 'application/json',
    },
});

// 请求拦截器
apiClient.interceptors.request.use(
    async (config) => {
        // 从本地存储或上下文中获取token（如果有的话）
        const token = await AsyncStorage.getItem('token');
        // 如果有token，添加到请求头中
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        if (__DEV__) {
            console.log('📤 Request:', config.method?.toUpperCase(), config.url);
        }
        return config;

    },
    (error) => {
        return Promise.reject(error);
    }

);

// 响应拦截器
apiClient.interceptors.response.use(
    (response) => {
        if (__DEV__) {
            console.log('📥 Response:', response.data);
        }

        // 处理后端统一响应格式: { code, message, data }
        if (response.data && typeof response.data === 'object') {
            if ('code' in response.data && 'data' in response.data) {
                // 检查响应码
                if (response.data.code === 200) {
                    // 将实际数据提升到 response.data
                    response.data = response.data.data;
                } else {
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
        console.log('❗ API Error:', error);

        // 增强错误信息
        if (error.response?.data?.message) {
            error.message = error.response.data.message;
        }

        return Promise.reject(error);
    }
);
