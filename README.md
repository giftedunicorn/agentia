# Agentia - AI Agent Playground

基于 **LangChain** 的现代化 AI Agent 框架，完全遵循官方最佳实践。

## ✅ 核心特性

- **官方 API**: 使用 LangChain 官方推荐的 `createAgent` 和 `tool` API
- **三层架构**: Agent = 编排，Tool = 业务逻辑，Service = 可复用服务
- **增强工具**: 支持 Web Search + AI 分析的组合
- **类型安全**: TypeScript + Zod schema 验证
- **易于扩展**: 添加 Tool 只需创建一个文件，服务可复用
- **并行调用**: 自动处理工具的并行和串行调用
- **多模型支持**: Google Gemini, OpenAI, DeepSeek 等

## 快速开始

### 安装

```bash
# 使用 pnpm (推荐)
pnpm install

# 或使用 npm
npm install
```

### 运行示例

```bash
# 基础示例（使用 mock 数据）
pnpm dev

# 增强工具演示（Web Search + AI 分析）
pnpm dev:enhanced

# 构建
pnpm build

# 运行构建后的代码
pnpm start
```

## 项目结构

```
agentia/
├── src/
│   ├── langchain/                      # LangChain 实现
│   │   ├── types.ts                    # 类型定义
│   │   ├── agents/                     # Agent 层（编排）
│   │   │   ├── BaseAgent.ts
│   │   │   └── ResearchAgent.ts
│   │   ├── tools/                      # Tool 层（业务逻辑）
│   │   │   ├── competitorResearch.tool.ts          # 基础版本
│   │   │   ├── competitorResearch.enhanced.tool.ts # 增强版本
│   │   │   ├── marketSizeResearch.tool.ts
│   │   │   ├── customerAnalysis.tool.ts
│   │   │   └── index.ts
│   │   ├── services/                   # Service 层（可复用服务）
│   │   │   ├── webSearch.service.ts    # Web 搜索
│   │   │   └── aiAnalyzer.service.ts   # AI 分析
│   │   └── models/                     # 模型配置
│   │       └── index.ts
│   ├── examples/                       # 示例代码
│   │   └── enhanced-tool-demo.ts
│   └── index.ts                        # 入口文件
├── ENHANCED_TOOL_GUIDE.md              # ✅ 增强工具指南
├── TOOL_DESIGN_PATTERNS.md             # ✅ 工具设计模式
├── FINAL_IMPLEMENTATION.md             # 最终实现说明
└── LANGCHAIN_ARCHITECTURE.md           # 完整架构文档
```

## 核心概念

### 1. 定义 Tool（使用官方 API）

```typescript
import { tool } from "langchain";
import { z } from "zod";

export const myTool = tool(
  async ({ param }) => {
    // 你的业务逻辑
    return { result: "..." };
  },
  {
    name: "my_tool",
    description: "What it does",
    schema: z.object({
      param: z.string().describe("Parameter description"),
    }),
  }
);
```

### 2. 创建 Agent（继承 BaseAgent）

```typescript
import { BaseAgent } from "./langchain/agents/BaseAgent.js";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { myTool } from "./langchain/tools/myTool.js";

export class MyAgent extends BaseAgent {
  constructor(apiKey: string) {
    super({
      name: "MyAgent",
      description: "My custom agent",
      systemPrompt: "You are a helpful assistant...",
      model: new ChatGoogleGenerativeAI({
        apiKey,
        model: "gemini-2.0-flash-exp",
      }),
      tools: [myTool],  // 直接传入 tool 实例
    });
  }
}
```

### 3. 使用 Agent

```typescript
const agent = new MyAgent(process.env.GOOGLE_API_KEY);

const result = await agent.execute("User query", {
  sessionId: "session_123",
  userId: "user_456",
});

console.log(result.output);
```

### 4. 并行工具调用（自动）

LangChain 自动处理工具的并行调用：

```
用户: "分析咖啡店创业 idea"
  ↓
Agent 判断需要多个工具
  ↓
自动并行调用:
  - competitor_research
  - market_size_research
  ↓
等待所有结果
  ↓
整合生成最终报告
```

### 5. 增强工具：Web Search + AI 分析

结合 Service Layer 实现复杂的工具：

