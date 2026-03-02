import { Router, type Request, type Response } from "express";
import { logger } from "../logger.js";
import type { LinearWebhookPayload } from "../linear/webhooks.js";
import { verifyWebhookSignature } from "../linear/webhooks.js";
import type { Orchestrator } from "../../orchestrator/agent.js";

export interface RouteHandlers {
  onLinearWebhook: (payload: LinearWebhookPayload) => Promise<void>;
  orchestrator: Orchestrator;
}

export function createRoutes(handlers: RouteHandlers): Router {
  const router = Router();
  const webhookSecret = process.env.LINEAR_WEBHOOK_SECRET || "";

  // --- Linear webhook endpoint ---
  router.post("/webhooks/linear", async (req: Request, res: Response) => {
    try {
      // Verify signature if secret is configured
      if (webhookSecret) {
        const signature = req.headers["linear-signature"] as string | undefined;
        const rawBody = JSON.stringify(req.body);
        if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
          logger.warn("Invalid webhook signature");
          res.status(401).json({ error: "Invalid signature" });
          return;
        }
      }

      const payload = req.body as LinearWebhookPayload;
      logger.info(
        { action: payload.action, type: payload.type },
        "Linear webhook received",
      );

      // Acknowledge immediately — processing happens async
      res.status(200).json({ ok: true });

      // Process in background
      handlers.onLinearWebhook(payload).catch((err) => {
        logger.error({ err }, "Webhook handler error");
      });
    } catch (err) {
      logger.error({ err }, "Webhook route error");
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- Manual trigger for testing ---
  router.post("/test/trigger", async (req: Request, res: Response) => {
    try {
      const { issueId, siteId } = req.body as { issueId?: string; siteId?: string };

      if (!issueId || !siteId) {
        res.status(400).json({
          error: "Missing required fields",
          usage: { issueId: "Linear issue ID", siteId: "Site config ID (e.g. pushpress-main)" },
        });
        return;
      }

      const { loadSiteConfig } = await import("../config-loader.js");
      let siteConfig;
      try {
        siteConfig = await loadSiteConfig(siteId);
      } catch {
        res.status(404).json({ error: `Site config not found: ${siteId}` });
        return;
      }

      logger.info({ issueId, siteId }, "Manual trigger received");

      // Start run directly (bypasses webhook matching + dedup)
      handlers.orchestrator.startRun(issueId, siteConfig).catch((err) => {
        logger.error({ err, issueId }, "Manual trigger run failed");
      });

      res.status(202).json({
        ok: true,
        message: `Pipeline triggered for issue ${issueId} on site ${siteId}`,
      });
    } catch (err) {
      logger.error({ err }, "Test trigger error");
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- Pipeline status ---
  router.get("/runs", (_req: Request, res: Response) => {
    const runs = handlers.orchestrator.getRuns();
    res.json({
      total: runs.length,
      runs: runs.map((r) => ({
        id: r.id,
        issueId: r.issueId,
        platform: r.platform,
        status: r.status,
        currentStage: r.currentStage,
        completedStages: r.completedStages,
        error: r.error,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    });
  });

  // --- Site management ---
  router.get("/sites", async (_req: Request, res: Response) => {
    const { loadAllSiteConfigs } = await import("../config-loader.js");
    const sites = await loadAllSiteConfigs();
    res.json({
      total: sites.length,
      sites: sites.map((s) => ({
        id: s.id,
        name: s.name,
        webflowSiteId: s.webflowSiteId,
        hasToken: !!s.webflowApiToken,
        linearTeamId: s.linearTeamId,
        stagingDomain: s.stagingDomain,
        mode: s.mode,
      })),
    });
  });

  router.post("/sites", async (req: Request, res: Response) => {
    try {
      const config = req.body as import("../../types/index.js").SiteConfig;
      if (!config.id || !config.webflowSiteId) {
        res.status(400).json({
          error: "Missing required fields: id, webflowSiteId",
          example: {
            id: "my-client-site",
            name: "Client Site",
            webflowSiteId: "abc123",
            webflowApiToken: "token-here",
            stagingDomain: "my-client.webflow.io",
            productionDomain: "www.client.com",
            linearTeamId: "team-id",
            triggerStatus: "Ready for Automation",
            statusMap: { inProgress: "In Progress", needsInfo: "Needs Info", review: "In Review", done: "Done", blocked: "Blocked" },
            mode: "human-review",
            allowedTicketTypes: ["cms-content", "page-content"],
            maxRetries: 2,
            testing: { baseUrl: "https://my-client.webflow.io", visualRegressionThreshold: 0.05, timeout: 30000 },
            maxCostPerRun: 5.0,
          },
        });
        return;
      }
      const { registerSite } = await import("../config-loader.js");
      await registerSite(config);
      res.status(201).json({ ok: true, siteId: config.id });
    } catch (err) {
      logger.error({ err }, "Site registration error");
      res.status(500).json({ error: "Failed to register site" });
    }
  });

  // --- Health check ---
  router.get("/health", (_req: Request, res: Response) => {
    const runs = handlers.orchestrator.getRuns();
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      runs: {
        total: runs.length,
        running: runs.filter((r) => r.status === "running").length,
        paused: runs.filter((r) => r.status === "paused").length,
        completed: runs.filter((r) => r.status === "completed").length,
        failed: runs.filter((r) => r.status === "failed").length,
      },
    });
  });

  return router;
}
