/**
 * Working Memory Manager
 *
 * 管理 Agent 的工作记忆：当前想法、分析结果、用户关注点
 */

import type {
  ConversationContext,
  WorkingMemory,
  IdeaContext,
  Todo,
  TodoStatus,
  TodoPriority,
} from "./types";

export class MemoryManager {
  private context: ConversationContext;

  constructor(sessionId?: string) {
    this.context = {
      sessionId: sessionId || this.generateSessionId(),
      createdAt: new Date(),
      lastUpdatedAt: new Date(),
      tokenCount: 0,
      workingMemory: {
        analyses: {},
        recommendations: [],
        userConcerns: [],
        todos: [], // 初始化 todos 列表
      },
    };
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ==================== Idea Management ====================

  /**
   * 更新创业想法信息
   */
  updateIdea(idea: Partial<IdeaContext>): void {
    this.context.workingMemory.idea = {
      ...this.context.workingMemory.idea,
      ...idea,
    } as IdeaContext;

    this.touch();
    this.log("Idea updated", this.context.workingMemory.idea);
  }

  /**
   * 获取当前创业想法
   */
  getIdea(): IdeaContext | undefined {
    return this.context.workingMemory.idea;
  }

  /**
   * 检查是否有创业想法信息
   */
  hasIdea(): boolean {
    return !!this.context.workingMemory.idea?.description;
  }

  // ==================== Analysis Cache Management ====================

  /**
   * 缓存分析结果
   */
  cacheAnalysis(type: keyof WorkingMemory["analyses"], data: any): void {
    this.context.workingMemory.analyses[type] = {
      data,
      timestamp: new Date(),
    };

    this.touch();
    this.log(`Analysis cached: ${type}`);
  }

  /**
   * 获取缓存的分析结果
   */
  getCachedAnalysis(type: keyof WorkingMemory["analyses"]): any | undefined {
    const cached = this.context.workingMemory.analyses[type];
    if (!cached) return undefined;

    // 检查缓存是否过期（1小时）
    const age = Date.now() - cached.timestamp.getTime();
    const maxAge = 60 * 60 * 1000; // 1 hour

    if (age > maxAge) {
      this.log(`Cache expired: ${type}`);
      return undefined;
    }

    return cached.data;
  }

  /**
   * 检查是否已完成某个分析
   */
  hasAnalysis(type: keyof WorkingMemory["analyses"]): boolean {
    return !!this.getCachedAnalysis(type);
  }

  /**
   * 获取已完成的分析列表
   */
  getCompletedAnalyses(): string[] {
    return Object.keys(this.context.workingMemory.analyses).filter((key) =>
      this.hasAnalysis(key as keyof WorkingMemory["analyses"])
    );
  }

  // ==================== Focus Management ====================

  /**
   * 设置当前焦点
   */
  setFocus(focus: WorkingMemory["currentFocus"]): void {
    this.context.workingMemory.currentFocus = focus;
    this.touch();
    this.log(`Focus changed to: ${focus}`);
  }

  /**
   * 获取当前焦点
   */
  getFocus(): WorkingMemory["currentFocus"] {
    return this.context.workingMemory.currentFocus;
  }

  // ==================== Recommendations ====================

  /**
   * 添加建议
   */
  addRecommendation(recommendation: string): void {
    if (!this.context.workingMemory.recommendations.includes(recommendation)) {
      this.context.workingMemory.recommendations.push(recommendation);
      this.touch();
    }
  }

  /**
   * 获取所有建议
   */
  getRecommendations(): string[] {
    return this.context.workingMemory.recommendations;
  }

  /**
   * 清除建议
   */
  clearRecommendations(): void {
    this.context.workingMemory.recommendations = [];
    this.touch();
  }

  // ==================== User Concerns ====================

  /**
   * 添加用户关注点
   */
  addUserConcern(concern: string): void {
    if (!this.context.workingMemory.userConcerns.includes(concern)) {
      this.context.workingMemory.userConcerns.push(concern);
      this.touch();
    }
  }

  /**
   * 获取用户关注点
   */
  getUserConcerns(): string[] {
    return this.context.workingMemory.userConcerns;
  }

  // ==================== Todos Management ====================

  /**
   * 添加新任务
   */
  addTodo(
    content: string,
    activeForm: string,
    priority: TodoPriority = "medium"
  ): void {
    this.context.workingMemory.todos.push({
      content,
      activeForm,
      status: "pending",
      priority,
      createdAt: new Date(),
    });

    this.touch();
    this.log(`Todo added: ${content}`);
  }

  /**
   * 批量更新 Todos
   */
  updateTodos(todos: Todo[]): void {
    // 保留现有 todos 的 createdAt 和 completedAt
    const updatedTodos = todos.map((newTodo) => {
      const existingTodo = this.context.workingMemory.todos.find(
        (t) => t.content === newTodo.content
      );

      return {
        ...newTodo,
        createdAt: existingTodo?.createdAt || newTodo.createdAt || new Date(),
        completedAt:
          newTodo.status === "completed"
            ? newTodo.completedAt || new Date()
            : undefined,
      };
    });

    this.context.workingMemory.todos = updatedTodos;
    this.touch();
    this.log(`Todos updated: ${todos.length} items`);
  }

  /**
   * 更新单个任务状态
   */
  updateTodoStatus(index: number, status: TodoStatus): void {
    if (this.context.workingMemory.todos[index]) {
      this.context.workingMemory.todos[index].status = status;

      if (status === "completed") {
        this.context.workingMemory.todos[index].completedAt = new Date();
      }

      this.touch();
      this.log(
        `Todo status updated: ${this.context.workingMemory.todos[index].content} -> ${status}`
      );
    }
  }

  /**
   * YJ1 智能排序算法
   * 排序规则：
   * 1. 按状态：in_progress > pending > completed
   * 2. 按优先级：high > medium > low
   * 3. 按创建时间：早 > 晚
   */
  sortTodos(): Todo[] {
    const STATUS_PRIORITY: Record<TodoStatus, number> = {
      in_progress: 0,
      pending: 1,
      completed: 2,
    };

    const PRIORITY_MAP: Record<TodoPriority, number> = {
      high: 0,
      medium: 1,
      low: 2,
    };

    return [...this.context.workingMemory.todos].sort((a, b) => {
      // 第一层：按状态优先级
      const statusDiff = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
      if (statusDiff !== 0) return statusDiff;

      // 第二层：按重要性优先级
      const priorityA = a.priority || "medium";
      const priorityB = b.priority || "medium";
      const priorityDiff = PRIORITY_MAP[priorityA] - PRIORITY_MAP[priorityB];
      if (priorityDiff !== 0) return priorityDiff;

      // 第三层：按创建时间
      if (a.createdAt && b.createdAt) {
        return a.createdAt.getTime() - b.createdAt.getTime();
      }

      return 0;
    });
  }

  /**
   * 获取所有 Todos（已排序）
   */
  getTodos(): Todo[] {
    return this.sortTodos();
  }

  /**
   * 获取进度统计
   */
  getProgress(): {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    percentage: number;
  } {
    const todos = this.context.workingMemory.todos;
    const completed = todos.filter((t) => t.status === "completed").length;
    const inProgress = todos.filter((t) => t.status === "in_progress").length;
    const pending = todos.filter((t) => t.status === "pending").length;

    return {
      total: todos.length,
      completed,
      inProgress,
      pending,
      percentage: todos.length > 0 ? (completed / todos.length) * 100 : 0,
    };
  }

  /**
   * 检查是否有未完成的任务
   */
  hasIncompleteTodos(): boolean {
    return this.context.workingMemory.todos.some(
      (t) => t.status !== "completed"
    );
  }

  /**
   * 获取当前进行中的任务
   */
  getCurrentTodo(): Todo | undefined {
    return this.context.workingMemory.todos.find(
      (t) => t.status === "in_progress"
    );
  }

  // ==================== Context Building ====================

  /**
   * 构建上下文摘要（用于注入 System Prompt）
   */
  buildContextSummary(): string {
    const parts: string[] = [];

    // 1. 创业想法
    if (this.hasIdea()) {
      const idea = this.getIdea()!;
      parts.push(`STARTUP IDEA: ${idea.description}`);

      if (idea.targetMarket) {
        parts.push(`Target Market: ${idea.targetMarket}`);
      }
      if (idea.category) {
        parts.push(`Category: ${idea.category}`);
      }
    }

    // 2. 已完成的分析
    const completed = this.getCompletedAnalyses();
    if (completed.length > 0) {
      parts.push(`\nCOMPLETED ANALYSES: ${completed.join(", ")}`);
    }

    // 3. 当前焦点
    if (this.getFocus()) {
      parts.push(`\nCURRENT FOCUS: ${this.getFocus()}`);
    }

    // 4. 用户关注点
    const concerns = this.getUserConcerns();
    if (concerns.length > 0) {
      parts.push(
        `\nUSER CONCERNS:\n${concerns.map((c) => `- ${c}`).join("\n")}`
      );
    }

    // 5. 待办建议
    const recommendations = this.getRecommendations();
    if (recommendations.length > 0) {
      parts.push(
        `\nRECOMMENDATIONS:\n${recommendations.map((r) => `- ${r}`).join("\n")}`
      );
    }

    // 6. Todos 任务列表
    const todos = this.getTodos();
    if (todos.length > 0) {
      const progress = this.getProgress();
      parts.push(
        `\nTODOS (${progress.completed}/${progress.total} completed):`
      );

      todos.forEach((todo, index) => {
        const statusIcon =
          todo.status === "completed"
            ? "✓"
            : todo.status === "in_progress"
            ? "⚡"
            : "⏳";
        const priorityTag =
          todo.priority === "high"
            ? " [HIGH]"
            : todo.priority === "low"
            ? " [LOW]"
            : "";
        parts.push(
          `  ${index + 1}. ${statusIcon} ${todo.content}${priorityTag}`
        );
      });

      // 显示当前进行中的任务
      const currentTodo = this.getCurrentTodo();
      if (currentTodo) {
        parts.push(`\nCURRENT TASK: ${currentTodo.activeForm}`);
      }
    }

    return parts.length > 0
      ? "\n--- CONTEXT ---\n" + parts.join("\n") + "\n--- END CONTEXT ---\n"
      : "";
  }

  /**
   * 获取完整上下文
   */
  getContext(): ConversationContext {
    return this.context;
  }

  /**
   * 更新最后修改时间
   */
  private touch(): void {
    this.context.lastUpdatedAt = new Date();
  }

  /**
   * 日志输出
   */
  private log(message: string, data?: any): void {
    console.log(`📝 [Memory] ${message}`, data || "");
  }

  /**
   * 获取会话信息摘要（用于调试）
   */
  getSummary(): string {
    const progress = this.getProgress();
    const currentTodo = this.getCurrentTodo();

    return `
Session: ${this.context.sessionId}
Created: ${this.context.createdAt.toISOString()}
Has Idea: ${this.hasIdea() ? "Yes" : "No"}
Completed Analyses: ${this.getCompletedAnalyses().join(", ") || "None"}
Current Focus: ${this.getFocus() || "None"}
Todos: ${progress.total} total, ${
      progress.completed
    } completed (${progress.percentage.toFixed(0)}%)
Current Task: ${currentTodo ? currentTodo.activeForm : "None"}
    `.trim();
  }
}
