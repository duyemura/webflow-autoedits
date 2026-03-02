import { describe, it, expect } from "vitest";
import {
  formatTestResults,
  formatChangePlan,
  formatError,
  formatNeedsInfo,
} from "../src/agents/linear/comment-formatter.js";

describe("formatTestResults", () => {
  it("formats passing results", () => {
    const result = formatTestResults({
      passed: true,
      totalTests: 3,
      passedTests: 3,
      failedTests: 0,
      failures: [],
      duration: 1500,
      screenshots: [],
    });

    expect(result).toContain("All tests passed");
    expect(result).toContain("Total: 3");
    expect(result).toContain("1.5s");
  });

  it("formats failing results with details", () => {
    const result = formatTestResults({
      passed: false,
      totalTests: 2,
      passedTests: 1,
      failedTests: 1,
      failures: [{ testName: "hero text", error: "Expected 'Hello' got 'Hi'" }],
      duration: 2000,
      screenshots: [],
    });

    expect(result).toContain("Some tests failed");
    expect(result).toContain("hero text");
    expect(result).toContain("Expected 'Hello' got 'Hi'");
  });
});

describe("formatChangePlan", () => {
  it("formats a change plan", () => {
    const result = formatChangePlan({
      steps: [
        { order: 1, description: "Update hero text", apiCall: "webflow_update_item", params: {} },
        { order: 2, description: "Publish site", apiCall: "webflow_publish_site", params: {} },
      ],
      estimatedApiCalls: 2,
      reasoning: "Simple content update",
    });

    expect(result).toContain("2 steps");
    expect(result).toContain("Update hero text");
    expect(result).toContain("Simple content update");
  });
});

describe("formatError", () => {
  it("formats an error message", () => {
    const result = formatError("executing", "API rate limit exceeded");
    expect(result).toContain("executing");
    expect(result).toContain("API rate limit exceeded");
  });
});

describe("formatNeedsInfo", () => {
  it("formats clarification questions", () => {
    const result = formatNeedsInfo(["Which blog category?", "Target URL?"]);
    expect(result).toContain("Which blog category?");
    expect(result).toContain("Target URL?");
    expect(result).toContain("reply with the answers");
  });
});
