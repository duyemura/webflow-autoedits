import type {
  AgentContext,
  AgentResult,
  PipelineStage,
  TicketAnalysis,
} from "../types/index.js";
import type { TestRunner, TestSpec, TestRunResult } from "../types/test-result.js";
import { LinearClient } from "../shared/linear/client.js";
import { AIClient } from "../shared/ai/client.js";
import { AuditLogger } from "../shared/audit/logger.js";
import { CostTracker } from "../shared/cost-tracker.js";
import { logger } from "../shared/logger.js";

/**
 * Abstract base class for platform agents.
 * Implements the 7-stage pipeline pattern.
 */
export abstract class BaseAgent {
  protected name: string;
  protected linearClient: LinearClient;
  protected aiClient: AIClient;
  protected costTracker: CostTracker;

  constructor(name: string) {
    this.name = name;
    this.linearClient = new LinearClient();
    this.aiClient = new AIClient();
    this.costTracker = new CostTracker();
  }

  /**
   * Execute the full pipeline for this agent.
   */
  async execute(context: AgentContext): Promise<AgentResult> {
    const { run, siteConfig } = context;
    const auditLog = new AuditLogger(run.id, run.issueId);
    this.costTracker.init(run.id, run.issueId);

    const stages: { name: PipelineStage; fn: () => Promise<AgentResult> }[] = [
      {
        name: "analyzing",
        fn: () => this.analyze(context, auditLog),
      },
      {
        name: "generating-tests",
        fn: () => this.generateTests(context, auditLog),
      },
      {
        name: "red-test",
        fn: () => this.runRedTests(context, auditLog),
      },
      {
        name: "executing",
        fn: () => this.executeChanges(context, auditLog),
      },
      {
        name: "publishing",
        fn: () => this.publish(context, auditLog),
      },
      {
        name: "green-test",
        fn: () => this.runGreenTests(context, auditLog),
      },
      {
        name: "reporting",
        fn: () => this.report(context, auditLog),
      },
    ];

    // Resume from last completed stage if applicable
    const startIndex = this.getResumeIndex(context, stages.map((s) => s.name));

    for (let i = startIndex; i < stages.length; i++) {
      const stage = stages[i];
      const startTime = Date.now();

      logger.info({ agent: this.name, stage: stage.name, runId: run.id }, `Stage: ${stage.name}`);

      try {
        await this.linearClient.createComment(
          run.issueId,
          `⚙️ **${this.name}** — Stage: \`${stage.name}\``,
        );

        const result = await stage.fn();

        await auditLog.log(
          stage.name,
          `${this.name}.${stage.name}`,
          { stage: stage.name },
          result.data || {},
          Date.now() - startTime,
        );

        if (!result.success) {
          // Check if we need info
          if (result.needsInfo) {
            return result;
          }

          // Check if we should retry
          const retries = siteConfig.maxRetries;
          if (i > 0 && retries > 0) {
            logger.warn(
              { agent: this.name, stage: stage.name },
              "Stage failed, could retry",
            );
          }

          await this.linearClient.createComment(
            run.issueId,
            `❌ **${this.name}** — Failed at \`${stage.name}\`: ${result.error}`,
          );
          return result;
        }

        run.completedStages.push(stage.name);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.error({ agent: this.name, stage: stage.name, err }, "Stage error");

        await this.linearClient.createComment(
          run.issueId,
          `❌ **${this.name}** — Error at \`${stage.name}\`: ${errorMsg}`,
        );

        return {
          success: false,
          stage: stage.name,
          error: errorMsg,
        };
      }
    }

    return { success: true, stage: "reporting" };
  }

  /**
   * Determine which stage to resume from based on completed stages.
   */
  private getResumeIndex(
    context: AgentContext,
    stageNames: PipelineStage[],
  ): number {
    const completed = context.run.completedStages;
    for (let i = stageNames.length - 1; i >= 0; i--) {
      if (completed.includes(stageNames[i])) {
        return i + 1;
      }
    }
    return 0;
  }

  // --- Abstract methods that each platform agent must implement ---

  protected abstract analyze(
    context: AgentContext,
    auditLog: AuditLogger,
  ): Promise<AgentResult>;

  protected abstract generateTests(
    context: AgentContext,
    auditLog: AuditLogger,
  ): Promise<AgentResult>;

  protected abstract runRedTests(
    context: AgentContext,
    auditLog: AuditLogger,
  ): Promise<AgentResult>;

  protected abstract executeChanges(
    context: AgentContext,
    auditLog: AuditLogger,
  ): Promise<AgentResult>;

  protected abstract publish(
    context: AgentContext,
    auditLog: AuditLogger,
  ): Promise<AgentResult>;

  protected abstract runGreenTests(
    context: AgentContext,
    auditLog: AuditLogger,
  ): Promise<AgentResult>;

  protected abstract report(
    context: AgentContext,
    auditLog: AuditLogger,
  ): Promise<AgentResult>;
}
