# 🤖 Sub-Agent Pattern - Agent-as-Tool 架构

## 核心概念

**Sub-Agent Pattern（子代理模式）** 是一种高级架构模式，其中一个 Tool 内部包含一个完整的自主 Agent。这个 Agent 可以使用自己的工具集，进行推理和规划，最终返回结果。

## 架构层次

```
┌─────────────────────────────────────┐
│  Main Agent                         │  ← 顶层代理
│  (ResearchAgent)                    │
└─────────────────────────────────────┘
            ↓ uses
┌─────────────────────────────────────┐
│  Tool                               │  ← 工具（包含子代理）
│  (competitorResearchTool)           │
│  ┌───────────────────────────────┐  │
│  │  Sub-Agent                    │  │  ← 内部的完整代理
│  │  (CompetitorResearchAgent)    │  │
│  │  ├─ webSearchTool             │  │
│  │  └─ dataAnalysisTool          │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

## 三种工具模式对比

### 1. 简单工具（Simple Tool）

```typescript
export const simpleTool = tool(
  async ({ industry, region }) => {
    // 直接返回 mock 数据
    return { competitors: [...mockData] };
  },
  { name: "simple_tool", ... }
);
```

**特点：**
- ✅ 快速、简单
- ✅ 无外部依赖
- ❌ 无真实数据
- ❌ 无推理能力

### 2. 服务组合工具（Service-Based Tool）

```typescript
export const serviceTool = tool(
  async ({ industry, region }) => {
    // 固定流程：搜索 → 分析 → 返回
    const searchResults = await searchWeb(`${industry} competitors`);
    const analysis = await analyzeWithAI(searchResults, "Extract competitors");
    return analysis;
  },
  { name: "service_tool", ... }
);
```

**特点：**
- ✅ 真实数据
- ✅ AI 分析
- ❌ 固定流程
- ❌ 无自主规划

### 3. 子代理工具（Sub-Agent Tool）⭐

```typescript
export const subAgentTool = tool(
  async ({ industry, region }) => {
    // 创建子代理，让它自主规划和执行
    const subAgent = createCompetitorResearchAgent();

    const result = await subAgent.execute(
      `Research top competitors in ${industry} (${region})`,
      context
    );

    return result.output;
  },
  { name: "subagent_tool", ... }
);
```

**特点：**
- ✅ 真实数据
- ✅ AI 分析
- ✅ 自主规划
- ✅ 多步骤推理
- ✅ 适应性策略

## 实现步骤

### Step 1: 创建子代理可用的工具

```typescript
// src/langchain/tools/webSearch.tool.ts
export const webSearchTool = tool(
  async ({ query, limit }) => {
    const results = await searchWeb(query, { limit });
    return {
      query,
      results: formatResults(results),
      totalResults: results.totalResults
    };
  },
  {
    name: "web_search",
    description: "Search the web for information..."
  }
);

// src/langchain/tools/dataAnalysis.tool.ts
export const dataAnalysisTool = tool(
  async ({ data, analysisGoal }) => {
    const analysis = await analyzeWithAI(data, analysisGoal);
    return { analysis };
  },
  {
    name: "data_analysis",
    description: "Analyze data and extract insights..."
  }
);
```

### Step 2: 创建子代理

```typescript
// src/langchain/agents/CompetitorResearchAgent.ts
export class CompetitorResearchAgent extends BaseAgent {
  constructor() {
    super({
      name: "CompetitorResearchAgent",
      systemPrompt: `You are a competitive intelligence analyst.

Your research approach:
1. Use web_search to find competitor information
2. Use data_analysis to extract insights
3. Synthesize findings into a comprehensive report

Be thorough and strategic in your research.`,

      tools: [
        webSearchTool,      // 子代理可以使用这些工具
        dataAnalysisTool
      ],
      maxIterations: 8,     // 允许多轮工具调用
      model: getModel("gemini-flash")
    });
  }
}
```

### Step 3: 将子代理包装成工具

```typescript
// src/langchain/tools/competitorResearch.subagent.tool.ts
export const competitorResearchToolWithSubAgent = tool(
  async ({ industry, region, limit }) => {
    // 创建子代理实例
    const subAgent = createCompetitorResearchAgent();

    // 构建详细任务描述
    const task = `Conduct comprehensive competitor research for ${industry} in ${region}.
Identify top ${limit} competitors with their strengths, weaknesses, and market position.`;

    // 执行子代理
    const result = await subAgent.execute(task, {
      sessionId: `research_${Date.now()}`,
      userId: "tool_system"
    });

    // 返回子代理的输出
    return {
      summary: `Research completed for ${industry}`,
      research: result.output,
      metadata: {
        duration: result.metadata.duration,
        steps: result.metadata.iterationsUsed
      }
    };
  },
  {
    name: "competitor_research_subagent",
    description: "Advanced competitor research using autonomous sub-agent..."
  }
);
```

### Step 4: 主代理使用子代理工具

```typescript
// 主代理配置
const mainAgent = createResearchAgent({
  tools: [
    competitorResearchToolWithSubAgent,  // 包含子代理的工具
    // ... 其他工具
  ]
});

