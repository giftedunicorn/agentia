/**
 * Todo Management Tool
 *
 * 管理任务列表，跟踪多步骤任务的进度
 * 基于 Claude Code 的 TodoWrite/TodoRead 系统
 */

import { z } from "zod";
import { createTool } from "../core/base-tool";
import type { Todo } from "../context/types";

// Todo Schema
const todoSchema = z.object({
  content: z
    .string()
    .describe("任务内容（祈使句形式，如：'分析竞对'）"),
  activeForm: z
    .string()
    .describe("进行中的描述（现在进行时，如：'分析竞对中'）"),
  status: z
    .enum(["pending", "in_progress", "completed"])
    .describe("任务状态"),
  priority: z
    .enum(["high", "medium", "low"])
    .optional()
    .describe("优先级（可选）"),
});

// Input Schema
const todoManagementSchema = z.object({
  todos: z
    .array(todoSchema)
    .describe("完整的任务列表（会替换现有列表）"),
});

/**
 * 管理 Todos
 */
async function manageTodos(
  input: { todos: Todo[] },
  context?: { memory?: any }
): Promise<any> {
  if (!context?.memory) {
    throw new Error("Memory context is required for todo management");
  }

  const memory = context.memory;

  // 更新 todos
  memory.updateTodos(input.todos);

  // 获取统计信息
  const progress = memory.getProgress();
  const sortedTodos = memory.getTodos();
  const currentTodo = memory.getCurrentTodo();

  return {
    success: true,
    todos: sortedTodos,
    progress: {
      total: progress.total,
      completed: progress.completed,
      inProgress: progress.inProgress,
      pending: progress.pending,
      percentage: Math.round(progress.percentage),
    },
    currentTask: currentTodo?.activeForm || "No active task",
  };
}

/**
 * 格式化结果
 */
function formatTodoResult(result: any): string {
  if (!result.success) {
    return `❌ Failed to update todos`;
  }

  const { progress, todos, currentTask } = result;

  const lines = [];

  // 进度概览
  lines.push(`\n📊 Todo List Updated`);
  lines.push(
    `Progress: ${progress.completed}/${progress.total} completed (${progress.percentage}%)`
  );

  if (progress.inProgress > 0) {
    lines.push(`⚡ ${progress.inProgress} in progress`);
  }
  if (progress.pending > 0) {
    lines.push(`⏳ ${progress.pending} pending`);
  }

  // 当前任务
  if (currentTask !== "No active task") {
    lines.push(`\nCurrent Task: ${currentTask}`);
  }

  // 任务列表
  if (todos.length > 0) {
    lines.push(`\nTasks:`);
    todos.forEach((todo: Todo, index: number) => {
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
      lines.push(
        `  ${index + 1}. ${statusIcon} ${todo.content}${priorityTag}`
      );
    });
  }

  return lines.join("\n");
}

/**
 * 导出 Todo 工具
 */
export const todoTool = createTool({
  name: "manage_todos",
  description: `Manage task list to track progress of multi-step tasks.

Use this tool when:
- Starting a complex task that requires multiple steps
- Updating task status as you complete each step
- User asks about progress or what's being worked on

IMPORTANT:
- Provide the COMPLETE todo list (all tasks, not just changes)
- Always include content, activeForm, and status for each todo
- Mark exactly ONE task as "in_progress" at a time
- Set priority to "high" for urgent tasks, "low" for non-critical tasks

Example usage:
{
  "todos": [
    {
      "content": "分析竞对",
      "activeForm": "分析竞对中",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "估算市场规模",
      "activeForm": "估算市场规模中",
      "status": "in_progress",
      "priority": "medium"
    },
    {
      "content": "生成 VC 报告",
      "activeForm": "生成 VC 报告中",
      "status": "pending",
      "priority": "medium"
    }
  ]
}`,
  schema: todoManagementSchema,
  execute: manageTodos,
  formatResult: formatTodoResult,
});
