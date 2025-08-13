import { vi } from 'vitest';
import * as azdev from 'azure-devops-node-api';
import { ITaskAgentApi } from 'azure-devops-node-api/TaskAgentApi.js';
import { IBuildApi } from 'azure-devops-node-api/BuildApi.js';
import { IPipelinesApi } from 'azure-devops-node-api/PipelinesApi.js';
import * as BuildInterfaces from 'azure-devops-node-api/interfaces/BuildInterfaces.js';
import * as TaskAgentInterfaces from 'azure-devops-node-api/interfaces/TaskAgentInterfaces.js';
import * as PipelinesInterfaces from 'azure-devops-node-api/interfaces/PipelinesInterfaces.js';
import { PagedList } from 'azure-devops-node-api/interfaces/common/VSSInterfaces.js';

/**
 * Factory class for creating mocked Azure DevOps API clients and responses
 * Provides consistent mock objects for testing without external dependencies
 */
export class MockFactory {
  /**
   * Creates a mocked WebApi instance with all necessary API getters
   */
  static createWebApi(): Partial<azdev.WebApi> {
    const mockTaskAgentApi = MockFactory.createTaskAgentApi();
    const mockBuildApi = MockFactory.createBuildApi();
    const mockPipelinesApi = MockFactory.createPipelinesApi();

    return {
      getTaskAgentApi: vi.fn().mockResolvedValue(mockTaskAgentApi),
      getBuildApi: vi.fn().mockResolvedValue(mockBuildApi),
      getPipelinesApi: vi.fn().mockResolvedValue(mockPipelinesApi),
    };
  }

  /**
   * Creates a mocked TaskAgentApi instance with all methods used by TaskAgentClient
   */
  static createTaskAgentApi(): Partial<ITaskAgentApi> {
    return {
      getAgentQueues: vi.fn(),
      getAgents: vi.fn(),
      getAgentPools: vi.fn(),
    };
  }

  /**
   * Creates a mocked BuildApi instance with all methods used by BuildClient
   */
  static createBuildApi(): Partial<IBuildApi> {
    return {
      getBuilds: vi.fn(),
      getDefinitions: vi.fn(),
      getBuildTimeline: vi.fn(),
      getBuildLog: vi.fn(),
      getBuild: vi.fn(),
      getArtifacts: vi.fn(),
      queueBuild: vi.fn(),
    };
  }

  /**
   * Creates a mocked PipelinesApi instance with all methods used by PipelineClient
   */
  static createPipelinesApi(): Partial<IPipelinesApi> {
    return {
      runPipeline: vi.fn(),
      getRun: vi.fn(),
      listRuns: vi.fn(),
      getArtifact: vi.fn(),
    };
  }

  // Mock Response Helpers

  /**
   * Creates a mock queue response with realistic data
   */
  static createMockQueue(overrides: Partial<TaskAgentInterfaces.TaskAgentQueue> = {}): TaskAgentInterfaces.TaskAgentQueue {
    return {
      id: 1,
      name: 'Default',
      pool: {
        id: 1,
        name: 'Default',
        isHosted: false,
        ...overrides.pool
      },
      ...overrides
    };
  }

  /**
   * Creates a mock agent response with realistic data
   */
  static createMockAgent(overrides: Partial<TaskAgentInterfaces.TaskAgent> = {}): TaskAgentInterfaces.TaskAgent {
    return {
      id: 1,
      name: 'Agent-001',
      status: TaskAgentInterfaces.TaskAgentStatus.Online,
      enabled: true,
      version: '3.220.5',
      oSDescription: 'Linux 5.4.0-74-generic #83-Ubuntu',
      ...overrides
    };
  }

  /**
   * Creates a mock agent pool response with realistic data
   */
  static createMockAgentPool(overrides: Partial<TaskAgentInterfaces.TaskAgentPool> = {}): TaskAgentInterfaces.TaskAgentPool {
    return {
      id: 1,
      name: 'Default',
      isHosted: false,
      poolType: TaskAgentInterfaces.TaskAgentPoolType.Automation,
      size: 1,
      ...overrides
    };
  }

  /**
   * Creates a mock build response with realistic data
   */
  static createMockBuild(overrides: Partial<BuildInterfaces.Build> = {}): BuildInterfaces.Build {
    return {
      id: 12345,
      buildNumber: '20240101.1',
      status: BuildInterfaces.BuildStatus.Completed,
      result: BuildInterfaces.BuildResult.Succeeded,
      definition: {
        id: 1,
        name: 'CI Build',
        ...overrides.definition
      },
      sourceBranch: 'refs/heads/main',
      startTime: new Date('2024-01-01T10:00:00Z'),
      finishTime: new Date('2024-01-01T10:05:00Z'),
      queueTime: new Date('2024-01-01T09:59:00Z'),
      url: 'https://dev.azure.com/test-org/test-project/_build/results?buildId=12345',
      ...overrides
    };
  }

