import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createBuildTools } from '../../../src/tools/build-tools.js';
import { BuildClient } from '../../../src/clients/build-client.js';
import { PipelineClient } from '../../../src/clients/pipeline-client.js';
import { TempManager } from '../../../src/utils/temp-manager.js';
import { MockFactory } from '../../helpers/mock-factory.js';
import * as BuildInterfaces from 'azure-devops-node-api/interfaces/BuildInterfaces.js';

// Mock TempManager
vi.mock('../../../src/utils/temp-manager.js', () => ({
  TempManager: {
    getInstance: vi.fn(() => ({
      listDownloads: vi.fn(),
      cleanup: vi.fn(),
      getTempDir: vi.fn(),
      getTempDirInfo: vi.fn(),
    })),
  },
}));

describe('Build Tools', () => {
  let mockBuildClient: BuildClient;
  let mockPipelineClient: PipelineClient;
  let buildTools: ReturnType<typeof createBuildTools>;
  let mockTempManager: any;

  beforeEach(() => {
    MockFactory.resetAllMocks();
    
    // Create mock clients
    mockBuildClient = {
      getBuilds: vi.fn(),
      getDefinitions: vi.fn(),
      getBuildTimeline: vi.fn(),
      downloadJobLogByName: vi.fn(),
      listArtifacts: vi.fn(),
      downloadArtifact: vi.fn(),
      downloadLogsByName: vi.fn(),
    } as any;

    mockPipelineClient = {
      runPipeline: vi.fn(),
    } as any;

    // Setup mock TempManager
    mockTempManager = {
      listDownloads: vi.fn(),
      cleanup: vi.fn(),
      getTempDir: vi.fn(),
      getTempDirInfo: vi.fn(),
    };
    (TempManager.getInstance as any).mockReturnValue(mockTempManager);

    buildTools = createBuildTools(mockBuildClient, mockPipelineClient);
  });

  describe('build_get_timeline', () => {
    it('should get build timeline successfully', async () => {
      const mockTimeline = MockFactory.createMockComplexTimeline();
      mockBuildClient.getBuildTimeline = vi.fn().mockResolvedValue({
        success: true,
        data: mockTimeline,
      });

      const result = await buildTools.build_get_timeline.handler({ buildId: 12345 });

      expect(mockBuildClient.getBuildTimeline).toHaveBeenCalledWith(12345, undefined);

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.timeline.id).toBe('timeline-complex');
      expect(parsedResult.jobs).toHaveLength(2);
      expect(parsedResult.tasks).toHaveLength(1);
      expect(parsedResult.summary.totalRecords).toBe(4);
    });

    it('should get build timeline with specific timeline ID', async () => {
      const mockTimeline = MockFactory.createMockTimeline();
      mockBuildClient.getBuildTimeline = vi.fn().mockResolvedValue({
        success: true,
        data: mockTimeline,
      });

      const result = await buildTools.build_get_timeline.handler({ 
        buildId: 12345, 
        timelineId: 'specific-timeline' 
      });

      expect(mockBuildClient.getBuildTimeline).toHaveBeenCalledWith(12345, 'specific-timeline');
    });

    it('should handle timeline not found', async () => {
      const mockError = {
        type: 'not_found',
        message: 'Timeline not found',
        details: 'Build 999 does not exist',
      };

      mockBuildClient.getBuildTimeline = vi.fn().mockResolvedValue({
        success: false,
        error: mockError,
      });

      const result = await buildTools.build_get_timeline.handler({ buildId: 999 });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ Not Found\n\nTimeline not found',
          },
        ],
      });
    });

    it('should have correct tool definition', () => {
      expect(buildTools.build_get_timeline.tool).toEqual({
        name: 'build_get_timeline',
        description: 'Get the timeline for a build showing all jobs, tasks, and which agents executed them. Requires build ID and optionally timeline ID.',
        inputSchema: {
          type: 'object',
          properties: {
            buildId: {
              type: 'number',
              description: 'The ID of the build to get timeline for',
            },
            timelineId: {
              type: 'string',
              description: 'Optional: Specific timeline ID. If omitted, returns the latest timeline.',
            },
          },
          required: ['buildId'],
        },
      });
    });
  });

  describe('build_list', () => {
    it('should list builds with default parameters', async () => {
      const mockBuilds = MockFactory.createMockBuilds(3);
      mockBuildClient.getBuilds = vi.fn().mockResolvedValue({
        success: true,
        data: mockBuilds,
      });

      const result = await buildTools.build_list.handler({});

      expect(mockBuildClient.getBuilds).toHaveBeenCalledWith({
        definitionIds: undefined,
        definitionNameFilter: undefined,
        statusFilter: undefined,
        resultFilter: undefined,
        branchName: undefined,
        minTime: undefined,
        maxTime: undefined,
        top: 50,
        continuationToken: undefined,
      });

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.builds).toHaveLength(3);
      expect(parsedResult.pageInfo.requested).toBe(50);
    });

    it('should list builds with filtering parameters', async () => {
      const mockBuilds = MockFactory.createMockBuilds(2);
      mockBuildClient.getBuilds = vi.fn().mockResolvedValue({
        success: true,
        data: mockBuilds,
      });

      const args = {
        limit: 10,
        definitionNameFilter: 'CI Build',
        definitionId: 1,
        status: 'Completed',
        result: 'Succeeded',
        branchName: 'refs/heads/main',
        minTime: '2024-01-01T00:00:00Z',
        maxTime: '2024-01-31T23:59:59Z',
        continuationToken: 'token123',
      };

      const result = await buildTools.build_list.handler(args);

      expect(mockBuildClient.getBuilds).toHaveBeenCalledWith({
        definitionIds: [1],
        definitionNameFilter: 'CI Build',
        statusFilter: BuildInterfaces.BuildStatus.Completed,
        resultFilter: BuildInterfaces.BuildResult.Succeeded,
        branchName: 'refs/heads/main',
        minTime: new Date('2024-01-01T00:00:00Z'),
        maxTime: new Date('2024-01-31T23:59:59Z'),
        top: 10,
        continuationToken: 'token123',
      });
    });

    it('should handle invalid date format', async () => {
      const result = await buildTools.build_list.handler({
        minTime: 'invalid-date',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ Error\n\n{\n  "type": "validation_error",\n  "message": "Invalid minTime format: \\"invalid-date\\". Please use ISO 8601 format (e.g., \\"2024-01-01T00:00:00Z\\") or standard date strings (e.g., \\"2024-01-01\\").",\n  "details": "The date string could not be parsed."\n}',
          },
        ],
      });
    });

    it('should handle invalid date range', async () => {
      const result = await buildTools.build_list.handler({
        minTime: '2024-01-31T00:00:00Z',
        maxTime: '2024-01-01T00:00:00Z',
      });

      expect(result.content[0].text).toContain('❌ Error');
      expect(result.content[0].text).toContain('validation_error');
      expect(result.content[0].text).toContain('Invalid date range: minTime must be before or equal to maxTime.');
    });

    it('should handle API errors', async () => {
      const mockError = {
        type: 'api_error',
        message: 'Request failed',
        details: 'Network timeout',
      };

      mockBuildClient.getBuilds = vi.fn().mockResolvedValue({
        success: false,
        error: mockError,
      });

      const result = await buildTools.build_list.handler({});

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ API Error\n\nRequest failed',
          },
        ],
      });
    });
  });

  describe('build_list_definitions', () => {
    it('should list build definitions successfully', async () => {
      const mockDefinitions = [
        MockFactory.createMockBuildDefinition({ id: 1, name: 'CI Build' }),
        MockFactory.createMockBuildDefinition({ id: 2, name: 'Release Build' }),
      ];
      mockBuildClient.getDefinitions = vi.fn().mockResolvedValue({
        success: true,
        data: mockDefinitions,
      });

      const result = await buildTools.build_list_definitions.handler({});

      expect(mockBuildClient.getDefinitions).toHaveBeenCalledWith({
        nameFilter: undefined,
        top: 50,
        continuationToken: undefined,
      });

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.definitions).toHaveLength(2);
      expect(parsedResult.definitions[0].name).toBe('CI Build');
    });

    it('should list definitions with name filter', async () => {
      const mockDefinitions = [MockFactory.createMockBuildDefinition({ name: 'CI Build' })];
      mockBuildClient.getDefinitions = vi.fn().mockResolvedValue({
        success: true,
        data: mockDefinitions,
      });

      const result = await buildTools.build_list_definitions.handler({
        nameFilter: 'CI',
        limit: 25,
      });

      expect(mockBuildClient.getDefinitions).toHaveBeenCalledWith({
        nameFilter: 'CI',
        top: 25,
        continuationToken: undefined,
      });
    });
  });

  describe('build_queue', () => {
    it('should queue build successfully', async () => {
      const mockPipelineRun = MockFactory.createMockPipelineRun({
        id: 12345,
        name: 'Pipeline Run 20240101.1',
        pipelineId: 1,
        pipelineName: 'CI Pipeline',
      });

      mockPipelineClient.runPipeline = vi.fn().mockResolvedValue({
        success: true,
        data: mockPipelineRun,
      });

      const result = await buildTools.build_queue.handler({
        definitionId: 1,
        sourceBranch: 'refs/heads/main',
        parameters: { param1: 'value1' },
      });

      expect(mockPipelineClient.runPipeline).toHaveBeenCalledWith({
        pipelineId: 1,
        sourceBranch: 'refs/heads/main',
        templateParameters: { param1: 'value1' },
      });

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.id).toBe(12345);
      expect(parsedResult.definition.id).toBe(1);
    });

    it('should handle queue build error', async () => {
      const mockError = {
        type: 'permission',
        message: 'Insufficient permissions',
        details: 'Build (read & execute) permission required',
      };

      mockPipelineClient.runPipeline = vi.fn().mockResolvedValue({
        success: false,
        error: mockError,
      });

      const result = await buildTools.build_queue.handler({ definitionId: 1 });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ Permission Error\n\nInsufficient permissions',
          },
        ],
      });
    });
  });

  describe('build_download_job_logs', () => {
    it('should download job logs successfully', async () => {
      const mockDownloadResult = {
        savedPath: '/tmp/job-logs.txt',
        isTemporary: true,
        fileSize: 1024,
        downloadedAt: new Date('2024-01-01T10:00:00Z'),
        jobName: 'Build Job',
        jobId: 'job-1',
        logId: 1,
        duration: 300,
      };

      mockBuildClient.downloadJobLogByName = vi.fn().mockResolvedValue({
        success: true,
        data: mockDownloadResult,
      });

      const result = await buildTools.build_download_job_logs.handler({
        buildId: 12345,
        jobName: 'Build Job',
        outputPath: '/custom/path.txt',
      });

      expect(mockBuildClient.downloadJobLogByName).toHaveBeenCalledWith(
        12345,
        'Build Job',
        '/custom/path.txt'
      );

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.savedTo).toBe('/tmp/job-logs.txt');
      expect(parsedResult.jobDetails.jobName).toBe('Build Job');
    });

    it('should handle job not found', async () => {
      const mockError = {
        type: 'not_found',
        message: 'Job not found',
        details: 'Job "NonExistent" not found in build timeline',
      };

      mockBuildClient.downloadJobLogByName = vi.fn().mockResolvedValue({
        success: false,
        error: mockError,
      });

      const result = await buildTools.build_download_job_logs.handler({
        buildId: 12345,
        jobName: 'NonExistent',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ Not Found\n\nJob not found',
          },
        ],
      });
    });
  });

  describe('build_list_artifacts', () => {
    it('should list artifacts successfully', async () => {
      const mockArtifacts = [
        MockFactory.createMockArtifact({ id: 1, name: 'drop' }),
        MockFactory.createMockArtifact({ id: 2, name: 'logs' }),
      ];

      mockBuildClient.listArtifacts = vi.fn().mockResolvedValue({
        success: true,
        data: mockArtifacts,
      });

      const result = await buildTools.build_list_artifacts.handler({ buildId: 12345 });

      expect(mockBuildClient.listArtifacts).toHaveBeenCalledWith(12345);

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.buildId).toBe(12345);
      expect(parsedResult.artifactCount).toBe(2);
      expect(parsedResult.artifacts[0].name).toBe('drop');
    });

    it('should handle no artifacts found', async () => {
      mockBuildClient.listArtifacts = vi.fn().mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await buildTools.build_list_artifacts.handler({ buildId: 12345 });

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.artifactCount).toBe(0);
      expect(parsedResult.artifacts).toEqual([]);
    });
  });

  describe('build_download_artifact', () => {
    it('should download artifact successfully', async () => {
      const mockDownloadResult = {
        savedPath: '/tmp/artifact.zip',
        isTemporary: true,
        fileSize: 2048,
        downloadedAt: new Date('2024-01-01T10:00:00Z'),
        artifactName: 'drop',
        artifactId: 1,
      };

      mockBuildClient.downloadArtifact = vi.fn().mockResolvedValue({
        success: true,
        data: mockDownloadResult,
      });

      const result = await buildTools.build_download_artifact.handler({
        buildId: 12345,
        definitionId: 1,
        artifactName: 'drop',
        outputPath: '/custom/artifact.zip',
      });

      expect(mockBuildClient.downloadArtifact).toHaveBeenCalledWith(
        12345,
        1,
        'drop',
        '/custom/artifact.zip'
      );

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.savedTo).toBe('/tmp/artifact.zip');
      expect(parsedResult.artifactDetails.artifactName).toBe('drop');
    });

    it('should handle artifact not found', async () => {
      const mockError = {
        type: 'not_found',
        message: 'Artifact not found',
        details: 'Artifact "missing" not found in build 12345',
      };

      mockBuildClient.downloadArtifact = vi.fn().mockResolvedValue({
        success: false,
        error: mockError,
      });

      const result = await buildTools.build_download_artifact.handler({
        buildId: 12345,
        artifactName: 'missing',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ Not Found\n\nArtifact not found',
          },
        ],
      });
    });
  });

  describe('build_download_logs_by_name', () => {
    it('should download logs by name successfully', async () => {
      const mockDownloadResult = {
        type: 'Job',
        matchedRecords: [{ id: 'job-1', name: 'Build Job', type: 'Job' }],
        downloadedLogs: [
          {
            savedPath: '/tmp/build-job.txt',
            fileSize: 1024,
            jobName: 'Build Job',
            jobId: 'job-1',
            logId: 1,
          },
        ],
      };

      mockBuildClient.downloadLogsByName = vi.fn().mockResolvedValue({
        success: true,
        data: mockDownloadResult,
      });

      const result = await buildTools.build_download_logs_by_name.handler({
        buildId: 12345,
        name: 'Build Job',
        exactMatch: true,
      });

      expect(mockBuildClient.downloadLogsByName).toHaveBeenCalledWith(
        12345,
        'Build Job',
        undefined,
        true
      );

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.recordType).toBe('Job');
      expect(parsedResult.downloadedLogs).toHaveLength(1);
    });

    it('should handle logs not found', async () => {
      const mockError = {
        type: 'not_found',
        message: 'No matching records found',
        details: 'No records found matching "NonExistent"',
      };

      mockBuildClient.downloadLogsByName = vi.fn().mockResolvedValue({
        success: false,
        error: mockError,
      });

      const result = await buildTools.build_download_logs_by_name.handler({
        buildId: 12345,
        name: 'NonExistent',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ Not Found\n\nNo matching records found',
          },
        ],
      });
    });
  });

  describe('list_downloads', () => {
    it('should list downloads successfully', async () => {
      const mockDownloads = [
        {
          path: '/tmp/log1.txt',
          category: 'logs',
          buildId: 12345,
          filename: 'log1.txt',
          size: 1024,
          downloadedAt: new Date('2024-01-01T10:00:00Z'),
          ageHours: 2.5,
        },
        {
          path: '/tmp/artifact1.zip',
          category: 'artifacts',
          buildId: 12346,
          filename: 'artifact1.zip',
          size: 2048,
          downloadedAt: new Date('2024-01-01T09:00:00Z'),
          ageHours: 3.5,
        },
      ];

      mockTempManager.listDownloads.mockResolvedValue(mockDownloads);
      mockTempManager.getTempDir.mockResolvedValue('/tmp/ado-mcp');

      const result = await buildTools.list_downloads.handler({});

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.summary.totalFiles).toBe(2);
      expect(parsedResult.summary.logs).toBe(1);
      expect(parsedResult.summary.artifacts).toBe(1);
      expect(parsedResult.downloads).toHaveLength(2);
    });

    it('should handle empty downloads list', async () => {
      mockTempManager.listDownloads.mockResolvedValue([]);
      mockTempManager.getTempDir.mockResolvedValue('/tmp/ado-mcp');

      const result = await buildTools.list_downloads.handler({});

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.summary.totalFiles).toBe(0);
      expect(parsedResult.downloads).toEqual([]);
    });
  });

  describe('cleanup_downloads', () => {
    it('should cleanup downloads successfully', async () => {
      const mockCleanupResult = {
        filesRemoved: 3,
        spaceSaved: 5120,
        errors: [],
      };

      mockTempManager.cleanup.mockResolvedValue(mockCleanupResult);

      const result = await buildTools.cleanup_downloads.handler({ olderThanHours: 48 });

      expect(mockTempManager.cleanup).toHaveBeenCalledWith(48);

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.filesRemoved).toBe(3);
      expect(parsedResult.spaceSaved).toBe(5120);
      expect(parsedResult.errors).toEqual([]);
    });

    it('should use default cleanup age', async () => {
      const mockCleanupResult = {
        filesRemoved: 1,
        spaceSaved: 1024,
        errors: [],
      };

      mockTempManager.cleanup.mockResolvedValue(mockCleanupResult);

      const result = await buildTools.cleanup_downloads.handler({});

      expect(mockTempManager.cleanup).toHaveBeenCalledWith(24);
    });
  });

  describe('get_download_location', () => {
    it('should get download location info successfully', async () => {
      const mockTempDirInfo = {
        path: '/tmp/ado-mcp',
        totalSize: 10240,
        fileCount: 5,
        oldestFile: {
          path: '/tmp/ado-mcp/old-log.txt',
          age: 48.5,
        },
      };

      mockTempManager.getTempDirInfo.mockResolvedValue(mockTempDirInfo);

      const result = await buildTools.get_download_location.handler({});

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.path).toBe('/tmp/ado-mcp');
      expect(parsedResult.totalSize).toBe(10240);
      expect(parsedResult.fileCount).toBe(5);
      expect(parsedResult.oldestFile.ageHours).toBe(48.5);
    });

    it('should handle no files in temp directory', async () => {
      const mockTempDirInfo = {
        path: '/tmp/ado-mcp',
        totalSize: 0,
        fileCount: 0,
        oldestFile: null,
      };

      mockTempManager.getTempDirInfo.mockResolvedValue(mockTempDirInfo);

      const result = await buildTools.get_download_location.handler({});

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.oldestFile).toBeNull();
    });
  });
});