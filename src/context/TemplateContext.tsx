import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { TransactionTemplate } from '../types/template';
import { templateAPI } from '../api/services';
import { useAuth } from './AuthContext';

interface TemplateContextType {
  templates: TransactionTemplate[];
  quickPanelTemplates: TransactionTemplate[];
  isLoading: boolean;
  refreshTemplates: () => Promise<void>;
  refreshQuickPanelTemplates: () => Promise<void>;
}

const TemplateContext = createContext<TemplateContextType | undefined>(undefined);

export const TemplateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ========== 获取认证状态 ==========
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [templates, setTemplates] = useState<TransactionTemplate[]>([]);
  const [quickPanelTemplates, setQuickPanelTemplates] = useState<TransactionTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 加载所有模板
  const refreshTemplates = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await templateAPI.getAll();
      setTemplates(data);
    } catch (error) {
      console.error('加载模板失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 加载快捷面板模板
  const refreshQuickPanelTemplates = useCallback(async () => {
    try {
      const data = await templateAPI.getQuickPanelTemplates();
      setQuickPanelTemplates(data);
    } catch (error) {
      console.error('加载快捷面板模板失败:', error);
    }
  }, []);

  // 初始化加载 - 只在用户已认证后执行
  useEffect(() => {
    // 等待认证状态加载完成，且用户已登录后才加载数据
    if (!authLoading && isAuthenticated) {
      console.log('[TemplateContext] 用户已认证，开始加载模板数据');
      refreshTemplates();
      refreshQuickPanelTemplates();
    } else if (!authLoading && !isAuthenticated) {
      // 用户未登录，清空数据
      console.log('[TemplateContext] 用户未认证，清空模板数据');
      setTemplates([]);
      setQuickPanelTemplates([]);
    }
  }, [authLoading, isAuthenticated, refreshTemplates, refreshQuickPanelTemplates]);

  return (
    <TemplateContext.Provider
      value={{
        templates,
        quickPanelTemplates,
        isLoading,
        refreshTemplates,
        refreshQuickPanelTemplates,
      }}
    >
      {children}
    </TemplateContext.Provider>
  );
};

export const useTemplate = () => {
  const context = useContext(TemplateContext);
  if (!context) {
    throw new Error('useTemplate must be used within TemplateProvider');
  }
  return context;
};
