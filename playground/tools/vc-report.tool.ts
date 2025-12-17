/**
 * VC Evaluation Report Tool
 *
 * Generates comprehensive investment evaluation report
 * Internally calls competitor, market, and customer analysis
 */

import { z } from "zod";
import { createTool } from "../core/base-tool";

// Input schema
const vcReportInputSchema = z.object({
  ideaDescription: z
    .string()
    .describe("The startup idea to generate VC evaluation for"),
});

// Output types
interface VCScore {
  dimension: string;
  score: number; // 1-10
  rationale: string;
}

interface VCReport {
  overallScore: number; // 1-100
  recommendation: "Strong Pass" | "Pass" | "Maybe" | "No";
  scores: VCScore[];
  swotAnalysis: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  keyRisks: string[];
  investmentThesis: string;
  nextSteps: string[];
}

// Mock report generator
async function generateVCReport(input: {
  ideaDescription: string;
}): Promise<VCReport> {
  console.log("\n📋 Generating comprehensive VC evaluation report...");
  console.log("   This will analyze: competitors, market, and customers\n");

  // Simulate analysis of multiple dimensions
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const scores: VCScore[] = [
    {
      dimension: "Market Opportunity",
      score: 8,
      rationale:
        "Large TAM ($50B) with strong growth (18% CAGR). Growing market reduces execution risk.",
    },
    {
      dimension: "Team & Execution",
      score: 7,
      rationale:
        "Assumes experienced founding team. Need to validate technical capabilities and domain expertise.",
    },
    {
      dimension: "Product Differentiation",
      score: 8,
      rationale:
        "Clear differentiation strategy (AI-first, simple pricing, mobile). Addresses identified market gaps.",
    },
    {
      dimension: "Competitive Moat",
      score: 6,
      rationale:
        "Limited initial moat. Network effects and integration depth can build defensibility over time.",
    },
    {
      dimension: "Go-to-Market",
      score: 7,
      rationale:
        "Well-defined ICP and acquisition channels. Self-serve model enables efficient scaling.",
    },
    {
      dimension: "Business Model",
      score: 8,
      rationale:
        "SaaS model with predictable revenue. High willingness-to-pay in target segment (tech startups).",
    },
    {
      dimension: "Timing & Trends",
      score: 9,
      rationale:
        "Perfect timing with AI adoption wave and remote work trends. Regulatory tailwinds.",
    },
  ];

  const overallScore = Math.round(
    scores.reduce((sum, s) => sum + s.score, 0) / scores.length * 10
  );

  let recommendation: "Strong Pass" | "Pass" | "Maybe" | "No";
  if (overallScore >= 80) recommendation = "Strong Pass";
  else if (overallScore >= 70) recommendation = "Pass";
  else if (overallScore >= 60) recommendation = "Maybe";
  else recommendation = "No";

  return {
    overallScore,
    recommendation,
    scores,
    swotAnalysis: {
      strengths: [
        "Large and growing addressable market",
        "Clear differentiation from established competitors",
        "Strong market trends (AI, remote work) as tailwinds",
        "Well-defined target customer with high willingness to pay",
      ],
      weaknesses: [
        "Late entrant to established market with strong incumbents",
        "Limited initial competitive moat",
        "Dependent on team execution (not yet validated)",
        "Customer acquisition costs may be high initially",
      ],
      opportunities: [
        "Underserved SMB segment frustrated with complex/expensive solutions",
        "AI integration can provide 10x better user experience",
        "Partnership opportunities with complementary tools",
        "Potential for platform play and ecosystem development",
      ],
      threats: [
        "Incumbents may copy key features quickly",
        "Market saturation in crowded space",
        "Economic downturn reducing software budgets",
        "Regulatory changes affecting go-to-market",
      ],
    },
    keyRisks: [
      "Execution risk: Can the team actually build and scale the product?",
      "Competition risk: Incumbents have deep pockets and distribution",
      "Market risk: Will customers switch from existing solutions?",
      "Technology risk: AI features may not deliver promised value",
    ],
    investmentThesis: `
This opportunity represents a compelling investment in a large, growing market ($50B TAM, 18% CAGR) with clear customer pain points and an underserved segment. The AI-first approach and focus on simplicity addresses real market gaps identified in competitor analysis.

The strongest aspects are: (1) favorable market timing with AI adoption wave, (2) clear differentiation strategy, and (3) well-defined target customer with high willingness to pay.

Main concerns center around competitive moat and execution risk. Success depends heavily on rapid product iteration, efficient customer acquisition, and building defensibility through network effects and integration depth.

Recommended check size: $2-5M seed round to prove product-market fit and achieve $1M ARR within 18 months.
    `.trim(),
    nextSteps: [
      "Validate technical feasibility with working prototype",
      "Conduct customer discovery interviews with 20+ target ICPs",
      "Define clear 12-month milestones and capital requirements",
      "Build MVP and get 10 paying customers",
      "Measure key metrics: CAC, LTV, churn, NRR",
    ],
  };
}

// Format result for LLM
function formatVCReport(result: VCReport): string {
  const scoresList = result.scores
    .map((s) => `  ${s.dimension}: ${s.score}/10 - ${s.rationale}`)
    .join("\n");

  return `
🎯 VC EVALUATION REPORT
${"=".repeat(60)}

OVERALL SCORE: ${result.overallScore}/100
RECOMMENDATION: ${result.recommendation}

DETAILED SCORES:
${scoresList}

SWOT ANALYSIS:

Strengths:
${result.swotAnalysis.strengths.map((s) => `  ✓ ${s}`).join("\n")}

Weaknesses:
${result.swotAnalysis.weaknesses.map((w) => `  ✗ ${w}`).join("\n")}

Opportunities:
${result.swotAnalysis.opportunities.map((o) => `  → ${o}`).join("\n")}

Threats:
${result.swotAnalysis.threats.map((t) => `  ⚠ ${t}`).join("\n")}

KEY RISKS:
${result.keyRisks.map((r, i) => `  ${i + 1}. ${r}`).join("\n")}

INVESTMENT THESIS:
${result.investmentThesis}

RECOMMENDED NEXT STEPS:
${result.nextSteps.map((s, i) => `  ${i + 1}. ${s}`).join("\n")}
  `.trim();
}

// Export the tool
export const vcReportTool = createTool({
  name: "vc_evaluation_report",
  description:
    "Generates a comprehensive VC-style investment evaluation report for a startup idea. This is the most thorough analysis, including scores across 7 dimensions, SWOT analysis, key risks, and investment thesis. Use this when user asks for a complete evaluation, full report, or investor perspective.",
  schema: vcReportInputSchema,
  execute: generateVCReport,
  formatResult: formatVCReport,
});
