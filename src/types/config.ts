export interface SiteConfig {
  id: string;
  name: string;
  webflowSiteId: string;
  webflowApiToken?: string;
  stagingDomain: string;
  productionDomain: string;
  linearTeamId: string;
  triggerStatus: string;
  statusMap: StatusMap;
  mode: "human-review" | "auto-publish";
  allowedTicketTypes: TicketType[];
  maxRetries: number;
  testing: TestingConfig;
  maxCostPerRun: number;
}

export interface StatusMap {
  inProgress: string;
  needsInfo: string;
  review: string;
  done: string;
  blocked: string;
}

export interface TestingConfig {
  baseUrl: string;
  visualRegressionThreshold: number;
  timeout: number;
}

export type TicketType = "cms-content" | "page-content" | "design-styling" | "ghl-workflow";

export interface AgentConfig {
  model: string;
  maxConcurrentRuns?: number;
  staleRunTimeoutMinutes?: number;
  maxRetries: number;
  publishBatchingWindowMs?: number;
}
