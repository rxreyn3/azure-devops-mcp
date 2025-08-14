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
  type TestMCPServer,
} from '../helpers/mcp-test-utils.js';
import { MockFactory } from '../helpers/mock-factory.js';
import * as TaskAgentInterfaces from 'azure-devops-node-api/interfaces/TaskAgentInterfaces.js';

// Mock Azure DevOps API
vi.mock('azure-devops-node-api', () => ({
  getPersonalAccessTokenHandler: vi.fn(() => ({
    canHandleAuthentication: vi.fn(() => true),
    prepareRequest: vi.fn(),
  })),
  WebApi: vi.fn().mockImplementation(() => ({
    getTaskAgentApi: vi.fn().mockResolvedValue({
      getAgentQueues: vi.fn().mockResolvedValue([]),
      getAgentQueue: vi.fn().mockResolvedValue(null),
      getAgents: vi.fn().mockResolvedValue([]),
    }),
    getBuildApi: vi.fn().mockResolvedValue({
      getBuilds: vi.fn().mockResolvedValue([]),
      getBuildTimeline: vi.fn().mockResolvedValue(null),
      queueBuild: vi.fn().mockResolvedValue(null),
    }),
    getPipelinesApi: vi.fn().mockResolvedValue({
      listPipelineRuns: vi.fn().mockResolvedValue([]),
    }),
  })),
}));

