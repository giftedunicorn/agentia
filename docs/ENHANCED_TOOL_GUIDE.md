# 🏗️ Enhanced Tool Architecture - 实战指南

## 问题

**如何在 Tool 中集成 Web Search + AI 分析？**

## 解决方案

### 三层架构

```
┌─────────────────────────────────┐
│  Agent Layer (编排)             │
│  - 选择使用哪些 tools           │
│  - 管理对话流程                 │
└─────────────────────────────────┘
            ↓
┌─────────────────────────────────┐
│  Tool Layer (业务逻辑)          │
│  - 编排多个服务                 │
│  - 格式化输出                   │
└─────────────────────────────────┘
            ↓
┌─────────────────────────────────┐
│  Service Layer (可复用服务)     │
│  - Web Search Service           │
│  - AI Analyzer Service          │
└─────────────────────────────────┘
```

## 代码示例

### 1. Service Layer - 可复用的服务

#### Web Search Service (`src/langchain/services/webSearch.service.ts`)

```typescript
export async function searchWeb(
  query: string,
  options: { limit?: number; region?: string } = {}
): Promise<SearchResponse> {
  // 调用搜索 API (Google, Bing, Brave, Tavily...)
  // 返回搜索结果
}
```

#### AI Analyzer Service (`src/langchain/services/aiAnalyzer.service.ts`)

```typescript
export async function analyzeWithAI<T>(
  data: any,
  prompt: string,
  options: {
    model?: BaseChatModel;
    responseFormat?: "json" | "text";
  } = {}
): Promise<T> {
  // 使用 AI 模型分析数据
  // 支持 JSON 或文本输出
}
```

### 2. Tool Layer - 编排服务完成业务逻辑

```typescript
import { tool } from "langchain";
import { searchWeb } from "../services/webSearch.service.js";
import { analyzeWithAI } from "../services/aiAnalyzer.service.js";
import { getModel } from "../models/index.js";

export const competitorResearchToolEnhanced = tool(
  async ({ industry, region, limit }) => {
    // Step 1: 搜索数据
    const searchResults = await searchWeb(
      `top competitors in ${industry} ${region}`,
      { limit: limit * 2 }
    );

    // Step 2: AI 分析
    const analysis = await analyzeWithAI(
      searchResults.results,
      `Extract top ${limit} competitors with strengths, weaknesses...`,
      {
        model: getModel("gemini-flash"),
        responseFormat: "json"
      }
    );

    // Step 3: 格式化返回
    return {
      summary: `Found ${analysis.competitors.length} competitors`,
      competitors: analysis.competitors,
      keyInsights: analysis.keyInsights
    };
  },
  {
    name: "competitor_research_enhanced",
    description: "Research competitors using web search + AI analysis",
    schema: z.object({
      industry: z.string(),
      region: z.string(),
      limit: z.number().default(5)
    })
  }
);
```

### 3. Agent Layer - 使用 Tool

```typescript
import { createResearchAgentWithModel } from "./langchain/agents/ResearchAgent.js";
import { competitorResearchToolEnhanced } from "./langchain/tools/competitorResearch.enhanced.tool.js";
import { getModel } from "./langchain/models/index.js";

// 创建 Agent
const agent = createResearchAgentWithModel(
  getModel("gemini-flash"),
  { tools: [competitorResearchToolEnhanced] }
);

// 使用 Agent
const result = await agent.execute(
  "Who are the top competitors in the coffee shop industry?",
  context
);
```

## 关键优势

### ✅ 1. 服务可复用

```typescript
// Market Size Tool 可以复用相同的服务
export const marketSizeTool = tool(async ({ market }) => {
  const results = await searchWeb(`${market} market size`);
  const analysis = await analyzeWithAI(results, "Extract market data");
  return analysis;
});

// Customer Analysis Tool 也复用
export const customerTool = tool(async ({ segment }) => {
  const results = await searchWeb(`${segment} customer behavior`);
  const insights = await analyzeWithAI(results, "Identify patterns");
  return insights;
});
```

### ✅ 2. 易于测试

```typescript
// 测试服务（独立）
describe("searchWeb", () => {
  it("should return search results", async () => {
    const results = await searchWeb("test query");
    expect(results.totalResults).toBeGreaterThan(0);
  });
});

// 测试工具（可 mock 服务）
describe("competitorResearchTool", () => {
  it("should analyze competitors", async () => {
    // Mock services
    jest.mock("../services/webSearch.service");
    jest.mock("../services/aiAnalyzer.service");

    const result = await competitorResearchTool.invoke({...});
    expect(result.competitors).toBeDefined();
  });
});
```

### ✅ 3. 灵活切换

```typescript
// 切换搜索提供商 - 只需修改 service
export async function searchWeb(query) {
  // 从 Google 切换到 Brave
  // return await searchWithGoogle(query);
  return await searchWithBrave(query);
}

// 切换 AI 模型 - 只需修改一行
const analysis = await analyzeWithAI(data, prompt, {
  model: getModel("gemini-flash")  // 或 gpt-4, claude 等
});
```

### ✅ 4. 清晰的错误处理

