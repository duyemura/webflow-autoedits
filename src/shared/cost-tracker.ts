import type { RunCost } from "../types/index.js";
import { logger } from "./logger.js";

// Approximate pricing per million tokens (Claude Sonnet)
const INPUT_COST_PER_M = 3.0;
const OUTPUT_COST_PER_M = 15.0;

export class CostTracker {
  private costs = new Map<string, RunCost>();

  init(runId: string, issueId: string): void {
    this.costs.set(runId, {
      runId,
      issueId,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCost: 0,
      apiCalls: 0,
      breakdown: [],
    });
  }

  track(
    runId: string,
    stage: string,
    inputTokens: number,
    outputTokens: number,
  ): void {
    const cost = this.costs.get(runId);
    if (!cost) return;

    const stageCost =
      (inputTokens / 1_000_000) * INPUT_COST_PER_M +
      (outputTokens / 1_000_000) * OUTPUT_COST_PER_M;

    cost.inputTokens += inputTokens;
    cost.outputTokens += outputTokens;
    cost.estimatedCost += stageCost;
    cost.apiCalls += 1;
    cost.breakdown.push({
      stage,
      tokens: inputTokens + outputTokens,
      cost: stageCost,
    });

    logger.debug(
      { runId, stage, inputTokens, outputTokens, totalCost: cost.estimatedCost },
      "Cost tracked",
    );
  }

  get(runId: string): RunCost | undefined {
    return this.costs.get(runId);
  }

  isOverBudget(runId: string, maxCost: number): boolean {
    const cost = this.costs.get(runId);
    return cost ? cost.estimatedCost > maxCost : false;
  }
}
