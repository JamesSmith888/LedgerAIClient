/**
 * Agent 状态机
 * 
 * 管理 Agent 执行的完整生命周期：
 * 1. IDLE → PARSING → PLANNING → EXECUTING → SUMMARIZING → COMPLETED
 * 2. 支持 Human-in-the-Loop：AWAITING_CONFIRMATION 状态
 * 3. 错误处理和状态恢复
 * 
 * 状态流转图：
 * 
 *   ┌─────────────────────────────────────────────────┐
 *   │                                                 │
 *   ▼                                                 │
 * IDLE ──► PARSING ──► PLANNING ──► EXECUTING ──► SUMMARIZING ──► COMPLETED
 *   ▲                       │            │
 *   │                       ▼            │
 *   │              AWAITING_CONFIRMATION │
 *   │                       │            │
 *   │                       ├──confirm──►│
 *   │                       │            │
 *   └────────reject─────────┘            │
 *   ▲                                    │
 *   │                                    │
 *   └──────────────ERROR◄────────────────┘
 */

/**
 * Agent 执行状态
 */
export enum AgentState {
  /** 空闲状态，等待用户输入 */
  IDLE = 'idle',
  
  /** 解析用户意图 */
  PARSING = 'parsing',
  
  /** 生成执行计划 */
  PLANNING = 'planning',
  
  /** 等待用户确认（Human-in-the-Loop） */
  AWAITING_CONFIRMATION = 'awaiting_confirmation',
  
  /** 执行工具调用 */
  EXECUTING = 'executing',
  
  /** 反思/评估当前进度（ReAct 模式） */
  REFLECTING = 'reflecting',
  
  /** 总结执行结果 */
  SUMMARIZING = 'summarizing',
  
  /** 执行完成 */
  COMPLETED = 'completed',
  
  /** 执行出错 */
  ERROR = 'error',
  
  /** 已取消 */
  CANCELLED = 'cancelled',
}

/**
 * 状态元数据
 */
export interface StateMetadata {
  /** 进入当前状态的时间 */
  enteredAt: Date;
  /** 上一个状态 */
  previousState?: AgentState;
  /** 附加数据 */
  data?: Record<string, any>;
  /** 错误信息（ERROR 状态） */
  error?: {
    message: string;
    code?: string;
    recoverable?: boolean;
  };
}

/**
 * 计划步骤类型
 */
export type PlanStepType = 'llm_call' | 'tool_call' | 'confirmation';

/**
 * 执行计划步骤
 */
export interface PlanStep {
  /** 步骤 ID */
  id: string;
  /** 步骤类型 */
  type: PlanStepType;
  /** 步骤描述（用户可读） */
  description: string;
  /** 要调用的工具名称（type='tool_call'时使用） */
  toolName?: string;
  /** 工具参数 */
  args?: Record<string, any>;
  /** 依赖的步骤 ID */
  dependencies: string[];
  /** 步骤状态 */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  /** 执行结果 */
  result?: any;
  /** 错误信息 */
  error?: string;
  /** 开始时间 */
  startedAt?: Date;
  /** 完成时间 */
  completedAt?: Date;
  /** 是否需要确认 */
  requiresConfirmation?: boolean;
  /** 附加元数据 */
  metadata?: Record<string, any>;
}

/**
 * 执行计划
 */
export interface ExecutionPlan {
  /** 计划 ID */
  id: string;
  /** 计划描述 */
  description: string;
  /** 执行步骤 */
  steps: PlanStep[];
  /** 是否需要用户确认 */
  requiresConfirmation: boolean;
  /** 创建时间 */
  createdAt: Date | number;
  /** 状态 */
  status?: 'pending' | 'confirmed' | 'rejected' | 'executing' | 'completed' | 'failed';
  /** 用户原始请求 */
  userRequest?: string;
  /** 确认原因（如果需要确认） */
  confirmationReason?: string;
  /** 预计执行时间（毫秒） */
  estimatedDuration?: number;
  /** 附加元数据 */
  metadata?: Record<string, any>;
}

/**
 * 确认请求
 */
