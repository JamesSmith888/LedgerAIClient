# 置信度驱动决策功能更新总结

## 📋 更新概览

为 AI Agent 系统实现了**可配置的置信度驱动决策**机制，允许用户自定义 Agent 在不同置信度下的行为策略。

**更新日期：** 2025-12-12  
**影响模块：** IntentRewriter、Reflector、StatefulAgent

---

## ✅ 完成的工作

### 1. IntentRewriter 增强

**文件：** `src/agent/intentRewriter.ts`

**新增功能：**
- ✅ 可配置的置信度阈值
  - `high`: 高置信度阈值（默认 0.7）
  - `low`: 低置信度阈值（默认 0.4）
- ✅ System Prompt 动态注入阈值
- ✅ 三级决策机制：
  - **高置信度（≥ 0.7）**: 直接执行
  - **中置信度（0.4-0.7）**: 合理推测后执行
  - **低置信度（< 0.4）**: 主动询问用户

**配置示例：**
```typescript
intentRewriterConfidenceThresholds: {
  high: 0.7,  // 可调整 0.5-1.0
  low: 0.4,   // 可调整 0.0-0.5
}
```

### 2. Reflector 增强

**文件：** `src/agent/reflector.ts`

**新增功能：**
- ✅ 可配置的低置信度阈值（默认 0.3）
- ✅ System Prompt 包含置信度决策规则
- ✅ 低置信度时建议 `ask_user` 而非强行继续

**配置示例：**
```typescript
reflectorConfidenceThresholds: {
  low: 0.3,  // 可调整 0.0-0.5
}
```

### 3. StatefulAgent 集成

**文件：** `src/agent/statefulAgent.ts`

**新增功能：**
- ✅ 在 `StatefulAgentOptions` 中添加置信度阈值配置
- ✅ 自动传递配置到各个模块
- ✅ 支持用户级别的个性化设置

### 4. 文档和示例

**新增文件：**
- ✅ `CONFIDENCE_DRIVEN_DECISION_GUIDE.md` - 完整使用指南
- ✅ `CONFIDENCE_TEST_PROMPTS.md` - 测试提示词列表
- ✅ `src/agent/confidenceConfig.example.ts` - 配置示例代码

---

## 🎯 核心特性

### 1. 用户可配置

不再硬编码阈值，用户可以根据自己的需求调整：

```typescript
// 新手用户（更多指导）
confidenceThresholds: { high: 0.8, low: 0.5 }

// 熟练用户（追求效率）
confidenceThresholds: { high: 0.6, low: 0.3 }

// 自动化任务（最少询问）
confidenceThresholds: { high: 0.5, low: 0.1 }
```

### 2. 两个模块独立配置

Intent Rewriter 和 Reflector 可以使用不同的阈值策略：

```typescript
userPreferences: {
  // 意图识别时较为宽松
  intentRewriterConfidenceThresholds: { high: 0.6, low: 0.3 },
  
  // 反思评估时较为谨慎
  reflectorConfidenceThresholds: { low: 0.5 },
}
```

### 3. 保持向后兼容

如果不配置，使用精心调优的默认值：
- IntentRewriter: `{ high: 0.7, low: 0.4 }`
- Reflector: `{ low: 0.3 }`

---

## 📝 使用方法

### 基础用法（使用默认值）

```typescript
const agent = createStatefulAgent(apiKey, {
  enableIntentRewriting: true,
  enableReflection: true,
  // 不配置，使用默认阈值
});
```

### 自定义阈值

```typescript
const agent = createStatefulAgent(apiKey, {
  enableIntentRewriting: true,
  enableReflection: true,
  userPreferences: {
    intentRewriterConfidenceThresholds: {
      high: 0.8,  // 更严格
      low: 0.5,   // 更容易询问
    },
    reflectorConfidenceThresholds: {
      low: 0.4,   // 反思时也更谨慎
    },
  }
});
```

### 使用预设配置

```typescript
import { createAgentWithPreset, CONFIDENCE_PRESETS } from './agent/confidenceConfig.example';

// 使用预设
const agent = createAgentWithPreset(apiKey, 'expert');

// 或直接使用预设对象
const agent = createStatefulAgent(apiKey, {
  userPreferences: CONFIDENCE_PRESETS.beginner,
});
```

