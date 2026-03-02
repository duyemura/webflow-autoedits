/**
 * Webhook deduplication. Prevents processing duplicate Linear webhooks.
 */
export class Dedup {
  private seen = new Map<string, number>();
  private ttlMs: number;

  constructor(ttlMs = 5 * 60 * 1000) {
    this.ttlMs = ttlMs;
  }

  /**
   * Returns true if this key has been seen recently (duplicate).
   */
  isDuplicate(key: string): boolean {
    this.cleanup();
    return this.seen.has(key);
  }

  /**
   * Mark a key as seen.
   */
  mark(key: string): void {
    this.seen.set(key, Date.now());
  }

  /**
   * Build dedup key from issue ID and webhook action.
   */
  static key(issueId: string, action: string): string {
    return `${issueId}:${action}`;
  }

  private cleanup(): void {
    const cutoff = Date.now() - this.ttlMs;
    for (const [key, timestamp] of this.seen) {
      if (timestamp < cutoff) this.seen.delete(key);
    }
  }
}