export interface ConfirmationRequest {
  /** 请求 ID */
  id: string;
  /** 确认类型 */
  type: 'plan_confirmation' | 'dangerous_action' | 'data_modification' | 'external_api';
  /** 标题 */
  title: string;
  /** 描述 */
  description: string;
  /** 详细信息 */
  details?: {
    /** 将要执行的操作 */
    actions?: string[];
    /** 影响范围 */
    impact?: string;
    /** 警告信息 */
    warnings?: string[];
  };
  /** 关联的计划（如果有） */
  plan?: ExecutionPlan;
  /** 关联的步骤（如果是单步确认） */
  step?: PlanStep;
  /** 操作按钮配置 */
  actions: {
    confirm: {
      label: string;
      style: 'primary' | 'danger';
    };
    cancel: {
      label: string;
    };
    modify?: {
      label: string;
    };
  };
  /** 创建时间 */
  createdAt: Date;
  /** 超时时间（毫秒） */
  timeout?: number;
}

/**
 * 状态变更事件
 */
export interface StateChangeEvent {
  /** 之前的状态 */
  from: AgentState;
  /** 当前状态 */
  to: AgentState;
  /** 元数据 */
  metadata: StateMetadata;
  /** 时间戳 */
  timestamp: Date;
}

/**
 * 状态监听器
 */
export type StateListener = (event: StateChangeEvent) => void;

/**
 * Agent 状态机
 * 
 * 管理 Agent 的执行状态和生命周期
 */
export class AgentStateMachine {
  private state: AgentState = AgentState.IDLE;
  private metadata: StateMetadata;
  private plan: ExecutionPlan | null = null;
  private confirmationRequest: ConfirmationRequest | null = null;
  private listeners: Set<StateListener> = new Set();
  private stateHistory: StateChangeEvent[] = [];
  
  constructor() {
    this.metadata = {
      enteredAt: new Date(),
    };
  }
  
  // ============ 状态查询 ============
  
  /**
   * 获取当前状态
   */
  getState(): AgentState {
    return this.state;
  }
  
  /**
   * 获取状态元数据
   */
  getMetadata(): StateMetadata {
    return { ...this.metadata };
  }
  
  /**
   * 获取当前执行计划
   */
  getPlan(): ExecutionPlan | null {
    return this.plan ? { ...this.plan } : null;
  }
  
  /**
   * 获取当前确认请求
   */
  getConfirmationRequest(): ConfirmationRequest | null {
    return this.confirmationRequest ? { ...this.confirmationRequest } : null;
  }
  
  /**
   * 获取状态历史
   */
  getStateHistory(): StateChangeEvent[] {
    return [...this.stateHistory];
  }
  
  /**
   * 检查是否处于特定状态
   */
  isInState(state: AgentState): boolean {
    return this.state === state;
  }
  
  /**
   * 检查是否处于活跃状态（非终态）
   */
  isActive(): boolean {
    return ![
      AgentState.IDLE,
      AgentState.COMPLETED,
      AgentState.ERROR,
      AgentState.CANCELLED,
    ].includes(this.state);
  }
  
  /**
   * 检查是否等待用户输入
   */
  isAwaitingInput(): boolean {
    return this.state === AgentState.AWAITING_CONFIRMATION;
  }
  
  // ============ 状态转换 ============
  
  /**
   * 执行状态转换（公共方法）
   */
  transition(newState: AgentState, data?: Record<string, any>, error?: StateMetadata['error']): boolean {
    const previousState = this.state;
    
    // 验证状态转换是否合法
    if (!this.canTransitionTo(newState)) {
      console.warn(`🚫 [StateMachine] Invalid transition: ${previousState} → ${newState}`);
      return false;
    }
    
    // 更新状态
    this.state = newState;
    this.metadata = {
      enteredAt: new Date(),
      previousState,
      data,
      error,
    };
    
    // 记录历史
    const event: StateChangeEvent = {
      from: previousState,
      to: newState,
      metadata: this.metadata,
      timestamp: new Date(),
    };
    this.stateHistory.push(event);
    
    // 限制历史长度
    if (this.stateHistory.length > 100) {
      this.stateHistory = this.stateHistory.slice(-100);
    }
    
    console.log(`🔄 [StateMachine] ${previousState} → ${newState}`, data || '');
    
    // 通知监听器
    this.notifyListeners(event);
    
    return true;
  }
  
