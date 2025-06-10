import { ToolDefinition } from '../types/tool-types.js';
import { TaskAgentClient } from '../clients/task-agent-client.js';
import { formatErrorResponse } from '../utils/formatters.js';

export function createAgentTools(client: TaskAgentClient): Record<string, ToolDefinition> {
  return {
    ado_health_check: {
      tool: {
        name: 'ado_health_check',
        description: 'Check connection to Azure DevOps and verify permissions. Use this to test your PAT token and ensure the server is properly configured.',
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
        description: 'List all agent queues available in the project. Returns queue IDs, names, and pool information. Queues are project-scoped views of agent pools.',
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
        description: 'Get detailed information about a specific queue including pool details and agent count. Provides more context than list_project_queues.',
        inputSchema: {
          type: 'object',
          properties: {
            queueIdOrName: {
              type: 'string',
              description: 'Queue ID (number) or name. Queue IDs are more reliable than names. Find IDs using list_project_queues.',
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
        description: 'Find which queue/pool an agent belongs to (requires org-level permissions). Searches across all pools in the organization. May fail with project-scoped PAT.',
        inputSchema: {
          type: 'object',
          properties: {
            agentName: {
              type: 'string',
              description: 'Name of the agent to find. Agent names are case-sensitive. Partial matches not supported.',
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
        description: 'List all agents in a specific queue (requires org-level permissions). Shows agent status, version, and capabilities. May fail with project-scoped PAT.',
        inputSchema: {
          type: 'object',
          properties: {
            queueId: {
              type: 'number',
              description: 'Queue ID (not poolId). Must use the queue ID from list_project_queues, not the underlying pool ID.',
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
        description: 'List agents available in your project\'s pools with optional filtering. Shows agent status, version, and basic info. Works with project-scoped permissions.',
        inputSchema: {
          type: 'object',
          properties: {
            nameFilter: {
              type: 'string',
              description: 'Filter agents by name (partial match supported, e.g., "BM40"). Case-insensitive. Matches anywhere in agent name.',
            },
            poolNameFilter: {
              type: 'string',
              description: 'Filter by pool name (partial match supported). Case-insensitive. Useful when you have multiple pools.',
            },
            onlyOnline: {
              type: 'boolean',
              description: 'Only show online agents (default: false). Online agents are ready to run builds immediately.',
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