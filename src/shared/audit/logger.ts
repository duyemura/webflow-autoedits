import { writeFile, readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { AuditEntry, PipelineStage } from "../../types/index.js";
import { logger } from "../logger.js";

const AUDIT_DIR = join(process.cwd(), "audit");

export class AuditLogger {
  private entries: AuditEntry[] = [];
  private runId: string;
  private issueId: string;

  constructor(runId: string, issueId: string) {
    this.runId = runId;
    this.issueId = issueId;
  }

  async log(
    stage: PipelineStage,
    action: string,
    input: unknown,
    output: unknown,
    duration: number,
    aiReasoning?: string,
  ): Promise<void> {
    const entry: AuditEntry = {
      runId: this.runId,
      issueId: this.issueId,
      timestamp: new Date(),
      stage,
      action,
      input: this.sanitize(input),
      output: this.sanitize(output),
      aiReasoning,
      duration,
    };

    this.entries.push(entry);
    logger.info({ action, stage, duration }, `Audit: ${action}`);

    await this.persist();
  }

  getEntries(): AuditEntry[] {
    return [...this.entries];
  }

  private async persist(): Promise<void> {
    try {
      await mkdir(AUDIT_DIR, { recursive: true });
      const filePath = join(AUDIT_DIR, `${this.runId}.json`);
      await writeFile(filePath, JSON.stringify(this.entries, null, 2));
    } catch (err) {
      logger.error({ err }, "Failed to persist audit log");
    }
  }

  static async load(runId: string): Promise<AuditEntry[]> {
    try {
      const filePath = join(AUDIT_DIR, `${runId}.json`);
      const data = await readFile(filePath, "utf-8");
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private sanitize(data: unknown): unknown {
    if (data === null || data === undefined) return data;
    const str = JSON.stringify(data);
    // Redact potential secrets
    return JSON.parse(
      str.replace(
        /("(?:api_key|token|secret|password|authorization)":\s*")([^"]+)(")/gi,
        '$1[REDACTED]$3',
      ),
    );
  }
}
