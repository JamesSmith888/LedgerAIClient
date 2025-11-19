# Context 初始化顺序问题修复

## 🐛 问题描述

在应用启动时，即使用户未登录，也会立即调用需要认证的 API 接口，导致 401 错误：

```
[LedgerAI ERROR] ❗ Response Data: {"code":401,"message":"未提供认证token","data":null}
CategoryContext.tsx:43 加载分类数据时出错: AxiosError: 未提供认证token
```

## 🔍 根本原因

**Context Providers 的竞态条件 (Race Condition)**

```tsx
<AuthProvider>           // 1️⃣ 开始异步加载 token
  <LedgerProvider>       // 2️⃣ 立即在 useEffect 中调用 ledgerAPI.getAll()
    <CategoryProvider>   // 3️⃣ 立即在 useEffect 中调用 categoryAPI.getAll()
      <PaymentMethodProvider> // 4️⃣ 立即调用 paymentMethodAPI.getAll()
```

**执行流程：**

1. `AuthProvider` 开始执行 `loadStoredAuth()`，这是一个**异步函数**
2. **同时**，子 Providers (`LedgerProvider`, `CategoryProvider`, `PaymentMethodProvider`) 的 `useEffect` 立即执行
3. 这些子 Providers 发起 API 请求时，`AuthProvider` 还在加载 token
4. **请求拦截器**读取 `AsyncStorage.getItem('token')` 返回 `null`
5. 结果：**所有 API 请求都没有 Authorization header** → 401 错误

### 时序图

```
时间线：
T0: App 启动
T1: AuthProvider.loadStoredAuth() 开始（异步）
T2: LedgerProvider.useEffect() 执行 → API 请求发出（无 token）❌
T3: CategoryProvider.useEffect() 执行 → API 请求发出（无 token）❌
T4: PaymentMethodProvider.useEffect() 执行 → API 请求发出（无 token）❌
...
T10: AuthProvider.loadStoredAuth() 完成，token 加载完毕 ✅（但已经太晚了）
```

## ✅ 解决方案

**让子 Providers 等待认证状态加载完成后再初始化数据**

### 核心思路

1. 在子 Providers 中导入 `useAuth()`
2. 监听 `authLoading` 和 `isAuthenticated` 状态
3. 只有当 `!authLoading && isAuthenticated` 时才加载数据

### 修改的文件

#### 1. LedgerContext.tsx

```tsx
// ✅ 导入 useAuth
import { useAuth } from './AuthContext';

export const LedgerProvider: React.FC<LedgerProviderProps> = ({ children }) => {
    // ✅ 获取认证状态
    const { isAuthenticated, isLoading: authLoading } = useAuth();

    // ... 其他状态

    // ✅ 修改初始化逻辑
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
    }, [authLoading, isAuthenticated]); // ✅ 依赖认证状态
```

#### 2. CategoryContext.tsx

```tsx
// ✅ 导入 useAuth
import { useAuth } from './AuthContext';

export const CategoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // ✅ 获取认证状态
    const { isAuthenticated, isLoading: authLoading } = useAuth();

    // ... 其他状态

    // ✅ 修改初始化逻辑
    useEffect(() => {
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
```

#### 3. PaymentMethodContext.tsx

```tsx
// ✅ 导入 useAuth
import { useAuth } from './AuthContext';

export const PaymentMethodProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // ✅ 获取认证状态
    const { isAuthenticated, isLoading: authLoading } = useAuth();

    // ... 其他状态

    // ✅ 修改初始化逻辑
    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            console.log('[PaymentMethodContext] 用户已认证，开始加载支付方式数据');
            refreshPaymentMethods();
        } else if (!authLoading && !isAuthenticated) {
            console.log('[PaymentMethodContext] 用户未认证，清空支付方式数据');
            setPaymentMethods([]);
        }
    }, [authLoading, isAuthenticated, refreshPaymentMethods]);
```

## 🎯 修复后的执行流程

