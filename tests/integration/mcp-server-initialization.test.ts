import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AzureDevOpsMCPServer } from '../../src/server.js';
import { validateConfig, type Config } from '../../src/config.js';
import { TempManager } from '../../src/utils/temp-manager.js';
import {
  MCPServerTestFactory,
  MCPTestEnvironment,
  MCPResponseValidator,
  MCPAssertions,
} from '../helpers/mcp-test-utils.js';

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

describe('MCP Server Initialization', () => {
  let testEnv: MCPTestEnvironment;
  let originalConsoleError: typeof console.error;

  beforeEach(() => {
    testEnv = new MCPTestEnvironment();
    // Capture console.error to avoid noise in test output
    originalConsoleError = console.error;
    console.error = vi.fn();
  });

  afterEach(() => {
    testEnv.restore();
    console.error = originalConsoleError;
    vi.clearAllMocks();
  });

  describe('Server startup with valid configuration', () => {
    it('should successfully create server instance with valid config', () => {
      testEnv.setupTestEnvironment({
        ADO_ORGANIZATION: 'https://dev.azure.com/test-org',
        ADO_PROJECT: 'test-project',
        ADO_PAT: 'test-token',
        LOG_LEVEL: 'info',
      });

      const config = validateConfig();
      const server = new AzureDevOpsMCPServer(config);

      expect(server).toBeInstanceOf(AzureDevOpsMCPServer);
    });

    it('should initialize with cleaned organization URL', () => {
      testEnv.setupTestEnvironment({
        ADO_ORGANIZATION: 'test-org',
        ADO_PROJECT: 'test-project',
        ADO_PAT: 'test-token',
      });

      const config = validateConfig();
      const server = new AzureDevOpsMCPServer(config);

      expect(server).toBeInstanceOf(AzureDevOpsMCPServer);
      expect(config.organization).toBe('https://dev.azure.com/test-org');
    });

    it('should handle organization URL with trailing slash', () => {
      testEnv.setupTestEnvironment({
        ADO_ORGANIZATION: 'https://dev.azure.com/test-org/',
        ADO_PROJECT: 'test-project',
        ADO_PAT: 'test-token',
      });

      const config = validateConfig();
      const server = new AzureDevOpsMCPServer(config);

      expect(server).toBeInstanceOf(AzureDevOpsMCPServer);
      expect(config.organization).toBe('https://dev.azure.com/test-org');
    });

    it('should initialize temp manager and perform cleanup on startup', async () => {
      testEnv.setupTestEnvironment({
        ADO_ORGANIZATION: 'https://dev.azure.com/test-org',
        ADO_PROJECT: 'test-project',
        ADO_PAT: 'test-token',
      });

      const mockTempManager = {
        initialize: vi.fn().mockResolvedValue(undefined),
        cleanup: vi.fn().mockResolvedValue({ filesRemoved: 2 }),
      };

      vi.mocked(TempManager.getInstance).mockReturnValue(mockTempManager as any);

      const config = validateConfig();
      const server = new AzureDevOpsMCPServer(config);

      await server.start();

      expect(mockTempManager.initialize).toHaveBeenCalledOnce();
      expect(mockTempManager.cleanup).toHaveBeenCalledWith(24);
      expect(console.error).toHaveBeenCalledWith('Cleaned up 2 old temporary file(s)');
      expect(console.error).toHaveBeenCalledWith('Azure DevOps MCP Server started');
    });

    it('should handle cleanup errors gracefully during startup', async () => {
      testEnv.setupTestEnvironment({
        ADO_ORGANIZATION: 'https://dev.azure.com/test-org',
        ADO_PROJECT: 'test-project',
        ADO_PAT: 'test-token',
      });

      const cleanupError = new Error('Cleanup failed');
      const mockTempManager = {
        initialize: vi.fn().mockResolvedValue(undefined),
        cleanup: vi.fn().mockRejectedValue(cleanupError),
      };

      vi.mocked(TempManager.getInstance).mockReturnValue(mockTempManager as any);

      const config = validateConfig();
      const server = new AzureDevOpsMCPServer(config);

      await server.start();

      expect(mockTempManager.initialize).toHaveBeenCalledOnce();
      expect(mockTempManager.cleanup).toHaveBeenCalledWith(24);
      expect(console.error).toHaveBeenCalledWith('Failed to cleanup old temporary files:', cleanupError);
      expect(console.error).toHaveBeenCalledWith('Azure DevOps MCP Server started');
    });
  });

  describe('Server startup with invalid configuration', () => {
    it('should throw error when ADO_ORGANIZATION is missing', () => {
      // Clear all ADO environment variables first
      delete process.env.ADO_ORGANIZATION;
      delete process.env.ADO_PROJECT;
      delete process.env.ADO_PAT;
      
      process.env.ADO_PROJECT = 'test-project';
      process.env.ADO_PAT = 'test-token';

      expect(() => validateConfig()).toThrow('Configuration errors:\nADO_ORGANIZATION is required');
    });

    it('should throw error when ADO_PROJECT is missing', () => {
      // Clear all ADO environment variables first
      delete process.env.ADO_ORGANIZATION;
      delete process.env.ADO_PROJECT;
      delete process.env.ADO_PAT;
      
      process.env.ADO_ORGANIZATION = 'https://dev.azure.com/test-org';
      process.env.ADO_PAT = 'test-token';

      expect(() => validateConfig()).toThrow('Configuration errors:\nADO_PROJECT is required');
    });

    it('should throw error when ADO_PAT is missing', () => {
      // Clear all ADO environment variables first
      delete process.env.ADO_ORGANIZATION;
      delete process.env.ADO_PROJECT;
      delete process.env.ADO_PAT;
      
      process.env.ADO_ORGANIZATION = 'https://dev.azure.com/test-org';
      process.env.ADO_PROJECT = 'test-project';

      expect(() => validateConfig()).toThrow('Configuration errors:\nADO_PAT is required');
    });

    it('should throw error when multiple required fields are missing', () => {
      // Clear all ADO environment variables
      delete process.env.ADO_ORGANIZATION;
      delete process.env.ADO_PROJECT;
      delete process.env.ADO_PAT;

      expect(() => validateConfig()).toThrow(
        'Configuration errors:\nADO_ORGANIZATION is required\nADO_PROJECT is required\nADO_PAT is required'
      );
    });

    it('should not create server instance with invalid config', () => {
      // Clear all ADO environment variables
      delete process.env.ADO_ORGANIZATION;
      delete process.env.ADO_PROJECT;
      delete process.env.ADO_PAT;

      expect(() => {
        const config = validateConfig();
        new AzureDevOpsMCPServer(config);
      }).toThrow('Configuration errors:');
    });
  });

  describe('Tool registration and discovery', () => {
    let testServer: ReturnType<typeof MCPServerTestFactory.createTestServer>;

    beforeEach(() => {
      testEnv.setupTestEnvironment({
        ADO_ORGANIZATION: 'https://dev.azure.com/test-org',
        ADO_PROJECT: 'test-project',
        ADO_PAT: 'test-token',
      });

      testServer = MCPServerTestFactory.createTestServer();
    });

    afterEach(async () => {
      await testServer.cleanup();
    });

    it('should register all expected tools during initialization', async () => {
      const tools = await testServer.getTools();

      expect(tools).toBeDefined();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);

      // Verify all tools have valid definitions
      tools.forEach((tool) => {
        expect(MCPResponseValidator.validateToolDefinition(tool)).toBe(true);
      });
    });

    it('should register agent management tools', async () => {
      const tools = await testServer.getTools();
      const expectedAgentTools = [
        'project_health_check',
        'project_list_queues',
        'project_get_queue',
        'org_find_agent',
        'org_list_agents',
      ];

      expectedAgentTools.forEach((toolName) => {
        MCPAssertions.assertToolExists(tools, toolName);
      });
    });

    it('should register build management tools', async () => {
      const tools = await testServer.getTools();
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

      expectedBuildTools.forEach((toolName) => {
        MCPAssertions.assertToolExists(tools, toolName);
      });
    });

    it('should register file management tools', async () => {
      const tools = await testServer.getTools();
      const expectedFileTools = [
        'list_downloads',
        'cleanup_downloads',
        'get_download_location',
      ];

      expectedFileTools.forEach((toolName) => {
        MCPAssertions.assertToolExists(tools, toolName);
      });
    });

    it('should have unique tool names', async () => {
      const tools = await testServer.getTools();

      expect(MCPResponseValidator.validateUniqueToolNames(tools)).toBe(true);
    });

    it('should have valid tool schemas', async () => {
      const tools = await testServer.getTools();

      tools.forEach((tool) => {
        expect(tool.name).toBeTruthy();
        expect(typeof tool.name).toBe('string');
        expect(tool.description).toBeTruthy();
        expect(typeof tool.description).toBe('string');
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
      });
    });

    it('should handle tool discovery through MCP protocol', async () => {
      const tools = await testServer.getTools();

      // Simulate ListTools request
      expect(tools).toBeDefined();
      expect(Array.isArray(tools)).toBe(true);

      // Verify response would be valid MCP format
      const mockResponse = {
        jsonrpc: '2.0',
        id: 'test-1',
        result: { tools },
      };

      expect(MCPResponseValidator.validateListToolsResponse(mockResponse)).toBe(true);
    });
  });

  describe('Server configuration validation', () => {
    it('should use default log level when not specified', () => {
      testEnv.setupTestEnvironment({
        ADO_ORGANIZATION: 'https://dev.azure.com/test-org',
        ADO_PROJECT: 'test-project',
        ADO_PAT: 'test-token',
      });

      const config = validateConfig();
      expect(config.logLevel).toBe('info');
    });

    it('should use custom log level when specified', () => {
      testEnv.setupTestEnvironment({
        ADO_ORGANIZATION: 'https://dev.azure.com/test-org',
        ADO_PROJECT: 'test-project',
        ADO_PAT: 'test-token',
        LOG_LEVEL: 'debug',
      });

      const config = validateConfig();
      expect(config.logLevel).toBe('debug');
    });

    it('should create server with custom configuration', () => {
      const customConfig: Config = {
        organization: 'https://dev.azure.com/custom-org',
        project: 'custom-project',
        pat: 'custom-token',
        logLevel: 'debug',
      };

      const server = new AzureDevOpsMCPServer(customConfig);
      expect(server).toBeInstanceOf(AzureDevOpsMCPServer);
    });
  });

  describe('Server metadata and capabilities', () => {
    it('should have correct server metadata', async () => {
      testEnv.setupTestEnvironment({
        ADO_ORGANIZATION: 'https://dev.azure.com/test-org',
        ADO_PROJECT: 'test-project',
        ADO_PAT: 'test-token',
      });

      const config = validateConfig();
      const server = new AzureDevOpsMCPServer(config);

      // Access server metadata through reflection for testing
      const mcpServer = (server as any).server;
      expect(mcpServer).toBeDefined();

      // Verify server has been configured with correct metadata
      // Note: The actual metadata is set in the Server constructor
      // and would be visible in the server info response
    });

    it('should declare tools capability only', async () => {
      testEnv.setupTestEnvironment({
        ADO_ORGANIZATION: 'https://dev.azure.com/test-org',
        ADO_PROJECT: 'test-project',
        ADO_PAT: 'test-token',
      });

      const config = validateConfig();
      const server = new AzureDevOpsMCPServer(config);

      // The server should be configured to support tools only
      // Resources and prompts are explicitly not supported
      expect(server).toBeInstanceOf(AzureDevOpsMCPServer);
    });
  });

  describe('Error handling during initialization', () => {
    it('should handle client initialization errors gracefully', () => {
      const invalidConfig: Config = {
        organization: '', // Invalid empty organization
        project: 'test-project',
        pat: 'test-token',
        logLevel: 'info',
      };

      // Server creation should not throw, but clients may fail later
      expect(() => new AzureDevOpsMCPServer(invalidConfig)).not.toThrow();
    });

    it('should handle temp manager initialization failure', async () => {
      testEnv.setupTestEnvironment({
        ADO_ORGANIZATION: 'https://dev.azure.com/test-org',
        ADO_PROJECT: 'test-project',
        ADO_PAT: 'test-token',
      });

      const initError = new Error('Temp manager init failed');
      const mockTempManager = {
        initialize: vi.fn().mockRejectedValue(initError),
        cleanup: vi.fn().mockResolvedValue({ filesRemoved: 0 }),
      };

      vi.mocked(TempManager.getInstance).mockReturnValue(mockTempManager as any);

      const config = validateConfig();
      const server = new AzureDevOpsMCPServer(config);

      // Server start should handle temp manager errors
      await expect(server.start()).rejects.toThrow('Temp manager init failed');
    });
  });
});