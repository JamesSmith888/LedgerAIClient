# 置信度驱动决策功能指南

## 功能概述

**置信度驱动决策**是 AI Agent 的核心特性之一，允许模型根据对用户意图的理解程度自主决定：
- 🚀 **直接执行**：当信息完整且置信度高时
- 🤔 **合理推测后执行**：当部分信息缺失但可推断时
- ❓ **主动询问用户**：当关键信息严重缺失时

该功能已在以下模块中实现：
1. **Intent Rewriter（意图改写器）**：预处理用户输入，决定是否需要澄清
2. **Reflector（反思器）**：执行步骤后评估，决定是否需要用户介入

## 配置方式

### 1. Intent Rewriter 置信度阈值配置

```typescript
const agent = createStatefulAgent(apiKey, {
  enableIntentRewriting: true,
  userPreferences: {
    intentRewriterConfidenceThresholds: {
      high: 0.7,  // >= 0.7：直接执行（默认）
      low: 0.4,   // < 0.4：询问用户（默认）
      // 0.4-0.7：合理推测后执行
    }
  }
});
```

**阈值调整指南：**
- **更激进**（减少询问）：将 `low` 降低到 `0.2-0.3`
- **更保守**（多询问）：将 `low` 提高到 `0.5-0.6`
- **适合快速用户**：`high: 0.6, low: 0.3`
- **适合谨慎用户**：`high: 0.8, low: 0.5`

### 2. Reflector 置信度阈值配置

```typescript
const agent = createStatefulAgent(apiKey, {
  enableReflection: true,
  reflectorConfig: {
    confidenceThresholds: {
      low: 0.3,  // < 0.3：建议 ask_user（默认）
      // >= 0.3：可以继续执行或调整策略
    }
  }
});
```

**使用场景：**
- **自动化任务**：设置为 `0.1`，减少人工介入
- **关键业务**：设置为 `0.5`，增强人工审核

## 测试用例

### 测试类别 1：信息完整度测试（Intent Rewriter）

#### ✅ 高置信度场景（应直接执行）

```typescript
// 测试 1: 完整的记账信息
"记一笔餐饮支出，早餐 15 元，微信支付"
// 预期：confidence >= 0.7，intentType: "create"
```

```typescript
// 测试 2: 明确的查询请求
"查询本月餐饮类的支出总额"
// 预期：confidence >= 0.7，intentType: "query"
```

```typescript
// 测试 3: 带时间范围的统计
"统计上周的交通支出"
// 预期：confidence >= 0.7，intentType: "statistics"
```

#### 🤔 中置信度场景（应推测后执行）

```typescript
// 测试 4: 缺少分类（可推断）
"花了 50 块打车"
// 预期：confidence 0.4-0.7，自动推断分类为"交通"
```

```typescript
// 测试 5: 缺少支付方式（可默认）
"午餐花了 35 元"
// 预期：confidence 0.4-0.7，使用默认支付方式，分类推断为"餐饮"
```

```typescript
// 测试 6: 模糊的时间描述（可推断）
"查一下最近的消费"
// 预期：confidence 0.4-0.7，默认查询最近7天
```

#### ❓ 低置信度场景（应询问用户）

```typescript
// 测试 7: 完全没有金额
"帮我记一笔"
// 预期：confidence < 0.4，intentType: "clarify"
// clarifyQuestion: "好的，请告诉我这笔消费的金额是多少？花在什么上面了？"
```

```typescript
// 测试 8: 目标不明确的查询
"查一下"
// 预期：confidence < 0.4，intentType: "clarify"
// clarifyQuestion: "您想查询什么呢？比如最近的消费记录、某个分类的支出、或者本月统计？"
```

```typescript
// 测试 9: 模糊的删除请求
"删除那条记录"
// 预期：confidence < 0.4，intentType: "clarify"
// clarifyQuestion: "请问您要删除哪一条记录？可以告诉我具体的时间、金额或描述吗？"
```

```typescript
// 测试 10: 无法判断类型
"50"
// 预期：confidence < 0.4，intentType: "clarify"
// clarifyQuestion: "请问这 50 元是支出还是收入？用在什么地方了？"
```

### 测试类别 2：对话上下文理解测试

```typescript
// 测试 11: 上下文补充金额
// 第一轮：用户："记一笔餐饮"
// Agent 询问："请问金额是多少？"
// 第二轮：用户："30"
// 预期：应理解 30 是金额，confidence >= 0.7
```

```typescript
// 测试 12: 上下文补充时间范围
// 第一轮：用户："查询餐饮支出"
// Agent 询问："查询什么时间范围的？"
// 第二轮：用户："本月"
// 预期：应理解"本月"是时间范围，confidence >= 0.7
```

### 测试类别 3：批量操作测试

```typescript
// 测试 13: 多条记录（应识别为 batch）
"今天买菜 50，打车 20，午餐 35"
// 预期：intentType: "batch"，items.length = 3
```

### 测试类别 4：置信度阈值调整测试

#### 使用宽松阈值（low: 0.2）

```typescript
// 测试 14: 边界情况 - 只有金额和模糊描述
"花了 100 买东西"
// 宽松阈值：应推测为"购物"，confidence 0.3-0.5，直接执行
// 默认阈值：可能询问用户
```

