import type { AgentContext, AgentResult } from "../../../types/index.js";
import { AIClient } from "../../../shared/ai/client.js";
import { ToolRunner } from "../../../shared/ai/tool-runner.js";
import { WebflowClient } from "../client.js";
import { registerCmsTools } from "../tools/cms.js";
import { registerPageTools } from "../tools/pages.js";
import { registerSiteTools } from "../tools/sites.js";
import { buildExecutePrompt } from "../prompts/plan-changes.js";
import { extractJSON } from "../../../shared/ai/parse-json.js";
import { logger } from "../../../shared/logger.js";

export async function executeStage(
  context: AgentContext,
  aiClient: AIClient,
  webflowClient: WebflowClient,
): Promise<AgentResult> {
  const { run, knowledgeContext } = context;
  const changePlan = run.changePlan;
  if (!changePlan) {
    return { success: false, stage: "executing", error: "No change plan available" };
  }

  // Set up tools for execution
  const toolRunner = new ToolRunner();
  registerCmsTools(toolRunner, webflowClient);
  registerPageTools(toolRunner, webflowClient);
  registerSiteTools(toolRunner, webflowClient);

  const systemPrompt = buildExecutePrompt(knowledgeContext);

  const userMessage = `Execute this change plan:

${JSON.stringify(changePlan, null, 2)}

Execute each step in order using the available tools. Report what was done.`;

  const result = await aiClient.run({
    systemPrompt,
    userMessage,
    tools: toolRunner.getDefinitions(),
    toolHandler: toolRunner.createHandler(),
    model: context.agentConfig.model,
  });

  try {
    const parsed = extractJSON<any>(result.text);
    return {
      success: parsed.success,
      stage: "executing",
      data: {
        changesApplied: parsed.changesApplied,
        errors: parsed.errors,
        toolCalls: result.toolCalls,
      },
      error: parsed.errors?.length > 0 ? parsed.errors.join("; ") : undefined,
    };
  } catch {
    // If we can't parse but tools were called, assume success
    if (result.toolCalls.length > 0) {
      return {
        success: true,
        stage: "executing",
        data: { toolCalls: result.toolCalls, rawResponse: result.text },
      };
    }
    return {
      success: false,
      stage: "executing",
      error: "Failed to parse execution response and no tool calls were made",
    };
  }
}
