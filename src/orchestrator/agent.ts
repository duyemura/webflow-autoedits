import { randomUUID } from "node:crypto";
import type {
  PipelineRun,
  PipelineStatus,
  AgentContext,
  AgentResult,
  SiteConfig,
} from "../types/index.js";
import { LinearClient } from "../shared/linear/client.js";
import type { LinearIssue } from "../shared/linear/client.js";
import type { LinearWebhookPayload, LinearIssueData } from "../shared/linear/webhooks.js";
import { isStatusChange, isNewComment } from "../shared/linear/webhooks.js";
import { AIClient } from "../shared/ai/client.js";
import { classifyTicket } from "./classifier.js";
import { routeToAgent, type AgentRegistry } from "./router.js";
import { StateStore } from "../shared/state-store.js";
import { Dedup } from "../shared/dedup.js";
import { CostTracker } from "../shared/cost-tracker.js";
import { AuditLogger } from "../shared/audit/logger.js";
import { getLinearStatus } from "../shared/linear/status-map.js";
import { loadSiteConfig, loadAgentConfig, loadAllSiteConfigs } from "../shared/config-loader.js";
import { buildKnowledgeContext } from "../shared/learning/context-builder.js";
import { logger } from "../shared/logger.js";

export class Orchestrator {
  private linearClient: LinearClient;
  private aiClient: AIClient;
  private stateStore: StateStore;
  private dedup: Dedup;
  private costTracker: CostTracker;
  private agents: AgentRegistry;

  constructor(agents: AgentRegistry) {
    this.linearClient = new LinearClient();
    this.aiClient = new AIClient();
    this.stateStore = new StateStore();
    this.dedup = new Dedup();
    this.costTracker = new CostTracker();
    this.agents = agents;
  }

  /**
   * Handle incoming Linear webhook.
   */
  async handleWebhook(payload: LinearWebhookPayload): Promise<void> {
    // Handle comment webhooks for paused runs
    if (isNewComment(payload)) {
      await this.handleCommentWebhook(payload);
      return;
    }

    if (payload.type !== "Issue") return;

    const issueData = payload.data as LinearIssueData;
    const dedupKey = Dedup.key(issueData.id, payload.action);

    if (this.dedup.isDuplicate(dedupKey)) {
      logger.info({ issueId: issueData.id }, "Duplicate webhook, skipping");
      return;
    }
    this.dedup.mark(dedupKey);

    // Check if there's already a run for this issue
    const existingRun = this.stateStore.getByIssueId(issueData.id);
    if (existingRun && (existingRun.status === "running" || existingRun.status === "paused")) {
      logger.info({ issueId: issueData.id, status: existingRun.status }, "Run already exists");
      return;
    }

    // Find matching site config
    const siteConfig = await this.findSiteConfig(issueData);
    if (!siteConfig) {
      logger.info({ issueId: issueData.id }, "No matching site config");
      return;
    }

    // Check if this is a trigger status change
    if (!isStatusChange(payload, siteConfig.triggerStatus)) {
      logger.debug({ issueId: issueData.id }, "Not a trigger status change");
      return;
    }

    await this.startRun(issueData.id, siteConfig);
  }

