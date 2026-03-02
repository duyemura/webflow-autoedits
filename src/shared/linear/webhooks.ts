import crypto from "node:crypto";
import { logger } from "../logger.js";

export interface LinearWebhookPayload {
  action: "create" | "update" | "remove";
  type: "Issue" | "Comment" | "IssueLabel";
  data: LinearIssueData | LinearCommentData;
  createdAt: string;
  organizationId?: string;
  webhookId?: string;
  webhookTimestamp?: number;
  url?: string;
  updatedFrom?: Record<string, unknown>;
}

export interface LinearIssueData {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  state: { id: string; name: string; type: string };
  team: { id: string; key: string; name: string };
  labels: { id: string; name: string }[];
  priority: number;
  assignee?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
  url: string;
}

export interface LinearCommentData {
  id: string;
  body: string;
  issueId: string;
  userId: string;
  createdAt: string;
  issue?: { id: string; identifier: string };
}

/**
 * Verify Linear webhook signature.
 */
export function verifyWebhookSignature(
  body: string,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!signature || !secret) {
    logger.warn("Missing webhook signature or secret");
    return !secret; // Allow if no secret configured (dev mode)
  }

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(body);
  const expected = hmac.digest("hex");
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expectedBuf);
}

/**
 * Check if this webhook represents a status change to the trigger status.
 */
export function isStatusChange(
  payload: LinearWebhookPayload,
  triggerStatus: string,
): boolean {
  if (payload.type !== "Issue" || payload.action !== "update") return false;
  const data = payload.data as LinearIssueData;
  return data.state?.name === triggerStatus;
}

/**
 * Check if this webhook is a new comment on an issue.
 */
export function isNewComment(payload: LinearWebhookPayload): boolean {
  return payload.type === "Comment" && payload.action === "create";
}
