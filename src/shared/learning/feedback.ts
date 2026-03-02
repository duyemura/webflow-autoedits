import { KnowledgeBase } from "./knowledge-base.js";
import { logger } from "../logger.js";

const kb = new KnowledgeBase();

/**
 * Process a ticket rejection (status moved back from "In Review").
 */
export async function processRejection(
  agentName: string,
  issueId: string,
  rejectionComment: string,
): Promise<void> {
  await kb.recordCorrection(agentName, issueId, {
    what: "Ticket was rejected after review",
    expected: "Changes should have been correct",
    actual: "Human rejected the changes",
    lesson: rejectionComment,
  });

  logger.info({ issueId, agentName }, "Rejection recorded");
}

/**
 * Process an @autobot rule: command from a Linear comment.
 */
export async function processRuleCommand(
  comment: string,
  defaultAgent = "global",
): Promise<{ agent: string; rule: string } | null> {
  const match = comment.match(/@autobot\s+rule:\s*(.+)/i);
  if (!match) return null;

  const rule = match[1].trim();

  // Try to detect which agent this applies to
  let agentName = defaultAgent;
  const lowerRule = rule.toLowerCase();
  if (lowerRule.includes("webflow") || lowerRule.includes("cms") || lowerRule.includes("page")) {
    agentName = "webflow";
  } else if (lowerRule.includes("ghl") || lowerRule.includes("workflow") || lowerRule.includes("automation")) {
    agentName = "ghl";
  } else if (lowerRule.includes("linear") || lowerRule.includes("comment") || lowerRule.includes("status")) {
    agentName = "linear";
  }

  await kb.addRule(agentName, rule);
  return { agent: agentName, rule };
}
