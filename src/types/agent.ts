import type { PipelineRun, PipelineStage, TicketAnalysis } from "./pipeline.js";
import type { SiteConfig, AgentConfig } from "./config.js";
import type { TestRunResult } from "./test-result.js";

export interface AgentContext {
  run: PipelineRun;
  siteConfig: SiteConfig;
  agentConfig: AgentConfig;
  knowledgeContext: string;
  linearComments: LinearComment[];
}

export interface LinearComment {
  id: string;
  body: string;
  userId: string;
  createdAt: string;
}

export interface AgentResult {
  success: boolean;
  stage: PipelineStage;
  data?: Record<string, unknown>;
  error?: string;
  testResults?: TestRunResult;
  needsInfo?: NeedsInfoRequest;
}

export interface NeedsInfoRequest {
  questions: string[];
  context: string;
}

export interface AgentToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface AgentToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface AgentToolResult {
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}
