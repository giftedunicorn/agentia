# DeepAgents 深度学习指南

## 目录结构概览

```
src/deepagents/
├── agent.ts                 # 核心：创建 DeepAgent 的主函数
├── index.ts                 # 导出所有公共 API
├── middleware/              # 中间件系统
│   ├── index.ts            # 导出所有中间件
│   ├── fs.ts               # 文件系统中间件（提供文件操作工具）
│   ├── subagents.ts        # 子代理中间件（任务委托）
│   └── patch_tool_calls.ts # 工具调用补丁
└── backends/               # 后端存储系统
    ├── index.ts            # 导出所有后端
    ├── protocol.ts         # 后端协议接口
    ├── state.ts            # 状态后端（内存存储）
    ├── store.ts            # Store 后端（LangGraph Store）
    ├── filesystem.ts       # 文件系统后端（真实文件）
    ├── composite.ts        # 组合后端
    └── utils.ts            # 工具函数
```

---

## 第一部分：核心概念

### 1.1 什么是 DeepAgents？

DeepAgents 是一个**多层级 AI 代理系统**，具有以下特点：

- ✅ **任务规划**：自动分解复杂任务
- ✅ **子代理委托**：将子任务分配给专门的代理
- ✅ **文件系统**：内置虚拟文件系统
- ✅ **状态管理**：持久化对话和工作状态

### 1.2 核心组件

```
DeepAgent = 基础模型 + 工具 + 中间件 + 后端存储
```

**中间件栈**（按顺序执行）：
1. `todoListMiddleware` - 任务列表管理
2. `createFilesystemMiddleware` - 文件操作
3. `createSubAgentMiddleware` - 子代理委托
4. `summarizationMiddleware` - 自动摘要
5. `anthropicPromptCachingMiddleware` - 提示缓存
6. `createPatchToolCallsMiddleware` - 工具调用兼容性

---

## 第二部分：文件详解

### 2.1 核心文件：`agent.ts`

**作用**：创建和配置 DeepAgent

#### 关键代码解析

```typescript
export function createDeepAgent(params = {}) {
  const {
    model = "claude-sonnet-4-5-20250929",
    tools = [],
    systemPrompt,
    middleware: customMiddleware = [],
    subagents = [],
    backend,
    // ...
  } = params;

  // 1️⃣ 组合系统提示词
  const finalSystemPrompt = systemPrompt
    ? `${systemPrompt}\n\n${BASE_PROMPT}`
    : BASE_PROMPT;

  // 2️⃣ 配置文件系统后端
  const filesystemBackend = backend
    ? backend
    : (config) => new StateBackend(config);

  // 3️⃣ 组装中间件栈
  const middleware: AgentMiddleware[] = [
    todoListMiddleware(),
    createFilesystemMiddleware({ backend: filesystemBackend }),
    createSubAgentMiddleware({
      defaultModel: model,
      defaultTools: tools,
      defaultMiddleware: [/* 子代理的中间件 */],
      subagents,
      generalPurposeAgent: true,
    }),
    summarizationMiddleware({ model, trigger: { tokens: 170_000 } }),
    anthropicPromptCachingMiddleware({ unsupportedModelBehavior: "ignore" }),
    createPatchToolCallsMiddleware(),
  ];

  // 4️⃣ 创建最终的代理
  return createAgent({
    model,
    systemPrompt: finalSystemPrompt,
    tools,
    middleware,
    // ...
  });
}
```

#### 学习要点

**Q: 为什么要这样设计中间件栈？**
A: 每个中间件负责一个功能，按顺序执行：
- `todoListMiddleware` 先创建任务列表
- `createFilesystemMiddleware` 提供文件操作能力
- `createSubAgentMiddleware` 可以调用子代理
- 后面的中间件优化性能

**Q: `backend` 参数的作用是什么？**
A: 控制文件的存储方式：
- `StateBackend` - 内存存储（默认）
- `FilesystemBackend` - 真实文件系统
- `StoreBackend` - LangGraph Store（数据库）
- 自定义后端 - 你可以实现自己的存储

---

### 2.2 文件系统中间件：`middleware/fs.ts`

**作用**：给代理提供文件操作能力

#### 提供的工具

