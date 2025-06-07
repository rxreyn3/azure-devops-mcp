import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { Config } from './config.js';
import { AzureDevOpsClient } from './ado-client.js';

export class AzureDevOpsMCPServer {
  private server: Server;
  private config: Config;
  private adoClient: AzureDevOpsClient;

  constructor(config: Config) {
    this.config = config;
    this.adoClient = new AzureDevOpsClient(config);
    this.server = new Server(
      {
        name: '@rxreyn3/azure-devops-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: 'ado_health_check',
          description: 'Check connection to Azure DevOps and verify permissions',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'list_project_queues',
          description: 'List all agent queues in the project',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
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
        {
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
        {
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
      ];

      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'ado_health_check':
          return await this.healthCheck();

        case 'list_project_queues':
          return await this.listProjectQueues();

        case 'get_queue_details':
          if (!args || typeof args.queueIdOrName !== 'string') {
            throw new Error('queueIdOrName is required');
          }
          return await this.getQueueDetails(args.queueIdOrName);

        case 'find_agent':
          if (!args || typeof args.agentName !== 'string') {
            throw new Error('agentName is required');
          }
          return await this.findAgent(args.agentName);

        case 'list_queue_agents':
          if (!args || typeof args.queueId !== 'number') {
            throw new Error('queueId is required and must be a number');
          }
          return await this.listQueueAgents(args.queueId);

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private async healthCheck() {
    try {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                status: 'connected',
                organization: this.config.organization,
                project: this.config.project,
                message: 'Azure DevOps MCP server is running',
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                status: 'error',
                message: error instanceof Error ? error.message : 'Unknown error',
              },
              null,
              2,
            ),
          },
        ],
      };
    }
  }

  private async listProjectQueues() {
    try {
      const result = await this.adoClient.listProjectQueues();
      
      if (!result.success) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result.error, null, 2),
            },
          ],
        };
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
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  private async getQueueDetails(queueIdOrName: string) {
    try {
      const id = parseInt(queueIdOrName, 10);
      const result = await this.adoClient.getQueueDetails(
        isNaN(id) ? queueIdOrName : id,
      );

      if (!result.success) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result.error, null, 2),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result.data, null, 2),
          },
        ],
      };
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  private async findAgent(agentName: string) {
    try {
      const result = await this.adoClient.findAgent(agentName);

      if (!result.success) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result.error, null, 2),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result.data, null, 2),
          },
        ],
      };
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  private async listQueueAgents(queueId: number) {
    try {
      const result = await this.adoClient.listQueueAgents(queueId);

      if (!result.success) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result.error, null, 2),
            },
          ],
        };
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
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  private errorResponse(error: unknown) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: error instanceof Error ? error.message : 'Unknown error',
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.adoClient.initialize();
    await this.server.connect(transport);
    console.error('Azure DevOps MCP Server started');
  }
}