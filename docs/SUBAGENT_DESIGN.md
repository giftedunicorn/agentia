# SubAgent 系统设计方案

## 设计目标

为 Agentia Playground 添加 Claude Code 启发的 SubAgent 系统，实现：
1. **任务隔离**：每个 SubAgent 独立执行，互不干扰
2. **并发执行**：支持同时运行多个 SubAgent（最多 3-5 个）
3. **专门化**：不同类型的 SubAgent 处理特定任务
4. **结果聚合**：主 Agent 收集和综合 SubAgent 的结果

## 核心架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Main Agent (协调者)                       │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Task Tool (启动器)                       │   │
│  │  - 解析任务类型                                       │   │
│  │  - 选择合适的 SubAgent                               │   │
│  │  - 管理并发执行                                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                           │                                   │
└───────────────────────────┼───────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌──────▼──────┐  ┌────────▼────────┐
│  SubAgent 1    │  │ SubAgent 2   │  │  SubAgent 3     │
│  Competitor    │  │ Market       │  │  Customer       │
│  Analyst       │  │ Researcher   │  │  Researcher     │
│                │  │              │  │                 │
│ [Tools]        │  │ [Tools]      │  │ [Tools]         │
│ [Memory]       │  │ [Memory]     │  │ [Memory]        │
│ [Context]      │  │ [Context]    │  │ [Context]       │
└────────────────┘  └──────────────┘  └─────────────────┘
```

## SubAgent 类型设计

### 1. CompetitorAnalystAgent (竞对分析专家)
**专长**：深度竞对分析
- **工具**：competitor_analysis, web_search
- **输出**：详细竞对报告（产品对比、定价策略、市场定位）
- **使用场景**：用户询问竞争对手、差异化策略

### 2. MarketResearcherAgent (市场研究专家)
**专长**：市场规模和趋势分析
- **工具**：market_sizing, web_search
- **输出**：TAM/SAM/SOM、增长趋势、市场机会
- **使用场景**：用户询问市场规模、行业趋势

### 3. CustomerResearcherAgent (客户研究专家)
**专长**：客户画像和需求分析
- **工具**：customer_analysis
- **输出**：客户分段、ICP、购买流程、痛点
- **使用场景**：用户询问目标客户、客户需求

### 4. VCReportAgent (VC 报告专家)
**专长**：综合评估报告生成
- **工具**：vc_report, 所有分析工具
- **输出**：完整 VC 评估报告
- **使用场景**：用户需要完整评估报告
- **特殊性**：会启动其他 SubAgent 收集数据

### 5. GeneralAdvisorAgent (通用顾问)
**专长**：对话和建议
- **工具**：无特定工具
- **输出**：建议、解答、指导
- **使用场景**：简单对话、通用问题

## 文件结构

```
src/
├── subagents/
│   ├── types.ts                      # SubAgent 类型定义
│   ├── base-subagent.ts              # SubAgent 基础类
│   ├── competitor-analyst.agent.ts   # 竞对分析 SubAgent
│   ├── market-researcher.agent.ts    # 市场研究 SubAgent
│   ├── customer-researcher.agent.ts  # 客户研究 SubAgent
│   ├── vc-report.agent.ts            # VC 报告 SubAgent
│   ├── general-advisor.agent.ts      # 通用顾问 SubAgent
│   └── index.ts                      # SubAgent 注册表
│
├── tools/
│   └── task.tool.ts                  # 🆕 Task Tool (启动 SubAgent)
│
├── context/
│   ├── subagent-manager.ts           # 🆕 SubAgent 生命周期管理
│   └── context-aware-agent.ts        # 修改：集成 SubAgent
│
└── examples/
    └── 06-with-subagents.ts          # SubAgent 使用示例
```

## 核心接口设计

### SubAgent 基础接口

```typescript
// src/subagents/types.ts

export type SubAgentType =
  | "competitor-analyst"
  | "market-researcher"
  | "customer-researcher"
  | "vc-report"
  | "general-advisor";

export interface SubAgentConfig {
  type: SubAgentType;
  name: string;
  description: string;
  tools: any[];
  systemPrompt: string;
}

export interface SubAgentTask {
  id: string;
  type: SubAgentType;
  prompt: string;
  context?: any;
  status: "pending" | "running" | "completed" | "failed";
  result?: any;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface SubAgentResult {
  taskId: string;
  type: SubAgentType;
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
}
```

### SubAgent 基础类

```typescript
// src/subagents/base-subagent.ts

export abstract class BaseSubAgent {
  protected config: SubAgentConfig;
  protected agent: any; // LangChain Agent
  protected memory: MemoryManager;

  constructor(config: SubAgentConfig) {
    this.config = config;
    this.memory = new MemoryManager(`subagent-${config.type}`);
  }

  abstract getSystemPrompt(): string;
  abstract getTools(): any[];

