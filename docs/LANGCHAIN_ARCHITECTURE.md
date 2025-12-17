# Agentia - LangChain Architecture

## 为什么选择 LangChain？

你之前遇到的问题：
- ❌ Agent 和 Tool 的设计混乱
- ❌ 维护成本高
- ❌ 难以扩展或转型

LangChain 的解决方案：
- ✅ **清晰的职责分离**: Tool = 执行逻辑，Agent = 编排逻辑
- ✅ **成熟的抽象**: DynamicStructuredTool, AgentExecutor 经过实战检验
- ✅ **易于维护**: 每个 Tool 独立，修改不影响其他组件
- ✅ **易于扩展**: 添加新 Tool 不需要改动 Agent 代码
- ✅ **类型安全**: Zod schema 自动验证和类型推导

## 架构概览

```
src/langchain/
├── types.ts                    # 共享类型定义
├── tools/                      # 工具层（独立、可复用）
│   ├── research/               # 按功能分类
│   │   ├── competitorResearch.ts
│   │   ├── marketSizeResearch.ts
│   │   └── customerAnalysis.ts
│   └── index.ts                # 工具导出
└── agents/                     # Agent 层（编排）
    ├── BaseAgent.ts            # 基础 Agent 类
    └── ResearchAgent.ts        # 具体 Agent 实现
```

## 核心原则

### 1. 关注点分离 (Separation of Concerns)

**Tool 的职责：**
- ✅ 定义输入 schema
- ✅ 实现执行逻辑
- ✅ 返回结构化输出
- ❌ **不关心**谁在使用它
- ❌ **不关心**如何被编排

**Agent 的职责：**
- ✅ 配置系统提示词
- ✅ 选择使用哪些 Tools
- ✅ 编排 Tool 调用
- ❌ **不实现** Tool 逻辑
- ❌ **不硬编码** Tool 调用

### 2. 单一职责 (Single Responsibility)

每个 Tool 只做一件事：

```typescript
// ✅ 好的设计 - 职责清晰
competitorResearchTool  // 只做竞争对手研究
marketSizeResearchTool  // 只做市场规模研究
customerAnalysisTool    // 只做客户分析

// ❌ 不好的设计 - 职责混乱
comprehensiveResearchTool  // 做太多事情，难以维护
```

### 3. 可测试性 (Testability)

工具是纯函数，易于测试：

```typescript
// Tool 实现
async function executeCompetitorResearch(input) {
  // 纯函数逻辑
  return result;
}

// 测试
test('competitor research', async () => {
  const result = await executeCompetitorResearch({
    industry: 'coffee',
    region: 'US'
  });
  expect(result.competitors).toBeDefined();
});
```

## 详细设计

### Tool 设计模式

```typescript
// 1. 定义 Schema
const schema = z.object({
  param1: z.string().describe("Clear description"),
  param2: z.number().optional().default(5),
});

// 2. 实现执行函数（纯函数）
async function execute(input: z.infer<typeof schema>) {
  // 业务逻辑
  return result;
}

// 3. 创建 Tool
export const myTool = new DynamicStructuredTool({
  name: "my_tool",
  description: "Clear description for AI to understand when to use",
  schema,
  func: execute,
});
```

**关键点：**
- Schema 使用 `.describe()` 提供详细描述（帮助 AI 理解）
- 执行函数是纯函数（易测试、易理解）
- 一个文件一个 Tool（清晰、易维护）

### Agent 设计模式

```typescript
export class MyAgent extends BaseAgent {
  constructor(apiKey: string) {
    const model = new ChatGoogleGenerativeAI({
      apiKey,
      modelName: "gemini-2.0-flash-exp",
    });

    super({
      name: "MyAgent",
      description: "What this agent does",
      systemPrompt: `Clear instructions for the agent...`,
      model,
      tools: [tool1, tool2, tool3],  // 只是配置，不实现
      maxIterations: 10,
    });
  }
}
```

