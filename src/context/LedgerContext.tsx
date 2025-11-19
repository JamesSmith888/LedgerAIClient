import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    ReactNode,
} from 'react';
import { toast } from '../utils/toast';
import type { Ledger } from '../types/ledger';
import { ledgerAPI, userAPI } from '../api/services';
import { useAuth } from './AuthContext';

/**
 * LedgerContext 的类型定义
 */
interface LedgerContextType {
    // 状态
    ledgers: Ledger[];                          // 所有账本列表
    currentLedger: Ledger | null;               // 当前选中的账本
    defaultLedgerId: number | null;             // 用户默认账本ID
    isLoading: boolean;                         // 加载状态

    // 方法
    setCurrentLedger: (ledger: Ledger) => void; // 切换账本
    setDefaultLedger: (ledger: Ledger | null) => Promise<void>; // 设置默认账本
    refreshLedgers: () => Promise<void>;        // 刷新账本列表
    createLedger: (data: any) => Promise<Ledger | null>; // 创建账本
    updateLedger: (id: number, data: any) => Promise<void>; // 更新账本
    deleteLedger: (id: number) => Promise<void>; // 删除账本
}

/**
 * 创建 Context
 */
const LedgerContext = createContext<LedgerContextType | undefined>(undefined);

/**
 * Provider 组件的 Props
 */
interface LedgerProviderProps {
    children: ReactNode;
}

/**
 * LedgerProvider 组件
 * 提供账本相关的全局状态和方法
 */
