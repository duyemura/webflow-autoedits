import Anthropic from "@anthropic-ai/sdk";
import type { AgentToolDefinition, AgentToolResult } from "../../types/index.js";
import { logger } from "../logger.js";

export interface AICallOptions {
  model?: string;
  systemPrompt: string;
  userMessage?: string;
  messages?: Anthropic.MessageParam[];
  tools?: AgentToolDefinition[];
  toolHandler?: (name: string, input: Record<string, unknown>) => Promise<AgentToolResult>;
  maxTokens?: number;
  maxTurns?: number;
}

export interface AICallResult {
  text: string;
  toolCalls: { name: string; input: Record<string, unknown>; result: string }[];
  inputTokens: number;
  outputTokens: number;
  stopReason: string;
}

const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 4096;
const MAX_TURNS = 20;

export class AIClient {
  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY });
  }

  /**
   * Run an agentic tool_use loop. The AI can call tools, get results,
   * and continue reasoning until it produces a final text response or
   * hits the max turns limit.
   */
  async run(options: AICallOptions): Promise<AICallResult> {
    const {
      model = DEFAULT_MODEL,
      systemPrompt,
      tools = [],
      toolHandler,
      maxTokens = MAX_TOKENS,
      maxTurns = MAX_TURNS,
    } = options;

    const messages: Anthropic.MessageParam[] = options.messages
      ?? [{ role: "user", content: options.userMessage! }];

    const anthropicTools: Anthropic.Tool[] = tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema as Anthropic.Tool.InputSchema,
    }));

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    const allToolCalls: AICallResult["toolCalls"] = [];
    let finalText = "";
    let stopReason = "";

    for (let turn = 0; turn < maxTurns; turn++) {
      const response = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages,
        tools: anthropicTools.length > 0 ? anthropicTools : undefined,
      });

      totalInputTokens += response.usage.input_tokens;
      totalOutputTokens += response.usage.output_tokens;
      stopReason = response.stop_reason ?? "";

      // Collect text blocks
      const textBlocks = response.content.filter(
        (b): b is Anthropic.TextBlock => b.type === "text",
      );
      if (textBlocks.length > 0) {
        finalText = textBlocks.map((b) => b.text).join("\n");
      }

      // If no tool use, we're done
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
      );

      if (toolUseBlocks.length === 0 || !toolHandler) {
        break;
      }

      // Process tool calls
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        logger.debug({ tool: toolUse.name }, "AI calling tool");

        try {
          const result = await toolHandler(
            toolUse.name,
            toolUse.input as Record<string, unknown>,
          );

          allToolCalls.push({
            name: toolUse.name,
            input: toolUse.input as Record<string, unknown>,
            result: result.content,
          });

          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: result.content,
            is_error: result.is_error,
          });
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          logger.error({ tool: toolUse.name, err }, "Tool execution error");

          allToolCalls.push({
            name: toolUse.name,
            input: toolUse.input as Record<string, unknown>,
            result: `Error: ${errorMsg}`,
          });

          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: `Error: ${errorMsg}`,
            is_error: true,
          });
        }
      }

      // Add assistant message and tool results to conversation
      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: toolResults });
    }

    return {
      text: finalText,
      toolCalls: allToolCalls,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      stopReason,
    };
  }

  /**
   * Simple single-turn completion without tools.
   */
  async complete(systemPrompt: string, userMessage: string, model?: string): Promise<AICallResult> {
    return this.run({ systemPrompt, userMessage, model });
  }
}
