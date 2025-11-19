# 账本邀请功能实现文档

## 📋 功能概述

账本邀请功能允许账本管理员通过生成邀请码的方式邀请其他用户加入共享账本。支持灵活的权限控制、使用次数限制和有效期管理。

## ✨ 核心特性

### 1. 邀请码生成
- ✅ 支持选择邀请角色（管理员/记账员/查看者）
- ✅ 可设置使用次数（1次/5次/10次/无限制）
- ✅ 可设置有效期（1小时/24小时/7天/永久）
- ✅ 自动生成12位随机邀请码

### 2. 邀请码管理
- ✅ 查看所有已生成的邀请码
- ✅ 显示使用情况和状态
- ✅ 支持复制、分享、禁用操作
- ✅ 自动标识过期和已达上限的邀请码

### 3. 权限控制
- ✅ 只有所有者和管理员可以生成邀请码
- ✅ 不能通过邀请码成为所有者
- ✅ 支持三种角色：管理员、记账员、查看者

### 4. UI设计
- ✅ 参考 Google Material Design
- ✅ 参考 Telegram 链接卡片风格
- ✅ 现代化的底部弹窗设计
- ✅ 清晰的视觉反馈

## 🏗️ 技术架构

### 后端实现

#### 数据库表结构
```sql
-- 邀请码表
ledger_invite_code
  - id (主键)
  - code (邀请码，唯一)
  - ledger_id (账本ID)
  - created_by_user_id (创建者)
  - role (邀请角色)
  - max_uses (最大使用次数)
  - used_count (已使用次数)
  - expire_time (过期时间)
  - status (状态)

-- 邀请记录表
ledger_invite_record
  - id (主键)
  - invite_code_id (邀请码ID)
  - ledger_id (账本ID)
  - user_id (使用者ID)
  - use_time (使用时间)
```

#### 核心类
- `InviteCodeEntity` - 邀请码实体
- `InviteRecordEntity` - 使用记录实体
- `InviteCodeService` - 业务逻辑层
- `LedgerInviteController` - REST API控制器

#### API 接口
```
POST   /api/ledgers/{ledgerId}/invites              - 生成邀请码
GET    /api/ledgers/{ledgerId}/invites              - 获取邀请码列表
GET    /api/ledgers/invites/validate/{code}         - 验证邀请码
POST   /api/ledgers/invites/accept/{code}           - 使用邀请码
DELETE /api/ledgers/{ledgerId}/invites/{inviteId}   - 禁用邀请码
POST   /api/ledgers/{ledgerId}/members/direct-invite - 直接邀请
```

### 前端实现

#### 组件结构
```
src/components/invite/
├── RoleSelector.tsx        - 角色选择器
├── InviteCodeCard.tsx      - 邀请码卡片
├── InviteMemberSheet.tsx   - 主邀请弹窗
└── index.ts                - 组件导出
```

#### 类型定义
```typescript
// src/types/invite.ts
- InviteCode           - 邀请码类型
- CreateInviteCodeRequest - 创建请求
- InviteValidateResponse  - 验证响应
- RoleOption           - 角色选项
```

#### API 服务
```typescript
// src/api/services/ledgerInviteAPI.ts
- createInviteCode()   - 生成邀请码
- getInviteCodes()     - 获取邀请码列表
- validateInviteCode() - 验证邀请码
- acceptInvite()       - 使用邀请码
- disableInviteCode()  - 禁用邀请码
```

## 📱 使用流程

### 1. 生成邀请码
1. 打开共享账本详情页
2. 点击「+ 邀请」按钮
3. 选择邀请角色（管理员/记账员/查看者）
4. （可选）展开高级设置
   - 设置使用次数
   - 设置有效期
5. 点击「✨ 生成邀请码」
6. 邀请码生成成功

### 2. 分享邀请码
1. 在邀请码卡片上点击「📋 复制」或「📤 分享」
2. 将邀请码发送给受邀用户
3. 受邀用户输入邀请码加入账本

### 3. 管理邀请码
1. 查看邀请码使用情况
2. 监控过期时间
3. 必要时点击「🚫 禁用」停止使用

## 🎨 设计特点

### UI 风格
- **Google Material Design**
  - 圆角卡片设计
  - 淡色阴影效果
  - 清晰的层级结构

- **Telegram 风格**
  - 简洁的底部弹窗
  - 左侧色条标识
  - 明确的操作按钮

### 颜色方案
```typescript
管理员 - #FF6B6B (红色)
记账员 - #4ECDC4 (青色)
查看者 - #95E1D3 (浅绿)
```

### 交互体验
- ✅ 平滑的动画过渡
- ✅ 即时的操作反馈
- ✅ 清晰的状态提示
- ✅ 友好的错误提示

## 🔐 安全考虑

1. **权限验证**
   - 后端验证用户权限
   - 只有管理员可生成邀请码

2. **邀请码安全**
   - 12位随机字符串
   - 唯一性保证
   - 防止暴力破解

3. **使用限制**
   - 支持次数限制
   - 支持时间限制
   - 防止重复使用

## 🚀 未来扩展

### 计划功能
1. ✨ 二维码邀请
2. ✨ 邮件/短信邀请
3. ✨ 批量邀请
4. ✨ 邀请链接统计
5. ✨ 邀请奖励机制

### 优化方向
1. 📊 邀请数据分析
2. 🔔 邀请通知推送
3. 🎯 智能角色推荐
4. 📱 Deep Link 支持

## 🐛 已知问题

暂无

## 📝 测试清单

### 后端测试
- [ ] 数据库迁移是否成功
- [ ] 邀请码生成接口
- [ ] 邀请码验证接口
- [ ] 邀请码使用接口
- [ ] 权限控制验证

### 前端测试
- [ ] 邀请弹窗显示
- [ ] 角色选择功能
- [ ] 邀请码生成
- [ ] 邀请码复制/分享
- [ ] 邀请码禁用
- [ ] 成员列表刷新

### 集成测试
- [ ] 完整邀请流程
- [ ] 跨设备测试
- [ ] 边界条件测试
- [ ] 错误处理测试

## 📞 技术支持

如有问题，请联系开发团队。

---

**版本**: 1.0.0  
**最后更新**: 2025-11-18  
**作者**: AI Assistant & Development Team