  /**
   * Creates a mock build definition response with realistic data
   */
  static createMockBuildDefinition(overrides: Partial<BuildInterfaces.BuildDefinitionReference> = {}): BuildInterfaces.BuildDefinitionReference {
    return {
      id: 1,
      name: 'CI Build',
      path: '\\',
      type: BuildInterfaces.DefinitionType.Build,
      queueStatus: BuildInterfaces.DefinitionQueueStatus.Enabled,
      revision: 1,
      uri: 'vstfs:///Build/Definition/1',
      url: 'https://dev.azure.com/test-org/test-project/_apis/build/Definitions/1',
      ...overrides
    };
  }

  /**
   * Creates a mock timeline response with realistic data
   */
  static createMockTimeline(overrides: Partial<BuildInterfaces.Timeline> = {}): BuildInterfaces.Timeline {
    return {
      id: 'timeline-1',
      changeId: 1,
      lastChangedBy: 'system',
      lastChangedOn: new Date('2024-01-01T10:05:00Z'),
      records: [
        {
          id: 'job-1',
          parentId: undefined,
          type: 'Job',
          name: 'Build Job',
          startTime: new Date('2024-01-01T10:00:00Z'),
          finishTime: new Date('2024-01-01T10:05:00Z'),
          state: BuildInterfaces.TimelineRecordState.Completed,
          result: BuildInterfaces.TaskResult.Succeeded,
          log: {
            id: 1,
            type: 'Container',
            url: 'https://dev.azure.com/test-org/test-project/_apis/build/builds/12345/logs/1'
          }
        }
      ],
      ...overrides
    };
  }

  /**
   * Creates a mock artifact response with realistic data
   */
  static createMockArtifact(overrides: Partial<BuildInterfaces.BuildArtifact> = {}): BuildInterfaces.BuildArtifact {
    return {
      id: 1,
      name: 'drop',
      resource: {
        type: 'PipelineArtifact',
        data: 'artifact-data',
        properties: {},
        url: 'https://dev.azure.com/test-org/test-project/_apis/build/builds/12345/artifacts/1',
        downloadUrl: 'https://dev.azure.com/test-org/test-project/_apis/build/builds/12345/artifacts/1/content'
      },
      ...overrides
    };
  }

  /**
   * Creates a mock pipeline run response with realistic data
   */
  static createMockPipelineRun(overrides: Partial<PipelinesInterfaces.Run> = {}): PipelinesInterfaces.Run {
    return {
      id: 12345,
      name: 'Pipeline Run 20240101.1',
      state: PipelinesInterfaces.RunState.Completed,
      result: PipelinesInterfaces.RunResult.Succeeded,
      createdDate: new Date('2024-01-01T10:00:00Z'),
      finishedDate: new Date('2024-01-01T10:05:00Z'),
      pipeline: {
        id: 1,
        name: 'CI Pipeline',
        folder: '\\',
        revision: 1
      },
      url: 'https://dev.azure.com/test-org/test-project/_apis/pipelines/1/runs/12345',
      ...overrides
    };
  }

  /**
   * Creates a mock pipeline artifact response with realistic data
   */
  static createMockPipelineArtifact(overrides: Partial<PipelinesInterfaces.Artifact> = {}): PipelinesInterfaces.Artifact {
    return {
      name: 'drop',
      signedContent: {
        url: 'https://signed-url-for-download.com/artifact.zip'
      },
      ...overrides
    };
  }

  /**
   * Creates a paged list response with continuation token support
   */
  static createPagedList<T>(items: T[], continuationToken?: string): PagedList<T> {
    const pagedList = Object.assign([], items) as PagedList<T>;
    pagedList.continuationToken = continuationToken;
    return pagedList;
  }

  // Error Simulation Helpers

  /**
   * Creates a permission error for testing access denied scenarios
   */
  static createPermissionError(message: string = 'Access denied'): Error {
    const error = new Error(message) as any;
    error.statusCode = 403;
    error.name = 'PermissionError';
    return error;
  }

  /**
   * Creates a not found error for testing resource not found scenarios
   */
  static createNotFoundError(message: string = 'Resource not found'): Error {
    const error = new Error(message) as any;
    error.statusCode = 404;
    error.name = 'NotFoundError';
    return error;
  }

  /**
   * Creates a network timeout error for testing timeout scenarios
   */
  static createTimeoutError(message: string = 'Request timeout'): Error {
    const error = new Error(message) as any;
    error.code = 'ETIMEDOUT';
    error.name = 'TimeoutError';
    return error;
  }

