import { readFile, writeFile, appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { logger } from "../logger.js";

const KNOWLEDGE_DIR = join(process.cwd(), "knowledge");

/**
 * Read/write knowledge base files.
 */
export class KnowledgeBase {
  /**
   * Read a knowledge file. Returns empty string if not found.
   */
  async read(path: string): Promise<string> {
    try {
      return await readFile(join(KNOWLEDGE_DIR, path), "utf-8");
    } catch {
      return "";
    }
  }

  /**
   * Write a knowledge file (creates directories as needed).
   */
  async write(path: string, content: string): Promise<void> {
    const fullPath = join(KNOWLEDGE_DIR, path);
    await mkdir(join(fullPath, ".."), { recursive: true });
    await writeFile(fullPath, content);
    logger.info({ path }, "Knowledge base updated");
  }

  /**
   * Append to a knowledge file.
   */
  async append(path: string, content: string): Promise<void> {
    const fullPath = join(KNOWLEDGE_DIR, path);
    await mkdir(join(fullPath, ".."), { recursive: true });
    await appendFile(fullPath, `\n${content}`);
  }

  /**
   * Get all rules for an agent (global + agent-specific).
   */
  async getRules(agentName: string): Promise<string> {
    const global = await this.read("global/rules.md");
    const agentRules = await this.read(`${agentName}/rules.md`);
    return [global, agentRules].filter(Boolean).join("\n\n---\n\n");
  }

  /**
   * Get patterns for a specific ticket type.
   */
  async getPatterns(agentName: string, ticketType: string): Promise<string> {
    return this.read(`${agentName}/patterns/${ticketType}.md`);
  }

  /**
   * Get site-specific rules.
   */
  async getSiteRules(agentName: string, siteId: string): Promise<string> {
    return this.read(`${agentName}/site-specific/${siteId}.md`);
  }

  /**
   * Record a correction (from human rejection feedback).
   */
  async recordCorrection(
    agentName: string,
    issueId: string,
    correction: {
      what: string;
      expected: string;
      actual: string;
      lesson: string;
    },
  ): Promise<void> {
    const content = [
      `# Correction: ${issueId}`,
      `**Date:** ${new Date().toISOString()}`,
      `**What happened:** ${correction.what}`,
      `**Expected:** ${correction.expected}`,
      `**Actual:** ${correction.actual}`,
      `**Lesson:** ${correction.lesson}`,
    ].join("\n");

    await this.write(`${agentName}/corrections/${issueId}.md`, content);
  }

  /**
   * Add a rule from @autobot rule: command.
   */
  async addRule(agentName: string, rule: string): Promise<void> {
    await this.append(`${agentName}/rules.md`, `\n- ${rule}`);
    logger.info({ agentName, rule }, "Rule added via @autobot command");
  }
}
