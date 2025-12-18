/**
 * Example: SaaS API endpoint for DeepAgents
 * Returns files as part of the response instead of writing to disk
 */

import { createDeepAgent } from "deepagents";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";

// Example API handler (Next.js API route, Express endpoint, etc.)
export async function POST(request: Request) {
  const { question } = await request.json();

  const agent = createDeepAgent({
    model: new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash-exp",
      apiKey: process.env.GEMINI_API_KEY!,
    }),
    tools: [/* your tools */],
    systemPrompt: "You are a helpful research assistant...",
    subagents: [/* your subagents */],
  });

  const result = await agent.invoke({
    messages: [new HumanMessage(question)],
  });

  // ✅ GOOD: Return files as part of the response
  const files: Record<string, string> = {};
  if (result.files) {
    for (const [path, fileData] of Object.entries(result.files)) {
      files[path] = fileData.content.join("\n");
    }
  }

  return Response.json({
    todos: result.todos,
    files: files,
    lastMessage: result.messages[result.messages.length - 1]?.content,
  });
}

// Client usage:
// const response = await fetch('/api/agent', {
//   method: 'POST',
//   body: JSON.stringify({ question: "What is LangGraph?" })
// });
// const { files } = await response.json();
// console.log(files['/final_report.md']);
