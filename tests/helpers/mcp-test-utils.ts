// MCP Server Test Utilities
// Provides utilities for setting up test MCP server instances, creating protocol messages, and validating responses

import { vi, type MockedFunction } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequest,
  ListToolsResult,
  CallToolRequest,
  CallToolResult,
  Tool,
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCError,
} from '@modelcontextprotocol/sdk/types.js';
import { AzureDevOpsMCPServer } from '../../src/server.js';
import { Config } from '../../src/config.js';
import { TaskAgentClient } from '../../src/clients/task-agent-client.js';
import { BuildClient } from '../../src/clients/build-client.js';
import { PipelineClient } from '../../src/clients/pipeline-client.js';

/**
 * Configuration for test MCP server setup
 */
export interface TestMCPServerConfig {
  mockClients?: boolean;
  enableLogging?: boolean;
  customConfig?: Partial<Config>;
}

/**
 * Test MCP server instance with utilities for testing
 */
export class TestMCPServer {
  public server: AzureDevOpsMCPServer;
  public mockTaskAgentClient?: TaskAgentClient;
  public mockBuildClient?: BuildClient;
  public mockPipelineClient?: PipelineClient;
  private config: Config;

  constructor(config: Config, options: TestMCPServerConfig = {}) {
    this.config = config;

    if (options.mockClients) {
      // Create mocked clients for isolated testing
      this.mockTaskAgentClient = vi.mocked(new TaskAgentClient(config));
      this.mockBuildClient = vi.mocked(new BuildClient(config));
      this.mockPipelineClient = vi.mocked(new PipelineClient(config));
    }

    this.server = new AzureDevOpsMCPServer(config);
  }

  /**
   * Simulate tool execution without starting the full server
   */
  async executeToolCall(request: CallToolRequest): Promise<CallToolResult> {
    // Access the private toolRegistry through reflection for testing
    const toolRegistry = (this.server as any).toolRegistry;
    const handler = toolRegistry.handlers.get(request.params.name);

    if (!handler) {
      throw new Error(`Unknown tool: ${request.params.name}`);
    }

    const result = await handler(request.params.arguments || {});
    return result as CallToolResult;
  }

  /**
   * Get list of available tools
   */
  async getTools(): Promise<Tool[]> {
    const toolRegistry = (this.server as any).toolRegistry;
    return toolRegistry.tools;
  }

  /**
   * Clean up test server resources
   */
  async cleanup(): Promise<void> {
    // Clean up any resources if needed
    if (this.mockTaskAgentClient) {
      vi.clearAllMocks();
    }
  }
}

/**
 * Factory for creating test MCP server instances
 */
export class MCPServerTestFactory {
  /**
   * Create a test MCP server with default test configuration
   */
  static createTestServer(options: TestMCPServerConfig = {}): TestMCPServer {
    const defaultConfig: Config = {
      organization: 'https://dev.azure.com/test-org',
      project: 'test-project',
      pat: 'test-token',
      logLevel: 'info',
    };

    const config = { ...defaultConfig, ...options.customConfig };
    return new TestMCPServer(config, options);
  }

  /**
   * Create a test server with mocked clients
   */
  static createMockedServer(customConfig?: Partial<Config>): TestMCPServer {
    return this.createTestServer({
      mockClients: true,
      customConfig,
    });
  }

  /**
   * Create a test server for integration testing
   */
  static createIntegrationServer(config: Config): TestMCPServer {
    return new TestMCPServer(config, {
      mockClients: false,
      enableLogging: true,
    });
  }
}

/**
 * Utilities for creating MCP protocol messages
 */
export class MCPMessageFactory {
  private static requestId = 1;

  /**
   * Generate a unique request ID
   */
  private static getNextId(): string {
    return `test-request-${this.requestId++}`;
  }

  /**
   * Create a ListTools request
   */
  static createListToolsRequest(): JSONRPCRequest & ListToolsRequest {
    return {
      jsonrpc: '2.0',
      id: this.getNextId(),
      method: 'tools/list',
      params: {},
    };
  }

  /**
   * Create a CallTool request
   */
  static createCallToolRequest(
    toolName: string,
    args: Record<string, any> = {},
  ): JSONRPCRequest & CallToolRequest {
    return {
      jsonrpc: '2.0',
      id: this.getNextId(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args,
      },
    };
  }

  /**
   * Create a batch of tool call requests
   */
  static createBatchToolCalls(
    toolCalls: Array<{ name: string; args?: Record<string, any> }>,
  ): Array<JSONRPCRequest & CallToolRequest> {
    return toolCalls.map(({ name, args }) => this.createCallToolRequest(name, args));
  }

  /**
   * Create an invalid tool call request (for error testing)
   */
  static createInvalidToolRequest(
    toolName: string = 'nonexistent_tool',
    args: Record<string, any> = {},
  ): JSONRPCRequest & CallToolRequest {
    return this.createCallToolRequest(toolName, args);
  }

