export interface AgentToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface AgentToolResult {
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}