  /**
   * 检查是否可以转换到目标状态
   */
  private canTransitionTo(targetState: AgentState): boolean {
    const validTransitions: Record<AgentState, AgentState[]> = {
      [AgentState.IDLE]: [AgentState.PARSING],
      // PARSING 可以跳过 PLANNING 直接到 EXECUTING（简单任务），也可以进入 PLANNING（复杂任务）
      [AgentState.PARSING]: [AgentState.PLANNING, AgentState.EXECUTING, AgentState.AWAITING_CONFIRMATION, AgentState.ERROR, AgentState.CANCELLED],
      [AgentState.PLANNING]: [AgentState.AWAITING_CONFIRMATION, AgentState.EXECUTING, AgentState.ERROR, AgentState.CANCELLED],
      [AgentState.AWAITING_CONFIRMATION]: [AgentState.EXECUTING, AgentState.IDLE, AgentState.COMPLETED, AgentState.ERROR, AgentState.CANCELLED],
      // EXECUTING 可以转换到 REFLECTING（反思模式）
      [AgentState.EXECUTING]: [AgentState.SUMMARIZING, AgentState.REFLECTING, AgentState.AWAITING_CONFIRMATION, AgentState.ERROR, AgentState.CANCELLED],
      // REFLECTING 可以继续执行、调整策略或完成
      [AgentState.REFLECTING]: [AgentState.EXECUTING, AgentState.SUMMARIZING, AgentState.AWAITING_CONFIRMATION, AgentState.ERROR, AgentState.CANCELLED],
      [AgentState.SUMMARIZING]: [AgentState.COMPLETED, AgentState.ERROR, AgentState.CANCELLED],
      // 允许从终态直接开始新对话（无需手动重置到 IDLE）
      [AgentState.COMPLETED]: [AgentState.IDLE, AgentState.PARSING],
      [AgentState.ERROR]: [AgentState.IDLE, AgentState.PARSING],
      [AgentState.CANCELLED]: [AgentState.IDLE, AgentState.PARSING],
    };
    
    return validTransitions[this.state]?.includes(targetState) ?? false;
  }
  
  // ============ 状态操作 ============
  
  /**
   * 开始解析用户请求
   */
  startParsing(userRequest: string): void {
    this.transition(AgentState.PARSING, { userRequest });
  }
  
  /**
   * 开始规划
   */
  startPlanning(): void {
    this.transition(AgentState.PLANNING);
  }
  
  /**
   * 设置执行计划
   */
  setPlan(plan: ExecutionPlan): void {
    this.plan = plan;
    
    if (plan.requiresConfirmation) {
      // 需要确认，创建确认请求
      this.confirmationRequest = {
        id: `confirm_${Date.now()}`,
        type: 'plan_confirmation',
        title: '确认执行计划',
        description: plan.description,
        details: {
          actions: plan.steps.map(s => s.description),
          impact: plan.confirmationReason,
        },
        plan: plan,
        actions: {
          confirm: { label: '确认执行', style: 'primary' },
          cancel: { label: '取消' },
        },
        createdAt: new Date(),
        timeout: 60000, // 60 秒超时
      };
      this.transition(AgentState.AWAITING_CONFIRMATION, { planId: plan.id });
    } else {
      // 无需确认，直接开始执行
      this.transition(AgentState.EXECUTING, { planId: plan.id });
    }
  }
  
  /**
   * 请求用户确认（单个危险操作）
   */
  requestConfirmation(request: Omit<ConfirmationRequest, 'id' | 'createdAt'>): void {
    this.confirmationRequest = {
      ...request,
      id: `confirm_${Date.now()}`,
      createdAt: new Date(),
    };
    this.transition(AgentState.AWAITING_CONFIRMATION, { 
      confirmationType: request.type,
      toolName: request.step?.toolName,
    });
  }
  
  /**
   * 用户确认
   */
  confirm(): void {
    if (this.state !== AgentState.AWAITING_CONFIRMATION) {
      console.warn('🚫 [StateMachine] Cannot confirm: not in AWAITING_CONFIRMATION state');
      return;
    }
    
    if (this.plan) {
      this.plan.status = 'confirmed';
    }
    
    this.confirmationRequest = null;
    this.transition(AgentState.EXECUTING, { confirmed: true });
  }
  