```typescript
const tools = [
  createLsTool(backend),        // ls - 列出目录内容
  createReadFileTool(backend),  // read_file - 读取文件
  createWriteFileTool(backend), // write_file - 写入文件
  createEditFileTool(backend),  // edit_file - 编辑文件
  createGlobTool(backend),      // glob - 文件模式匹配
  createGrepTool(backend),      // grep - 文本搜索
];
```

#### 核心概念：FileData

```typescript
interface FileData {
  content: string[];        // 文件内容（按行存储）
  created_at: string;      // 创建时间
  modified_at: string;     // 修改时间
}
```

#### 工具实现示例：`write_file`

```typescript
function createWriteFileTool(backend, options) {
  return tool(
    async (input, config) => {
      // 1. 获取当前状态和 store
      const stateAndStore = {
        state: getCurrentTaskInput(config),
        store: config.store,
      };

      // 2. 解析后端
      const resolvedBackend = getBackend(backend, stateAndStore);

      // 3. 写入文件
      const result = await resolvedBackend.write(
        input.path,
        input.content
      );

      // 4. 返回结果（可能包含文件更新）
      if (result.filesUpdate) {
        return new Command({
          update: { files: result.filesUpdate },
        });
      }

      return `File written to ${input.path}`;
    },
    {
      name: "write_file",
      description: "Write content to a new file",
      schema: z.object({
        path: z.string().describe("Absolute file path"),
        content: z.string().describe("File content"),
      }),
    }
  );
}
```

#### 学习要点

**Q: 为什么文件内容是 `string[]` 而不是 `string`？**
A:
- 方便按行处理
- 支持大文件（可以只读取部分行）
- 编辑工具可以精确定位和替换特定行

**Q: `Command` 是什么？**
A: LangGraph 的状态更新机制
```typescript
new Command({
  update: { files: { "/path": fileData } }
})
// 等价于更新 state.files["/path"] = fileData
```

---

### 2.3 子代理中间件：`middleware/subagents.ts`

**作用**：让主代理可以委托任务给子代理

#### 核心概念

```typescript
interface SubAgent {
  name: string;                    // 子代理名称
  description: string;             // 功能描述（告诉主代理何时使用）
  systemPrompt: string;            // 子代理的系统提示词
  tools?: StructuredTool[];        // 子代理专属工具
  middleware?: AgentMiddleware[];  // 额外的中间件
}
```

#### 工作流程

```
1. 主代理收到任务："写一个关于 LangGraph 的研究报告"

2. 主代理决定委托给子代理：
   task({
     subagent_type: "research-agent",
     description: "Research LangGraph and provide detailed info"
   })

3. 创建子代理实例：
   - 新的隔离上下文（不继承主代理的对话历史）
   - 自己的工具和中间件
   - 专注于特定任务

4. 子代理执行任务：
   - 调用 internet_search 工具
   - 分析搜索结果
   - 生成研究报告

5. 返回结果给主代理：
   "LangGraph is a framework for building..."

6. 主代理继续处理：
   - 接收子代理的报告
   - 整合到整体任务中
   - 可能继续委托其他子任务
```

#### 代码示例

```typescript
// 定义一个研究子代理
const researchSubAgent: SubAgent = {
  name: "research-agent",
  description: "Expert in deep research tasks. Use for complex questions.",
  systemPrompt: `You are a research expert.
    Conduct thorough research and provide detailed analysis.`,
  tools: [internetSearchTool, documentAnalysisTool],
};

// 创建主代理（包含子代理）
const agent = createDeepAgent({
  model: yourModel,
  systemPrompt: "You are a helpful assistant...",
  tools: [basicTool1, basicTool2],
  subagents: [researchSubAgent],
});

// 主代理会自动获得 task 工具：
// task({ subagent_type: "research-agent", description: "..." })
```

#### 学习要点

**Q: 子代理和主代理有什么区别？**
A:

| 特性 | 主代理 | 子代理 |
|------|--------|--------|
| 上下文 | 完整对话历史 | 仅任务描述（隔离） |
| 状态 | 持久化状态 | 临时状态 |
| 工具 | 通用工具 | 专门工具 |
| 寿命 | 整个会话 | 单个任务 |