**关键点：**
- Agent 只是配置（系统提示词 + 工具列表）
- 不包含工具实现逻辑
- BaseAgent 处理所有编排细节

### BaseAgent 实现

使用 LangChain 的 `AgentExecutor`：

```typescript
export abstract class BaseAgent {
  protected executor: AgentExecutor;

  async execute(input: string, context: AgentContext) {
    // 1. 创建 prompt template
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", this.config.systemPrompt],
      ["placeholder", "{chat_history}"],
      ["human", "{input}"],
      ["placeholder", "{agent_scratchpad}"],
    ]);

    // 2. 创建 agent
    const agent = await createToolCallingAgent({
      llm: this.config.model,
      tools: this.config.tools,
      prompt,
    });

    // 3. 使用 executor 执行
    const result = await this.executor.invoke({
      input,
      chat_history: chatHistory,
    });

    return result;
  }
}
```

**优势：**
- LangChain 处理 tool calling 的所有复杂性
- 自动管理 agent scratchpad
- 内置并行 tool calling 支持
- 成熟、稳定、经过大量使用验证

## 使用示例

### 添加新 Tool

**步骤 1: 创建 Tool 文件**

```typescript
// src/langchain/tools/research/trendAnalysis.ts
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

const schema = z.object({
  industry: z.string(),
  timeframe: z.string().optional().default("5 years"),
});

async function execute(input: z.infer<typeof schema>) {
  // 实现逻辑
  return { trends: [...], insights: [...] };
}

export const trendAnalysisTool = new DynamicStructuredTool({
  name: "trend_analysis",
  description: "Analyze industry trends over time",
  schema,
  func: execute,
});
```

**步骤 2: 导出 Tool**

```typescript
// src/langchain/tools/index.ts
export { trendAnalysisTool } from "./research/trendAnalysis.js";

export const researchTools = [
  competitorResearchTool,
  marketSizeResearchTool,
  customerAnalysisTool,
  trendAnalysisTool,  // 添加新工具
];
```

**完成！** 不需要修改任何 Agent 代码，新 Tool 自动可用。

### 创建新 Agent

```typescript
// src/langchain/agents/SalesAgent.ts
import { BaseAgent } from "./BaseAgent.js";
import { salesTools } from "../tools/index.js";

export class SalesAgent extends BaseAgent {
  constructor(apiKey: string) {
    super({
      name: "SalesAgent",
      description: "Sales and lead generation specialist",
      systemPrompt: `You are a sales expert...`,
      model: new ChatGoogleGenerativeAI({ apiKey }),
      tools: salesTools,
    });
  }
}
```

**就这么简单！**

## 并行 Tool 调用

LangChain 自动处理并行调用，你不需要做任何特殊处理：

```
用户: "分析咖啡店创业idea，需要竞争对手和市场规模数据"

LangChain Agent 执行流程:
1. AI 分析需求
   → 需要：competitor_research + market_size_research

2. 并行调用 Tools（自动）
   → [competitor_research, market_size_research] 同时执行

3. 等待所有结果

4. AI 综合分析生成报告
```

**关键参数：**
- `maxIterations` - 控制最大工具调用轮次
- `returnIntermediateSteps: true` - 返回详细步骤

## 对比：之前 vs 现在

### 之前的问题

```typescript
// ❌ Agent 和 Tool 混在一起
class MyAgent {
  async execute(input) {
    // 工具逻辑直接写在 Agent 里
    if (需要竞争对手数据) {
      const data = await fetch(...);  // 耦合
      // 处理逻辑...
    }

    if (需要市场数据) {
      const data = await fetch(...);  // 重复
      // 处理逻辑...
    }
  }
}

// 问题：
// - Tool 逻辑和 Agent 逻辑混在一起
// - 难以复用
// - 修改一个影响另一个
// - 测试困难
```

### 现在的设计

