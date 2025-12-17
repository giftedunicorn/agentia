/**
 * Example 3: Full Conversation with VC Report
 *
 * Demonstrates: Complete workflow from initial consultation to full VC evaluation
 *
 * Scenario: Entrepreneur gets advice, asks specific questions,
 *           then requests comprehensive VC evaluation report
 */

import { HumanMessage } from "@langchain/core/messages";
import { createStartupAdvisor } from "../core/startup-advisor";
import { allTools } from "../tools";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("🎯 EXAMPLE 3: Full Consultation → VC Report");
  console.log("=".repeat(60) + "\n");

  // Create the agent
  const agent = createStartupAdvisor(allTools as any);

  // Conversation state
  let conversationState = {
    messages: [] as any[],
  };

  // Helper to chat with agent
  async function chat(userMessage: string, description?: string) {
    if (description) {
      console.log("\n" + "─".repeat(60));
      console.log(`📍 ${description}`);
      console.log("─".repeat(60));
    }

    console.log("\n👤 User:");
    console.log(`   ${userMessage}\n`);

    // Add user message and invoke
    conversationState.messages.push(new HumanMessage(userMessage));
    const result = await agent.invoke(conversationState);
    conversationState = result;

    // Show agent response
    const finalMessage = result.messages[result.messages.length - 1];
    console.log("🤖 Assistant:");
    console.log(`   ${finalMessage.content}`);
  }

  // Turn 1: Initial pitch
  await chat(
    "Hi! I'm thinking about building a SaaS platform that uses AI to automatically generate and maintain technical documentation from code. Developers just connect their GitHub repo and the system keeps docs always up-to-date. What do you think?",
    "Initial Pitch"
  );

  // Turn 2: Ask about competitors
  await chat(
    "That's helpful context. Can you tell me who the main competitors are?",
    "Competitive Analysis"
  );

  // Turn 3: Ask about market opportunity
  await chat(
    "Interesting. What about the market size? Is this a big enough opportunity?",
    "Market Sizing"
  );

  // Turn 4: Request full VC report
  await chat(
    "This is great! I'd like to see a complete VC evaluation report now. Can you generate that for me?",
    "Comprehensive VC Evaluation"
  );

  // Turn 5: Follow-up question
  await chat(
    "Based on this report, what should be my top priority in the next 3 months?",
    "Strategic Advice"
  );

  console.log("\n" + "=".repeat(60));
  console.log("✅ Full conversation complete!");
  console.log(
    `📊 Total messages exchanged: ${conversationState.messages.length}`
  );
  console.log("\n💡 Key learnings:");
  console.log("   - Agent maintains context across entire conversation");
  console.log("   - Tools are called automatically based on user questions");
  console.log("   - VC report provides comprehensive analysis when requested");
  console.log(
    "   - Agent can synthesize insights and provide strategic advice"
  );
  console.log("=".repeat(60) + "\n");
}

main().catch(console.error);