**Q: 什么时候应该使用子代理？**
A:
- ✅ 复杂的多步骤任务
- ✅ 需要专门知识的任务
- ✅ 可以并行执行的独立任务
- ✅ 需要隔离上下文的任务

**Q: General-Purpose 子代理是什么？**
A: 自动创建的通用子代理：
```typescript
{
  name: "general-purpose",
  description: "For complex questions and multi-step tasks",
  tools: [...] // 和主代理相同的工具
}
```

---

### 2.4 后端系统：`backends/`

**作用**：抽象文件存储，支持多种存储方式

#### 后端协议 (`protocol.ts`)

```typescript
interface BackendProtocol {
  // 列出目录内容
  ls(path: string): Promise<string[]>;

  // 列出目录详细信息
  lsInfo(path: string): Promise<FileInfo[]>;

  // 读取文件
  read(path: string): Promise<ReadResult>;

  // 写入文件
  write(path: string, content: string): Promise<WriteResult>;

  // 编辑文件
  edit(path: string, oldStr: string, newStr: string): Promise<EditResult>;

  // 删除文件
  delete(path: string): Promise<DeleteResult>;

  // Glob 搜索
  glob(pattern: string, options?: GlobOptions): Promise<string[]>;

  // Grep 搜索
  grep(pattern: string, options?: GrepOptions): Promise<GrepMatch[]>;
}
```

#### 三种后端实现

##### 1. StateBackend（默认）

**存储位置**：Agent 的 `state.files`

```typescript
const backend = new StateBackend({ state, store });

// 当调用 write_file 时：
await backend.write("/report.md", "# Report...");

// 实际存储在：
state.files["/report.md"] = {
  content: ["# Report..."],
  created_at: "2024-01-01T00:00:00Z",
  modified_at: "2024-01-01T00:00:00Z"
}

// 优点：简单，自动持久化在 state 中
// 缺点：文件内容占用内存，不适合大文件
```

##### 2. FilesystemBackend

**存储位置**：真实文件系统

```typescript
const backend = new FilesystemBackend({ root: "./agent_files" });

// 当调用 write_file 时：
await backend.write("/report.md", "# Report...");

// 实际创建文件：
// ./agent_files/report.md

// 优点：真实文件，方便查看和编辑
// 缺点：不适合 Vercel 等 serverless 环境
```

##### 3. StoreBackend

**存储位置**：LangGraph Store（数据库）

```typescript
const store = new PostgresStore({
  connectionString: "postgresql://..."
});

const backend = new StoreBackend({
  namespace: ["agent-files", userId, sessionId],
  store,
});

// 当调用 write_file 时：
await backend.write("/report.md", "# Report...");

// 实际存储在 PostgreSQL：
// namespace: ["agent-files", "user123", "session456"]
// key: ["report.md"]
// value: { content: [...], created_at: ..., modified_at: ... }

// 优点：持久化，可查询，适合 SaaS
// 缺点：需要配置数据库
```

##### 4. CompositeBackend（组合）

**多个后端组合使用**

```typescript
const backend = new CompositeBackend([
  {
    backend: new FilesystemBackend({ root: "./temp" }),
    priority: 1,
    glob: "/temp/**",  // /temp 目录使用文件系统
  },
  {
    backend: new StoreBackend({ namespace: [...], store }),
    priority: 2,
    glob: "/**",  // 其他文件使用 Store
  },
]);

// 文件自动路由到对应的后端
```

---

## 第三部分：实战示例

### 3.1 基础示例：创建一个简单的 DeepAgent

```typescript
import { createDeepAgent } from "./src/deepagents";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";

// 1. 创建代理
const agent = createDeepAgent({
  model: new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash-exp",
    apiKey: process.env.GEMINI_API_KEY,
  }),
  systemPrompt: "你是一个有帮助的助手。",
  tools: [], // 暂时不需要额外工具
});

// 2. 调用代理
const result = await agent.invoke({
  messages: [new HumanMessage("帮我规划一个学习计划")],
});

// 3. 查看结果
console.log("任务列表：", result.todos);
console.log("最后的消息：", result.messages[result.messages.length - 1].content);
```

### 3.2 中级示例：使用文件系统

