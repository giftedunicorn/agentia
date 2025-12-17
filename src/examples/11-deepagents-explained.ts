/**
 * Example 11: How DeepAgents Work - Educational Demo
 *
 * This example demonstrates:
 * 1. Planning with write_todos tool
 * 2. Subagent spawning with task tool
 * 3. How they work together
 *
 * We'll use a simplified setup to avoid the deepagents bug while
 * still showing the core concepts.
 */

import { config } from "dotenv";
config();

import { createAgent, todoListMiddleware } from "langchain";
import { HumanMessage } from "@langchain/core/messages";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  competitorTool,
  marketTool,
  customerTool,
} from "../tools";

async function demonstratePlanning() {
  console.log("\n" + "=".repeat(70));
  console.log("📋 DEMO 1: Planning with write_todos");
  console.log("=".repeat(70));
  console.log("\nShowing how agents use write_todos to plan complex tasks\n");

  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash-exp",
    temperature: 0.7,
    apiKey: process.env.GEMINI_API_KEY,
  });

  // Create agent with ONLY todoListMiddleware
  const agent = createAgent({
    model,
    systemPrompt: `You are a helpful assistant.

When you receive a complex task with multiple steps, use the write_todos tool to:
1. Break it down into discrete steps
2. Track your progress
3. Give the user visibility

For this demo, when asked to "build a feature", create a plan with todos.`,
    middleware: [todoListMiddleware()],
    tools: [], // No tools for this demo, just planning
  });

  // Ask agent to do something complex
  console.log("👤 User: Build a new user authentication feature\n");

  const result = await agent.invoke({
    messages: [
      new HumanMessage(
        "Build a new user authentication feature with login, registration, and password reset"
      ),
    ],
  });

  // Show the todos state
  console.log("\n📊 Agent's Plan (from todos state):");
  console.log("─".repeat(70));
  if (result.todos && result.todos.length > 0) {
    result.todos.forEach((todo: any, i: number) => {
      const statusIcon =
        todo.status === "completed"
          ? "✅"
          : todo.status === "in_progress"
            ? "🔄"
            : "⏸️";
      console.log(
        `${i + 1}. ${statusIcon} [${todo.status.toUpperCase()}] ${todo.content}`
      );
    });
  } else {
    console.log("(Agent didn't create todos - may need to prompt it)");
  }

  // Show the final message
  const lastMessage = result.messages[result.messages.length - 1];
  console.log("\n🤖 Agent's Response:");
  console.log("─".repeat(70));
  console.log(lastMessage.content);
  console.log();
}

async function demonstrateSubagentConcept() {
  console.log("\n" + "=".repeat(70));
  console.log("🤖 DEMO 2: Subagent Concept (Explanation)");
  console.log("=".repeat(70));
  console.log("\nHow subagents provide context isolation\n");

  console.log(`
MAIN AGENT (Parent)
├─ Context: Full conversation history
├─ State: { messages: [...], todos: [...], files: {...} }
├─ Tools: Basic tools + task() tool
│
└─ When complex task needed:
   │
   ├─> SPAWNS SUBAGENT (Child) ───────────────────────┐
   │                                                   │
   │   SUBAGENT INSTANCE                              │
   │   ├─ Context: ONLY task description (isolated)   │
   │   ├─ State: Fresh state (clean slate)            │
   │   ├─ Tools: Specialized tools                    │
   │   ├─ Middleware: Own middleware stack            │
   │   │                                               │
   │   └─ Works autonomously:                         │
   │       1. Receives: "Analyze competitors..."      │
   │       2. Plans its approach                      │
   │       3. Uses tools (competitorTool, etc.)       │
   │       4. Returns final analysis                  │
   │                                                   │
   └───<─ RESULT RETURNED ────────────────────────────┘
       │
       ├─> Main agent receives result
       ├─> Synthesizes with conversation
       └─> Responds to user

KEY BENEFITS:
✅ Context Isolation: Subagent doesn't carry main agent's baggage
✅ Specialization: Can have domain-specific tools & prompts
✅ Parallel Execution: Can spawn multiple subagents at once
✅ Scalability: Main agent stays focused, subagents go deep
  `);
}

