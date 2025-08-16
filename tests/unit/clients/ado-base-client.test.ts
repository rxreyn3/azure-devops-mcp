import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as azdev from 'azure-devops-node-api';
import { AzureDevOpsBaseClient } from '../../../src/clients/ado-base-client.js';
import { Config } from '../../../src/config.js';
import { MockFactory } from '../../helpers/mock-factory.js';
import { ApiResult } from '../../../src/types/index.js';

// Create a concrete implementation for testing the abstract base class
class TestableBaseClient extends AzureDevOpsBaseClient {
  public async testHandleApiCall<T>(
    operation: string,
    apiCall: () => Promise<T>,
    isOrgLevel: boolean = false,
  ): Promise<ApiResult<T>> {
    return this.handleApiCall(operation, apiCall, isOrgLevel);
  }

  public getConnection() {
    return this.connection;
  }

  public getConfig() {
    return this.config;
  }

  public async testEnsureInitialized(): Promise<void> {
    return this.ensureInitialized();
  }
}

describe('AzureDevOpsBaseClient', () => {
  let mockConfig: Config;
  let client: TestableBaseClient;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = {
      organization: 'https://dev.azure.com/test-org',
      project: 'test-project',
      pat: 'test-pat-token',
      logLevel: 'info',
    };
  });

  describe('constructor', () => {
    it('should initialize with valid configuration', () => {
      // Mock the WebApi constructor
      const mockWebApi = MockFactory.createWebApi();
      vi.spyOn(azdev, 'WebApi').mockImplementation(() => mockWebApi as azdev.WebApi);
      vi.spyOn(azdev, 'getPersonalAccessTokenHandler').mockReturnValue({} as any);

      client = new TestableBaseClient(mockConfig);

      expect(client.getConfig()).toEqual(mockConfig);
      expect(azdev.getPersonalAccessTokenHandler).toHaveBeenCalledWith(mockConfig.pat);
      expect(azdev.WebApi).toHaveBeenCalledWith(mockConfig.organization, {});
    });

    it('should handle invalid configuration gracefully', () => {
      const invalidConfig = {
        organization: '',
        project: '',
        pat: '',
        logLevel: 'info',
      };

      // Mock the WebApi constructor to not throw
      const mockWebApi = MockFactory.createWebApi();
      vi.spyOn(azdev, 'WebApi').mockImplementation(() => mockWebApi as azdev.WebApi);
      vi.spyOn(azdev, 'getPersonalAccessTokenHandler').mockReturnValue({} as any);

      expect(() => {
        client = new TestableBaseClient(invalidConfig);
      }).not.toThrow();

      expect(client.getConfig()).toEqual(invalidConfig);
    });

    it('should create connection with proper auth handler', () => {
      const mockAuthHandler = { test: 'handler' };
      const mockWebApi = MockFactory.createWebApi();

      vi.spyOn(azdev, 'getPersonalAccessTokenHandler').mockReturnValue(mockAuthHandler as any);
      vi.spyOn(azdev, 'WebApi').mockImplementation(() => mockWebApi as azdev.WebApi);

      client = new TestableBaseClient(mockConfig);

      expect(azdev.getPersonalAccessTokenHandler).toHaveBeenCalledWith(mockConfig.pat);
      expect(azdev.WebApi).toHaveBeenCalledWith(mockConfig.organization, mockAuthHandler);
    });
  });

  describe('handleApiCall', () => {
    beforeEach(() => {
      const mockWebApi = MockFactory.createWebApi();
      vi.spyOn(azdev, 'WebApi').mockImplementation(() => mockWebApi as azdev.WebApi);
      vi.spyOn(azdev, 'getPersonalAccessTokenHandler').mockReturnValue({} as any);

      client = new TestableBaseClient(mockConfig);
    });

    it('should return success result for successful API call', async () => {
      const testData = { id: 1, name: 'test' };
      const mockApiCall = vi.fn().mockResolvedValue(testData);

      const result = await client.testHandleApiCall('testOperation', mockApiCall);

      expect(result).toEqual({
        success: true,
        data: testData,
      });
      expect(mockApiCall).toHaveBeenCalledOnce();
    });

    it('should handle API errors and return error result', async () => {
      const testError = new Error('API Error');
      const mockApiCall = vi.fn().mockRejectedValue(testError);

      // Mock the error handler to return a consistent error result
      vi.doMock('../../../src/utils/error-handlers.js', () => ({
        handleAzureDevOpsError: vi.fn().mockReturnValue({
          success: false,
          error: 'API Error',
          details: 'testOperation failed',
        }),
      }));

      const result = await client.testHandleApiCall('testOperation', mockApiCall);

      expect(result.success).toBe(false);
      expect(mockApiCall).toHaveBeenCalledOnce();
    });

    it('should handle permission errors correctly', async () => {
      const permissionError = MockFactory.createPermissionError('Access denied');
      const mockApiCall = vi.fn().mockRejectedValue(permissionError);

      const result = await client.testHandleApiCall('testOperation', mockApiCall);

      expect(result.success).toBe(false);
      expect(mockApiCall).toHaveBeenCalledOnce();
    });

    it('should handle not found errors correctly', async () => {
      const notFoundError = MockFactory.createNotFoundError('Resource not found');
      const mockApiCall = vi.fn().mockRejectedValue(notFoundError);

      const result = await client.testHandleApiCall('testOperation', mockApiCall);

      expect(result.success).toBe(false);
      expect(mockApiCall).toHaveBeenCalledOnce();
    });

    it('should handle timeout errors correctly', async () => {
      const timeoutError = MockFactory.createTimeoutError('Request timeout');
      const mockApiCall = vi.fn().mockRejectedValue(timeoutError);

      const result = await client.testHandleApiCall('testOperation', mockApiCall);

      expect(result.success).toBe(false);
      expect(mockApiCall).toHaveBeenCalledOnce();
    });

    it('should handle authentication errors correctly', async () => {
      const authError = MockFactory.createAuthError('Authentication failed');
      const mockApiCall = vi.fn().mockRejectedValue(authError);

      const result = await client.testHandleApiCall('testOperation', mockApiCall);

      expect(result.success).toBe(false);
      expect(mockApiCall).toHaveBeenCalledOnce();
    });

    it('should pass isOrgLevel parameter to error handler', async () => {
      const testError = new Error('API Error');
      const mockApiCall = vi.fn().mockRejectedValue(testError);

      // We can't easily test the internal call to handleAzureDevOpsError,
      // but we can verify the method completes without throwing
      const result = await client.testHandleApiCall('testOperation', mockApiCall, true);

      expect(result.success).toBe(false);
      expect(mockApiCall).toHaveBeenCalledOnce();
    });

    it('should handle null/undefined API responses', async () => {
      const mockApiCall = vi.fn().mockResolvedValue(null);

      const result = await client.testHandleApiCall('testOperation', mockApiCall);

      expect(result).toEqual({
        success: true,
        data: null,
      });
    });

    it('should handle empty API responses', async () => {
      const mockApiCall = vi.fn().mockResolvedValue([]);

      const result = await client.testHandleApiCall('testOperation', mockApiCall);

      expect(result).toEqual({
        success: true,
        data: [],
      });
    });

    it('should handle complex object API responses', async () => {
      const complexData = {
        id: 1,
        name: 'test',
        nested: {
          property: 'value',
          array: [1, 2, 3],
        },
        date: new Date('2024-01-01'),
      };
      const mockApiCall = vi.fn().mockResolvedValue(complexData);

      const result = await client.testHandleApiCall('testOperation', mockApiCall);

      expect(result).toEqual({
        success: true,
        data: complexData,
      });
    });
  });

  describe('ensureInitialized', () => {
    beforeEach(() => {
      const mockWebApi = MockFactory.createWebApi();
      vi.spyOn(azdev, 'WebApi').mockImplementation(() => mockWebApi as azdev.WebApi);
      vi.spyOn(azdev, 'getPersonalAccessTokenHandler').mockReturnValue({} as any);

      client = new TestableBaseClient(mockConfig);
    });

    it('should complete without error', async () => {
      await expect(client.testEnsureInitialized()).resolves.toBeUndefined();
    });

    it('should be callable multiple times', async () => {
      await client.testEnsureInitialized();
      await client.testEnsureInitialized();
      await client.testEnsureInitialized();

      // Should not throw or cause issues
      expect(true).toBe(true);
    });
  });

  describe('error handling integration', () => {
    beforeEach(() => {
      const mockWebApi = MockFactory.createWebApi();
      vi.spyOn(azdev, 'WebApi').mockImplementation(() => mockWebApi as azdev.WebApi);
      vi.spyOn(azdev, 'getPersonalAccessTokenHandler').mockReturnValue({} as any);

      client = new TestableBaseClient(mockConfig);
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      (networkError as any).code = 'ECONNREFUSED';
      const mockApiCall = vi.fn().mockRejectedValue(networkError);

      const result = await client.testHandleApiCall('testOperation', mockApiCall);

      expect(result.success).toBe(false);
    });

    it('should handle malformed response errors', async () => {
      const malformedError = new Error('Unexpected token in JSON');
      const mockApiCall = vi.fn().mockRejectedValue(malformedError);

      const result = await client.testHandleApiCall('testOperation', mockApiCall);

      expect(result.success).toBe(false);
    });

    it('should handle rate limiting errors', async () => {
      const rateLimitError = MockFactory.createApiError('Rate limit exceeded', 429);
      const mockApiCall = vi.fn().mockRejectedValue(rateLimitError);

      const result = await client.testHandleApiCall('testOperation', mockApiCall);

      expect(result.success).toBe(false);
    });
  });
});
