import type { AgentToolDefinition } from "../../../types/index.js";

export const webflowToolDefinitions: AgentToolDefinition[] = [
  {
    name: "webflow_list_collections",
    description: "List all CMS collections for the site. Returns collection IDs, names, and slugs.",
    input_schema: {
      type: "object",
      properties: {
        siteId: { type: "string", description: "The Webflow site ID" },
      },
      required: ["siteId"],
    },
  },
  {
    name: "webflow_get_collection",
    description: "Get details about a specific collection, including its fields/schema.",
    input_schema: {
      type: "object",
      properties: {
        collectionId: { type: "string", description: "The collection ID" },
      },
      required: ["collectionId"],
    },
  },
  {
    name: "webflow_list_items",
    description: "List items in a CMS collection. Returns field data for each item.",
    input_schema: {
      type: "object",
      properties: {
        collectionId: { type: "string", description: "The collection ID" },
        limit: { type: "number", description: "Max items to return (default 100)" },
      },
      required: ["collectionId"],
    },
  },
  {
    name: "webflow_get_item",
    description: "Get a specific CMS item by ID.",
    input_schema: {
      type: "object",
      properties: {
        collectionId: { type: "string", description: "The collection ID" },
        itemId: { type: "string", description: "The item ID" },
      },
      required: ["collectionId", "itemId"],
    },
  },
  {
    name: "webflow_create_item",
    description: "Create a new CMS item in a collection.",
    input_schema: {
      type: "object",
      properties: {
        collectionId: { type: "string", description: "The collection ID" },
        fields: {
          type: "object",
          description: "Field values for the new item. Keys are field slugs.",
        },
        isDraft: { type: "boolean", description: "Create as draft (default false)" },
      },
      required: ["collectionId", "fields"],
    },
  },
  {
    name: "webflow_update_item",
    description: "Update an existing CMS item's fields.",
    input_schema: {
      type: "object",
      properties: {
        collectionId: { type: "string", description: "The collection ID" },
        itemId: { type: "string", description: "The item ID" },
        fields: {
          type: "object",
          description: "Field values to update. Keys are field slugs. Only include fields you want to change.",
        },
      },
      required: ["collectionId", "itemId", "fields"],
    },
  },
  {
    name: "webflow_delete_item",
    description: "Delete a CMS item.",
    input_schema: {
      type: "object",
      properties: {
        collectionId: { type: "string", description: "The collection ID" },
        itemId: { type: "string", description: "The item ID" },
      },
      required: ["collectionId", "itemId"],
    },
  },
  {
    name: "webflow_list_pages",
    description: "List all pages for the site.",
    input_schema: {
      type: "object",
      properties: {
        siteId: { type: "string", description: "The Webflow site ID" },
      },
      required: ["siteId"],
    },
  },
  {
    name: "webflow_get_page_content",
    description: "Get the DOM content of a page. Returns all text nodes and elements.",
    input_schema: {
      type: "object",
      properties: {
        pageId: { type: "string", description: "The page ID" },
      },
      required: ["pageId"],
    },
  },
  {
    name: "webflow_update_page_content",
    description: "Update DOM nodes on a page. Used to change text content.",
    input_schema: {
      type: "object",
      properties: {
        pageId: { type: "string", description: "The page ID" },
        nodes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              nodeId: { type: "string" },
              text: { type: "object", properties: { text: { type: "string" } } },
            },
          },
          description: "Array of DOM nodes to update",
        },
      },
      required: ["pageId", "nodes"],
    },
  },
  {
    name: "webflow_publish_site",
    description: "Publish the site to the staging subdomain (webflow.io).",
    input_schema: {
      type: "object",
      properties: {
        siteId: { type: "string", description: "The Webflow site ID" },
      },
      required: ["siteId"],
    },
  },
];
