/**
 * 执行计划生成器
 * 负责解析用户意图，生成多步骤执行计划
 */

import { ExecutionPlan, PlanStep, PlanStepType } from './stateMachine';
import { StructuredToolInterface } from '@langchain/core/tools';

// ============ 权限相关类型（简化版，避免循环依赖） ============

type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

interface ToolPermission {
  toolName: string;
  riskLevel: RiskLevel;
  requiresExplicitConfirmation: boolean;
}

/**
 * 获取工具权限（简化实现）
 */
function getToolPermission(toolName: string): ToolPermission {
  const highRiskTools = ['delete_transaction', 'batch_delete_transactions', 'clear_all_data'];
  const mediumRiskTools = ['update_transaction', 'batch_add_transactions'];
  
  if (highRiskTools.includes(toolName)) {
    return { toolName, riskLevel: 'high', requiresExplicitConfirmation: true };
  }
  if (mediumRiskTools.includes(toolName)) {
    return { toolName, riskLevel: 'medium', requiresExplicitConfirmation: false };
  }
  return { toolName, riskLevel: 'low', requiresExplicitConfirmation: false };
}

/**
 * 检查是否需要确认
 */
function requiresConfirmation(permission: ToolPermission): boolean {
  return permission.requiresExplicitConfirmation || 
         permission.riskLevel === 'high' || 
         permission.riskLevel === 'critical';
}

// ============ 计划模板定义 ============

/**
 * 预定义的任务模板
 */
interface TaskTemplate {
  pattern: RegExp | ((input: string) => boolean);
  name: string;
  description: string;
  generateSteps: (input: string, context: PlanContext) => PlanStep[];
  requiresConfirmation: boolean;
}

/**
 * 计划生成上下文
 */
interface PlanContext {
  availableTools: StructuredToolInterface[];
  toolPermissions: Map<string, ToolPermission>;
  userPreferences?: {
    confirmHighRisk: boolean;  // 高风险操作是否需要确认
    confirmMediumRisk: boolean; // 中风险操作是否需要确认
    batchThreshold: number;    // 批量操作确认阈值
  };
}

/**
 * 计划估算结果
 */
interface PlanEstimate {
  estimatedSteps: number;
  estimatedDuration: string;  // e.g., "约30秒"
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confirmationRequired: boolean;
  warnings: string[];
}

// ============ 默认任务模板 ============

