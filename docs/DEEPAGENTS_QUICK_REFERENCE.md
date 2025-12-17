# DeepAgents Quick Reference

## TL;DR

**DeepAgents** = Planning (`write_todos`) + Subagents (`task`) + File System + Auto-Summarization

Two core features you need to understand:

### 1. Planning with `write_todos` 📋

**What**: Agent breaks complex tasks into steps and tracks progress

**When**: Automatically used for complex multi-step tasks

**State**: `result.todos` - array of `{ content, status, activeForm }`

**Example**:
```typescript
const result = await agent.invoke({ messages: [...] });
console.log(result.todos);
// [
//   { content: "Research competitors", status: "completed" },
//   { content: "Size market", status: "in_progress" },
//   { content: "Analyze customers", status: "pending" }
// ]
```

---

### 2. Subagent Spawning with `task` 🤖

**What**: Agent spawns specialized sub-agents with isolated context

**When**: For deep analysis, complex subtasks, or context isolation

**Tool**: `task({ subagent_type, description })`

**Example**:
```typescript
// Main agent internally calls:
task({
  subagent_type: "vc-report",
  description: "Generate comprehensive VC evaluation for AI startup..."
})

// Subagent works in isolation, returns result
// Main agent receives result and continues
```

---

## Code Setup

### Basic Deep Agent

```typescript
import { createDeepAgent } from "deepagents";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const agent = createDeepAgent({
  model: new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash-exp",
    apiKey: process.env.GEMINI_API_KEY,
  }),
  systemPrompt: "You are a helpful assistant...",
  tools: [tool1, tool2],  // Tools for main agent
  subagents: [            // Optional: specialized subagents
    {
      name: "researcher",
      description: "Expert in research tasks",
      systemPrompt: "You are a research expert...",
      tools: [researchTool],
    }
  ],
});

const result = await agent.invoke({
  messages: [new HumanMessage("Help me with a complex task")]
});
```

---

## Middleware Stack

DeepAgents automatically includes these middleware:

```typescript
const middleware = [
  todoListMiddleware(),                    // Adds write_todos tool
  createFilesystemMiddleware({ backend }), // Adds file operations
  createSubAgentMiddleware({               // Adds task tool + subagents
    defaultModel,
    defaultTools,
    subagents,
    generalPurposeAgent: true
  }),
  summarizationMiddleware(...),            // Auto-summarize when needed
  anthropicPromptCachingMiddleware(...),   // Prompt caching
  createPatchToolCallsMiddleware(),        // Tool call compatibility
];
```

You get all of this automatically with `createDeepAgent()`!

---

## Common Patterns

### Pattern 1: Simple Planning

```typescript
// User: "Build a new feature with tests"

// Agent automatically:
// 1. Calls write_todos to create plan
// 2. Executes each step
// 3. Updates status as it goes
// 4. Responds when complete
```

### Pattern 2: Delegating to Subagent

```typescript
// User: "Analyze my startup idea comprehensively"

// Main agent:
// 1. Creates plan with write_todos
// 2. For each step, spawns subagent:
//    task({ subagent_type: "general-purpose", description: "..." })
// 3. Collects results
// 4. Synthesizes final response
```

### Pattern 3: Parallel Subagents

```typescript
// Main agent can spawn multiple subagents at once:
[
  task({ subagent_type: "...", description: "Analyze competitors" }),
  task({ subagent_type: "...", description: "Size market" }),
  task({ subagent_type: "...", description: "Research customers" })
]
// All run in parallel!
```

---

## Accessing Results

### Todos
```typescript
const result = await agent.invoke({ messages });

// Access todos state
result.todos.forEach(todo => {
  console.log(`${todo.content}: ${todo.status}`);
});
```

### Messages
```typescript
// All messages including tool calls
result.messages.forEach(msg => {
  if (msg.tool_calls) {
    msg.tool_calls.forEach(tc => {
      console.log(`Tool called: ${tc.name}`);
    });
  }
});
```

### Files (if using filesystem middleware)
```typescript
// Files are in state.files
// Accessed by tools automatically
```

---

## Subagent Types

### General-Purpose (Auto-created)

```typescript
{
  name: "general-purpose",
  description: "For complex questions, file searches, multi-step tasks",
  tools: [...] // Same as main agent
}
```

### Custom Specialized

```typescript
{
  name: "vc-report",
  description: "Expert in VC evaluation reports",
  systemPrompt: "You are a VC expert...",
  tools: [competitorTool, marketTool, customerTool]
}
```

---

## Debugging

### Enable Logging

```typescript
const result = await agent.invoke({ messages }, {
  configurable: { thread_id: "test-123" }
});

// Check todos
console.log("Todos:", result.todos);

// Check last message
const last = result.messages[result.messages.length - 1];
console.log("Last message:", last.content);

// Find tool calls
result.messages.forEach(msg => {
  if (msg.tool_calls?.some(tc => tc.name === "task")) {
    console.log("Subagent spawned!");
  }
  if (msg.tool_calls?.some(tc => tc.name === "write_todos")) {
    console.log("Plan created/updated!");
  }
});
```

---

## Key Concepts

| Concept | What It Does | State/Tool |
|---------|--------------|------------|
| **Planning** | Breaks tasks into steps, tracks progress | `write_todos` tool, `todos` state |
| **Subagents** | Spawns isolated sub-agents for tasks | `task` tool |
| **Context Isolation** | Subagents start fresh (no history) | Separate state per subagent |
| **Parallel Execution** | Multiple subagents run simultaneously | Multiple `task` calls |
| **Specialization** | Domain-specific subagents | Custom `systemPrompt` + `tools` |

---

## When to Use What

### Use `write_todos` when:
- ✅ Task has 3+ steps
- ✅ Need to show progress
- ✅ Plan might change as you learn
- ✅ User needs visibility

### Use `task` (subagents) when:
- ✅ Need deep analysis on specific topic
- ✅ Main agent's context getting cluttered
- ✅ Have specialized tools/prompts for subtask
- ✅ Want parallel execution

### Use both together when:
- ✅ Complex project with multiple deep dives
- ✅ Research + synthesis workflow
- ✅ Multi-step with specialized subtasks

---

## Examples to Run

```bash
# Planning demo
pnpm run dev 11

# Simple agent (no subagents, just planning)
pnpm run dev 7

# Full deep agent (planning + subagents + filesystem)
# Note: Currently has a bug, see docs/DEEPAGENTS_BUG_ANALYSIS.md
pnpm run dev 8
```

---

## Further Reading

- **Comprehensive Guide**: `docs/HOW_DEEPAGENTS_WORK.md`
- **Bug Analysis**: `docs/DEEPAGENTS_BUG_ANALYSIS.md`
- **Interactive Demo**: Run `pnpm run dev 11`

---

## Quick Cheat Sheet

```typescript
// Create agent
const agent = createDeepAgent({
  model,
  systemPrompt,
  tools,
  subagents: [{ name, description, systemPrompt, tools }]
});

// Invoke
const result = await agent.invoke({
  messages: [new HumanMessage("...")]
});

// Access results
result.todos          // Planning state
result.messages       // All messages
result.files          // Filesystem state (if using filesystem middleware)
```

That's it! You now understand the core of DeepAgents. 🎉
