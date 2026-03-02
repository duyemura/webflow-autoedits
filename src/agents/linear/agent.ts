import { LinearClient } from "../../shared/linear/client.js";
import { logger } from "../../shared/logger.js";

/**
 * Linear Agent — shared communication service for all agents.
 * Handles ticket reading, commenting, status updates, and attachments.
 * Has its own rules about formatting, verbosity, and when to comment.
 */
export class LinearAgent {
  private client: LinearClient;

  constructor(client?: LinearClient) {
    this.client = client || new LinearClient();
  }

  async getIssue(issueId: string) {
    return this.client.getIssue(issueId);
  }

  async postStageUpdate(
    issueId: string,
    stage: string,
    agentName: string,
    message: string,
  ): Promise<void> {
    const formatted = this.formatStageComment(stage, agentName, message);
    await this.client.createComment(issueId, formatted);
  }

  async postError(
    issueId: string,
    stage: string,
    agentName: string,
    error: string,
  ): Promise<void> {
    const body = `❌ **${agentName}** — Error at \`${stage}\`\n\n\`\`\`\n${error}\n\`\`\``;
    await this.client.createComment(issueId, body);
  }

  async postSummary(
    issueId: string,
    agentName: string,
    summary: string,
  ): Promise<void> {
    const body = `📋 **${agentName} — Summary**\n\n${summary}`;
    await this.client.createComment(issueId, body);
  }

  async updateStatus(
    issueId: string,
    teamId: string,
    statusName: string,
  ): Promise<void> {
    await this.client.updateIssueStatus(issueId, teamId, statusName);
  }

  async attachFile(
    issueId: string,
    url: string,
    title: string,
  ): Promise<void> {
    await this.client.createAttachment(issueId, url, title);
  }

  async getComments(issueId: string) {
    return this.client.getComments(issueId);
  }

  private formatStageComment(
    stage: string,
    agentName: string,
    message: string,
  ): string {
    const timestamp = new Date().toISOString().replace("T", " ").split(".")[0];
    return `⚙️ **${agentName}** — \`${stage}\` — _${timestamp}_\n\n${message}`;
  }
}
