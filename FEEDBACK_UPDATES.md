# 反馈系统权限和UI更新说明

## 已完成的修复

### 1. ✅ 管理员可以看到关闭/重开按钮

**修复内容：**
- 反馈详情页面（`FeedbackDetailScreen.tsx`）现在根据 `canClose` 权限字段来显示关闭/重开按钮
- 不再仅限于反馈创建者，管理员也能看到并使用这些按钮

**权限规则：**
- 反馈创建者可以关闭/重开自己的反馈
- 管理员可以关闭/重开任何反馈

**验证方法：**
1. 使用管理员账号登录
2. 进入任意反馈详情页
3. 在页面右上角应该能看到关闭图标（×）或重开图标（↻）

### 2. ✅ 点赞/倒赞图标更改为大拇指

**修复内容：**
- 点赞图标：从星星(⭐)改为大拇指向上(👍) - `thumbs-up`
- 倒赞图标：从叉号(×)改为大拇指向下(👎) - `thumbs-down`

**文件修改：**
- `Icon.tsx`: 添加 `thumbsUp` 和 `thumbsDown` 到 `FeatherIcons`
- `FeedbackScreen.tsx`: 更新点赞/倒赞按钮的图标

**验证方法：**
1. 打开反馈列表页面
2. 查看任意反馈卡片底部的点赞/倒赞按钮
3. 应该显示为大拇指图标

## 技术细节

### 后端返回的权限字段

```typescript
interface Feedback {
  // ... 其他字段
  canDelete?: boolean;  // 是否可以删除
  canClose?: boolean;   // 是否可以关闭/重开
}
```

### 前端使用方式

```tsx
// 在 FeedbackDetailScreen 中
const canClose = feedback.canClose || false;

// 根据权限显示按钮
{canClose && (
  <TouchableOpacity onPress={handleCloseOrReopen}>
    <Icon name={isClosed ? 'rotate-cw' : 'x-circle'} />
  </TouchableOpacity>
)}
```

## 测试场景

### 场景1：普通用户
1. 登录普通用户账号
2. 提交一个反馈
3. 进入自己的反馈详情页
4. 应该能看到关闭按钮（右上角）和删除按钮（底部）
5. 进入其他用户的反馈详情页
6. 不应该看到关闭和删除按钮

### 场景2：管理员用户
1. 登录管理员账号（需先在数据库设置）
2. 进入任意反馈详情页
3. 应该能看到关闭按钮（右上角）和删除按钮（底部）
4. 可以关闭/重开任何反馈
5. 可以删除任何反馈

### 场景3：点赞/倒赞测试
1. 在反馈列表页面
2. 点击大拇指向上图标进行点赞
3. 图标应该高亮显示（蓝色）
4. 点击大拇指向下图标进行倒赞
5. 图标应该高亮显示（红色）
6. 再次点击已高亮的图标可以取消反应

## 如何设置管理员

在数据库中执行以下SQL：

```sql
-- 将用户ID为1的用户设置为管理员
UPDATE user SET role = 'ADMIN' WHERE id = 1;

-- 或通过用户名设置
UPDATE user SET role = 'ADMIN' WHERE username = 'admin';
```

## 相关文件

### 后端
- `PermissionUtil.java` - 权限工具类
- `FeedbackService.java` - 反馈服务（计算权限）
- `FeedbackResponse.java` - 反馈响应（包含权限字段）

### 前端
- `FeedbackScreen.tsx` - 反馈列表页面
- `FeedbackDetailScreen.tsx` - 反馈详情页面
- `Icon.tsx` - 图标组件
- `feedbackAPI.ts` - 反馈API接口定义
