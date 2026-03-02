import { WebflowClient } from "../client.js";
import type { ToolRunner } from "../../../shared/ai/tool-runner.js";

/**
 * Register site-level tools on the tool runner.
 */
export function registerSiteTools(runner: ToolRunner, client: WebflowClient): void {
  runner.register(
    {
      name: "webflow_list_sites",
      description: "List all Webflow sites accessible with the current token",
      input_schema: { type: "object", properties: {}, required: [] },
    },
    async () => {
      const result = await client.listSites();
      return JSON.stringify(result.sites, null, 2);
    },
  );

  runner.register(
    {
      name: "webflow_get_site",
      description: "Get details for a specific Webflow site",
      input_schema: { type: "object", properties: { siteId: { type: "string" } }, required: ["siteId"] },
    },
    async (input) => {
      const result = await client.getSite(input.siteId as string);
      return JSON.stringify(result, null, 2);
    },
  );

  runner.register(
    {
      name: "webflow_publish_site",
      description: "Publish site to staging",
      input_schema: { type: "object", properties: { siteId: { type: "string" } }, required: ["siteId"] },
    },
    async (input) => {
      await client.publishSite(input.siteId as string);
      return "Site published to staging successfully";
    },
  );
}
