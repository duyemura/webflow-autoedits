import { describe, it, expect, beforeEach } from "vitest";
import { CostTracker } from "../src/shared/cost-tracker.js";

describe("CostTracker", () => {
  let tracker: CostTracker;

  beforeEach(() => {
    tracker = new CostTracker();
  });

  it("tracks token usage and cost", () => {
    tracker.init("run-1", "issue-1");
    tracker.track("run-1", "classifying", 1000, 500);

    const cost = tracker.get("run-1");
    expect(cost).toBeDefined();
    expect(cost!.inputTokens).toBe(1000);
    expect(cost!.outputTokens).toBe(500);
    expect(cost!.estimatedCost).toBeGreaterThan(0);
    expect(cost!.apiCalls).toBe(1);
    expect(cost!.breakdown).toHaveLength(1);
  });

  it("accumulates across multiple tracks", () => {
    tracker.init("run-1", "issue-1");
    tracker.track("run-1", "classifying", 1000, 500);
    tracker.track("run-1", "analyzing", 2000, 1000);

    const cost = tracker.get("run-1");
    expect(cost!.inputTokens).toBe(3000);
    expect(cost!.outputTokens).toBe(1500);
    expect(cost!.apiCalls).toBe(2);
    expect(cost!.breakdown).toHaveLength(2);
  });

  it("detects over-budget runs", () => {
    tracker.init("run-1", "issue-1");
    // Track a huge number of tokens
    tracker.track("run-1", "stage", 1_000_000, 1_000_000);

    expect(tracker.isOverBudget("run-1", 5.0)).toBe(true);
    expect(tracker.isOverBudget("run-1", 100.0)).toBe(false);
  });

  it("returns undefined for unknown runs", () => {
    expect(tracker.get("nonexistent")).toBeUndefined();
    expect(tracker.isOverBudget("nonexistent", 5.0)).toBe(false);
  });
});
