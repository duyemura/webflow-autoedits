import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import {
  verifyWebhookSignature,
  isStatusChange,
  isNewComment,
  type LinearWebhookPayload,
  type LinearIssueData,
} from "../src/shared/linear/webhooks.js";

describe("verifyWebhookSignature", () => {
  it("returns true for valid signature", () => {
    const body = '{"test":"data"}';
    const secret = "test-secret";
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(body);
    const signature = hmac.digest("hex");

    expect(verifyWebhookSignature(body, signature, secret)).toBe(true);
  });

  it("returns false for invalid signature", () => {
    expect(verifyWebhookSignature('{"test":"data"}', "wrong", "test-secret")).toBe(false);
  });

  it("returns true when no secret configured (dev mode)", () => {
    expect(verifyWebhookSignature('{"test":"data"}', undefined, "")).toBe(true);
  });
});

describe("isStatusChange", () => {
  it("detects matching status change", () => {
    const payload: LinearWebhookPayload = {
      action: "update",
      type: "Issue",
      data: {
        id: "1",
        identifier: "PUSH-1",
        title: "test",
        state: { id: "s1", name: "Ready for Automation", type: "started" },
        team: { id: "t1", key: "PUSH", name: "Push" },
        labels: [],
        priority: 1,
        createdAt: "",
        updatedAt: "",
        url: "",
      },
      createdAt: "",
    };

    expect(isStatusChange(payload, "Ready for Automation")).toBe(true);
    expect(isStatusChange(payload, "In Progress")).toBe(false);
  });

  it("ignores non-Issue types", () => {
    const payload: LinearWebhookPayload = {
      action: "create",
      type: "Comment",
      data: { id: "1", body: "test", issueId: "i1", userId: "u1", createdAt: "" },
      createdAt: "",
    };

    expect(isStatusChange(payload, "Ready for Automation")).toBe(false);
  });
});

describe("isNewComment", () => {
  it("detects new comments", () => {
    expect(isNewComment({ action: "create", type: "Comment", data: {} as any, createdAt: "" })).toBe(true);
    expect(isNewComment({ action: "update", type: "Comment", data: {} as any, createdAt: "" })).toBe(false);
    expect(isNewComment({ action: "create", type: "Issue", data: {} as any, createdAt: "" })).toBe(false);
  });
});
