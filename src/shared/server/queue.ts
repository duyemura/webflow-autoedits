import { logger } from "../logger.js";

export interface Job<T = unknown> {
  id: string;
  data: T;
  createdAt: Date;
  status: "queued" | "running" | "completed" | "failed";
}

type JobHandler<T> = (job: Job<T>) => Promise<void>;

/**
 * Simple in-memory job queue with concurrency control.
 * MVP implementation — replace with BullMQ + Redis for production.
 */
export class JobQueue<T = unknown> {
  private queue: Job<T>[] = [];
  private running = 0;
  private maxConcurrent: number;
  private handler: JobHandler<T>;

  constructor(handler: JobHandler<T>, maxConcurrent = 3) {
    this.handler = handler;
    this.maxConcurrent = maxConcurrent;
  }

  async add(id: string, data: T): Promise<Job<T>> {
    const job: Job<T> = {
      id,
      data,
      createdAt: new Date(),
      status: "queued",
    };
    this.queue.push(job);
    logger.info({ jobId: id }, "Job added to queue");
    this.processNext();
    return job;
  }

  private async processNext(): Promise<void> {
    if (this.running >= this.maxConcurrent) return;

    const job = this.queue.find((j) => j.status === "queued");
    if (!job) return;

    this.running++;
    job.status = "running";
    logger.info({ jobId: job.id }, "Job started");

    try {
      await this.handler(job);
      job.status = "completed";
      logger.info({ jobId: job.id }, "Job completed");
    } catch (err) {
      job.status = "failed";
      logger.error({ jobId: job.id, err }, "Job failed");
    } finally {
      this.running--;
      this.processNext();
    }
  }

  getStatus(): { queued: number; running: number; completed: number; failed: number } {
    return {
      queued: this.queue.filter((j) => j.status === "queued").length,
      running: this.queue.filter((j) => j.status === "running").length,
      completed: this.queue.filter((j) => j.status === "completed").length,
      failed: this.queue.filter((j) => j.status === "failed").length,
    };
  }
}
