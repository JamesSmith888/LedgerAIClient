# 多模态支持（图片识别）实现说明

## 问题描述

用户发送带图片附件的消息时，Agent 没有识别到图片内容，导致图片被完全忽略。

## 根本原因

在 `AgentContext.tsx` 中，`sendMessage` 函数虽然接收了 `attachments` 参数，但在创建 `HumanMessage` 时只传递了文本内容：

```typescript
// 旧代码：只传递文本
const humanMsg = new HumanMessage(content); // ❌ attachments 被忽略
```

## 解决方案

### 1. 实现多模态消息构建

在 `AgentContext.tsx` 的 `sendMessage` 函数中，根据是否有附件，构建不同格式的消息：

```typescript
// 新代码：支持多模态
if (attachments.length > 0) {
  // 构建多模态消息
  const messageContent = [];
  
  if (content.trim()) {
    messageContent.push({ type: 'text', text: content });
  }
  
  attachments.forEach(attachment => {
    if (attachment.type === 'image' && attachment.base64) {
      messageContent.push({
        type: 'image_url',
        image_url: { 
          url: attachment.base64.startsWith('data:') 
            ? attachment.base64 
            : `data:image/jpeg;base64,${attachment.base64}`
        }
      });
    }
  });
  
  humanMsg = new HumanMessage({ content: messageContent });
} else {
  humanMsg = new HumanMessage(content);
}
```

### 2. 优化日志输出

在 `statefulAgent.ts` 中，避免打印完整的 base64 图片数据：

```typescript
// 智能格式化：显示 "[image]" 而非完整 base64
if (Array.isArray(msg.content)) {
  const parts = msg.content.map(part => {
    if (part.type === 'text') return `[text: ${part.text?.substring(0, 50)}...]`;
    if (part.type === 'image_url') return `[image]`;
    return `[${part.type}]`;
  }).join(', ');
  content = `MultiModal(${msg.content.length} parts): ${parts}`;
}
```

## 技术架构

### 数据流

```
AgentScreen.tsx (用户上传图片)
    ↓ PendingAttachment (包含 base64)
AgentContext.tsx (sendMessage)
    ↓ HumanMessage (多模态 content)
statefulAgent.ts
    ↓ intentRewriter (支持图片)
    ↓ executor model (ChatOpenAI with vision)
```

### 消息格式

**纯文本消息**：
```typescript
new HumanMessage("午餐17")
```

**多模态消息**：
```typescript
new HumanMessage({
  content: [
    { type: 'text', text: '这是什么？' },
    { 
      type: 'image_url', 
      image_url: { 
        url: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...' 
      } 
    }
  ]
})
```

## 已有支持

### intentRewriter 已支持多模态

- `hasImageContent()` 方法检测图片
- `extractText()` 方法提取文本部分
- `rewrite()` 方法接受 `MultimodalContent` 类型

### statefulAgent 已支持多模态

- `extractTextContent()` 正确处理数组格式的 content
- `userInputContent` 完整传递给 intentRewriter（包含图片）
- 图片内容在执行阶段保留给 executor model

## 模型支持

### 支持 Vision 的模型

根据第三方网关 (kfc-api.sxxe.net) 返回的模型列表：

- ✅ **gemini-3-flash-preview** - 支持图片识别
- ✅ **gemini-2.5-flash-latest** - 支持图片识别
- ✅ **gemini-2.0-flash-exp** - 支持图片识别
- ✅ **gpt-4o** - 支持图片识别
- ✅ **claude-3.5-sonnet** - 支持图片识别

### ChatOpenAI Vision 配置

所有支持 vision 的模型都通过 `ChatOpenAI` 调用（第三方网关统一使用 OpenAI 兼容接口）：

```typescript
return new ChatOpenAI({
    model: config.model,  // 例如：gemini-3-flash-preview
    apiKey: config.apiKey,
    temperature: config.temperature ?? 0,
    maxRetries: config.maxRetries ?? 2,
    configuration: { baseURL: this.baseURL },  // 例如：https://kfc-api.sxxe.net/v1
});
```

## 使用示例

### 场景1：识别交易小票

用户：上传小票图片 + "记账"

Agent 行为：
1. intentRewriter 识别图片和文本
2. 判断为记账意图（hasImage=true）
3. executor 调用 vision model 识别小票
4. 提取金额、商户、日期等信息
5. 调用 transaction 工具记账

### 场景2：查询图片中的商品价格

用户：上传商品图片 + "这个多少钱"

Agent 行为：
1. vision model 识别图片中的商品
2. 从上下文或历史记录查询价格
3. 返回结果

## 测试验证

### 验证步骤

1. 启动应用，进入聊天界面
2. 点击图片按钮，上传一张交易小票
3. 输入"记账"或留空
4. 观察 console 日志

### 预期日志

```
📎 [AgentScreen] 发送带附件的消息: 1 个附件
🖼️ [AgentContext] Added image to message, size: 123456
🖼️ [AgentContext] Created multimodal message with 2 parts
📨 [StatefulAgent] Messages to send:
  [7] Human: MultiModal(2 parts): [text: 记账...], [image]
📝 [IntentRewriter] Has Image: true
```

### 常见问题

**Q: 为什么图片还是没被识别？**
A: 检查：
1. 模型是否支持 vision（必须是 gpt-4o/gemini 等）
2. base64 数据是否完整（检查 console.log 输出）
3. 第三方网关是否正常工作（测试 API key）

**Q: 日志显示 "Empty response from LLM"？**
A: 可能原因：
1. 图片 base64 过大，超过 token 限制
2. 模型不支持图片格式（只支持 jpeg/png）
3. API key 权限不足

## 相关文件

- ✅ `/src/context/AgentContext.tsx` - 多模态消息构建
- ✅ `/src/agent/statefulAgent.ts` - 消息传递和日志优化
- ✅ `/src/agent/intentRewriter.ts` - 意图识别（已支持）
- ✅ `/src/types/agent.ts` - PendingAttachment 类型定义
- ✅ `/src/agent/modelFactory.ts` - 模型创建（ChatOpenAI）

## 后续优化

1. **图片压缩**：大图片自动压缩，避免超过 token 限制
2. **格式检测**：自动识别 JPEG/PNG/WEBP 格式
3. **错误提示**：模型不支持 vision 时，提前告知用户
4. **成本控制**：vision 调用通常更贵，添加用量统计
