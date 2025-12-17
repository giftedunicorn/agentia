# How DeepAgents Work: Core Concepts

This guide explains the two most important features of DeepAgents: Planning and Subagent Spawning.

## 1. Planning & Task Decomposition (`write_todos` tool)

### What It Does

The `todoListMiddleware()` adds a `write_todos` tool that lets the agent:
- Break down complex tasks into discrete steps
- Track progress with status (pending, in_progress, completed)
- Adapt plans as new information emerges
- Give users visibility into what the agent is doing

### How It Works

When you add `todoListMiddleware()` to your agent:

```typescript
const middleware = [
  todoListMiddleware(),  // Adds write_todos tool + todos state
  // ... other middleware
];
```

**Three things happen:**

1. **Tool Added**: A `write_todos` tool becomes available to the agent
2. **State Added**: A `todos` array is added to the agent's state
3. **System Prompt Injected**: Instructions on when/how to use todos

### The Todo Schema

Each todo item has this structure:

```typescript
{
  content: string;           // "Run the build"
  status: "pending" |        // Not started yet
          "in_progress" |    // Currently working on it
          "completed";       // Done!
  activeForm: string;        // "Running the build" (present continuous)
}
```

### Example: Agent Using write_todos

**User asks**: "Build a new feature with tests and documentation"

**Agent thinks**: "This is complex, I should use write_todos"

**Agent calls**:
```typescript
write_todos({
  todos: [
    { content: "Design the feature API", status: "pending", activeForm: "Designing the feature API" },
    { content: "Implement core functionality", status: "pending", activeForm: "Implementing core functionality" },
    { content: "Write unit tests", status: "pending", activeForm: "Writing unit tests" },
    { content: "Add documentation", status: "pending", activeForm: "Adding documentation" },
    { content: "Run tests and build", status: "pending", activeForm: "Running tests and build" }
  ]
})
```

**Agent starts work**, updates first todo:
```typescript
write_todos({
  todos: [
    { content: "Design the feature API", status: "in_progress", activeForm: "Designing the feature API" },
    { content: "Implement core functionality", status: "pending", activeForm: "Implementing core functionality" },
    // ...
  ]
})
```

**Agent completes first step**:
```typescript
write_todos({
  todos: [
    { content: "Design the feature API", status: "completed", activeForm: "Designing the feature API" },
    { content: "Implement core functionality", status: "in_progress", activeForm: "Implementing core functionality" },
    // ...
  ]
})
```

### When Agents Use write_todos

From the system prompt, agents use it when:

✅ **DO use** for:
- Complex multi-step tasks (3+ steps)
- Tasks requiring careful planning
- When user provides multiple requirements
- Long-running operations where user needs progress updates

❌ **DON'T use** for:
- Simple 1-2 step tasks
- Straightforward requests
- Informational queries

### Accessing Todos in Code

```typescript
const result = await agent.invoke({
  messages: [new HumanMessage("Build a feature")]
});

// Access the todos state
console.log(result.todos);
// [
//   { content: "Design API", status: "completed", activeForm: "..." },
//   { content: "Implement", status: "in_progress", activeForm: "..." },
//   { content: "Test", status: "pending", activeForm: "..." }
// ]
```

---

## 2. Subagent Spawning (Context Isolation)

### What It Does

The `createSubAgentMiddleware()` adds a `task` tool that lets the agent:
- Spawn specialized subagents for specific tasks
- Isolate context (subagent has its own clean context window)
- Keep main agent's context focused
- Run multiple subagents in parallel for efficiency

### How It Works

When you add `createSubAgentMiddleware()`:

```typescript
const middleware = [
  todoListMiddleware(),
  createFilesystemMiddleware({ backend }),
  createSubAgentMiddleware({
    defaultModel: model,
    defaultTools: tools,
    defaultMiddleware: [/* middleware for subagents */],
    subagents: [
      {
        name: "vc-report",
        description: "Expert in generating VC evaluation reports",
        systemPrompt: "You are a VC evaluation expert...",
        tools: [competitorTool, marketTool, customerTool]
      }
    ],
    generalPurposeAgent: true,  // Also creates a general-purpose subagent
  }),
  // ... other middleware
];
```

