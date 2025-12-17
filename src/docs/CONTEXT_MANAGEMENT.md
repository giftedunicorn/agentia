# 上下文管理 - Agent 的核心

## 为什么上下文管理如此重要？

在创业顾问对话场景中，上下文管理直接决定了 Agent 的质量：

### ❌ 差的上下文管理
```
用户：我想做一个 AI 代码助手
Agent：很好的想法！

用户：竞对有谁？
Agent：[调用工具] 主要竞对有 GitHub Copilot...

用户：那我应该如何差异化？
Agent：请问你的创业想法是什么？  ❌ 忘记了用户说的"AI 代码助手"
```

### ✅ 好的上下文管理
```
用户：我想做一个 AI 代码助手
Agent：[记住：idea="AI代码助手"] 很好的想法！

用户：竞对有谁？
Agent：[记住：已分析竞对] 主要竞对有 GitHub Copilot...

用户：那我应该如何差异化？
Agent：基于你的 AI 代码助手想法，以及刚才分析的竞对情况...  ✅ 记住了所有上下文
```

## 上下文的 5 个层次

```
┌─────────────────────────────────────────────────┐
│ Level 5: 跨会话记忆 (Long-term Memory)          │
│ - 用户的历史想法                                 │
│ - 之前的评估结果                                 │
│ - 用户偏好和风格                                 │
└─────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────┐
│ Level 4: 结构化知识图谱 (Knowledge Graph)        │
│ - 创业想法 → 竞对 → 市场 → 客户的关系            │
│ - 实体提取和关系映射                             │
└─────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────┐
│ Level 3: 工作记忆 (Working Memory)               │
│ - 当前讨论的创业想法                             │
│ - 已执行的工具和结果                             │
│ - 用户当前关注的问题                             │
└─────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────┐
│ Level 2: 对话历史 (Conversation History)         │
│ - 完整的消息序列                                 │
│ - Token 管理和摘要                               │
└─────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────┐
│ Level 1: 单轮上下文 (Single Turn Context)        │
│ - 当前用户输入                                   │
│ - 系统 Prompt                                   │
└─────────────────────────────────────────────────┘
```

## 当前 Playground 的上下文管理（Level 2）

### 现状
```typescript
let state = { messages: [] };

// 每轮对话
state.messages.push(new HumanMessage(input));
const result = await agent.invoke(state);
state = result; // 简单累积所有消息
```

### 问题
1. **无结构化提取** - 不知道用户的创业想法是什么
2. **无记忆管理** - 消息越来越多，超出 token 限制
3. **无工具结果缓存** - 重复问题会重复调用工具
4. **无跨会话持久化** - 关闭程序后一切重置

## 完善的上下文管理架构

### 架构设计

```typescript
interface ConversationContext {
  // 会话元信息
  sessionId: string;
  userId?: string;
  createdAt: Date;

  // Level 3: 工作记忆（最重要！）
  workingMemory: {
    // 结构化的创业想法信息
    idea: {
      description: string;
      category?: string;
      targetMarket?: string;
      keyFeatures?: string[];
    };

    // 已执行的分析（缓存）
    analyses: {
      competitor?: CompetitorAnalysis;
      market?: MarketAnalysis;
      customer?: CustomerAnalysis;
      vcReport?: VCReport;
    };

    // 当前焦点（用户最近关心什么）
    currentFocus?: "competitor" | "market" | "customer" | "strategy";

    // 待办事项（Agent 建议但未执行的）
    recommendations: string[];
  };

  // Level 2: 对话历史（带摘要）
  conversationHistory: {
    messages: BaseMessage[];
    summary?: string; // 当消息太多时的摘要
    tokenCount: number;
  };

  // Level 4: 知识图谱（可选）
  knowledgeGraph?: {
    entities: Map<string, Entity>;
    relations: Relation[];
  };
}
```

### 关键组件

#### 1. Context Extractor（上下文提取器）
从对话中提取结构化信息

```typescript
// 用户说："我想做一个 AI 代码助手"
// 提取 → { idea: { description: "AI代码助手", category: "Developer Tools" } }

// 用户说："主要面向小团队"
// 更新 → { idea: { ..., targetMarket: "小团队" } }
```

