import { logger } from "../../shared/logger.js";

/**
 * GoHighLevel API client.
 * Stub for Phase 3 — will be implemented when GHL APIs are available.
 */
export class GHLClient {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GHL_API_KEY || "";
    if (!this.apiKey) {
      logger.warn("No GHL API key configured");
    }
  }

  async getWorkflow(workflowId: string): Promise<unknown> {
    throw new Error("GHL API client not yet implemented (Phase 3)");
  }

  async updateWorkflow(workflowId: string, data: unknown): Promise<unknown> {
    throw new Error("GHL API client not yet implemented (Phase 3)");
  }

  async listWorkflows(): Promise<unknown[]> {
    throw new Error("GHL API client not yet implemented (Phase 3)");
  }
}
