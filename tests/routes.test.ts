import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createServer } from "../src/shared/server/webhook.js";
import type { RouteHandlers } from "../src/shared/server/routes.js";

// Minimal mock orchestrator
function mockOrchestrator() {
  return {
    getRuns: vi.fn().mockReturnValue([]),
    getStaleRuns: vi.fn().mockReturnValue([]),
    startRun: vi.fn().mockResolvedValue(undefined),
    handleWebhook: vi.fn().mockResolvedValue(undefined),
  };
}

function createTestApp() {
  const orchestrator = mockOrchestrator();
  const handlers: RouteHandlers = {
    onLinearWebhook: vi.fn().mockResolvedValue(undefined),
    orchestrator: orchestrator as any,
  };
  const app = createServer(handlers);
  return { app, handlers, orchestrator };
}

describe("Routes", () => {
  describe("GET /health", () => {
    it("returns ok status", async () => {
      const { app } = createTestApp();
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
      expect(res.body.runs).toBeDefined();
    });
  });

  describe("GET /runs", () => {
    it("returns empty runs list", async () => {
      const { app } = createTestApp();
      const res = await request(app).get("/runs");
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(0);
      expect(res.body.runs).toEqual([]);
    });

    it("returns runs when they exist", async () => {
      const { app, orchestrator } = createTestApp();
      orchestrator.getRuns.mockReturnValue([
        {
          id: "run-1",
          issueId: "issue-1",
          platform: "webflow",
          status: "running",
          currentStage: "analyzing",
          completedStages: ["classifying"],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const res = await request(app).get("/runs");
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.runs[0].issueId).toBe("issue-1");
    });
  });

  describe("POST /webhooks/linear", () => {
    it("accepts webhook and returns 200", async () => {
      const { app, handlers } = createTestApp();
      const res = await request(app)
        .post("/webhooks/linear")
        .send({ action: "update", type: "Issue", data: { id: "1" }, createdAt: "" });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });

  describe("POST /test/trigger", () => {
    it("rejects missing fields", async () => {
      const { app } = createTestApp();
      const res = await request(app).post("/test/trigger").send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Missing");
    });

    it("rejects unknown site config", async () => {
      const { app } = createTestApp();
      const res = await request(app)
        .post("/test/trigger")
        .send({ issueId: "abc", siteId: "nonexistent" });
      expect(res.status).toBe(404);
    });

    it("accepts valid trigger request", async () => {
      const { app } = createTestApp();
      const res = await request(app)
        .post("/test/trigger")
        .send({ issueId: "abc", siteId: "pushpress-main" });
      expect(res.status).toBe(202);
      expect(res.body.ok).toBe(true);
    });
  });
});
