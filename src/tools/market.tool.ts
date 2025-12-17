/**
 * Market Sizing Tool
 *
 * Estimates market size (TAM/SAM/SOM) for a startup idea
 * Returns mock data for quick experimentation
 */

import { z } from "zod";
import { createTool } from "../core/base-tool";

// Input schema
const marketInputSchema = z.object({
  ideaDescription: z
    .string()
    .describe("The startup idea to estimate market size for"),
});

// Output types
interface MarketSize {
  tam: string; // Total Addressable Market
  sam: string; // Serviceable Addressable Market
  som: string; // Serviceable Obtainable Market
}

interface MarketTrend {
  name: string;
  impact: "High" | "Medium" | "Low";
  description: string;
}

interface MarketAnalysis {
  marketSize: MarketSize;
  growthRate: string;
  trends: MarketTrend[];
  targetSegment: string;
  timeToMarket: string;
}

// Mock data generator
async function estimateMarketSize(input: {
  ideaDescription: string;
}): Promise<MarketAnalysis> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 700));

  return {
    marketSize: {
      tam: "$50B", // Total market globally
      sam: "$8B", // Market you can realistically reach
      som: "$500M", // Market you can capture in 3-5 years
    },
    growthRate: "18% CAGR (2024-2029)",
    trends: [
      {
        name: "AI Integration",
        impact: "High",
        description:
          "Rapid adoption of AI-powered features across all software categories",
      },
      {
        name: "Remote Work",
        impact: "High",
        description:
          "Continued growth in distributed teams driving demand for collaboration tools",
      },
      {
        name: "No-Code Movement",
        impact: "Medium",
        description:
          "Growing preference for solutions that don't require technical expertise",
      },
      {
        name: "Privacy Regulations",
        impact: "Medium",
        description:
          "Increasing compliance requirements (GDPR, CCPA) affecting product design",
      },
    ],
    targetSegment:
      "SMBs (10-200 employees) in technology, professional services, and creative industries",
    timeToMarket:
      "6-9 months for MVP, 12-18 months for product-market fit",
  };
}

// Format result for LLM
function formatMarketResult(result: MarketAnalysis): string {
  const trends = result.trends
    .map((t) => `• ${t.name} (${t.impact} impact): ${t.description}`)
    .join("\n");

  return `
📊 Market Size Estimation

Market Opportunity:
• TAM (Total Addressable Market): ${result.marketSize.tam}
• SAM (Serviceable Addressable Market): ${result.marketSize.sam}
• SOM (Serviceable Obtainable Market): ${result.marketSize.som}

Growth Rate: ${result.growthRate}

Key Market Trends:
${trends}

Target Segment: ${result.targetSegment}

Time to Market: ${result.timeToMarket}
  `.trim();
}

// Export the tool
export const marketTool = createTool({
  name: "market_sizing",
  description:
    "Estimates market size and analyzes market trends for a startup idea. Use this when user asks about market size, TAM/SAM/SOM, market opportunity, or growth potential. Returns market size estimates, growth rates, and key trends.",
  schema: marketInputSchema,
  execute: estimateMarketSize,
  formatResult: formatMarketResult,
});