  /**
   * Creates an authentication error for testing invalid credentials
   */
  static createAuthError(message: string = 'Authentication failed'): Error {
    const error = new Error(message) as any;
    error.statusCode = 401;
    error.name = 'AuthenticationError';
    return error;
  }

  /**
   * Creates a generic API error for testing unexpected failures
   */
  static createApiError(message: string = 'API Error', statusCode: number = 500): Error {
    const error = new Error(message) as any;
    error.statusCode = statusCode;
    error.name = 'ApiError';
    return error;
  }

  // Setup Helpers

  /**
   * Sets up common mock responses for successful scenarios
   * Returns configured mock APIs for easy access in tests
   */
  static setupSuccessfulMocks() {
    const mockTaskAgentApi = MockFactory.createTaskAgentApi();
    const mockBuildApi = MockFactory.createBuildApi();
    const mockPipelinesApi = MockFactory.createPipelinesApi();

    // Setup default successful responses
    (mockTaskAgentApi.getAgentQueues as any).mockResolvedValue([MockFactory.createMockQueue()]);
    (mockTaskAgentApi.getAgents as any).mockResolvedValue([MockFactory.createMockAgent()]);
    (mockTaskAgentApi.getAgentPools as any).mockResolvedValue([MockFactory.createMockAgentPool()]);

    (mockBuildApi.getBuilds as any).mockResolvedValue(MockFactory.createPagedList([MockFactory.createMockBuild()]));
    (mockBuildApi.getDefinitions as any).mockResolvedValue(MockFactory.createPagedList([MockFactory.createMockBuildDefinition()]));
    (mockBuildApi.getBuildTimeline as any).mockResolvedValue(MockFactory.createMockTimeline());
    (mockBuildApi.getBuild as any).mockResolvedValue(MockFactory.createMockBuild());
    (mockBuildApi.getArtifacts as any).mockResolvedValue([MockFactory.createMockArtifact()]);
    (mockBuildApi.queueBuild as any).mockResolvedValue(MockFactory.createMockBuild());

    (mockPipelinesApi.runPipeline as any).mockResolvedValue(MockFactory.createMockPipelineRun());
    (mockPipelinesApi.getRun as any).mockResolvedValue(MockFactory.createMockPipelineRun());
    (mockPipelinesApi.listRuns as any).mockResolvedValue([MockFactory.createMockPipelineRun()]);
    (mockPipelinesApi.getArtifact as any).mockResolvedValue(MockFactory.createMockPipelineArtifact());

    // Create WebApi that returns these configured APIs
    const mockWebApi = {
      getTaskAgentApi: vi.fn().mockResolvedValue(mockTaskAgentApi),
      getBuildApi: vi.fn().mockResolvedValue(mockBuildApi),
      getPipelinesApi: vi.fn().mockResolvedValue(mockPipelinesApi),
    };

    return {
      mockWebApi,
      mockTaskAgentApi,
      mockBuildApi,
      mockPipelinesApi
    };
  }

  /**
   * Sets up mock responses for error scenarios
   * Useful for testing error handling paths
   */
  static setupErrorMocks() {
    const mockTaskAgentApi = MockFactory.createTaskAgentApi();
    const mockBuildApi = MockFactory.createBuildApi();
    const mockPipelinesApi = MockFactory.createPipelinesApi();

    // Setup error responses
    (mockTaskAgentApi.getAgentQueues as any).mockRejectedValue(MockFactory.createPermissionError());
    (mockTaskAgentApi.getAgents as any).mockRejectedValue(MockFactory.createNotFoundError());
    (mockTaskAgentApi.getAgentPools as any).mockRejectedValue(MockFactory.createAuthError());

    (mockBuildApi.getBuilds as any).mockRejectedValue(MockFactory.createApiError());
    (mockBuildApi.getDefinitions as any).mockRejectedValue(MockFactory.createTimeoutError());
    (mockBuildApi.getBuildTimeline as any).mockRejectedValue(MockFactory.createNotFoundError());

    (mockPipelinesApi.runPipeline as any).mockRejectedValue(MockFactory.createPermissionError());

    // Create WebApi that returns these configured APIs
    const mockWebApi = {
      getTaskAgentApi: vi.fn().mockResolvedValue(mockTaskAgentApi),
      getBuildApi: vi.fn().mockResolvedValue(mockBuildApi),
      getPipelinesApi: vi.fn().mockResolvedValue(mockPipelinesApi),
    };

    return {
      mockWebApi,
      mockTaskAgentApi,
      mockBuildApi,
      mockPipelinesApi
    };
  }

  /**
   * Creates a mock readable stream for testing file downloads
   */
  static createMockStream(content: string = 'Mock log content\nLine 2\nLine 3\n') {
    const { Readable } = require('stream');
    return Readable.from([content]);
  }