```typescript
const agent = createDeepAgent({
  model: yourModel,
  systemPrompt: `你是一个技术写作助手。
    当用户要求创建文档时，使用 write_file 工具保存到文件中。`,
  tools: [], // 文件工具已自动包含
});

const result = await agent.invoke({
  messages: [
    new HumanMessage("帮我创建一个关于 TypeScript 的教程，保存为 tutorial.md")
  ],
});

// 查看创建的文件
if (result.files && result.files["/tutorial.md"]) {
  const content = result.files["/tutorial.md"].content.join("\n");
  console.log("教程内容：", content);
}
```

### 3.3 高级示例：使用子代理

```typescript
import { tool } from "langchain";
import { z } from "zod";

// 1. 定义研究工具
const researchTool = tool(
  async ({ query }) => {
    // 模拟 API 调用
    return `关于 ${query} 的研究结果...`;
  },
  {
    name: "research",
    description: "研究特定主题",
    schema: z.object({
      query: z.string().describe("研究主题"),
    }),
  }
);

// 2. 定义研究子代理
const researchAgent: SubAgent = {
  name: "researcher",
  description: "专业研究员，用于深度研究复杂主题",
  systemPrompt: `你是一个专业研究员。
    进行深入研究并提供详细分析。
    使用 research 工具收集信息。`,
  tools: [researchTool],
};

// 3. 创建主代理
const agent = createDeepAgent({
  model: yourModel,
  systemPrompt: `你是一个协调员。
    对于复杂的研究任务，委托给 researcher 子代理。`,
  tools: [],
  subagents: [researchAgent],
});

// 4. 执行任务
const result = await agent.invoke({
  messages: [
    new HumanMessage("帮我深入研究 LangGraph 框架，并写一份报告")
  ],
});

// 主代理会自动：
// 1. 创建 todos 规划任务
// 2. 调用 task({ subagent_type: "researcher", description: "研究 LangGraph" })
// 3. 研究子代理使用 research 工具收集信息
// 4. 返回研究结果给主代理
// 5. 主代理整合结果并写报告
```

### 3.4 生产级示例：完整的研究系统

```typescript
import { createDeepAgent } from "./src/deepagents";
import { StoreBackend } from "./src/deepagents/backends";
import { PostgresStore } from "@langchain/langgraph-checkpoint-postgres";
import { tool } from "langchain";
import { z } from "zod";

// 1. 创建持久化存储
const store = new PostgresStore({
  connectionString: process.env.DATABASE_URL,
});

// 2. 定义工具
const internetSearch = tool(
  async ({ query }) => {
    // 实际的网络搜索
    const results = await fetch(`https://api.tavily.com/search?q=${query}`);
    return await results.json();
  },
  {
    name: "internet_search",
    description: "搜索互联网获取最新信息",
    schema: z.object({
      query: z.string(),
    }),
  }
);

// 3. 定义子代理
const researchAgent: SubAgent = {
  name: "research-agent",
  description: "深度研究专家，一次只处理一个主题",
  systemPrompt: `你是研究专家。进行深入研究并返回详细报告。
    只有最终报告会传递给用户。`,
  tools: [internetSearch],
};

const critiqueAgent: SubAgent = {
  name: "critique-agent",
  description: "报告审查专家，用于审查和改进报告质量",
  systemPrompt: `你是编辑专家。
    报告在 /final_report.md 文件中。
    提供详细的改进建议。`,
  tools: [], // 可以使用文件工具
};

// 4. 创建主代理
const agent = createDeepAgent({
  model: new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash-exp",
    apiKey: process.env.GEMINI_API_KEY,
  }),

  systemPrompt: `你是研究协调员。

    工作流程：
    1. 将用户问题写入 /question.txt
    2. 使用 research-agent 进行深度研究
    3. 将研究结果写入 /final_report.md
    4. 使用 critique-agent 审查报告
    5. 根据反馈改进报告

    可以多次迭代直到满意。`,

  tools: [internetSearch],

  subagents: [researchAgent, critiqueAgent],

  // 使用 StoreBackend 持久化文件
  backend: (config) => new StoreBackend({
    namespace: ["research-sessions", sessionId],
    store: config.store || store,
  }),

  store: store,
});

