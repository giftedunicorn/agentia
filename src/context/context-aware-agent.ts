/**
 * Context-Aware Startup Advisor
 *
 * Agent with full context management capabilities
 */

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createAgent } from "langchain";
import type { DynamicStructuredTool } from "@langchain/core/tools";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { MemoryManager } from "./memory";
import {
  extractIdeaFromMessage,
  extractUserConcerns,
  detectUserIntent,
} from "./extractor";

/**
 * Context-aware agent that maintains working memory
 */
export class ContextAwareAgent {
  private agent: any;
  private memory: MemoryManager;
  private tools: DynamicStructuredTool<any>[];
  private messageHistory: any[] = [];

  constructor(
    tools: DynamicStructuredTool<any>[],
    sessionId?: string,
    llm?: ChatGoogleGenerativeAI
  ) {
    this.tools = tools;
    this.memory = new MemoryManager(sessionId);

    // Create LLM
    const model =
      llm ||
      new ChatGoogleGenerativeAI({
        model: "gemini-3-pro-preview",
        apiKey: process.env.GEMINI_API_KEY,
        temperature: 0.7,
      });

    // Create agent (will update system prompt dynamically)
    this.agent = createAgent({
      model,
      tools,
      systemPrompt: this.buildSystemPrompt(),
    });
  }

  /**
   * Build dynamic system prompt with context
   */
  private buildSystemPrompt(): string {
    const basePrompt = `You are a helpful and insightful startup advisor AI.

Your role is to help entrepreneurs evaluate their startup ideas by:
1. Understanding their idea and extracting key details
2. Analyzing competitors, market size, and target customers
3. Providing honest, actionable feedback
4. Generating comprehensive investment evaluation reports when requested

Guidelines:
- Be friendly and encouraging, but also realistic about challenges
- Use tools when the user asks specific questions
- **IMPORTANT**: Use the CONTEXT below to avoid asking redundant questions
- Synthesize insights from multiple analyses
- Provide your expert perspective, not just tool outputs

Available tools:
- competitor_analysis: Analyzes competitors and competitive landscape
- market_sizing: Estimates market size (TAM/SAM/SOM) and trends
- customer_analysis: Identifies target customers and acquisition strategies
- vc_evaluation_report: Generates comprehensive VC-style investment report
`;

    // Add dynamic context
    const contextSummary = this.memory.buildContextSummary();

    return basePrompt + contextSummary;
  }

  /**
   * Process user message with context extraction
   */
  async chat(userMessage: string): Promise<string> {
    console.log("\n" + "=".repeat(60));
    console.log("💭 Processing user message with context awareness...");
    console.log("=".repeat(60));

    // 1. Extract context from user message
    this.extractContext(userMessage);

    // 2. Detect intent
    const intent = detectUserIntent(userMessage);
    console.log(`🎯 Detected intent: ${intent}`);

    // 3. Update focus based on intent
    if (intent === "ask_competitor") this.memory.setFocus("competitor");
    else if (intent === "ask_market") this.memory.setFocus("market");
    else if (intent === "ask_customer") this.memory.setFocus("customer");

    // 4. Check cache before calling tools
    this.checkCacheAndAdvise(intent);

    // 5. Add to message history
    this.messageHistory.push(new HumanMessage(userMessage));

    // 6. Recreate agent with updated context
    const model = new ChatGoogleGenerativeAI({
      model: "gemini-3-pro-preview",
      apiKey: process.env.GEMINI_API_KEY,
      temperature: 0.7,
    });

    this.agent = createAgent({
      model,
      tools: this.tools,
      systemPrompt: this.buildSystemPrompt(),
    });

    // 7. Invoke agent
    const result = await this.agent.invoke({
      messages: this.messageHistory,
    });

    // 8. Extract response
    const messages = result.messages || [];
    const lastMessage = messages[messages.length - 1];
    const response = lastMessage.content;

    // 9. Update message history with all new messages
    this.messageHistory = messages;

    // 10. Cache tool results if any
    this.cacheToolResults(messages);

    console.log("\n📊 Current memory state:");
    console.log(this.memory.getSummary());

    return response;
  }

  /**
   * Extract context from user message
   */
  private extractContext(message: string): void {
    // Extract idea information
    const ideaInfo = extractIdeaFromMessage(message);
    if (ideaInfo) {
      console.log("💡 Extracted idea info:", ideaInfo);
      this.memory.updateIdea(ideaInfo);
    }

    // Extract user concerns
    const concerns = extractUserConcerns(message);
    if (concerns.length > 0) {
      console.log("⚠️  Detected concerns:", concerns);
      concerns.forEach((concern) => this.memory.addUserConcern(concern));
    }
  }

  /**
   * Check cache and advise if tool call is unnecessary
   */
  private checkCacheAndAdvise(
    intent: ReturnType<typeof detectUserIntent>
  ): void {
    const cacheMap = {
      ask_competitor: "competitor",
      ask_market: "market",
      ask_customer: "customer",
      ask_report: "vcReport",
    } as const;

    const cacheKey = cacheMap[intent as keyof typeof cacheMap];
    if (!cacheKey) return;

    const cached = this.memory.getCachedAnalysis(cacheKey);
    if (cached) {
      console.log(
        `✅ Found cached ${cacheKey} analysis (will be used if needed)`
      );
    }
  }

  /**
   * Cache tool results from messages
   */
  private cacheToolResults(messages: any[]): void {
    // Look for tool calls in messages
    for (const message of messages) {
      if (message.tool_calls && message.tool_calls.length > 0) {
        for (const toolCall of message.tool_calls) {
          const toolName = toolCall.name;

          // Find corresponding tool result
          const resultMessage = messages.find(
            (m) => m.tool_call_id === toolCall.id
          );

          if (resultMessage) {
            const result = resultMessage.content;

            // Cache based on tool name
            if (toolName === "competitor_analysis") {
              this.memory.cacheAnalysis("competitor", result);
            } else if (toolName === "market_sizing") {
              this.memory.cacheAnalysis("market", result);
            } else if (toolName === "customer_analysis") {
              this.memory.cacheAnalysis("customer", result);
            } else if (toolName === "vc_evaluation_report") {
              this.memory.cacheAnalysis("vcReport", result);
            }
          }
        }
      }
    }
  }

  /**
   * Get memory manager (for debugging/inspection)
   */
  getMemory(): MemoryManager {
    return this.memory;
  }

  /**
   * Get message history
   */
  getMessageHistory(): any[] {
    return this.messageHistory;
  }

  /**
   * Print memory summary
   */
  printMemorySummary(): void {
    console.log("\n" + "=".repeat(60));
    console.log("📝 MEMORY SUMMARY");
    console.log("=".repeat(60));
    console.log(this.memory.getSummary());
    console.log("=".repeat(60) + "\n");
  }
}
