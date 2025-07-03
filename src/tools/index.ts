import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { TaskAgentClient } from '../clients/task-agent-client.js';
import { BuildClient } from '../clients/build-client.js';
import { PipelineClient } from '../clients/pipeline-client.js';
import { createAgentTools } from './agent-tools.js';
import { createBuildTools } from './build-tools.js';

export interface ToolRegistry {
  tools: Tool[];
  handlers: Map<string, (args: unknown) => Promise<unknown>>;
}

export function createToolRegistry(
  taskAgentClient: TaskAgentClient,
  buildClient: BuildClient,
  pipelineClient: PipelineClient
): ToolRegistry {
  // Create tool definitions
  const agentTools = createAgentTools(taskAgentClient);
  const buildTools = createBuildTools(buildClient, pipelineClient);

  // Combine all tools
  const allTools = {
    ...agentTools,
    ...buildTools,
  };

  // Extract tools and handlers
  const tools: Tool[] = [];
  const handlers = new Map<string, (args: unknown) => Promise<unknown>>();

  Object.entries(allTools).forEach(([name, definition]) => {
    tools.push(definition.tool);
    handlers.set(name, definition.handler);
  });

  return { tools, handlers };
}