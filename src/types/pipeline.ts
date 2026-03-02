import type { TicketType } from "./config.js";

export type Platform = "webflow" | "ghl" | "both" | "unclear";

export type PipelineStage =
  | "pending"
  | "classifying"
  | "routing"
  | "analyzing"
  | "generating-tests"
  | "red-test"
  | "executing"
  | "publishing"
  | "green-test"
  | "reporting"
  | "finalizing"
  | "completed"
  | "blocked"
  | "needs-info"
  | "failed";

export type PipelineStatus = "queued" | "running" | "paused" | "completed" | "failed";

export interface PipelineRun {
  id: string;
  issueId: string;
  siteId: string;
  platform: Platform;
  status: PipelineStatus;
  currentStage: PipelineStage;
  completedStages: PipelineStage[];
  ticketAnalysis?: TicketAnalysis;
  changePlan?: ChangePlan;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  cost: RunCost;
}

export interface TicketAnalysis {
  issueId: string;
  title: string;
  description: string;
  platform: Platform;
  ticketType: TicketType;
  confidence: number;
  requirements: string[];
  targetResources: TargetResource[];
  ambiguities: string[];
  reasoning: string;
}

export interface TargetResource {
  type: "collection" | "collection-item" | "page" | "page-element" | "workflow" | "funnel";
  id?: string;
  name: string;
  action: "create" | "update" | "delete";
}

export interface ChangePlan {
  steps: ChangeStep[];
  estimatedApiCalls: number;
  reasoning: string;
}

export interface ChangeStep {
  order: number;
  description: string;
  apiCall: string;
  params: Record<string, unknown>;
  rollbackAction?: string;
}

export interface RunCost {
  runId: string;
  issueId: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  apiCalls: number;
  breakdown: { stage: string; tokens: number; cost: number }[];
}
