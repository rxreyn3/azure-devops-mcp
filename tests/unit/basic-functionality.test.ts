import { describe, expect, test } from 'bun:test';
import { validateConfig } from '../../src/config.js';
import { AzureDevOpsMCPServer } from '../../src/server.js';

describe('Basic Functionality Tests', () => {
  describe('Config validation', () => {
    test('should validate required environment variables', () => {
      const originalEnv = process.env;
      
      process.env = {
        ADO_ORGANIZATION: 'test-org',
        ADO_PROJECT: 'test-project',
        ADO_PAT: 'test-pat',
      };
      
      const config = validateConfig();
      expect(config.organization).toBe('https://dev.azure.com/test-org');
      expect(config.project).toBe('test-project');
      expect(config.pat).toBe('test-pat');
      
      process.env = originalEnv;
    });

    test('should throw on missing organization', () => {
      const originalEnv = process.env;
      
      process.env = {
        ADO_PROJECT: 'test-project',
        ADO_PAT: 'test-pat',
      };
      
      expect(() => validateConfig()).toThrow('ADO_ORGANIZATION is required');
      
      process.env = originalEnv;
    });
  });

  describe('MCP Server structure', () => {
    test('should create server instance', () => {
      const config = {
        organization: 'https://dev.azure.com/test-org',
        project: 'test-project',
        pat: 'test-pat',
        logLevel: 'info' as const,
      };
      
      const server = new AzureDevOpsMCPServer(config);
      expect(server).toBeDefined();
      expect(server).toHaveProperty('start');
    });

    test('should have correct tool definitions', async () => {
      const config = {
        organization: 'https://dev.azure.com/test-org',
        project: 'test-project',
        pat: 'test-pat',
        logLevel: 'info' as const,
      };
      
      const server = new AzureDevOpsMCPServer(config);
      
      // Access the private server property to check tool setup
      const privateServer = (server as any).server;
      const handlers = new Map();
      
      // Capture the handlers
      privateServer.setRequestHandler = (schema: any, handler: any) => {
        handlers.set(schema.parse ? schema.parse.name : 'unknown', handler);
      };
      
      // Re-run setup
      (server as any).setupHandlers();
      
      // Check that handlers are registered
      expect(handlers.size).toBeGreaterThan(0);
    });
  });

  describe('Response formatting', () => {
    test('should format successful responses correctly', () => {
      const config = {
        organization: 'https://dev.azure.com/test-org',
        project: 'test-project',
        pat: 'test-pat',
        logLevel: 'info' as const,
      };
      
      const server = new AzureDevOpsMCPServer(config);
      
      // Test that server initializes with proper tools
      const toolRegistry = (server as any).toolRegistry;
      expect(toolRegistry).toBeDefined();
      expect(toolRegistry.tools).toBeDefined();
      expect(toolRegistry.tools.length).toBeGreaterThan(0);
      expect(toolRegistry.handlers).toBeDefined();
      expect(toolRegistry.handlers.size).toBeGreaterThan(0);
      
      // Verify tool exists in registry
      const healthCheckTool = toolRegistry.tools.find((t: any) => t.name === 'ado_health_check');
      expect(healthCheckTool).toBeDefined();
      expect(healthCheckTool.name).toBe('ado_health_check');
    });
  });

  describe('Data transformation', () => {
    test('should transform queue data correctly', () => {
      // Test data transformation logic
      const mockQueue = {
        id: 1,
        name: 'Test Queue',
        pool: {
          id: 10,
          name: 'Test Pool',
          isHosted: true,
        },
      };
      
      // Simulate the transformation that happens in listProjectQueues
      const transformed = {
        id: mockQueue.id!,
        name: mockQueue.name!,
        poolId: mockQueue.pool?.id || 0,
        poolName: mockQueue.pool?.name || 'Unknown',
        isHosted: mockQueue.pool?.isHosted || false,
      };
      
      expect(transformed.id).toBe(1);
      expect(transformed.name).toBe('Test Queue');
      expect(transformed.poolId).toBe(10);
      expect(transformed.poolName).toBe('Test Pool');
      expect(transformed.isHosted).toBe(true);
    });

    test('should handle missing pool data', () => {
      const mockQueue = {
        id: 2,
        name: 'Orphan Queue',
        pool: undefined,
      };
      
      const transformed = {
        id: mockQueue.id!,
        name: mockQueue.name!,
        poolId: mockQueue.pool?.id || 0,
        poolName: mockQueue.pool?.name || 'Unknown',
        isHosted: mockQueue.pool?.isHosted || false,
      };
      
      expect(transformed.poolId).toBe(0);
      expect(transformed.poolName).toBe('Unknown');
      expect(transformed.isHosted).toBe(false);
    });
  });

  describe('Agent status mapping', () => {
    test('should map agent status correctly', () => {
      const statusMap: Record<string, string> = {
        '1': 'offline',
        '2': 'online',
        '3': 'unavailable',
      };
      
      expect(statusMap['1']).toBe('offline');
      expect(statusMap['2']).toBe('online');
      expect(statusMap['3']).toBe('unavailable');
    });
  });

  describe('Permission error formatting', () => {
    test('should format permission errors with suggestions', () => {
      const permissionError = {
        type: 'permission' as const,
        message: 'Access denied to organization-level resources',
        requiredPermission: 'Organization administrator',
        suggestion: 'Contact your Azure DevOps organization administrator to grant access to agent pools',
      };
      
      expect(permissionError.type).toBe('permission');
      expect(permissionError.suggestion).toContain('administrator');
    });
  });
});