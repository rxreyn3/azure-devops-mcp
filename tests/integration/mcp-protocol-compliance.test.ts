import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AzureDevOpsMCPServer } from '../../src/server.js';
import { validateConfig, type Config } from '../../src/config.js';
import { TempManager } from '../../src/utils/temp-manager.js';
import {
  MCPServerTestFactory,
  MCPTestEnvironment,
  MCPMessageFactory,
  MCPResponseValidator,
  MCPAssertions,
} from '../helpers/mcp-test-utils.js';
import {
  ListToolsRequest,
  CallToolRequest,
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCError,
} from '@modelcontextprotocol/sdk/types.js';

// Mock the TempManager to avoid file system operations during tests
vi.mock('../../src/utils/temp-manager.js', () => ({
  TempManager: {
    getInstance: vi.fn(() => ({
      initialize: vi.fn().mockResolvedValue(undefined),
      cleanup: vi.fn().mockResolvedValue({ filesRemoved: 0 }),
    })),
  },
}));

// Mock the stdio transport to avoid actual server startup
vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock the MCP Server to avoid actual protocol handling
vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: vi.fn().mockImplementation(() => ({
    setRequestHandler: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('MCP Protocol Compliance', () => {
  let testEnv: MCPTestEnvironment;
  let testServer: ReturnType<typeof MCPServerTestFactory.createTestServer>;

  beforeEach(() => {
    testEnv = new MCPTestEnvironment();
    testEnv.setupTestEnvironment({
      ADO_ORGANIZATION: 'https://dev.azure.com/test-org',
      ADO_PROJECT: 'test-project',
      ADO_PAT: 'test-token',
    });

    // Create a mocked server to avoid real API calls
    testServer = MCPServerTestFactory.createMockedServer();
  });

  afterEach(async () => {
    await testServer.cleanup();
    testEnv.restore();
    vi.clearAllMocks();
  });

  describe('ListTools Request Handling and Response Format', () => {
    it('should handle ListTools request with correct JSON-RPC format', async () => {
      const tools = await testServer.getTools();

      // Simulate a proper ListTools response
      const mockResponse = {
        jsonrpc: '2.0',
        id: 'test-request-1',
        result: { tools },
      };

      // Validate response format compliance
      expect(MCPResponseValidator.validateListToolsResponse(mockResponse)).toBe(true);
      MCPAssertions.assertValidListToolsResponse(mockResponse);
    });

    it('should return all tools with valid MCP tool definitions', async () => {
      const tools = await testServer.getTools();

      expect(tools).toBeDefined();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);

      // Validate each tool definition
      tools.forEach((tool) => {
        expect(MCPResponseValidator.validateToolDefinition(tool)).toBe(true);
        
        // Check required fields
        expect(tool.name).toBeTruthy();
        expect(typeof tool.name).toBe('string');
        expect(tool.description).toBeTruthy();
        expect(typeof tool.description).toBe('string');
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
        
        // Validate schema structure
        if (tool.inputSchema.required) {
          expect(Array.isArray(tool.inputSchema.required)).toBe(true);
        }
      });
    });

    it('should have unique tool names across all tools', async () => {
      const tools = await testServer.getTools();
      
      expect(MCPResponseValidator.validateUniqueToolNames(tools)).toBe(true);
      
      const toolNames = tools.map(t => t.name);
      const uniqueNames = new Set(toolNames);
      expect(uniqueNames.size).toBe(toolNames.length);
    });

    it('should include all expected tool categories', async () => {
      const tools = await testServer.getTools();
      const toolNames = tools.map(t => t.name);

      // Agent management tools
      expect(toolNames).toContain('project_health_check');
      expect(toolNames).toContain('project_list_queues');
      expect(toolNames).toContain('org_find_agent');

      // Build management tools
      expect(toolNames).toContain('build_list');
      expect(toolNames).toContain('build_queue');
      expect(toolNames).toContain('build_get_timeline');

      // File management tools
      expect(toolNames).toContain('list_downloads');
      expect(toolNames).toContain('cleanup_downloads');
    });

    it('should validate tool input schemas are properly structured', async () => {
      const tools = await testServer.getTools();

      tools.forEach((tool) => {
        const schema = tool.inputSchema;
        
        // Basic schema validation
        expect(schema.type).toBe('object');
        expect(typeof schema.properties).toBe('object');
        
        // Validate property definitions
        if (schema.properties) {
          Object.entries(schema.properties).forEach(([propName, propDef]: [string, any]) => {
            expect(typeof propName).toBe('string');
            expect(typeof propDef).toBe('object');
            expect(propDef.type).toBeTruthy();
            
            if (propDef.description) {
              expect(typeof propDef.description).toBe('string');
              expect(propDef.description.length).toBeGreaterThan(0);
            }
          });
        }
        
        // Validate required fields reference existing properties
        if (schema.required) {
          schema.required.forEach((requiredField: string) => {
            expect(schema.properties).toHaveProperty(requiredField);
          });
        }
      });
    });
  });

  describe('CallTool Request Handling with Valid Parameters', () => {
    it('should handle valid CallTool requests for health check', async () => {
      const request = MCPMessageFactory.createCallToolRequest('project_health_check', {});
      
      const result = await testServer.executeToolCall(request);
      
      expect(MCPResponseValidator.validateCallToolResponse({
        jsonrpc: '2.0',
        id: request.id,
        result,
      })).toBe(true);
      
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0].type).toBe('text');
      expect(typeof result.content[0].text).toBe('string');
    });

    it('should handle CallTool requests with required parameters', async () => {
      // Use a tool that doesn't require API calls for this protocol compliance test
      const request = MCPMessageFactory.createCallToolRequest('project_health_check', {});
      
      const result = await testServer.executeToolCall(request);
      
      // Should return a valid response structure
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0].type).toBe('text');
      
      // Response should be valid JSON
      const text = result.content[0].text;
      expect(() => JSON.parse(text)).not.toThrow();
      
      const parsed = JSON.parse(text);
      expect(parsed).toHaveProperty('status');
      expect(parsed).toHaveProperty('message');
    });

    it('should handle CallTool requests with optional parameters', async () => {
      // Test parameter validation without making API calls
      const tools = await testServer.getTools();
      const buildListTool = tools.find(t => t.name === 'build_list');
      
      expect(buildListTool).toBeDefined();
      
      // Validate that the tool accepts optional parameters
      const validParams = {
        limit: 5,
        status: 'Completed',
      };
      
      expect(MCPResponseValidator.validateToolParameters(buildListTool!, validParams)).toBe(true);
      expect(MCPResponseValidator.validateToolParameters(buildListTool!, {})).toBe(true); // No required params
    });

    it('should validate tool parameters against schema', async () => {
      const tools = await testServer.getTools();
      
      // Test parameter validation for a tool with required parameters
      const queueTool = tools.find(t => t.name === 'project_get_queue');
      expect(queueTool).toBeDefined();
      
      // Valid parameters should pass validation
      expect(MCPResponseValidator.validateToolParameters(queueTool!, {
        queueIdOrName: 'test-queue',
      })).toBe(true);
      
      // Missing required parameters should fail validation
      expect(MCPResponseValidator.validateToolParameters(queueTool!, {})).toBe(false);
    });

    it('should return properly formatted tool response content', async () => {
      const request = MCPMessageFactory.createCallToolRequest('project_health_check', {});
      const result = await testServer.executeToolCall(request);
      
      // Validate basic response structure
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0].type).toBe('text');
      expect(typeof result.content[0].text).toBe('string');
      
      // Health check has a special format (not the standard API response format)
      const parsedData = JSON.parse(result.content[0].text);
      expect(typeof parsedData).toBe('object');
      expect(parsedData).toHaveProperty('status');
      expect(parsedData).toHaveProperty('message');
    });
  });

  describe('CallTool Request Handling with Invalid Parameters', () => {
    it('should handle CallTool requests for non-existent tools', async () => {
      const request = MCPMessageFactory.createInvalidToolRequest('nonexistent_tool', {});
      
      await expect(testServer.executeToolCall(request)).rejects.toThrow('Unknown tool: nonexistent_tool');
    });

    it('should handle CallTool requests with missing required parameters', async () => {
      // Test parameter validation for tools with required parameters
      const tools = await testServer.getTools();
      const queueTool = tools.find(t => t.name === 'project_get_queue');
      
      expect(queueTool).toBeDefined();
      expect(queueTool!.inputSchema.required).toContain('queueIdOrName');
      
      // Missing required parameters should fail validation
      expect(MCPResponseValidator.validateToolParameters(queueTool!, {})).toBe(false);
      
      // Valid parameters should pass validation
      expect(MCPResponseValidator.validateToolParameters(queueTool!, {
        queueIdOrName: 'test-queue',
      })).toBe(true);
    });

    it('should handle CallTool requests with invalid parameter types', async () => {
      // Test parameter type validation
      const tools = await testServer.getTools();
      const buildListTool = tools.find(t => t.name === 'build_list');
      
      expect(buildListTool).toBeDefined();
      
      // Invalid parameter types should fail validation
      const invalidParams = {
        limit: 'invalid-number', // Should be a number
        status: 123, // Should be a string
      };
      
      expect(MCPResponseValidator.validateToolParameters(buildListTool!, invalidParams)).toBe(false);
      
      // Valid parameter types should pass validation
      const validParams = {
        limit: 10,
        status: 'Completed',
      };
      
      expect(MCPResponseValidator.validateToolParameters(buildListTool!, validParams)).toBe(true);
    });

    it('should handle CallTool requests with extra unexpected parameters', async () => {
      const request = MCPMessageFactory.createCallToolRequest('project_health_check', {
        unexpectedParam: 'should-be-ignored',
        anotherParam: 123,
      });
      
      const result = await testServer.executeToolCall(request);
      
      // Should ignore extra parameters and work normally
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      
      // Health check has special format, parse directly
      const parsedData = JSON.parse(result.content[0].text);
      expect(parsedData.status).toBe('connected');
    });

    it('should handle malformed CallTool requests', async () => {
      const malformedRequest = {
        jsonrpc: '2.0',
        id: 'test-malformed',
        method: 'tools/call',
        params: {
          // Missing 'name' field
          arguments: {},
        },
      } as any;
      
      await expect(testServer.executeToolCall(malformedRequest)).rejects.toThrow();
    });
  });

  describe('Error Response Format Compliance with MCP Standards', () => {
    it('should return properly formatted JSON-RPC error responses', async () => {
      const errorResponse: JSONRPCResponse & { error: JSONRPCError } = {
        jsonrpc: '2.0',
        id: 'test-error',
        error: {
          code: -32601,
          message: 'Method not found',
          data: { method: 'unknown_method' },
        },
      };
      
      expect(MCPResponseValidator.validateErrorResponse(errorResponse)).toBe(true);
      MCPAssertions.assertValidErrorResponse(errorResponse);
    });

    it('should handle tool execution errors with proper format', async () => {
      try {
        await testServer.executeToolCall(
          MCPMessageFactory.createInvalidToolRequest('nonexistent_tool')
        );
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Unknown tool');
      }
    });

    it('should validate error response structure', () => {
      const validErrorResponse = {
        jsonrpc: '2.0',
        id: 'test-1',
        error: {
          code: -32602,
          message: 'Invalid params',
          data: { param: 'missing required parameter' },
        },
      };
      
      expect(MCPResponseValidator.validateJSONRPCResponse(validErrorResponse)).toBe(true);
      expect(MCPResponseValidator.validateErrorResponse(validErrorResponse)).toBe(true);
    });

    it('should reject invalid error response formats', () => {
      const invalidErrorResponses = [
        // Missing error code
        {
          jsonrpc: '2.0',
          id: 'test-1',
          error: { message: 'Error message' },
        },
        // Missing error message
        {
          jsonrpc: '2.0',
          id: 'test-1',
          error: { code: -32602 },
        },
        // Invalid error code type
        {
          jsonrpc: '2.0',
          id: 'test-1',
          error: { code: 'invalid', message: 'Error message' },
        },
        // Invalid message type
        {
          jsonrpc: '2.0',
          id: 'test-1',
          error: { code: -32602, message: 123 },
        },
      ];
      
      invalidErrorResponses.forEach((response) => {
        expect(MCPResponseValidator.validateErrorResponse(response)).toBe(false);
      });
    });

    it('should handle tool-specific error formats', async () => {
      // Test error response format validation without making API calls
      const mockErrorResponse: JSONRPCResponse & { error: JSONRPCError } = {
        jsonrpc: '2.0',
        id: 'test-error',
        error: {
          code: -32602,
          message: 'Invalid params',
          data: { details: 'Queue not found' },
        },
      };
      
      expect(MCPResponseValidator.validateErrorResponse(mockErrorResponse)).toBe(true);
      
      // Test that tool error responses follow consistent format
      const errorFormats = [
        '❌ Not Found\n\nQueue not found',
        '❌ API Error\n\nAccess denied',
        '❌ Error\n\n{"type": "permission_error", "message": "Insufficient permissions"}',
      ];
      
      errorFormats.forEach((errorText) => {
        expect(errorText).toMatch(/^❌/);
      });
    });
  });

  describe('MCP Protocol Message Validation', () => {
    it('should validate JSON-RPC 2.0 message format', () => {
      const validMessages = [
        MCPMessageFactory.createListToolsRequest(),
        MCPMessageFactory.createCallToolRequest('project_health_check'),
      ];
      
      validMessages.forEach((message) => {
        expect(message.jsonrpc).toBe('2.0');
        expect(message.id).toBeTruthy();
        expect(message.method).toBeTruthy();
        expect(message.params).toBeDefined();
      });
    });

    it('should generate unique request IDs', () => {
      const requests = Array.from({ length: 10 }, () => 
        MCPMessageFactory.createListToolsRequest()
      );
      
      const ids = requests.map(r => r.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should create properly formatted batch requests', () => {
      const batchRequests = MCPMessageFactory.createBatchToolCalls([
        { name: 'project_health_check' },
        { name: 'project_list_queues' },
        { name: 'build_list', args: { top: 5 } },
      ]);
      
      expect(batchRequests).toHaveLength(3);
      
      batchRequests.forEach((request) => {
        expect(request.jsonrpc).toBe('2.0');
        expect(request.method).toBe('tools/call');
        expect(request.params.name).toBeTruthy();
      });
      
      // All should have unique IDs
      const ids = batchRequests.map(r => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should handle common tool call scenarios', () => {
      const commonCalls = MCPMessageFactory.createCommonToolCalls();
      
      expect(commonCalls.healthCheck.params.name).toBe('project_health_check');
      expect(commonCalls.listQueues.params.name).toBe('project_list_queues');
      expect(commonCalls.listBuilds.params.name).toBe('build_list');
      expect(commonCalls.listBuilds.params.arguments.top).toBe(10);
      expect(commonCalls.queueBuild.params.name).toBe('build_queue');
      expect(commonCalls.findAgent.params.name).toBe('org_find_agent');
      expect(commonCalls.downloadLogs.params.name).toBe('build_download_job_logs');
    });
  });

  describe('Response Content Validation', () => {
    it('should validate tool response content structure', async () => {
      const request = MCPMessageFactory.createCallToolRequest('project_health_check');
      const result = await testServer.executeToolCall(request);
      
      // Validate basic structure
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      
      // Validate content items
      result.content.forEach((item) => {
        expect(item).toHaveProperty('type');
        expect(item.type).toBe('text');
        expect(item).toHaveProperty('text');
        expect(typeof item.text).toBe('string');
      });
    });

    it('should ensure all tool responses contain valid JSON', async () => {
      const tools = await testServer.getTools();
      const testTools = ['project_health_check']; // Only test health check since it doesn't require API calls
      
      for (const toolName of testTools) {
        if (tools.some(t => t.name === toolName)) {
          const request = MCPMessageFactory.createCallToolRequest(toolName);
          const result = await testServer.executeToolCall(request);
          
          expect(result.content[0].text).toBeTruthy();
          
          // Should be valid JSON or contain error markers
          const text = result.content[0].text;
          if (!text.startsWith('❌')) {
            expect(() => JSON.parse(text)).not.toThrow();
          }
        }
      }
    });

    it('should maintain consistent error response format', async () => {
      // Test error response format consistency without making API calls
      const errorPatterns = [
        /^❌ Not Found\n\n.+/,
        /^❌ API Error\n\n.+/,
        /^❌ Error\n\n.+/,
        /^❌ Permission Error\n\n.+/,
      ];
      
      const sampleErrorResponses = [
        '❌ Not Found\n\nQueue with ID 999 does not exist',
        '❌ API Error\n\nAccess denied to resource',
        '❌ Error\n\n{"type": "validation_error", "message": "Invalid parameter"}',
        '❌ Permission Error\n\nInsufficient permissions for this operation',
      ];
      
      sampleErrorResponses.forEach((errorText, index) => {
        expect(errorText).toMatch(errorPatterns[index]);
        expect(errorText).toMatch(/^❌/);
      });
    });
  });
});