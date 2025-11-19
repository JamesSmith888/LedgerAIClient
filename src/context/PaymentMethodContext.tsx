import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { PaymentMethod } from '../types/paymentMethod';
import { paymentMethodAPI } from '../api/services';
import { useAuth } from './AuthContext';

interface PaymentMethodContextType {
  paymentMethods: PaymentMethod[];
  defaultPaymentMethod: PaymentMethod | null;
  isLoading: boolean;
  refreshPaymentMethods: () => Promise<void>;
  setDefaultPaymentMethod: (id: number) => Promise<void>;
}

const PaymentMethodContext = createContext<PaymentMethodContextType | undefined>(undefined);

export const PaymentMethodProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ========== 获取认证状态 ==========
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 加载支付方式
  const refreshPaymentMethods = useCallback(async () => {
    try {
      setIsLoading(true);
      const methods = await paymentMethodAPI.getAll();
      setPaymentMethods(methods);
    } catch (error) {
      console.error('加载支付方式失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初始化加载 - 只在用户已认证后执行
  useEffect(() => {
    // 等待认证状态加载完成，且用户已登录后才加载数据
    if (!authLoading && isAuthenticated) {
      console.log('[PaymentMethodContext] 用户已认证，开始加载支付方式数据');
      refreshPaymentMethods();
    } else if (!authLoading && !isAuthenticated) {
      // 用户未登录，清空数据
      console.log('[PaymentMethodContext] 用户未认证，清空支付方式数据');
      setPaymentMethods([]);
    }
  }, [authLoading, isAuthenticated, refreshPaymentMethods]);

  // 获取默认支付方式
  const defaultPaymentMethod = paymentMethods.find(method => method.isDefault) || null;

  // 设置默认支付方式
  const setDefaultPaymentMethod = async (id: number) => {
    try {
      await paymentMethodAPI.setDefault(id);
      await refreshPaymentMethods();
    } catch (error) {
      console.error('设置默认支付方式失败:', error);
      throw error;
    }
  };

  return (
    <PaymentMethodContext.Provider
      value={{
        paymentMethods,
        defaultPaymentMethod,
        isLoading,
        refreshPaymentMethods,
        setDefaultPaymentMethod,
      }}
    >
      {children}
    </PaymentMethodContext.Provider>
  );
};

export const usePaymentMethod = () => {
  const context = useContext(PaymentMethodContext);
  if (!context) {
    throw new Error('usePaymentMethod must be used within PaymentMethodProvider');
  }
  return context;
};