  /**
   * Create a malformed request (missing required fields)
   */
  static createMalformedRequest(): Partial<JSONRPCRequest> {
    return {
      jsonrpc: '2.0',
      // Missing id and method
      params: {},
    };
  }

  /**
   * Create tool call requests for common scenarios
   */
  static createCommonToolCalls() {
    return {
      healthCheck: this.createCallToolRequest('project_health_check'),
      listQueues: this.createCallToolRequest('project_list_queues'),
      listBuilds: this.createCallToolRequest('build_list', { top: 10 }),
      queueBuild: this.createCallToolRequest('build_queue', {
        definitionId: 1,
        sourceBranch: 'refs/heads/main',
      }),
      findAgent: this.createCallToolRequest('org_find_agent', {
        agentName: 'Test-Agent',
      }),
      downloadLogs: this.createCallToolRequest('build_download_job_logs', {
        buildId: 101,
        jobName: 'Build Job',
      }),
    };
  }
}

/**
 * Utilities for validating MCP response formats
 */
export class MCPResponseValidator {
  /**
   * Validate that a response conforms to JSON-RPC 2.0 format
   */
  static validateJSONRPCResponse(response: any): boolean {
    if (!response || typeof response !== 'object') {
      return false;
    }

    // Must have jsonrpc field with value "2.0"
    if (response.jsonrpc !== '2.0') {
      return false;
    }

    // Must have either result or error, but not both
    const hasResult = 'result' in response;
    const hasError = 'error' in response;

    if (hasResult && hasError) {
      return false;
    }

    if (!hasResult && !hasError) {
      return false;
    }

    // Must have id field
    if (!('id' in response)) {
      return false;
    }

    return true;
  }

  /**
   * Validate ListTools response format
   */
  static validateListToolsResponse(
    response: any,
  ): response is JSONRPCResponse & { result: ListToolsResult } {
    if (!this.validateJSONRPCResponse(response)) {
      return false;
    }

    if (!response.result || !Array.isArray(response.result.tools)) {
      return false;
    }

    // Validate each tool definition
    return response.result.tools.every((tool: any) => this.validateToolDefinition(tool));
  }

  /**
   * Validate CallTool response format
   */
  static validateCallToolResponse(
    response: any,
  ): response is JSONRPCResponse & { result: CallToolResult } {
    if (!this.validateJSONRPCResponse(response)) {
      return false;
    }

    if (!response.result || !Array.isArray(response.result.content)) {
      return false;
    }

    // Validate content array
    return response.result.content.every((content: any) => {
      return (
        content &&
        typeof content === 'object' &&
        content.type === 'text' &&
        typeof content.text === 'string'
      );
    });
  }

  /**
   * Validate tool definition format
   */
  static validateToolDefinition(tool: any): tool is Tool {
    if (!tool || typeof tool !== 'object') {
      return false;
    }

    // Required fields
    if (
      typeof tool.name !== 'string' ||
      typeof tool.description !== 'string' ||
      !tool.inputSchema
    ) {
      return false;
    }

    // Validate input schema
    const schema = tool.inputSchema;
    if (schema.type !== 'object' || !schema.properties || typeof schema.properties !== 'object') {
      return false;
    }

    // Required field should be an array if present
    if (schema.required && !Array.isArray(schema.required)) {
      return false;
    }

    return true;
  }

  /**
   * Validate error response format
   */
  static validateErrorResponse(
    response: any,
  ): response is JSONRPCResponse & { error: JSONRPCError } {
    if (!this.validateJSONRPCResponse(response)) {
      return false;
    }

    if (!response.error || typeof response.error !== 'object') {
      return false;
    }

    const error = response.error;

    // Error must have code and message
    if (typeof error.code !== 'number' || typeof error.message !== 'string') {
      return false;
    }

    return true;
  }

