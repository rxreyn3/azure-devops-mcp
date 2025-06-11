import { Tool } from '@modelcontextprotocol/sdk/types.js';

export interface ToolDefinition {
  tool: Tool;
  handler: (args: unknown) => Promise<{
    content: Array<{
      type: 'text';
      text: string;
    }>;
  }>;
}

export interface ToolResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
}

export interface ToolRegistry {
  [toolName: string]: ToolDefinition;
}