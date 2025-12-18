/**
 * Example: SaaS with Database Persistence
 * Store agent results in a database for later retrieval
 */

import { createDeepAgent } from "deepagents";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";

// Example using Prisma, but you can use any database client
interface AgentSession {
  id: string;
  userId: string;
  question: string;
  files: Record<string, string>;
  todos: Array<{ content: string; status: string }>;
  createdAt: Date;
  updatedAt: Date;
}

export async function createAgentSession(
  userId: string,
  question: string,
  db: any // Your database client
) {
  const agent = createDeepAgent({
    model: new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash-exp",
      apiKey: process.env.GEMINI_API_KEY!,
    }),
    // ... config
  });

  const result = await agent.invoke({
    messages: [new HumanMessage(question)],
  });

  // ✅ GOOD: Store in database
  const files: Record<string, string> = {};
  if (result.files) {
    for (const [path, fileData] of Object.entries(result.files)) {
      files[path] = fileData.content.join("\n");
    }
  }

  const session = await db.agentSession.create({
    data: {
      userId,
      question,
      files: JSON.stringify(files),
      todos: JSON.stringify(result.todos),
    },
  });

  return session;
}

export async function getAgentSession(sessionId: string, db: any) {
  const session = await db.agentSession.findUnique({
    where: { id: sessionId },
  });

  return {
    ...session,
    files: JSON.parse(session.files),
    todos: JSON.parse(session.todos),
  };
}

// API Route Example (Next.js)
export async function POST(request: Request) {
  const { userId, question } = await request.json();

  const session = await createAgentSession(userId, question, db);

  return Response.json({
    sessionId: session.id,
    files: JSON.parse(session.files),
    todos: JSON.parse(session.todos),
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  const session = await getAgentSession(sessionId!, db);

  return Response.json(session);
}
