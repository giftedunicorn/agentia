# Startup Advisor Agent Playground

一个简化的 LangChain Agent + Tools 实验场，专注于**对话式创业顾问**场景。

## 场景描述

用户与 AI 创业顾问对话，Agent 根据用户问题自动选择合适的工具：

```
用户：我想做一个 AI 代码助手
Agent：这个想法很有潜力！我可以帮你分析竞对、市场规模、客户画像，或者生成完整的 VC 评估报告。

用户：竞对有谁啊？
Agent：[调用 competitor_analysis 工具]
      主要竞对包括 GitHub Copilot、Cursor、Codeium...

用户：市场规模呢？
Agent：[调用 market_sizing 工具]
      全球代码助手市场预计 2025 年达到 50 亿美元...

用户：我需要一个完整的 VC 评估报告
Agent：[调用 vc_evaluation_report 工具]
      正在生成综合报告（包含竞对分析、市场机会、客户画像、投资建议）...
```

## 目录结构

```
playground/
├── README.md                          # 本文件
├── QUICKSTART.md                      # 快速开始指南
│
├── core/                              # 核心框架
│   ├── base-tool.ts                  # 简化版 BaseTool（去掉复杂依赖）
│   └── startup-advisor.ts            # 创业顾问 Agent 工厂函数
│
├── tools/                             # 独立工具
│   ├── competitor.tool.ts            # 竞对分析（Mock 数据）
│   ├── market.tool.ts                # 市场规模（Mock 数据）
│   ├── customer.tool.ts              # 客户分析（Mock 数据）
│   ├── vc-report.tool.ts             # VC 评估报告（整合其他工具）
│   └── todo.tool.ts                  # 📝 Todos 管理工具（YJ1 排序算法）
│
├── context/                           # 🧠 上下文管理（核心！）
│   ├── types.ts                      # 上下文类型定义
│   ├── memory.ts                     # 工作记忆管理器
│   ├── extractor.ts                  # 上下文提取工具
│   └── context-aware-agent.ts        # 带完整上下文管理的 Agent
│
├── docs/                              # 文档
│   ├── CONTEXT_MANAGEMENT.md         # 上下文管理详解
│   └── Claude_Code_三大技术突破详解.md # Claude Code 技术分析
│
└── examples/                          # 渐进式示例
    ├── 01-single-question.ts         # Level 1: 单个问题 → 单个工具
    ├── 02-multi-turn-chat.ts         # Level 2: 多轮对话 + 自动选择工具
    ├── 03-full-conversation.ts       # Level 3: 完整对话流程 + VC 报告
    ├── 04-with-context-management.ts # Level 4: 完整上下文管理 ⭐
    ├── 05-with-todos-management.ts   # Level 5: Todos 管理系统 📝
    └── comparison-with-without-context.ts # 对比：有无上下文管理
```

## 设计原则

### 1. 简化 vs 现有 agentia
- ❌ **去掉**：Context 依赖（sessionId/userId）、数据库、复杂的 service 层
- ✅ **保留**：BaseTool 框架、Zod schemas、商业场景工具
- ✅ **新增**：更清晰的对话流程、渐进式学习路径

### 2. 工具设计
每个工具都是**独立的、纯函数式**的：
- 输入：简单的参数（ideaDescription, query 等）
- 输出：结构化的 JSON
- 无状态：不依赖外部 context 或数据库

### 3. 对话模式
使用 LangChain 的 `createReactAgent` + `AgentExecutor`：
- 自动判断何时调用工具
- 支持多轮对话（chat history）
- 工具调用透明可见

## 快速开始

### 安装依赖
```bash
pnpm install
```

### 运行示例

#### Level 1: 单个问题
```bash
npx tsx playground/examples/01-single-question.ts
```
**场景**：用户问"这个创业想法的竞对有谁？"，Agent 调用 competitor_analysis 工具

#### Level 2: 多轮对话
```bash
npx tsx playground/examples/02-multi-turn-chat.ts
```
**场景**：用户连续提问，Agent 保持上下文，自动选择不同工具

#### Level 3: 完整对话 + VC 报告
```bash
npx tsx playground/examples/03-full-conversation.ts
```
**场景**：从初步咨询到生成完整 VC 评估报告的完整流程

