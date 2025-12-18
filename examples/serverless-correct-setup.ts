/**
 * ✅ Serverless 环境的正确配置
 *
 * 使用 StateBackend（默认）+ PostgresSaver（checkpointer）
 * 文件会自动持久化到数据库
 */

import { createDeepAgent } from "../src/deepagents";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

// API 路由示例（Next.js App Router）
export async function POST(request: Request) {
  const { userId, sessionId, message } = await request.json();

  // 1. 创建 checkpointer（持久化 state）
  const checkpointer = PostgresSaver.fromConnString(
    process.env.DATABASE_URL!
  );

  // 2. 创建 agent（使用默认的 StateBackend）
  const agent = createDeepAgent({
    model: new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash-exp",
      apiKey: process.env.GEMINI_API_KEY,
    }),
    systemPrompt: "你是一个有帮助的助手",
    checkpointer: checkpointer,  // ✅ 关键：持久化 state
  });

  // 3. 调用 agent
  const result = await agent.invoke(
    {
      messages: [new HumanMessage(message)],
    },
    {
      configurable: {
        thread_id: `${userId}-${sessionId}`,  // ✅ 会话 ID
      },
    }
  );

  // 4. 返回结果
  // state.files 已经自动保存到数据库了！
  return Response.json({
    todos: result.todos,
    message: result.messages[result.messages.length - 1].content,
    filesCreated: Object.keys(result.files || {}),
  });
}

// 获取之前的文件
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const sessionId = searchParams.get("sessionId");

  const checkpointer = PostgresSaver.fromConnString(
    process.env.DATABASE_URL!
  );

  const agent = createDeepAgent({
    model: new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash-exp",
      apiKey: process.env.GEMINI_API_KEY,
    }),
    checkpointer: checkpointer,
  });

  // 重新调用 agent（它会从数据库加载之前的 state）
  const result = await agent.invoke(
    {
      messages: [new HumanMessage("列出所有文件")],
    },
    {
      configurable: {
        thread_id: `${userId}-${sessionId}`,
      },
    }
  );

  // ✅ result.files 包含之前创建的所有文件！
  const files: Record<string, string> = {};
  if (result.files) {
    for (const [path, fileData] of Object.entries(result.files)) {
      files[path] = fileData.content.join("\n");
    }
  }

  return Response.json({ files });
}
