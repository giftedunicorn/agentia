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
