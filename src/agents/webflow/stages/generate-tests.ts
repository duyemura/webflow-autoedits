import type { AgentContext, AgentResult } from "../../../types/index.js";
import { WebflowTestRunner } from "../testing/runner.js";
import { AIClient } from "../../../shared/ai/client.js";

export async function generateTestsStage(
  context: AgentContext,
  aiClient: AIClient,
): Promise<AgentResult> {
  const { run, siteConfig } = context;
  const analysis = run.ticketAnalysis;
  if (!analysis) {
    return { success: false, stage: "generating-tests", error: "No ticket analysis" };
  }

  const testRunner = new WebflowTestRunner(aiClient, siteConfig.testing.baseUrl);

  try {
    const testSpec = await testRunner.generateTests(analysis, context.knowledgeContext);

    return {
      success: true,
      stage: "generating-tests",
      data: {
        testFilePath: testSpec.testFilePath,
        expectations: testSpec.expectations,
        testSpec,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, stage: "generating-tests", error: msg };
  }
}