---

## 🧪 测试建议

### 1. 快速功能测试

使用 `CONFIDENCE_TEST_PROMPTS.md` 中的测试用例：

**高置信度测试：**
```
记一笔餐饮支出，早餐 15 元，微信支付
```
→ 应该直接执行，不询问

**低置信度测试：**
```
帮我记一笔
```
→ 应该询问金额和详细信息

### 2. 阈值调优测试

测试不同阈值配置对用户体验的影响：

1. 使用默认配置运行 10 个测试用例
2. 记录询问次数和推测准确率
3. 调整阈值重新测试
4. 选择最佳配置

### 3. A/B 测试

```typescript
// 方案 A：保守
{ high: 0.8, low: 0.5 }

// 方案 B：激进
{ high: 0.6, low: 0.3 }

// 比较用户完成任务的速度和满意度
```

---

## 🔍 关键改进点

### 改进 1：System Prompt 动态化

**之前：** 硬编码阈值在 Prompt 中
```
低置信度（confidence < 0.4）：主动询问
```

**现在：** 动态注入用户配置的阈值
```typescript
.replace(/{{LOW_CONFIDENCE_THRESHOLD}}/g, String(this.config.confidenceThresholds.low))
```

### 改进 2：配置透明化

**之前：** 用户无法控制 Agent 的询问行为

**现在：** 用户可以明确指定阈值，完全掌控决策逻辑

### 改进 3：模块独立性

**之前：** 只有 IntentRewriter 有置信度概念

**现在：** Reflector 也支持置信度驱动决策，两个模块可独立配置

---

## 💡 最佳实践

### 1. 根据用户类型选择预设

```typescript
// 新手用户
createAgentWithPreset(apiKey, 'beginner')

// 老用户
createAgentWithPreset(apiKey, 'expert')
```

### 2. 监控关键指标

```typescript
// 记录询问率
const clarifyRate = clarifyCount / totalRequests;

// 如果 > 30%，降低 low 阈值
// 如果 < 5%，提高 low 阈值
```

### 3. 场景化配置

```typescript
// 记账场景（需要准确）
{ high: 0.7, low: 0.5 }

// 快速笔记（容忍模糊）
{ high: 0.6, low: 0.2 }
```

---

## 🚀 下一步计划

### 短期（可选）

1. **UI 配置界面**：在设置页面添加滑动条调整阈值
2. **智能推荐**：根据用户历史行为自动推荐最佳阈值
3. **统计面板**：显示置信度分布和询问率

### 长期（可选）

1. **自适应学习**：Agent 自动调整阈值以适应用户习惯
2. **场景切换**：不同任务类型使用不同的阈值策略
3. **多维度置信度**：不只是单一分数，细化为多个维度

---

## 📚 相关文档

- [CONFIDENCE_DRIVEN_DECISION_GUIDE.md](CONFIDENCE_DRIVEN_DECISION_GUIDE.md) - 完整功能指南
- [CONFIDENCE_TEST_PROMPTS.md](CONFIDENCE_TEST_PROMPTS.md) - 测试提示词
- [src/agent/confidenceConfig.example.ts](src/agent/confidenceConfig.example.ts) - 配置示例
- [intentRewriter.ts](src/agent/intentRewriter.ts) - 源码实现
- [reflector.ts](src/agent/reflector.ts) - 源码实现

---

## ❓ 常见问题

**Q: 是否必须配置阈值？**  
A: 不必须，默认值已经过调优。只有当你觉得询问太多或太少时才需要调整。

**Q: 如何知道当前的阈值是否合适？**  
A: 观察日志中的置信度分数和 Agent 行为，如果询问率在 10-20% 之间通常是合理的。

**Q: IntentRewriter 和 Reflector 的阈值应该设置为一样吗？**  
A: 不一定。IntentRewriter 在用户输入时决策，可以稍微宽松；Reflector 在执行后评估，可以更谨慎。

**Q: 修改配置需要重启应用吗？**  
A: 需要重新创建 Agent 实例，但不需要重启整个应用。

---

**更新完成！** 🎉