  async initialize(): Promise<void> {
    // 初始化 LangChain agent
    this.agent = createReactAgent({
      llm: this.getLLM(),
      tools: this.getTools(),
      prompt: this.getSystemPrompt(),
    });
  }

  async execute(task: SubAgentTask): Promise<SubAgentResult> {
    const startTime = Date.now();

    try {
      console.log(`\n🤖 [${this.config.type}] Starting task: ${task.id}`);

      // 执行任务
      const result = await this.agent.invoke({
        input: task.prompt,
        context: task.context,
      });

      const duration = Date.now() - startTime;

      return {
        taskId: task.id,
        type: this.config.type,
        success: true,
        data: result.output,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        taskId: task.id,
        type: this.config.type,
        success: false,
        error: error.message,
        duration,
      };
    }
  }

  protected getLLM() {
    // 使用环境变量配置的 LLM
    return new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash-exp",
      temperature: 0.7,
    });
  }
}
```

### Task Tool 设计

```typescript
// src/tools/task.tool.ts

const taskSchema = z.object({
  type: z.enum([
    "competitor-analyst",
    "market-researcher",
    "customer-researcher",
    "vc-report",
    "general-advisor"
  ]),
  prompt: z.string().describe("任务描述"),
  runInBackground: z.boolean().optional().describe("是否后台运行"),
});

async function executeTask(
  input: { type: SubAgentType; prompt: string; runInBackground?: boolean },
  context?: { subagentManager?: SubAgentManager }
): Promise<any> {
  const manager = context?.subagentManager;

  if (!manager) {
    throw new Error("SubAgentManager is required");
  }

  // 创建任务
  const task = manager.createTask(input.type, input.prompt);

  if (input.runInBackground) {
    // 后台运行
    manager.startTask(task.id);
    return {
      taskId: task.id,
      status: "running",
      message: `Task ${task.id} started in background`,
    };
  } else {
    // 同步运行
    const result = await manager.executeTask(task.id);
    return result;
  }
}

export const taskTool = createTool({
  name: "spawn_subagent",
  description: `Spawn a specialized SubAgent to handle specific tasks.

Available SubAgent types:
- competitor-analyst: Deep competitor analysis
- market-researcher: Market sizing and trends
- customer-researcher: Customer personas and needs
- vc-report: Complete VC evaluation report
- general-advisor: General advice and guidance

Use this when:
- User asks complex questions requiring specialized analysis
- Need to gather data from multiple sources
- Want to parallelize independent tasks`,
  schema: taskSchema,
  execute: executeTask,
  needsContext: true,
});
```

### SubAgent Manager

```typescript
// src/context/subagent-manager.ts

export class SubAgentManager {
  private tasks: Map<string, SubAgentTask> = new Map();
  private agents: Map<SubAgentType, BaseSubAgent> = new Map();
  private maxConcurrent: number = 3;
  private runningTasks: Set<string> = new Set();

  constructor() {
    this.registerAgents();
  }

  private registerAgents(): void {
    // 注册所有 SubAgent
    this.agents.set("competitor-analyst", new CompetitorAnalystAgent());
    this.agents.set("market-researcher", new MarketResearcherAgent());
    this.agents.set("customer-researcher", new CustomerResearcherAgent());
    this.agents.set("vc-report", new VCReportAgent());
    this.agents.set("general-advisor", new GeneralAdvisorAgent());
  }

  createTask(type: SubAgentType, prompt: string, context?: any): SubAgentTask {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const task: SubAgentTask = {
      id: taskId,
      type,
      prompt,
      context,
      status: "pending",
    };

    this.tasks.set(taskId, task);
    return task;
  }

  async executeTask(taskId: string): Promise<SubAgentResult> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // 检查并发限制
    if (this.runningTasks.size >= this.maxConcurrent) {
      throw new Error(`Maximum concurrent tasks (${this.maxConcurrent}) reached`);
    }

    const agent = this.agents.get(task.type);
    if (!agent) {
      throw new Error(`Agent type ${task.type} not found`);
    }

    // 更新状态
    task.status = "running";
    task.startedAt = new Date();
    this.runningTasks.add(taskId);

    try {
      // 执行任务
      const result = await agent.execute(task);

      // 更新状态
      task.status = "completed";
      task.completedAt = new Date();
      task.result = result;

      return result;
    } catch (error) {
      task.status = "failed";
      task.error = error.message;
      throw error;
    } finally {
      this.runningTasks.delete(taskId);
    }
  }

  async executeParallel(taskIds: string[]): Promise<SubAgentResult[]> {
    // 并发执行多个任务
    const promises = taskIds.map(id => this.executeTask(id));
    return Promise.all(promises);
  }

  getTaskStatus(taskId: string): SubAgentTask | undefined {
    return this.tasks.get(taskId);
  }

  getRunningTasks(): SubAgentTask[] {
    return Array.from(this.tasks.values()).filter(t => t.status === "running");
  }
}
```

## 使用场景示例

### 场景 1：单个 SubAgent 执行
```typescript
// 用户：谁是我的主要竞争对手？

