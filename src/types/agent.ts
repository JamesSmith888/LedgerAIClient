/**
 * Agent Chat 类型定义
 * 为未来的复杂交互和扩展预留接口
 */

/**
 * 消息类型
 */
export type MessageType = 'text' | 'system' | 'action' | 'tool_call' | 'tool_result' | 'thinking' | 'embedded' | 'plan' | 'reflection' | 'intent';

/**
 * 嵌入式内容类型
 * 
 * 基础组件：
 * - transaction_list: 交易列表
 * - transaction_detail: 交易详情
 * - statistics_card: 统计卡片
 * - action_buttons: 操作按钮
 * 
 * 增强组件：
 * - dynamic_card: 通用动态卡片（AI 可灵活组合）
 * - key_value_list: 键值对列表
 * - progress_card: 进度卡片（预算、目标等）
 * - comparison_card: 对比卡片
 * - pie_chart: 饼图
 * - bar_chart: 柱状图
 */
export type EmbeddedContentType = 
  // 基础组件
  | 'transaction_list'    // 交易列表
  | 'transaction_detail'  // 交易详情
  | 'result_message'      // 操作结果消息
  | 'statistics_card'     // 统计卡片
  | 'action_buttons'      // 操作按钮
  // 增强组件
  | 'dynamic_card'        // 通用动态卡片
  | 'key_value_list'      // 键值对列表
  | 'progress_card'       // 进度卡片
  | 'comparison_card'     // 对比卡片
  | 'pie_chart'           // 饼图
  | 'bar_chart';          // 柱状图

/**
 * 嵌入式内容数据
 */
export interface EmbeddedContent {
  type: EmbeddedContentType;
  data: any;
}

/**
 * AI 建议的后续操作
 */
export interface SuggestedAction {
  /** 按钮显示的文本 */
  label: string;
  /** 点击后发送的消息 */
  message: string;
  /** 预测用户采纳度 (0-1)，可选 */
  confidence?: number;
}

/**
 * 消息发送者
 */
export type MessageSender = 'user' | 'assistant' | 'system';

/**
 * 消息状态
 */
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'error';

/**
 * Agent 消息接口
 * 设计为可扩展，支持未来的 LangChain 集成
 */
export interface AgentMessage {
  id: string;
  type: MessageType;
  sender: MessageSender;
  content: string;
  timestamp: Date;
  status?: MessageStatus;
  
  // 扩展字段 - 用于未来的高级功能
  metadata?: {
    // 工具调用信息（LangChain Agent）
    toolCalls?: ToolCall[];
    // 工具执行结果
    toolResults?: ToolResult[];
    // 中间步骤（Agent推理过程）
    intermediateSteps?: IntermediateStep[];
    // 附件信息
    attachments?: Attachment[];
    // 嵌入式内容（用于 embedded 类型消息）
    embeddedContent?: EmbeddedContent;
    // AI 建议的后续操作（显示在输入框上方）
    suggestedActions?: SuggestedAction[];
    // 自定义数据
    [key: string]: any;
  };
}

/**
 * 工具调用（预留给 LangChain）
 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'error';
}

/**
 * 工具执行结果
 */
export interface ToolResult {
  toolCallId: string;
  output: any;
  error?: string;
}

/**
 * Agent 推理中间步骤
 */
export interface IntermediateStep {
  action: string;
  observation: string;
  timestamp: Date;
}

/**
 * 附件类型
 */
export type AttachmentType = 'image' | 'file' | 'video' | 'audio' | 'link';

/**
 * 附件
 */
export interface Attachment {
  id: string;
  type: AttachmentType;
  /** 本地 URI 或远程 URL */
  uri: string;
  /** 文件名 */
  name?: string;
  /** 文件大小（字节） */
  size?: number;
  /** MIME 类型 */
  mimeType?: string;
  /** 图片/视频宽度 */
  width?: number;
  /** 图片/视频高度 */
  height?: number;
  /** 缩略图 URI（用于视频等） */
  thumbnailUri?: string;
  /** 上传状态 */
  uploadStatus?: 'pending' | 'uploading' | 'uploaded' | 'error';
  /** 上传进度 0-100 */
  uploadProgress?: number;
  /** 远程 URL（上传后） */
  remoteUrl?: string;
}

/**
 * 待发送的附件（用于输入栏预览）
 */
export interface PendingAttachment extends Attachment {
  /** Base64 数据（用于 AI 处理） */
  base64?: string;
}

/**
 * WebSocket 消息格式（与后端对接）
 */
export interface WSAgentMessage {
  type: 'message' | 'typing' | 'error' | 'end' | 'tool_call' | 'tool_result';
  content?: string;
  messageId?: string;
  timestamp?: number;
  metadata?: any;
}

/**
 * Agent 运行时上下文
 * 与 agent.ts 中的 AgentRuntimeContext 保持同步
 */
export interface AgentRuntimeContext {
  user: {
    id: string | number;
    username: string;
    nickname?: string;
  } | null;
  currentLedger: {
    id: number;
    name: string;
    description?: string;
  } | null;
  defaultLedgerId: number | null;
  allLedgers: Array<{
    id: number;
    name: string;
  }>;
  categories: Array<{
    id: number;
    name: string;
    type: 'INCOME' | 'EXPENSE';
    icon?: string;
  }>;
  paymentMethods: Array<{
    id: number;
    name: string;
    icon?: string;
    isDefault: boolean;
  }>;
  currentDateTime: string;
  /** 用户偏好记忆上下文（由 UserPreferenceMemory 生成） */
  userPreferenceContext?: string;
}

/**
 * Chat 配置
 */
export interface AgentChatConfig {
  wsUrl: string;
  userId?: string | number;
  token?: string | null;
  enableToolCalls?: boolean;
  enableStreaming?: boolean;
  /** 
   * 运行时上下文 - 包含用户、账本、分类、支付方式等业务数据
   * 通过 System Prompt 注入，让 AI 直接感知这些信息
   */
  runtimeContext?: AgentRuntimeContext;
  /**
   * 启用的工具名称列表
   * 未指定时启用全部工具
   */
  enabledToolNames?: string[];
}

/**
 * 对话会话
 */
export interface Conversation {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  preview?: string; // 最后一条消息预览
}

/**
 * 消息操作类型
 * 可扩展 - 添加新操作时在此处添加类型
 */
export type MessageAction = 
  | 'copy'      // 复制文本
  | 'retry'     // 重新发送（仅用户消息）
  | 'edit'      // 编辑消息
  | 'delete'    // 删除消息
  | 'quote'     // 引用回复
  | 'forward'   // 转发消息
  | 'pin'       // 置顶消息
  | 'bookmark'; // 收藏消息

