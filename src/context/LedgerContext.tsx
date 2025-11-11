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
import { ledgerAPI } from '../api/services';

/**
 * LedgerContext 的类型定义
 */
interface LedgerContextType {
    // 状态
    ledgers: Ledger[];                          // 所有账本列表
    currentLedger: Ledger | null;               // 当前选中的账本
    isLoading: boolean;                         // 加载状态

    // 方法
    setCurrentLedger: (ledger: Ledger) => void; // 切换账本
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
    // ========== 状态管理 ==========
    const [ledgers, setLedgers] = useState<Ledger[]>([]);
    const [currentLedger, setCurrentLedgerState] = useState<Ledger | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // ========== 初始化加载 ==========
    useEffect(() => {
        loadLedgers();
    }, []);

    // ========== 加载账本列表 ==========
    const loadLedgers = async () => {
        try {
            setIsLoading(true);
            const data = await ledgerAPI.getAll();
            setLedgers(data ?? []);
            console.log('加载的账本列表:', data);

            // 如果还没有选中账本，自动选择第一个
            if (!currentLedger && (data?.length ?? 0) > 0) {
                setCurrentLedgerState(data[0]);
            }

            // 如果当前选中的账本在新数据中，更新它
            if (currentLedger) {
                const updated = data.find(l => l.id === currentLedger.id);
                if (updated) {
                    setCurrentLedgerState(updated);
                }
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
        isLoading,
        setCurrentLedger,
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