  /**
   * Creates multiple mock queues for testing pagination and filtering
   */
  static createMockQueues(count: number = 3): TaskAgentInterfaces.TaskAgentQueue[] {
    return Array.from({ length: count }, (_, i) => 
      MockFactory.createMockQueue({
        id: i + 1,
        name: `Queue-${i + 1}`,
        pool: {
          id: i + 1,
          name: `Pool-${i + 1}`,
          isHosted: i % 2 === 0
        }
      })
    );
  }

  /**
   * Creates multiple mock agents for testing pagination and filtering
   */
  static createMockAgents(count: number = 3): TaskAgentInterfaces.TaskAgent[] {
    return Array.from({ length: count }, (_, i) => 
      MockFactory.createMockAgent({
        id: i + 1,
        name: `Agent-${String(i + 1).padStart(3, '0')}`,
        status: i % 2 === 0 ? TaskAgentInterfaces.TaskAgentStatus.Online : TaskAgentInterfaces.TaskAgentStatus.Offline,
        enabled: i !== 2, // Make one disabled for testing
        version: `3.220.${i + 5}`,
        oSDescription: i % 2 === 0 ? 'Linux 5.4.0-74-generic #83-Ubuntu' : 'Windows Server 2019'
      })
    );
  }

  /**
   * Creates multiple mock builds for testing pagination and filtering
   */
  static createMockBuilds(count: number = 3): BuildInterfaces.Build[] {
    return Array.from({ length: count }, (_, i) => 
      MockFactory.createMockBuild({
        id: 12345 + i,
        buildNumber: `20240101.${i + 1}`,
        status: i === 0 ? BuildInterfaces.BuildStatus.InProgress : BuildInterfaces.BuildStatus.Completed,
        result: i === 0 ? undefined : (i % 2 === 0 ? BuildInterfaces.BuildResult.Succeeded : BuildInterfaces.BuildResult.Failed),
        definition: {
          id: Math.floor(i / 2) + 1,
          name: `CI Build ${Math.floor(i / 2) + 1}`
        },
        sourceBranch: i % 2 === 0 ? 'refs/heads/main' : 'refs/heads/feature/test'
      })
    );
  }

  /**
   * Creates a mock timeline with multiple records for testing complex scenarios
   */
  static createMockComplexTimeline(): BuildInterfaces.Timeline {
    return {
      id: 'timeline-complex',
      changeId: 1,
      lastChangedBy: 'system',
      lastChangedOn: new Date('2024-01-01T10:05:00Z'),
      records: [
        // Stage
        {
          id: 'stage-1',
          parentId: undefined,
          type: 'Stage',
          name: 'Build Stage',
          startTime: new Date('2024-01-01T10:00:00Z'),
          finishTime: new Date('2024-01-01T10:05:00Z'),
          state: BuildInterfaces.TimelineRecordState.Completed,
          result: BuildInterfaces.TaskResult.Succeeded
        },
        // Job under stage
        {
          id: 'job-1',
          parentId: 'stage-1',
          type: 'Job',
          name: 'Build Job',
          startTime: new Date('2024-01-01T10:00:00Z'),
          finishTime: new Date('2024-01-01T10:03:00Z'),
          state: BuildInterfaces.TimelineRecordState.Completed,
          result: BuildInterfaces.TaskResult.Succeeded,
          log: {
            id: 1,
            type: 'Container',
            url: 'https://dev.azure.com/test-org/test-project/_apis/build/builds/12345/logs/1'
          }
        },
        // Task under job
        {
          id: 'task-1',
          parentId: 'job-1',
          type: 'Task',
          name: 'Checkout',
          startTime: new Date('2024-01-01T10:00:00Z'),
          finishTime: new Date('2024-01-01T10:01:00Z'),
          state: BuildInterfaces.TimelineRecordState.Completed,
          result: BuildInterfaces.TaskResult.Succeeded,
          log: {
            id: 2,
            type: 'Container',
            url: 'https://dev.azure.com/test-org/test-project/_apis/build/builds/12345/logs/2'
          }
        },
        // Another job
        {
          id: 'job-2',
          parentId: 'stage-1',
          type: 'Job',
          name: 'Test Job',
          startTime: new Date('2024-01-01T10:03:00Z'),
          finishTime: new Date('2024-01-01T10:05:00Z'),
          state: BuildInterfaces.TimelineRecordState.Completed,
          result: BuildInterfaces.TaskResult.Succeeded,
          log: {
            id: 3,
            type: 'Container',
            url: 'https://dev.azure.com/test-org/test-project/_apis/build/builds/12345/logs/3'
          }
        }
      ]
    };
  }

  /**
   * Resets all mocks to their initial state
   * Should be called between tests to ensure clean state
   */
  static resetAllMocks() {
    vi.clearAllMocks();
  }
}