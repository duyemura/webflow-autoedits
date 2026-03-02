import type { TicketAnalysis } from "./pipeline.js";

export interface TestSpec {
  runId: string;
  testCode: string;
  testFilePath: string;
  expectations: string[];
}

export interface TestRunResult {
  passed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  failures: TestFailure[];
  duration: number;
  screenshots: string[];
}

export interface TestFailure {
  testName: string;
  error: string;
  expected?: string;
  actual?: string;
}

export interface TestRunner {
  generateTests(analysis: TicketAnalysis, context: string): Promise<TestSpec>;
  runTests(spec: TestSpec): Promise<TestRunResult>;
}