```
时间线：
T0: App 启动
T1: AuthProvider.loadStoredAuth() 开始（authLoading = true）
T2: LedgerProvider.useEffect() 执行 → 检查到 authLoading = true → 等待 ⏳
T3: CategoryProvider.useEffect() 执行 → 检查到 authLoading = true → 等待 ⏳
T4: PaymentMethodProvider.useEffect() 执行 → 检查到 authLoading = true → 等待 ⏳
...
T10: AuthProvider.loadStoredAuth() 完成 ✅
     - authLoading = false
     - isAuthenticated = true
     - token 已加载到内存
T11: LedgerProvider 检测到状态变化 → 发起 API 请求（带 token）✅
T12: CategoryProvider 检测到状态变化 → 发起 API 请求（带 token）✅
T13: PaymentMethodProvider 检测到状态变化 → 发起 API 请求（带 token）✅
```

## 📝 关键要点

### 1. Context 嵌套顺序很重要

```tsx
// ✅ 正确：父级 Context 必须在子级之前
<AuthProvider>
  <LedgerProvider>      // 依赖 AuthContext
    <CategoryProvider>   // 依赖 AuthContext
```

```tsx
// ❌ 错误：会导致循环依赖
<LedgerProvider>
  <AuthProvider>
```

### 2. 异步初始化需要等待状态

当一个 Context 依赖另一个 Context 的**异步数据**时：

- ✅ **正确做法**：监听依赖 Context 的加载状态，等待完成后再执行
- ❌ **错误做法**：直接在 `useEffect(() => {}, [])` 中执行，可能拿不到数据

### 3. 请求拦截器的局限性

`axios` 请求拦截器中的 `await AsyncStorage.getItem('token')` **不能保证**拿到最新的 token，因为：

- 拦截器在请求发出时才执行
- 如果此时 `AuthProvider.loadStoredAuth()` 还没完成，读取到的就是 `null`

## 🧪 测试验证

### 1. 启动应用时（未登录）

✅ **期望行为**：
- 不应该看到任何 401 错误
- `CategoryContext` 使用预定义分类
- `LedgerProvider` 和 `PaymentMethodProvider` 不发起 API 请求

### 2. 登录后

✅ **期望行为**：
- 所有 Context 按顺序加载数据
- API 请求都带有 `Authorization: Bearer <token>` header
- 数据加载成功

### 3. 登出后

✅ **期望行为**：
- 所有 Context 清空数据
- 不再发起需要认证的 API 请求

## 🚀 最佳实践

### 1. Context 依赖管理

如果 ContextB 依赖 ContextA 的数据：

```tsx
// ✅ 在 ContextB 中显式等待 ContextA
const ContextB = () => {
  const { data, isLoading } = useContextA();
  
  useEffect(() => {
    if (!isLoading && data) {
      // 现在可以安全使用 ContextA 的数据
      initializeContextB();
    }
  }, [isLoading, data]);
}
```

### 2. 认证相关的 API 请求

所有需要认证的 API 调用都应该：

1. 检查 `isAuthenticated` 状态
2. 等待 `authLoading` 完成
3. 确保 token 已加载

```tsx
useEffect(() => {
  if (!authLoading && isAuthenticated) {
    // ✅ 安全：此时 token 已经加载完成
    fetchUserData();
  }
}, [authLoading, isAuthenticated]);
```

## 📚 相关文件

- `src/context/AuthContext.tsx` - 认证状态管理
- `src/context/LedgerContext.tsx` - 账本状态管理（已修复）
- `src/context/CategoryContext.tsx` - 分类状态管理（已修复）
- `src/context/PaymentMethodContext.tsx` - 支付方式状态管理（已修复）
- `src/api/config.ts` - Axios 拦截器配置
- `App.tsx` - Context Providers 嵌套结构

## 🔗 相关概念

- **Race Condition（竞态条件）**：多个异步操作的执行顺序不确定，导致结果不可预测
- **Context Dependency（Context 依赖）**：一个 Context 依赖另一个 Context 的数据
- **Request Interceptor（请求拦截器）**：在发送请求前统一处理请求配置
- **ThreadLocal（线程局部存储）**：后端用来存储当前请求的用户信息（避免传参）

---

修复完成！现在应用在启动时不会再提前调用需要认证的 API 了。🎉