  /**
   * 用户拒绝
   */
  reject(): void {
    if (this.state !== AgentState.AWAITING_CONFIRMATION) {
      console.warn('🚫 [StateMachine] Cannot reject: not in AWAITING_CONFIRMATION state');
      return;
    }
    
    if (this.plan) {
      this.plan.status = 'rejected';
    }
    
    this.confirmationRequest = null;
    this.plan = null;
    this.transition(AgentState.IDLE, { rejected: true });
  }
  
  /**
   * 更新步骤状态
   */
  updateStepStatus(stepId: string, status: PlanStep['status'], result?: any, error?: string): void {
    if (!this.plan) return;
    
    const step = this.plan.steps.find(s => s.id === stepId);
    if (step) {
      step.status = status;
      if (result !== undefined) step.result = result;
      if (error) step.error = error;
      if (status === 'running') step.startedAt = new Date();
      if (status === 'completed' || status === 'failed') step.completedAt = new Date();
    }
  }
  
  /**
   * 开始总结
   */
  startSummarizing(): void {
    if (this.plan) {
      this.plan.status = 'completed';
    }
    this.transition(AgentState.SUMMARIZING);
  }
  
  /**
   * 完成执行
   */
  complete(result?: any): void {
    this.transition(AgentState.COMPLETED, { result });
  }
  
  /**
   * 设置错误状态
   */
  setError(error: Error, recoverable = false): void {
    this.transition(AgentState.ERROR, undefined, {
      message: error.message,
      recoverable,
    });
  }
  
  /**
   * 取消执行
   */
  cancel(): void {
    this.confirmationRequest = null;
    if (this.plan) {
      this.plan.status = 'failed';
    }
    this.transition(AgentState.CANCELLED);
  }
  
  /**
   * 重置状态机
   */
  reset(): void {
    this.plan = null;
    this.confirmationRequest = null;
    this.transition(AgentState.IDLE);
  }
  
  // ============ 事件订阅 ============
  
  /**
   * 订阅状态变更
   */
  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  /**
   * 通知监听器
   */
  private notifyListeners(event: StateChangeEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('🚫 [StateMachine] Listener error:', error);
      }
    });
  }
  
  // ============ 调试工具 ============
  
  /**
   * 获取状态摘要
   */
  getSummary(): string {
    const lines = [
      `📊 Agent State Machine`,
      `   State: ${this.state}`,
      `   Active: ${this.isActive()}`,
      `   Plan: ${this.plan ? this.plan.id : 'none'}`,
      `   Confirmation: ${this.confirmationRequest ? 'pending' : 'none'}`,
      `   History: ${this.stateHistory.length} events`,
    ];
    return lines.join('\n');
  }
}

/**
 * 创建状态机实例的工厂函数
 */
export function createStateMachine(): AgentStateMachine {
  return new AgentStateMachine();
}

/**
 * 状态显示名称映射
 */
export const STATE_DISPLAY_NAMES: Record<AgentState, string> = {
  [AgentState.IDLE]: '空闲',
  [AgentState.PARSING]: '理解中...',
  [AgentState.PLANNING]: '规划中...',
  [AgentState.AWAITING_CONFIRMATION]: '等待确认',
  [AgentState.EXECUTING]: '执行中...',
  [AgentState.REFLECTING]: '反思中...',
  [AgentState.SUMMARIZING]: '整理结果...',
  [AgentState.COMPLETED]: '完成',
  [AgentState.ERROR]: '出错',
  [AgentState.CANCELLED]: '已取消',
};

/**
 * 获取状态对应的颜色
 */
export function getStateColor(state: AgentState): string {
  switch (state) {
    case AgentState.IDLE:
      return '#6B7280'; // gray
    case AgentState.PARSING:
    case AgentState.PLANNING:
    case AgentState.EXECUTING:
    case AgentState.SUMMARIZING:
      return '#3B82F6'; // blue
    case AgentState.REFLECTING:
      return '#8B5CF6'; // purple - 反思用紫色区分
    case AgentState.AWAITING_CONFIRMATION:
      return '#F59E0B'; // amber
    case AgentState.COMPLETED:
      return '#10B981'; // green
    case AgentState.ERROR:
      return '#EF4444'; // red
    case AgentState.CANCELLED:
      return '#6B7280'; // gray
    default:
      return '#6B7280';
  }
}