#### ⭐ Level 4: 完整上下文管理（推荐）
```bash
pnpm dev:context
```
**场景**：展示完整上下文管理的威力
- ✅ 自动提取创业想法信息
- ✅ 缓存工具结果（避免重复调用）
- ✅ 智能意图检测
- ✅ 上下文感知的回答

#### 📝 Level 5: Todos 管理系统
```bash
pnpm dev:todos
```
**场景**：展示 Claude Code 启发的任务追踪系统
- ✅ YJ1 智能排序算法（status → priority → time）
- ✅ 实时进度跟踪
- ✅ 优先级管理（high/medium/low）
- ✅ System Prompt 集成
- ✅ 自动任务生命周期管理

#### 对比示例
```bash
npx tsx playground/examples/comparison-with-without-context.ts
```
直观对比有无上下文管理的差异

## 🧠 上下文管理 - Agent 的核心

**为什么上下文管理如此重要？**

上下文管理是 Agent 质量的决定性因素。没有好的上下文管理，Agent 就只是一个"健忘的聊天机器人"。

### ❌ 没有上下文管理
```
用户：我想做一个 AI 代码助手
Agent：很好！

用户：竞对有谁？
Agent：[调用工具] GitHub Copilot...

用户：那我应该如何差异化？
Agent：请问你的创业想法是什么？  ← ❌ 忘记了"AI 代码助手"
```

### ✅ 有完整上下文管理
```
用户：我想做一个 AI 代码助手
Agent：[提取并记住：idea="AI代码助手"] 很好！

用户：竞对有谁？
Agent：[调用工具并缓存] GitHub Copilot...
      [记住：已分析竞对]

用户：那我应该如何差异化？
Agent：[使用缓存的竞对分析 + 记住的想法]
      基于你的 AI 代码助手想法和刚才的竞对分析...  ← ✅ 记住所有上下文
```

### 上下文管理的 5 个层次

1. **Level 1**: 单轮上下文（当前输入）
2. **Level 2**: 对话历史（消息序列）← 基础 Agent 只到这里
3. **Level 3**: 工作记忆（结构化信息提取）← ⭐ 这是关键！
4. **Level 4**: 知识图谱（实体和关系）
5. **Level 5**: 跨会话记忆（长期记忆）

**本 Playground 实现了 Level 1-3**，这已经能显著提升 Agent 质量！

详细文档：[docs/CONTEXT_MANAGEMENT.md](docs/CONTEXT_MANAGEMENT.md)

### 使用 Context-Aware Agent

```typescript
import { ContextAwareAgent } from "./context/context-aware-agent";
import { allTools } from "./tools";

// 创建带上下文管理的 Agent
const agent = new ContextAwareAgent(allTools);

// 对话
await agent.chat("我想做一个 AI 代码助手");
await agent.chat("竞对有谁？");
await agent.chat("基于竞对，我应该如何定价？"); // ← 自动使用缓存的竞对分析

// 查看记忆
agent.printMemorySummary();
```

## 工具说明

### 1. competitor_analysis
分析创业想法的竞争对手
- 输入：`ideaDescription` (string)
- 输出：竞对列表、市场成熟度、差异化策略

### 2. market_sizing
估算市场规模（TAM/SAM/SOM）
- 输入：`ideaDescription` (string)
- 输出：市场大小、增长率、目标市场

### 3. customer_analysis
分析客户画像和需求
- 输入：`ideaDescription` (string)
- 输出：客户分段、ICP、购买流程

### 4. vc_evaluation_report
生成综合 VC 评估报告
- 输入：`ideaDescription` (string)
- 输出：7 维度评分、SWOT 分析、投资建议
- **特点**：内部会自动调用其他 3 个工具

### 5. manage_todos 📝
管理任务列表，追踪多步骤任务的进度
- 输入：`todos` (Todo[])
- 输出：排序后的任务列表、进度统计、当前任务
- **特点**：
  - YJ1 智能排序算法（三层优先级）
  - 实时进度跟踪（百分比、完成数）
  - 优先级支持（high/medium/low）
  - 自动任务生命周期管理
  - 集成到 System Prompt

## 📝 Todos 管理系统 - Agent 的任务追踪能力

受 Claude Code 启发的任务管理系统，让 Agent 能够追踪复杂的多步骤任务。

