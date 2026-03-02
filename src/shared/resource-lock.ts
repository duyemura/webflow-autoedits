import { logger } from "./logger.js";

interface Lock {
  key: string;
  runId: string;
  acquiredAt: number;
  expiresAt: number;
}

const LOCK_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * In-memory resource lock to prevent concurrent edits to the same resource.
 * MVP implementation — replace with Redis for distributed locking.
 */
export class ResourceLock {
  private locks = new Map<string, Lock>();

  /**
   * Build a lock key from platform, site, and resource identifiers.
   */
  static key(platform: string, siteId: string, resourceId: string): string {
    return `${platform}:${siteId}:${resourceId}`;
  }

  /**
   * Attempt to acquire a lock. Returns true if acquired.
   */
  acquire(key: string, runId: string): boolean {
    this.cleanup();

    const existing = this.locks.get(key);
    if (existing && existing.runId !== runId) {
      logger.warn({ key, runId, heldBy: existing.runId }, "Resource locked by another run");
      return false;
    }

    this.locks.set(key, {
      key,
      runId,
      acquiredAt: Date.now(),
      expiresAt: Date.now() + LOCK_TTL_MS,
    });
    logger.debug({ key, runId }, "Lock acquired");
    return true;
  }

  /**
   * Release a lock.
   */
  release(key: string, runId: string): void {
    const lock = this.locks.get(key);
    if (lock && lock.runId === runId) {
      this.locks.delete(key);
      logger.debug({ key, runId }, "Lock released");
    }
  }

  /**
   * Wait for a lock to become available, with timeout.
   */
  async waitAndAcquire(
    key: string,
    runId: string,
    timeoutMs = 60_000,
    pollMs = 1_000,
  ): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (this.acquire(key, runId)) return true;
      await new Promise((r) => setTimeout(r, pollMs));
    }
    return false;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, lock] of this.locks) {
      if (lock.expiresAt < now) {
        this.locks.delete(key);
        logger.warn({ key, runId: lock.runId }, "Expired lock cleaned up");
      }
    }
  }
}
