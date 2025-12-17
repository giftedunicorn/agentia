/**
 * Example 6: Basic SubAgent Usage
 *
 * Demonstrates: How to create and use generic, configurable SubAgents
 *
 * Key features:
 * - BaseSubAgent is generic and configuration-driven
 * - No predefined types - create any SubAgent dynamically
 * - Support both isolated and shared memory
 * - Simple, flexible API
 */

// Load environment variables
import { config } from "dotenv";
config();

import { BaseSubAgent } from "../subagents";
import type { SubAgentConfig } from "../subagents";
import { competitorTool, marketTool, customerTool } from "../tools";
import { MemoryManager } from "../context/memory";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("🤖 EXAMPLE 6: Basic SubAgent Usage");
  console.log("=".repeat(60));
  console.log("\nThis example demonstrates generic SubAgent creation:\n");
  console.log("✓ Configuration-driven SubAgent");
  console.log("✓ No predefined types");
  console.log("✓ Dynamic creation for any task");
  console.log("✓ Isolated or shared memory");
  console.log("\n" + "=".repeat(60) + "\n");

  // ========== Scenario 1: Create a Competitor Analyst SubAgent ==========

  console.log("📍 Scenario 1: Competitor Analysis SubAgent\n");

  // 配置一个竞对分析专家 SubAgent
  const competitorAnalystConfig: SubAgentConfig = {
    name: "competitor-analyst",
    description: "Expert in analyzing market competitors",
    tools: [competitorTool],
    systemPrompt: `You are a competitor analysis expert for startups.

Your role:
- Analyze competitors thoroughly
- Identify competitive advantages and disadvantages
- Provide actionable differentiation strategies
- Focus on product, pricing, and market positioning

Be concise, data-driven, and actionable.`,
    isolatedMemory: true, // 使用独立 Memory
    llmConfig: {
      temperature: 0.7,
    },
  };

  // 创建 SubAgent
  const competitorAgent = new BaseSubAgent(competitorAnalystConfig);

  // 执行任务
  const result1 = await competitorAgent.execute(
    "分析 AI 代码助手市场的主要竞争对手，包括 GitHub Copilot 和 Cursor"
  );

  console.log("\n📊 Result:");
  console.log(`   Success: ${result1.success}`);
  console.log(`   Duration: ${result1.duration}ms`);
  console.log(`   Data: ${JSON.stringify(result1.data).substring(0, 200)}...`);

  // ========== Scenario 2: Create a Market Researcher SubAgent ==========

  console.log("\n" + "─".repeat(60));
  console.log("📍 Scenario 2: Market Research SubAgent\n");

  // 配置一个市场研究专家 SubAgent
  const marketResearcherConfig: SubAgentConfig = {
    name: "market-researcher",
    description: "Expert in market sizing and trend analysis",
    tools: [marketTool],
    systemPrompt: `You are a market research expert specializing in TAM/SAM/SOM analysis.

Your role:
- Estimate market sizes (TAM, SAM, SOM)
- Analyze market growth trends
- Identify market opportunities
- Provide data-backed insights

Use specific numbers and cite sources when possible.`,
    isolatedMemory: true,
  };

  const marketAgent = new BaseSubAgent(marketResearcherConfig);

  const result2 = await marketAgent.execute(
    "估算 AI 代码助手的市场规模，包括 TAM、SAM、SOM"
  );

  console.log("\n📊 Result:");
  console.log(`   Success: ${result2.success}`);
  console.log(`   Duration: ${result2.duration}ms`);
  console.log(`   Tools Called: ${result2.metadata?.toolsCalled?.join(", ")}`);

  // ========== Scenario 3: Shared Memory (Context Sharing) ==========

  console.log("\n" + "─".repeat(60));
  console.log("📍 Scenario 3: Shared Memory Between SubAgents\n");

  // 创建一个共享的 Memory
  const sharedMemory = new MemoryManager("shared-session");

  // 先用第一个 SubAgent 分析竞对（写入共享 Memory）
  const agent1Config: SubAgentConfig = {
    name: "analyzer",
    description: "Analyzes competitors",
    tools: [competitorTool],
    systemPrompt: "You are a competitor analyst. Store insights in memory.",
    sharedMemory, // 使用共享 Memory
    isolatedMemory: false,
  };

  const agent1 = new BaseSubAgent(agent1Config);
  await agent1.execute("分析 AI 代码助手的竞对");

  console.log("\n💾 Shared Memory State:");
  console.log(sharedMemory.getSummary());

  // 第二个 SubAgent 可以访问第一个 SubAgent 存储的数据
  const agent2Config: SubAgentConfig = {
    name: "strategist",
    description: "Develops strategy",
    tools: [customerTool],
    systemPrompt:
      "You are a strategy consultant. Use the competitor analysis from memory to develop strategies.",
    sharedMemory, // 使用相同的共享 Memory
    isolatedMemory: false,
  };

  const agent2 = new BaseSubAgent(agent2Config);
  const result3 = await agent2.execute("基于竞对分析，建议我们的差异化策略");

  console.log("\n📊 Strategy Result:");
  console.log(`   Success: ${result3.success}`);
  console.log(`   Data: ${JSON.stringify(result3.data).substring(0, 200)}...`);

  // ========== Scenario 4: Batch Execution ==========

  console.log("\n" + "─".repeat(60));
  console.log("📍 Scenario 4: Batch Execution\n");

  const batchAgent = new BaseSubAgent({
    name: "batch-analyst",
    description: "Handles multiple analysis tasks",
    tools: [competitorTool, marketTool, customerTool],
    systemPrompt: "You are a comprehensive startup analyst.",
    isolatedMemory: true,
  });

  const batchResults = await batchAgent.executeBatch([
    "快速分析主要竞对",
    "估算市场规模",
    "描述目标客户",
  ]);

  console.log("\n📊 Batch Results:");
  batchResults.forEach((result, index) => {
    console.log(`   Task ${index + 1}: ${result.success ? "✅" : "❌"} (${result.duration}ms)`);
  });

  // ========== Scenario 5: Custom SubAgent for Any Task ==========

  console.log("\n" + "─".repeat(60));
  console.log("📍 Scenario 5: Custom SubAgent (No Tools)\n");

  // 创建一个不使用工具的通用顾问 SubAgent
  const advisorConfig: SubAgentConfig = {
    name: "general-advisor",
    description: "General startup advisor",
    tools: [], // 不使用任何工具，纯对话
    systemPrompt: `You are a friendly startup advisor with 10 years of experience.

Your role:
- Provide practical advice
- Answer questions clearly
- Be encouraging but realistic
- Use your general knowledge

No tools needed - just use your knowledge to help.`,
    isolatedMemory: true,
  };

  const advisorAgent = new BaseSubAgent(advisorConfig);

  const result4 = await advisorAgent.execute(
    "作为一个技术创始人，我应该在产品开发的早期阶段就开始营销吗？"
  );

  console.log("\n💬 Advisor Response:");
  console.log(`   Success: ${result4.success}`);
  console.log(`   Data: ${result4.data}`);

  // ========== Final Summary ==========

  console.log("\n" + "=".repeat(60));
  console.log("✅ SubAgent Examples Complete!");
  console.log("=".repeat(60) + "\n");

  console.log("🎯 What We Demonstrated:\n");
  console.log("1. ✓ Created specialized SubAgents dynamically");
  console.log("2. ✓ No predefined types - fully configurable");
  console.log("3. ✓ Isolated memory for task independence");
  console.log("4. ✓ Shared memory for context sharing");
  console.log("5. ✓ Batch execution for multiple tasks");
  console.log("6. ✓ Tool-less SubAgents for pure dialogue");
  console.log("\n" + "=".repeat(60) + "\n");

  console.log("💡 Key Learnings:\n");
  console.log("• BaseSubAgent is generic - create any type on-the-fly");
  console.log("• Configuration drives behavior (tools, prompts, memory)");
  console.log("• Shared memory enables context passing between SubAgents");
  console.log("• Can be used with or without tools");
  console.log("• Simple API: new BaseSubAgent(config) → execute(prompt)\n");

  console.log("🚀 Try It Yourself:\n");
  console.log("1. Run: pnpm tsx src/examples/06-subagent-basic.ts");
  console.log("2. Modify configs to create your own SubAgents");
  console.log("3. Experiment with shared vs isolated memory");
  console.log("4. Try different tool combinations\n");

  console.log("=".repeat(60) + "\n");
}

main().catch(console.error);
