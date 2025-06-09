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

    list_agents: {
      tool: {
        name: 'list_agents',
        description: 'List agents available in your project\'s pools with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            nameFilter: {
              type: 'string',
              description: 'Filter agents by name (partial match, e.g., "BM40")',
            },
            poolNameFilter: {
              type: 'string',
              description: 'Filter by pool name (partial match)',
            },
            onlyOnline: {
              type: 'boolean',
              description: 'Only show online agents',
              default: false,
            },
          },
          required: [],
        },
      },
      handler: async (args: unknown) => {
        const typedArgs = args as {
          nameFilter?: string;
          poolNameFilter?: string;
          onlyOnline?: boolean;
        };
        
        const result = await client.listProjectAgents(typedArgs);

        if (!result.success) {
          return formatErrorResponse(result.error);
        }

        // Group agents by pool for better readability
        const agentsByPool: { [poolName: string]: typeof result.data } = {};
        for (const agent of result.data) {
          if (!agentsByPool[agent.poolName]) {
            agentsByPool[agent.poolName] = [];
          }
          agentsByPool[agent.poolName].push(agent);
        }

        const summary = {
          agents: result.data.map(a => ({
            name: a.name,
            pool: a.poolName, // User-friendly "pool" terminology
            status: a.status,
            enabled: a.enabled,
            version: a.version,
            capabilities: [] // Placeholder - could be extended later
          })),
          summary: {
            total: result.data.length,
            online: result.data.filter(a => a.status === 'Online').length,
            offline: result.data.filter(a => a.status === 'Offline').length,
            pools: Object.keys(agentsByPool).sort()
          }
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(summary, null, 2),
            },
          ],
        };
      },
    },
  };
}