# 🏗️ Tool Design Patterns - 工具设计模式

## 核心问题

**如何在 Tool 中组合 Web Search + AI 分析？**

## 架构设计

### 三层架构

```
┌─────────────────────────────────────┐
│         Agent Layer                 │  ← 编排多个工具
│  (ResearchAgent)                    │
└─────────────────────────────────────┘
              ↓ uses
┌─────────────────────────────────────┐
│         Tool Layer                  │  ← 业务逻辑
│  (competitorResearchTool)           │  ← 编排服务
└─────────────────────────────────────┘
              ↓ uses
┌─────────────────────────────────────┐
│       Service Layer                 │  ← 可复用服务
│  - Web Search Service               │
│  - AI Analyzer Service              │
│  - Other Services...                │
└─────────────────────────────────────┘
```

### 职责划分

| 层级 | 职责 | 示例 |
|------|------|------|
| **Agent** | 任务编排、工具选择 | "分析这个创业想法" → 选择使用 competitor + market size tools |
| **Tool** | 业务逻辑、服务编排 | Competitor tool → 调用 web search → 调用 AI 分析 → 返回结构化数据 |
| **Service** | 单一功能、可复用 | Web search、AI 分析、数据提取 |

## 设计模式 1: 完整编排（推荐）

### 适用场景
工具需要多步骤处理，每步都很清晰

### 代码结构

```typescript
import { tool } from "langchain";
import { searchWeb } from "../services/webSearch.service.js";
import { analyzeWithAI } from "../services/aiAnalyzer.service.js";
import { getModel } from "../models/index.js";

export const competitorResearchTool = tool(
  async ({ industry, region, limit }) => {
    // Step 1: 收集数据（Web Search）
    const searchResults = await searchWeb(
      `top competitors in ${industry} ${region}`,
      { limit: limit * 2 }
    );

    // Step 2: AI 分析数据
    const analysis = await analyzeWithAI(
      searchResults.results,
      `Extract top ${limit} competitors with their strengths, weaknesses...`,
      {
        model: getModel("gemini-flash"),
        responseFormat: "json"
      }
    );

    // Step 3: 增强和格式化
    return {
      summary: `Found ${analysis.competitors.length} competitors`,
      competitors: analysis.competitors,
      keyInsights: analysis.keyInsights,
      sourcesAnalyzed: searchResults.totalResults
    };
  },
  {
    name: "competitor_research",
    description: "Research competitors using web search + AI analysis",
    schema: z.object({
      industry: z.string(),
      region: z.string(),
      limit: z.number().default(5)
    })
  }
);
```

### 优点
✅ 清晰的步骤流程
✅ 每个服务独立可测试
✅ 容易理解和维护
✅ 可以在步骤间添加日志、错误处理

### 缺点
❌ 代码稍长
❌ 需要管理多个步骤的错误处理

## 设计模式 2: 单步处理（简化版）

### 适用场景
简单的搜索+分析场景

### 代码结构

```typescript
export const competitorResearchToolSimple = tool(
  async ({ industry, region }) => {
    const searchResults = await searchWeb(
      `competitors in ${industry} ${region}`,
      { limit: 10 }
    );

    // 直接让 AI 处理所有事情
    const analysis = await analyzeWithAI(
      searchResults.results,
      `Analyze these search results and summarize the competitive landscape`,
      { model: getModel("gemini-flash") }
    );

    return { analysis };
  },
  { name: "competitor_research", description: "...", schema: ... }
);
```

### 优点
✅ 代码简洁
✅ 快速实现

### 缺点
❌ 缺少结构化输出
❌ 难以控制中间步骤
❌ 调试困难

## 设计模式 3: Pipeline 模式（高级）

### 适用场景
复杂的多步骤数据处理流水线

### 代码结构