#### 2. Memory Manager（记忆管理器）
管理 token 限制和摘要

```typescript
// 当消息超过 8000 tokens
// 自动摘要前面的对话，保留最近 5 轮
```

#### 3. Cache Manager（缓存管理器）
避免重复调用工具

```typescript
// 第一次："竞对有谁？" → 调用 competitor_analysis
// 第二次："竞对的定价如何？" → 从缓存读取，不重复调用
```

#### 4. Context Provider（上下文注入器）
将上下文注入到 Agent 的 System Prompt

```typescript
const systemPrompt = `
You are a startup advisor.

CURRENT CONTEXT:
- User's idea: ${context.workingMemory.idea.description}
- Analyses completed: ${Object.keys(context.workingMemory.analyses).join(", ")}
- Current focus: ${context.workingMemory.currentFocus}

Use this context to provide relevant advice without asking redundant questions.
`;
```

## 实现策略

### 策略 1: 简单但有效（推荐开始）

```typescript
// 1. 手动提取关键信息
const ideaExtractor = createTool({
  name: "extract_startup_idea",
  description: "内部工具：从用户输入提取创业想法信息",
  schema: z.object({
    description: z.string(),
    category: z.string().optional(),
  }),
  execute: async (input) => {
    // 保存到 workingMemory
    return { success: true };
  }
});

// 2. 在 System Prompt 中注入上下文
const buildSystemPrompt = (context) => `
You are a startup advisor.

IMPORTANT CONTEXT (use this in your responses):
${context.idea ? `- User's startup idea: ${context.idea.description}` : ""}
${context.analyses.competitor ? "- Competitor analysis: COMPLETED" : ""}
${context.analyses.market ? "- Market analysis: COMPLETED" : ""}

Never ask the user to repeat information they've already provided.
`;
```

### 策略 2: LangChain Memory（中等复杂度）

```typescript
import { BufferMemory, ConversationSummaryMemory } from "langchain/memory";

// 自动摘要超长对话
const memory = new ConversationSummaryMemory({
  llm: new ChatOpenAI({ modelName: "gpt-4o-mini" }),
  maxTokenLimit: 2000,
});
```

### 策略 3: 完全自定义（高级）

```typescript
class StartupAdvisorMemory {
  private workingMemory: WorkingMemory;
  private conversationHistory: BaseMessage[];

  async extractContext(message: string): Promise<void> {
    // 使用 LLM 提取结构化信息
    const extraction = await extractionChain.invoke({ message });
    this.updateWorkingMemory(extraction);
  }

  async getRelevantContext(): Promise<string> {
    // 智能选择最相关的上下文
    return this.buildContextPrompt();
  }

  async summarizeIfNeeded(): Promise<void> {
    // 自动摘要管理
  }
}
```

## 实际例子对比

### 没有好的上下文管理

```
Turn 1:
用户: 我想做一个 AI 代码助手
Agent: 很好！你想了解什么？

Turn 2:
用户: 竞对有谁？
Agent: [调用工具] GitHub Copilot, Cursor...

Turn 3:
用户: 我应该如何定价？
Agent: 请问你的产品是什么？ ❌
```

### 有完善的上下文管理

```
Turn 1:
用户: 我想做一个 AI 代码助手
Agent: [提取: idea="AI代码助手"] 很好！你想了解什么？

Turn 2:
用户: 竞对有谁？
Agent: [调用工具并缓存结果] GitHub Copilot, Cursor...
      [更新: currentFocus="competitor"]

Turn 3:
用户: 我应该如何定价？
Agent: [读取缓存的竞对分析]
      基于你的 AI 代码助手想法，以及刚才分析的竞对：
      - GitHub Copilot: $10/月
      - Cursor: $20/月
      建议你可以定价 $15/月... ✅
```

## 下一步实现

我将为你创建：

1. **`context/memory.ts`** - 工作记忆管理器
2. **`context/extractor.ts`** - 上下文提取工具
3. **`context/cache.ts`** - 工具结果缓存
4. **`examples/04-with-context.ts`** - 带完整上下文管理的示例

这样你就能看到上下文管理如何显著提升 Agent 的质量！
