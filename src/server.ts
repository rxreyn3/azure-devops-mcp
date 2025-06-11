import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Config } from './config.js';
import { TaskAgentClient } from './clients/task-agent-client.js';
import { createToolRegistry } from './tools/index.js';
import packageJson from '../package.json' with { type: 'json' };

export class AzureDevOpsMCPServer {
  private server: Server;
  private taskAgentClient: TaskAgentClient;
  private toolRegistry: ReturnType<typeof createToolRegistry>;

  constructor(config: Config) {
    this.taskAgentClient = new TaskAgentClient(config);
    
    // Initialize tools registry with agent tools
    this.toolRegistry = createToolRegistry(this.taskAgentClient);
    
    this.server = new Server(
      {
        name: '@rxreyn3/azure-devops-mcp',
        version: packageJson.version,
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
      return { tools: this.toolRegistry.tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      const handler = this.toolRegistry.handlers.get(name);
      if (!handler) {
        throw new Error(`Unknown tool: ${name}`);
      }

      const result = await handler(args || {});
      return result as { content: Array<{ type: 'text'; text: string }> };
    });
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    
    // Initialize client
    await this.taskAgentClient.initialize();
    
    await this.server.connect(transport);
    console.error('Azure DevOps MCP Server started');
  }
}