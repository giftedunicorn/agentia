/**
 * Startup Advisor Agent
 *
 * A conversational AI that helps evaluate startup ideas
 * Automatically selects the right tools based on user questions
 */

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createAgent } from "langchain";
import type { DynamicStructuredTool } from "@langchain/core/tools";

/**
 * System prompt that defines the agent's personality and behavior
 */
const SYSTEM_PROMPT = `You are a helpful and insightful startup advisor AI.

Your role is to help entrepreneurs evaluate their startup ideas by:
1. Asking clarifying questions to understand their idea
2. Analyzing competitors, market size, and target customers
3. Providing honest, actionable feedback
4. Generating comprehensive investment evaluation reports when requested

Guidelines:
- Be friendly and encouraging, but also realistic about challenges
- Use tools when the user asks specific questions (competitors, market size, customers, reports)
- Don't just list tool outputs - synthesize insights and provide your perspective
- Ask follow-up questions to better understand the idea
- When user asks for a "complete report" or "VC evaluation", use the vc_evaluation_report tool

Available tools:
- competitor_analysis: Analyzes competitors and competitive landscape
- market_sizing: Estimates market size (TAM/SAM/SOM) and trends
- customer_analysis: Identifies target customers and acquisition strategies
- vc_evaluation_report: Generates comprehensive VC-style investment report

Remember: Your goal is to help the entrepreneur succeed, not just to be positive.
`.trim();

/**
 * Create a startup advisor agent with the given tools
 *
 * @param tools - Array of LangChain tools to make available
 * @param llm - Optional LLM instance (defaults to GPT-4)
 * @returns AgentExecutor ready to handle conversations
 */
export function createStartupAdvisor(
  tools: DynamicStructuredTool<any>[],
  llm?: ChatGoogleGenerativeAI
) {
  // Use provided LLM or default to GPT-4
  const model =
    llm ||
    new ChatGoogleGenerativeAI({
      model: "gemini-3-pro-preview",
      apiKey: process.env.GEMINI_API_KEY,
    });

  // Create React agent with tools
  const agent = createAgent({
    model,
    tools,
    systemPrompt: SYSTEM_PROMPT,
  });

  return agent;
}

/**
 * Helper to format conversation history for multi-turn chat
 */
export function formatChatHistory(messages: any[]): string {
  return messages
    .map((msg: any) => {
      if (msg._getType() === "human") {
        return `User: ${msg.content}`;
      } else if (msg._getType() === "ai") {
        return `Assistant: ${msg.content}`;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}
