import { describe, it, expect } from "vitest";
import { ResourceLock } from "../src/shared/resource-lock.js";

describe("ResourceLock", () => {
  it("acquires and releases locks", () => {
    const lock = new ResourceLock();
    const key = ResourceLock.key("webflow", "site1", "page-pricing");

    expect(lock.acquire(key, "run-1")).toBe(true);
    expect(lock.acquire(key, "run-2")).toBe(false); // held by run-1
    expect(lock.acquire(key, "run-1")).toBe(true); // same run can re-acquire

    lock.release(key, "run-1");
    expect(lock.acquire(key, "run-2")).toBe(true); // now available
  });

  it("builds consistent lock keys", () => {
    expect(ResourceLock.key("webflow", "abc", "page-1")).toBe("webflow:abc:page-1");
  });

  it("does not release locks held by other runs", () => {
    const lock = new ResourceLock();
    const key = "test-key";
    lock.acquire(key, "run-1");
    lock.release(key, "run-2"); // wrong run
    expect(lock.acquire(key, "run-2")).toBe(false); // still held by run-1
  });
});