async function demonstrateCombined() {
  console.log("\n" + "=".repeat(70));
  console.log("🎯 DEMO 3: Planning + Subagents Together (Conceptual)");
  console.log("=".repeat(70));
  console.log("\nHow they work together for complex tasks\n");

  console.log(`
USER REQUEST:
"I need a complete startup analysis: competitors, market, and customers"

───────────────────────────────────────────────────────────────────────

STEP 1: Main Agent Creates Plan
───────────────────────────────────────────────────────────────────────
Main agent calls: write_todos({
  todos: [
    { content: "Analyze competitors", status: "pending" },
    { content: "Size the market", status: "pending" },
    { content: "Research customers", status: "pending" },
    { content: "Synthesize findings", status: "pending" }
  ]
})

State after: todos = [4 items, all pending]

───────────────────────────────────────────────────────────────────────

STEP 2: Main Agent Starts First Task
───────────────────────────────────────────────────────────────────────
Main agent updates: write_todos({
  todos: [
    { content: "Analyze competitors", status: "in_progress" },  ← Updated!
    { content: "Size the market", status: "pending" },
    { content: "Research customers", status: "pending" },
    { content: "Synthesize findings", status: "pending" }
  ]
})

Main agent spawns subagent: task({
  subagent_type: "general-purpose",
  description: "Analyze competitors in the AI code documentation space.
                Identify top 5 competitors, their features, pricing, and
                differentiation strategies."
})

───────────────────────────────────────────────────────────────────────

STEP 3: Subagent Executes (In Isolation)
───────────────────────────────────────────────────────────────────────
Subagent context: ONLY the description above (no conversation history)

Subagent uses tools:
  - competitorTool("AI code documentation")
  - Analyzes results
  - Formats comprehensive analysis

Subagent returns: "Here are the top 5 competitors: 1. GitHub Copilot...
                    2. Tabnine... [detailed analysis]"

───────────────────────────────────────────────────────────────────────

STEP 4: Main Agent Receives Result, Marks Complete
───────────────────────────────────────────────────────────────────────
Main agent updates: write_todos({
  todos: [
    { content: "Analyze competitors", status: "completed" },  ← Completed!
    { content: "Size the market", status: "in_progress" },    ← Next!
    { content: "Research customers", status: "pending" },
    { content: "Synthesize findings", status: "pending" }
  ]
})

───────────────────────────────────────────────────────────────────────

STEP 5: Repeat for Remaining Tasks
───────────────────────────────────────────────────────────────────────
Main agent spawns subagent for market sizing...
Subagent analyzes market...
Returns result...
Main agent marks completed, moves to next...

(Can also spawn multiple subagents in PARALLEL for efficiency!)

───────────────────────────────────────────────────────────────────────

STEP 6: Final Synthesis
───────────────────────────────────────────────────────────────────────
All todos completed!

Main agent:
  - Has results from all subagents
  - Synthesizes into cohesive response
  - Responds to user with complete analysis

RESPONSE: "Based on comprehensive analysis:

           COMPETITORS: [synthesis of subagent 1]
           MARKET SIZE: [synthesis of subagent 2]
           CUSTOMERS: [synthesis of subagent 3]

           RECOMMENDATION: [strategic insights]"

───────────────────────────────────────────────────────────────────────

Final State:
  todos = [4 items, all completed]
  messages = [conversation with all tool calls and results]
  `);
}

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("🎓 HOW DEEPAGENTS WORK: Interactive Demo");
  console.log("=".repeat(70));
  console.log("\nThis demo shows DeepAgents' two core features:");
  console.log("1. Planning & Task Decomposition (write_todos)");
  console.log("2. Subagent Spawning (task tool)\n");

  // Demo 1: Planning
  await demonstratePlanning();

  // Demo 2: Subagent concept
  await demonstrateSubagentConcept();

  // Demo 3: Combined approach
  await demonstrateCombined();

  console.log("\n" + "=".repeat(70));
  console.log("📚 For more details, see: docs/HOW_DEEPAGENTS_WORK.md");
  console.log("=".repeat(70) + "\n");
}

main().catch(console.error);
