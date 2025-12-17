/**
 * Context Management Types
 *
 * 定义上下文管理的核心类型
 */

// 创业想法信息
export interface IdeaContext {
  description: string;
  category?: string;
  targetMarket?: string;
  keyFeatures?: string[];
  stage?: "idea" | "mvp" | "launched";
}

// 分析结果（缓存）
export interface AnalysisCache {
  competitor?: {
    data: any;
    timestamp: Date;
  };
  market?: {
    data: any;
    timestamp: Date;
  };
  customer?: {
    data: any;
    timestamp: Date;
  };
  vcReport?: {
    data: any;
    timestamp: Date;
  };
}

// Todo 任务状态
export type TodoStatus = "pending" | "in_progress" | "completed";

// Todo 优先级
export type TodoPriority = "high" | "medium" | "low";

// Todo 项
export interface Todo {
  // 任务内容（祈使句形式）
  content: string;

  // 进行中的描述（现在进行时）
  activeForm: string;

  // 任务状态
  status: TodoStatus;

  // 优先级
  priority?: TodoPriority;

  // 创建时间
  createdAt?: Date;

  // 完成时间
  completedAt?: Date;
}

// 工作记忆（最重要的上下文）
export interface WorkingMemory {
  // 当前讨论的创业想法
  idea?: IdeaContext;

  // 已完成的分析（缓存）
  analyses: AnalysisCache;

  // 当前焦点
  currentFocus?: "competitor" | "market" | "customer" | "strategy" | "general";

  // Agent 的建议列表
  recommendations: string[];

  // 用户的关键关注点
  userConcerns: string[];

  // 📝 任务列表（新增）
  todos: Todo[];
}

// 完整的对话上下文
export interface ConversationContext {
  // 会话 ID
  sessionId: string;

  // 创建时间
  createdAt: Date;

  // 最后更新时间
  lastUpdatedAt: Date;

  // 工作记忆
  workingMemory: WorkingMemory;

  // Token 计数（用于管理上下文长度）
  tokenCount: number;
}
