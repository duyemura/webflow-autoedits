import { BaseAgent } from "../base-agent.js";
import type { AgentContext, AgentResult } from "../../types/index.js";
import type { AuditLogger } from "../../shared/audit/logger.js";

/**
 * GHL Agent — stub for Phase 3.
 * Will handle GoHighLevel workflow/automation changes.
 */
export class GHLAgent extends BaseAgent {
  constructor() {
    super("ghl");
  }

  protected async analyze(context: AgentContext, auditLog: AuditLogger): Promise<AgentResult> {
    return {
      success: false,
      stage: "analyzing",
      error: "GHL Agent not yet implemented (Phase 3). This ticket requires manual handling.",
    };
  }

  protected async generateTests(context: AgentContext, auditLog: AuditLogger): Promise<AgentResult> {
    return { success: false, stage: "generating-tests", error: "Not implemented" };
  }

  protected async runRedTests(context: AgentContext, auditLog: AuditLogger): Promise<AgentResult> {
    return { success: false, stage: "red-test", error: "Not implemented" };
  }

  protected async executeChanges(context: AgentContext, auditLog: AuditLogger): Promise<AgentResult> {
    return { success: false, stage: "executing", error: "Not implemented" };
  }

  protected async publish(context: AgentContext, auditLog: AuditLogger): Promise<AgentResult> {
    return { success: false, stage: "publishing", error: "Not implemented" };
  }

  protected async runGreenTests(context: AgentContext, auditLog: AuditLogger): Promise<AgentResult> {
    return { success: false, stage: "green-test", error: "Not implemented" };
  }

  protected async report(context: AgentContext, auditLog: AuditLogger): Promise<AgentResult> {
    return { success: false, stage: "reporting", error: "Not implemented" };
  }
}
