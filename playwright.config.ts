import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./src/shared/testing/generated",
  timeout: 30000,
  retries: 0,
  use: {
    headless: true,
    screenshot: "on",
    trace: "on-first-retry",
  },
  reporter: [["json", { outputFile: "test-results.json" }]],
});
