/**
 * SubAgent 系统类型定义
 *
 * 设计理念：
 * - BaseSubAgent 是通用的、可配置的
 * - 不预定义固定的 SubAgent 类型
 * - 通过配置对象动态创建任何类型的 SubAgent
 */

/**
 * SubAgent 配置
 * 定义一个 SubAgent 的所有属性和行为
 */
export interface SubAgentConfig {
  /** SubAgent 唯一标识名称 */
  name: string;

  /** SubAgent 功能描述（用于展示和日志） */
  description: string;

  /** SubAgent 可用的工具列表 */
  tools: any[];

  /** System Prompt 定义 SubAgent 的角色和行为 */
  systemPrompt: string;

  /**
   * 是否使用独立的 Memory
   * - true: 创建新的 MemoryManager（任务隔离）
   * - false: 使用传入的 sharedMemory（共享上下文）
   */
  isolatedMemory?: boolean;

  /**
   * 共享的 Memory（当 isolatedMemory = false 时使用）
   * 允许 SubAgent 访问 Main Agent 的上下文
   */
  sharedMemory?: any;

  /** LLM 配置 */
  llmConfig?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

/**
 * SubAgent 任务
 * 表示一个待执行的任务
 */
export interface SubAgentTask {
  /** 任务唯一 ID */
  id: string;

  /** SubAgent 名称 */
  agentName: string;

  /** 任务提示词 */
  prompt: string;

  /** 额外的上下文数据 */
  context?: Record<string, any>;

  /** 任务状态 */
  status: "pending" | "running" | "completed" | "failed";

  /** 任务结果 */
  result?: any;

  /** 错误信息 */
  error?: string;

  /** 开始时间 */
  startedAt?: Date;

  /** 完成时间 */
  completedAt?: Date;

  /** 执行耗时（毫秒） */
  duration?: number;
}

/**
 * SubAgent 执行结果
 */
export interface SubAgentResult {
  /** 任务 ID */
  taskId: string;

  /** SubAgent 名称 */
  agentName: string;

  /** 是否成功 */
  success: boolean;

  /** 结果数据 */
  data?: any;

  /** 错误信息 */
  error?: string;

  /** 执行耗时（毫秒） */
  duration: number;

  /** 元数据（调用的工具、中间步骤等） */
  metadata?: {
    toolsCalled?: string[];
    steps?: number;
    tokensUsed?: number;
  };
}

/**
 * SubAgent 执行选项
 */
export interface SubAgentExecuteOptions {
  /** 超时时间（毫秒），默认 120000 (2分钟) */
  timeout?: number;

  /** 是否在后台运行 */
  runInBackground?: boolean;

  /** 是否流式返回结果 */
  streaming?: boolean;

  /** 回调函数 */
  onProgress?: (message: string) => void;
  onComplete?: (result: SubAgentResult) => void;
  onError?: (error: Error) => void;
}