  /**
   * Validate that tool response content is properly formatted JSON
   */
  static validateToolResponseContent(response: CallToolResult): boolean {
    if (!Array.isArray(response.content) || response.content.length === 0) {
      return false;
    }

    const content = response.content[0];
    if (content.type !== 'text' || typeof content.text !== 'string') {
      return false;
    }

    try {
      const parsed = JSON.parse(content.text);

      // Should have success field
      if (typeof parsed.success !== 'boolean') {
        return false;
      }

      // If success is true, should have data field
      if (parsed.success && !('data' in parsed)) {
        return false;
      }

      // If success is false, should have error field
      if (!parsed.success && !('error' in parsed)) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract and parse tool response data
   */
  static parseToolResponseData(response: CallToolResult): any {
    if (!this.validateToolResponseContent(response)) {
      throw new Error('Invalid tool response format');
    }

    const content = response.content[0];
    if (typeof content.text !== 'string') {
      throw new Error('Tool response content text must be a string');
    }
    return JSON.parse(content.text);
  }

  /**
   * Validate that all tools in a list have unique names
   */
  static validateUniqueToolNames(tools: Tool[]): boolean {
    const names = new Set();
    for (const tool of tools) {
      if (names.has(tool.name)) {
        return false;
      }
      names.add(tool.name);
    }
    return true;
  }

  /**
   * Validate that tool parameters match the schema
   */
  static validateToolParameters(tool: Tool, parameters: Record<string, any>): boolean {
    const schema = tool.inputSchema;

    // Check required parameters
    if (schema.required) {
      for (const required of schema.required) {
        if (!(required in parameters)) {
          return false;
        }
      }
    }

    // Check parameter types (basic validation)
    if (!schema.properties) {
      return true; // No properties to validate
    }

    for (const [key, value] of Object.entries(parameters)) {
      const propertySchema = schema.properties[key];
      if (!propertySchema) {
        continue; // Allow additional properties for flexibility
      }

      if (!this.validateParameterType(value, propertySchema)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Basic type validation for parameters
   */
  private static validateParameterType(value: any, schema: any): boolean {
    switch (schema.type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null;
      default:
        return true; // Allow unknown types
    }
  }
}

/**
 * Test environment setup utilities
 */
export class MCPTestEnvironment {
  private originalEnv: NodeJS.ProcessEnv;

  constructor() {
    this.originalEnv = { ...process.env };
  }

  /**
   * Set up test environment variables
   */
  setupTestEnvironment(config: Record<string, string> = {}): void {
    const defaultConfig = {
      ADO_ORGANIZATION: 'https://dev.azure.com/test-org',
      ADO_PROJECT: 'test-project',
      ADO_PAT: 'test-token',
      LOG_LEVEL: 'info',
    };

    const envConfig = { ...defaultConfig, ...config };

    Object.entries(envConfig).forEach(([key, value]) => {
      if (value !== undefined) {
        process.env[key] = value;
      }
    });
  }

  /**
   * Restore original environment
   */
  restore(): void {
    process.env = { ...this.originalEnv };
  }

  /**
   * Create a test environment that automatically cleans up
   */
  static withTestEnvironment<T>(
    config: Record<string, string>,
    testFn: () => T | Promise<T>,
  ): Promise<T> {
    const env = new MCPTestEnvironment();
    env.setupTestEnvironment(config);

    try {
      const result = testFn();
      if (result instanceof Promise) {
        return result.finally(() => env.restore());
      } else {
        env.restore();
        return Promise.resolve(result);
      }
    } catch (error) {
      env.restore();
      throw error;
    }
  }
}

/**
 * Assertion helpers for MCP testing
 */
export class MCPAssertions {
  /**
   * Assert that a response is a valid ListTools response
   */
  static assertValidListToolsResponse(
    response: any,
  ): asserts response is JSONRPCResponse & { result: ListToolsResult } {
    if (!MCPResponseValidator.validateListToolsResponse(response)) {
      throw new Error('Invalid ListTools response format');
    }
  }

  /**
   * Assert that a response is a valid CallTool response
   */
  static assertValidCallToolResponse(
    response: any,
  ): asserts response is JSONRPCResponse & { result: CallToolResult } {
    if (!MCPResponseValidator.validateCallToolResponse(response)) {
      throw new Error('Invalid CallTool response format');
    }
  }

  /**
   * Assert that a response is a valid error response
   */
  static assertValidErrorResponse(
    response: any,
  ): asserts response is JSONRPCResponse & { error: JSONRPCError } {
    if (!MCPResponseValidator.validateErrorResponse(response)) {
      throw new Error('Invalid error response format');
    }
  }

  /**
   * Assert that tool response indicates success
   */
  static assertToolSuccess(response: CallToolResult): void {
    const data = MCPResponseValidator.parseToolResponseData(response);
    if (!data.success) {
      throw new Error(`Tool execution failed: ${JSON.stringify(data.error)}`);
    }
  }

  /**
   * Assert that tool response indicates failure
   */
  static assertToolFailure(response: CallToolResult): void {
    const data = MCPResponseValidator.parseToolResponseData(response);
    if (data.success) {
      throw new Error('Expected tool execution to fail, but it succeeded');
    }
  }

  /**
   * Assert that a tool exists in the tools list
   */
  static assertToolExists(tools: Tool[], toolName: string): void {
    const tool = tools.find((t) => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool '${toolName}' not found in tools list`);
    }
  }

  /**
   * Assert that all expected tools exist
   */
  static assertAllToolsExist(tools: Tool[], expectedToolNames: string[]): void {
    for (const toolName of expectedToolNames) {
      this.assertToolExists(tools, toolName);
    }
  }
}
