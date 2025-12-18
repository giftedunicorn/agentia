/**
 * 学习示例 1：基础 DeepAgent
 *
 * 这个示例展示：
 * - 如何创建最简单的 DeepAgent
 * - 如何查看 todos（任务列表）
 * - 如何查看 messages（对话历史）
 */

import { config } from "dotenv";
config();

import { createDeepAgent } from "../src/deepagents";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";

async function main() {
  console.log("🎓 学习示例 1：基础 DeepAgent\n");

  // 1️⃣ 创建一个简单的 DeepAgent
  const agent = createDeepAgent({
    model: new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash-exp",
      apiKey: process.env.GEMINI_API_KEY,
      temperature: 0.7,
    }),
    systemPrompt: "你是一个有帮助的助手。",
  });

  // 2️⃣ 调用 agent 执行任务
  console.log("📤 发送任务：帮我规划一个学习 TypeScript 的计划\n");

  const result = await agent.invoke({
    messages: [
      new HumanMessage("帮我规划一个为期一周的 TypeScript 学习计划")
    ],
  });

  // 3️⃣ 查看 todos（任务列表）
  console.log("📋 任务列表 (result.todos):");
  console.log("─".repeat(70));
  if (result.todos && result.todos.length > 0) {
    result.todos.forEach((todo, i) => {
      const icon =
        todo.status === "completed" ? "✅" :
        todo.status === "in_progress" ? "🔄" : "⏳";
      console.log(`${i + 1}. ${icon} [${todo.status}] ${todo.content}`);
    });
  } else {
    console.log("(没有创建任务)");
  }

  // 4️⃣ 查看最后的回复
  console.log("\n💬 Agent 的回复:");
  console.log("─".repeat(70));
  const lastMessage = result.messages[result.messages.length - 1];
  console.log(lastMessage.content);

  // 5️⃣ 查看完整的对话历史
  console.log("\n📜 完整对话历史 (result.messages):");
  console.log("─".repeat(70));
  result.messages.forEach((msg, i) => {
    const type = msg._getType();
    console.log(`\n[${i}] ${type}:`);

    if (msg.content) {
      const preview = msg.content.length > 100
        ? msg.content.substring(0, 100) + "..."
        : msg.content;
      console.log(`  内容: ${preview}`);
    }

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      msg.tool_calls.forEach(tc => {
        console.log(`  🔧 调用工具: ${tc.name}`);
      });
    }
  });

  console.log("\n✅ 示例完成！\n");
  console.log("💡 关键概念：");
  console.log("   - result.todos: 代理自动创建的任务列表");
  console.log("   - result.messages: 完整的对话历史（包括工具调用）");
  console.log("   - DeepAgent 会自动规划和跟踪任务\n");
}

main().catch(console.error);