**This creates:**

1. **`task` tool**: Main agent can call this to spawn subagents
2. **Subagent instances**: Pre-configured specialists (vc-report, general-purpose)
3. **State isolation**: Each subagent has independent context

### Example: Main Agent Using Subagents

**User asks**: "I need a complete VC evaluation report for my AI startup"

**Main agent thinks**: "This needs deep analysis. I should delegate to vc-report subagent"

**Main agent calls**:
```typescript
task({
  subagent_type: "vc-report",
  description: `Generate a comprehensive VC evaluation report for an AI code documentation tool.

Startup idea: AI-powered tool that automatically keeps docs up-to-date by analyzing git commits.

Please provide:
1. Competitive analysis
2. Market sizing (TAM/SAM/SOM)
3. Customer analysis
4. SWOT analysis
5. Investment recommendation with scoring

Be thorough and data-driven.`
})
```

**What happens**:

1. **Subagent spawned**: A fresh vc-report agent is created
2. **Isolated context**: Subagent starts with ONLY the description above (clean slate)
3. **Subagent works**: Uses its tools (competitorTool, marketTool, customerTool)
4. **Result returned**: Subagent's final response goes back to main agent
5. **Main agent synthesizes**: Main agent receives result and responds to user

### Subagent Architecture

```
┌─────────────────────────────────────────────┐
│         Main Agent (Parent)                 │
│  Context: Full conversation with user       │
│  Tools: Basic tools + task tool             │
│                                             │
│  When complex task needed:                  │
│  ↓ Spawns subagent via task() tool          │
└─────────────────────────────────────────────┘
                    │
                    ↓
    ┌───────────────────────────────────────┐
    │    Subagent (Child - Isolated)        │
    │  Context: ONLY the task description   │
    │  Tools: Specialized tools             │
    │  Middleware: Own middleware stack     │
    │                                       │
    │  Works autonomously:                  │
    │  1. Receives task description         │
    │  2. Plans approach                    │
    │  3. Uses tools                        │
    │  4. Returns final result              │
    └───────────────────────────────────────┘
                    │
                    ↓ Returns result
    ┌───────────────────────────────────────┐
    │    Main Agent continues               │
    │  - Receives subagent's result         │
    │  - Synthesizes with conversation      │
    │  - Responds to user                   │
    └───────────────────────────────────────┘
```

### Types of Subagents

**1. General-Purpose Agent** (automatically created if `generalPurposeAgent: true`)
```typescript
{
  name: "general-purpose",
  description: "For researching complex questions, searching files, multi-step tasks",
  tools: [/* Same tools as main agent */]
}
```

Use for: Context isolation, complex searches, multi-step tasks

**2. Custom Specialized Agents** (you define these)
```typescript
{
  name: "vc-report",
  description: "Expert in VC evaluation reports",
  systemPrompt: "You are a VC evaluation expert...",
  tools: [competitorTool, marketTool, customerTool]
}
```

Use for: Domain-specific expertise, specialized analysis

### Example: Parallel Subagent Execution

Main agent can spawn multiple subagents in parallel:

```typescript
// Main agent does this in ONE message:
[
  task({ subagent_type: "vc-report", description: "Analyze competitors..." }),
  task({ subagent_type: "vc-report", description: "Size the market..." }),
  task({ subagent_type: "vc-report", description: "Research customers..." })
]
```

All three subagents run simultaneously, maximizing efficiency!

### Subagent Inheritance

Subagents inherit from `defaultMiddleware`:

```typescript
createSubAgentMiddleware({
  defaultModel: model,
  defaultTools: tools,
  defaultMiddleware: [
    todoListMiddleware(),              // Subagents can use write_todos
    summarizationMiddleware(...),      // Subagents can auto-summarize
    createPatchToolCallsMiddleware(),  // Subagents get tool call patches
  ],
  subagents: [...]
})
```

**Each subagent gets**:
- The middleware stack from `defaultMiddleware`
- Its own tools (from `tools:` in SubAgent config, or `defaultTools`)
- Its own system prompt
- Isolated state (fresh start for each invocation)

---