```typescript
import { createDataPipeline } from "../utils/pipeline.js";

export const competitorResearchToolAdvanced = tool(
  async (input) => {
    const pipeline = createDataPipeline([
      // Stage 1: Search
      async (data) => ({
        ...data,
        searchResults: await searchWeb(data.query, data.options)
      }),

      // Stage 2: Extract
      async (data) => ({
        ...data,
        extracted: await extractStructuredData(data.searchResults, schema)
      }),

      // Stage 3: Enhance
      async (data) => ({
        ...data,
        enhanced: await enhanceWithAdditionalData(data.extracted)
      }),

      // Stage 4: Analyze
      async (data) => ({
        ...data,
        analysis: await analyzeWithAI(data.enhanced, prompt, options)
      })
    ]);

    return await pipeline.execute({
      query: `competitors ${input.industry} ${input.region}`,
      options: { limit: input.limit }
    });
  },
  { name: "competitor_research_advanced", ... }
);
```

### 优点
✅ 高度模块化
✅ 易于测试每个阶段
✅ 可以重用 pipeline 逻辑

### 缺点
❌ 需要额外的抽象层
❌ 对简单场景过度设计

## 服务设计原则

### 1. Web Search Service

```typescript
// ✅ Good: 专注于搜索功能
export async function searchWeb(
  query: string,
  options: { limit?: number; region?: string }
): Promise<SearchResponse> {
  // 只做搜索，不做分析
  return { query, results, totalResults };
}

// ❌ Bad: 混合了搜索和分析
export async function searchAndAnalyze(query: string) {
  const results = await search(query);
  const analysis = await analyzeWithAI(results); // 不应该在这里
  return { results, analysis };
}
```

### 2. AI Analyzer Service

```typescript
// ✅ Good: 通用的分析接口
export async function analyzeWithAI<T>(
  data: any,
  prompt: string,
  options?: { model?: BaseChatModel; responseFormat?: "json" | "text" }
): Promise<T> {
  // 通用 AI 分析
}

// ✅ Good: 特定场景的便捷函数
export async function summarizeSearchResults(
  results: SearchResult[],
  context: string
): Promise<string> {
  return analyzeWithAI(results, `Summarize in context of: ${context}`);
}
```

### 3. 数据流向

```
User Input
    ↓
Tool (业务逻辑)
    ↓
Service 1: Search (获取原始数据)
    ↓
Service 2: AI Analysis (处理数据)
    ↓
Tool (格式化结果)
    ↓
Return to Agent
```

## 实际示例对比

### 场景：研究咖啡店竞争对手

#### ❌ 不好的设计 - 一切都在 Tool 里

```typescript
export const badCompetitorTool = tool(async ({ industry, region }) => {
  // 直接在 tool 里写所有逻辑
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const response = await fetch(`https://api.google.com/search?q=...`);
  const data = await response.json();

  const model = new ChatGoogleGenerativeAI({ apiKey: process.env.GOOGLE_API_KEY });
  const result = await model.invoke([new HumanMessage("Analyze...")]);

  // 混乱、难以测试、不可复用
  return result;
}, {...});
```

**问题：**
- 服务调用逻辑和业务逻辑混在一起
- 无法单独测试搜索或分析功能
- 代码难以复用
- 配置硬编码

#### ✅ 好的设计 - 分层架构

```typescript
// Service Layer
export async function searchWeb(query, options) { /* ... */ }
export async function analyzeWithAI(data, prompt, options) { /* ... */ }

