/**
 * Example 1: Single Question
 *
 * Demonstrates: Agent automatically calling a single tool based on user question
 *
 * Scenario: User asks about competitors for their AI code assistant idea
 */

// Load environment variables
import { config } from "dotenv";
config();

import { HumanMessage } from "@langchain/core/messages";
import { createStartupAdvisor } from "../core/startup-advisor";
import { allTools } from "../tools";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("📚 EXAMPLE 1: Single Question → Single Tool");
  console.log("=".repeat(60) + "\n");

  // Create the agent with all available tools
  const agent = createStartupAdvisor(allTools as any);

  // User question about competitors
  const userMessage =
    "I'm thinking about building an AI-powered code assistant. Who are the main competitors in this space?";

  console.log("👤 User:");
  console.log(`   ${userMessage}\n`);

  // Invoke the agent
  const result = await agent.invoke({
    messages: [new HumanMessage(userMessage)],
  });

  // Extract the final response
  const finalMessage = result.messages[result.messages.length - 1];
  console.log("\n🤖 Assistant:");
  console.log(`   ${finalMessage.content}\n`);

  console.log("=".repeat(60));
  console.log("✅ Example complete!");
  console.log("=".repeat(60) + "\n");
}

main().catch(console.error);
