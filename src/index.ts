/**
 * Startup Advisor Playground - Main Entry Point
 *
 * Run examples:
 *   pnpm run dev 1    # Run example 1
 *   pnpm run dev 2    # Run example 2
 *   pnpm run dev 7    # Run example 7 (Deep Agent)
 *   pnpm run dev all  # Run all examples
 */

// Load environment variables from .env file
import { config } from "dotenv";
config();

import { execSync } from "child_process";

const examples = [
  {
    id: "1",
    name: "Single Question",
    description: "Single question → Agent calls one tool",
    file: "examples/01-single-question.ts",
  },
  {
    id: "2",
    name: "Multi-Turn Chat",
    description: "Multiple questions → Agent maintains context",
    file: "examples/02-multi-turn-chat.ts",
  },
  {
    id: "3",
    name: "Full Conversation + VC Report",
    description: "Complete workflow with comprehensive report",
    file: "examples/03-full-conversation.ts",
  },
  {
    id: "4",
    name: "Context-Aware Conversation",
    description: "Advanced context management with working memory",
    file: "examples/04-with-context-management.ts",
  },
  {
    id: "5",
    name: "Todos Management",
    description: "Task tracking with YJ1 sorting algorithm",
    file: "examples/05-with-todos-management.ts",
  },
  {
    id: "6",
    name: "SubAgent Basic",
    description: "Generic, configurable SubAgent system",
    file: "examples/06-subagent-basic.ts",
  },
  {
    id: "7",
    name: "Deep Agent (Simple)",
    description: "DeepAgents without subagents",
    file: "examples/07-deep-agent-simple.ts",
  },
  {
    id: "8",
    name: "Deep Agent (Full)",
    description: "DeepAgents with subagents",
    file: "examples/08-deep-agent.ts",
  },
  {
    id: "9",
    name: "Deep Agent (Manual)",
    description: "Manual deep agent assembly with middleware",
    file: "examples/09-manual-deep-agent.ts",
  },
];

function printHelp() {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 Startup Advisor Playground");
  console.log("=".repeat(60) + "\n");

  console.log("Available examples:\n");
  examples.forEach((ex) => {
    console.log(`  ${ex.id}. ${ex.name}`);
    console.log(`     ${ex.description}`);
    console.log(`     Run: pnpm run dev ${ex.id}\n`);
  });

  console.log("  all. Run All Examples");
  console.log("       Run: pnpm run dev all\n");

  console.log("=".repeat(60) + "\n");
}

function runExample(id: string) {
  const example = examples.find((ex) => ex.id === id);
  if (!example) {
    console.error(`❌ Example ${id} not found`);
    printHelp();
    process.exit(1);
  }

  console.log(`\n▶️  Running: ${example.name}...\n`);
  try {
    execSync(`npx tsx src/${example.file}`, { stdio: "inherit" });
  } catch (error) {
    console.error(`\n❌ Example ${id} failed:`, error);
    process.exit(1);
  }
}

function runAllExamples() {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 Running all examples...");
  console.log("=".repeat(60) + "\n");

  for (const example of examples) {
    runExample(example.id);
    console.log("\n");
  }

  console.log("=".repeat(60));
  console.log("✅ All examples completed!");
  console.log("=".repeat(60) + "\n");
}

// Main
const arg = process.argv[2];

if (!arg) {
  printHelp();
} else if (arg === "all") {
  runAllExamples();
} else {
  runExample(arg);
}
