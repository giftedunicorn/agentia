/**
 * Simplified BaseTool for Playground
 *
 * Design: Ultra-simple tool wrapper with basic logging
 * - No complex context dependencies
 * - Pure function style
 * - Automatic error handling
 */

import type { DynamicStructuredTool } from "@langchain/core/tools";
import type { z } from "zod";
import { tool } from "langchain";

export interface SimpleTool<TInput, TOutput> {
  /** Tool name (shown to LLM) */
  name: string;

  /** Tool description (helps LLM decide when to use it) */
  description: string;

  /** Zod schema for input validation */
  schema: z.ZodType<TInput>;

  /** Core execution logic */
  execute: (input: TInput) => Promise<TOutput> | TOutput;

  /** Optional: format the result for LLM */
  formatResult?: (result: TOutput) => string;
}

/**
 * Create a tool with automatic logging and error handling
 */
export function createTool<TInput, TOutput>(
  config: SimpleTool<TInput, TOutput>
): DynamicStructuredTool<z.ZodType<TInput>> {
  const { name, description, schema, execute, formatResult } = config;

  return tool(
    async (input: TInput) => {
      const startTime = Date.now();

      try {
        console.log(`\n🔧 [${name}] INVOKED`);
        console.log(`   Input:`, JSON.stringify(input, null, 2));

        // Execute the tool
        const result = await execute(input);

        const duration = Date.now() - startTime;
        console.log(`✅ [${name}] DONE (${duration}ms)`);

        // Format result if formatter provided
        if (formatResult) {
          const formatted = formatResult(result);
          console.log(`   Result: ${formatted}`);
          return formatted;
        }

        // Otherwise return raw result as JSON
        return JSON.stringify(result, null, 2);
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`❌ [${name}] ERROR (${duration}ms)`);
        console.error(`   Error:`, error);

        return JSON.stringify({
          error: error instanceof Error ? error.message : "Unknown error",
          tool: name,
        });
      }
    },
    {
      name,
      description,
      schema,
    }
  );
}
