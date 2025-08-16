import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MockFactory } from '../../helpers/mock-factory.js';
import { Config } from '../../../src/config.js';
import { TaskAgentClient } from '../../../src/clients/task-agent-client.js';
import * as azdev from 'azure-devops-node-api';

/**
 * Example test demonstrating how to use MockFactory in real test scenarios
 * This serves as documentation for other developers on testing patterns
 */
describe('MockFactory Usage Examples', () => {
  let mockConfig: Config;

  beforeEach(() => {
    MockFactory.resetAllMocks();

    // Create a mock config for testing
    mockConfig = {
      organization: 'https://dev.azure.com/test-org',
      project: 'test-project',
      pat: 'test-token',
      logLevel: 'info',
    };
  });

  describe('Testing with Successful Responses', () => {
    it('should demonstrate how to test a client with successful API responses', async () => {
      // Arrange: Set up successful mocks
      const mocks = MockFactory.setupSuccessfulMocks();

      // Mock the WebApi constructor to return our mocked WebApi
      const mockWebApiConstructor = vi
        .spyOn(azdev, 'WebApi')
        .mockImplementation(() => mocks.mockWebApi as any);
      const mockGetPersonalAccessTokenHandler = vi
        .spyOn(azdev, 'getPersonalAccessTokenHandler')
        .mockReturnValue({} as any);

      // Create the client under test
      const client = new TaskAgentClient(mockConfig);

      // Act: Call the method we want to test
      const result = await client.getQueues();

      // Assert: Verify the result and that mocks were called correctly
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].name).toBe('Default');
        expect(result.data[0].id).toBe(1);
      }

      // Verify that the Azure DevOps API was called correctly
      expect(mocks.mockTaskAgentApi.getAgentQueues).toHaveBeenCalledWith('test-project');
      expect(mockWebApiConstructor).toHaveBeenCalledWith('https://dev.azure.com/test-org', {});
      expect(mockGetPersonalAccessTokenHandler).toHaveBeenCalledWith('test-token');
    });

    it('should demonstrate how to test with custom mock data', async () => {
      // Arrange: Create custom mock data
      const customQueues = [
        MockFactory.createMockQueue({ id: 100, name: 'Production Queue' }),
        MockFactory.createMockQueue({ id: 200, name: 'Staging Queue' }),
      ];

      const mockTaskAgentApi = MockFactory.createTaskAgentApi();
      (mockTaskAgentApi.getAgentQueues as any).mockResolvedValue(customQueues);

      const mockWebApi = {
        getTaskAgentApi: vi.fn().mockResolvedValue(mockTaskAgentApi),
        getBuildApi: vi.fn(),
        getPipelinesApi: vi.fn(),
      };

      const mockWebApiConstructor = vi
        .spyOn(azdev, 'WebApi')
        .mockImplementation(() => mockWebApi as any);
      const mockGetPersonalAccessTokenHandler = vi
        .spyOn(azdev, 'getPersonalAccessTokenHandler')
        .mockReturnValue({} as any);

      const client = new TaskAgentClient(mockConfig);

      // Act
      const result = await client.getQueues();

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0].name).toBe('Production Queue');
        expect(result.data[1].name).toBe('Staging Queue');
      }
    });
  });

  describe('Testing with Error Responses', () => {
    it('should demonstrate how to test error handling', async () => {
      // Arrange: Set up error mocks
      const mocks = MockFactory.setupErrorMocks();

      const mockWebApiConstructor = vi
        .spyOn(azdev, 'WebApi')
        .mockImplementation(() => mocks.mockWebApi as any);
      const mockGetPersonalAccessTokenHandler = vi
        .spyOn(azdev, 'getPersonalAccessTokenHandler')
        .mockReturnValue({} as any);

      const client = new TaskAgentClient(mockConfig);

      // Act
      const result = await client.getQueues();

      // Assert: Verify error handling
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('permission');
        expect(result.error.message).toContain('Access denied');
      }

      // Verify the API was called
      expect(mocks.mockTaskAgentApi.getAgentQueues).toHaveBeenCalledWith('test-project');
    });

    it('should demonstrate how to test specific error scenarios', async () => {
      // Arrange: Create a specific error scenario (404 error)
      const mockTaskAgentApi = MockFactory.createTaskAgentApi();
      (mockTaskAgentApi.getAgentQueues as any).mockRejectedValue(
        MockFactory.createNotFoundError('Project not found'),
      );

      const mockWebApi = {
        getTaskAgentApi: vi.fn().mockResolvedValue(mockTaskAgentApi),
        getBuildApi: vi.fn(),
        getPipelinesApi: vi.fn(),
      };

      const mockWebApiConstructor = vi
        .spyOn(azdev, 'WebApi')
        .mockImplementation(() => mockWebApi as any);
      const mockGetPersonalAccessTokenHandler = vi
        .spyOn(azdev, 'getPersonalAccessTokenHandler')
        .mockReturnValue({} as any);

      const client = new TaskAgentClient(mockConfig);

      // Act
      const result = await client.getQueues();

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        // The error handler transforms 404 errors to a generic message
        expect(result.error.type).toBe('not_found');
        expect(result.error.message).toContain("Resource 'requested' not found");
      }
    });
  });

  describe('Testing with Multiple Mock Data Sets', () => {
    it('should demonstrate how to test pagination scenarios', async () => {
      // Arrange: Create multiple pages of data
      const firstPageQueues = MockFactory.createMockQueues(2);
      const pagedResult = MockFactory.createPagedList(firstPageQueues, 'next-page-token');

      const mockTaskAgentApi = MockFactory.createTaskAgentApi();
      (mockTaskAgentApi.getAgentQueues as any).mockResolvedValue(pagedResult);

      const mockWebApi = {
        getTaskAgentApi: vi.fn().mockResolvedValue(mockTaskAgentApi),
        getBuildApi: vi.fn(),
        getPipelinesApi: vi.fn(),
      };

      const mockWebApiConstructor = vi
        .spyOn(azdev, 'WebApi')
        .mockImplementation(() => mockWebApi as any);
      const mockGetPersonalAccessTokenHandler = vi
        .spyOn(azdev, 'getPersonalAccessTokenHandler')
        .mockReturnValue({} as any);

      const client = new TaskAgentClient(mockConfig);

      // Act
      const result = await client.getQueues();

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0].name).toBe('Queue-1');
        expect(result.data[1].name).toBe('Queue-2');
      }
    });
  });

  describe('Mock Cleanup', () => {
    it('should demonstrate proper mock cleanup between tests', () => {
      // This test verifies that MockFactory.resetAllMocks() works correctly
      // The beforeEach hook calls resetAllMocks(), so mocks should be clean

      const mockTaskAgentApi = MockFactory.createTaskAgentApi();

      // Verify that the mock functions haven't been called yet
      expect(mockTaskAgentApi.getAgentQueues).not.toHaveBeenCalled();
      expect(mockTaskAgentApi.getAgents).not.toHaveBeenCalled();
      expect(mockTaskAgentApi.getAgentPools).not.toHaveBeenCalled();
    });
  });
});