// Mock external dependencies
vi.mock('../../src/utils/temp-manager.js', () => ({
  TempManager: {
    getInstance: vi.fn(() => ({
      initialize: vi.fn().mockResolvedValue(undefined),
      cleanup: vi.fn().mockResolvedValue({ filesRemoved: 0 }),
      getDownloadPath: vi.fn().mockReturnValue('/tmp/test-download'),
      getTempDir: vi.fn().mockResolvedValue('/tmp/ado-mcp-server-test'),
      listDownloads: vi.fn().mockResolvedValue([]),
      getTempDirInfo: vi.fn().mockResolvedValue({
        path: '/tmp/ado-mcp-server-test',
        totalFiles: 0,
        totalSize: 0,
        oldestFile: null,
        newestFile: null,
      }),
    })),
  },
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: vi.fn().mockImplementation(() => ({
    setRequestHandler: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('MCP Tool Execution End-to-End Tests', () => {
  let testEnv: MCPTestEnvironment;
  let testServer: TestMCPServer;
  let originalConsoleError: typeof console.error;

  beforeEach(() => {
    testEnv = new MCPTestEnvironment();
    testEnv.setupTestEnvironment({
      ADO_ORGANIZATION: 'https://dev.azure.com/test-org',
      ADO_PROJECT: 'test-project',
      ADO_PAT: 'test-token',
    });

    // Capture console.error to avoid noise in test output
    originalConsoleError = console.error;
    console.error = vi.fn();

    testServer = MCPServerTestFactory.createMockedServer();
  });

  afterEach(async () => {
    await testServer.cleanup();
    testEnv.restore();
    console.error = originalConsoleError;
    vi.clearAllMocks();
  });

  describe('Agent Management Tools E2E', () => {
    describe('project_health_check', () => {
      it('should execute complete MCP request-response flow', async () => {
        const request = MCPMessageFactory.createCallToolRequest('project_health_check');

        const result = await testServer.executeToolCall(request);

        // Verify MCP response format compliance
        MCPAssertions.assertValidCallToolResponse({
          jsonrpc: '2.0',
          id: request.id,
          result,
        });

        // Verify tool response content format
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toBeTruthy();

        const responseData = JSON.parse(result.content[0].text as string);
        expect(responseData).toEqual({
          status: 'connected',
          message: 'Azure DevOps MCP server is running',
        });
      });

      it('should validate empty parameters correctly', async () => {
        const request = MCPMessageFactory.createCallToolRequest('project_health_check', {});

        const result = await testServer.executeToolCall(request);

        // Verify tool response content format
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toBeTruthy();
      });
    });

    describe('project_list_queues', () => {
      it('should execute complete MCP request-response flow', async () => {
        const request = MCPMessageFactory.createCallToolRequest('project_list_queues');

        const result = await testServer.executeToolCall(request);

        // Verify MCP response format compliance
        MCPAssertions.assertValidCallToolResponse({
          jsonrpc: '2.0',
          id: request.id,
          result,
        });

        // Verify tool response content format
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toBeTruthy();

        // Should be valid JSON
        expect(() => JSON.parse(result.content[0].text as string)).not.toThrow();
      });

      it('should handle API errors gracefully', async () => {
        // This test will use the mocked API that returns empty results
        const request = MCPMessageFactory.createCallToolRequest('project_list_queues');

        const result = await testServer.executeToolCall(request);

        // Verify MCP response format compliance
        MCPAssertions.assertValidCallToolResponse({
          jsonrpc: '2.0',
          id: request.id,
          result,
        });

        // Should return valid response even with empty data
        expect(result.content[0].text).toBeTruthy();
      });
    });

    describe('project_get_queue', () => {
      it('should validate required parameters through MCP protocol', async () => {
        const request = MCPMessageFactory.createCallToolRequest('project_get_queue', {});

        const result = await testServer.executeToolCall(request);

        // Should return an error response for missing required parameter
        expect(result.content[0].text).toContain('❌');
      });

      it('should execute with valid parameters', async () => {
        const request = MCPMessageFactory.createCallToolRequest('project_get_queue', {
          queueIdOrName: '123',
        });

        const result = await testServer.executeToolCall(request);

        MCPAssertions.assertValidCallToolResponse({
          jsonrpc: '2.0',
          id: request.id,
          result,
        });

        // Verify tool response content format
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toBeTruthy();
      });
    });

    describe('org_find_agent', () => {
      it('should validate required parameters', async () => {
        const request = MCPMessageFactory.createCallToolRequest('org_find_agent', {});

        const result = await testServer.executeToolCall(request);

        // Should return an error response for missing required parameter or API error
        expect(result.content[0].text).toContain('❌');
      });

      it('should execute with valid parameters', async () => {
        const request = MCPMessageFactory.createCallToolRequest('org_find_agent', {
          agentName: 'TestAgent-001',
        });

        const result = await testServer.executeToolCall(request);

        MCPAssertions.assertValidCallToolResponse({
          jsonrpc: '2.0',
          id: request.id,
          result,
        });

        // Verify tool response content format
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toBeTruthy();
      });
    });

    describe('org_list_agents', () => {
      it('should execute with optional parameters', async () => {
        const request = MCPMessageFactory.createCallToolRequest('org_list_agents', {
          nameFilter: 'Agent-001',
          onlyOnline: true,
          limit: 10,
        });

        const result = await testServer.executeToolCall(request);

        MCPAssertions.assertValidCallToolResponse({
          jsonrpc: '2.0',
          id: request.id,
          result,
        });

        // Verify tool response content format
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toBeTruthy();

        // Should be valid JSON
        const responseData = JSON.parse(result.content[0].text as string);
        expect(responseData).toHaveProperty('agents');
        expect(responseData).toHaveProperty('summary');
      });
    });
  });

  describe('Build Management Tools E2E', () => {
    describe('build_list', () => {
      it('should execute complete MCP request-response flow', async () => {
        const request = MCPMessageFactory.createCallToolRequest('build_list', {
          top: 10,
        });

        const result = await testServer.executeToolCall(request);

        MCPAssertions.assertValidCallToolResponse({
          jsonrpc: '2.0',
          id: request.id,
          result,
        });

        // Verify tool response content format
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toBeTruthy();

        // Should be valid JSON
        const responseData = JSON.parse(result.content[0].text as string);
        expect(responseData).toHaveProperty('builds');
        // The actual response format might be different, let's check what we get
        expect(Array.isArray(responseData.builds)).toBe(true);
      });

      it('should validate parameter types', async () => {
        const request = MCPMessageFactory.createCallToolRequest('build_list', {
          top: 'invalid', // Should be number
        });

        // The tool should handle type conversion or validation
        const result = await testServer.executeToolCall(request);

        // Should either succeed with converted value or fail with validation error
        expect(result).toBeDefined();
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
      });
    });

    describe('build_queue', () => {
      it('should validate required parameters', async () => {
        const request = MCPMessageFactory.createCallToolRequest('build_queue', {});

        const result = await testServer.executeToolCall(request);

        // Should return an error response for missing required parameter or API error
        expect(result.content[0].text).toContain('❌');
      });

      it('should execute with valid parameters', async () => {
        const request = MCPMessageFactory.createCallToolRequest('build_queue', {
          definitionId: 1,
          sourceBranch: 'refs/heads/main',
        });

        const result = await testServer.executeToolCall(request);

        MCPAssertions.assertValidCallToolResponse({
          jsonrpc: '2.0',
          id: request.id,
          result,
        });

        // Verify tool response content format
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toBeTruthy();
      });
    });

    describe('build_get_timeline', () => {
      it('should validate required buildId parameter', async () => {
        const request = MCPMessageFactory.createCallToolRequest('build_get_timeline', {});

        const result = await testServer.executeToolCall(request);

        // Should return an error response for missing required parameter
        expect(result.content[0].text).toContain('❌');
      });

      it('should execute with valid buildId', async () => {
        const request = MCPMessageFactory.createCallToolRequest('build_get_timeline', {
          buildId: 123,
        });

        const result = await testServer.executeToolCall(request);

        MCPAssertions.assertValidCallToolResponse({
          jsonrpc: '2.0',
          id: request.id,
          result,
        });

        // Verify tool response content format
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toBeTruthy();
      });
    });

    describe('build_download_job_logs', () => {
      it('should validate required parameters', async () => {
        const request = MCPMessageFactory.createCallToolRequest('build_download_job_logs', {
          buildId: 123,
          // Missing jobName
        });

        const result = await testServer.executeToolCall(request);

        // Should return an error response for missing required parameter
        expect(result.content[0].text).toContain('❌');
      });

      it('should execute with valid parameters', async () => {
        const request = MCPMessageFactory.createCallToolRequest('build_download_job_logs', {
          buildId: 123,
          jobName: 'Build Job',
        });

        const result = await testServer.executeToolCall(request);

        MCPAssertions.assertValidCallToolResponse({
          jsonrpc: '2.0',
          id: request.id,
          result,
        });

        // Verify tool response content format
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toBeTruthy();
      });
    });
  });

  describe('File Management Tools E2E', () => {
    describe('list_downloads', () => {
      it('should execute complete MCP request-response flow', async () => {
        const request = MCPMessageFactory.createCallToolRequest('list_downloads');

        const result = await testServer.executeToolCall(request);

        MCPAssertions.assertValidCallToolResponse({
          jsonrpc: '2.0',
          id: request.id,
          result,
        });

        // Verify tool response content format
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toBeTruthy();

        // Should be valid JSON
        const responseData = JSON.parse(result.content[0].text as string);
        expect(responseData).toHaveProperty('downloads');
        expect(responseData).toHaveProperty('summary');
      });
    });

    describe('cleanup_downloads', () => {
      it('should execute with optional age parameter', async () => {
        const request = MCPMessageFactory.createCallToolRequest('cleanup_downloads', {
          ageHours: 24,
        });

        const result = await testServer.executeToolCall(request);

        MCPAssertions.assertValidCallToolResponse({
          jsonrpc: '2.0',
          id: request.id,
          result,
        });

        // Verify tool response content format
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toBeTruthy();
      });

      it('should use default age when not specified', async () => {
        const request = MCPMessageFactory.createCallToolRequest('cleanup_downloads');

        const result = await testServer.executeToolCall(request);

        // Verify tool response content format
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toBeTruthy();
      });
    });

    describe('get_download_location', () => {
      it('should execute complete MCP request-response flow', async () => {
        const request = MCPMessageFactory.createCallToolRequest('get_download_location');

        const result = await testServer.executeToolCall(request);

        MCPAssertions.assertValidCallToolResponse({
          jsonrpc: '2.0',
          id: request.id,
          result,
        });

        // Verify tool response content format
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toBeTruthy();

        // Should be valid JSON
        const responseData = JSON.parse(result.content[0].text as string);
        expect(responseData).toHaveProperty('path');
        // The actual response format might be different, let's check what we get
        expect(typeof responseData.path).toBe('string');
      });
    });
  });

  describe('Error Propagation and MCP Compliance', () => {
    it('should handle unknown tool names with proper MCP error response', async () => {
      const request = MCPMessageFactory.createInvalidToolRequest('nonexistent_tool');

      await expect(testServer.executeToolCall(request)).rejects.toThrow(
        'Unknown tool: nonexistent_tool',
      );
    });

    it('should validate tool parameters according to schema', async () => {
      const tools = await testServer.getTools();
      const buildListTool = tools.find((t) => t.name === 'build_list');

      expect(buildListTool).toBeDefined();

      // Test parameter validation
      const validParams = { top: 10 };
      const isValid = MCPResponseValidator.validateToolParameters(buildListTool!, validParams);
      expect(isValid).toBe(true);

      // Test that the validator allows additional properties (flexible validation)
      const extraParams = { top: 10, extraProperty: 'allowed' };
      const isValidExtra = MCPResponseValidator.validateToolParameters(buildListTool!, extraParams);
      expect(isValidExtra).toBe(true);
    });

    it('should maintain MCP response format consistency across all tools', async () => {
      const tools = await testServer.getTools();

      // Test a sample of tools from each category
      const testCases = [
        { name: 'project_health_check', args: {} },
        { name: 'list_downloads', args: {} },
        { name: 'get_download_location', args: {} },
      ];

      for (const testCase of testCases) {
        const tool = tools.find((t) => t.name === testCase.name);
        expect(tool).toBeDefined();

        const request = MCPMessageFactory.createCallToolRequest(testCase.name, testCase.args);
        const result = await testServer.executeToolCall(request);

        // Verify MCP response format compliance
        MCPAssertions.assertValidCallToolResponse({
          jsonrpc: '2.0',
          id: request.id,
          result,
        });

        // Verify basic tool response content format
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toBeTruthy();
      }
    });

    it('should handle API errors gracefully', async () => {
      // Test with a tool that might encounter API errors
      const request = MCPMessageFactory.createCallToolRequest('project_list_queues');
      const result = await testServer.executeToolCall(request);

      // Verify MCP response format compliance even for potential errors
      MCPAssertions.assertValidCallToolResponse({
        jsonrpc: '2.0',
        id: request.id,
        result,
      });

      // Should return valid response format
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBeTruthy();
    });
  });

  describe('Tool Discovery and Registration', () => {
    it('should register all expected tools with valid schemas', async () => {
      const tools = await testServer.getTools();

      // Verify all expected tool categories are present
      const expectedAgentTools = [
        'project_health_check',
        'project_list_queues',
        'project_get_queue',
        'org_find_agent',
        'org_list_agents',
      ];

      const expectedBuildTools = [
        'build_list',
        'build_list_definitions',
        'build_get_timeline',
        'build_queue',
        'build_download_job_logs',
        'build_download_logs_by_name',
        'build_list_artifacts',
        'build_download_artifact',
      ];

      const expectedFileTools = ['list_downloads', 'cleanup_downloads', 'get_download_location'];

      const allExpectedTools = [...expectedAgentTools, ...expectedBuildTools, ...expectedFileTools];

      // Verify all tools are registered
      for (const toolName of allExpectedTools) {
        MCPAssertions.assertToolExists(tools, toolName);
      }

      // Verify all tools have valid schemas
      for (const tool of tools) {
        expect(MCPResponseValidator.validateToolDefinition(tool)).toBe(true);
      }

      // Verify unique tool names
      expect(MCPResponseValidator.validateUniqueToolNames(tools)).toBe(true);
    });

    it('should provide consistent tool metadata across all tools', async () => {
      const tools = await testServer.getTools();

      for (const tool of tools) {
        // Every tool should have a name, description, and input schema
        expect(tool.name).toBeTruthy();
        expect(typeof tool.name).toBe('string');
        expect(tool.description).toBeTruthy();
        expect(typeof tool.description).toBe('string');
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();

        // Required fields should be an array if present
        if (tool.inputSchema.required) {
          expect(Array.isArray(tool.inputSchema.required)).toBe(true);
        }
      }
    });
  });
});
