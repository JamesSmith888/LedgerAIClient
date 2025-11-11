// 用户类型定义
export interface User {
    userId?: number;  // 服务端返回的是 userId
    id?: string;      // 兼容旧代码
    username: string;
    email: string;
    createdAt: string;
}

// 登录请求参数
export interface LoginRequest {
    username: string;
    password: string;
}

// 注册请求参数
export interface RegisterRequest {
    username: string;
    email: string;
    password: string;
}

// 认证响应数据
export interface AuthResponse {
    token?: string;  // token可能不存在
    userId?: number;
    username: string;
    email: string;
    createdAt: string;
}

// 兼容旧的响应格式
export interface AuthResponseLegacy {
    token: string;
    user: User;
}