// 使用
const result = await mainAgent.execute(
  "Analyze competitors in the cloud storage industry",
  context
);
```

## 执行流程示例

### 用户请求
```
"Analyze top 3 competitors in cloud storage globally"
```

### 主代理 (Main Agent)
```
思考：这个任务需要竞争对手研究
决策：使用 competitor_research_subagent 工具
调用：competitorResearchToolWithSubAgent({
  industry: "cloud storage",
  region: "Global",
  limit: 3
})
```

### 子代理 (Sub-Agent) 自主工作
```
子代理收到任务："Research cloud storage competitors globally"

Step 1: 规划
  → 需要搜索竞争对手信息

Step 2: 执行 web_search
  调用：webSearchTool({ query: "top cloud storage companies global market share" })
  结果：找到关于 Dropbox, Google Drive, OneDrive 的信息

Step 3: 分析搜索结果
  调用：dataAnalysisTool({
    data: "search results...",
    analysisGoal: "Extract top 3 competitors with market share and strengths"
  })
  结果：结构化的竞争对手数据

Step 4: 深入研究（如果需要）
  调用：webSearchTool({ query: "Dropbox vs Google Drive comparison" })
  调用：dataAnalysisTool({ ... })

Step 5: 综合报告
  整合所有发现
  生成最终报告
```

### 返回给主代理
```
{
  summary: "Research completed for cloud storage",
  research: "Based on my research, the top 3 competitors are...",
  metadata: { duration: 15000, steps: 5 }
}
```

### 主代理最终输出
```
"I've completed a comprehensive analysis of the cloud storage industry.
The top 3 competitors are:

1. **Google Drive**
   - Strengths: Integration with Google ecosystem, generous free tier
   - Weaknesses: Privacy concerns, complex pricing
   ...

2. **Dropbox**
   ...

3. **Microsoft OneDrive**
   ..."
```

## 何时使用子代理模式

### ✅ 应该使用的场景

1. **复杂研究任务**
   - 需要多次搜索和分析
   - 结果依赖于中间发现
   - 需要迭代优化

2. **需要自主规划**
   - 任务步骤不固定
   - 需要根据结果调整策略
   - 工具使用顺序不确定

3. **多步骤推理**
   - 需要综合多个信息源
   - 需要对比和交叉验证
   - 需要深度分析

4. **专业领域任务**
   - 需要领域专业知识
   - 有特定的工作流程
   - 可以独立成一个专家系统

### ❌ 不应该使用的场景

1. **简单查询**
   - 一次 API 调用就能完成
   - 固定的输入输出
   - 无需推理

2. **性能敏感**
   - 需要快速响应
   - 资源有限
   - 成本敏感

3. **确定性任务**
   - 流程固定
   - 无需规划
   - 结果可预测

## 优势与挑战

### ✅ 优势

1. **自主性**
   - 子代理可以自主规划研究策略
   - 根据中间结果调整方法
   - 类似人类研究员的工作方式

2. **可组合性**
   - 子代理可以使用多个工具
   - 工具之间可以复用
   - 模块化设计

3. **专业化**
   - 每个子代理可以专注于特定领域
   - 有专门的系统提示和工具集
   - 深度优化特定任务

4. **可扩展性**
   - 添加新的子代理工具
   - 子代理可以使用其他子代理工具
   - 构建层次化的代理系统

### ⚠️ 挑战

1. **复杂性**
   - 调试困难（多层嵌套）
   - 理解执行流程需要时间
   - 错误处理更复杂

2. **成本**
   - 更多的 LLM 调用
   - 更长的执行时间
   - 更高的 API 成本

3. **可预测性**
   - 行为可能不确定
   - 结果可能不一致
   - 需要充分测试

4. **监控**
   - 需要详细日志
   - 需要追踪子代理行为
   - 性能优化困难

## 最佳实践

### 1. 明确的任务描述

```typescript
// ✅ Good: 详细的任务描述
const task = `Conduct comprehensive competitor research for ${industry} in ${region}.

Your research should include:
1. Identify top ${limit} competitors
2. For each competitor, provide:
   - Market share (if available)
   - Key strengths (2-3 points)
   - Key weaknesses (2-3 points)
3. Overall market analysis
4. Strategic insights

Use web search to find information, then analyze the results.`;

