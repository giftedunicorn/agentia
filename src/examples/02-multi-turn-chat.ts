/**
 * Example 2: Multi-Turn Chat
 *
 * Demonstrates: Agent maintaining context across multiple turns
 *              and automatically selecting different tools
 *
 * Scenario: User asks multiple questions about their startup idea
 */

import { HumanMessage } from "@langchain/core/messages";
import { createStartupAdvisor } from "../core/startup-advisor";
import { allTools } from "../tools";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("💬 EXAMPLE 2: Multi-Turn Conversation");
  console.log("=".repeat(60) + "\n");

  // Create the agent
  const agent = createStartupAdvisor(allTools as any);

  // Conversation history
  let conversationState = {
    messages: [] as any[],
  };

  // Helper to chat with agent
  async function chat(userMessage: string) {
    console.log("\n" + "-".repeat(60));
    console.log("👤 User:");
    console.log(`   ${userMessage}\n`);

    // Add user message to history
    conversationState.messages.push(new HumanMessage(userMessage));

    // Get agent response
    const result = await agent.invoke(conversationState);

    // Update conversation state with all new messages
    conversationState = result;

    // Show agent response
    const finalMessage = result.messages[result.messages.length - 1];
    console.log("🤖 Assistant:");
    console.log(`   ${finalMessage.content}`);
  }

  // Turn 1: Initial idea
  await chat(
    "I want to build an AI-powered code assistant for developers. What do you think?"
  );

  // Turn 2: Ask about competitors
  await chat("Who are the main competitors?");

  // Turn 3: Ask about market size
  await chat("What's the market size for this?");

  // Turn 4: Ask about target customers
  await chat("Who should I target as customers?");

  console.log("\n" + "=".repeat(60));
  console.log("✅ Example complete!");
  console.log(
    `📊 Total messages in conversation: ${conversationState.messages.length}`
  );
  console.log("=".repeat(60) + "\n");
}

main().catch(console.error);