const defaultTemplates: TaskTemplate[] = [
  // 单笔记账
  {
    pattern: /记(一?笔)?(账|录)|添加.*支出|添加.*收入/,
    name: 'single_transaction',
    description: '添加单笔交易记录',
    requiresConfirmation: false,
    generateSteps: (input: string, context: PlanContext) => [
      {
        id: 'step_1',
        type: 'llm_call' as PlanStepType,
        description: '解析用户输入的交易信息',
        status: 'pending',
        dependencies: [],
      },
      {
        id: 'step_2',
        type: 'tool_call' as PlanStepType,
        description: '调用记账工具创建交易',
        toolName: 'add_transaction',
        status: 'pending',
        dependencies: ['step_1'],
      },
      {
        id: 'step_3',
        type: 'llm_call' as PlanStepType,
        description: '生成确认消息',
        status: 'pending',
        dependencies: ['step_2'],
      },
    ],
  },

  // 批量记账
  {
    pattern: /批量|多笔|一起记|导入/,
    name: 'batch_transaction',
    description: '批量添加多笔交易记录',
    requiresConfirmation: true,
    generateSteps: (input: string, context: PlanContext) => [
      {
        id: 'step_1',
        type: 'llm_call' as PlanStepType,
        description: '解析批量交易信息',
        status: 'pending',
        dependencies: [],
      },
      {
        id: 'step_2',
        type: 'confirmation' as PlanStepType,
        description: '确认批量操作内容',
        status: 'pending',
        dependencies: ['step_1'],
      },
      {
        id: 'step_3',
        type: 'tool_call' as PlanStepType,
        description: '执行批量记账',
        toolName: 'batch_add_transactions',
        status: 'pending',
        dependencies: ['step_2'],
      },
      {
        id: 'step_4',
        type: 'llm_call' as PlanStepType,
        description: '生成批量操作结果摘要',
        status: 'pending',
        dependencies: ['step_3'],
      },
    ],
  },

  // 查询统计
  {
    pattern: /查询|统计|报表|分析|总结|汇总|多少钱|花了|收入|支出/,
    name: 'query_analysis',
    description: '查询和分析交易数据',
    requiresConfirmation: false,
    generateSteps: (input: string, context: PlanContext) => [
      {
        id: 'step_1',
        type: 'llm_call' as PlanStepType,
        description: '解析查询条件',
        status: 'pending',
        dependencies: [],
      },
      {
        id: 'step_2',
        type: 'tool_call' as PlanStepType,
        description: '执行数据查询',
        toolName: 'query_transactions',
        status: 'pending',
        dependencies: ['step_1'],
      },
      {
        id: 'step_3',
        type: 'llm_call' as PlanStepType,
        description: '分析数据并生成回复',
        status: 'pending',
        dependencies: ['step_2'],
      },
    ],
  },

  // 删除操作 - 高风险
  {
    pattern: /删除|移除|清空/,
    name: 'delete_transaction',
    description: '删除交易记录',
    requiresConfirmation: true,
    generateSteps: (input: string, context: PlanContext) => [
      {
        id: 'step_1',
        type: 'llm_call' as PlanStepType,
        description: '解析要删除的记录',
        status: 'pending',
        dependencies: [],
      },
      {
        id: 'step_2',
        type: 'tool_call' as PlanStepType,
        description: '查询待删除记录详情',
        toolName: 'query_transactions',
        status: 'pending',
        dependencies: ['step_1'],
      },
      {
        id: 'step_3',
        type: 'confirmation' as PlanStepType,
        description: '确认删除操作',
        status: 'pending',
        dependencies: ['step_2'],
      },
      {
        id: 'step_4',
        type: 'tool_call' as PlanStepType,
        description: '执行删除',
        toolName: 'delete_transaction',
        status: 'pending',
        dependencies: ['step_3'],
      },
      {
        id: 'step_5',
        type: 'llm_call' as PlanStepType,
        description: '确认删除结果',
        status: 'pending',
        dependencies: ['step_4'],
      },
    ],
  },

  // 修改操作
  {
    pattern: /修改|更新|编辑|改成|改为/,
    name: 'update_transaction',
    description: '修改交易记录',
    requiresConfirmation: true,
    generateSteps: (input: string, context: PlanContext) => [
      {
        id: 'step_1',
        type: 'llm_call' as PlanStepType,
        description: '解析修改请求',
        status: 'pending',
        dependencies: [],
      },
      {
        id: 'step_2',
        type: 'tool_call' as PlanStepType,
        description: '查询原记录',
        toolName: 'query_transactions',
        status: 'pending',
        dependencies: ['step_1'],
      },
      {
        id: 'step_3',
        type: 'confirmation' as PlanStepType,
        description: '确认修改内容',
        status: 'pending',
        dependencies: ['step_2'],
      },
      {
        id: 'step_4',
        type: 'tool_call' as PlanStepType,
        description: '执行更新',
        toolName: 'update_transaction',
        status: 'pending',
        dependencies: ['step_3'],
      },
      {
        id: 'step_5',
        type: 'llm_call' as PlanStepType,
        description: '确认更新结果',
        status: 'pending',
        dependencies: ['step_4'],
      },
    ],
  },
];

// ============ 执行计划生成器 ============

export class ExecutionPlanGenerator {
  private templates: TaskTemplate[];
  private context: PlanContext;

