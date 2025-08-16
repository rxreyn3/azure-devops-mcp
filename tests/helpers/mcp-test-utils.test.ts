// Tests for MCP test utilities
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  MCPServerTestFactory,
  MCPMessageFactory,
  MCPResponseValidator,
  MCPTestEnvironment,
  MCPAssertions,
  TestMCPServer
} from './mcp-test-utils.js';
import { 
  listToolsResponse,
  successfulCallToolResponse,
  errorCallToolResponse,
  sampleToolDefinitions
} from '../fixtures/mcp-messages/index.js';

describe('MCP Test Utilities', () => {
  let testEnv: MCPTestEnvironment;

  beforeEach(() => {
    testEnv = new MCPTestEnvironment();
    testEnv.setupTestEnvironment();
  });

  afterEach(() => {
    testEnv.restore();
  });

  describe('MCPServerTestFactory', () => {
    it('should create a test server with default configuration', () => {
      const server = MCPServerTestFactory.createTestServer();
      expect(server).toBeInstanceOf(TestMCPServer);
      expect(server.server).toBeDefined();
    });

    it('should create a mocked server', () => {
      const server = MCPServerTestFactory.createMockedServer();
      expect(server).toBeInstanceOf(TestMCPServer);
      expect(server.mockTaskAgentClient).toBeDefined();
      expect(server.mockBuildClient).toBeDefined();
      expect(server.mockPipelineClient).toBeDefined();
    });

    it('should create an integration server', () => {
      const config = {
        organization: 'https://dev.azure.com/test-org',
        project: 'test-project',
        pat: 'test-token',
        logLevel: 'info'
      };
      const server = MCPServerTestFactory.createIntegrationServer(config);
      expect(server).toBeInstanceOf(TestMCPServer);
      expect(server.mockTaskAgentClient).toBeUndefined();
    });

    it('should accept custom configuration', () => {
      const customConfig = {
        project: 'custom-project'
      };
      const server = MCPServerTestFactory.createTestServer({
        customConfig
      });
      expect(server).toBeInstanceOf(TestMCPServer);
    });
  });

  describe('MCPMessageFactory', () => {
    it('should create ListTools request', () => {
      const request = MCPMessageFactory.createListToolsRequest();
      expect(request.jsonrpc).toBe('2.0');
      expect(request.method).toBe('tools/list');
      expect(request.params).toEqual({});
      expect(request.id).toMatch(/^test-request-\d+$/);
    });

    it('should create CallTool request', () => {
      const request = MCPMessageFactory.createCallToolRequest('test_tool', { param: 'value' });
      expect(request.jsonrpc).toBe('2.0');
      expect(request.method).toBe('tools/call');
      expect(request.params.name).toBe('test_tool');
      expect(request.params.arguments).toEqual({ param: 'value' });
      expect(request.id).toMatch(/^test-request-\d+$/);
    });

    it('should create CallTool request without arguments', () => {
      const request = MCPMessageFactory.createCallToolRequest('test_tool');
      expect(request.params.arguments).toEqual({});
    });

    it('should create batch tool calls', () => {
      const toolCalls = [
        { name: 'tool1', args: { param1: 'value1' } },
        { name: 'tool2', args: { param2: 'value2' } }
      ];
      const requests = MCPMessageFactory.createBatchToolCalls(toolCalls);
      
      expect(requests).toHaveLength(2);
      expect(requests[0].params.name).toBe('tool1');
      expect(requests[0].params.arguments).toEqual({ param1: 'value1' });
      expect(requests[1].params.name).toBe('tool2');
      expect(requests[1].params.arguments).toEqual({ param2: 'value2' });
    });

    it('should create invalid tool request', () => {
      const request = MCPMessageFactory.createInvalidToolRequest();
      expect(request.params.name).toBe('nonexistent_tool');
    });

    it('should create malformed request', () => {
      const request = MCPMessageFactory.createMalformedRequest();
      expect(request.jsonrpc).toBe('2.0');
      expect(request.id).toBeUndefined();
      expect(request.method).toBeUndefined();
    });

    it('should create common tool calls', () => {
      const commonCalls = MCPMessageFactory.createCommonToolCalls();
      
      expect(commonCalls.healthCheck.params.name).toBe('project_health_check');
      expect(commonCalls.listQueues.params.name).toBe('project_list_queues');
      expect(commonCalls.listBuilds.params.name).toBe('build_list');
      expect(commonCalls.queueBuild.params.name).toBe('build_queue');
      expect(commonCalls.findAgent.params.name).toBe('org_find_agent');
      expect(commonCalls.downloadLogs.params.name).toBe('build_download_job_logs');
    });

    it('should generate unique request IDs', () => {
      const request1 = MCPMessageFactory.createListToolsRequest();
      const request2 = MCPMessageFactory.createListToolsRequest();
      expect(request1.id).not.toBe(request2.id);
    });
  });

  describe('MCPResponseValidator', () => {
    describe('validateJSONRPCResponse', () => {
      it('should validate valid JSON-RPC response', () => {
        const response = {
          jsonrpc: '2.0',
          id: 'test-1',
          result: { data: 'test' }
        };
        expect(MCPResponseValidator.validateJSONRPCResponse(response)).toBe(true);
      });

      it('should reject response without jsonrpc field', () => {
        const response = {
          id: 'test-1',
          result: { data: 'test' }
        };
        expect(MCPResponseValidator.validateJSONRPCResponse(response)).toBe(false);
      });

      it('should reject response with wrong jsonrpc version', () => {
        const response = {
          jsonrpc: '1.0',
          id: 'test-1',
          result: { data: 'test' }
        };
        expect(MCPResponseValidator.validateJSONRPCResponse(response)).toBe(false);
      });

      it('should reject response without id', () => {
        const response = {
          jsonrpc: '2.0',
          result: { data: 'test' }
        };
        expect(MCPResponseValidator.validateJSONRPCResponse(response)).toBe(false);
      });

      it('should reject response with both result and error', () => {
        const response = {
          jsonrpc: '2.0',
          id: 'test-1',
          result: { data: 'test' },
          error: { code: -1, message: 'error' }
        };
        expect(MCPResponseValidator.validateJSONRPCResponse(response)).toBe(false);
      });

      it('should reject response without result or error', () => {
        const response = {
          jsonrpc: '2.0',
          id: 'test-1'
        };
        expect(MCPResponseValidator.validateJSONRPCResponse(response)).toBe(false);
      });
    });

    describe('validateListToolsResponse', () => {
      it('should validate valid ListTools response', () => {
        const response = {
          jsonrpc: '2.0',
          id: 'test-1',
          result: listToolsResponse
        };
        expect(MCPResponseValidator.validateListToolsResponse(response)).toBe(true);
      });

      it('should reject response without tools array', () => {
        const response = {
          jsonrpc: '2.0',
          id: 'test-1',
          result: { notTools: [] }
        };
        expect(MCPResponseValidator.validateListToolsResponse(response)).toBe(false);
      });
    });

    describe('validateCallToolResponse', () => {
      it('should validate valid CallTool response', () => {
        const response = {
          jsonrpc: '2.0',
          id: 'test-1',
          result: successfulCallToolResponse
        };
        expect(MCPResponseValidator.validateCallToolResponse(response)).toBe(true);
      });

      it('should reject response without content array', () => {
        const response = {
          jsonrpc: '2.0',
          id: 'test-1',
          result: { notContent: 'test' }
        };
        expect(MCPResponseValidator.validateCallToolResponse(response)).toBe(false);
      });
    });

    describe('validateToolDefinition', () => {
      it('should validate valid tool definition', () => {
        const tool = sampleToolDefinitions[0];
        expect(MCPResponseValidator.validateToolDefinition(tool)).toBe(true);
      });

      it('should reject tool without name', () => {
        const tool = {
          description: 'Test tool',
          inputSchema: { type: 'object', properties: {} }
        };
        expect(MCPResponseValidator.validateToolDefinition(tool)).toBe(false);
      });

      it('should reject tool without description', () => {
        const tool = {
          name: 'test_tool',
          inputSchema: { type: 'object', properties: {} }
        };
        expect(MCPResponseValidator.validateToolDefinition(tool)).toBe(false);
      });

      it('should reject tool without inputSchema', () => {
        const tool = {
          name: 'test_tool',
          description: 'Test tool'
        };
        expect(MCPResponseValidator.validateToolDefinition(tool)).toBe(false);
      });
    });

    describe('validateToolResponseContent', () => {
      it('should validate successful tool response', () => {
        expect(MCPResponseValidator.validateToolResponseContent(successfulCallToolResponse)).toBe(true);
      });

      it('should validate error tool response', () => {
        expect(MCPResponseValidator.validateToolResponseContent(errorCallToolResponse)).toBe(true);
      });

      it('should reject response without content array', () => {
        const response = { notContent: 'test' } as any;
        expect(MCPResponseValidator.validateToolResponseContent(response)).toBe(false);
      });

      it('should reject response with empty content array', () => {
        const response = { content: [] };
        expect(MCPResponseValidator.validateToolResponseContent(response)).toBe(false);
      });
    });

    describe('parseToolResponseData', () => {
      it('should parse successful response data', () => {
        const data = MCPResponseValidator.parseToolResponseData(successfulCallToolResponse);
        expect(data.success).toBe(true);
        expect(data.data).toBeDefined();
      });

      it('should parse error response data', () => {
        const data = MCPResponseValidator.parseToolResponseData(errorCallToolResponse);
        expect(data.success).toBe(false);
        expect(data.error).toBeDefined();
      });

      it('should throw on invalid response', () => {
        const invalidResponse = { content: [] };
        expect(() => MCPResponseValidator.parseToolResponseData(invalidResponse)).toThrow();
      });
    });

    describe('validateUniqueToolNames', () => {
      it('should validate tools with unique names', () => {
        expect(MCPResponseValidator.validateUniqueToolNames(sampleToolDefinitions)).toBe(true);
      });

      it('should reject tools with duplicate names', () => {
        const duplicateTools = [
          sampleToolDefinitions[0],
          sampleToolDefinitions[0] // Duplicate
        ];
        expect(MCPResponseValidator.validateUniqueToolNames(duplicateTools)).toBe(false);
      });
    });

    describe('validateToolParameters', () => {
      it('should validate parameters matching schema', () => {
        const tool = sampleToolDefinitions[2]; // build_queue tool
        const params = {
          definitionId: 1,
          sourceBranch: 'refs/heads/main'
        };
        expect(MCPResponseValidator.validateToolParameters(tool, params)).toBe(true);
      });

      it('should reject parameters missing required fields', () => {
        const tool = sampleToolDefinitions[2]; // build_queue tool (requires definitionId)
        const params = {
          sourceBranch: 'refs/heads/main'
          // Missing definitionId
        };
        expect(MCPResponseValidator.validateToolParameters(tool, params)).toBe(false);
      });
    });
  });

  describe('MCPTestEnvironment', () => {
    it('should set up test environment variables', () => {
      const env = new MCPTestEnvironment();
      env.setupTestEnvironment({
        ADO_PROJECT: 'custom-project'
      });
      
      expect(process.env.ADO_PROJECT).toBe('custom-project');
      expect(process.env.ADO_ORGANIZATION).toBe('https://dev.azure.com/test-org');
      
      env.restore();
    });

    it('should restore original environment', () => {
      const originalProject = process.env.ADO_PROJECT;
      
      const env = new MCPTestEnvironment();
      env.setupTestEnvironment({
        ADO_PROJECT: 'custom-project'
      });
      
      expect(process.env.ADO_PROJECT).toBe('custom-project');
      
      env.restore();
      expect(process.env.ADO_PROJECT).toBe(originalProject);
    });

    it('should work with withTestEnvironment helper', async () => {
      const result = await MCPTestEnvironment.withTestEnvironment(
        { ADO_PROJECT: 'test-project' },
        () => {
          expect(process.env.ADO_PROJECT).toBe('test-project');
          return 'test-result';
        }
      );
      
      expect(result).toBe('test-result');
    });
  });

  describe('MCPAssertions', () => {
    it('should assert valid ListTools response', () => {
      const response = {
        jsonrpc: '2.0',
        id: 'test-1',
        result: listToolsResponse
      };
      
      expect(() => MCPAssertions.assertValidListToolsResponse(response)).not.toThrow();
    });

    it('should assert valid CallTool response', () => {
      const response = {
        jsonrpc: '2.0',
        id: 'test-1',
        result: successfulCallToolResponse
      };
      
      expect(() => MCPAssertions.assertValidCallToolResponse(response)).not.toThrow();
    });

    it('should assert tool success', () => {
      expect(() => MCPAssertions.assertToolSuccess(successfulCallToolResponse)).not.toThrow();
    });

    it('should assert tool failure', () => {
      expect(() => MCPAssertions.assertToolFailure(errorCallToolResponse)).not.toThrow();
    });

    it('should throw on tool success when expecting failure', () => {
      expect(() => MCPAssertions.assertToolFailure(successfulCallToolResponse)).toThrow();
    });

    it('should throw on tool failure when expecting success', () => {
      expect(() => MCPAssertions.assertToolSuccess(errorCallToolResponse)).toThrow();
    });

    it('should assert tool exists', () => {
      expect(() => MCPAssertions.assertToolExists(sampleToolDefinitions, 'project_health_check')).not.toThrow();
    });

    it('should throw when tool does not exist', () => {
      expect(() => MCPAssertions.assertToolExists(sampleToolDefinitions, 'nonexistent_tool')).toThrow();
    });

    it('should assert all tools exist', () => {
      const toolNames = ['project_health_check', 'project_list_queues'];
      expect(() => MCPAssertions.assertAllToolsExist(sampleToolDefinitions, toolNames)).not.toThrow();
    });

    it('should throw when not all tools exist', () => {
      const toolNames = ['project_health_check', 'nonexistent_tool'];
      expect(() => MCPAssertions.assertAllToolsExist(sampleToolDefinitions, toolNames)).toThrow();
    });
  });
});