// 5. API 处理函数
export async function handleResearchRequest(
  userId: string,
  sessionId: string,
  question: string
) {
  const result = await agent.invoke(
    {
      messages: [new HumanMessage(question)],
    },
    {
      configurable: {
        thread_id: sessionId,
      },
    }
  );

  // 返回结果
  return {
    sessionId,
    todos: result.todos,
    message: "研究完成！文件已保存到数据库。",
  };
}

// 6. 获取研究结果
export async function getResearchResults(
  sessionId: string
) {
  const items = await store.list({
    namespace: ["research-sessions", sessionId],
  });

  const files: Record<string, string> = {};
  for (const item of items) {
    const path = item.key[item.key.length - 1];
    const fileData = item.value as any;
    files[path] = fileData.content.join("\n");
  }

  return { files };
}
```

---

## 第四部分：最佳实践

### 4.1 选择合适的后端

```typescript
// 开发/测试：StateBackend（默认）
const agent = createDeepAgent({
  // 不指定 backend，自动使用 StateBackend
});

// 本地调试：FilesystemBackend
const agent = createDeepAgent({
  backend: new FilesystemBackend({ root: "./debug" }),
});

// 生产环境：StoreBackend
const agent = createDeepAgent({
  backend: (config) => new StoreBackend({
    namespace: ["app", userId, sessionId],
    store: config.store,
  }),
  store: postgresStore,
});
```

### 4.2 设计子代理

**原则**：
1. **单一职责**：每个子代理专注一个领域
2. **清晰描述**：description 要明确何时使用
3. **专门工具**：只给子代理需要的工具
4. **精确提示**：systemPrompt 要具体指导任务

```typescript
// ✅ 好的设计
const researcher: SubAgent = {
  name: "researcher",
  description: "深度研究专家。用于需要收集大量信息的复杂主题。一次只处理一个主题。",
  systemPrompt: "你是研究专家。使用 search 工具收集信息，进行分析，返回详细报告。",
  tools: [searchTool],
};

// ❌ 不好的设计
const helper: SubAgent = {
  name: "helper",
  description: "帮助完成各种任务",  // 太模糊
  systemPrompt: "你是助手",  // 不够具体
  tools: [tool1, tool2, tool3, tool4],  // 工具太多
};
```

### 4.3 处理大文件

```typescript
// ❌ 不好：一次性读取大文件
const content = await readLargeFile();

// ✅ 好：使用工具自动处理
const agent = createDeepAgent({
  model: yourModel,
  systemPrompt: "处理大型文件时，使用 grep 而不是 read_file 读取全部内容。",
  backend: new FilesystemBackend({ root: "./data" }),
});

// 代理会智能使用：
// - grep 搜索特定内容
// - read_file 只读取需要的部分
```

### 4.4 错误处理

```typescript
try {
  const result = await agent.invoke({
    messages: [new HumanMessage(userInput)],
  });

  // 检查任务状态
  const failedTodos = result.todos.filter(t => t.status === "failed");
  if (failedTodos.length > 0) {
    console.error("部分任务失败：", failedTodos);
  }

  return result;
} catch (error) {
  if (error.message.includes("timeout")) {
    // 处理超时
  } else if (error.message.includes("rate limit")) {
    // 处理速率限制
  }
  throw error;
}
```

---

## 第五部分：调试技巧

### 5.1 查看中间步骤

```typescript
const result = await agent.invoke({ messages: [...] });

// 查看所有消息（包括工具调用）
result.messages.forEach((msg, i) => {
  console.log(`\n[${i}] ${msg._getType()}:`);

  if (msg.tool_calls) {
    msg.tool_calls.forEach(tc => {
      console.log(`  调用工具: ${tc.name}(${JSON.stringify(tc.args)})`);
    });
  }

  if (msg.content) {
    console.log(`  内容: ${msg.content.substring(0, 100)}...`);
  }
});

// 查看任务执行情况
console.log("\n任务状态：");
result.todos.forEach(todo => {
  console.log(`  ${todo.status === "completed" ? "✅" : "⏳"} ${todo.content}`);
});

// 查看创建的文件
console.log("\n创建的文件：");
Object.keys(result.files || {}).forEach(path => {
  console.log(`  📄 ${path}`);
});
```

### 5.2 启用详细日志

```typescript
// 在环境变量中设置
process.env.LANGCHAIN_VERBOSE = "true";
process.env.LANGCHAIN_TRACING_V2 = "true";

