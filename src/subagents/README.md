# SubAgent 系统

## 概述

BaseSubAgent 是一个**通用的、可配置的** SubAgent 类，允许你动态创建任何类型的 SubAgent，无需预定义固定类型。

## 核心特性

✅ **配置驱动** - 通过配置对象定义行为，无需继承
✅ **动态创建** - 任何任务都可以 `new BaseSubAgent(config)`
✅ **任务隔离** - 支持独立或共享 Memory
✅ **灵活工具** - 可以使用任何工具组合，或不使用工具
✅ **简单 API** - 统一的执行接口

## 快速开始

### 1. 创建一个简单的 SubAgent

```typescript
import { BaseSubAgent } from "./subagents";
import { competitorTool } from "./tools";

// 配置 SubAgent
const config = {
  name: "competitor-analyst",
  description: "Expert in competitor analysis",
  tools: [competitorTool],
  systemPrompt: "You are a competitor analysis expert...",
  isolatedMemory: true,
};

// 创建 SubAgent
const agent = new BaseSubAgent(config);

// 执行任务
const result = await agent.execute("分析 AI 代码助手的竞对");

console.log(result.data);
```

### 2. 共享 Memory（上下文传递）

```typescript
import { MemoryManager } from "./context/memory";

// 创建共享 Memory
const sharedMemory = new MemoryManager("shared");

// SubAgent 1 使用共享 Memory
const agent1 = new BaseSubAgent({
  name: "analyzer",
  description: "Analyzes data",
  tools: [competitorTool],
  systemPrompt: "Analyze and store insights",
  sharedMemory,
  isolatedMemory: false, // 使用共享 Memory
});

await agent1.execute("分析竞对");

// SubAgent 2 可以访问 SubAgent 1 的数据
const agent2 = new BaseSubAgent({
  name: "strategist",
  description: "Develops strategy",
  tools: [customerTool],
  systemPrompt: "Use analysis from memory to develop strategy",
  sharedMemory, // 相同的共享 Memory
  isolatedMemory: false,
});

await agent2.execute("基于竞对分析，制定策略");
```

### 3. 不使用工具（纯对话）

```typescript
// 创建一个不使用工具的通用顾问
const advisor = new BaseSubAgent({
  name: "advisor",
  description: "General startup advisor",
  tools: [], // 不使用任何工具
  systemPrompt: "You are a friendly startup advisor with 10 years of experience.",
  isolatedMemory: true,
});

const result = await advisor.execute(
  "作为技术创始人，我应该早期就开始营销吗？"
);
```

### 4. 批量执行

```typescript
const agent = new BaseSubAgent(config);

const results = await agent.executeBatch([
  "分析竞对",
  "估算市场规模",
  "描述目标客户",
]);

results.forEach((result, i) => {
  console.log(`Task ${i + 1}: ${result.success ? "✅" : "❌"}`);
});
```

### 5. 带选项执行

```typescript
const result = await agent.execute("分析竞对", {
  timeout: 60000, // 60秒超时
  onProgress: (msg) => console.log(msg),
  onComplete: (result) => console.log("完成!", result),
  onError: (error) => console.error("错误:", error),
});
```

## SubAgentConfig 接口

```typescript
interface SubAgentConfig {
  // 必需字段
  name: string; // SubAgent 唯一标识
  description: string; // 功能描述
  tools: any[]; // 可用工具列表
  systemPrompt: string; // 定义角色和行为

  // 可选字段
  isolatedMemory?: boolean; // 是否使用独立 Memory（默认 true）
  sharedMemory?: MemoryManager; // 共享的 Memory（当 isolatedMemory=false）
  llmConfig?: {
    // LLM 配置
    model?: string; // 模型名称
    temperature?: number; // 温度
    maxTokens?: number; // 最大 token
  };
}
```

## SubAgentResult 接口

```typescript
interface SubAgentResult {
  taskId: string; // 任务 ID
  agentName: string; // SubAgent 名称
  success: boolean; // 是否成功
  data?: any; // 结果数据
  error?: string; // 错误信息
  duration: number; // 执行耗时（毫秒）
  metadata?: {
    // 元数据
    toolsCalled?: string[]; // 调用的工具列表
    steps?: number; // 执行步骤数
    tokensUsed?: number; // 使用的 token 数
  };
}
```

## 使用场景

### 场景 1：专门化分析

为不同类型的分析创建专门的 SubAgent：