#### 使用严格阈值（low: 0.6）

```typescript
// 测试 15: 边界情况 - 缺少支付方式
"午餐 35 元"
// 严格阈值：可能询问用户确认支付方式
// 默认阈值：应推测后执行
```

### 测试类别 5：Reflector 置信度测试

这部分需要配合实际执行流程测试，以下是测试思路：

```typescript
// 测试 16: 工具调用失败后的反思
// 场景：调用统计接口失败（接口不存在）
// 低置信度 Reflector（low: 0.3）：
//   - 如果 confidence < 0.3，应建议 nextAction: "ask_user"
//   - thought: "统计接口调用失败，不确定如何继续，建议询问用户"
// 高置信度 Reflector（low: 0.1）：
//   - 应建议 nextAction: "adjust_strategy"
//   - correctionHint: "改用 query 接口查询数据后手动计算"
```

## 测试执行方法

### 方法 1：在 AgentScreen 中测试

1. 启动应用
2. 进入 AI Agent 聊天界面
3. 依次输入测试用例
4. 观察：
   - Agent 是否正确识别意图
   - 是否在正确的时机询问用户
   - 置信度分数是否合理

### 方法 2：单元测试（推荐）

创建测试文件 `intentRewriter.test.ts`：

```typescript
import { createIntentRewriter } from './intentRewriter';

describe('Confidence Driven Decision', () => {
  const rewriter = createIntentRewriter({
    confidenceThresholds: {
      high: 0.7,
      low: 0.4,
    }
  });
  
  beforeAll(() => {
    rewriter.initialize('YOUR_API_KEY');
  });

  test('高置信度：完整记账信息', async () => {
    const result = await rewriter.rewrite(
      "记一笔餐饮支出，早餐 15 元，微信支付"
    );
    
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    expect(result.intentType).toBe('create');
    expect(result.extractedInfo.amount).toBe(15);
  });

  test('低置信度：无金额信息', async () => {
    const result = await rewriter.rewrite("帮我记一笔");
    
    expect(result.confidence).toBeLessThan(0.4);
    expect(result.intentType).toBe('clarify');
    expect(result.clarifyQuestion).toBeTruthy();
  });
});
```

## 最佳实践

### 1. 根据用户类型调整

```typescript
// 新手用户（需要更多指导）
intentRewriterConfidenceThresholds: {
  high: 0.8,
  low: 0.5,
}

// 熟练用户（追求效率）
intentRewriterConfidenceThresholds: {
  high: 0.6,
  low: 0.3,
}
```

### 2. 根据任务类型调整

```typescript
// 金融记账（需要准确）
intentRewriterConfidenceThresholds: {
  high: 0.7,
  low: 0.5,
}

// 快速笔记（容忍模糊）
intentRewriterConfidenceThresholds: {
  high: 0.6,
  low: 0.2,
}
```

### 3. 动态调整策略

可以根据用户反馈动态调整：

```typescript
// 如果用户频繁修正 Agent 的推测
// → 提高 low 阈值，增加询问频率

// 如果用户抱怨询问太多
// → 降低 low 阈值，减少询问
```

## 监控和优化

### 关键指标

1. **澄清率**：intentType === 'clarify' 的比例
   - 过高（>30%）：阈值可能太严格
   - 过低（<5%）：阈值可能太宽松

2. **推测准确率**：中置信度时推测的正确率
   - 通过用户后续修正来统计

3. **用户满意度**：
   - 任务完成速度
   - 修正次数

### 日志分析

查看控制台日志：

```
📝 [IntentRewriter] Processing input: 帮我记一笔
📝 [IntentRewriter] Result: {
  intentType: "clarify",
  confidence: 0.25,
  clarifyQuestion: "好的，请告诉我这笔消费的金额是多少？"
}
```

## 常见问题

### Q1: 为什么有时候应该询问却没有询问？

**可能原因：**
- `low` 阈值设置太低（如 0.1）
- 模型错误地给出了高置信度

**解决方案：**
- 提高 `low` 阈值到 0.4-0.5
- 检查 System Prompt 是否正确注入了阈值

### Q2: 为什么询问太频繁？

**可能原因：**
- `low` 阈值设置太高（如 0.6）
- 模型过于保守

**解决方案：**
- 降低 `low` 阈值到 0.3-0.4
- 在 System Prompt 中鼓励合理推测

### Q3: 置信度分数不准确？

**可能原因：**
- 模型温度（temperature）设置不当
- System Prompt 没有清晰定义置信度标准

**解决方案：**
- 使用 temperature: 0（已配置）
- 优化 System Prompt 中的置信度判断标准

## 扩展阅读

- [intentRewriter.ts](src/agent/intentRewriter.ts) - 意图改写器实现
- [reflector.ts](src/agent/reflector.ts) - 反思器实现
- [statefulAgent.ts](src/agent/statefulAgent.ts) - 状态机 Agent 集成
- [AGENT_ARCHITECTURE_IMPROVEMENT.md](AGENT_ARCHITECTURE_IMPROVEMENT.md) - Agent 架构设计

---

**版本：** 1.0  
**最后更新：** 2025-12-12  
**作者：** AI Agent Team