```typescript
import { tool } from "langchain";
import { searchWeb } from "../services/webSearch.service.js";
import { analyzeWithAI } from "../services/aiAnalyzer.service.js";
import { getModel } from "../models/index.js";

export const competitorResearchEnhanced = tool(
  async ({ industry, region, limit }) => {
    // Step 1: Web 搜索
    const searchResults = await searchWeb(
      `top competitors in ${industry} ${region}`,
      { limit: limit * 2 }
    );

    // Step 2: AI 分析
    const analysis = await analyzeWithAI(
      searchResults.results,
      `Extract top ${limit} competitors with their strengths and weaknesses...`,
      {
        model: getModel("gemini-flash"),
        responseFormat: "json"
      }
    );

    // Step 3: 返回结构化结果
    return {
      summary: `Found ${analysis.competitors.length} competitors`,
      competitors: analysis.competitors,
      keyInsights: analysis.keyInsights
    };
  },
  {
    name: "competitor_research_enhanced",
    description: "Advanced competitor research using web search and AI",
    schema: z.object({
      industry: z.string(),
      region: z.string(),
      limit: z.number().default(5)
    })
  }
);
```

**三层架构优势：**
- ✅ **Service 可复用**: `searchWeb` 和 `analyzeWithAI` 可被多个 tools 使用
- ✅ **易于测试**: 每个 service 可以独立测试
- ✅ **灵活切换**: 更换搜索提供商或 AI 模型无需修改 tool 代码
- ✅ **清晰的职责**: Service = 基础能力，Tool = 业务逻辑，Agent = 任务编排

## 为什么选择这个架构？

### ✅ 解决的问题

你之前遇到的问题：
- ❌ Agent 和 Tool 设计混乱
- ❌ 维护成本高
- ❌ 难以扩展

现在的解决方案：
- ✅ **清晰分离**: Tool = 执行，Agent = 编排
- ✅ **易维护**: 每个 Tool 独立文件，修改互不影响
- ✅ **易扩展**: 添加 Tool 只需创建文件 + 导出

详细架构说明请查看：
- **[FINAL_IMPLEMENTATION.md](./FINAL_IMPLEMENTATION.md)** - 最终实现和 API 对比
- **[LANGCHAIN_API_GUIDE.md](./LANGCHAIN_API_GUIDE.md)** - 完整 API 使用指南
- **[LANGCHAIN_ARCHITECTURE.md](./LANGCHAIN_ARCHITECTURE.md)** - 架构设计原则

## 主要依赖

- **LangChain** (v1.2.0) - Agent 编排框架
- **@langchain/google-genai** - Google Gemini 集成
- **Zod** - Schema 验证和类型安全
- **TypeScript** - 完整类型支持

## 示例演示

项目包含完整的 ResearchAgent 示例：

```bash
# 设置 API Key
export GOOGLE_API_KEY="your_api_key_here"

# 运行演示
pnpm dev
```

演示包括：
- ✅ 基础研究查询
- ✅ 完整创业分析（并行工具调用）
- ✅ 多轮对话

## 文档索引

按推荐顺序阅读：

1. **[README.md](./README.md)** (本文件) - 快速开始
2. **[ENHANCED_TOOL_GUIDE.md](./ENHANCED_TOOL_GUIDE.md)** - 增强工具完整指南 ⭐ 必读
3. **[TOOL_DESIGN_PATTERNS.md](./TOOL_DESIGN_PATTERNS.md)** - 工具设计模式详解
4. **[FINAL_IMPLEMENTATION.md](./FINAL_IMPLEMENTATION.md)** - 最终实现说明
5. **[LANGCHAIN_ARCHITECTURE.md](./LANGCHAIN_ARCHITECTURE.md)** - 架构设计细节

## 参考资源

- [LangChain JS 官方文档](https://docs.langchain.com/oss/javascript/langchain/agents)
- [LangChain GitHub](https://github.com/langchain-ai/langchainjs)

## License

ISC

---

**Sources:**
- [LangChain overview - Docs by LangChain](https://docs.langchain.com/oss/javascript/langchain/overview)
- [GitHub - langchain-ai/langchainjs](https://github.com/langchain-ai/langchainjs)