// 或在代码中
const agent = createDeepAgent({
  model: yourModel,
  // ... 其他配置
});

// LangSmith 会自动记录所有步骤
```

---

## 第六部分：常见问题

### Q1: 为什么需要中间件？

A: 中间件提供模块化功能：
- 不修改核心代码
- 可以自由组合
- 易于测试和维护

### Q2: 子代理和工具有什么区别？

A:

| | 工具 | 子代理 |
|---|------|--------|
| 复杂度 | 简单操作 | 复杂多步骤任务 |
| 上下文 | 无状态 | 有独立上下文 |
| 调用方式 | 函数调用 | 完整的代理推理 |
| 示例 | 搜索API、计算器 | 研究报告、代码审查 |

### Q3: 如何选择后端？

```typescript
// 本地开发/测试
StateBackend // 简单，无需配置

// 本地调试，需要查看文件
FilesystemBackend // 文件可见

// 生产环境（SaaS）
StoreBackend + PostgresStore // 持久化，可扩展

// 混合场景
CompositeBackend // 灵活组合
```

### Q4: 文件存储在哪里？

取决于后端：
- **StateBackend**: `result.files` 对象中
- **FilesystemBackend**: 磁盘文件
- **StoreBackend**: 数据库

### Q5: 如何限制子代理的能力？

```typescript
const limitedAgent: SubAgent = {
  name: "safe-agent",
  description: "...",
  systemPrompt: "...",
  tools: [readOnlyTool], // 只给只读工具
  // 不给文件写入、网络访问等危险工具
};
```

---

## 第七部分：进阶主题

### 7.1 自定义中间件

```typescript
import { createMiddleware } from "langchain";

const myCustomMiddleware = createMiddleware({
  name: "CustomMiddleware",

  // 在工具调用前拦截
  wrapToolCall: async (request, handler) => {
    console.log(`调用工具: ${request.toolCall.name}`);
    const result = await handler(request);
    console.log(`工具返回:`, result);
    return result;
  },

  // 在模型调用前拦截
  wrapModelCall: async (request, handler) => {
    const start = Date.now();
    const result = await handler(request);
    console.log(`模型调用耗时: ${Date.now() - start}ms`);
    return result;
  },
});

const agent = createDeepAgent({
  model: yourModel,
  middleware: [myCustomMiddleware], // 添加自定义中间件
});
```

### 7.2 自定义后端

```typescript
import { BackendProtocol } from "./src/deepagents/backends/protocol";

class S3Backend implements BackendProtocol {
  private s3Client: S3Client;

  constructor(config: { bucket: string }) {
    this.s3Client = new S3Client({...});
  }

  async read(path: string): Promise<ReadResult> {
    const obj = await this.s3Client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: path })
    );
    const content = await obj.Body.transformToString();
    return {
      content,
      filesUpdate: null,
    };
  }

  async write(path: string, content: string): Promise<WriteResult> {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: path,
        Body: content,
      })
    );
    return {
      message: `Uploaded to S3: ${path}`,
      filesUpdate: null,
    };
  }

  // 实现其他方法...
}

// 使用自定义后端
const agent = createDeepAgent({
  backend: new S3Backend({ bucket: "my-bucket" }),
});
```

---

## 总结

### 学习路径建议

```
1️⃣ 基础（1-2天）
   - 理解 DeepAgent 概念
   - 运行基础示例
   - 熟悉 todos 和 files

2️⃣ 中级（3-5天）
   - 使用文件系统工具
   - 创建简单的子代理
   - 理解三种后端

3️⃣ 高级（1-2周）
   - 设计复杂的子代理系统
   - 实现自定义中间件
   - 生产环境部署
```

### 关键要点

✅ **DeepAgents = 模型 + 工具 + 中间件 + 后端**
✅ **中间件栈按顺序提供功能**
✅ **子代理用于复杂的隔离任务**
✅ **后端决定文件存储方式**
✅ **选择合适的后端很重要**

### 下一步

1. 阅读 `examples/` 目录中的示例
2. 尝试修改示例代码
3. 构建自己的应用
4. 查看 `docs/` 中的其他文档

祝学习愉快！🎉
