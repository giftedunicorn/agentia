# 🏗️ Agentia Architecture Summary

## Project Overview

**Agentia** is a LangChain-based AI agent playground demonstrating clean, scalable agent architecture patterns.

**Key Achievement**: Clean separation between Agent/Tool/Service layers to solve the problem of "agent和tool的设计混乱，导致维护成本很高，很难扩展或者转型"

---

## 📁 Project Structure

```
agentia/
├── src/
│   ├── index.ts                          # All demos in one place
│   ├── langchain/
│   │   ├── agents/
│   │   │   ├── BaseAgent.ts              # Abstract base with ReAct loop
│   │   │   ├── ResearchAgent.ts          # Main market research agent
│   │   │   └── CompetitorResearchAgent.ts # Sub-agent for competitor research
│   │   ├── tools/
│   │   │   ├── competitorResearch.tool.ts      # Pattern 1: Mock data
│   │   │   ├── competitorResearch.subagent.tool.ts  # Pattern 3: Sub-agent
│   │   │   ├── marketSizeResearch.tool.ts
│   │   │   ├── customerAnalysis.tool.ts
│   │   │   ├── webSearch.tool.ts              # For sub-agent use
│   │   │   └── dataAnalysis.tool.ts           # For sub-agent use
│   │   ├── services/
│   │   │   ├── webSearch.service.ts      # Reusable web search
│   │   │   └── aiAnalyzer.service.ts     # Reusable AI analysis
│   │   └── types.ts
│   └── langchain/
│       └── models/
│           └── index.ts                  # Simple model config
├── REACT_LOOP.md                         # ReAct pattern explanation
├── SUBAGENT_PATTERN.md                   # Sub-agent pattern guide
└── package.json
```

---

## 🎯 Three-Layer Architecture

### Layer 1: Agent Layer (Orchestration)

**Purpose**: High-level task management and decision-making

**Files**:
- `BaseAgent.ts` - Core ReAct loop implementation
- `ResearchAgent.ts` - Market research orchestration
- `CompetitorResearchAgent.ts` - Competitor research sub-agent

**Responsibilities**:
- ✅ Invoke LangChain's ReAct loop
- ✅ Manage chat history and context
- ✅ Track execution metadata
- ❌ NO business logic
- ❌ NO direct API calls

```typescript
// Example: ResearchAgent
export class ResearchAgent extends BaseAgent {
  constructor() {
    super({
      name: "ResearchAgent",
      systemPrompt: "You are a professional market research analyst...",
      tools: [
        competitorResearchTool,
        marketSizeResearchTool,
        customerAnalysisTool
      ],
      model: new ChatGoogleGenerativeAI({...}),
    });
  }
}
```

### Layer 2: Tool Layer (Business Logic)

**Purpose**: Execute specific business capabilities

**Three Patterns**:

#### Pattern 1: Simple Tool (Mock Data)
```typescript
// competitorResearch.tool.ts
export const competitorResearchTool = tool(
  async ({ industry, region, limit }) => {
    // Returns mock data quickly
    return { competitors: [...], insights: [...] };
  },
  { name: "competitor_research", schema: z.object({...}) }
);
```
**When to use**: Testing, prototyping, offline development

#### Pattern 2: Service-Based Tool (Fixed Workflow)
```typescript
// competitorResearch.enhanced.tool.ts
export const competitorResearchToolEnhanced = tool(
  async ({ industry, region, limit }) => {
    // Step 1: Search web
    const results = await searchWeb(`competitors in ${industry}`);

    // Step 2: Analyze with AI
    const analysis = await analyzeWithAI(results, "Extract competitors...");

    return { competitors: analysis, insights: [...] };
  },
  { name: "competitor_research_enhanced", ... }
);
```
**When to use**: Clear workflow, fixed steps, service reusability

#### Pattern 3: Sub-Agent Tool (Autonomous)
```typescript
// competitorResearch.subagent.tool.ts
export const competitorResearchToolWithSubAgent = tool(
  async ({ industry, region, limit }) => {
    // Create specialized sub-agent
    const subAgent = createCompetitorResearchAgent();

    // Sub-agent autonomously plans and executes
    const result = await subAgent.invoke(
      `Research ${industry} competitors in ${region}...`,
      context
    );

    return { research: result.output, metadata: {...} };
  },
  { name: "competitor_research_subagent", ... }
);
```
**When to use**: Complex tasks, dynamic planning, multiple tool coordination

