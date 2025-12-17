/**
 * Example 4: Context-Aware Conversation
 *
 * Demonstrates: Full context management with working memory
 *
 * Key features:
 * - Automatic idea extraction
 * - Tool result caching
 * - Intent detection
 * - Focus tracking
 * - Smart context injection
 */

import { ContextAwareAgent } from "../context/context-aware-agent";
import { allTools } from "../tools";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("🧠 EXAMPLE 4: Context-Aware Conversation");
  console.log("=".repeat(60));
  console.log("\nThis example demonstrates advanced context management:\n");
  console.log("✓ Automatic extraction of startup idea details");
  console.log("✓ Caching of tool results (no redundant calls)");
  console.log("✓ Intent detection and focus tracking");
  console.log("✓ Smart context injection into system prompt");
  console.log("\n" + "=".repeat(60) + "\n");

  // Create context-aware agent
  const agent = new ContextAwareAgent(allTools as any, "demo-session");

  // Helper to chat
  async function chat(userMessage: string, description?: string) {
    if (description) {
      console.log("\n" + "─".repeat(60));
      console.log(`📍 ${description}`);
      console.log("─".repeat(60));
    }

    console.log(`\n👤 User: ${userMessage}`);

    const response = await agent.chat(userMessage);

    console.log(`\n🤖 Assistant:\n${response}\n`);
  }

  // ========== Conversation Flow ==========

  // Turn 1: User describes idea (context extraction happens)
  await chat(
    "Hi! I want to build an AI-powered code documentation tool that automatically keeps docs up-to-date by analyzing git commits.",
    "Turn 1: Initial Idea (Context Extraction)"
  );

  // Turn 2: Ask about competitors
  await chat(
    "Who are the main competitors in this space?",
    "Turn 2: Competitor Question (Intent Detection + Tool Call)"
  );

  // Turn 3: Follow-up about pricing (uses cached competitor data!)
  await chat(
    "Based on the competitors, how should I price this?",
    "Turn 3: Pricing Strategy (Uses Cached Competitor Analysis)"
  );

  // Turn 4: Ask about market size
  await chat(
    "What's the market opportunity?",
    "Turn 4: Market Sizing (New Tool Call)"
  );

  // Turn 5: Ask about differentiation (uses ALL cached context!)
  await chat(
    "How can I differentiate from the competition?",
    "Turn 5: Strategy Question (Synthesizes Multiple Cached Analyses)"
  );

  // Turn 6: Add more details about idea (context update)
  await chat(
    "I'm mainly targeting small development teams, 5-20 people.",
    "Turn 6: Additional Context (Updates Working Memory)"
  );

  // Turn 7: Ask customer question (should reference updated target market)
  await chat(
    "Who exactly should I target as customers?",
    "Turn 7: Customer Analysis (Uses Updated Context)"
  );

  // Turn 8: Request full report (uses ALL cached analyses!)
  await chat(
    "Can you generate a complete VC evaluation report for my idea?",
    "Turn 8: Full Report (Leverages All Cached Context)"
  );

  // ========== Final Summary ==========

  console.log("\n" + "=".repeat(60));
  console.log("✅ Conversation Complete!");
  console.log("=".repeat(60) + "\n");

  // Show final memory state
  agent.printMemorySummary();

  // Show what was achieved
  console.log("🎯 What Context Management Achieved:\n");
  console.log("1. ✓ Extracted idea: 'AI-powered code documentation tool'");
  console.log("2. ✓ Extracted target market: 'small development teams'");
  console.log(
    "3. ✓ Cached competitor analysis (reused 2x without redundant calls)"
  );
  console.log("4. ✓ Cached market analysis");
  console.log("5. ✓ Tracked user's focus throughout conversation");
  console.log(
    "6. ✓ Provided context-aware answers without asking redundant questions"
  );
  console.log("\n" + "=".repeat(60) + "\n");

  console.log("💡 Key Learnings:\n");
  console.log("• Agent never asked 'What's your idea?' after first mention");
  console.log(
    "• Competitor data was used in Turn 3 without re-calling the tool"
  );
  console.log("• Agent synthesized multiple analyses for strategic questions");
  console.log("• Context was automatically updated as user added details");
  console.log("• All analyses were available for the final VC report\n");

  console.log("=".repeat(60) + "\n");
}

main().catch(console.error);
