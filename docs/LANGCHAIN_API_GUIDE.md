# LangChain API 使用指南

## ✅ 已修正：使用官方 API

根据 [官方文档](https://docs.langchain.com/oss/javascript/langchain/agents)，我们的实现现在使用正确的 LangChain API。

## 核心 API

### 1. 创建 Agent

```typescript
import { createAgent } from "langchain";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const model = new ChatGoogleGenerativeAI({
  apiKey: "YOUR_API_KEY",
  model: "gemini-2.0-flash-exp",
  temperature: 0.7,
});

const agent = createAgent({
  model,
  tools: [tool1, tool2, tool3],
  systemPrompt: "You are a helpful assistant...",
});
```

### 2. 执行 Agent

```typescript
import { HumanMessage } from "@langchain/core/messages";

const result = await agent.invoke({
  messages: [new HumanMessage("Your query here")],
});

// 获取输出
const output = result.messages[result.messages.length - 1].content;
```

### 3. Streaming（流式输出）

```typescript
const stream = await agent.stream(
  { messages: [new HumanMessage("Search for AI news")] },
  { streamMode: "values" }
);

for await (const chunk of stream) {
  const latestMessage = chunk.messages?.at(-1);
  console.log(latestMessage?.content);
}
```

## 我们的 BaseAgent 实现

### 核心特性

```typescript
export abstract class BaseAgent {
  protected agent: any;

  // 延迟初始化
  protected async initialize() {
    this.agent = createAgent({
      model: this.config.model,
      tools: this.config.tools,
      systemPrompt: this.config.systemPrompt,
    });
  }

  // 执行方法
  async execute(input: string, context: AgentContext) {
    await this.initialize();

    const messages = [
      ...chatHistory,
      new HumanMessage(input),  // ✅ 正确：使用 HumanMessage
    ];

    const result = await this.agent.invoke({ messages });
    return result;
  }

  // 流式方法
  async *stream(input: string, context: AgentContext) {
    await this.initialize();

    const messages = [new HumanMessage(input)];

    const stream = await this.agent.stream(
      { messages },
      { streamMode: "values" }
    );

    for await (const chunk of stream) {
      const latestMessage = chunk.messages?.at(-1);
      if (latestMessage?.content) {
        yield latestMessage.content;
      }
    }
  }
}
```

## 关键改进

### ❌ 之前（错误的 API）

```typescript
// 错误：这些 API 已过时或不存在
import { AgentExecutor } from "langchain/agents";  // ❌
import { createToolCallingAgent } from "langchain/agents";  // ❌

const agent = await createToolCallingAgent({...});  // ❌
const executor = new AgentExecutor({...});  // ❌
```

### ✅ 现在（正确的 API）

```typescript
// 正确：使用官方推荐的 API
import { createAgent } from "langchain";  // ✅
import { HumanMessage } from "@langchain/core/messages";  // ✅

const agent = createAgent({
  model,
  tools,
  systemPrompt,
});

const result = await agent.invoke({
  messages: [new HumanMessage("query")],
});
```

## Tool 定义（保持不变）

Tool 的定义方式是正确的，无需修改：

```typescript
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

export const myTool = new DynamicStructuredTool({
  name: "my_tool",
  description: "What it does",
  schema: z.object({
    param: z.string(),
  }),
  func: async (input) => {
    // 实现
    return result;
  },
});
```

## 消息类型

### 正确使用消息类

```typescript
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";

// ✅ 用户消息
const userMsg = new HumanMessage("Hello");

// ✅ AI 响应
const aiMsg = new AIMessage("Hi there!");

// ✅ 系统消息
const sysMsg = new SystemMessage("You are a helpful assistant");

// ❌ 错误：不要使用普通对象
const wrong = { role: "user", content: "Hello" };  // 不会工作！
```

### 聊天历史

```typescript
const chatHistory: BaseMessage[] = [
  new HumanMessage("First question"),
  new AIMessage("First answer"),
  new HumanMessage("Follow-up question"),
];

const result = await agent.invoke({
  messages: [
    ...chatHistory,
    new HumanMessage("New question"),
  ],
});
```

## 完整示例

### 创建自定义 Agent

```typescript
import { createAgent } from "langchain";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import { myTool1, myTool2 } from "./tools/index.js";

class MyAgent {
  private agent: any;

  constructor(apiKey: string) {
    const model = new ChatGoogleGenerativeAI({
      apiKey,
      model: "gemini-2.0-flash-exp",
    });

    this.agent = createAgent({
      model,
      tools: [myTool1, myTool2],
      systemPrompt: "You are an expert...",
    });
  }

  async execute(input: string) {
    const result = await this.agent.invoke({
      messages: [new HumanMessage(input)],
    });

    return result.messages[result.messages.length - 1].content;
  }

  async *stream(input: string) {
    const stream = await this.agent.stream(
      { messages: [new HumanMessage(input)] },
      { streamMode: "values" }
    );

    for await (const chunk of stream) {
      const msg = chunk.messages?.at(-1);
      if (msg?.content) yield msg.content;
    }
  }
}
```

### 使用 Agent

```typescript
const agent = new MyAgent(process.env.GOOGLE_API_KEY);

// 普通执行
const result = await agent.execute("Analyze this data...");
console.log(result);

// 流式执行
for await (const chunk of agent.stream("Analyze this...")) {
  process.stdout.write(chunk);
}
```

## 与官方文档对齐

我们的实现现在完全遵循官方文档：

| 功能 | 官方文档 | 我们的实现 |
|------|---------|-----------|
| Agent 创建 | `createAgent()` | ✅ 使用 |
| 消息格式 | `HumanMessage` | ✅ 使用 |
| 执行方法 | `agent.invoke()` | ✅ 使用 |
| 流式输出 | `agent.stream()` | ✅ 使用 |
| Tool 定义 | `DynamicStructuredTool` | ✅ 使用 |

## 总结

### 主要修正

1. ✅ 使用 `createAgent` from "langchain"
2. ✅ 使用 `HumanMessage` 创建用户消息
3. ✅ 使用 `agent.invoke()` 和 `agent.stream()`
4. ✅ 简化的配置，无需 AgentExecutor

### 架构保持不变

- ✅ Tool 和 Agent 的关注点分离
- ✅ 独立的 Tool 文件
- ✅ 清晰的 BaseAgent 抽象
- ✅ 易于扩展和维护

**现在的实现既正确又清晰！** 🎉
