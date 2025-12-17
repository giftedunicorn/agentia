# Agentia - Agent Architecture Documentation

## Overview

Agentia 是一个通用的 AI Agent 框架，提供了完整的基础设施来构建、管理和运行 AI 代理。

## 核心组件

### 1. BaseAgent (基础代理类)

`src/agents/BaseAgent.ts`

所有 Agent 都继承自 `BaseAgent`，它提供了：

**核心功能：**
- ✅ **Lifecycle Hooks** (生命周期钩子): `beforeExecute`, `afterExecute`
- ✅ **Message Building** (消息构建): 自动管理对话历史
- ✅ **Tool Management** (工具管理): 集成工具注册表
- ✅ **Logging** (日志): 结构化日志记录
- ✅ **Metrics** (指标): 自动收集性能指标

**配置选项：**
```typescript
interface AgentConfig {
  name: string;              // Agent 名称
  description: string;       // Agent 描述
  model: ModelConfig;        // 使用的 AI 模型
  systemPrompt: string | (() => string);  // 系统提示词
  tools: string[];           // 工具 ID 列表
  temperature?: number;      // 温度参数 (默认 0.7)
  maxTokens?: number;        // 最大 token 数
  maxSteps?: number;         // 最大步骤数（工具调用循环）
  enabled?: boolean;         // 是否启用
}
```

**执行流程：**
```
1. beforeExecute(context)  → 执行前的准备工作
2. buildMessages()         → 构建对话消息
3. getTools()              → 获取可用工具
4. [AI Model Execution]    → AI 模型执行（可能多次调用工具）
5. afterExecute(result)    → 执行后的清理工作
```

### 2. Context (上下文)

`AgentContext` 包含执行所需的所有上下文信息：

```typescript
interface AgentContext {
  sessionId: string;                    // 会话 ID
  userId: string;                       // 用户 ID
  conversationHistory: CoreMessage[];   // 对话历史
  memory: Memory;                       // 记忆系统
  metadata: Record<string, any>;        // 元数据
}
```

**Memory (记忆系统):**
```typescript
interface Memory {
  shortTerm: {
    messages: CoreMessage[];   // 短期消息
    toolCalls: any[];          // 工具调用记录
    decisions: any[];          // 决策记录
  };
  longTerm: {
    userPreferences: Record<string, any>;  // 用户偏好
    previousAnalyses: any[];               // 历史分析
    learnings: any[];                      // 学习内容
  };
  working: {
    currentTask?: any;                     // 当前任务
    scratchpad: Record<string, any>;       // 临时数据
  };
}
```

### 3. Tool Registry (工具注册表)

`src/tools/ToolRegistry.ts`

集中管理所有可用工具：

**工具定义：**
```typescript
interface ToolDefinition {
  id: string;                    // 工具唯一 ID
  name: string;                  // 工具名称
  description: string;           // 工具描述
  inputSchema: z.ZodSchema;      // 输入 schema (使用 Zod)
  tool: any;                     // Vercel AI SDK 工具实例
  execute: (input, context) => Promise<any>;  // 执行函数
  metadata: {
    category: string;            // 类别
    tags: string[];              // 标签
    requiresAuth?: boolean;      // 是否需要认证
    estimatedCost?: number;      // 预估成本 (USD)
    estimatedDuration?: number;  // 预估耗时 (ms)
    version?: string;            // 版本号
  };
}
```

**功能：**
- `register(tool)` - 注册工具
- `get(id)` - 获取工具
- `getByCategory(category)` - 按类别获取
- `searchByTags(tags)` - 按标签搜索
- `getStats()` - 获取统计信息

### 4. Observability (可观测性)

#### Logger (日志系统)
`src/agents/observability/Logger.ts`

结构化日志，支持多个级别：
- `debug()` - 调试信息
- `info()` - 一般信息
- `warn()` - 警告
- `error()` - 错误

```typescript
logger.info('ResearchAgent', 'analysis_complete', {
  sessionId: 'session_123',
  duration: 2500,
  toolsUsed: ['competitor_research', 'market_size_research']
});
```

#### MetricsCollector (指标收集)
`src/agents/observability/Metrics.ts`

