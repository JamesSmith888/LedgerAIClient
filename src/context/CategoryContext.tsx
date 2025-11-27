import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Category } from '../types/transaction';
import { categoryAPI, CategoryResponse } from '../api/services';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../types/transaction';
import { useAuth } from './AuthContext';

interface CategoryContextType {
    categories: Category[];
    expenseCategories: Category[];
    incomeCategories: Category[];
    isLoading: boolean;
    error: string | null;
    refreshCategories: () => Promise<void>;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

// 转换后端分类数据到前端 Category 类型
const convertToCategory = (response: CategoryResponse): Category => ({
    id: response.id,
    name: response.name,
    icon: response.icon,
    color: response.color,
    type: response.type,
    isSystem: response.isSystem,
});

export const CategoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // ========== 获取认证状态 ==========
    const { isAuthenticated, isLoading: authLoading } = useAuth();

    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // 加载分类数据
    const loadCategories = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const data = await categoryAPI.getAll();
            const converted = data.map(convertToCategory);

            console.log('转换后的分类数据:', converted);
            setCategories(converted);
        } catch (err: any) {
            console.error('加载分类数据时出错:', err);
            setError('加载分类数据时出错');

            // 失败时使用前端预定义的类别
            const defaultCategories = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
            console.log('使用预定义的分类数据:', defaultCategories);
            setCategories(defaultCategories);
        } finally {
            setIsLoading(false);
        }
    };

    // 组件挂载时加载分类 - 只在用户已认证后执行
    useEffect(() => {
        // 等待认证状态加载完成，且用户已登录后才加载数据
        if (!authLoading && isAuthenticated) {
            console.log('[CategoryContext] 用户已认证，开始加载分类数据');
            loadCategories();
        } else if (!authLoading && !isAuthenticated) {
            // 用户未登录，使用预定义的分类数据
            console.log('[CategoryContext] 用户未认证，使用预定义分类数据');
            const defaultCategories = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
            setCategories(defaultCategories);
        }
    }, [authLoading, isAuthenticated]);

    // 计算支出和收入分类
    const expenseCategories = categories.filter(c => c.type === 'EXPENSE');
    const incomeCategories = categories.filter(c => c.type === 'INCOME');

    const value: CategoryContextType = {
        categories,
        expenseCategories,
        incomeCategories,
        isLoading,
        error,
        refreshCategories: loadCategories,
    }

    return (
        <CategoryContext.Provider value={value}>
            {children}
        </CategoryContext.Provider>
    );
};

// 自定义 Hook 以便于使用分类上下文
export const useCategories = (): CategoryContextType => {
    const context = useContext(CategoryContext);
    if (!context) {
        throw new Error('useCategories must be used within a CategoryProvider');
    }
    return context;
}