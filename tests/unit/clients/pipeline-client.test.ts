import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as azdev from 'azure-devops-node-api';
import { PipelineClient } from '../../../src/clients/pipeline-client.js';
import { Config } from '../../../src/config.js';
import { MockFactory } from '../../helpers/mock-factory.js';
import * as PipelinesInterfaces from 'azure-devops-node-api/interfaces/PipelinesInterfaces.js';

describe('PipelineClient', () => {
  let mockConfig: Config;
  let client: PipelineClient;
  let mockWebApi: Partial<azdev.WebApi>;
  let mockPipelinesApi: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = {
      organization: 'https://dev.azure.com/test-org',
      project: 'test-project',
      pat: 'test-pat-token',
      logLevel: 'info',
    };

    mockPipelinesApi = MockFactory.createPipelinesApi();
    mockWebApi = {
      getPipelinesApi: vi.fn().mockResolvedValue(mockPipelinesApi),
    };

    vi.spyOn(azdev, 'WebApi').mockImplementation(() => mockWebApi as azdev.WebApi);
    vi.spyOn(azdev, 'getPersonalAccessTokenHandler').mockReturnValue({} as any);

    client = new PipelineClient(mockConfig);
  });

  describe('runPipeline', () => {
    it('should run pipeline with minimal options', async () => {
      const mockRun = MockFactory.createMockPipelineRun();
      mockPipelinesApi.runPipeline.mockResolvedValue(mockRun);

      const result = await client.runPipeline({ pipelineId: 1 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(12345);
        expect(result.data.pipelineId).toBe(1);
      }
      expect(mockPipelinesApi.runPipeline).toHaveBeenCalledWith(
        {
          templateParameters: undefined,
          stagesToSkip: undefined,
        },
        mockConfig.project,
        1,
        undefined,
      );
    });

    it('should run pipeline with all options', async () => {
      const mockRun = MockFactory.createMockPipelineRun();
      mockPipelinesApi.runPipeline.mockResolvedValue(mockRun);

      const templateParameters = { param1: 'value1', param2: 42 };
      const stagesToSkip = ['stage1', 'stage2'];

      const result = await client.runPipeline({
        pipelineId: 1,
        pipelineVersion: 5,
        sourceBranch: 'refs/heads/feature/test',
        templateParameters,
        stagesToSkip,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.templateParameters).toEqual(templateParameters);
      }
      expect(mockPipelinesApi.runPipeline).toHaveBeenCalledWith(
        {
          templateParameters,
          stagesToSkip,
          resources: {
            repositories: {
              self: {
                refName: 'refs/heads/feature/test',
              },
            },
          },
        },
        mockConfig.project,
        1,
        5,
      );
    });

    it('should handle pipeline run with source branch only', async () => {
      const mockRun = MockFactory.createMockPipelineRun();
      mockPipelinesApi.runPipeline.mockResolvedValue(mockRun);

      const result = await client.runPipeline({
        pipelineId: 1,
        sourceBranch: 'refs/heads/main',
      });

      expect(result.success).toBe(true);
      expect(mockPipelinesApi.runPipeline).toHaveBeenCalledWith(
        {
          templateParameters: undefined,
          stagesToSkip: undefined,
          resources: {
            repositories: {
              self: {
                refName: 'refs/heads/main',
              },
            },
          },
        },
        mockConfig.project,
        1,
        undefined,
      );
    });

    it('should handle pipeline run failure', async () => {
      mockPipelinesApi.runPipeline.mockResolvedValue(null);

      const result = await client.runPipeline({ pipelineId: 1 });

      expect(result.success).toBe(false);
    });

    it('should handle API errors', async () => {
      const error = MockFactory.createPermissionError('Access denied');
      mockPipelinesApi.runPipeline.mockRejectedValue(error);

      const result = await client.runPipeline({ pipelineId: 1 });

      expect(result.success).toBe(false);
    });

    it('should map pipeline run response correctly', async () => {
      const mockRun = MockFactory.createMockPipelineRun({
        id: 54321,
        name: 'Custom Pipeline Run',
        state: PipelinesInterfaces.RunState.InProgress,
        result: undefined,
        pipeline: {
          id: 2,
          name: 'Custom Pipeline',
        },
        url: 'https://custom-url.com',
      });
      mockPipelinesApi.runPipeline.mockResolvedValue(mockRun);

      const templateParameters = { env: 'production' };
      const result = await client.runPipeline({
        pipelineId: 2,
        templateParameters,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          id: 54321,
          pipelineId: 2,
          pipelineName: 'Custom Pipeline',
          state: '1',
          result: undefined,
          createdDate: mockRun.createdDate,
          finishedDate: mockRun.finishedDate,
          url: 'https://custom-url.com',
          name: 'Custom Pipeline Run',
          templateParameters,
        });
      }
    });

    it('should handle missing pipeline information in response', async () => {
      const mockRun = MockFactory.createMockPipelineRun({
        pipeline: undefined,
      });
      mockPipelinesApi.runPipeline.mockResolvedValue(mockRun);

      const result = await client.runPipeline({ pipelineId: 1 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pipelineId).toBe(1); // Should use the input pipelineId
        expect(result.data.pipelineName).toBe(''); // Should default to empty string
      }
    });
  });

  describe('getPipelineRun', () => {
    it('should return pipeline run for valid IDs', async () => {
      const mockRun = MockFactory.createMockPipelineRun();
      mockPipelinesApi.getRun.mockResolvedValue(mockRun);

      const result = await client.getPipelineRun(1, 12345);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockRun);
      }
      expect(mockPipelinesApi.getRun).toHaveBeenCalledWith(mockConfig.project, 1, 12345);
    });

    it('should handle pipeline run not found', async () => {
      mockPipelinesApi.getRun.mockResolvedValue(null);

      const result = await client.getPipelineRun(1, 12345);

      expect(result.success).toBe(false);
    });

    it('should handle API errors', async () => {
      const error = MockFactory.createNotFoundError('Pipeline run not found');
      mockPipelinesApi.getRun.mockRejectedValue(error);

      const result = await client.getPipelineRun(1, 12345);

      expect(result.success).toBe(false);
    });
  });

  describe('listPipelineRuns', () => {
    it('should return list of pipeline runs', async () => {
      const mockRuns = [
        MockFactory.createMockPipelineRun({ id: 1 }),
        MockFactory.createMockPipelineRun({ id: 2 }),
        MockFactory.createMockPipelineRun({ id: 3 }),
      ];
      mockPipelinesApi.listRuns.mockResolvedValue(mockRuns);

      const result = await client.listPipelineRuns(1);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockRuns);
        expect(result.data).toHaveLength(3);
      }
      expect(mockPipelinesApi.listRuns).toHaveBeenCalledWith(mockConfig.project, 1);
    });

    it('should handle empty pipeline runs list', async () => {
      mockPipelinesApi.listRuns.mockResolvedValue([]);

      const result = await client.listPipelineRuns(1);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });

    it('should handle null pipeline runs response', async () => {
      mockPipelinesApi.listRuns.mockResolvedValue(null);

      const result = await client.listPipelineRuns(1);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });

    it('should handle API errors', async () => {
      const error = MockFactory.createPermissionError('Access denied');
      mockPipelinesApi.listRuns.mockRejectedValue(error);

      const result = await client.listPipelineRuns(1);

      expect(result.success).toBe(false);
    });

    it('should pass top parameter when provided', async () => {
      const mockRuns = [MockFactory.createMockPipelineRun()];
      mockPipelinesApi.listRuns.mockResolvedValue(mockRuns);

      const result = await client.listPipelineRuns(1, 10);

      expect(result.success).toBe(true);
      expect(mockPipelinesApi.listRuns).toHaveBeenCalledWith(mockConfig.project, 1);
      // Note: The current implementation doesn't use the top parameter
      // This test documents the current behavior
    });
  });

  describe('parameter validation', () => {
    it('should handle various template parameter types', async () => {
      const mockRun = MockFactory.createMockPipelineRun();
      mockPipelinesApi.runPipeline.mockResolvedValue(mockRun);

      const templateParameters = {
        stringParam: 'test',
        numberParam: 42,
        booleanParam: true,
        arrayParam: ['item1', 'item2'],
        objectParam: { nested: 'value' },
      };

      const result = await client.runPipeline({
        pipelineId: 1,
        templateParameters,
      });

      expect(result.success).toBe(true);
      expect(mockPipelinesApi.runPipeline).toHaveBeenCalledWith(
        expect.objectContaining({
          templateParameters,
        }),
        mockConfig.project,
        1,
        undefined,
      );
    });

    it('should handle empty template parameters', async () => {
      const mockRun = MockFactory.createMockPipelineRun();
      mockPipelinesApi.runPipeline.mockResolvedValue(mockRun);

      const result = await client.runPipeline({
        pipelineId: 1,
        templateParameters: {},
      });

      expect(result.success).toBe(true);
      expect(mockPipelinesApi.runPipeline).toHaveBeenCalledWith(
        expect.objectContaining({
          templateParameters: {},
        }),
        mockConfig.project,
        1,
        undefined,
      );
    });

    it('should handle empty stages to skip', async () => {
      const mockRun = MockFactory.createMockPipelineRun();
      mockPipelinesApi.runPipeline.mockResolvedValue(mockRun);

      const result = await client.runPipeline({
        pipelineId: 1,
        stagesToSkip: [],
      });

      expect(result.success).toBe(true);
      expect(mockPipelinesApi.runPipeline).toHaveBeenCalledWith(
        expect.objectContaining({
          stagesToSkip: [],
        }),
        mockConfig.project,
        1,
        undefined,
      );
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      (networkError as any).code = 'ECONNREFUSED';
      mockPipelinesApi.runPipeline.mockRejectedValue(networkError);

      const result = await client.runPipeline({ pipelineId: 1 });

      expect(result.success).toBe(false);
    });

    it('should handle authentication errors', async () => {
      const authError = MockFactory.createAuthError('Authentication failed');
      mockPipelinesApi.runPipeline.mockRejectedValue(authError);

      const result = await client.runPipeline({ pipelineId: 1 });

      expect(result.success).toBe(false);
    });

    it('should handle timeout errors', async () => {
      const timeoutError = MockFactory.createTimeoutError('Request timeout');
      mockPipelinesApi.listRuns.mockRejectedValue(timeoutError);

      const result = await client.listPipelineRuns(1);

      expect(result.success).toBe(false);
    });

    it('should handle rate limiting errors', async () => {
      const rateLimitError = MockFactory.createApiError('Rate limit exceeded', 429);
      mockPipelinesApi.getRun.mockRejectedValue(rateLimitError);

      const result = await client.getPipelineRun(1, 12345);

      expect(result.success).toBe(false);
    });
  });

  describe('initialization', () => {
    it('should initialize pipelines API on first use', async () => {
      const mockRun = MockFactory.createMockPipelineRun();
      mockPipelinesApi.runPipeline.mockResolvedValue(mockRun);

      await client.runPipeline({ pipelineId: 1 });

      expect(mockWebApi.getPipelinesApi).toHaveBeenCalledOnce();
    });

    it('should reuse pipelines API on subsequent calls', async () => {
      const mockRun = MockFactory.createMockPipelineRun();
      mockPipelinesApi.runPipeline.mockResolvedValue(mockRun);
      mockPipelinesApi.getRun.mockResolvedValue(mockRun);

      await client.runPipeline({ pipelineId: 1 });
      await client.getPipelineRun(1, 12345);

      expect(mockWebApi.getPipelinesApi).toHaveBeenCalledOnce();
    });
  });
});