export const LedgerProvider: React.FC<LedgerProviderProps> = ({ children }) => {
    // ========== 获取认证状态 ==========
    const { isAuthenticated, isLoading: authLoading } = useAuth();

    // ========== 状态管理 ==========
    const [ledgers, setLedgers] = useState<Ledger[]>([]);
    const [currentLedger, setCurrentLedgerState] = useState<Ledger | null>(null);
    const [defaultLedgerId, setDefaultLedgerId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // ========== 初始化加载 - 只在用户已认证后执行 ==========
    useEffect(() => {
        // 等待认证状态加载完成，且用户已登录后才加载数据
        if (!authLoading && isAuthenticated) {
            console.log('[LedgerContext] 用户已认证，开始加载账本数据');
            loadInitialData();
        } else if (!authLoading && !isAuthenticated) {
            // 用户未登录，清空数据
            console.log('[LedgerContext] 用户未认证，清空账本数据');
            setLedgers([]);
            setCurrentLedgerState(null);
            setDefaultLedgerId(null);
        }
    }, [authLoading, isAuthenticated]);

    // ========== 加载初始数据 ==========
    const loadInitialData = async () => {
        try {
            setIsLoading(true);
            // 并行加载账本列表和默认账本ID
            const [ledgersData, defaultId] = await Promise.all([
                ledgerAPI.getAll(),
                userAPI.getDefaultLedger().catch(() => null), // 失败时返回null
            ]);

            setLedgers(ledgersData ?? []);
            setDefaultLedgerId(defaultId);
            console.log('加载的账本列表:', ledgersData);
            console.log('用户默认账本ID:', defaultId);

            // 如果有默认账本，优先选择默认账本
            if (defaultId && ledgersData) {
                const defaultLedger = ledgersData.find(l => l.id === defaultId);
                if (defaultLedger) {
                    setCurrentLedgerState(defaultLedger);
                    console.log('自动选择默认账本:', defaultLedger);
                    return;
                }
            }

            // 如果没有默认账本或找不到默认账本，选择第一个
            if (!currentLedger && (ledgersData?.length ?? 0) > 0) {
                setCurrentLedgerState(ledgersData[0]);
                console.log('自动选择第一个账本:', ledgersData[0]);
            }
        } catch (error) {
            console.error('加载初始数据失败:', error);
            toast.error('加载账本数据失败');
        } finally {
            setIsLoading(false);
        }
    };

    // ========== 加载账本列表 ==========
    const loadLedgers = async () => {
        try {
            setIsLoading(true);
            const data = await ledgerAPI.getAll();
            setLedgers(data ?? []);
            console.log('加载的账本列表:', data);

            // 如果当前选中的账本在新数据中，更新它
            if (currentLedger) {
                const updated = data.find(l => l.id === currentLedger.id);
                if (updated) {
                    setCurrentLedgerState(updated);
                } else {
                    // 如果当前账本已被删除，重置选择
                    if (data.length > 0) {
                        // 优先选择默认账本
                        const defaultLedger = defaultLedgerId ? data.find(l => l.id === defaultLedgerId) : null;
                        setCurrentLedgerState(defaultLedger || data[0]);
                    } else {
                        setCurrentLedgerState(null);
                    }
                }
            } else if ((data?.length ?? 0) > 0) {
                // 如果还没有选中账本，选择默认账本或第一个
                const defaultLedger = defaultLedgerId ? data.find(l => l.id === defaultLedgerId) : null;
                setCurrentLedgerState(defaultLedger || data[0]);
            }
        } catch (error) {
            console.error('加载账本列表失败:', error);
            toast.error('加载账本列表失败');
        } finally {
            setIsLoading(false);
        }
    };

    // ========== 刷新账本列表 ==========
    const refreshLedgers = useCallback(async () => {
        await loadLedgers();
    }, []);

    // ========== 切换当前账本 ==========
    const setCurrentLedger = useCallback((ledger: Ledger) => {
        setCurrentLedgerState(ledger);
    }, []);

    // ========== 设置默认账本 ==========
    const setDefaultLedger = useCallback(async (ledger: Ledger | null) => {
        try {
            const ledgerId = ledger?.id ?? null;
            await userAPI.updateDefaultLedger(ledgerId);
            setDefaultLedgerId(ledgerId);
            
            // 同时切换当前账本
            if (ledger) {
                setCurrentLedgerState(ledger);
            }
            
            toast.success(ledger ? `已设置「${ledger.name}」为默认账本` : '已清除默认账本');
        } catch (error) {
            console.error('设置默认账本失败:', error);
            toast.error('设置默认账本失败');
            throw error;
        }
    }, []);

    // ========== 创建账本 ==========
    const createLedger = useCallback(async (data: any): Promise<Ledger | null> => {
        try {
            const newLedger = await ledgerAPI.create(data);
            await refreshLedgers(); // 刷新列表
            return newLedger;
        } catch (error) {
            console.error('创建账本失败:', error);
            toast.error('创建账本失败');
            return null;
        }
    }, [refreshLedgers]);

    // ========== 更新账本 ==========
    const updateLedger = useCallback(async (id: number, data: any) => {
        try {
            await ledgerAPI.update(id, data);
            await refreshLedgers();
        } catch (error) {
            console.error('更新账本失败:', error);
            toast.error('更新账本失败');
        }
    }, [refreshLedgers]);

    // ========== 删除账本 ==========
    const deleteLedger = useCallback(async (id: number) => {
        try {
            await ledgerAPI.delete(id);

            // 如果删除的是当前账本，切换到第一个账本
            if (currentLedger?.id === id) {
                const remaining = ledgers.filter(l => l.id !== id);
                setCurrentLedgerState(remaining.length > 0 ? remaining[0] : null);
            }

            await refreshLedgers();
        } catch (error) {
            console.error('删除账本失败:', error);
            toast.error('删除账本失败');
        }
    }, [currentLedger, ledgers, refreshLedgers]);

    // ========== Provider Value ==========
    const value: LedgerContextType = {
        ledgers,
        currentLedger,
        defaultLedgerId,
        isLoading,
        setCurrentLedger,
        setDefaultLedger,
        refreshLedgers,
        createLedger,
        updateLedger,
        deleteLedger,
    };

    return (
        <LedgerContext.Provider value={value}>
            {children}
        </LedgerContext.Provider>
    );
};

/**
 * 自定义 Hook：使用 LedgerContext
 */
export const useLedger = (): LedgerContextType => {
    const context = useContext(LedgerContext);
    if (context === undefined) {
        throw new Error('useLedger must be used within a LedgerProvider');
    }
    return context;
};