```typescript
// 竞对分析专家
const competitorAgent = new BaseSubAgent({
  name: "competitor-analyst",
  tools: [competitorTool],
  systemPrompt: "You are a competitor analysis expert...",
});

// 市场研究专家
const marketAgent = new BaseSubAgent({
  name: "market-researcher",
  tools: [marketTool],
  systemPrompt: "You are a market research expert...",
});

// 客户研究专家
const customerAgent = new BaseSubAgent({
  name: "customer-researcher",
  tools: [customerTool],
  systemPrompt: "You are a customer research expert...",
});
```

### 场景 2：上下文传递

多个 SubAgent 协作，共享上下文：

```typescript
const sharedMemory = new MemoryManager("shared");

// SubAgent 1: 分析竞对
const agent1 = new BaseSubAgent({
  name: "analyzer",
  tools: [competitorTool],
  systemPrompt: "Analyze competitors",
  sharedMemory,
  isolatedMemory: false,
});

await agent1.execute("分析竞对");

// SubAgent 2: 基于竞对分析制定策略（可以访问 agent1 的数据）
const agent2 = new BaseSubAgent({
  name: "strategist",
  tools: [],
  systemPrompt: "Use competitor analysis from memory to develop strategy",
  sharedMemory,
  isolatedMemory: false,
});

await agent2.execute("制定差异化策略");
```

### 场景 3：动态创建

根据用户请求动态创建 SubAgent：

```typescript
function createSubAgentForTask(taskType: string) {
  const configs = {
    competitor: {
      name: "competitor-analyst",
      tools: [competitorTool],
      systemPrompt: "Competitor analysis expert...",
    },
    market: {
      name: "market-researcher",
      tools: [marketTool],
      systemPrompt: "Market research expert...",
    },
    customer: {
      name: "customer-researcher",
      tools: [customerTool],
      systemPrompt: "Customer research expert...",
    },
  };

  const config = configs[taskType];
  return new BaseSubAgent(config);
}

// 动态创建
const agent = createSubAgentForTask("competitor");
await agent.execute("分析竞对");
```

## 完整示例

运行完整示例：

```bash
pnpm dev:subagent
```

查看 `src/examples/06-subagent-basic.ts` 了解更多用法。

## 设计理念

### 为什么不预定义类型？

传统方法需要为每种 SubAgent 创建一个类：

```typescript
// ❌ 传统方法：需要为每种类型写一个类
class CompetitorAnalystAgent extends BaseSubAgent { ... }
class MarketResearcherAgent extends BaseSubAgent { ... }
class CustomerResearcherAgent extends BaseSubAgent { ... }
```

配置驱动的方法更灵活：

```typescript
// ✅ 配置驱动：动态创建任何类型
const agent = new BaseSubAgent({
  name: "任何名称",
  tools: [任何工具],
  systemPrompt: "任何提示词",
});
```

### 优势

1. **灵活性** - 无需修改代码，只需改变配置
2. **可扩展** - 轻松添加新的 SubAgent 类型
3. **简洁** - 减少样板代码
4. **动态** - 可以在运行时创建 SubAgent

## API 参考

### BaseSubAgent

#### 构造函数

```typescript
constructor(config: SubAgentConfig)
```

#### 方法

##### initialize()

初始化 SubAgent（创建 LangChain Agent）

```typescript
await agent.initialize();
```

##### execute()

执行单个任务

```typescript
await agent.execute(prompt: string, options?: SubAgentExecuteOptions): Promise<SubAgentResult>
```

##### executeBatch()

批量执行多个任务

```typescript
await agent.executeBatch(prompts: string[]): Promise<SubAgentResult[]>
```

##### getConfig()

获取配置

```typescript
agent.getConfig(): SubAgentConfig
```

##### getName()

获取名称

```typescript
agent.getName(): string
```

##### getDescription()

获取描述

```typescript
agent.getDescription(): string
```

##### getMemory()

获取 Memory

```typescript
agent.getMemory(): MemoryManager
```

##### isInitialized()

检查是否已初始化

```typescript
agent.isInitialized(): boolean
```

## 下一步

- [ ] 创建 Task Tool 从 Main Agent 启动 SubAgent
- [ ] 实现并发执行机制（SubAgentManager）
- [ ] 集成到 ContextAwareAgent
- [ ] 添加流式返回支持
- [ ] 添加后台任务支持

## 技术文档

查看 `docs/SUBAGENT_DESIGN.md` 了解完整的系统设计。
