/**
 * Example 7: Deep Agent - Simple Test
 *
 * Demonstrates: Basic deep agent without subagents first
 */

// Load environment variables
import { config } from "dotenv";
config();

import { createDeepAgent } from "deepagents";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  competitorTool,
  marketTool,
  customerTool,
  vcReportTool,
} from "../tools";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("🧠 EXAMPLE 7: Deep Agent - Simple Test");
  console.log("=".repeat(60) + "\n");

  // System Prompt
  const systemPrompt = `You are a helpful startup advisor AI.

Your role:
- Help entrepreneurs evaluate their startup ideas
- Analyze competitors, market size, and target customers
- Provide honest, actionable feedback
- Use the write_todos tool to track multi-step tasks

Available tools:
- competitor_analysis: Analyze competitors
- market_sizing: Estimate market size
- customer_analysis: Identify target customers
- vc_evaluation_report: Generate VC reports

When working on complex tasks:
1. Use write_todos to break down the work
2. Update todos as you make progress
3. Keep the user informed`;

  // Create model
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash-exp",
    temperature: 0.7,
    apiKey: process.env.GEMINI_API_KEY,
  });

  console.log("Creating Deep Agent (without subagents)...\n");

  try {
    // Create Deep Agent without subagents first
    const agent = createDeepAgent({
      model,
      systemPrompt,
      tools: [competitorTool, marketTool, customerTool, vcReportTool],
      // No subagents for now
    });

    console.log("✅ Deep Agent created successfully!\n");

    // Test simple question
    console.log("─".repeat(60));
    console.log("📍 Test 1: Simple Question\n");
    console.log("👤 User: Hi! I want to build an AI code assistant. What do you think?\n");

    const result1 = await agent.invoke({
      messages: [
        {
          role: "user",
          content: "Hi! I want to build an AI code assistant. What do you think?",
        },
      ],
    });

    const lastMessage1 = result1.messages[result1.messages.length - 1];
    console.log(`🤖 Assistant:\n${lastMessage1.content}\n`);

    // Test with tool usage
    console.log("\n" + "─".repeat(60));
    console.log("📍 Test 2: Competitor Question\n");
    console.log("👤 User: Who are my main competitors?\n");

    const result2 = await agent.invoke({
      messages: [
        {
          role: "user",
          content:
            "I want to build an AI code assistant. Who are my main competitors?",
        },
      ],
    });

    const lastMessage2 = result2.messages[result2.messages.length - 1];
    console.log(`🤖 Assistant:\n${lastMessage2.content}\n`);

    // Test complex request
    console.log("\n" + "─".repeat(60));
    console.log("📍 Test 3: Complex Request (should use write_todos)\n");
    console.log(
      "👤 User: I need a complete evaluation: competitors, market, customers, and strategy.\n"
    );

    const result3 = await agent.invoke({
      messages: [
        {
          role: "user",
          content:
            "I want to build an AI code assistant. I need a complete evaluation including: competitor analysis, market sizing, customer research, and differentiation strategy. Please be thorough!",
        },
      ],
    });

    const lastMessage3 = result3.messages[result3.messages.length - 1];
    console.log(`🤖 Assistant:\n${lastMessage3.content}\n`);

    console.log("\n" + "=".repeat(60));
    console.log("✅ All Tests Completed!");
    console.log("=".repeat(60) + "\n");

    console.log("🎯 What We Tested:\n");
    console.log("1. ✓ Basic conversation");
    console.log("2. ✓ Tool usage (competitor_analysis)");
    console.log("3. ✓ Complex request (should trigger write_todos)");
    console.log("4. ✓ Deep Agent created without subagents");
    console.log("\n" + "=".repeat(60) + "\n");
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    console.error(error.stack);
  }
}

main().catch(console.error);
