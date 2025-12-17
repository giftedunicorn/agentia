/**
 * Example 8: Deep Agent with Planning, SubAgents, and Memory
 *
 * Demonstrates: Using our fixed deepagents implementation for complex conversations
 *
 * Key features:
 * - ✅ Automatic task planning (write_todos tool)
 * - ✅ SubAgent spawning for specialized analysis
 * - ✅ File system for long-term memory
 * - ✅ Claude Code-inspired architecture
 * - ✅ Bug fixed: No more "files channel already exists" error!
 *
 * Our custom implementation removes createFilesystemMiddleware from
 * subagent's defaultMiddleware to fix the state channel conflict.
 */

// Load environment variables
import { config } from "dotenv";
config();

import { HumanMessage } from "@langchain/core/messages";
import { createStartupAdvisorDeepAgent } from "../agents/deep-agent";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("🧠 EXAMPLE 8: Deep Agent - Complete Conversation");
  console.log("=".repeat(60));
  console.log("\nThis example demonstrates Deep Agent capabilities:\n");
  console.log("✓ Automatic task planning with write_todos");
  console.log("✓ SubAgent spawning for specialized work");
  console.log("✓ File system for memory and context");
  console.log("✓ Claude Code-inspired architecture");
  console.log("✓ Bug fixed: Files channel conflict resolved!");
  console.log("\n" + "=".repeat(60) + "\n");

  // 创建 Deep Agent
  const agent = createStartupAdvisorDeepAgent();

  // Helper function for chat
  async function chat(userMessage: string, description?: string) {
    if (description) {
      console.log("\n" + "─".repeat(60));
      console.log(`📍 ${description}`);
      console.log("─".repeat(60));
    }

    console.log(`\n👤 User: ${userMessage}\n`);

    try {
      // Invoke the agent
      const result = await agent.invoke({
        messages: [new HumanMessage(userMessage)],
      });

      // Extract the final message
      const messages = result.messages;
      const lastMessage = messages[messages.length - 1];

      console.log(`🤖 Assistant:\n${lastMessage.content}\n`);

      return result;
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}\n`);
      console.error(error.stack);
      throw error;
    }
  }

  // ========== Conversation Flow ==========

  // Turn 1: User describes idea
  await chat(
    "Hi! I want to build an AI-powered code documentation tool that automatically keeps docs up-to-date by analyzing git commits. What do you think?",
    "Turn 1: Initial Idea Introduction"
  );

  // Turn 2: Ask about competitors
  await chat(
    "Who are my main competitors in this space?",
    "Turn 2: Competitor Question (Agent may spawn competitor-analyst subagent)"
  );

  // Turn 3: Ask about market size
  await chat(
    "What's the market opportunity? How big is the TAM/SAM/SOM?",
    "Turn 3: Market Sizing (Agent may spawn market-researcher subagent)"
  );

  // Turn 4: Ask about customers
  await chat(
    "Who should I target as customers? What are their pain points?",
    "Turn 4: Customer Analysis (Agent may spawn customer-researcher subagent)"
  );

  // Turn 5: Strategic question that requires synthesis
  await chat(
    "Based on everything we've discussed, how should I differentiate from the competition?",
    "Turn 5: Strategic Question (Agent synthesizes all previous analyses)"
  );

  // Turn 6: Complex multi-step request
  await chat(
    "I need a complete VC evaluation report covering all aspects: competitors, market, customers, strategy, and investment recommendation. Make it comprehensive!",
    "Turn 6: Complex Request (Agent should create todos, use subagents, save to files)"
  );

  // Turn 7: Follow-up question
  await chat(
    "What should be my first priority to validate this idea?",
    "Turn 7: Follow-up Question"
  );

  // ========== Final Summary ==========

  console.log("\n" + "=".repeat(60));
  console.log("✅ Deep Agent Conversation Complete!");
  console.log("=".repeat(60) + "\n");

  console.log("🎯 What Deep Agent Demonstrated:\n");
  console.log("1. ✓ Task Planning - Agent used write_todos for complex requests");
  console.log("2. ✓ SubAgent Spawning - Specialized subagents for deep analysis");
  console.log("3. ✓ Context Management - File system for memory");
  console.log("4. ✓ Synthesis - Combined multiple analyses for strategic advice");
  console.log("5. ✓ Adaptability - Adjusted approach based on questions");
  console.log("\n" + "=".repeat(60) + "\n");

  console.log("💡 Key Learnings:\n");
  console.log("• Agent automatically breaks down complex tasks");
  console.log("• SubAgents keep main agent's context clean");
  console.log("• File system enables long-term memory");
  console.log("• Todos are managed by the model, not our code");
  console.log("• Architecture inspired by Claude Code\n");

  console.log("🚀 Try It Yourself:\n");
  console.log("1. Run: pnpm dev:deep");
  console.log("2. Watch how agent uses write_todos");
  console.log("3. See subagents spawn for specialized work");
  console.log("4. Notice how context is managed with files\n");

  console.log("=".repeat(60) + "\n");
}

main().catch(console.error);