自动收集性能指标：
- Agent 执行时间
- Tool 调用次数和耗时
- Token 使用量和成本
- API 调用状态

```typescript
metrics.recordAgentExecution('ResearchAgent', 2500, true);
metrics.recordTokenUsage('ResearchAgent', 1200, 800, 0.0012);
```

### 5. Result (执行结果)

```typescript
interface AgentResult {
  success: boolean;           // 是否成功
  output: string;             // 输出内容
  toolCalls: any[];           // 工具调用记录
  usage: TokenUsage;          // Token 使用情况
  state: AgentState;          // 执行状态
  error?: Error;              // 错误信息（如果有）
  metadata?: Record<string, any>;  // 额外元数据
}

interface TokenUsage {
  inputTokens: number;        // 输入 tokens
  outputTokens: number;       // 输出 tokens
  totalTokens: number;        // 总 tokens
  estimatedCost: number;      // 预估成本
}
```

## 多工具调用机制

### 并行工具调用 (Parallel Tool Calling)

当 AI 模型判断多个工具之间无依赖关系时，会在一次响应中同时调用多个工具：

```
用户: "分析咖啡店创业idea，需要竞争对手和市场规模数据"

Agent 思考 → "我需要同时获取两类数据"
         ↓
      并行调用:
      - competitor_research (竞争对手研究)
      - market_size_research (市场规模研究)
         ↓
      等待所有结果返回
         ↓
      整合数据生成报告
```

**优势：**
- ⚡ 更快的执行速度
- 💰 更高的效率
- 🔄 自动负载均衡

### 串行工具调用 (Sequential Tool Calling)

当工具之间有依赖关系时，会依次调用：

```
用户: "研究竞争对手，然后针对最大的竞争对手做详细分析"

Agent → 调用 competitor_research
     ↓
   获取竞争对手列表
     ↓
   分析结果，识别最大竞争对手
     ↓
   调用 detailed_competitor_analysis (传入具体公司名)
     ↓
   生成详细报告
```

**AI SDK 自动决定：**
- 模型会根据任务依赖关系自动选择并行或串行
- `maxSteps` 参数控制最大调用次数，防止无限循环

## 创建自定义 Agent

### 步骤 1: 创建工具

```typescript
// src/tools/myTools.ts
import { tool } from "ai";
import { z } from "zod";

export const myCustomTool: ToolDefinition = {
  id: "my_custom_tool",
  name: "My Custom Tool",
  description: "Does something useful",
  inputSchema: z.object({
    param1: z.string(),
    param2: z.number().optional(),
  }),
  tool: tool({
    description: "Does something useful",
    parameters: z.object({
      param1: z.string(),
      param2: z.number().optional(),
    }),
    // 注意：execute 在新版 AI SDK 中可能需要不同的方式定义
  }),
  execute: async (input, context) => {
    // 你的工具逻辑
    return { result: "success" };
  },
  metadata: {
    category: "custom",
    tags: ["utility"],
    estimatedCost: 0.001,
    estimatedDuration: 500,
  },
};
```

### 步骤 2: 注册工具

```typescript
// src/index.ts 或初始化文件
import { toolRegistry } from "./tools/ToolRegistry.js";
import { myCustomTool } from "./tools/myTools.js";

toolRegistry.register(myCustomTool);
```

### 步骤 3: 创建 Agent

```typescript
// src/agents/MyAgent.ts
import { BaseAgent } from "./BaseAgent.js";

export class MyAgent extends BaseAgent {
  constructor() {
    super(
      {
        name: "MyAgent",
        description: "My custom agent",
        model: { name: "gemini-2.0-flash", provider: "google" },
        systemPrompt: `You are a helpful assistant...`,
        tools: ["my_custom_tool"],  // 引用工具 ID
        maxSteps: 10,
      },
      logger,
      metrics,
      toolRegistry
    );
  }

  // execute() 方法已由 BaseAgent 提供
  // 如需自定义，可以 override
}
```

### 步骤 4: 使用 Agent