// Main Agent 判断需要竞对分析
await taskTool.execute({
  type: "competitor-analyst",
  prompt: "分析 AI 代码助手的主要竞争对手"
});

// CompetitorAnalystAgent 执行分析
// 返回详细竞对报告
```

### 场景 2：并行执行多个 SubAgent
```typescript
// 用户：给我完整的创业评估

// Main Agent 启动 3 个并行 SubAgent
const tasks = [
  manager.createTask("competitor-analyst", "分析竞对"),
  manager.createTask("market-researcher", "分析市场规模"),
  manager.createTask("customer-researcher", "分析目标客户"),
];

const results = await manager.executeParallel([
  tasks[0].id,
  tasks[1].id,
  tasks[2].id,
]);

// Main Agent 综合结果生成报告
```

### 场景 3：后台任务
```typescript
// 用户：帮我分析竞对，同时我想问其他问题

// Main Agent 启动后台任务
const result = await taskTool.execute({
  type: "competitor-analyst",
  prompt: "分析竞对",
  runInBackground: true,
});

// 用户可以继续对话
// Main Agent 在后台监控任务完成状态
```

## 实现步骤

### Phase 1: 基础架构 (优先级: HIGH)
- [ ] 创建 SubAgent 类型定义
- [ ] 实现 BaseSubAgent 基础类
- [ ] 实现 SubAgentManager
- [ ] 创建 Task Tool

### Phase 2: 具体 SubAgent (优先级: HIGH)
- [ ] 实现 CompetitorAnalystAgent
- [ ] 实现 MarketResearcherAgent
- [ ] 实现 CustomerResearcherAgent
- [ ] 实现 GeneralAdvisorAgent

### Phase 3: 高级功能 (优先级: MEDIUM)
- [ ] 实现 VCReportAgent (会调用其他 SubAgent)
- [ ] 实现并发执行机制
- [ ] 实现后台任务
- [ ] 结果缓存和复用

### Phase 4: 集成和示例 (优先级: MEDIUM)
- [ ] 集成到 ContextAwareAgent
- [ ] 创建使用示例
- [ ] 编写文档

## 技术要点

### 1. 任务隔离
每个 SubAgent 有独立的：
- MemoryManager
- Tool 集合
- System Prompt
- 执行上下文

### 2. 并发控制
- 最多同时运行 3-5 个 SubAgent
- 使用队列管理超出限制的任务
- Promise.all 实现并行执行

### 3. 通信机制
- Main Agent ← Task Tool → SubAgentManager → SubAgent
- 通过结构化数据传递（JSON）
- 支持流式返回（可选）

### 4. 错误处理
- SubAgent 错误不影响 Main Agent
- 超时机制（每个任务最多 2 分钟）
- 重试机制（失败后重试 1 次）

## 与现有系统的集成

### ContextAwareAgent 扩展
```typescript
export class ContextAwareAgent {
  private memory: MemoryManager;
  private subagentManager: SubAgentManager; // 新增
  private agent: any;

  constructor(tools: any[], sessionId?: string) {
    this.memory = new MemoryManager(sessionId);
    this.subagentManager = new SubAgentManager(); // 新增

    // 添加 taskTool 到工具列表
    const allTools = [...tools, taskTool];

    // 创建 agent 时传递 context
    this.agent = createReactAgent({
      llm: this.getLLM(),
      tools: allTools,
    });
  }

  async chat(userMessage: string): Promise<string> {
    // 传递 context 给 tools
    const result = await this.agent.invoke(
      { input: userMessage },
      {
        context: {
          memory: this.memory,
          subagentManager: this.subagentManager, // 新增
        }
      }
    );

    return result.output;
  }
}
```

## 性能考虑

### 1. 并发限制
- 默认最多 3 个并发 SubAgent
- 避免 LLM API 限流
- 控制成本

### 2. 缓存策略
- SubAgent 结果缓存在 Main Agent 的 Memory
- 相同任务不重复执行
- 缓存过期时间：1 小时

### 3. 超时控制
- 单个 SubAgent 最多执行 2 分钟
- 超时自动失败
- 返回部分结果（如果有）

## 后续扩展

### 1. 动态工具选择
SubAgent 根据任务动态选择需要的工具

### 2. SubAgent 间通信
允许 SubAgent 相互调用和协作

### 3. 流式返回
实时返回 SubAgent 的执行进度

### 4. 监控和日志
完整的任务执行日志和性能监控

## 总结

SubAgent 系统将显著提升 Agentia Playground 的能力：
- ✅ 任务专门化：每个 SubAgent 专注特定领域
- ✅ 并行执行：加速复杂任务处理
- ✅ 任务隔离：错误不相互影响
- ✅ 可扩展性：轻松添加新的 SubAgent 类型

这为构建更强大、更可靠的 AI Agent 系统奠定了基础。
