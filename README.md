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
│   └── vc-report.tool.ts             # VC 评估报告（整合其他工具）
│
├── context/                           # 🧠 上下文管理（核心！）
│   ├── types.ts                      # 上下文类型定义
│   ├── memory.ts                     # 工作记忆管理器
│   ├── extractor.ts                  # 上下文提取工具
│   └── context-aware-agent.ts        # 带完整上下文管理的 Agent
│
├── docs/                              # 文档
│   └── CONTEXT_MANAGEMENT.md         # 上下文管理详解
│
└── examples/                          # 渐进式示例
    ├── 01-single-question.ts         # Level 1: 单个问题 → 单个工具
    ├── 02-multi-turn-chat.ts         # Level 2: 多轮对话 + 自动选择工具
    ├── 03-full-conversation.ts       # Level 3: 完整对话流程 + VC 报告
    ├── 04-with-context-management.ts # Level 4: 完整上下文管理 ⭐
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
npx tsx playground/examples/04-with-context-management.ts
```
**场景**：展示完整上下文管理的威力
- ✅ 自动提取创业想法信息
- ✅ 缓存工具结果（避免重复调用）
- ✅ 智能意图检测
- ✅ 上下文感知的回答

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
