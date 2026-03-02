import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { BaseAgent } from "../base-agent.js";
import type { AgentContext, AgentResult } from "../../types/index.js";
import type { TestSpec } from "../../types/test-result.js";
import type { TestRunResult } from "../../types/test-result.js";
import type { AuditLogger } from "../../shared/audit/logger.js";
import { WebflowClient } from "./client.js";
import { analyzeStage } from "./stages/analyze.js";
import { generateTestsStage } from "./stages/generate-tests.js";
import { executeStage } from "./stages/execute.js";
import { publishStage } from "./stages/publish.js";
import { verifyStage } from "./stages/verify.js";
import { logger } from "../../shared/logger.js";

export class WebflowAgent extends BaseAgent {
  private testSpec?: TestSpec;

  constructor() {
    super("webflow");
  }

  /**
   * Create a per-site Webflow client using the site's token.
   * Falls back to the global WEBFLOW_API_TOKEN env var.
   */
  private getClient(context: AgentContext): WebflowClient {
    const token = context.siteConfig.webflowApiToken || process.env.WEBFLOW_API_TOKEN;
    return new WebflowClient(token);
  }

  protected async analyze(
    context: AgentContext,
    auditLog: AuditLogger,
  ): Promise<AgentResult> {
    return analyzeStage(context, this.aiClient, this.getClient(context));
  }

  protected async generateTests(
    context: AgentContext,
    auditLog: AuditLogger,
  ): Promise<AgentResult> {
    const result = await generateTestsStage(context, this.aiClient);
    if (result.success && result.data?.testSpec) {
      this.testSpec = result.data.testSpec as TestSpec;
    }
    return result;
  }

  /**
   * Upload screenshots to Linear and return markdown image embeds.
   */
  private async uploadScreenshots(
    context: AgentContext,
    screenshots: string[],
  ): Promise<string[]> {
    const imageMarkdown: string[] = [];
    for (const screenshotPath of screenshots) {
      try {
        const fileData = await readFile(screenshotPath);
        const filename = basename(screenshotPath);
        const assetUrl = await this.linearClient.uploadFile(
          filename,
          "image/png",
          fileData,
        );
        imageMarkdown.push(`![${filename}](${assetUrl})`);
      } catch (err) {
        logger.warn({ err, path: screenshotPath }, "Failed to upload screenshot");
      }
    }
    return imageMarkdown;
  }

  /**
   * Post a test results comment with embedded screenshots.
   */
  private async postTestComment(
    context: AgentContext,
    phase: "Red Test" | "Green Test",
    testResults: TestRunResult,
  ): Promise<void> {
    const emoji = phase === "Red Test"
      ? (testResults.passed ? "⚠️" : "🔴")
      : (testResults.passed ? "🟢" : "❌");

    const lines = [
      `${emoji} **${phase}** — ${testResults.passedTests}/${testResults.totalTests} passed`,
    ];

    if (testResults.failures.length > 0) {
      lines.push("", "**Failures:**");
      for (const f of testResults.failures) {
        lines.push(`- \`${f.testName}\`: ${f.error.substring(0, 200)}`);
      }
    }

    // Upload and embed screenshots
    if (testResults.screenshots.length > 0) {
      const images = await this.uploadScreenshots(context, testResults.screenshots);
      if (images.length > 0) {
        lines.push("", "**Screenshots:**", ...images);
      }
    }

    await this.linearClient.createComment(context.run.issueId, lines.join("\n"));
  }

  protected async runRedTests(
    context: AgentContext,
    auditLog: AuditLogger,
  ): Promise<AgentResult> {
    if (!this.testSpec) {
      return { success: true, stage: "red-test", data: { skipped: true } };
    }

    const result = await verifyStage(context, this.aiClient, this.testSpec);

    // Post screenshots to Linear
    if (result.testResults) {
      await this.postTestComment(context, "Red Test", result.testResults);
    }

    // For red tests, we EXPECT failure (tests should fail before changes)
    if (!result.success) {
      return {
        success: true,
        stage: "red-test",
        data: { ...result.data, expectedFailure: true },
      };
    }

    // Tests passed before changes — the desired state already exists
    return {
      success: true,
      stage: "red-test",
      data: { ...result.data, alreadyPassing: true },
    };
  }

  protected async executeChanges(
    context: AgentContext,
    auditLog: AuditLogger,
  ): Promise<AgentResult> {
    return executeStage(context, this.aiClient, this.getClient(context));
  }

  protected async publish(
    context: AgentContext,
    auditLog: AuditLogger,
  ): Promise<AgentResult> {
    return publishStage(context, this.getClient(context));
  }

  protected async runGreenTests(
    context: AgentContext,
    auditLog: AuditLogger,
  ): Promise<AgentResult> {
    if (!this.testSpec) {
      return { success: true, stage: "green-test", data: { skipped: true } };
    }
    const result = await verifyStage(context, this.aiClient, this.testSpec);

    // Post screenshots to Linear
    if (result.testResults) {
      await this.postTestComment(context, "Green Test", result.testResults);
    }

    return result;
  }

  protected async report(
    context: AgentContext,
    auditLog: AuditLogger,
  ): Promise<AgentResult> {
    const { run, siteConfig } = context;

    const summary = [
      `### ${run.ticketAnalysis?.title || "Ticket"} — Pipeline Report`,
      "",
      `**Platform:** Webflow`,
      `**Ticket Type:** ${run.ticketAnalysis?.ticketType}`,
      `**Site:** ${siteConfig.name}`,
      "",
      "**Stages Completed:**",
      ...run.completedStages.map((s) => `- ✅ ${s}`),
      "",
      `**Staging URL:** https://${siteConfig.stagingDomain}`,
    ];

    if (run.changePlan) {
      summary.push("", "**Changes Made:**");
      for (const step of run.changePlan.steps) {
        summary.push(`- ${step.description}`);
      }
    }

    await this.linearClient.createComment(run.issueId, summary.join("\n"));

    return {
      success: true,
      stage: "reporting",
      data: { summary: summary.join("\n") },
    };
  }
}
