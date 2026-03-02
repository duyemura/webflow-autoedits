import type { AgentContext, AgentResult } from "../../../types/index.js";
import { WebflowClient } from "../client.js";
import { logger } from "../../../shared/logger.js";

// Track recent publishes to avoid redundant calls
const recentPublishes = new Map<string, number>();

export async function publishStage(
  context: AgentContext,
  webflowClient: WebflowClient,
): Promise<AgentResult> {
  const { siteConfig } = context;
  const siteId = siteConfig.webflowSiteId;

  // Check for recent publish (batching window)
  const lastPublish = recentPublishes.get(siteId);
  const batchingWindow = 30_000; // 30 seconds

  if (lastPublish && Date.now() - lastPublish < batchingWindow) {
    logger.info({ siteId }, "Skipping publish — recent publish within batching window");
    return {
      success: true,
      stage: "publishing",
      data: { skipped: true, reason: "Recent publish within batching window" },
    };
  }

  try {
    await webflowClient.publishSite(siteId);
    recentPublishes.set(siteId, Date.now());

    logger.info({ siteId, domain: siteConfig.stagingDomain }, "Published to staging");

    return {
      success: true,
      stage: "publishing",
      data: { published: true, domain: siteConfig.stagingDomain },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, stage: "publishing", error: msg };
  }
}
