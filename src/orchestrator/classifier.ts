import type { TicketAnalysis, Platform } from "../types/index.js";
import type { LinearIssue } from "../shared/linear/client.js";
import { AIClient } from "../shared/ai/client.js";
import { buildClassificationPrompt } from "./prompts/classify-ticket.js";
import { extractJSON } from "../shared/ai/parse-json.js";
import { logger } from "../shared/logger.js";

export interface ClassificationResult extends TicketAnalysis {
  rawResponse: string;
}

export async function classifyTicket(
  issue: LinearIssue,
  aiClient: AIClient,
  knowledgeContext: string,
  model?: string,
): Promise<ClassificationResult> {
  const systemPrompt = buildClassificationPrompt(knowledgeContext);

  const userMessage = `Classify this ticket:

**Title:** ${issue.title}

**Description:**
${issue.description || "(no description)"}

**Labels:** ${issue.labels.nodes.map((l) => l.name).join(", ") || "(none)"}

**Priority:** ${issue.priority}

**Comments:**
${issue.comments.nodes.map((c) => `- ${c.body}`).join("\n") || "(no comments)"}`;

  const result = await aiClient.complete(systemPrompt, userMessage, model);

  try {
    const parsed = extractJSON<any>(result.text);

    const analysis: ClassificationResult = {
      issueId: issue.id,
      title: issue.title,
      description: issue.description || "",
      platform: parsed.platform as Platform,
      ticketType: parsed.ticketType,
      confidence: parsed.confidence,
      requirements: parsed.requirements || [],
      targetResources: parsed.targetResources || [],
      ambiguities: parsed.ambiguities || [],
      reasoning: parsed.reasoning || "",
      rawResponse: result.text,
    };

    logger.info(
      {
        issueId: issue.identifier,
        platform: analysis.platform,
        ticketType: analysis.ticketType,
        confidence: analysis.confidence,
      },
      "Ticket classified",
    );

    return analysis;
  } catch (err) {
    logger.error({ err, response: result.text }, "Failed to parse classification response");
    throw new Error(`Classification failed: could not parse AI response`);
  }
}
