import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { TaskAgentClient } from '../clients/task-agent-client.js';
import { createAgentTools } from './agent-tools.js';

export interface ToolRegistry {
  tools: Tool[];
  handlers: Map<string, (args: unknown) => Promise<unknown>>;
}

export function createToolRegistry(
  taskAgentClient: TaskAgentClient
): ToolRegistry {
  // Create agent tool definitions
  const agentTools = createAgentTools(taskAgentClient);

  // Extract tools and handlers
  const tools: Tool[] = [];
  const handlers = new Map<string, (args: unknown) => Promise<unknown>>();

  Object.entries(agentTools).forEach(([name, definition]) => {
    tools.push(definition.tool);
    handlers.set(name, definition.handler);
  });

  return { tools, handlers };
}