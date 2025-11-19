# 邀请功能故障排查指南

## 🔍 问题排查步骤

### 1. 检查数据库迁移是否执行
```sql
-- 连接数据库后执行
SHOW TABLES LIKE 'ledger_invite%';

-- 应该看到两个表
-- ledger_invite_code
-- ledger_invite_record

-- 查看表结构
DESC ledger_invite_code;
```

### 2. 检查后端服务是否启动
```bash
# 查看后端日志，确认没有启动错误
# 查找类似这样的日志：
# - InviteCodeService 初始化成功
# - LedgerInviteController 映射成功
```

### 3. 测试 API 接口（使用 Postman 或 curl）

#### 3.1 生成邀请码
```bash
POST http://localhost:8080/api/ledgers/{ledgerId}/invites
Headers:
  Content-Type: application/json
  Authorization: Bearer {your_token}

Body:
{
  "role": 3,
  "maxUses": 1,
  "expireHours": 24
}

# 期望响应
{
  "code": 200,
  "message": "Success",
  "data": {
    "id": 1,
    "code": "ABC123XYZ456",
    "ledgerId": 1,
    "role": 3,
    "roleName": "记账员",
    ...
  }
}
```

#### 3.2 查询邀请码列表
```bash
GET http://localhost:8080/api/ledgers/{ledgerId}/invites
Headers:
  Authorization: Bearer {your_token}

# 期望响应
{
  "code": 200,
  "message": "Success",
  "data": [
    {
      "id": 1,
      "code": "ABC123XYZ456",
      ...
    }
  ]
}
```

### 4. 前端调试

#### 4.1 检查网络请求
打开 React Native Debugger 或浏览器开发者工具：
1. 点击「✨ 生成邀请码」
2. 查看 Network 标签
3. 查找请求：`POST /api/ledgers/{id}/invites`
4. 检查：
   - 请求是否发送成功
   - 请求参数是否正确
   - 响应状态码（200/400/401/500）
   - 响应内容

#### 4.2 查看控制台日志
```javascript
// 在 InviteMemberSheet.tsx 中已有日志
console.error('生成邀请码失败:', error);
console.error('加载邀请码失败:', error);
```

### 5. 常见问题及解决方案

#### 问题 1: 点击生成按钮无反应
**原因**:
- 网络请求失败
- 权限不足（非管理员）
- 账本类型错误（个人账本）

**解决**:
```javascript
// 检查控制台是否有错误日志
// 检查用户是否有管理员权限
// 确认账本类型为 SHARED (2)
```

#### 问题 2: 提示"无权限生成邀请码"
**原因**: 当前用户不是账本的所有者或管理员

**解决**:
- 使用账本所有者账号
- 或让所有者将你设置为管理员

#### 问题 3: 数据库表不存在
**原因**: Flyway 迁移未执行

**解决**:
```bash
# 1. 检查 Flyway 配置
# 2. 重启后端服务
# 3. 查看启动日志中的 Flyway 执行情况

# 手动执行迁移 SQL（如果必要）
mysql -u root -p your_database < V1_3__add_ledger_invite.sql
```

#### 问题 4: 接口返回 401 未授权
**原因**: Token 过期或无效

**解决**:
- 重新登录获取新 Token
- 检查 Token 是否正确设置在请求头中

#### 问题 5: 接口返回 400 参数错误
**原因**: 请求参数不符合后端验证规则

**解决**:
```javascript
// 检查参数值
role: 2-4 之间的整数（不能是 1-所有者）
maxUses: >= -1 的整数
expireHours: 1-8760 之间的整数（或 null/undefined）
```

### 6. 完整测试流程

```
1. 启动后端 ✓
   └─> 检查日志：Flyway 迁移成功
   └─> 检查日志：所有 Controller 注册成功

2. 启动前端 ✓
   └─> 检查：能正常登录
   └─> 检查：能访问共享账本详情

3. 打开邀请弹窗 ✓
   └─> 点击「+ 邀请」
   └─> 弹窗正常显示
   └─> 显示"已生成的邀请码 (0)"

4. 选择角色 ✓
   └─> 选择「记账员」（默认）
   └─> 角色卡片高亮显示

5. 配置高级设置（可选） ✓
   └─> 点击「▶ 高级设置」
   └─> 选择使用次数：1次
   └─> 选择有效期：24小时

6. 生成邀请码 ✓
   └─> 点击「✨ 生成邀请码」
   └─> 显示加载动画
   └─> 提示"邀请码生成成功"
   └─> 列表显示新生成的邀请码

7. 使用邀请码 ✓
   └─> 点击「📋 复制」
   └─> 点击「📤 分享」
   └─> 点击「🚫 禁用」
```

## 🐛 实时调试建议

### 添加临时调试日志

在 `InviteMemberSheet.tsx` 的 `handleGenerate` 函数中添加：

```typescript
const handleGenerate = async () => {
  console.log('=== 开始生成邀请码 ===');
  console.log('账本ID:', ledgerId);
  console.log('选中角色:', selectedRole);
  console.log('使用次数:', maxUses);
  console.log('有效期:', expireHours);
  
  try {
    setIsGenerating(true);

    const request: CreateInviteCodeRequest = {
      role: selectedRole,
      maxUses,
      expireHours,
    };

    console.log('请求参数:', request);
    
    const result = await ledgerInviteAPI.createInviteCode(ledgerId, request);
    console.log('生成结果:', result);
    
    toast.success('邀请码生成成功');
    
    // 刷新列表
    await loadInviteCodes();
    onSuccess?.();

    // 重置表单
    setShowAdvancedSettings(false);
  } catch (error: any) {
    console.error('=== 生成邀请码失败 ===');
    console.error('错误对象:', error);
    console.error('错误消息:', error.message);
    console.error('错误响应:', error.response?.data);
    toast.error(error.message || '生成邀请码失败');
  } finally {
    setIsGenerating(false);
  }
};
```

### 监控网络请求

在 API 文件中添加拦截器：

```typescript
// src/api/config.ts 中添加
apiClient.interceptors.request.use(
  (config) => {
    console.log('📤 API 请求:', config.method?.toUpperCase(), config.url);
    console.log('📤 请求数据:', config.data);
    return config;
  },
  (error) => {
    console.error('📤 请求错误:', error);
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    console.log('📥 API 响应:', response.config.url);
    console.log('📥 响应数据:', response.data);
    return response;
  },
  (error) => {
    console.error('📥 响应错误:', error.response?.data);
    return Promise.reject(error);
  }
);
```

## 📞 获取帮助

如果以上步骤都无法解决问题，请提供：
1. 后端启动日志（特别是 Flyway 和 Controller 相关）
2. 前端控制台日志（点击生成按钮后的所有日志）
3. 网络请求详情（请求和响应的完整内容）
4. 数据库表结构查询结果

---

**祝你调试顺利！** 🚀
