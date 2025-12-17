# Quick Start Guide

## 前置要求

1. **设置 API Key**
   ```bash
   export OPENAI_API_KEY="your-key-here"
   ```

2. **安装依赖**（如果还没安装）
   ```bash
   pnpm install
   ```

## 运行示例

### 方式 1: 使用主入口文件（推荐）

```bash
# 查看所有示例
npx tsx playground/index.ts

# 运行 Example 1: 单个问题
npx tsx playground/index.ts 1

# 运行 Example 2: 多轮对话
npx tsx playground/index.ts 2

# 运行 Example 3: 完整对话 + VC 报告
npx tsx playground/index.ts 3

# 运行所有示例
npx tsx playground/index.ts all
```

### 方式 2: 直接运行单个示例

```bash
npx tsx playground/examples/01-single-question.ts
npx tsx playground/examples/02-multi-turn-chat.ts
npx tsx playground/examples/03-full-conversation.ts
```

## 示例说明

### Example 1: 单个问题
用户问："竞对有谁？" → Agent 调用 `competitor_analysis` 工具

**学习要点：**
- Agent 如何理解用户意图
- 自动选择合适的工具
- 工具的输入输出格式

### Example 2: 多轮对话
用户连续提问：竞对、市场、客户 → Agent 保持上下文并调用不同工具

**学习要点：**
- 对话历史的维护
- 上下文的传递
- Agent 如何在多轮对话中保持一致性

### Example 3: 完整对话 + VC 报告
完整的创业咨询流程 → 从初步咨询到生成完整 VC 评估报告

**学习要点：**
- 真实的对话流程
- 工具的组合使用
- 综合报告的生成（vc_evaluation_report 工具）
- Agent 如何提供战略建议

## 自定义使用

### 直接使用单个工具

```typescript
import { competitorTool } from "./tools";

// 直接调用工具（不通过 Agent）
const result = await competitorTool.invoke({
  ideaDescription: "AI-powered code assistant",
});

console.log(result);
```

### 创建自定义 Agent

```typescript
import { createStartupAdvisor } from "./core/startup-advisor";
import { competitorTool, marketTool } from "./tools";

// 只使用部分工具
const agent = createStartupAdvisor([competitorTool, marketTool]);

// 自定义 LLM
import { ChatOpenAI } from "@langchain/openai";
const customLLM = new ChatOpenAI({
  modelName: "gpt-4o-mini", // 更便宜的模型
  temperature: 0.5,
});

const agent = createStartupAdvisor(allTools, customLLM);
```

### 交互式对话（可以自己实现）

```typescript
import * as readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let state = { messages: [] };

function chat() {
  rl.question("You: ", async (input) => {
    if (input === "exit") {
      rl.close();
      return;
    }

    state.messages.push(new HumanMessage(input));
    const result = await agent.invoke(state);
    state = result;

    const response = result.messages[result.messages.length - 1];
    console.log(`\nAssistant: ${response.content}\n`);

    chat(); // 继续下一轮
  });
}

chat();
```

## 故障排查

### 错误: "OPENAI_API_KEY not found"
确保设置了环境变量：
```bash
export OPENAI_API_KEY="sk-..."
```

### 工具没有被调用
检查：
1. 工具的 `description` 是否清晰（LLM 通过描述判断是否使用）
2. 用户的问题是否明确
3. System prompt 是否正确引导 Agent

### 响应太慢
- 使用更快的模型（如 `gpt-4o-mini`）
- 减少工具的延迟（目前是 mock 延迟 700-1500ms）
- 减少可用工具的数量

## 下一步

1. **修改工具数据** - 编辑 `tools/*.tool.ts` 中的 mock 数据
2. **添加新工具** - 参考现有工具创建新的工具
3. **调整 Agent 性格** - 修改 `core/startup-advisor.ts` 中的 `SYSTEM_PROMPT`
4. **集成真实 API** - 替换 mock 数据为真实 API 调用
5. **添加记忆功能** - 使用 LangChain 的 Memory 模块

## 与现有 agentia 的区别

| 特性 | Playground | 现有 agentia |
|-----|-----------|-------------|
| 复杂度 | 简单（12 个文件） | 复杂（28+ 个文件） |
| 依赖 | 最小化 | 数据库、多个 API |
| 学习曲线 | 渐进式 | 陡峭 |
| 适合 | 学习、实验 | 生产环境 |
| Context | 无状态 | sessionId/userId 追踪 |

Enjoy! 🚀
