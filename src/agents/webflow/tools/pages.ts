import { WebflowClient } from "../client.js";
import type { ToolRunner } from "../../../shared/ai/tool-runner.js";

/**
 * Register page-related tools on the tool runner.
 */
export function registerPageTools(runner: ToolRunner, client: WebflowClient): void {
  runner.register(
    {
      name: "webflow_list_pages",
      description: "List all pages",
      input_schema: { type: "object", properties: { siteId: { type: "string" } }, required: ["siteId"] },
    },
    async (input) => {
      const result = await client.listPages(input.siteId as string);
      return JSON.stringify(result.pages, null, 2);
    },
  );

  runner.register(
    {
      name: "webflow_get_page_content",
      description: "Get page DOM content",
      input_schema: { type: "object", properties: { pageId: { type: "string" } }, required: ["pageId"] },
    },
    async (input) => {
      const result = await client.getPageContent(input.pageId as string);
      return JSON.stringify(result, null, 2);
    },
  );

  runner.register(
    {
      name: "webflow_update_page_content",
      description: "Update page DOM nodes",
      input_schema: { type: "object", properties: { pageId: { type: "string" }, nodes: { type: "array" } }, required: ["pageId", "nodes"] },
    },
    async (input) => {
      await client.updatePageContent(
        input.pageId as string,
        input.nodes as any[],
      );
      return "Page content updated successfully";
    },
  );
}
