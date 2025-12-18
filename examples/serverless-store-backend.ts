/**
 * ✅ Serverless 环境 - 使用 StoreBackend
 *
 * 直接将文件存储到数据库，不依赖 checkpointer
 */

import { createDeepAgent } from "../src/deepagents";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import { PostgresStore } from "@langchain/langgraph-checkpoint-postgres";
import { StoreBackend } from "../src/deepagents/backends";

// 创建全局 store 实例（复用连接）
const store = new PostgresStore({
  connectionString: process.env.DATABASE_URL!,
});

export async function POST(request: Request) {
  const { userId, sessionId, message } = await request.json();

  // 使用 StoreBackend（直接存储到数据库）
  const agent = createDeepAgent({
    model: new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash-exp",
      apiKey: process.env.GEMINI_API_KEY,
    }),
    systemPrompt: "你是一个有帮助的助手",

    // ✅ 使用 StoreBackend
    backend: (config) => new StoreBackend({
      namespace: ["agent-files", userId, sessionId],
      store: config.store || store,
    }),

    store: store,  // 提供 store 实例
  });

  const result = await agent.invoke(
    {
      messages: [new HumanMessage(message)],
    },
    {
      configurable: {
        thread_id: `${userId}-${sessionId}`,
      },
    }
  );

  // 文件已经存储在数据库中！
  return Response.json({
    todos: result.todos,
    message: result.messages[result.messages.length - 1].content,
    filesCreated: Object.keys(result.files || {}),
  });
}

// 直接从 Store 获取文件（不需要调用 agent）
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId")!;
  const sessionId = searchParams.get("sessionId")!;

  // ✅ 直接从 store 读取文件
  const items = await store.list({
    namespace: ["agent-files", userId, sessionId],
  });

  const files: Record<string, string> = {};
  for (const item of items) {
    const path = item.key[item.key.length - 1];
    const fileData = item.value as any;
    files[path] = fileData.content.join("\n");
  }

  return Response.json({ files });
}

// 删除会话的所有文件
export async function DELETE(request: Request) {
  const { userId, sessionId } = await request.json();

  await store.delete({
    namespace: ["agent-files", userId, sessionId],
  });

  return Response.json({ success: true });
}