```typescript
const agent = new MyAgent();

const context: AgentContext = {
  sessionId: "session_123",
  userId: "user_456",
  conversationHistory: [],
  memory: {
    shortTerm: { messages: [], toolCalls: [], decisions: [] },
    longTerm: { userPreferences: {}, previousAnalyses: [], learnings: [] },
    working: { scratchpad: {} },
  },
  metadata: {},
};

const result = await agent.execute("User input here", context);

console.log(result.output);         // Agent 的输出
console.log(result.toolCalls);      // 使用了哪些工具
console.log(result.usage);          // Token 使用情况
```

## 最佳实践

### 1. 系统提示词设计

好的系统提示词应该：
- ✅ 明确 Agent 的角色和专长
- ✅ 说明可用工具的使用场景
- ✅ 指导何时并行 vs 串行使用工具
- ✅ 设定输出格式要求

示例：
```typescript
systemPrompt: `你是市场研究分析师。

可用工具：
- competitor_research: 研究竞争对手
- market_size_research: 研究市场规模

工作流程：
1. 理解用户需求
2. 如果需要多类独立数据，同时调用多个工具（并行）
3. 如果需要基于前一步结果做分析，依次调用工具（串行）
4. 整合所有数据生成结构化报告

始终提供数据来源和可信度评估。`
```

### 2. 工具设计原则

- ✅ **单一职责**: 每个工具只做一件事
- ✅ **清晰描述**: description 要详细，帮助 AI 理解何时使用
- ✅ **良好的 Schema**: 使用 Zod 精确定义输入参数
- ✅ **错误处理**: 工具内部处理错误，返回有意义的错误信息
- ✅ **幂等性**: 相同输入应返回相同结果

### 3. Context 管理

- ✅ 使用 `memory.working.scratchpad` 存储临时数据
- ✅ 使用 `memory.shortTerm` 存储本次会话相关信息
- ✅ 使用 `memory.longTerm` 存储跨会话的学习内容
- ✅ 在 `metadata` 中存储执行相关的元信息

### 4. 成本优化

- ⚡ 使用合适的模型（Gemini Flash 便宜且快速）
- ⚡ 控制 `maxSteps` 避免过多工具调用
- ⚡ 使用 `temperature` 控制创造性（低温度 = 更确定性 = 更少 token）
- ⚡ 监控 `metrics` 追踪成本

## 技术栈

- **AI SDK**: Vercel AI SDK (支持多个提供商)
- **模型提供商**: Google (Gemini), OpenAI, DeepSeek, Grok, OpenRouter
- **Schema 验证**: Zod
- **语言**: TypeScript
- **运行时**: Node.js

## 示例：Research Agent

参考 `src/agents/ResearchAgent.ts` 和 `src/index.ts` 查看完整的实现示例。

该示例展示了：
- ✅ 如何配置多个工具
- ✅ 如何编写有效的系统提示词
- ✅ 如何处理并行工具调用
- ✅ 如何收集和展示指标

## 答案：如何完成多工具任务

回到你最初的问题：

> "如果用户输入了一个需求，比如需要分析一个创业 idea 报告，生成这个报告需要调用 competitor research tool 和 market size research tool。那么这个 agent 会如何完成任务呢？他可以在一个请求中使用 2 个 tool 吗？"

**答案：是的！** 现代 AI 模型（通过 Vercel AI SDK）支持在一次响应中调用多个工具。

**执行流程：**

```
1. 用户输入: "分析咖啡店创业idea"
   ↓
2. Agent 分析需求，决定需要：
   - 竞争对手数据
   - 市场规模数据
   ↓
3. 第一轮 AI 调用:
   AI 返回两个工具调用请求（并行）:
   - competitor_research({industry: "coffee shop", region: "US"})
   - market_size_research({industry: "coffee shop", year: 2024})
   ↓
4. 工具并行执行（同时）:
   两个工具同时运行，各自模拟 API 调用
   ↓
5. 工具结果返回给 AI
   ↓
6. 第二轮 AI 调用:
   AI 接收工具结果，整合数据
   ↓
7. AI 生成最终报告
```

**关键点：**
- ✅ AI SDK 的 `maxSteps` 参数允许多轮工具调用
- ✅ AI 模型自动决定并行还是串行
- ✅ 开发者只需定义工具和配置，AI 处理编排
- ✅ 通过 `onStepFinish` 回调可以监控每一步

这就是现代 AI Agent 框架的强大之处！