  constructor(tools: StructuredToolInterface[], userPreferences?: PlanContext['userPreferences']) {
    this.templates = [...defaultTemplates];
    
    // 构建工具权限映射
    const toolPermissions = new Map<string, ToolPermission>();
    tools.forEach(tool => {
      toolPermissions.set(tool.name, getToolPermission(tool.name));
    });

    this.context = {
      availableTools: tools,
      toolPermissions,
      userPreferences: userPreferences ?? {
        confirmHighRisk: true,
        confirmMediumRisk: false,
        batchThreshold: 5,
      },
    };
  }

  /**
   * 添加自定义任务模板
   */
  addTemplate(template: TaskTemplate): void {
    this.templates.unshift(template); // 自定义模板优先匹配
  }

  /**
   * 根据用户输入生成执行计划
   */
  generatePlan(userInput: string): ExecutionPlan | null {
    // 1. 尝试匹配预定义模板
    const matchedTemplate = this.matchTemplate(userInput);
    
    if (matchedTemplate) {
      return this.createPlanFromTemplate(matchedTemplate, userInput);
    }

    // 2. 如果没有匹配模板，创建通用计划
    return this.createGenericPlan(userInput);
  }

  /**
   * 匹配任务模板
   */
  private matchTemplate(input: string): TaskTemplate | null {
    for (const template of this.templates) {
      if (typeof template.pattern === 'function') {
        if (template.pattern(input)) {
          return template;
        }
      } else if (template.pattern.test(input)) {
        return template;
      }
    }
    return null;
  }

  /**
   * 从模板创建执行计划
   */
  private createPlanFromTemplate(template: TaskTemplate, input: string): ExecutionPlan {
    const steps = template.generateSteps(input, this.context);
    
    // 检查是否需要确认
    const needsConfirmation = this.checkConfirmationRequired(steps, template);

    return {
      id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      description: template.description,
      steps,
      requiresConfirmation: needsConfirmation,
      createdAt: Date.now(),
      metadata: {
        templateName: template.name,
        userInput: input,
      },
    };
  }

  /**
   * 创建通用执行计划（无模板匹配时）
   */
  private createGenericPlan(input: string): ExecutionPlan {
    const steps: PlanStep[] = [
      {
        id: 'step_1',
        type: 'llm_call',
        description: '分析用户请求并确定操作',
        status: 'pending',
        dependencies: [],
      },
    ];

    // 根据输入内容推断可能的工具调用
    const possibleTools = this.inferPossibleTools(input);
    
    if (possibleTools.length > 0) {
      steps.push({
        id: 'step_2',
        type: 'tool_call',
        description: `可能调用: ${possibleTools.join(', ')}`,
        status: 'pending',
        dependencies: ['step_1'],
      });

      // 检查是否有高风险工具
      const hasHighRiskTool = possibleTools.some(toolName => {
        const permission = this.context.toolPermissions.get(toolName);
        return permission && requiresConfirmation(permission);
      });

      if (hasHighRiskTool) {
        steps.splice(1, 0, {
          id: 'step_confirm',
          type: 'confirmation',
          description: '确认高风险操作',
          status: 'pending',
          dependencies: ['step_1'],
        });
        // 更新依赖
        steps[2].dependencies = ['step_confirm'];
      }
    }

    steps.push({
      id: `step_${steps.length + 1}`,
      type: 'llm_call',
      description: '生成响应',
      status: 'pending',
      dependencies: [steps[steps.length - 1].id],
    });

    return {
      id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      description: '执行用户请求',
      steps,
      requiresConfirmation: false,
      createdAt: Date.now(),
      metadata: {
        templateName: 'generic',
        userInput: input,
        inferredTools: possibleTools,
      },
    };
  }