// ❌ Bad: 模糊的任务
const task = `Research competitors in ${industry}`;
```

### 2. 合适的迭代限制

```typescript
// 子代理配置
super({
  maxIterations: 8,  // 足够完成任务，但防止无限循环
  verbose: true      // 启用日志便于调试
});
```

### 3. 结构化输出

```typescript
return {
  summary: "简短摘要",
  research: result.output,  // 详细内容
  metadata: {              // 元数据便于分析
    duration: result.metadata.duration,
    steps: result.metadata.iterationsUsed,
    toolsUsed: result.steps.map(s => s.action)
  }
};
```

### 4. 错误处理

```typescript
try {
  const result = await subAgent.execute(task, context);
  return { success: true, data: result.output };
} catch (error) {
  console.error("Sub-agent failed:", error);
  return {
    success: false,
    error: error.message,
    fallback: "Unable to complete research. Please try again."
  };
}
```

### 5. 日志和监控

```typescript
console.log("🤖 Sub-agent starting...");
console.log(`Task: ${task.substring(0, 100)}...`);

const startTime = Date.now();
const result = await subAgent.execute(task, context);
const duration = Date.now() - startTime;

console.log(`✅ Sub-agent completed in ${duration}ms`);
console.log(`Steps taken: ${result.metadata.iterationsUsed}`);
```

## 高级模式

### 1. 多个子代理协作

```typescript
export const marketAnalysisTool = tool(async ({ market }) => {
  // 使用多个子代理
  const competitorAgent = createCompetitorResearchAgent();
  const trendAgent = createTrendAnalysisAgent();

  const [competitors, trends] = await Promise.all([
    competitorAgent.execute(`Research competitors in ${market}`),
    trendAgent.execute(`Analyze trends in ${market}`)
  ]);

  return { competitors: competitors.output, trends: trends.output };
});
```

### 2. 级联子代理

```typescript
export const deepResearchTool = tool(async ({ topic }) => {
  // 第一层：概览
  const overviewAgent = createOverviewAgent();
  const overview = await overviewAgent.execute(`Overview of ${topic}`);

  // 第二层：深入研究（基于概览结果）
  const deepAgent = createDeepResearchAgent();
  const deepAnalysis = await deepAgent.execute(
    `Deep analysis based on: ${overview.output}`
  );

  return { overview: overview.output, deepAnalysis: deepAnalysis.output };
});
```

### 3. 条件子代理

```typescript
export const adaptiveTool = tool(async ({ task, complexity }) => {
  // 根据复杂度选择子代理
  const agent = complexity === "high"
    ? createAdvancedAgent()
    : createBasicAgent();

  return await agent.execute(task, context);
});
```

## 总结

Sub-Agent Pattern 是构建复杂 AI 系统的强大模式：

- ✅ **何时使用**: 复杂、多步骤、需要推理的任务
- ✅ **核心优势**: 自主规划、工具组合、模块化
- ✅ **关键考虑**: 成本、复杂性、可预测性

掌握这个模式，你就能构建真正智能和自主的 AI 系统！

## 运行示例

```bash
# 设置 API Key
export GOOGLE_API_KEY="your_key"

# 运行 sub-agent 演示
pnpm dev:subagent

# 查看代码
cat src/langchain/tools/competitorResearch.subagent.tool.ts
cat src/langchain/agents/CompetitorResearchAgent.ts
```
