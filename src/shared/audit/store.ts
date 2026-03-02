import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { AuditEntry } from "../../types/index.js";

const AUDIT_DIR = join(process.cwd(), "audit");

/**
 * Query interface for audit logs.
 * MVP: reads from JSON files. Later: SQLite/PostgreSQL.
 */
export async function queryAuditLogs(filter: {
  issueId?: string;
  action?: string;
  since?: Date;
}): Promise<AuditEntry[]> {
  const files = await readdir(AUDIT_DIR).catch(() => [] as string[]);
  const allEntries: AuditEntry[] = [];

  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const data = await readFile(join(AUDIT_DIR, file), "utf-8");
      const entries: AuditEntry[] = JSON.parse(data);
      allEntries.push(...entries);
    } catch {
      // Skip corrupt files
    }
  }

  return allEntries.filter((entry) => {
    if (filter.issueId && entry.issueId !== filter.issueId) return false;
    if (filter.action && !entry.action.includes(filter.action)) return false;
    if (filter.since && new Date(entry.timestamp) < filter.since) return false;
    return true;
  });
}
