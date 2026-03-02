import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { mcpToolDefinitions } from "./tools.js";
import { Orchestrator } from "../orchestrator/agent.js";
import { loadSiteConfig } from "../shared/config-loader.js";
import { queryAuditLogs } from "../shared/audit/store.js";
import { logger } from "../shared/logger.js";

export function createMcpServer(orchestrator: Orchestrator): Server {
  const server = new Server(
    { name: "grow-pipeline", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: mcpToolDefinitions,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "pipeline_trigger": {
        const { issueId, siteId } = args as { issueId: string; siteId: string };
        try {
          const siteConfig = await loadSiteConfig(siteId);
          await orchestrator.startRun(issueId, siteConfig);
          return {
            content: [{ type: "text" as const, text: `Pipeline triggered for issue ${issueId}` }],
          };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            content: [{ type: "text" as const, text: `Error: ${msg}` }],
            isError: true,
          };
        }
      }

      case "pipeline_status": {
        const { runId } = (args || {}) as { runId?: string };
        const runs = orchestrator.getRuns();
        const filtered = runId ? runs.filter((r) => r.id === runId) : runs;
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify(filtered, null, 2),
          }],
        };
      }

      case "pipeline_audit": {
        const { issueId, action } = (args || {}) as { issueId?: string; action?: string };
        const entries = await queryAuditLogs({ issueId, action });
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify(entries, null, 2),
          }],
        };
      }

      default:
        return {
          content: [{ type: "text" as const, text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  });

  return server;
}

export async function startMcpServer(orchestrator: Orchestrator): Promise<void> {
  const server = createMcpServer(orchestrator);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("MCP server started on stdio");
}
