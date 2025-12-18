/**
 * 学习示例 3：子代理系统
 *
 * 这个示例展示：
 * - 如何定义子代理
 * - 主代理如何委托任务给子代理
 * - 子代理的隔离上下文
 */

import { config } from "dotenv";
config();

import { createDeepAgent, type SubAgent } from "../src/deepagents";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import { tool } from "langchain";
import { z } from "zod";

// 模拟搜索工具
const searchTool = tool(
  async ({ query }: { query: string }) => {
    console.log(`   🔍 搜索工具被调用：query="${query}"`);
    // 模拟搜索结果
    return `关于 ${query} 的搜索结果：
      1. ${query} 是一个重要的主题
      2. 有很多资源可以学习 ${query}
      3. 建议从基础开始学习`;
  },
  {
    name: "search",
    description: "搜索互联网获取信息",
    schema: z.object({
      query: z.string().describe("搜索关键词"),
    }),
  }
);

async function main() {
  console.log("🎓 学习示例 3：子代理系统\n");

  // 1️⃣ 定义研究子代理
  const researchAgent: SubAgent = {
    name: "researcher",
    description: "深度研究专家。用于需要收集大量信息的复杂主题。一次只处理一个主题。",
    systemPrompt: `你是一个专业研究员。
      使用 search 工具收集信息。
      进行深入分析并提供详细报告。
      只有你的最终报告会被传递给用户。`,
    tools: [searchTool],
  };

  // 2️⃣ 创建主代理（包含子代理）
  const agent = createDeepAgent({
    model: new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash-exp",
      apiKey: process.env.GEMINI_API_KEY,
      temperature: 0.7,
    }),
    systemPrompt: `你是一个协调员。
      对于复杂的研究任务，使用 task 工具委托给 researcher 子代理。
      可以并行委托多个独立的研究任务。`,
    tools: [],
    subagents: [researchAgent],
  });

  console.log("📤 任务：研究三个不同的主题\n");

  // 3️⃣ 调用主代理
  const result = await agent.invoke({
    messages: [
      new HumanMessage(
        "请分别深入研究以下三个主题：1) LangGraph 2) DeepAgents 3) React Agent"
      )
    ],
  });

  // 4️⃣ 分析结果
  console.log("\n📊 分析执行过程:");
  console.log("─".repeat(70));

  // 查找 task 工具调用
  let taskCallCount = 0;
  result.messages.forEach((msg, i) => {
    if (msg.tool_calls) {
      msg.tool_calls.forEach(tc => {
        if (tc.name === "task") {
          taskCallCount++;
          console.log(`\n🤖 [${i}] 主代理调用子代理 #${taskCallCount}:`);
          console.log(`   子代理类型: ${tc.args.subagent_type}`);
          console.log(`   任务描述: ${tc.args.description.substring(0, 80)}...`);
        } else if (tc.name === "search") {
          console.log(`\n🔍 [${i}] 子代理调用搜索工具:`);
          console.log(`   搜索查询: ${tc.args.query}`);
        }
      });
    }
  });

  console.log(`\n📈 统计:`);
  console.log(`   总共委托了 ${taskCallCount} 个子代理任务`);

  // 5️⃣ 查看最终结果
  console.log("\n💬 最终报告:");
  console.log("─".repeat(70));
  const lastMessage = result.messages[result.messages.length - 1];
  console.log(lastMessage.content);

  console.log("\n✅ 示例完成！\n");
  console.log("💡 关键概念：");
  console.log("   - 主代理使用 task 工具委托任务给子代理");
  console.log("   - 每个子代理有独立的上下文（不知道主代理的对话历史）");
  console.log("   - 子代理可以并行执行");
  console.log("   - 子代理只返回最终结果给主代理\n");
}

main().catch(console.error);