  /**
   * 推断可能使用的工具
   */
  private inferPossibleTools(input: string): string[] {
    const tools: string[] = [];
    const lowerInput = input.toLowerCase();

    // 简单的关键词匹配
    const toolKeywords: Record<string, string[]> = {
      'add_transaction': ['记账', '添加', '记录', '花了', '收入', '支出', '买了'],
      'query_transactions': ['查询', '查看', '统计', '多少', '哪些', '列表', '记录'],
      'delete_transaction': ['删除', '移除', '取消'],
      'update_transaction': ['修改', '更新', '编辑', '改'],
      'get_categories': ['分类', '类别', '类型'],
      'get_statistics': ['统计', '报表', '分析', '总结', '汇总'],
    };

    for (const [toolName, keywords] of Object.entries(toolKeywords)) {
      if (keywords.some(kw => lowerInput.includes(kw))) {
        // 确保工具存在
        if (this.context.availableTools.some(t => t.name === toolName)) {
          tools.push(toolName);
        }
      }
    }

    return tools;
  }

  /**
   * 检查是否需要用户确认
   */
  private checkConfirmationRequired(steps: PlanStep[], template: TaskTemplate): boolean {
    // 模板级别要求确认
    if (template.requiresConfirmation) {
      return true;
    }

    // 检查步骤中是否有确认步骤
    if (steps.some(step => step.type === 'confirmation')) {
      return true;
    }

    // 检查工具风险级别
    const { userPreferences, toolPermissions } = this.context;
    
    for (const step of steps) {
      if (step.type === 'tool_call' && step.toolName) {
        const permission = toolPermissions.get(step.toolName);
        if (permission) {
          if (permission.riskLevel === 'critical') {
            return true;
          }
          if (permission.riskLevel === 'high' && userPreferences?.confirmHighRisk) {
            return true;
          }
          if (permission.riskLevel === 'medium' && userPreferences?.confirmMediumRisk) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * 估算计划执行情况
   */
  estimatePlan(plan: ExecutionPlan): PlanEstimate {
    const warnings: string[] = [];
    let maxRisk: PlanEstimate['riskLevel'] = 'low';

    // 统计步骤
    const llmCalls = plan.steps.filter(s => s.type === 'llm_call').length;
    const toolCalls = plan.steps.filter(s => s.type === 'tool_call').length;
    const confirmations = plan.steps.filter(s => s.type === 'confirmation').length;

    // 估算时间
    const estimatedSeconds = llmCalls * 3 + toolCalls * 2 + confirmations * 10;
    const estimatedDuration = estimatedSeconds < 60 
      ? `约${estimatedSeconds}秒`
      : `约${Math.ceil(estimatedSeconds / 60)}分钟`;

    // 检查风险
    for (const step of plan.steps) {
      if (step.type === 'tool_call' && step.toolName) {
        const permission = this.context.toolPermissions.get(step.toolName);
        if (permission) {
          if (permission.riskLevel === 'critical') {
            maxRisk = 'critical';
            warnings.push(`⚠️ 包含关键操作: ${step.description}`);
          } else if (permission.riskLevel === 'high' && maxRisk !== 'critical') {
            maxRisk = 'high';
            warnings.push(`⚠️ 包含高风险操作: ${step.description}`);
          } else if (permission.riskLevel === 'medium' && maxRisk === 'low') {
            maxRisk = 'medium';
          }
        }
      }
    }

    return {
      estimatedSteps: plan.steps.length,
      estimatedDuration,
      riskLevel: maxRisk,
      confirmationRequired: plan.requiresConfirmation,
      warnings,
    };
  }

  /**
   * 优化执行计划 - 合并可并行步骤
   */
  optimizePlan(plan: ExecutionPlan): ExecutionPlan {
    // 识别可以并行执行的步骤
    const optimizedSteps: PlanStep[] = [];
    const pendingSteps = [...plan.steps];

    while (pendingSteps.length > 0) {
      const step = pendingSteps.shift()!;
      
      // 检查是否有可以并行的后续步骤
      const parallelSteps = pendingSteps.filter(s => 
        !s.dependencies.includes(step.id) && 
        !step.dependencies.some(d => s.dependencies.includes(d))
      );

      optimizedSteps.push(step);

      // 标记并行步骤（实际执行时可以并行）
      if (parallelSteps.length > 0 && step.type === 'tool_call') {
        step.metadata = { ...step.metadata, canParallelize: true };
      }
    }

    return {
      ...plan,
      steps: optimizedSteps,
    };
  }

  /**
   * 验证执行计划
   */
  validatePlan(plan: ExecutionPlan): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 检查步骤ID唯一性
    const ids = plan.steps.map(s => s.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      errors.push('存在重复的步骤ID');
    }

    // 检查依赖有效性
    for (const step of plan.steps) {
      for (const dep of step.dependencies) {
        if (!ids.includes(dep)) {
          errors.push(`步骤 ${step.id} 依赖不存在的步骤 ${dep}`);
        }
      }
    }

    // 检查循环依赖
    if (this.hasCircularDependency(plan.steps)) {
      errors.push('存在循环依赖');
    }

    // 检查工具存在性
    for (const step of plan.steps) {
      if (step.type === 'tool_call' && step.toolName) {
        if (!this.context.availableTools.some(t => t.name === step.toolName)) {
          errors.push(`工具 ${step.toolName} 不存在`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 检查循环依赖
   */
  private hasCircularDependency(steps: PlanStep[]): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const stepMap = new Map(steps.map(s => [s.id, s]));

    const dfs = (stepId: string): boolean => {
      visited.add(stepId);
      recursionStack.add(stepId);

      const step = stepMap.get(stepId);
      if (step) {
        for (const dep of step.dependencies) {
          if (!visited.has(dep)) {
            if (dfs(dep)) return true;
          } else if (recursionStack.has(dep)) {
            return true;
          }
        }
      }

      recursionStack.delete(stepId);
      return false;
    };

    for (const step of steps) {
      if (!visited.has(step.id)) {
        if (dfs(step.id)) return true;
      }
    }

    return false;
  }

  /**
   * 格式化计划为可读文本
   */
  formatPlanForDisplay(plan: ExecutionPlan): string {
    const estimate = this.estimatePlan(plan);
    
    let output = `📋 **执行计划**: ${plan.description}\n\n`;
    output += `⏱️ 预估: ${estimate.estimatedSteps}个步骤, ${estimate.estimatedDuration}\n`;
    output += `🎯 风险级别: ${this.getRiskLabel(estimate.riskLevel)}\n`;
    
    if (estimate.warnings.length > 0) {
      output += `\n${estimate.warnings.join('\n')}\n`;
    }

    output += '\n**步骤详情:**\n';
    
    plan.steps.forEach((step, index) => {
      const icon = this.getStepIcon(step.type);
      const status = this.getStatusIcon(step.status);
      output += `${index + 1}. ${icon} ${step.description} ${status}\n`;
      
      if (step.toolName) {
        output += `   └─ 工具: ${step.toolName}\n`;
      }
    });

    if (plan.requiresConfirmation) {
      output += '\n⚠️ **需要您的确认才能执行**\n';
    }

    return output;
  }

  private getStepIcon(type: PlanStepType): string {
    switch (type) {
      case 'llm_call': return '🤖';
      case 'tool_call': return '🔧';
      case 'confirmation': return '✋';
      default: return '•';
    }
  }

  private getStatusIcon(status: PlanStep['status']): string {
    switch (status) {
      case 'pending': return '⏳';
      case 'running': return '🔄';
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'skipped': return '⏭️';
      default: return '';
    }
  }

  private getRiskLabel(level: PlanEstimate['riskLevel']): string {
    switch (level) {
      case 'low': return '🟢 低';
      case 'medium': return '🟡 中';
      case 'high': return '🟠 高';
      case 'critical': return '🔴 关键';
      default: return level;
    }
  }
}

// ============ 导出工厂函数 ============

export function createPlanGenerator(
  tools: StructuredToolInterface[],
  userPreferences?: PlanContext['userPreferences']
): ExecutionPlanGenerator {
  return new ExecutionPlanGenerator(tools, userPreferences);
}

// 重新导出类型
export type { TaskTemplate, PlanContext, PlanEstimate };
