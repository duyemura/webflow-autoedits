import { KnowledgeBase } from "./knowledge-base.js";

const kb = new KnowledgeBase();

/**
 * Build AI context from the knowledge base for a specific agent run.
 * This context is included in every AI prompt to give the agent
 * accumulated institutional knowledge.
 */
export async function buildKnowledgeContext(
  agentName: string,
  siteId?: string,
  ticketType?: string,
): Promise<string> {
  const sections: string[] = [];

  // Global + agent rules
  const rules = await kb.getRules(agentName);
  if (rules) {
    sections.push("## Rules\n" + rules);
  }

  // Ticket-type patterns
  if (ticketType) {
    const patterns = await kb.getPatterns(agentName, ticketType);
    if (patterns) {
      sections.push("## Learned Patterns\n" + patterns);
    }
  }

  // Site-specific rules
  if (siteId) {
    const siteRules = await kb.getSiteRules(agentName, siteId);
    if (siteRules) {
      sections.push("## Site-Specific Rules\n" + siteRules);
    }
  }

  return sections.join("\n\n");
}
