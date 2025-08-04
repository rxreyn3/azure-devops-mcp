import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Config } from './config.js';
import { TaskAgentClient } from './clients/task-agent-client.js';
import { BuildClient } from './clients/build-client.js';
import { PipelineClient } from './clients/pipeline-client.js';
import { createToolRegistry } from './tools/index.js';
import { TempManager } from './utils/temp-manager.js';
import packageJson from '../package.json' with { type: 'json' };

export class AzureDevOpsMCPServer {
  private server: Server;
  private taskAgentClient: TaskAgentClient;
  private buildClient: BuildClient;
  private pipelineClient: PipelineClient;
  private toolRegistry: ReturnType<typeof createToolRegistry>;

  constructor(config: Config) {
    this.taskAgentClient = new TaskAgentClient(config);
    this.buildClient = new BuildClient(config);
    this.pipelineClient = new PipelineClient(config);
    
    // Initialize tools registry with all clients
    this.toolRegistry = createToolRegistry(this.taskAgentClient, this.buildClient, this.pipelineClient);
    
    this.server = new Server(
      {
        name: '@rxreyn3/azure-devops-mcp',
        version: packageJson.version,
        description: 'MCP server for Azure DevOps agent, queue, and build management. Provides tools for interacting with Azure DevOps but does not support resources or prompts.',
      },
      {
        capabilities: {
          tools: {},
          // Explicitly not supporting resources or prompts
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
    // Initialize temp manager and cleanup old files
    const tempManager = TempManager.getInstance();
    await tempManager.initialize();
    
    // Clean up files older than 24 hours on startup
    try {
      const cleanupResult = await tempManager.cleanup(24);
      if (cleanupResult.filesRemoved > 0) {
        console.error(`Cleaned up ${cleanupResult.filesRemoved} old temporary file(s)`);
      }
    } catch (error) {
      console.error('Failed to cleanup old temporary files:', error);
    }
    
    const transport = new StdioServerTransport();
    
    await this.server.connect(transport);
    console.error('Azure DevOps MCP Server started');
  }
}