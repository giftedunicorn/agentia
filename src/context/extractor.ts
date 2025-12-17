/**
 * Context Extractor
 *
 * 从用户消息中提取结构化信息
 */

import type { IdeaContext } from "./types";

/**
 * 从用户消息中提取创业想法信息
 *
 * 使用简单的规则匹配（生产环境应该用 LLM）
 */
export function extractIdeaFromMessage(message: string): Partial<IdeaContext> | null {
  const lowerMessage = message.toLowerCase();

  // 检测是否在描述创业想法
  const ideaIndicators = [
    "我想做",
    "我要做",
    "我打算做",
    "建立一个",
    "创建一个",
    "开发一个",
    "i want to build",
    "i'm building",
    "i'm thinking about",
    "我在考虑",
  ];

  const hasIdeaIndicator = ideaIndicators.some((indicator) =>
    lowerMessage.includes(indicator)
  );

  if (!hasIdeaIndicator) {
    return null;
  }

  const extracted: Partial<IdeaContext> = {
    description: message, // 完整消息作为描述
  };

  // 提取类别（简单规则）
  const categoryKeywords = {
    "Developer Tools": ["代码", "开发", "code", "developer", "programming"],
    SaaS: ["saas", "平台", "platform", "software"],
    "E-commerce": ["电商", "电子商务", "ecommerce", "marketplace", "商城"],
    FinTech: ["金融", "支付", "fintech", "payment", "banking"],
    HealthTech: ["健康", "医疗", "health", "medical", "wellness"],
    EdTech: ["教育", "学习", "education", "learning", "training"],
    AI: ["ai", "人工智能", "机器学习", "machine learning", "智能"],
  };

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((keyword) => lowerMessage.includes(keyword))) {
      extracted.category = category;
      break;
    }
  }

  // 提取目标市场
  const marketKeywords = {
    "小团队": ["小团队", "small team", "startup"],
    企业: ["企业", "enterprise", "大公司"],
    个人开发者: ["个人", "开发者", "developer", "programmer"],
    SMB: ["smb", "中小企业", "small business"],
  };

  for (const [market, keywords] of Object.entries(marketKeywords)) {
    if (keywords.some((keyword) => lowerMessage.includes(keyword))) {
      extracted.targetMarket = market;
      break;
    }
  }

  return extracted;
}

/**
 * 从用户消息中提取用户关注点
 */
export function extractUserConcerns(message: string): string[] {
  const lowerMessage = message.toLowerCase();
  const concerns: string[] = [];

  // 定价相关
  if (
    lowerMessage.includes("定价") ||
    lowerMessage.includes("价格") ||
    lowerMessage.includes("pricing") ||
    lowerMessage.includes("cost")
  ) {
    concerns.push("pricing");
  }

  // 竞争相关
  if (
    lowerMessage.includes("竞对") ||
    lowerMessage.includes("竞争") ||
    lowerMessage.includes("competitor") ||
    lowerMessage.includes("competition")
  ) {
    concerns.push("competition");
  }

  // 市场相关
  if (
    lowerMessage.includes("市场") ||
    lowerMessage.includes("market") ||
    lowerMessage.includes("opportunity")
  ) {
    concerns.push("market");
  }

  // 客户相关
  if (
    lowerMessage.includes("客户") ||
    lowerMessage.includes("用户") ||
    lowerMessage.includes("customer") ||
    lowerMessage.includes("user")
  ) {
    concerns.push("customer");
  }

  // 差异化相关
  if (
    lowerMessage.includes("差异化") ||
    lowerMessage.includes("differentiat") ||
    lowerMessage.includes("unique") ||
    lowerMessage.includes("优势")
  ) {
    concerns.push("differentiation");
  }

  // 风险相关
  if (
    lowerMessage.includes("风险") ||
    lowerMessage.includes("risk") ||
    lowerMessage.includes("challenge") ||
    lowerMessage.includes("挑战")
  ) {
    concerns.push("risks");
  }

  return concerns;
}

/**
 * 检测用户意图
 */
export function detectUserIntent(
  message: string
): "ask_competitor" | "ask_market" | "ask_customer" | "ask_report" | "general" {
  const lowerMessage = message.toLowerCase();

  // 检测是否询问竞对
  if (
    lowerMessage.includes("竞对") ||
    lowerMessage.includes("竞争对手") ||
    lowerMessage.includes("competitor")
  ) {
    return "ask_competitor";
  }

  // 检测是否询问市场
  if (
    lowerMessage.includes("市场") ||
    lowerMessage.includes("market size") ||
    lowerMessage.includes("tam") ||
    lowerMessage.includes("机会")
  ) {
    return "ask_market";
  }

  // 检测是否询问客户
  if (
    lowerMessage.includes("客户") ||
    lowerMessage.includes("用户画像") ||
    lowerMessage.includes("customer") ||
    lowerMessage.includes("target audience")
  ) {
    return "ask_customer";
  }

  // 检测是否要完整报告
  if (
    lowerMessage.includes("完整报告") ||
    lowerMessage.includes("评估报告") ||
    lowerMessage.includes("vc") ||
    lowerMessage.includes("full report") ||
    lowerMessage.includes("comprehensive")
  ) {
    return "ask_report";
  }

  return "general";
}
