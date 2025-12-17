/**
 * Startup Advisor Playground - Main Entry Point
 *
 * Run examples:
 *   npx tsx playground/index.ts 1    # Run example 1
 *   npx tsx playground/index.ts 2    # Run example 2
 *   npx tsx playground/index.ts 3    # Run example 3
 *   npx tsx playground/index.ts all  # Run all examples
 */

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
];

function printHelp() {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 Startup Advisor Playground");
  console.log("=".repeat(60) + "\n");

  console.log("Available examples:\n");
  examples.forEach((ex) => {
    console.log(`  ${ex.id}. ${ex.name}`);
    console.log(`     ${ex.description}`);
    console.log(`     Run: npx tsx playground/index.ts ${ex.id}\n`);
  });

  console.log("  all. Run All Examples");
  console.log("       Run: npx tsx playground/index.ts all\n");

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
    execSync(`npx tsx playground/${example.file}`, { stdio: "inherit" });
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