### 为什么需要 Todos 管理？

当用户提出复杂请求时（如"给我做个完整的创业评估"），Agent 需要：
1. 分解任务为多个步骤
2. 追踪每个步骤的完成状态
3. 向用户报告进度
4. 确保不遗漏任何步骤

### YJ1 排序算法

Todos 使用三层排序确保最重要的任务优先显示：

```
Layer 1: Status (状态优先级)
  ⚡ in_progress (0)  ← 正在进行的任务（最高优先级）
  ⏳ pending (1)      ← 待处理任务
  ✓ completed (2)     ← 已完成任务（最低优先级）

Layer 2: Priority (重要性优先级)
  high (0)    ← 紧急/重要
  medium (1)  ← 正常优先级
  low (2)     ← 不紧急

Layer 3: Creation Time (创建时间)
  早 → 晚     ← 先创建的任务优先
```

### 使用示例

```typescript
import { ContextAwareAgent } from "./context/context-aware-agent";
import { allTools } from "./tools";

const agent = new ContextAwareAgent(allTools);

// Agent 会自动创建 todos 来追踪复杂任务
await agent.chat(
  "我需要完整的创业评估：竞对分析、市场规模、客户研究、VC报告"
);

// Agent 自动创建的 todos:
// 1. ⚡ [HIGH] 分析竞对
// 2. ⏳ [HIGH] 估算市场规模
// 3. ⏳ [MEDIUM] 研究目标客户
// 4. ⏳ [MEDIUM] 生成 VC 报告

// 查看进度
await agent.chat("我们的进度如何？");
// Agent: "我们已完成 2/4 任务（50%），当前正在研究目标客户..."
```

### Todos 在 System Prompt 中的体现

Todos 会自动注入到 System Prompt，让 Agent 始终知道当前任务状态：

```
--- CONTEXT ---
TODOS (2/4 completed):
  1. ✓ 分析竞对 [HIGH]
  2. ✓ 估算市场规模 [HIGH]
  3. ⚡ 研究目标客户 [MEDIUM]
  4. ⏳ 生成 VC 报告 [MEDIUM]

CURRENT TASK: 研究目标客户中
--- END CONTEXT ---
```

### 手动管理 Todos

```typescript
const memory = agent.memory;

// 添加任务
memory.addTodo("分析竞对", "分析竞对中", "high");

// 批量更新
memory.updateTodos([
  { content: "分析竞对", activeForm: "分析竞对中", status: "completed", priority: "high" },
  { content: "估算市场", activeForm: "估算市场中", status: "in_progress", priority: "medium" },
]);

// 获取进度
const progress = memory.getProgress();
console.log(`完成度: ${progress.percentage}%`);

// 获取当前任务
const current = memory.getCurrentTodo();
console.log(`当前: ${current?.activeForm}`);
```

### 完整示例

运行 `pnpm dev:todos` 查看完整演示，包括：
- ✅ Agent 自动创建和管理 todos
- ✅ YJ1 排序算法演示
- ✅ 进度追踪和报告
- ✅ 优先级调整
- ✅ 任务生命周期管理

技术文档：[docs/Claude_Code_三大技术突破详解.md](docs/Claude_Code_三大技术突破详解.md)

---

## 🚀 DeepAgents - Agent 的进阶架构

DeepAgents 是受 Claude Code 启发的 Agent 架构，提供两个核心能力：

### 1. 📋 Planning (计划) - `write_todos` 工具

Agent 自动将复杂任务分解为步骤并追踪进度：

```typescript
// User: "Build a feature with tests"
// Agent 自动创建计划:
write_todos({
  todos: [
    { content: "Design API", status: "in_progress" },
    { content: "Implement", status: "pending" },
    { content: "Write tests", status: "pending" }
  ]
})
```

**何时使用**: 复杂多步骤任务 (3+ steps)

### 2. 🤖 Subagent Spawning (子代理) - `task` 工具

Agent 可以生成专门的子代理处理特定任务（上下文隔离）：

```typescript
// Main agent spawns specialist
task({
  subagent_type: "vc-report",
  description: "Generate comprehensive VC evaluation..."
})

// Subagent works in isolation with clean context
// Returns result to main agent
```

**何时使用**: 需要深度分析、上下文隔离、并行执行

