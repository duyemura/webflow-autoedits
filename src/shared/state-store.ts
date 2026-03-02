import type { PipelineRun } from "../types/index.js";
import { logger } from "./logger.js";

/**
 * In-memory state store for pipeline runs.
 * MVP implementation — replace with SQLite/PostgreSQL for persistence.
 */
export class StateStore {
  private runs = new Map<string, PipelineRun>();

  save(run: PipelineRun): void {
    run.updatedAt = new Date();
    this.runs.set(run.id, { ...run });
    logger.debug({ runId: run.id, stage: run.currentStage }, "State saved");
  }

  get(runId: string): PipelineRun | undefined {
    const run = this.runs.get(runId);
    return run ? { ...run } : undefined;
  }

  getByIssueId(issueId: string): PipelineRun | undefined {
    for (const run of this.runs.values()) {
      if (run.issueId === issueId) return { ...run };
    }
    return undefined;
  }

  getAll(): PipelineRun[] {
    return Array.from(this.runs.values()).map((r) => ({ ...r }));
  }

  getByStatus(status: PipelineRun["status"]): PipelineRun[] {
    return this.getAll().filter((r) => r.status === status);
  }

  delete(runId: string): boolean {
    return this.runs.delete(runId);
  }

  /**
   * Find runs that haven't been updated within the timeout period
   */
  getStaleRuns(timeoutMinutes: number): PipelineRun[] {
    const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000);
    return this.getAll().filter(
      (r) => r.status === "running" && r.updatedAt < cutoff,
    );
  }
}
