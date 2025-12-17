/**
 * Competitor Analysis Tool
 *
 * Analyzes competitors for a startup idea
 * Returns mock data for quick experimentation
 */

import { z } from "zod";
import { createTool } from "../core/base-tool";

// Input schema
const competitorInputSchema = z.object({
  ideaDescription: z
    .string()
    .describe("The startup idea to analyze competitors for"),
});

// Output types
interface Competitor {
  name: string;
  url: string;
  description: string;
  pricing: string;
  strengths: string[];
  weaknesses: string[];
  funding: string;
  marketPosition: string;
}

interface CompetitorAnalysis {
  competitors: Competitor[];
  marketMaturity: "Early" | "Growing" | "Mature" | "Saturated";
  marketGaps: string[];
  differentiationStrategy: string;
}

// Mock data generator
async function analyzeCompetitors(input: {
  ideaDescription: string;
}): Promise<CompetitorAnalysis> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  const mockCompetitors: Competitor[] = [
    {
      name: "MarketLeader Inc",
      url: "https://marketleader.com",
      description: "Established player with comprehensive features and enterprise focus",
      pricing: "$99-299/month",
      strengths: [
        "Strong brand recognition",
        "Extensive feature set",
        "Large customer base",
        "Robust integrations",
      ],
      weaknesses: [
        "Complex interface",
        "Expensive for startups",
        "Slow innovation cycle",
        "Poor customer support",
      ],
      funding: "$200M Series D",
      marketPosition: "Market Leader",
    },
    {
      name: "FastGrowth Co",
      url: "https://fastgrowth.io",
      description: "Modern alternative with focus on UX and developer experience",
      pricing: "$49-149/month",
      strengths: [
        "Intuitive UI/UX",
        "Developer-friendly API",
        "Fast product updates",
        "Active community",
      ],
      weaknesses: [
        "Limited enterprise features",
        "Smaller team",
        "Fewer integrations",
        "Regional limitations",
      ],
      funding: "$40M Series B",
      marketPosition: "Fast Follower",
    },
    {
      name: "BudgetOption",
      url: "https://budgetoption.app",
      description: "Affordable solution targeting SMBs and freelancers",
      pricing: "$19-59/month",
      strengths: [
        "Very affordable",
        "Simple to use",
        "No contracts",
        "Good for small teams",
      ],
      weaknesses: [
        "Limited features",
        "Basic support",
        "Lacks scalability",
        "Minimal customization",
      ],
      funding: "$5M Seed",
      marketPosition: "Budget Alternative",
    },
  ];

  return {
    competitors: mockCompetitors,
    marketMaturity: "Growing",
    marketGaps: [
      "Lack of AI-powered automation features",
      "Poor mobile experience across all competitors",
      "Complex pricing that confuses small businesses",
      "Limited integration with modern dev tools",
    ],
    differentiationStrategy:
      "Focus on AI-first approach, simple pricing, and exceptional mobile experience to capture the underserved SMB segment",
  };
}

// Format result for LLM
function formatCompetitorResult(result: CompetitorAnalysis): string {
  const competitorList = result.competitors
    .map(
      (c, i) =>
        `${i + 1}. ${c.name} (${c.marketPosition})\n   - ${c.description}\n   - Pricing: ${c.pricing}\n   - Key weakness: ${c.weaknesses[0]}`
    )
    .join("\n\n");

  return `
🔍 Competitor Analysis Complete

Found ${result.competitors.length} main competitors:

${competitorList}

Market Maturity: ${result.marketMaturity}

Key Market Gaps:
${result.marketGaps.map((gap) => `• ${gap}`).join("\n")}

Differentiation Strategy:
${result.differentiationStrategy}
  `.trim();
}

// Export the tool
export const competitorTool = createTool({
  name: "competitor_analysis",
  description:
    "Analyzes competitors for a startup idea. Use this when user asks about competitors, competitive landscape, or market positioning. Returns list of competitors with their strengths, weaknesses, and market gaps.",
  schema: competitorInputSchema,
  execute: analyzeCompetitors,
  formatResult: formatCompetitorResult,
});
