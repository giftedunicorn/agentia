/**
 * Example 8: Manual Deep Agent Assembly
 *
 * Demonstrates: Building a deep agent manually with middleware
 * Workaround for deepagents compatibility issues
 */

// Load environment variables
import { config } from "dotenv";
config();

import { createAgent } from "langchain";
import { todoListMiddleware } from "deepagents";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  competitorTool,
  marketTool,
  customerTool,
  vcReportTool,
} from "../tools";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("🧠 EXAMPLE 8: Manual Deep Agent Assembly");
  console.log("=".repeat(60) + "\n");

  // System Prompt
  const systemPrompt = `You are a highly skilled startup advisor AI.

## Your Role
You help entrepreneurs evaluate their startup ideas by:
1. Understanding their vision
2. Analyzing competitors, market, and customers
3. Providing honest, actionable feedback
4. Generating VC-style evaluation reports

## Planning & Task Management
When working on complex, multi-step tasks:
- Use the **write_todos** tool to break down the work
- Create clear, actionable todos
- Mark todos as in_progress when starting
- Mark todos as completed when done
- Update your plan as new information emerges

Example todos:
[
  {"content": "Analyze competitors", "status": "completed"},
  {"content": "Research market size", "status": "in_progress"},
  {"content": "Identify target customers", "status": "pending"}
]

## Available Tools
- **competitor_analysis**: Deep competitor analysis
- **market_sizing**: TAM/SAM/SOM estimation
- **customer_analysis**: Customer personas and needs
- **vc_evaluation_report**: Complete VC report

## Working Style
1. For simple questions: Answer directly
2. For complex requests: Create todos first, then execute step by step
3. Always synthesize insights and provide your perspective
4. Be data-driven but also realistic

Let's help entrepreneurs succeed!`;

  // Create model
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash-exp",
    temperature: 0.7,
    apiKey: process.env.GEMINI_API_KEY,
  });

  console.log("Creating agent with todoListMiddleware...\n");

  try {
    // Create agent with only todoListMiddleware
    const agent = createAgent({
      model,
      systemPrompt,
      tools: [competitorTool, marketTool, customerTool, vcReportTool],
      middleware: [
        todoListMiddleware({
          systemPrompt:
            "Use write_todos to track multi-step tasks. Update todos as you work.",
        }),
      ],
    });

    console.log("✅ Agent created successfully!\n");

    // Helper function
    async function chat(userMessage: string, description?: string) {
      if (description) {
        console.log("\n" + "─".repeat(60));
        console.log(`📍 ${description}`);
        console.log("─".repeat(60));
      }

      console.log(`\n👤 User: ${userMessage}\n`);

      try {
        const result = await agent.invoke({
          input: userMessage,
        });

        console.log(`🤖 Assistant:\n${result.output}\n`);
        return result;
      } catch (error: any) {
        console.error(`❌ Error: ${error.message}\n`);
        throw error;
      }
    }

    // ========== Test Conversation ==========

    // Test 1: Simple question
    await chat(
      "Hi! I want to build an AI-powered code documentation tool. What do you think?",
      "Test 1: Initial Idea"
    );

    // Test 2: Competitor analysis
    await chat(
      "Who are my main competitors in this space?",
      "Test 2: Competitor Analysis (should use tool)"
    );

    // Test 3: Market sizing
    await chat(
      "What's the market opportunity? Give me TAM/SAM/SOM estimates.",
      "Test 3: Market Sizing (should use tool)"
    );

    // Test 4: Complex multi-step request
    await chat(
      "I need a complete evaluation. Please: 1) Analyze all competitors 2) Estimate market size 3) Identify target customers 4) Suggest differentiation strategy 5) Give me an overall assessment. Be thorough!",
      "Test 4: Complex Request (should trigger write_todos)"
    );

    // Test 5: Strategic question
    await chat(
      "Based on everything we've discussed, what should be my #1 priority to validate this idea?",
      "Test 5: Strategic Synthesis"
    );

    console.log("\n" + "=".repeat(60));
    console.log("✅ All Tests Completed!");
    console.log("=".repeat(60) + "\n");

    console.log("🎯 What We Tested:\n");
    console.log("1. ✓ Basic conversation");
    console.log("2. ✓ Tool usage (competitor_analysis, market_sizing)");
    console.log("3. ✓ Complex multi-step request (write_todos)");
    console.log("4. ✓ Strategic synthesis\n");

    console.log("💡 Key Features:\n");
    console.log("• Agent has write_todos tool for planning");
    console.log("• Agent can break down complex tasks");
    console.log("• Agent updates todos as it works");
    console.log("• Todos are managed by the model, not our code\n");

    console.log("=".repeat(60) + "\n");
  } catch (error: any) {
    console.error(`❌ Fatal Error: ${error.message}`);
    console.error(error.stack);
  }
}

main().catch(console.error);
