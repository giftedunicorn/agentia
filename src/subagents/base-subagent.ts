/**
 * BaseSubAgent - 通用的、可配置的 SubAgent
 *
 * 设计理念：
 * - 不预定义固定类型，完全由配置驱动
 * - 任何任务都可以 new BaseSubAgent({ config }) 来创建
 * - 支持任务隔离或上下文共享
 * - 提供统一的执行接口
 */

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createAgent } from "langchain";
import { MemoryManager } from "../context/memory";
import type {
  SubAgentConfig,
  SubAgentTask,
  SubAgentResult,
  SubAgentExecuteOptions,
} from "./types";

export class BaseSubAgent {
  private config: SubAgentConfig;
  private agent: any; // LangChain Agent
  private memory: MemoryManager;
  private initialized: boolean = false;

  constructor(config: SubAgentConfig) {
    this.config = config;

    // 初始化 Memory
    if (config.isolatedMemory) {
      // 创建独立的 Memory（任务隔离）
      this.memory = new MemoryManager(`subagent-${config.name}`);
      console.log(`📦 [${config.name}] Using isolated memory`);
    } else if (config.sharedMemory) {
      // 使用共享的 Memory（访问 Main Agent 的上下文）
      this.memory = config.sharedMemory;
      console.log(`🔗 [${config.name}] Using shared memory`);
    } else {
      // 默认创建独立 Memory
      this.memory = new MemoryManager(`subagent-${config.name}`);
      console.log(`📦 [${config.name}] Using default isolated memory`);
    }
  }

  /**
   * 初始化 SubAgent
   * 创建 LangChain Agent 实例
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log(`\n🚀 [${this.config.name}] Initializing SubAgent...`);
    console.log(`   Description: ${this.config.description}`);
    console.log(`   Tools: ${this.config.tools.map((t) => t.name).join(", ")}`);

    try {
      // 创建 LLM
      const llm = this.createLLM();

      // 创建 Agent
      this.agent = createAgent({
        model: llm,
        tools: this.config.tools,
        systemPrompt: this.config.systemPrompt,
      });

      this.initialized = true;
      console.log(`✅ [${this.config.name}] SubAgent initialized\n`);
    } catch (error) {
      console.error(`❌ [${this.config.name}] Initialization failed:`, error);
      throw error;
    }
  }

  /**
   * 执行任务
   * @param prompt 任务提示词
   * @param options 执行选项
   * @returns SubAgentResult
   */
  async execute(
    prompt: string,
    options?: SubAgentExecuteOptions
  ): Promise<SubAgentResult> {
    // 确保已初始化
    if (!this.initialized) {
      await this.initialize();
    }

    const taskId = this.generateTaskId();
    const startTime = Date.now();

    console.log(`\n🎯 [${this.config.name}] Starting task ${taskId}`);
    console.log(`   Prompt: ${prompt.substring(0, 100)}${prompt.length > 100 ? "..." : ""}`);

    // 进度回调
    options?.onProgress?.(`[${this.config.name}] Task started`);

    try {
      // 执行 Agent（systemPrompt 已在 createAgent 时设置）
      const result = await this.executeWithTimeout(prompt, options?.timeout);

      const duration = Date.now() - startTime;

      const agentResult: SubAgentResult = {
        taskId,
        agentName: this.config.name,
        success: true,
        data: result.output || result,
        duration,
        metadata: {
          steps: result.steps?.length || 0,
          toolsCalled: this.extractToolsCalled(result),
        },
      };

      console.log(`✅ [${this.config.name}] Task ${taskId} completed in ${duration}ms`);
      options?.onComplete?.(agentResult);

      return agentResult;
    } catch (error: any) {
      const duration = Date.now() - startTime;

      const agentResult: SubAgentResult = {
        taskId,
        agentName: this.config.name,
        success: false,
        error: error.message,
        duration,
      };

      console.error(
        `❌ [${this.config.name}] Task ${taskId} failed after ${duration}ms:`,
        error.message
      );
      options?.onError?.(error);

      return agentResult;
    }
  }

  /**
   * 批量执行多个任务（顺序执行）
   */
  async executeBatch(prompts: string[]): Promise<SubAgentResult[]> {
    console.log(`\n📚 [${this.config.name}] Executing ${prompts.length} tasks sequentially`);

    const results: SubAgentResult[] = [];

    for (let i = 0; i < prompts.length; i++) {
      console.log(`\n   Task ${i + 1}/${prompts.length}`);
      const result = await this.execute(prompts[i]);
      results.push(result);
    }

    return results;
  }

  /**
   * 创建 LLM 实例
   */
  private createLLM() {
    const config = this.config.llmConfig || {};

    return new ChatGoogleGenerativeAI({
      model: config.model || "gemini-2.0-flash-exp",
      temperature: config.temperature ?? 0.7,
      maxOutputTokens: config.maxTokens,
      apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
    });
  }

  /**
   * 带超时的执行
   */
  private async executeWithTimeout(
    prompt: string,
    timeout: number = 120000
  ): Promise<any> {
    return Promise.race([
      this.agent.invoke({ input: prompt }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Task timeout")), timeout)
      ),
    ]);
  }

  /**
   * 提取调用的工具列表
   */
  private extractToolsCalled(result: any): string[] {
    if (!result.steps) return [];

    const tools = new Set<string>();
    for (const step of result.steps) {
      if (step.action?.tool) {
        tools.add(step.action.tool);
      }
    }

    return Array.from(tools);
  }

  /**
   * 生成任务 ID
   */
  private generateTaskId(): string {
    return `${this.config.name}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * 获取 SubAgent 配置
   */
  getConfig(): SubAgentConfig {
    return { ...this.config };
  }

  /**
   * 获取 SubAgent 名称
   */
  getName(): string {
    return this.config.name;
  }

  /**
   * 获取 SubAgent 描述
   */
  getDescription(): string {
    return this.config.description;
  }

  /**
   * 获取 Memory
   */
  getMemory(): MemoryManager {
    return this.memory;
  }

  /**
   * 是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}