### Layer 3: Service Layer (Reusable Capabilities)

**Purpose**: Shared functionality across tools

**Files**:
- `webSearch.service.ts` - Web search capability
- `aiAnalyzer.service.ts` - AI analysis capability

**Benefits**:
- ✅ Reusable across multiple tools
- ✅ Easy to swap implementations (mock → real API)
- ✅ Testable in isolation

```typescript
// Example: Web Search Service
export async function searchWeb(query: string, options: {...}): Promise<SearchResponse> {
  // Can switch from mock to real API without changing tools
  return { query, results: [...], totalResults: 10 };
}
```

---

## 🔄 ReAct Loop Implementation

### What is ReAct?

**ReAct** = **Rea**soning + **Act**ing

An AI agent pattern where the model:
1. **Reasons** about what to do next
2. **Acts** by calling tools
3. **Observes** the results
4. **Repeats** until task complete

### Implementation in BaseAgent

```typescript
// src/langchain/agents/BaseAgent.ts

export abstract class BaseAgent {
  async invoke(input: string, context: AgentContext, chatHistory: BaseMessage[] = []) {
    // Initialize agent with tools
    const agent = createAgent({
      model: this.config.model,
      tools: this.config.tools,           // Available tools
      systemPrompt: this.config.systemPrompt
    });

    // LangChain's createAgent() implements ReAct loop internally:
    // Loop:
    //   1. Model reasons about next action
    //   2. Model decides: use tool or respond directly?
    //   3. If tool: execute tool, observe result
    //   4. Add result to context
    //   5. Continue until max iterations or task complete

    const result = await agent.invoke({ messages });

    // Extract steps taken (tool calls)
    const steps: AgentStep[] = [];
    for (const msg of result.messages) {
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        for (const toolCall of msg.tool_calls) {
          steps.push({
            action: toolCall.name,      // Which tool was used
            input: toolCall.args,       // What parameters
            timestamp: Date.now()
          });
        }
      }
    }

    return { output, steps, messages, metadata };
  }
}
```

### Example Execution Flow

```
User: "Analyze the coffee shop industry"

[Iteration 1]
💭 Reasoning: Need competitor information
🔧 Action: Call competitor_research({ industry: "coffee", region: "US" })
📊 Observation: { competitors: ["Starbucks", "Dunkin", ...] }

[Iteration 2]
💭 Reasoning: Need market size data
🔧 Action: Call market_size_research({ market: "coffee" })
📊 Observation: { marketSize: "$45.4B", growth: "5.2%" }

[Iteration 3]
💭 Reasoning: Have all information needed
✅ Response: Generate final analysis report
```

See **REACT_LOOP.md** for comprehensive explanation with diagrams.

---

## 🚀 Demo Examples (src/index.ts)

All demos consolidated in one file:

### Demo 1: Basic Research Query
```typescript
const agent = createResearchAgent();
const result = await agent.invoke(
  "What are the key competitors in the coffee shop industry?",
  context
);
```
Shows: Basic ReAct loop with tool calling

### Demo 2: Direct Tool Usage
```typescript
const result = await competitorResearchTool.invoke({
  industry: "coffee shops",
  region: "US",
  limit: 3
});
```
Shows: Using tools without agent (for testing)

### Demo 3: Comprehensive Startup Analysis
```typescript
const result = await agent.invoke(
  "Analyze this startup idea: CoWork Coffee...",
  context
);
```
Shows: Agent using multiple tools in parallel

### Demo 4: Multi-turn Conversation
```typescript
// Turn 1
let result = await agent.invoke("Tell me about coffee market", context);

// Turn 2 (with history)
result = await agent.invoke("Who are main competitors?", context, result.messages);
```
Shows: Maintaining conversation context

### Demo 5: Tool Architecture Patterns
Shows: Explanation of three tool patterns