## Complete Example: Planning + Subagents Together

Let's see both features working together:

```typescript
// src/examples/08-deep-agent.ts (conceptual)

const agent = createDeepAgent({
  model,
  systemPrompt: MAIN_SYSTEM_PROMPT,
  tools: [competitorTool, marketTool, customerTool],
  subagents: [vcReportSubAgent],
});

// User asks for complex task
const result = await agent.invoke({
  messages: [new HumanMessage(
    "I need a complete analysis: competitors, market, customers, and VC report"
  )]
});
```

**What happens inside**:

1. **Main agent** receives request
2. **Main agent** creates plan with `write_todos`:
   ```typescript
   write_todos({
     todos: [
       { content: "Analyze competitors", status: "pending" },
       { content: "Size the market", status: "pending" },
       { content: "Research customers", status: "pending" },
       { content: "Generate VC report", status: "pending" }
     ]
   })
   ```

3. **Main agent** marks first todo as in_progress, spawns subagent:
   ```typescript
   task({
     subagent_type: "general-purpose",
     description: "Research competitors in AI code documentation space..."
   })
   ```

4. **Subagent** works autonomously:
   - Uses `competitorTool`
   - Returns comprehensive analysis

5. **Main agent** receives result, marks todo as completed:
   ```typescript
   write_todos({
     todos: [
       { content: "Analyze competitors", status: "completed" },
       { content: "Size the market", status: "in_progress" },
       ...
     ]
   })
   ```

6. **Main agent** spawns next subagent for market sizing

7. Repeat until all todos completed

8. **Main agent** synthesizes all subagent results and responds to user

---

## Key Design Principles

### Planning (write_todos)
- **Visibility**: User can see agent's plan
- **Adaptability**: Agent can revise plan as it learns
- **Structure**: Breaks complexity into manageable steps
- **Progress tracking**: Clear status updates

### Subagents (task tool)
- **Isolation**: Each subagent has clean context
- **Specialization**: Expert agents for specific domains
- **Efficiency**: Parallel execution possible
- **Scalability**: Main agent stays focused, subagents go deep

---

## Debugging Tips

### View Todos
```typescript
const result = await agent.invoke({ messages });
console.log("Current todos:", result.todos);
```

### View Subagent Calls
Look for ToolMessage with tool_name="task" in the messages:
```typescript
result.messages.forEach(msg => {
  if (msg.tool_calls?.some(tc => tc.name === "task")) {
    console.log("Spawned subagent:", msg.tool_calls);
  }
});
```

### Enable Debug Logging
```typescript
const agent = createDeepAgent({
  // ...
  middleware: [
    // Add debug middleware to see what's happening
    createMiddleware({
      name: "debug",
      beforeAgent: (state) => {
        console.log("State before agent:", state);
      }
    }),
    todoListMiddleware(),
    // ...
  ]
});
```

---

## Common Patterns

### Pattern 1: Research → Synthesize
```typescript
// Main agent:
// 1. Creates plan with write_todos
// 2. Spawns multiple research subagents in parallel
// 3. Collects results
// 4. Synthesizes into final response
```

### Pattern 2: Iterative Refinement
```typescript
// Main agent:
// 1. Creates initial plan
// 2. Starts executing
// 3. Discovers new requirements
// 4. Updates plan with write_todos (adds new todos)
// 5. Continues with updated plan
```

### Pattern 3: Specialized Analysis
```typescript
// Main agent:
// 1. Routes complex domain-specific question
// 2. Delegates to specialist subagent (e.g., vc-report)
// 3. Subagent does deep analysis with domain tools
// 4. Main agent formats result for user
```

---

## Summary

| Feature | Tool | State | Purpose |
|---------|------|-------|---------|
| **Planning** | `write_todos` | `todos` array | Break down tasks, track progress |
| **Subagents** | `task` | Isolated per subagent | Context isolation, specialization |

Both features work together to enable agents to:
- Handle complex, multi-step tasks systematically
- Maintain clean context through delegation
- Provide visibility into their work
- Scale to challenging problems

The magic is in the **combination**: Main agent plans with todos, delegates deep work to subagents, and synthesizes everything into a coherent response.
