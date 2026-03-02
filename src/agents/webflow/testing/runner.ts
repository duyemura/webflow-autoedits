import { writeFile, mkdir, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { TestRunner, TestSpec, TestRunResult, TestFailure } from "../../../types/test-result.js";
import type { TicketAnalysis } from "../../../types/pipeline.js";
import { AIClient } from "../../../shared/ai/client.js";
import { buildGenerateTestsPrompt } from "../prompts/generate-tests.js";
import { extractJSON } from "../../../shared/ai/parse-json.js";
import { logger } from "../../../shared/logger.js";

const exec = promisify(execFile);
const GENERATED_DIR = join(process.cwd(), "src", "shared", "testing", "generated");

export class WebflowTestRunner implements TestRunner {
  private aiClient: AIClient;
  private baseUrl: string;

  constructor(aiClient: AIClient, baseUrl: string) {
    this.aiClient = aiClient;
    this.baseUrl = baseUrl;
  }

  async generateTests(analysis: TicketAnalysis, context: string): Promise<TestSpec> {
    const systemPrompt = buildGenerateTestsPrompt(this.baseUrl);

    const userMessage = `Generate Playwright tests for these changes:

**Ticket:** ${analysis.title}
**Type:** ${analysis.ticketType}
**Requirements:**
${analysis.requirements.map((r) => `- ${r}`).join("\n")}

**Target Resources:**
${analysis.targetResources.map((r) => `- ${r.action} ${r.type}: ${r.name}`).join("\n")}

**Context:**
${context}`;

    const result = await this.aiClient.complete(systemPrompt, userMessage);

    try {
      const parsed = extractJSON<any>(result.text);
      const testFilePath = join(GENERATED_DIR, `test-${analysis.issueId}.spec.ts`);

      return {
        runId: analysis.issueId,
        testCode: parsed.testCode,
        testFilePath,
        expectations: parsed.expectations || [],
      };
    } catch {
      throw new Error("Failed to parse test generation response");
    }
  }

  async runTests(spec: TestSpec): Promise<TestRunResult> {
    // Write the test file
    await mkdir(GENERATED_DIR, { recursive: true });
    await writeFile(spec.testFilePath, spec.testCode);

    const startTime = Date.now();
    let result: TestRunResult;

    try {
      // Run Playwright tests
      const { stdout } = await exec("npx", [
        "playwright",
        "test",
        spec.testFilePath,
        "--reporter=json",
      ], {
        cwd: process.cwd(),
        timeout: 60_000,
      });

      const duration = Date.now() - startTime;

      try {
        const report = JSON.parse(stdout);
        result = this.parsePlaywrightReport(report, duration);
      } catch {
        result = {
          passed: true,
          totalTests: 1,
          passedTests: 1,
          failedTests: 0,
          failures: [],
          duration,
          screenshots: [],
        };
      }
    } catch (err: any) {
      const duration = Date.now() - startTime;

      // Playwright exits with non-zero on test failures
      if (err.stdout) {
        try {
          const report = JSON.parse(err.stdout);
          result = this.parsePlaywrightReport(report, duration);
        } catch {
          result = {
            passed: false,
            totalTests: 1,
            passedTests: 0,
            failedTests: 1,
            failures: [{
              testName: "test execution",
              error: err.stderr || err.message || String(err),
            }],
            duration,
            screenshots: [],
          };
        }
      } else {
        result = {
          passed: false,
          totalTests: 1,
          passedTests: 0,
          failedTests: 1,
          failures: [{
            testName: "test execution",
            error: err.stderr || err.message || String(err),
          }],
          duration: Date.now() - startTime,
          screenshots: [],
        };
      }
    }

    // If no screenshots from JSON report, collect from filesystem
    if (result.screenshots.length === 0) {
      result.screenshots = await this.collectScreenshots();
    }

    return result;
  }

  private parsePlaywrightReport(report: any, duration: number): TestRunResult {
    const suites = report.suites || [];
    const failures: TestFailure[] = [];
    const screenshots: string[] = [];
    let totalTests = 0;
    let passedTests = 0;

    const processSpecs = (specs: any[]) => {
      for (const spec of specs) {
        for (const test of spec.tests || []) {
          totalTests++;
          const result = test.results?.[0];
          if (result?.status === "passed") {
            passedTests++;
          } else {
            failures.push({
              testName: spec.title || "unknown",
              error: result?.error?.message || "Test failed",
              expected: result?.error?.expected,
              actual: result?.error?.actual,
            });
          }
          // Collect screenshot attachments
          for (const attachment of result?.attachments || []) {
            if (attachment.contentType?.startsWith("image/") && attachment.path) {
              screenshots.push(attachment.path);
            }
          }
        }
      }
    };

    for (const suite of suites) {
      processSpecs(suite.specs || []);
      for (const child of suite.suites || []) {
        processSpecs(child.specs || []);
      }
    }

    return {
      passed: failures.length === 0,
      totalTests,
      passedTests,
      failedTests: failures.length,
      failures,
      duration,
      screenshots,
    };
  }

  /**
   * Collect screenshot file paths from Playwright's test-results directory.
   * Fallback if the JSON report doesn't include attachment paths.
   */
  private async collectScreenshots(): Promise<string[]> {
    const resultsDir = join(process.cwd(), "test-results");
    const screenshots: string[] = [];

    try {
      const entries = await readdir(resultsDir, { recursive: true });
      for (const entry of entries) {
        const entryStr = String(entry);
        if (entryStr.endsWith(".png") || entryStr.endsWith(".jpg")) {
          screenshots.push(join(resultsDir, entryStr));
        }
      }
    } catch {
      // test-results dir may not exist
    }

    return screenshots;
  }
}
