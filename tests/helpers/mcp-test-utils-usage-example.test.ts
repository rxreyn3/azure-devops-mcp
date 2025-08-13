// Usage examples for MCP test utilities
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  MCPServerTestFactory,
  MCPMessageFactory,
  MCPResponseValidator,
  MCPTestEnvironment,
  MCPAssertions,
  TestMCPServer,
} from './mcp-test-utils.js';
import { MockFactory } from './mock-factory.js';

describe('MCP Test Utilities Usage Examples', () => {
  let testEnv: MCPTestEnvironment;

  beforeEach(() => {
    testEnv = new MCPTestEnvironment();
    testEnv.setupTestEnvironment();
  });

  afterEach(() => {
    testEnv.restore();
  });

  describe('Basic Server Testing', () => {
    it('should demonstrate how to test server tool registration', async () => {
      // Create a test server with mocked clients
      const server = MCPServerTestFactory.createMockedServer();

      // Get the list of available tools
      const tools = await server.getTools();

      // Verify expected tools are registered
      MCPAssertions.assertAllToolsExist(tools, [
        'project_health_check',
        'project_list_queues',
        'build_list',
        'build_queue',
      ]);

      // Verify tool definitions are valid
      tools.forEach((tool) => {
        expect(MCPResponseValidator.validateToolDefinition(tool)).toBe(true);
      });

      // Verify tool names are unique
      expect(MCPResponseValidator.validateUniqueToolNames(tools)).toBe(true);

      await server.cleanup();
    });

    it('should demonstrate how to test tool execution with mocked responses', async () => {
      // Create a test server with mocked clients
      const server = MCPServerTestFactory.createMockedServer();

      // Set up mock responses using MockFactory
      const mockQueues = MockFactory.createMockQueues(3);

      // Create a mock response that simulates successful tool execution
      const mockToolResponse = {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              data: mockQueues,
            }),
          },
        ],
      };

      // Validate the mock response format
      MCPAssertions.assertValidCallToolResponse({
        jsonrpc: '2.0',
        id: 'test',
        result: mockToolResponse,
      });

      // Verify the tool response indicates success
      MCPAssertions.assertToolSuccess(mockToolResponse);

      // Parse and verify the response data
      const data = MCPResponseValidator.parseToolResponseData(mockToolResponse);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data).toHaveLength(3);

      await server.cleanup();
    });

    it('should demonstrate how to test error scenarios', async () => {
      // Create a test server with mocked clients
      const server = MCPServerTestFactory.createMockedServer();

      // Create a mock error response using MockFactory
      const permissionError = MockFactory.createPermissionError();

      // Create a mock error response that simulates tool execution failure
      const mockErrorResponse = {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: false,
              error: {
                type: 'permission',
                message: permissionError.message,
                requiredPermission: 'Project (Read)',
                suggestion: 'Ensure your Azure DevOps token has the required permissions',
              },
            }),
          },
        ],
      };

      // Validate the response format
      MCPAssertions.assertValidCallToolResponse({
        jsonrpc: '2.0',
        id: 'test',
        result: mockErrorResponse,
      });

      // Verify the tool execution failed as expected
      MCPAssertions.assertToolFailure(mockErrorResponse);

      // Parse and verify the error response
      const data = MCPResponseValidator.parseToolResponseData(mockErrorResponse);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.error.type).toBe('permission');

      await server.cleanup();
    });
  });

  describe('Message Factory Usage', () => {
    it('should demonstrate creating various MCP messages', () => {
      // Create a ListTools request
      const listRequest = MCPMessageFactory.createListToolsRequest();
      expect(listRequest.method).toBe('tools/list');
      expect(listRequest.jsonrpc).toBe('2.0');
      expect(listRequest.id).toBeDefined();

      // Create tool call requests
      const healthCheckRequest = MCPMessageFactory.createCallToolRequest('project_health_check');
      expect(healthCheckRequest.params.name).toBe('project_health_check');
      expect(healthCheckRequest.params.arguments).toEqual({});

      // Create tool call with parameters
      const buildListRequest = MCPMessageFactory.createCallToolRequest('build_list', {
        top: 10,
        statusFilter: 'completed',
      });
      expect(buildListRequest.params.arguments).toBeDefined();
      expect(buildListRequest.params.arguments!.top).toBe(10);
      expect(buildListRequest.params.arguments!.statusFilter).toBe('completed');

      // Create batch requests
      const batchRequests = MCPMessageFactory.createBatchToolCalls([
        { name: 'project_health_check' },
        { name: 'project_list_queues', args: { nameFilter: 'Default' } },
        { name: 'build_list', args: { top: 5 } },
      ]);
      expect(batchRequests).toHaveLength(3);
      expect(batchRequests[1].params.arguments).toBeDefined();
      expect(batchRequests[1].params.arguments!.nameFilter).toBe('Default');

      // Use common tool calls
      const commonCalls = MCPMessageFactory.createCommonToolCalls();
      expect(commonCalls.healthCheck.params.name).toBe('project_health_check');
      expect(commonCalls.queueBuild.params.arguments).toBeDefined();
      expect(commonCalls.queueBuild.params.arguments!.definitionId).toBe(1);
    });

    it('should demonstrate creating invalid requests for error testing', () => {
      // Create invalid tool request
      const invalidRequest = MCPMessageFactory.createInvalidToolRequest('nonexistent_tool');
      expect(invalidRequest.params.name).toBe('nonexistent_tool');

      // Create malformed request
      const malformedRequest = MCPMessageFactory.createMalformedRequest();
      expect(malformedRequest.id).toBeUndefined();
      expect(malformedRequest.method).toBeUndefined();
    });
  });

  describe('Response Validation Usage', () => {
    it('should demonstrate validating different response types', () => {
      // Valid JSON-RPC response
      const validResponse = {
        jsonrpc: '2.0',
        id: 'test-1',
        result: { data: 'test' },
      };
      expect(MCPResponseValidator.validateJSONRPCResponse(validResponse)).toBe(true);

      // Invalid responses
      const invalidResponses = [
        { id: 'test', result: {} }, // Missing jsonrpc
        { jsonrpc: '1.0', id: 'test', result: {} }, // Wrong version
        { jsonrpc: '2.0', result: {} }, // Missing id
        { jsonrpc: '2.0', id: 'test' }, // Missing result/error
        { jsonrpc: '2.0', id: 'test', result: {}, error: {} }, // Both result and error
      ];

      invalidResponses.forEach((response) => {
        expect(MCPResponseValidator.validateJSONRPCResponse(response)).toBe(false);
      });
    });

    it('should demonstrate validating tool responses', () => {
      // Valid tool response
      const validToolResponse = {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              data: { message: 'Success' },
            }),
          },
        ],
      };
      expect(MCPResponseValidator.validateToolResponseContent(validToolResponse)).toBe(true);

      // Parse the response data
      const data = MCPResponseValidator.parseToolResponseData(validToolResponse);
      expect(data.success).toBe(true);
      expect(data.data.message).toBe('Success');

      // Valid error response
      const validErrorResponse = {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: false,
              error: { type: 'validation', message: 'Invalid input' },
            }),
          },
        ],
      };
      expect(MCPResponseValidator.validateToolResponseContent(validErrorResponse)).toBe(true);

      const errorData = MCPResponseValidator.parseToolResponseData(validErrorResponse);
      expect(errorData.success).toBe(false);
      expect(errorData.error.type).toBe('validation');
    });

    it('should demonstrate validating tool parameters', () => {
      // Create a sample tool definition
      const toolDefinition = {
        name: 'build_queue',
        description: 'Queue a new build',
        inputSchema: {
          type: 'object' as const,
          properties: {
            definitionId: { type: 'number' },
            sourceBranch: { type: 'string' },
            parameters: { type: 'object' },
          },
          required: ['definitionId'],
        },
      };

      // Valid parameters
      const validParams = {
        definitionId: 1,
        sourceBranch: 'refs/heads/main',
        parameters: { buildConfiguration: 'Release' },
      };
      expect(MCPResponseValidator.validateToolParameters(toolDefinition, validParams)).toBe(true);

      // Invalid parameters (missing required field)
      const invalidParams = {
        sourceBranch: 'refs/heads/main',
        // Missing definitionId
      };
      expect(MCPResponseValidator.validateToolParameters(toolDefinition, invalidParams)).toBe(
        false,
      );
    });
  });

  describe('Environment Management Usage', () => {
    it('should demonstrate environment setup and cleanup', () => {
      // Manual environment management
      const env = new MCPTestEnvironment();

      // Set up custom environment
      env.setupTestEnvironment({
        ADO_ORGANIZATION: 'https://dev.azure.com/custom-org',
        ADO_PROJECT: 'custom-project',
        ADO_PAT: 'custom-token',
      });

      expect(process.env.ADO_ORGANIZATION).toBe('https://dev.azure.com/custom-org');
      expect(process.env.ADO_PROJECT).toBe('custom-project');
      expect(process.env.ADO_PAT).toBe('custom-token');

      // Restore original environment
      env.restore();
    });

    it('should demonstrate automatic environment cleanup', async () => {
      // Using the helper for automatic cleanup
      const result = await MCPTestEnvironment.withTestEnvironment(
        {
          ADO_PROJECT: 'temp-project',
          ADO_PAT: 'temp-token',
        },
        () => {
          // Test code that needs specific environment
          expect(process.env.ADO_PROJECT).toBe('temp-project');
          expect(process.env.ADO_PAT).toBe('temp-token');

          return 'test completed';
        },
      );

      expect(result).toBe('test completed');
      // Environment is automatically restored after the function completes
    });
  });

  describe('Assertion Helpers Usage', () => {
    it('should demonstrate using assertion helpers', () => {
      // Sample responses for testing
      const validListResponse = {
        jsonrpc: '2.0',
        id: 'test-1',
        result: {
          tools: [
            {
              name: 'test_tool',
              description: 'Test tool',
              inputSchema: {
                type: 'object' as const,
                properties: {},
                required: [],
              },
            },
          ],
        },
      };

      const validCallResponse = {
        jsonrpc: '2.0',
        id: 'test-2',
        result: {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                data: { message: 'Success' },
              }),
            },
          ],
        },
      };

      // Use assertions to validate responses
      expect(() => MCPAssertions.assertValidListToolsResponse(validListResponse)).not.toThrow();
      expect(() => MCPAssertions.assertValidCallToolResponse(validCallResponse)).not.toThrow();

      // Assert tool success/failure
      expect(() => MCPAssertions.assertToolSuccess(validCallResponse.result)).not.toThrow();

      // Assert tool existence
      const tools = validListResponse.result.tools;
      expect(() => MCPAssertions.assertToolExists(tools, 'test_tool')).not.toThrow();
      expect(() => MCPAssertions.assertToolExists(tools, 'nonexistent_tool')).toThrow();
    });
  });

  describe('Integration Testing Pattern', () => {
    it('should demonstrate a complete integration test pattern', async () => {
      // 1. Set up test environment
      const testEnv = new MCPTestEnvironment();
      testEnv.setupTestEnvironment({
        ADO_ORGANIZATION: 'https://dev.azure.com/test-org',
        ADO_PROJECT: 'integration-test-project',
        ADO_PAT: 'integration-test-token',
      });

      try {
        // 2. Create test server with mocked clients
        const server = MCPServerTestFactory.createMockedServer();

        // 3. Set up mock responses
        const mockQueues = [
          MockFactory.createMockQueue({ id: 1, name: 'Integration-Queue-1' }),
          MockFactory.createMockQueue({ id: 2, name: 'Integration-Queue-2' }),
        ];

        // 4. Test tool registration
        const tools = await server.getTools();
        MCPAssertions.assertToolExists(tools, 'project_list_queues');

        // 5. Create mock tool response
        const mockToolResponse = {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                data: mockQueues.filter((q) => q.name?.includes('Integration')),
              }),
            },
          ],
        };

        // 6. Validate response
        MCPAssertions.assertToolSuccess(mockToolResponse);
        const data = MCPResponseValidator.parseToolResponseData(mockToolResponse);
        expect(data.data).toHaveLength(2);
        expect(data.data[0].name).toContain('Integration-Queue');

        // 7. Test message creation
        const request = MCPMessageFactory.createCallToolRequest('project_list_queues', {
          nameFilter: 'Integration',
        });
        expect(request.params.name).toBe('project_list_queues');
        expect(request.params.arguments).toBeDefined();
        expect(request.params.arguments!.nameFilter).toBe('Integration');

        // 8. Clean up
        await server.cleanup();
      } finally {
        // 9. Restore environment
        testEnv.restore();
      }
    });
  });
});
