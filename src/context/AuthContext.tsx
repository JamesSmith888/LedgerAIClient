import React, { createContext, useContext, useEffect } from 'react';
import { User } from '../types/user';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/authAPI.ts';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: Partial<User>) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [token, setToken] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  // 启动时，检查本地是否有已登录的用户信息
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      const storedUser = await AsyncStorage.getItem('user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Failed to load stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (user: User, token: string) => {
    setUser(user);
    setToken(token);

    // 将用户信息存储到本地
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('user', JSON.stringify(user));
  };

  const logout = async () => {
    setUser(null);
    setToken(null);

    // 清除本地存储的用户信息
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');

    // 调用后端登出接口
    await authAPI.logout();
  };

  const updateUser = async (updatedUser: Partial<User>) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    const newUser = { ...user, ...updatedUser };
    setUser(newUser);

    // 更新本地存储的用户信息
    await AsyncStorage.setItem('user', JSON.stringify(newUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        updateUser,
        isAuthenticated: !!user && !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// 自定义 Hook 以便于使用 AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
