import { ToolDefinition } from '../types/tool-types.js';
import { TaskAgentClient } from '../clients/task-agent-client.js';
import { formatErrorResponse } from '../utils/formatters.js';

export function createAgentTools(client: TaskAgentClient): Record<string, ToolDefinition> {
  return {
    ado_health_check: {
      tool: {
        name: 'ado_health_check',
        description: 'Check connection to Azure DevOps and verify permissions',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      handler: async () => {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'connected',
                  message: 'Azure DevOps MCP server is running',
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    },

    list_project_queues: {
      tool: {
        name: 'list_project_queues',
        description: 'List all agent queues in the project',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      handler: async () => {
        const result = await client.listProjectQueues();

        if (!result.success) {
          return formatErrorResponse(result.error);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  queues: result.data,
                  count: result.data.length,
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    },

    get_queue_details: {
      tool: {
        name: 'get_queue_details',
        description: 'Get detailed information about a specific queue',
        inputSchema: {
          type: 'object',
          properties: {
            queueIdOrName: {
              type: 'string',
              description: 'Queue ID (number) or name',
            },
          },
          required: ['queueIdOrName'],
        },
      },
      handler: async (args: unknown) => {
        const typedArgs = args as { queueIdOrName: string };
        const id = parseInt(typedArgs.queueIdOrName, 10);
        const result = await client.getQueueDetails(
          isNaN(id) ? typedArgs.queueIdOrName : id,
        );

        if (!result.success) {
          return formatErrorResponse(result.error);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result.data, null, 2),
            },
          ],
        };
      },
    },

    find_agent: {
      tool: {
        name: 'find_agent',
        description: 'Find which queue/pool an agent belongs to (requires org permissions)',
        inputSchema: {
          type: 'object',
          properties: {
            agentName: {
              type: 'string',
              description: 'Name of the agent to find',
            },
          },
          required: ['agentName'],
        },
      },
      handler: async (args: unknown) => {
        const typedArgs = args as { agentName: string };
        const result = await client.findAgent(typedArgs.agentName);

        if (!result.success) {
          return formatErrorResponse(result.error);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result.data, null, 2),
            },
          ],
        };
      },
    },

    list_queue_agents: {
      tool: {
        name: 'list_queue_agents',
        description: 'List all agents in a queue (requires org permissions)',
        inputSchema: {
          type: 'object',
          properties: {
            queueId: {
              type: 'number',
              description: 'Queue ID (not poolId) - use the queue\'s ID from list_project_queues',
            },
          },
          required: ['queueId'],
        },
      },
      handler: async (args: unknown) => {
        const typedArgs = args as { queueId: number };
        const result = await client.listQueueAgents(typedArgs.queueId);

        if (!result.success) {
          return formatErrorResponse(result.error);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  agents: result.data,
                  count: result.data.length,
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    },
  };
}