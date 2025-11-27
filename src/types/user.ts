// 用户类型定义
export interface User {
    _id?: string | number;  // 兼容不同的 ID 格式
    userId?: number;  // 服务端返回的是 userId
    id?: string;      // 兼容旧代码
    username?: string;
    nickname?: string; // 用户昵称
    name?: string;    // 用户名称（显示用）
    email?: string;
    avatarUrl?: string; // 头像URL
    avatar?: string;  // 兼容旧代码
    role?: string;    // 用户角色：USER-普通用户，ADMIN-管理员
    createdAt?: string;
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
    username?: string;
    nickname?: string; // 用户昵称
    name?: string;    // 用户名称（显示用）
    email?: string;
    avatarUrl?: string;
    avatar?: string;
    role?: string;    // 用户角色：USER-普通用户，ADMIN-管理员
    createdAt?: string;
}

// 兼容旧的响应格式
export interface AuthResponseLegacy {
    token: string;
    user: User;
}