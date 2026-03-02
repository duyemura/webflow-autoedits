import type { TestRunResult } from "../../types/test-result.js";
import type { ChangePlan } from "../../types/pipeline.js";

/**
 * Format pipeline data into readable Linear comments.
 */
export function formatTestResults(results: TestRunResult): string {
  const status = results.passed ? "✅ All tests passed" : "❌ Some tests failed";
  const lines = [
    `**Test Results:** ${status}`,
    `- Total: ${results.totalTests}`,
    `- Passed: ${results.passedTests}`,
    `- Failed: ${results.failedTests}`,
    `- Duration: ${(results.duration / 1000).toFixed(1)}s`,
  ];

  if (results.failures.length > 0) {
    lines.push("", "**Failures:**");
    for (const f of results.failures) {
      lines.push(`- \`${f.testName}\`: ${f.error}`);
    }
  }

  return lines.join("\n");
}

export function formatChangePlan(plan: ChangePlan): string {
  const lines = [
    `**Change Plan** (${plan.steps.length} steps, ~${plan.estimatedApiCalls} API calls)`,
    "",
    plan.reasoning,
    "",
    "**Steps:**",
  ];

  for (const step of plan.steps) {
    lines.push(`${step.order}. ${step.description} (\`${step.apiCall}\`)`);
  }

  return lines.join("\n");
}

export function formatError(stage: string, error: string): string {
  return `❌ **Failed at \`${stage}\`**\n\n\`\`\`\n${error}\n\`\`\``;
}

export function formatNeedsInfo(questions: string[]): string {
  return [
    "❓ **Needs clarification:**",
    "",
    ...questions.map((q) => `- ${q}`),
    "",
    "_Please reply with the answers and I'll continue processing._",
  ].join("\n");
}
