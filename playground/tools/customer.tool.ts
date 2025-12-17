/**
 * Customer Analysis Tool
 *
 * Analyzes customer segments and ideal customer profile
 * Returns mock data for quick experimentation
 */

import { z } from "zod";
import { createTool } from "../core/base-tool";

// Input schema
const customerInputSchema = z.object({
  ideaDescription: z
    .string()
    .describe("The startup idea to analyze customers for"),
});

// Output types
interface CustomerSegment {
  name: string;
  size: string;
  characteristics: string[];
  painPoints: string[];
  willingnessToPay: "High" | "Medium" | "Low";
}

interface ICP {
  title: string;
  companySize: string;
  industry: string[];
  budget: string;
  keyNeeds: string[];
}

interface CustomerAnalysis {
  segments: CustomerSegment[];
  icp: ICP;
  buyingProcess: string;
  acquisitionChannels: string[];
  retentionFactors: string[];
}

// Mock data generator
async function analyzeCustomers(input: {
  ideaDescription: string;
}): Promise<CustomerAnalysis> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 750));

  return {
    segments: [
      {
        name: "Tech Startups",
        size: "~50K companies in target markets",
        characteristics: [
          "Fast-paced environment",
          "Tech-savvy users",
          "Limited budget but willing to pay for ROI",
          "Early adopters of new tools",
        ],
        painPoints: [
          "Need to move fast with limited resources",
          "Existing tools too complex or expensive",
          "Integration challenges with modern stack",
          "Lack of automation",
        ],
        willingnessToPay: "High",
      },
      {
        name: "Digital Agencies",
        size: "~100K agencies globally",
        characteristics: [
          "Manage multiple clients",
          "Need efficient workflows",
          "Value white-label options",
          "Budget-conscious",
        ],
        painPoints: [
          "Manual processes waste billable time",
          "Difficult to scale operations",
          "Client reporting is time-consuming",
          "Tool fragmentation",
        ],
        willingnessToPay: "Medium",
      },
      {
        name: "SMB Enterprises",
        size: "~500K companies (10-200 employees)",
        characteristics: [
          "Growing but not enterprise-scale",
          "Limited IT resources",
          "Need simple, reliable solutions",
          "Price-sensitive",
        ],
        painPoints: [
          "Enterprise tools too expensive/complex",
          "Lack of technical expertise",
          "Need better efficiency",
          "Poor vendor support from big companies",
        ],
        willingnessToPay: "Low",
      },
    ],
    icp: {
      title: "Head of Product / CTO at tech startup",
      companySize: "15-50 employees",
      industry: ["SaaS", "E-commerce", "FinTech", "HealthTech"],
      budget: "$10K-50K annual software budget",
      keyNeeds: [
        "Fast implementation (< 1 week)",
        "Clear ROI within 3 months",
        "Integrations with modern stack",
        "Responsive support",
        "Simple pricing",
      ],
    },
    buyingProcess:
      "Self-serve trial → Team evaluation (1-2 weeks) → Decision by founder/CTO → Quick purchase via credit card",
    acquisitionChannels: [
      "Product Hunt launch",
      "Developer communities (Reddit, HackerNews, Dev.to)",
      "Content marketing (SEO-optimized guides)",
      "Partner integrations (listed in app marketplaces)",
      "LinkedIn ads targeting decision-makers",
    ],
    retentionFactors: [
      "Daily active usage and habit formation",
      "Integration depth (hard to switch once integrated)",
      "Team-wide adoption (network effects)",
      "Continuous value delivery (regular feature updates)",
      "Excellent customer success",
    ],
  };
}

// Format result for LLM
function formatCustomerResult(result: CustomerAnalysis): string {
  const segments = result.segments
    .map(
      (s, i) =>
        `${i + 1}. ${s.name} (${s.willingnessToPay} willingness to pay)\n   Size: ${s.size}\n   Top pain point: ${s.painPoints[0]}`
    )
    .join("\n\n");

  return `
👥 Customer Analysis Complete

Customer Segments:
${segments}

Ideal Customer Profile (ICP):
• Title: ${result.icp.title}
• Company Size: ${result.icp.companySize}
• Industries: ${result.icp.industry.join(", ")}
• Budget: ${result.icp.budget}

Buying Process:
${result.buyingProcess}

Recommended Acquisition Channels:
${result.acquisitionChannels.map((c) => `• ${c}`).join("\n")}

Key Retention Factors:
${result.retentionFactors.map((f) => `• ${f}`).join("\n")}
  `.trim();
}

// Export the tool
export const customerTool = createTool({
  name: "customer_analysis",
  description:
    "Analyzes customer segments and ideal customer profile for a startup idea. Use this when user asks about target customers, customer personas, ICP, or go-to-market strategy. Returns customer segments, pain points, and acquisition strategies.",
  schema: customerInputSchema,
  execute: analyzeCustomers,
  formatResult: formatCustomerResult,
});
