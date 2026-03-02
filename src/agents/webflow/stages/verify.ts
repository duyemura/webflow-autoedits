import type { AgentContext, AgentResult } from "../../../types/index.js";
import type { TestSpec } from "../../../types/test-result.js";
import { WebflowTestRunner } from "../testing/runner.js";
import { AIClient } from "../../../shared/ai/client.js";

export async function verifyStage(
  context: AgentContext,
  aiClient: AIClient,
  testSpec: TestSpec,
): Promise<AgentResult> {
  const { siteConfig } = context;
  const testRunner = new WebflowTestRunner(aiClient, siteConfig.testing.baseUrl);

  const testResults = await testRunner.runTests(testSpec);

  return {
    success: testResults.passed,
    stage: "green-test",
    testResults,
    data: {
      totalTests: testResults.totalTests,
      passedTests: testResults.passedTests,
      failedTests: testResults.failedTests,
      failures: testResults.failures,
    },
    error: testResults.passed
      ? undefined
      : `${testResults.failedTests}/${testResults.totalTests} tests failed: ${testResults.failures.map((f) => f.testName).join(", ")}`,
  };
}