// Tool Layer
export const goodCompetitorTool = tool(
  async ({ industry, region, limit }) => {
    // 1. 使用服务获取数据
    const searchResults = await searchWeb(
      `competitors ${industry} ${region}`,
      { limit }
    );

    // 2. 使用服务分析数据
    const analysis = await analyzeWithAI(
      searchResults.results,
      `Extract top ${limit} competitors...`,
      { model: getModel("gemini-flash"), responseFormat: "json" }
    );

    // 3. 业务逻辑：格式化和增强结果
    return {
      summary: `Found ${analysis.competitors.length} competitors`,
      ...analysis,
      metadata: { sources: searchResults.totalResults }
    };
  },
  {...}
);
```

**优点：**
- 清晰的职责分离
- 每个服务可以独立测试
- 服务可以在其他 tools 中复用
- 配置集中管理

## 何时使用 AI 分析

### ✅ 应该使用 AI 的场景

1. **非结构化数据 → 结构化数据**
   ```typescript
   // 从搜索结果中提取结构化的竞争对手信息
   const competitors = await extractStructuredData(searchResults, schema);
   ```

2. **内容总结和归纳**
   ```typescript
   // 总结大量文本
   const summary = await summarizeSearchResults(results, context);
   ```

3. **模式识别和洞察**
   ```typescript
   // 找出趋势和模式
   const insights = await analyzeWithAI(data, "Identify key trends...");
   ```

4. **对比和比较**
   ```typescript
   // 比较多个竞争对手
   const comparison = await compareItems(competitors, criteria);
   ```

### ❌ 不应该使用 AI 的场景

1. **简单数据转换**
   ```typescript
   // Bad: 用 AI 做简单的格式转换
   const formatted = await analyzeWithAI(data, "Convert to uppercase");

   // Good: 直接用代码
   const formatted = data.map(x => x.toUpperCase());
   ```

2. **精确计算**
   ```typescript
   // Bad: 用 AI 做数学计算
   const sum = await analyzeWithAI(numbers, "Calculate the sum");

   // Good: 直接计算
   const sum = numbers.reduce((a, b) => a + b, 0);
   ```

3. **确定性逻辑**
   ```typescript
   // Bad: 用 AI 做条件判断
   const isValid = await analyzeWithAI(input, "Check if valid email");

   // Good: 用正则或验证库
   const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
   ```

## 错误处理最佳实践

```typescript
export const robustCompetitorTool = tool(
  async ({ industry, region, limit }) => {
    try {
      // Step 1: Search with fallback
      let searchResults;
      try {
        searchResults = await searchWeb(query, options);
      } catch (error) {
        console.warn("Web search failed, using fallback data");
        searchResults = getFallbackData();
      }

      // Step 2: AI analysis with retry
      let analysis;
      try {
        analysis = await analyzeWithAI(searchResults, prompt, {
          model: getModel("gemini-flash")
        });
      } catch (error) {
        console.warn("Primary model failed, trying fallback model");
        analysis = await analyzeWithAI(searchResults, prompt, {
          model: getModel("gpt-4o-mini")
        });
      }

      // Step 3: Validate and return
      return validateAndFormat(analysis);

    } catch (error) {
      // Tool-level error handling
      console.error("Competitor research failed:", error);
      return {
        error: "Failed to complete competitor research",
        summary: "An error occurred during analysis",
        competitors: []
      };
    }
  },
  {...}
);
```

## 总结

### 推荐架构

```
Tool
├── Input Validation (Zod schema)
├── Step 1: Data Collection (Web Search Service)
├── Step 2: Data Processing (AI Analyzer Service)
├── Step 3: Business Logic (in tool)
├── Step 4: Format Response
└── Error Handling
```

### 关键原则

1. **分层设计** - Agent / Tool / Service 各司其职
2. **服务复用** - Web Search 和 AI Analyzer 可被多个 tools 使用
3. **单一职责** - 每个服务只做一件事
4. **依赖注入** - Tool 可以选择使用哪个 model
5. **错误处理** - 每层都有适当的错误处理
6. **可测试性** - 每个服务可以独立测试

### 文件组织

```
src/langchain/
├── agents/          # Agent 层
│   └── ResearchAgent.ts
├── tools/           # Tool 层（业务逻辑）
│   ├── competitorResearch.tool.ts
│   └── competitorResearch.enhanced.tool.ts
├── services/        # Service 层（可复用服务）
│   ├── webSearch.service.ts
│   └── aiAnalyzer.service.ts
└── models/          # Model 配置
    └── index.ts
```

这种设计让你的代码：
- ✅ **清晰** - 每层职责明确
- ✅ **可维护** - 易于修改和扩展
- ✅ **可复用** - 服务可以在多处使用
- ✅ **可测试** - 每层可以独立测试
