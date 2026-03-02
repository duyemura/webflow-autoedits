/**
 * MCP tool definitions for manual pipeline invocation from Claude Code.
 */
export const mcpToolDefinitions = [
  {
    name: "pipeline_trigger",
    description: "Trigger the pipeline for a specific Linear issue. Starts the orchestrator to classify and route the ticket.",
    inputSchema: {
      type: "object" as const,
      properties: {
        issueId: {
          type: "string",
          description: "The Linear issue ID to process",
        },
        siteId: {
          type: "string",
          description: "The site config ID to use (e.g., 'pushpress-main')",
        },
      },
      required: ["issueId", "siteId"],
    },
  },
  {
    name: "pipeline_status",
    description: "Get the status of all pipeline runs, or a specific run by ID.",
    inputSchema: {
      type: "object" as const,
      properties: {
        runId: {
          type: "string",
          description: "Optional run ID to get status for a specific run",
        },
      },
    },
  },
  {
    name: "pipeline_audit",
    description: "Query audit logs for pipeline actions.",
    inputSchema: {
      type: "object" as const,
      properties: {
        issueId: {
          type: "string",
          description: "Filter by Linear issue ID",
        },
        action: {
          type: "string",
          description: "Filter by action name (e.g., 'webflow.cms.updateItem')",
        },
      },
    },
  },
];
