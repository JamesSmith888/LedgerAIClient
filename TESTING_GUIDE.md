# 账本管理功能测试指南

## 前置准备

### 1. 数据库迁移
```bash
# 方式一: 使用 SQL 文件直接执行
mysql -u [username] -p [database_name] < src/main/resources/db/migration/V1_1__add_default_ledger_to_user.sql

# 方式二: 如果使用 Flyway，重启应用自动迁移
```

### 2. 重启后端服务
```bash
cd ledger-server
mvn clean spring-boot:run
```

### 3. 重新构建前端
```bash
cd LedgerAIClient
npm install  # 如果有新依赖
npm start    # 或 react-native run-android / react-native run-ios
```

## 功能测试清单

### ✅ 后端 API 测试

#### 1. 获取用户信息（包含默认账本）
```bash
curl -X GET http://localhost:8080/user/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```
期望响应包含 `defaultLedgerId` 字段

#### 2. 设置默认账本
```bash
curl -X PUT http://localhost:8080/user/default-ledger \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ledgerId": 1}'
```
期望返回更新后的用户信息

#### 3. 获取默认账本ID
```bash
curl -X GET http://localhost:8080/user/default-ledger \
  -H "Authorization: Bearer YOUR_TOKEN"
```
期望返回账本ID

### ✅ 前端功能测试

#### 场景 1: 设置默认账本
1. 打开"我的账本"页面
2. 点击任意账本的"⋯"按钮
3. 选择"设为默认账本"
4. 验证：
   - ✓ Toast 提示成功
   - ✓ 卡片右上角显示 "⭐ 默认" 徽章
   - ✓ 菜单中显示 "✓ 默认账本"（不可再次点击）

#### 场景 2: 默认账本视觉标识
1. 在账本列表中找到默认账本
2. 验证：
   - ✓ 右上角有黄色 "⭐ 默认" 徽章
   - ✓ 左侧有蓝色强调条（如果是当前账本）

#### 场景 3: 新增交易使用默认账本
1. 设置某个账本为默认
2. 返回首页，点击"+"新增交易
3. 验证：
   - ✓ 账本选择器默认选中默认账本

#### 场景 4: 交易列表默认筛选
1. 设置某个账本为默认
2. 返回首页查看交易列表
3. 验证：
   - ✓ 筛选器默认选中默认账本

#### 场景 5: 删除默认账本
1. 删除当前的默认账本
2. 验证：
   - ✓ 自动切换到另一个账本
   - ✓ 没有崩溃或错误

#### 场景 6: 应用重启后保持默认账本
1. 设置默认账本
2. 完全关闭应用
3. 重新打开应用
4. 验证：
   - ✓ 自动选择默认账本
   - ✓ 默认徽章正确显示

### ✅ UI/UX 测试

#### 视觉检查
1. 账本卡片样式
   - ✓ 图标容器大小适中 (56x56)
   - ✓ 圆角合适 (xl)
   - ✓ 阴影柔和

2. 默认徽章样式
   - ✓ 黄色系配色
   - ✓ 带边框和背景
   - ✓ 位置在右上角

3. 底部按钮
   - ✓ 高度适中
   - ✓ 圆角较大 (xl)
   - ✓ 间距合理
   - ✓ 阴影明显

4. 空状态
   - ✓ 图标足够大
   - ✓ 文案层级清晰
   - ✓ 居中对齐

#### 交互检查
1. 点击账本卡片 → 进入详情页
2. 点击"⋯"按钮 → 弹出操作菜单
3. 长按卡片 → 无操作（预期）
4. 下拉刷新 → 列表更新

### ✅ 性能测试

1. 初始加载速度
   - ✓ 账本列表和默认ID并行加载
   - ✓ 无明显卡顿

2. 切换默认账本
   - ✓ 立即响应
   - ✓ Toast 及时弹出
   - ✓ UI 即时更新

## 常见问题排查

### 问题 1: 默认徽章不显示
**排查步骤**:
1. 检查后端 API 是否返回 `defaultLedgerId`
2. 检查 LedgerContext 是否正确加载
3. 检查 `defaultLedgerId === item.id` 逻辑

### 问题 2: 设置默认账本无效
**排查步骤**:
1. 查看浏览器/RN调试器的网络请求
2. 检查后端日志是否有错误
3. 验证数据库字段是否成功添加

### 问题 3: 应用重启后失效
**排查步骤**:
1. 检查 LedgerContext 的 `loadInitialData` 逻辑
2. 验证 API `/user/default-ledger` 是否正常返回
3. 检查 token 是否过期

### 问题 4: 样式显示异常
**排查步骤**:
1. 清除应用缓存重新构建
2. 检查 theme 常量是否正确导入
3. 验证样式是否有冲突

## 回滚方案

如果遇到严重问题需要回滚：

### 后端回滚
```sql
-- 删除字段（慎用！会丢失数据）
ALTER TABLE `user` DROP COLUMN `default_ledger_id`;
```

### 前端回滚
```bash
git revert [commit-hash]
# 或
git checkout [previous-commit] -- src/context/LedgerContext.tsx
git checkout [previous-commit] -- src/screens/LedgerManagementScreen.tsx
git checkout [previous-commit] -- src/api/services/userAPI.ts
```

## 监控建议

上线后需要监控：
1. API `/user/default-ledger` 的调用量和成功率
2. 用户设置默认账本的频率
3. 是否有用户频繁切换默认账本
4. 异常日志和崩溃报告

## 反馈收集

关注用户反馈：
- 默认账本功能是否符合预期
- UI 设计是否清晰易懂
- 操作流程是否顺畅
- 性能是否有问题
