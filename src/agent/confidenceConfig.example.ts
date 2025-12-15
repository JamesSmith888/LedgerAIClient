/**
 * 置信度驱动决策配置示例
 * 
 * 演示如何在不同场景下配置置信度阈值
 */

import { createStatefulAgent } from './statefulAgent';

// 示例用的 API Key（实际使用时替换为真实的 key）
const EXAMPLE_API_KEY = 'YOUR_API_KEY_HERE';

// ============ 场景 1: 默认配置（推荐） ============

const defaultAgent = createStatefulAgent(EXAMPLE_API_KEY, {
  enableIntentRewriting: true,
  enableReflection: true,
  userPreferences: {
    // 使用默认值，无需显式配置
    // intentRewriterConfidenceThresholds: { high: 0.7, low: 0.4 }
    // reflectorConfidenceThresholds: { low: 0.3 }
  }
});

// ============ 场景 2: 新手用户（更多指导） ============

const beginnerAgent = createStatefulAgent(EXAMPLE_API_KEY, {
  enableIntentRewriting: true,
  enableReflection: true,
  userPreferences: {
    // 提高阈值，增加询问频率
    intentRewriterConfidenceThresholds: {
      high: 0.8,  // 更高的标准才直接执行
      low: 0.5,   // 更容易触发询问
    },
    reflectorConfidenceThresholds: {
      low: 0.5,   // 更容易建议询问用户
    },
  }
});

// ============ 场景 3: 熟练用户（追求效率） ============

const expertAgent = createStatefulAgent(EXAMPLE_API_KEY, {
  enableIntentRewriting: true,
  enableReflection: true,
  userPreferences: {
    // 降低阈值，减少询问
    intentRewriterConfidenceThresholds: {
      high: 0.6,  // 更宽松的标准
      low: 0.3,   // 不太容易询问
    },
    reflectorConfidenceThresholds: {
      low: 0.2,   // 倾向于自主决策
    },
  }
});

// ============ 场景 4: 自动化任务（最小人工介入） ============

const automationAgent = createStatefulAgent(EXAMPLE_API_KEY, {
  enableIntentRewriting: true,
  enableReflection: true,
  userPreferences: {
    intentRewriterConfidenceThresholds: {
      high: 0.5,  // 很宽松
      low: 0.1,   // 几乎不询问
    },
    reflectorConfidenceThresholds: {
      low: 0.1,   // 极少建议询问
    },
  }
});

// ============ 场景 5: 关键业务（最大谨慎度） ============

const criticalAgent = createStatefulAgent(EXAMPLE_API_KEY, {
  enableIntentRewriting: true,
  enableReflection: true,
  userPreferences: {
    intentRewriterConfidenceThresholds: {
      high: 0.9,  // 非常严格
      low: 0.6,   // 很容易询问
    },
    reflectorConfidenceThresholds: {
      low: 0.6,   // 倾向于人工确认
    },
    // 同时启用所有确认
    confirmHighRisk: true,
    confirmMediumRisk: true,
  }
});

// ============ 场景 6: A/B 测试配置 ============

const experimentalAgent = createStatefulAgent(EXAMPLE_API_KEY, {
  enableIntentRewriting: true,
  enableReflection: true,
  userPreferences: {
    intentRewriterConfidenceThresholds: {
      // 测试不同的阈值组合
      high: 0.65,
      low: 0.35,
    },
  }
});

// ============ 动态调整示例 ============

class AdaptiveAgent {
  private agent: any;
  private clarifyCount = 0;
  private totalRequests = 0;

  constructor(apiKey: string) {
    this.agent = createStatefulAgent(apiKey, {
      enableIntentRewriting: true,
      userPreferences: {
        intentRewriterConfidenceThresholds: {
          high: 0.7,
          low: 0.4,
        },
      }
    });
  }

  /**
   * 根据使用情况动态调整阈值
   */
  adjustThresholds() {
    this.totalRequests++;
    const clarifyRate = this.clarifyCount / this.totalRequests;

    if (clarifyRate > 0.3) {
      // 询问太多，降低 low 阈值
      console.log('📊 调整策略：降低询问频率');
      this.agent = createStatefulAgent(this.agent.apiKey, {
        enableIntentRewriting: true,
        userPreferences: {
          intentRewriterConfidenceThresholds: {
            high: 0.7,
            low: 0.3,  // 降低
          },
        }
      });
    } else if (clarifyRate < 0.05) {
      // 询问太少，提高 low 阈值
      console.log('📊 调整策略：提高询问频率');
      this.agent = createStatefulAgent(this.agent.apiKey, {
        enableIntentRewriting: true,
        userPreferences: {
          intentRewriterConfidenceThresholds: {
            high: 0.7,
            low: 0.5,  // 提高
          },
        }
      });
    }
  }

  recordClarify() {
    this.clarifyCount++;
  }
}

// ============ 导出配置预设 ============

export const CONFIDENCE_PRESETS = {
  // 默认（推荐）
  default: {
    intentRewriterConfidenceThresholds: { high: 0.7, low: 0.4 },
    reflectorConfidenceThresholds: { low: 0.3 },
  },
  
  // 新手友好
  beginner: {
    intentRewriterConfidenceThresholds: { high: 0.8, low: 0.5 },
    reflectorConfidenceThresholds: { low: 0.5 },
  },
  
  // 专家模式
  expert: {
    intentRewriterConfidenceThresholds: { high: 0.6, low: 0.3 },
    reflectorConfidenceThresholds: { low: 0.2 },
  },
  
  // 自动化
  automation: {
    intentRewriterConfidenceThresholds: { high: 0.5, low: 0.1 },
    reflectorConfidenceThresholds: { low: 0.1 },
  },
  
  // 严格模式
  strict: {
    intentRewriterConfidenceThresholds: { high: 0.9, low: 0.6 },
    reflectorConfidenceThresholds: { low: 0.6 },
  },
};

// ============ 使用预设的便捷方法 ============

export function createAgentWithPreset(
  apiKey: string,
  preset: keyof typeof CONFIDENCE_PRESETS,
  additionalOptions?: any
) {
  return createStatefulAgent(apiKey, {
    enableIntentRewriting: true,
    enableReflection: true,
    userPreferences: {
      ...CONFIDENCE_PRESETS[preset],
      ...additionalOptions?.userPreferences,
    },
    ...additionalOptions,
  });
}

// 使用示例
// const agent = createAgentWithPreset('YOUR_API_KEY', 'expert');
