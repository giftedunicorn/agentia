/**
 * Example 5: Todos Management System
 *
 * Demonstrates: Claude Code-inspired todos tracking for multi-step tasks
 *
 * Key features:
 * - YJ1 sorting algorithm (status → priority → creation time)
 * - Progress tracking with real-time updates
 * - System prompt integration (todos appear in context)
 * - Automatic task lifecycle management
 * - Support for priority levels (high/medium/low)
 */

// Load environment variables
import { config } from "dotenv";
config();

import { ContextAwareAgent } from "../context/context-aware-agent";
import { allTools } from "../tools";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("📝 EXAMPLE 5: Todos Management System");
  console.log("=".repeat(60));
  console.log("\nThis example demonstrates advanced task tracking:\n");
  console.log("✓ YJ1 sorting algorithm (status → priority → time)");
  console.log("✓ Progress tracking with percentages");
  console.log("✓ Priority levels: high/medium/low");
  console.log("✓ System prompt integration");
  console.log("✓ Real-time task status updates");
  console.log("\n" + "=".repeat(60) + "\n");

  // Create context-aware agent with todos support
  const agent = new ContextAwareAgent(allTools as any, "todos-demo");

  // Helper to chat with detailed logging
  async function chat(userMessage: string, description?: string) {
    if (description) {
      console.log("\n" + "─".repeat(60));
      console.log(`📍 ${description}`);
      console.log("─".repeat(60));
    }

    console.log(`\n👤 User: ${userMessage}`);

    const response = await agent.chat(userMessage);

    console.log(`\n🤖 Assistant:\n${response}\n`);

    // Show current todos state after each turn
    showTodosState(agent);
  }

  // Helper to show todos state
  function showTodosState(agent: ContextAwareAgent) {
    const memory = (agent as any).memory;
    const todos = memory.getTodos();
    const progress = memory.getProgress();

    if (todos.length === 0) {
      console.log("📋 No todos yet\n");
      return;
    }

    console.log("📋 Current Todos State:");
    console.log(
      `   Progress: ${progress.completed}/${progress.total} (${Math.round(
        progress.percentage
      )}%)`
    );

    todos.forEach((todo: any, index: number) => {
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

      console.log(
        `   ${index + 1}. ${statusIcon} ${todo.content}${priorityTag}`
      );
    });

    const currentTodo = memory.getCurrentTodo();
    if (currentTodo) {
      console.log(`\n   Current: ${currentTodo.activeForm}`);
    }

    console.log("");
  }

  // ========== Scenario: Complete Startup Evaluation ==========

  // Turn 1: User describes a complex problem requiring multiple steps
  await chat(
    "I have an idea for a B2B SaaS platform that helps remote teams coordinate async work across timezones. I need a complete evaluation including competitor analysis, market sizing, customer research, and a full VC-ready report. This is urgent!",
    "Turn 1: Complex Multi-Step Request (Agent Should Create Todos)"
  );

  // At this point, the agent should have created todos like:
  // 1. [HIGH] Analyze competitors
  // 2. [HIGH] Estimate market size
  // 3. [MEDIUM] Research target customers
  // 4. [MEDIUM] Generate VC report

  // Turn 2: Agent starts working on first task
  await chat(
    "Let's start with the competitor analysis.",
    "Turn 2: Begin First Task (Should Update Status to in_progress)"
  );

  // Turn 3: First task completed, move to next
  await chat(
    "Great! Now tell me about the market opportunity.",
    "Turn 3: First Task Done, Next Task Begins"
  );

  // Turn 4: User asks about progress
  await chat(
    "What's our progress so far?",
    "Turn 4: Progress Check (Agent Should Report from Todos)"
  );

  // Turn 5: Continue with customer analysis
  await chat(
    "Who should be my target customers?",
    "Turn 5: Customer Analysis (Third Task)"
  );

  // Turn 6: User wants to reprioritize
  await chat(
    "Actually, the VC report is more urgent now. Can we prioritize that?",
    "Turn 6: Reprioritization Request (Test YJ1 Sorting)"
  );

  // Turn 7: Generate the VC report
  await chat(
    "Generate the complete VC evaluation report now.",
    "Turn 7: Final Report Generation"
  );

  // Turn 8: Check if everything is complete
  await chat("Are we done with all tasks?", "Turn 8: Final Status Check");

  // ========== Manual Todos Demonstration ==========

  console.log("\n" + "=".repeat(60));
  console.log("🔬 Manual Todos Demonstration");
  console.log("=".repeat(60) + "\n");

  console.log(
    "Let's manually create and manipulate todos to show YJ1 sorting:\n"
  );

  const memory = (agent as any).memory;

  // Create a mixed set of todos with different states and priorities
  console.log("1️⃣ Creating 6 todos with mixed priorities and states...\n");

  memory.updateTodos([
    {
      content: "Fix critical bug",
      activeForm: "Fixing critical bug",
      status: "in_progress",
      priority: "high",
      createdAt: new Date("2025-01-01T10:00:00"),
    },
    {
      content: "Write documentation",
      activeForm: "Writing documentation",
      status: "pending",
      priority: "low",
      createdAt: new Date("2025-01-01T10:05:00"),
    },
    {
      content: "Deploy to production",
      activeForm: "Deploying to production",
      status: "pending",
      priority: "high",
      createdAt: new Date("2025-01-01T10:02:00"),
    },
    {
      content: "Review code",
      activeForm: "Reviewing code",
      status: "completed",
      priority: "medium",
      createdAt: new Date("2025-01-01T09:00:00"),
    },
    {
      content: "Update dependencies",
      activeForm: "Updating dependencies",
      status: "pending",
      priority: "medium",
      createdAt: new Date("2025-01-01T10:01:00"),
    },
    {
      content: "Setup monitoring",
      activeForm: "Setting up monitoring",
      status: "completed",
      priority: "high",
      createdAt: new Date("2025-01-01T08:00:00"),
    },
  ]);

  showTodosState(agent);

  console.log("📊 YJ1 Sorting Explanation:");
  console.log("   Layer 1: Status (in_progress → pending → completed)");
  console.log("   Layer 2: Priority (high → medium → low)");
  console.log("   Layer 3: Creation Time (earlier → later)");
  console.log("\n   Notice how todos are sorted:");
  console.log("   • in_progress tasks appear first");
  console.log("   • pending tasks grouped by priority");
  console.log("   • completed tasks at the bottom\n");

  // ========== Progress Tracking Demo ==========

  console.log("\n" + "─".repeat(60));
  console.log("2️⃣ Completing tasks one by one...\n");

  // Complete the in_progress task
  memory.updateTodos(
    memory
      .getTodos()
      .map((t: any) =>
        t.status === "in_progress"
          ? { ...t, status: "completed", completedAt: new Date() }
          : t
      )
  );

  console.log("✅ Completed: Fix critical bug");
  showTodosState(agent);

  // Mark next high-priority pending task as in_progress
  const todos = memory.getTodos();
  const nextTask = todos.find(
    (t: any) => t.status === "pending" && t.priority === "high"
  );

  if (nextTask) {
    memory.updateTodos(
      todos.map((t: any) =>
        t.content === nextTask.content ? { ...t, status: "in_progress" } : t
      )
    );
    console.log(`⚡ Started: ${nextTask.content}`);
    showTodosState(agent);
  }

  // ========== Final Summary ==========

  console.log("\n" + "=".repeat(60));
  console.log("✅ Todos Management Demo Complete!");
  console.log("=".repeat(60) + "\n");

  // Show final memory state
  agent.printMemorySummary();

  // Show what was achieved
  console.log("🎯 What Todos Management Achieved:\n");
  console.log("1. ✓ Tracked complex multi-step tasks automatically");
  console.log("2. ✓ YJ1 sorting kept tasks organized by importance");
  console.log("3. ✓ Progress tracking showed completion percentage");
  console.log("4. ✓ Priority levels (high/medium/low) influenced order");
  console.log("5. ✓ System prompt included todos context");
  console.log("6. ✓ Agent could report progress on demand");
  console.log("\n" + "=".repeat(60) + "\n");

  console.log("💡 Key Learnings:\n");
  console.log("• manage_todos tool accepts complete todo list (not diffs)");
  console.log("• Exactly ONE task should be in_progress at a time");
  console.log("• YJ1 sorting ensures most important work appears first");
  console.log("• Todos appear in system prompt for agent awareness");
  console.log("• Progress tracking helps users understand completion status");
  console.log("• Priority levels guide which task to work on next\n");

  console.log("🔍 YJ1 Algorithm Details:\n");
  console.log("1. First sort by STATUS:");
  console.log("   - in_progress (0) - currently active work");
  console.log("   - pending (1) - work not yet started");
  console.log("   - completed (2) - finished tasks");
  console.log("\n2. Then sort by PRIORITY:");
  console.log("   - high (0) - urgent/important");
  console.log("   - medium (1) - normal priority");
  console.log("   - low (2) - nice-to-have");
  console.log("\n3. Finally sort by CREATION TIME:");
  console.log("   - Earlier tasks come first");
  console.log("   - Ensures FIFO within same priority\n");

  console.log("=".repeat(60) + "\n");

  console.log("🚀 Try It Yourself:\n");
  console.log("1. Run this example: pnpm dev:todos");
  console.log("2. Observe how agent creates todos for complex requests");
  console.log("3. Watch YJ1 sorting keep tasks organized");
  console.log("4. See progress tracking in action");
  console.log("5. Check how todos appear in system prompt context\n");

  console.log("📚 Related Files:");
  console.log("   • src/tools/todo.tool.ts - manage_todos tool");
  console.log("   • src/context/memory.ts - MemoryManager with YJ1 algorithm");
  console.log("   • src/context/types.ts - Todo type definitions\n");

  console.log("=".repeat(60) + "\n");
}

main().catch(console.error);
