import "dotenv/config";
import { validateEnv } from "./shared/env.js";
import { startServer } from "./shared/server/webhook.js";
import { JobQueue } from "./shared/server/queue.js";
import { Orchestrator } from "./orchestrator/agent.js";
import { WebflowAgent } from "./agents/webflow/agent.js";
import { GHLAgent } from "./agents/ghl/agent.js";
import { loadAgentConfig } from "./shared/config-loader.js";
import type { LinearWebhookPayload } from "./shared/linear/webhooks.js";
import { logger } from "./shared/logger.js";

async function main() {
  logger.info("Starting Grow Automation Pipeline...");

  // Validate env vars — fails fast if required vars are missing
  const env = validateEnv();

  // Load orchestrator config
  const orchestratorConfig = await loadAgentConfig("orchestrator");

  // Initialize platform agents
  const webflowAgent = new WebflowAgent();
  const ghlAgent = new GHLAgent();

  // Initialize orchestrator with agent registry
  const orchestrator = new Orchestrator({
    webflow: webflowAgent,
    ghl: ghlAgent,
  });

  // Set up job queue with concurrency from config
  const queue = new JobQueue<LinearWebhookPayload>(
    async (job) => {
      await orchestrator.handleWebhook(job.data);
    },
    orchestratorConfig.maxConcurrentRuns || 3,
  );

  // Start webhook server
  startServer(
    {
      onLinearWebhook: async (payload) => {
        const id =
          payload.type === "Issue"
            ? (payload.data as any).id
            : (payload.data as any).issueId || "unknown";
        await queue.add(`webhook-${id}-${Date.now()}`, payload);
      },
      orchestrator,
    },
    env.PORT,
  );

  // Stale run detection
  const staleCheckInterval = setInterval(() => {
    const staleRuns = orchestrator.getStaleRuns(
      orchestratorConfig.staleRunTimeoutMinutes || 10,
    );
    for (const run of staleRuns) {
      logger.warn({ runId: run.id, issueId: run.issueId }, "Stale run detected");
    }
  }, 60_000);

  // Cleanup on exit
  process.on("SIGTERM", () => clearInterval(staleCheckInterval));
  process.on("SIGINT", () => clearInterval(staleCheckInterval));

  logger.info("Pipeline ready");
}

main().catch((err) => {
  logger.fatal({ err }, "Failed to start pipeline");
  process.exit(1);
});