```typescript
// ✅ Tool 独立定义
export const competitorResearchTool = new DynamicStructuredTool({
  name: "competitor_research",
  description: "...",
  schema: z.object({...}),
  func: async (input) => { /* 纯函数 */ },
});

// ✅ Agent 只配置
export class ResearchAgent extends BaseAgent {
  constructor(apiKey) {
    super({
      tools: [competitorResearchTool, ...],  // 只是引用
      systemPrompt: "...",
    });
  }
}

// 优势：
// ✅ 职责清晰
// ✅ 易于复用
// ✅ 独立测试
// ✅ 易于维护
```

## 扩展性

### 添加新功能类别

```
src/langchain/tools/
├── research/          # 研究类工具
├── sales/             # 销售类工具（新增）
│   ├── leadGeneration.ts
│   ├── emailComposer.ts
│   └── followUpScheduler.ts
└── analytics/         # 分析类工具（新增）
    ├── dataVisualization.ts
    └── trendForecasting.ts
```

每个类别独立，互不影响。

### 支持多个 LLM 提供商

```typescript
// Google
const model = new ChatGoogleGenerativeAI({ apiKey });

// OpenAI
const model = new ChatOpenAI({ apiKey });

// Anthropic
const model = new ChatAnthropic({ apiKey });

// 所有都用相同的 Agent 和 Tool 架构！
```

## 最佳实践

### 1. Tool 命名

- ✅ 使用清晰的动词 + 名词: `competitor_research`, `market_size_research`
- ❌ 避免模糊命名: `research_tool`, `analyze`

### 2. Tool 描述

```typescript
// ✅ 好的描述
description: `Research competitors in a specific industry and region.
Returns detailed analysis of top competitors including market share, strengths, weaknesses.
Use this when you need to understand the competitive landscape.`

// ❌ 不好的描述
description: "Research competitors"
```

### 3. Schema 设计

```typescript
// ✅ 好的 schema
z.object({
  industry: z.string().describe("The industry to research (e.g., 'coffee shops')"),
  region: z.string().describe("Geographic region (e.g., 'US', 'Europe')"),
  limit: z.number().optional().default(5).describe("Number of competitors"),
});

// ❌ 不好的 schema
z.object({
  industry: z.string(),  // 缺少描述
  region: z.string(),
});
```

### 4. 系统提示词

```typescript
// ✅ 好的系统提示词
systemPrompt: `You are a market research analyst.

Your tools:
- competitor_research: Use when analyzing competitive landscape
- market_size_research: Use for market sizing and growth analysis

When conducting research:
1. Identify what information you need
2. Use tools in parallel when data is independent
3. Synthesize findings into actionable insights

Be data-driven and cite your sources.`

// ❌ 不好的系统提示词
systemPrompt: "You are a research agent."
```

## 总结

### 架构优势

1. **清晰的关注点分离**
   - Tool = 纯函数，只负责执行
   - Agent = 配置，只负责编排

2. **易于维护**
   - 每个 Tool 一个文件
   - 修改 Tool 不影响 Agent
   - 修改 Agent 不影响 Tool

3. **易于扩展**
   - 添加新 Tool：创建文件 + 导出
   - 创建新 Agent：继承 BaseAgent + 配置
   - 无需修改现有代码

4. **易于测试**
   - Tool 是纯函数，易于单元测试
   - Agent 可以用 mock tools 测试
   - 集成测试简单直接

5. **类型安全**
   - Zod schema 自动验证
   - TypeScript 类型推导
   - 编译时捕获错误

### 与之前的对比

| 方面 | 之前（自己实现） | 现在（LangChain） |
|------|---------------|----------------|
| Tool 管理 | 混乱，耦合 | 清晰，独立 |
| Agent 逻辑 | 复杂，混杂 | 简单，配置 |
| 维护成本 | 高 | 低 |
| 扩展性 | 困难 | 容易 |
| 测试 | 困难 | 容易 |
| 并行调用 | 手动实现 | 自动处理 |
| 稳定性 | 自己保证 | LangChain 保证 |

**结论：使用 LangChain = 站在巨人的肩膀上，专注于业务逻辑而不是基础设施。**
