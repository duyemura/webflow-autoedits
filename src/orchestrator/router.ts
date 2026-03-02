import type { Platform, PipelineRun, AgentContext, AgentResult } from "../types/index.js";
import type { BaseAgent } from "../agents/base-agent.js";
import { logger } from "../shared/logger.js";

export interface AgentRegistry {
  webflow?: BaseAgent;
  ghl?: BaseAgent;
}

/**
 * Route a classified ticket to the appropriate platform agent(s).
 */
export async function routeToAgent(
  platform: Platform,
  context: AgentContext,
  agents: AgentRegistry,
): Promise<AgentResult> {
  logger.info({ platform, runId: context.run.id }, "Routing to agent");

  switch (platform) {
    case "webflow": {
      const agent = agents.webflow;
      if (!agent) {
        return {
          success: false,
          stage: "routing",
          error: "Webflow agent not available",
        };
      }
      return agent.execute(context);
    }

    case "ghl": {
      const agent = agents.ghl;
      if (!agent) {
        return {
          success: false,
          stage: "routing",
          error: "GHL agent not available",
        };
      }
      return agent.execute(context);
    }

    case "both": {
      // Run sequentially: Webflow first, then GHL
      const results: AgentResult[] = [];

      if (agents.webflow) {
        const webflowResult = await agents.webflow.execute(context);
        results.push(webflowResult);
        if (!webflowResult.success) {
          return webflowResult; // Stop if Webflow fails
        }
      }

      if (agents.ghl) {
        const ghlResult = await agents.ghl.execute(context);
        results.push(ghlResult);
        if (!ghlResult.success) {
          return ghlResult;
        }
      }

      return {
        success: results.every((r) => r.success),
        stage: "reporting",
        data: { results },
      };
    }

    case "unclear":
      return {
        success: false,
        stage: "routing",
        needsInfo: {
          questions: [
            "Which platform does this ticket apply to? (Webflow website or GoHighLevel CRM)",
          ],
          context: "Could not determine the target platform from the ticket description.",
        },
      };

    default:
      return {
        success: false,
        stage: "routing",
        error: `Unknown platform: ${platform}`,
      };
  }
}
