/**
 * Context Management Module
 *
 * Export all context management components
 */

export { MemoryManager } from "./memory";
export { ContextAwareAgent } from "./context-aware-agent";
export {
  extractIdeaFromMessage,
  extractUserConcerns,
  detectUserIntent,
} from "./extractor";
export type {
  ConversationContext,
  WorkingMemory,
  IdeaContext,
  AnalysisCache,
} from "./types";
