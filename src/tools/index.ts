/**
 * Tool Registry
 *
 * Central export for all available tools
 */

import { competitorTool } from "./competitor.tool";
import { marketTool } from "./market.tool";
import { customerTool } from "./customer.tool";
import { vcReportTool } from "./vc-report.tool";

// All available tools
export const allTools = [
  competitorTool,
  marketTool,
  customerTool,
  vcReportTool,
];

// Tool categories (for selective agent creation)
export const toolCategories = {
  analysis: [competitorTool, marketTool, customerTool],
  reporting: [vcReportTool],
  all: allTools,
};

// Export individual tools for direct use
export { competitorTool, marketTool, customerTool, vcReportTool };
