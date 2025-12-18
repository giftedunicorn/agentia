/**
 * Example: Using LangGraph's Store Backend
 * Built-in persistent storage using PostgresStore or other backends
 */

import { createDeepAgent } from "deepagents";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import { PostgresStore } from "@langchain/langgraph-checkpoint-postgres";
import { StoreBackend } from "../src/deepagents/backends";

// Initialize PostgresStore (or use MemoryStore for development)
const store = new PostgresStore({
  connectionString: process.env.DATABASE_URL!,
});

export async function POST(request: Request) {
  const { userId, sessionId, question } = await request.json();

  // Create agent with StoreBackend for persistent files
  const agent = createDeepAgent({
    model: new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash-exp",
      apiKey: process.env.GEMINI_API_KEY!,
    }),
    tools: [/* your tools */],
    systemPrompt: "You are a helpful research assistant...",
    subagents: [/* your subagents */],

    // ✅ GOOD: Use StoreBackend for persistent storage
    backend: (config) => new StoreBackend({
      namespace: ["agent-files", userId, sessionId],
      store: config.store || store,
    }),

    // Enable persistence
    store: store,
  });

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

  // Files are automatically persisted in the store
  // You can retrieve them later using the same sessionId

  return Response.json({
    sessionId,
    todos: result.todos,
    message: "Files stored in database. Use GET /api/agent/files to retrieve them.",
  });
}

// Retrieve files from a session
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const sessionId = searchParams.get("sessionId");

  // List all files for this session
  const items = await store.list({
    namespace: ["agent-files", userId!, sessionId!],
  });

  const files: Record<string, string> = {};
  for (const item of items) {
    // Each item.key is the file path, item.value is the FileData
    const path = item.key[item.key.length - 1]; // Last element is the path
    const fileData = item.value as any;
    files[path] = fileData.content.join("\n");
  }

  return Response.json({ files });
}

// Delete files when session is done
export async function DELETE(request: Request) {
  const { userId, sessionId } = await request.json();

  // Delete all files for this session
  await store.delete({
    namespace: ["agent-files", userId, sessionId],
  });

  return Response.json({ success: true });
}
