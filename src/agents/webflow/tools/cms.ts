import { WebflowClient } from "../client.js";
import type { ToolRunner } from "../../../shared/ai/tool-runner.js";

/**
 * Register CMS-related tools on the tool runner.
 */
export function registerCmsTools(runner: ToolRunner, client: WebflowClient): void {
  runner.register(
    {
      name: "webflow_list_collections",
      description: "List all CMS collections",
      input_schema: { type: "object", properties: { siteId: { type: "string" } }, required: ["siteId"] },
    },
    async (input) => {
      const result = await client.listCollections(input.siteId as string);
      return JSON.stringify(result.collections, null, 2);
    },
  );

  runner.register(
    {
      name: "webflow_get_collection",
      description: "Get collection details",
      input_schema: { type: "object", properties: { collectionId: { type: "string" } }, required: ["collectionId"] },
    },
    async (input) => {
      const result = await client.getCollection(input.collectionId as string);
      return JSON.stringify(result, null, 2);
    },
  );

  runner.register(
    {
      name: "webflow_list_items",
      description: "List items in collection",
      input_schema: { type: "object", properties: { collectionId: { type: "string" }, limit: { type: "number" } }, required: ["collectionId"] },
    },
    async (input) => {
      const result = await client.listItems(
        input.collectionId as string,
        (input.limit as number) || 100,
      );
      return JSON.stringify(result, null, 2);
    },
  );

  runner.register(
    {
      name: "webflow_get_item",
      description: "Get a CMS item",
      input_schema: { type: "object", properties: { collectionId: { type: "string" }, itemId: { type: "string" } }, required: ["collectionId", "itemId"] },
    },
    async (input) => {
      const result = await client.getItem(
        input.collectionId as string,
        input.itemId as string,
      );
      return JSON.stringify(result, null, 2);
    },
  );

  runner.register(
    {
      name: "webflow_create_item",
      description: "Create a CMS item",
      input_schema: { type: "object", properties: { collectionId: { type: "string" }, fields: { type: "object" }, isDraft: { type: "boolean" } }, required: ["collectionId", "fields"] },
    },
    async (input) => {
      const result = await client.createItem(
        input.collectionId as string,
        input.fields as Record<string, unknown>,
        input.isDraft as boolean,
      );
      return JSON.stringify(result, null, 2);
    },
  );

  runner.register(
    {
      name: "webflow_update_item",
      description: "Update a CMS item",
      input_schema: { type: "object", properties: { collectionId: { type: "string" }, itemId: { type: "string" }, fields: { type: "object" } }, required: ["collectionId", "itemId", "fields"] },
    },
    async (input) => {
      const result = await client.updateItem(
        input.collectionId as string,
        input.itemId as string,
        input.fields as Record<string, unknown>,
      );
      return JSON.stringify(result, null, 2);
    },
  );

  runner.register(
    {
      name: "webflow_delete_item",
      description: "Delete a CMS item",
      input_schema: { type: "object", properties: { collectionId: { type: "string" }, itemId: { type: "string" } }, required: ["collectionId", "itemId"] },
    },
    async (input) => {
      await client.deleteItem(
        input.collectionId as string,
        input.itemId as string,
      );
      return "Item deleted successfully";
    },
  );
}
