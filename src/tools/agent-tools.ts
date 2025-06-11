import { ToolDefinition } from '../types/tool-types.js';
import { TaskAgentClient } from '../clients/task-agent-client.js';
import { formatErrorResponse } from '../utils/formatters.js';

export function createAgentTools(client: TaskAgentClient): Record<string, ToolDefinition> {
  return {
    project_health_check: {
      tool: {
        name: 'project_health_check',
        description: 'Check connection to Azure DevOps and verify permissions. Requires project-scoped PAT with Agent Pools (read) permission.',
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

    project_list_queues: {
      tool: {
        name: 'project_list_queues',
        description: 'List all agent queues available in the project. Returns queue IDs, names, and pool information. Requires project-scoped PAT with Agent Pools (read) permission.',
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

    project_get_queue: {
      tool: {
        name: 'project_get_queue',
        description: 'Get detailed information about a specific queue including pool details and agent count. Requires project-scoped PAT with Agent Pools (read) permission.',
        inputSchema: {
          type: 'object',
          properties: {
            queueIdOrName: {
              type: 'string',
              description: 'Queue ID (number) or name. Queue IDs are more reliable than names. Find IDs using project_list_queues.',
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

    org_find_agent: {
      tool: {
        name: 'org_find_agent',
        description: 'Find which queue/pool an agent belongs to. Searches across all pools in the organization. Requires PAT with organization-level Agent Pools (read) permission.',
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

    org_list_agents: {
      tool: {
        name: 'org_list_agents',
        description: 'List agents from project pools with optional filtering. Shows agent status, version, and basic info. Requires PAT with organization-level Agent Pools (read) permission to access agent details.',
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