  /**
   * Start a new pipeline run for an issue.
   */
  async startRun(issueId: string, siteConfig: SiteConfig): Promise<void> {
    const runId = randomUUID();
    const agentConfig = await loadAgentConfig("orchestrator");

    const run: PipelineRun = {
      id: runId,
      issueId,
      siteId: siteConfig.id,
      platform: "unclear",
      status: "running",
      currentStage: "classifying",
      completedStages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      cost: {
        runId,
        issueId,
        inputTokens: 0,
        outputTokens: 0,
        estimatedCost: 0,
        apiCalls: 0,
        breakdown: [],
      },
    };

    this.stateStore.save(run);
    this.costTracker.init(runId, issueId);

    const auditLog = new AuditLogger(runId, issueId);

    try {
      // Step 1: Claim the ticket
      await this.linearClient.updateIssueStatus(
        issueId,
        siteConfig.linearTeamId,
        siteConfig.statusMap.inProgress,
      );
      await this.linearClient.createComment(
        issueId,
        "🤖 **Pipeline started** — analyzing ticket...",
      );

      // Step 2: Check for blocking issues
      const blockers = await this.linearClient.getBlockingIssues(issueId);
      if (blockers.length > 0) {
        const blockerList = blockers.map((b) => `${b.identifier} (${b.state})`).join(", ");
        await this.linearClient.createComment(
          issueId,
          `⏳ **Waiting for blocking issues:** ${blockerList}`,
        );
        run.status = "paused";
        run.currentStage = "pending";
        this.stateStore.save(run);
        return;
      }

      // Step 3: Fetch full issue data
      const issue = await this.linearClient.getIssue(issueId);
      const startTime = Date.now();

      // Step 4: Classify
      const knowledgeContext = await buildKnowledgeContext("orchestrator", siteConfig.id);
      const classification = await classifyTicket(
        issue,
        this.aiClient,
        knowledgeContext,
        agentConfig.model,
      );

      await auditLog.log(
        "classifying",
        "orchestrator.classify",
        { title: issue.title },
        classification,
        Date.now() - startTime,
        classification.reasoning,
      );

      run.platform = classification.platform;
      run.ticketAnalysis = classification;
      run.completedStages.push("classifying");
      run.currentStage = "routing";
      this.stateStore.save(run);

      // Check confidence threshold
      if (classification.confidence < 70 || classification.platform === "unclear") {
        const questions = classification.ambiguities.length > 0
          ? classification.ambiguities
          : ["Could you clarify which platform this change applies to?"];

        await this.linearClient.createComment(
          issueId,
          `❓ **Needs clarification:**\n${questions.map((q) => `- ${q}`).join("\n")}\n\n_Classification confidence: ${classification.confidence}%_`,
        );
        await this.linearClient.updateIssueStatus(
          issueId,
          siteConfig.linearTeamId,
          siteConfig.statusMap.needsInfo,
        );
        run.status = "paused";
        run.currentStage = "needs-info";
        this.stateStore.save(run);
        return;
      }

      // Post classification result
      await this.linearClient.createComment(
        issueId,
        `📋 **Classified:** ${classification.platform} / ${classification.ticketType} (${classification.confidence}% confidence)\n\n**Requirements:**\n${classification.requirements.map((r) => `- ${r}`).join("\n")}\n\n_Routing to ${classification.platform} agent..._`,
      );

      // Step 5: Route to platform agent
      run.currentStage = "routing";
      run.completedStages.push("routing");
      this.stateStore.save(run);

      const context: AgentContext = {
        run,
        siteConfig,
        agentConfig,
        knowledgeContext: await buildKnowledgeContext(classification.platform, siteConfig.id),
        linearComments: issue.comments.nodes.map((c) => ({
          id: c.id,
          body: c.body,
          userId: c.user.id,
          createdAt: c.createdAt,
        })),
      };

      const result = await routeToAgent(classification.platform, context, this.agents);

      if (result.needsInfo) {
        await this.linearClient.createComment(
          issueId,
          `❓ **Needs clarification:**\n${result.needsInfo.questions.map((q) => `- ${q}`).join("\n")}`,
        );
        await this.linearClient.updateIssueStatus(
          issueId,
          siteConfig.linearTeamId,
          siteConfig.statusMap.needsInfo,
        );
        run.status = "paused";
        run.currentStage = "needs-info";
        this.stateStore.save(run);
        return;
      }

      // Step 6: Finalize
      if (result.success) {
        const finalStatus =
          siteConfig.mode === "human-review"
            ? siteConfig.statusMap.review
            : siteConfig.statusMap.done;

        await this.linearClient.updateIssueStatus(
          issueId,
          siteConfig.linearTeamId,
          finalStatus,
        );
        await this.linearClient.createComment(
          issueId,
          `✅ **Pipeline complete** — moved to ${finalStatus}`,
        );

        run.status = "completed";
        run.currentStage = "completed";
        run.completedStages.push("finalizing", "completed");
      } else {
        await this.linearClient.updateIssueStatus(
          issueId,
          siteConfig.linearTeamId,
          siteConfig.statusMap.blocked,
        );
        await this.linearClient.createComment(
          issueId,
          `❌ **Pipeline failed** at stage \`${result.stage}\`:\n\n${result.error || "Unknown error"}`,
        );

        run.status = "failed";
        run.currentStage = "failed";
        run.error = result.error;
      }

      this.stateStore.save(run);

      await auditLog.log(
        run.currentStage,
        "orchestrator.finalize",
        { platform: run.platform },
        { success: result.success, error: result.error },
        Date.now() - startTime,
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error({ runId, issueId, err }, "Pipeline run failed");

      run.status = "failed";
      run.currentStage = "failed";
      run.error = errorMsg;
      this.stateStore.save(run);

      try {
        await this.linearClient.createComment(
          issueId,
          `❌ **Pipeline error:** ${errorMsg}`,
        );
      } catch {
        // Best effort
      }
    }
  }

  /**
   * Handle a comment webhook to resume paused runs.
   */
  private async handleCommentWebhook(payload: LinearWebhookPayload): Promise<void> {
    const commentData = payload.data as { issueId: string; body: string; userId: string };
    const issueId = commentData.issueId;

    // Check for paused run
    const run = this.stateStore.getByIssueId(issueId);
    if (!run || run.status !== "paused") return;

    // Check for @autobot rule: commands
    if (commentData.body.includes("@autobot rule:")) {
      // Extract and save rule — handled by learning system
      logger.info({ issueId }, "Rule command detected");
    }

    // Resume the run
    logger.info({ issueId, runId: run.id }, "Resuming paused run from comment");
    const siteConfig = await loadSiteConfig(run.siteId);
    run.status = "running";
    this.stateStore.save(run);
    await this.startRun(issueId, siteConfig);
  }

  /**
   * Find a site config matching the issue's team.
   */
  private async findSiteConfig(issueData: LinearIssueData): Promise<SiteConfig | undefined> {
    const configs = await loadAllSiteConfigs();
    return configs.find((c) => c.linearTeamId === issueData.team.id);
  }

  /**
   * Get all runs for monitoring.
   */
  getRuns() {
    return this.stateStore.getAll();
  }

  /**
   * Get stale runs that may be stuck.
   */
  getStaleRuns(timeoutMinutes = 10) {
    return this.stateStore.getStaleRuns(timeoutMinutes);
  }
}
