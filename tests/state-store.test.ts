import { describe, it, expect, beforeEach } from "vitest";
import { StateStore } from "../src/shared/state-store.js";
import type { PipelineRun } from "../src/types/index.js";

function makeRun(overrides: Partial<PipelineRun> = {}): PipelineRun {
  return {
    id: "run-1",
    issueId: "issue-1",
    siteId: "site-1",
    platform: "webflow",
    status: "running",
    currentStage: "analyzing",
    completedStages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    cost: {
      runId: "run-1",
      issueId: "issue-1",
      inputTokens: 0,
      outputTokens: 0,
      estimatedCost: 0,
      apiCalls: 0,
      breakdown: [],
    },
    ...overrides,
  };
}

describe("StateStore", () => {
  let store: StateStore;

  beforeEach(() => {
    store = new StateStore();
  });

  it("saves and retrieves runs by ID", () => {
    const run = makeRun();
    store.save(run);
    const retrieved = store.get("run-1");
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe("run-1");
    expect(retrieved!.issueId).toBe("issue-1");
  });

  it("retrieves runs by issue ID", () => {
    store.save(makeRun());
    const retrieved = store.getByIssueId("issue-1");
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe("run-1");
  });

  it("returns undefined for unknown IDs", () => {
    expect(store.get("nonexistent")).toBeUndefined();
    expect(store.getByIssueId("nonexistent")).toBeUndefined();
  });

  it("returns copies not references", () => {
    store.save(makeRun());
    const a = store.get("run-1")!;
    const b = store.get("run-1")!;
    a.status = "failed";
    expect(b.status).toBe("running");
  });

  it("filters by status", () => {
    store.save(makeRun({ id: "r1", status: "running" }));
    store.save(makeRun({ id: "r2", status: "completed" }));
    store.save(makeRun({ id: "r3", status: "running" }));

    const running = store.getByStatus("running");
    expect(running).toHaveLength(2);

    const completed = store.getByStatus("completed");
    expect(completed).toHaveLength(1);
  });

  it("detects stale runs", () => {
    const old = makeRun({
      id: "old",
      status: "running",
      updatedAt: new Date(Date.now() - 15 * 60 * 1000), // 15 min ago
    });
    const recent = makeRun({
      id: "recent",
      status: "running",
      updatedAt: new Date(),
    });

    store.save(old);
    // Manually set updatedAt back since save() resets it
    const raw = store.get("old")!;
    raw.updatedAt = new Date(Date.now() - 15 * 60 * 1000);
    store["runs"].set("old", raw);

    store.save(recent);

    const stale = store.getStaleRuns(10);
    expect(stale).toHaveLength(1);
    expect(stale[0].id).toBe("old");
  });

  it("deletes runs", () => {
    store.save(makeRun());
    expect(store.delete("run-1")).toBe(true);
    expect(store.get("run-1")).toBeUndefined();
    expect(store.delete("run-1")).toBe(false);
  });
});
