import type { AgentContext, AgentResult } from "../../../types/index.js";
import type { AuditLogger } from "../../../shared/audit/logger.js";
import { AIClient } from "../../../shared/ai/client.js";
import { ToolRunner } from "../../../shared/ai/tool-runner.js";
import { WebflowClient } from "../client.js";
import { registerCmsTools } from "../tools/cms.js";
import { registerPageTools } from "../tools/pages.js";
import { buildAnalyzePrompt } from "../prompts/analyze.js";
import { extractJSON } from "../../../shared/ai/parse-json.js";
import { logger } from "../../../shared/logger.js";

export async function analyzeStage(
  context: AgentContext,
  aiClient: AIClient,
  webflowClient: WebflowClient,
): Promise<AgentResult> {
  const { run, siteConfig, knowledgeContext } = context;
  const analysis = run.ticketAnalysis;
  if (!analysis) {
    return { success: false, stage: "analyzing", error: "No ticket analysis available" };
  }

  // Set up tools for the AI to inspect the site
  const toolRunner = new ToolRunner();
  registerCmsTools(toolRunner, webflowClient);
  registerPageTools(toolRunner, webflowClient);

  const systemPrompt = buildAnalyzePrompt(knowledgeContext);

  const userMessage = `Analyze this ticket and create a change plan:

**Title:** ${analysis.title}
**Description:** ${analysis.description}
**Type:** ${analysis.ticketType}
**Requirements:**
${analysis.requirements.map((r) => `- ${r}`).join("\n")}

**Target Resources:**
${analysis.targetResources.map((r) => `- ${r.action} ${r.type}: ${r.name}`).join("\n")}

**Site ID:** ${siteConfig.webflowSiteId}

Use the available tools to inspect the current state of the site before creating your plan.`;

  const result = await aiClient.run({
    systemPrompt,
    userMessage,
    tools: toolRunner.getDefinitions(),
    toolHandler: toolRunner.createHandler(),
    model: context.agentConfig.model,
  });

  try {
    const parsed = extractJSON<any>(result.text);

    // AI determined it can't proceed (e.g. all FAQ slots full)
    if (parsed.blocked) {
      return {
        success: false,
        stage: "analyzing",
        error: parsed.blockedReason || "Change cannot be made automatically — flagged for human review",
      };
    }

    if (parsed.confidence < 70 && parsed.ambiguities?.length > 0) {
      return {
        success: false,
        stage: "analyzing",
        needsInfo: {
          questions: parsed.ambiguities || ["Requirements are unclear"],
          context: parsed.reasoning || "",
        },
      };
    }

    // Store change plan in run
    run.changePlan = parsed.changePlan;

    return {
      success: true,
      stage: "analyzing",
      data: {
        changePlan: parsed.changePlan,
        confidence: parsed.confidence,
        requirements: parsed.requirements,
      },
    };
  } catch (err) {
    logger.error({ err, text: result.text }, "Failed to parse analyze response");
    return {
      success: false,
      stage: "analyzing",
      error: "Failed to parse AI analysis response",
    };
  }
}
