import type { AgentToolDefinition, AgentToolResult } from "../../types/index.js";
import { logger } from "../logger.js";

export type ToolExecutor = (input: Record<string, unknown>) => Promise<string>;

/**
 * Registry of tool implementations. Maps tool names to executor functions.
 * Used by the AI client's toolHandler to dispatch tool calls.
 */
export class ToolRunner {
  private tools = new Map<string, ToolExecutor>();
  private definitions: AgentToolDefinition[] = [];

  register(definition: AgentToolDefinition, executor: ToolExecutor): void {
    this.tools.set(definition.name, executor);
    this.definitions.push(definition);
    logger.debug({ tool: definition.name }, "Tool registered");
  }

  getDefinitions(): AgentToolDefinition[] {
    return [...this.definitions];
  }

  async execute(name: string, input: Record<string, unknown>): Promise<AgentToolResult> {
    const executor = this.tools.get(name);
    if (!executor) {
      return {
        tool_use_id: "",
        content: `Unknown tool: ${name}`,
        is_error: true,
      };
    }

    try {
      const result = await executor(input);
      return { tool_use_id: "", content: result };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { tool_use_id: "", content: `Tool error: ${msg}`, is_error: true };
    }
  }

  /**
   * Create a toolHandler function compatible with AIClient.run().
   */
  createHandler(): (name: string, input: Record<string, unknown>) => Promise<AgentToolResult> {
    return async (name, input) => this.execute(name, input);
  }
}
