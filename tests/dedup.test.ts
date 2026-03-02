import { describe, it, expect, beforeEach } from "vitest";
import { Dedup } from "../src/shared/dedup.js";

describe("Dedup", () => {
  let dedup: Dedup;

  beforeEach(() => {
    dedup = new Dedup(1000); // 1s TTL for tests
  });

  it("marks and detects duplicates", () => {
    const key = Dedup.key("issue-1", "update");
    expect(dedup.isDuplicate(key)).toBe(false);
    dedup.mark(key);
    expect(dedup.isDuplicate(key)).toBe(true);
  });

  it("does not cross-contaminate different keys", () => {
    dedup.mark(Dedup.key("issue-1", "update"));
    expect(dedup.isDuplicate(Dedup.key("issue-2", "update"))).toBe(false);
    expect(dedup.isDuplicate(Dedup.key("issue-1", "create"))).toBe(false);
  });

  it("expires entries after TTL", async () => {
    const shortDedup = new Dedup(50); // 50ms TTL
    const key = "test-key";
    shortDedup.mark(key);
    expect(shortDedup.isDuplicate(key)).toBe(true);
    await new Promise((r) => setTimeout(r, 100));
    expect(shortDedup.isDuplicate(key)).toBe(false);
  });

  it("builds consistent keys", () => {
    expect(Dedup.key("abc", "update")).toBe("abc:update");
    expect(Dedup.key("issue-123", "create")).toBe("issue-123:create");
  });
});
