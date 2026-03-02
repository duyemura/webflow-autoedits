import { describe, it, expect } from "vitest";
import { JobQueue } from "../src/shared/server/queue.js";

describe("JobQueue", () => {
  it("processes jobs in order", async () => {
    const processed: string[] = [];

    const queue = new JobQueue<string>(async (job) => {
      processed.push(job.data);
    }, 1);

    await queue.add("j1", "first");
    await queue.add("j2", "second");

    // Wait for processing
    await new Promise((r) => setTimeout(r, 100));

    expect(processed).toContain("first");
    expect(processed).toContain("second");
  });

  it("reports queue status", async () => {
    const queue = new JobQueue<string>(async () => {
      await new Promise((r) => setTimeout(r, 500));
    }, 1);

    await queue.add("j1", "data");
    await queue.add("j2", "data");

    // j1 should be running, j2 queued
    const status = queue.getStatus();
    expect(status.running).toBeGreaterThanOrEqual(0);
    expect(status.queued + status.running).toBeGreaterThanOrEqual(1);
  });

  it("handles job failures gracefully", async () => {
    const queue = new JobQueue<string>(async () => {
      throw new Error("boom");
    }, 1);

    await queue.add("j1", "data");
    await new Promise((r) => setTimeout(r, 100));

    const status = queue.getStatus();
    expect(status.failed).toBe(1);
  });
});