```typescript
export const robustTool = tool(async (input) => {
  try {
    // Step 1: 搜索（带 fallback）
    let results;
    try {
      results = await searchWeb(query);
    } catch (error) {
      console.warn("Search failed, using cache");
      results = getCachedResults(query);
    }

    // Step 2: 分析（带重试）
    let analysis;
    try {
      analysis = await analyzeWithAI(results, prompt);
    } catch (error) {
      console.warn("Primary model failed, trying fallback");
      analysis = await analyzeWithAI(results, prompt, {
        model: getFallbackModel()
      });
    }

    return formatResult(analysis);
  } catch (error) {
    // Tool 级别错误处理
    return { error: "Analysis failed", details: error.message };
  }
});
```

## 文件组织

```
src/langchain/
├── agents/
│   └── ResearchAgent.ts          # Agent 定义
├── tools/
│   ├── competitorResearch.tool.ts           # 原始版本（mock 数据）
│   └── competitorResearch.enhanced.tool.ts  # 增强版本（web + AI）
├── services/
│   ├── webSearch.service.ts      # Web 搜索服务
│   └── aiAnalyzer.service.ts     # AI 分析服务
├── models/
│   └── index.ts                  # 模型配置
└── types.ts                      # 类型定义
```

## 运行示例

```bash
# 设置 API Key
export GOOGLE_API_KEY="your_key"

# 运行增强工具演示
pnpm dev:enhanced

# 查看代码
cat src/langchain/tools/competitorResearch.enhanced.tool.ts
cat src/langchain/services/webSearch.service.ts
cat src/langchain/services/aiAnalyzer.service.ts
```

## 实际应用场景

### 场景 1: 竞争对手研究
```typescript
const tool = competitorResearchToolEnhanced;
const result = await tool.invoke({
  industry: "electric vehicles",
  region: "Global",
  limit: 5
});
// 返回: 5 个竞争对手 + 优劣势分析 + 市场洞察
```

### 场景 2: 市场规模分析
```typescript
export const marketSizeTool = tool(async ({ market, region }) => {
  const searchResults = await searchWeb(`${market} market size ${region} 2024`);

  const data = await analyzeWithAI(searchResults,
    "Extract: current market size, growth rate, forecast",
    { responseFormat: "json" }
  );

  return { market, region, ...data };
});
```

### 场景 3: 客户行为分析
```typescript
export const customerInsightsTool = tool(async ({ segment, region }) => {
  const searchResults = await searchWeb(
    `${segment} customer behavior trends ${region}`
  );

  const insights = await analyzeWithAI(searchResults,
    "Identify: pain points, preferences, purchasing patterns"
  );

  return { segment, insights };
});
```

## 对比其他设计

### ❌ 不好的设计 - 所有逻辑在 Tool 里

```typescript
export const badTool = tool(async ({ industry }) => {
  // 直接在 tool 里写所有逻辑
  const apiKey = process.env.GOOGLE_API_KEY;
  const response = await fetch(`https://api.google.com/search?q=${industry}`);
  const data = await response.json();

  const model = new ChatGoogleGenerativeAI({ apiKey });
  const result = await model.invoke([new HumanMessage("Analyze...")]);

  // 问题：混乱、难以测试、无法复用
  return result;
});
```

**问题：**
- API 调用和业务逻辑混在一起
- 无法独立测试搜索或分析
- 无法在其他 tools 中复用
- 配置硬编码

### ✅ 好的设计 - 分层架构

```typescript
// Services (可复用)
const searchResults = await searchWeb(query);
const analysis = await analyzeWithAI(data, prompt);

// Tool (编排)
export const goodTool = tool(async (input) => {
  const results = await searchWeb(buildQuery(input));
  const analysis = await analyzeWithAI(results, buildPrompt(input));
  return formatOutput(analysis);
});
```

**优点：**
- 清晰的职责分离
- 每部分可独立测试
- 服务可复用
- 易于维护和扩展

## 最佳实践

### 1. 服务单一职责
```typescript
// ✅ Good: 只做搜索
export async function searchWeb(query, options) { ... }

// ❌ Bad: 搜索 + 分析混在一起
export async function searchAndAnalyze(query) { ... }
```

### 2. 明确的数据流
```typescript
User Input
   ↓
Tool (验证输入)
   ↓
Service 1 (获取数据)
   ↓
Service 2 (处理数据)
   ↓
Tool (格式化输出)
   ↓
Return to Agent
```

### 3. 适当的错误处理
```typescript
// Service 级别
throw new Error("Search API failed");

// Tool 级别
try {
  const result = await searchWeb(query);
} catch (error) {
  return { error: "Search unavailable", fallback: getCached() };
}
```

### 4. 依赖注入
```typescript
// ✅ Good: 允许自定义模型
export const tool = tool(async (input) => {
  const analysis = await analyzeWithAI(data, prompt, {
    model: getModel("gemini-flash")  // 可配置
  });
});

// ❌ Bad: 硬编码模型
const model = new ChatGoogleGenerativeAI({...});
```

## 总结

这个架构让你能够：
- ✅ **轻松组合** Web Search + AI 分析
- ✅ **复用服务** 在多个 tools 中
- ✅ **独立测试** 每一层
- ✅ **灵活切换** 搜索提供商和 AI 模型
- ✅ **清晰维护** 职责分明，易于理解

查看完整代码：
- `src/langchain/tools/competitorResearch.enhanced.tool.ts`
- `src/langchain/services/webSearch.service.ts`
- `src/langchain/services/aiAnalyzer.service.ts`
- `src/examples/enhanced-tool-demo.ts`