### Demo 6: Sub-Agent Tool
```typescript
const result = await competitorResearchToolWithSubAgent.invoke({
  industry: "cloud storage",
  region: "Global"
});
```
Shows: Tool containing autonomous agent

### Demo 7: Nested Agents
```typescript
const mainAgent = createResearchAgent({
  tools: [competitorResearchToolWithSubAgent]
});

const result = await mainAgent.invoke(
  "Analyze electric vehicle competitors",
  context
);
```
Shows: Main agent → Sub-agent tool → Sub-agent with its own tools

---

## 🔑 Key Design Decisions

### 1. Keep BaseAgent ✅

**Decision**: After trying without it, kept BaseAgent for abstraction

**Rationale**:
- Provides common invoke/execute/stream methods
- Centralizes ReAct loop implementation
- Easier to extend with hooks (beforeInvoke, afterInvoke)
- Maintains LangChain API compatibility

### 2. Three-Layer Architecture ✅

**Decision**: Strict separation of Agent/Tool/Service

**Rationale**:
- Solves "design confusion" problem mentioned by user
- Each layer has single responsibility
- Easy to test layers independently
- Services are reusable across tools

### 3. Three Tool Patterns ✅

**Decision**: Provide multiple implementation patterns

**Rationale**:
- Simple tools for testing
- Service-based for real integrations
- Sub-agent for complex autonomous tasks
- Developers choose based on needs

### 4. Consolidated Examples ✅

**Decision**: All demos in src/index.ts

**Rationale**:
- Single file to explore all patterns
- Easy to comment/uncomment demos
- No scattered example files

---

## 📚 Documentation

### REACT_LOOP.md
- What is ReAct (Reasoning + Acting)
- Step-by-step execution flow with diagrams
- Tool use explanation (selection, invocation, observation)
- Parallel tool use
- Nested ReAct loops in sub-agents
- Comparison with traditional approaches

### SUBAGENT_PATTERN.md
- What is a sub-agent
- When to use sub-agent vs service-based tools
- Implementation guide
- Nested agent architecture

---

## 🛠️ Technology Stack

- **LangChain**: Official JavaScript framework for AI agents
- **TypeScript**: Full type safety
- **Zod**: Schema validation for tool parameters
- **pnpm**: Package manager (v10.24.0)
- **AI Providers**: Google Gemini (extensible to OpenAI, Anthropic, etc.)

---

## 🎓 How to Run

```bash
# Install dependencies
pnpm install

# Set API key (for real demos)
export GOOGLE_API_KEY="your-key-here"

# Run demos
pnpm dev

# Build project
pnpm build

# Run production build
pnpm start
```

---

## 🌟 Key Achievements

✅ **Clean Architecture**: Three-layer separation (Agent/Tool/Service)
✅ **Multiple Patterns**: Three tool implementation patterns
✅ **ReAct Loop**: Fully implemented via LangChain
✅ **Sub-Agent Pattern**: Tools containing autonomous agents
✅ **Type Safety**: Full TypeScript with Zod schemas
✅ **Extensible**: Easy to add new agents, tools, or services
✅ **Well-Documented**: Comprehensive guides for all patterns
✅ **Consolidated Examples**: All demos in one file

---

## 💡 Next Steps (Optional)

1. **Add Real API Integration**: Replace mock data with actual web search API
2. **More AI Providers**: Add OpenAI, Anthropic support via getModel()
3. **Streaming Support**: Implement real-time token streaming
4. **Memory Systems**: Add long-term memory for agents
5. **Testing Suite**: Unit tests for agents, tools, and services
6. **Production Tools**: Add error handling, retry logic, rate limiting

---

## 📖 Learn More

- [LangChain JS Docs](https://docs.langchain.com/oss/javascript/)
- [ReAct Paper](https://arxiv.org/abs/2210.03629)
- REACT_LOOP.md - Detailed ReAct explanation
- SUBAGENT_PATTERN.md - Sub-agent pattern guide

---

**Built to solve**: "agent和tool的设计混乱，导致维护成本很高，很难扩展或者转型"

**Result**: Clean, maintainable, extensible agent architecture ✨