### DeepAgents 架构图

```
Main Agent (父代理)
├─ 能力: Planning (write_todos)
├─ 上下文: 完整对话历史
├─ 工具: 基础工具 + task 工具
│
└─ 生成 Subagent (子代理) ─────┐
                              │
   Subagent (隔离的子代理)    │
   ├─ 上下文: 仅任务描述      │
   ├─ 工具: 专门工具          │
   └─ 返回: 分析结果 ─────────┘
```

### 快速开始

```bash
# 教育演示 - 理解 DeepAgents 工作原理
pnpm run dev 11

# 简单 Agent (仅 Planning)
pnpm run dev 7

# 完整 DeepAgent (Planning + Subagents)
# 注意: 由于 deepagents 1.3.1 的 bug，目前暂时不可用
pnpm run dev 8
```

### 学习资源

- **快速参考**: [docs/DEEPAGENTS_QUICK_REFERENCE.md](docs/DEEPAGENTS_QUICK_REFERENCE.md)
- **完整指南**: [docs/HOW_DEEPAGENTS_WORK.md](docs/HOW_DEEPAGENTS_WORK.md)
- **Bug 分析**: [docs/DEEPAGENTS_BUG_ANALYSIS.md](docs/DEEPAGENTS_BUG_ANALYSIS.md)
- **交互演示**: `pnpm run dev 11`

### 代码示例

```typescript
import { createDeepAgent } from "deepagents";

const agent = createDeepAgent({
  model,
  systemPrompt: "You are a helpful assistant...",
  tools: [tool1, tool2],
  subagents: [{
    name: "specialist",
    description: "Expert in specific domain",
    systemPrompt: "You are an expert...",
    tools: [specializedTool]
  }]
});

// Agent 自动使用 planning + subagents
const result = await agent.invoke({
  messages: [new HumanMessage("Complex task...")]
});

// 查看计划
console.log(result.todos);
```

### 关键概念

| 概念 | 工具/状态 | 用途 |
|-----|---------|------|
| **Planning** | `write_todos` | 分解任务、追踪进度 |
| **Subagents** | `task` | 上下文隔离、专门分析 |
| **并行执行** | 多个 `task` 调用 | 提高效率 |
| **专业化** | 自定义 subagent | 领域专家 |

---

## 核心代码示例

### 创建 Agent
```typescript
import { createStartupAdvisor } from "./core/startup-advisor";
import { allTools } from "./tools";

const agent = createStartupAdvisor(allTools);

const result = await agent.invoke({
  input: "我想做一个 AI 代码助手，竞对有谁？"
});

console.log(result.output);
```

### 多轮对话
```typescript
const chatHistory = [];

// 第一轮
let result = await agent.invoke({
  input: "我想做一个 AI 代码助手",
  chat_history: chatHistory
});
chatHistory.push(...result.messages);

// 第二轮
result = await agent.invoke({
  input: "竞对有谁？",
  chat_history: chatHistory
});
```

## 与现有 agentia 的对比

| 维度 | 现有 agentia | Playground |
|-----|-------------|-----------|
| 目标 | 生产级应用 | 学习 + 实验 |
| 复杂度 | 28 文件，深度嵌套 | ~10 文件，扁平结构 |
| 依赖 | 数据库、多个 API | 仅 LangChain + Mock 数据 |
| Context | sessionId/userId 追踪 | 无状态，纯函数 |
| 工具调用 | 混合（有些在 service 内部） | 统一通过 Agent tool calling |
| 学习曲线 | 陡峭 | 渐进式（3 个 level） |

## 后续扩展方向

1. **添加真实 API**
   - 集成 Serper（搜索）
   - 集成 Gemini（内容提取）

2. **添加记忆层**
   - 使用 LangChain Memory
   - 跨会话的上下文保持

3. **工具编排**
   - 工具链（Tool Chaining）
   - 并行工具调用

4. **结构化输出**
   - 强制 JSON Schema 输出
   - 使用 `.withStructuredOutput()`

## 注意事项

- 所有工具返回的都是 **Mock 数据**，适合快速实验
- 需要设置 `OPENAI_API_KEY` 或其他 LLM provider 的 API key
- 示例中的对话是硬编码的，你可以改成交互式输入

## License

MIT
