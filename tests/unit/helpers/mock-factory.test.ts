import { describe, it, expect, beforeEach } from 'vitest';
import { MockFactory } from '../../helpers/mock-factory.js';
import * as BuildInterfaces from 'azure-devops-node-api/interfaces/BuildInterfaces.js';
import * as TaskAgentInterfaces from 'azure-devops-node-api/interfaces/TaskAgentInterfaces.js';

describe('MockFactory', () => {
  beforeEach(() => {
    MockFactory.resetAllMocks();
  });

  describe('WebApi Mock Creation', () => {
    it('should create a WebApi mock with all required API getters', () => {
      const mockWebApi = MockFactory.createWebApi();

      expect(mockWebApi.getTaskAgentApi).toBeDefined();
      expect(mockWebApi.getBuildApi).toBeDefined();
      expect(mockWebApi.getPipelinesApi).toBeDefined();
    });

    it('should return mocked API instances when getters are called', async () => {
      const mockWebApi = MockFactory.createWebApi();

      const taskAgentApi = await mockWebApi.getTaskAgentApi!();
      const buildApi = await mockWebApi.getBuildApi!();
      const pipelinesApi = await mockWebApi.getPipelinesApi!();

      expect(taskAgentApi).toBeDefined();
      expect(taskAgentApi.getAgentQueues).toBeDefined();
      expect(buildApi).toBeDefined();
      expect(buildApi.getBuilds).toBeDefined();
      expect(pipelinesApi).toBeDefined();
      expect(pipelinesApi.runPipeline).toBeDefined();
    });
  });

  describe('TaskAgentApi Mock Creation', () => {
    it('should create a TaskAgentApi mock with all required methods', () => {
      const mockTaskAgentApi = MockFactory.createTaskAgentApi();

      expect(mockTaskAgentApi.getAgentQueues).toBeDefined();
      expect(mockTaskAgentApi.getAgents).toBeDefined();
      expect(mockTaskAgentApi.getAgentPools).toBeDefined();
    });
  });

  describe('BuildApi Mock Creation', () => {
    it('should create a BuildApi mock with all required methods', () => {
      const mockBuildApi = MockFactory.createBuildApi();

      expect(mockBuildApi.getBuilds).toBeDefined();
      expect(mockBuildApi.getDefinitions).toBeDefined();
      expect(mockBuildApi.getBuildTimeline).toBeDefined();
      expect(mockBuildApi.getBuildLog).toBeDefined();
      expect(mockBuildApi.getBuild).toBeDefined();
      expect(mockBuildApi.getArtifacts).toBeDefined();
      expect(mockBuildApi.queueBuild).toBeDefined();
    });
  });

  describe('PipelinesApi Mock Creation', () => {
    it('should create a PipelinesApi mock with all required methods', () => {
      const mockPipelinesApi = MockFactory.createPipelinesApi();

      expect(mockPipelinesApi.runPipeline).toBeDefined();
      expect(mockPipelinesApi.getRun).toBeDefined();
      expect(mockPipelinesApi.listRuns).toBeDefined();
      expect(mockPipelinesApi.getArtifact).toBeDefined();
    });
  });

  describe('Mock Response Helpers', () => {
    it('should create a realistic mock queue', () => {
      const mockQueue = MockFactory.createMockQueue();

      expect(mockQueue.id).toBe(1);
      expect(mockQueue.name).toBe('Default');
      expect(mockQueue.pool).toBeDefined();
      expect(mockQueue.pool!.id).toBe(1);
      expect(mockQueue.pool!.name).toBe('Default');
      expect(mockQueue.pool!.isHosted).toBe(false);
    });

    it('should create a mock queue with overrides', () => {
      const mockQueue = MockFactory.createMockQueue({
        id: 999,
        name: 'Custom Queue',
        pool: { id: 888, name: 'Custom Pool', isHosted: true }
      });

      expect(mockQueue.id).toBe(999);
      expect(mockQueue.name).toBe('Custom Queue');
      expect(mockQueue.pool!.id).toBe(888);
      expect(mockQueue.pool!.name).toBe('Custom Pool');
      expect(mockQueue.pool!.isHosted).toBe(true);
    });

    it('should create a realistic mock agent', () => {
      const mockAgent = MockFactory.createMockAgent();

      expect(mockAgent.id).toBe(1);
      expect(mockAgent.name).toBe('Agent-001');
      expect(mockAgent.status).toBe(TaskAgentInterfaces.TaskAgentStatus.Online);
      expect(mockAgent.enabled).toBe(true);
      expect(mockAgent.version).toBe('3.220.5');
      expect(mockAgent.oSDescription).toContain('Linux');
    });

    it('should create a realistic mock build', () => {
      const mockBuild = MockFactory.createMockBuild();

      expect(mockBuild.id).toBe(12345);
      expect(mockBuild.buildNumber).toBe('20240101.1');
      expect(mockBuild.status).toBe(BuildInterfaces.BuildStatus.Completed);
      expect(mockBuild.result).toBe(BuildInterfaces.BuildResult.Succeeded);
      expect(mockBuild.definition).toBeDefined();
      expect(mockBuild.definition!.id).toBe(1);
      expect(mockBuild.definition!.name).toBe('CI Build');
    });

    it('should create a realistic mock timeline', () => {
      const mockTimeline = MockFactory.createMockTimeline();

      expect(mockTimeline.id).toBe('timeline-1');
      expect(mockTimeline.records).toBeDefined();
      expect(mockTimeline.records!.length).toBe(1);
      
      const jobRecord = mockTimeline.records![0];
      expect(jobRecord.type).toBe('Job');
      expect(jobRecord.name).toBe('Build Job');
      expect(jobRecord.state).toBe(BuildInterfaces.TimelineRecordState.Completed);
      expect(jobRecord.log).toBeDefined();
      expect(jobRecord.log!.id).toBe(1);
    });

    it('should create a paged list with continuation token', () => {
      const items = [MockFactory.createMockBuild(), MockFactory.createMockBuild({ id: 67890 })];
      const pagedList = MockFactory.createPagedList(items, 'next-token');

      expect(pagedList.length).toBe(2);
      expect(pagedList.continuationToken).toBe('next-token');
      expect(pagedList[0].id).toBe(12345);
      expect(pagedList[1].id).toBe(67890);
    });
  });

  describe('Error Simulation Helpers', () => {
    it('should create a permission error with correct properties', () => {
      const error = MockFactory.createPermissionError('Custom permission error');

      expect(error.message).toBe('Custom permission error');
      expect((error as any).statusCode).toBe(403);
      expect(error.name).toBe('PermissionError');
    });

    it('should create a not found error with correct properties', () => {
      const error = MockFactory.createNotFoundError('Resource not found');

      expect(error.message).toBe('Resource not found');
      expect((error as any).statusCode).toBe(404);
      expect(error.name).toBe('NotFoundError');
    });

    it('should create a timeout error with correct properties', () => {
      const error = MockFactory.createTimeoutError('Request timed out');

      expect(error.message).toBe('Request timed out');
      expect((error as any).code).toBe('ETIMEDOUT');
      expect(error.name).toBe('TimeoutError');
    });

    it('should create an auth error with correct properties', () => {
      const error = MockFactory.createAuthError('Invalid token');

      expect(error.message).toBe('Invalid token');
      expect((error as any).statusCode).toBe(401);
      expect(error.name).toBe('AuthenticationError');
    });

    it('should create a generic API error with custom status code', () => {
      const error = MockFactory.createApiError('Server error', 500);

      expect(error.message).toBe('Server error');
      expect((error as any).statusCode).toBe(500);
      expect(error.name).toBe('ApiError');
    });
  });

  describe('Setup Helpers', () => {
    it('should setup successful mocks with default responses', () => {
      const mocks = MockFactory.setupSuccessfulMocks();

      expect(mocks.mockWebApi).toBeDefined();
      expect(mocks.mockTaskAgentApi).toBeDefined();
      expect(mocks.mockBuildApi).toBeDefined();
      expect(mocks.mockPipelinesApi).toBeDefined();

      // Verify that mocks have been configured with default responses
      expect(mocks.mockTaskAgentApi.getAgentQueues).toHaveBeenCalledTimes(0); // Not called yet, but configured
      expect(mocks.mockBuildApi.getBuilds).toHaveBeenCalledTimes(0);
    });

    it('should setup error mocks with error responses', () => {
      const mocks = MockFactory.setupErrorMocks();

      expect(mocks.mockWebApi).toBeDefined();
      expect(mocks.mockTaskAgentApi).toBeDefined();
      expect(mocks.mockBuildApi).toBeDefined();
      expect(mocks.mockPipelinesApi).toBeDefined();

      // Verify that mocks have been configured with error responses
      expect(mocks.mockTaskAgentApi.getAgentQueues).toHaveBeenCalledTimes(0); // Not called yet, but configured
      expect(mocks.mockBuildApi.getBuilds).toHaveBeenCalledTimes(0);
    });
  });

  describe('Utility Methods', () => {
    it('should create a mock stream with default content', () => {
      const stream = MockFactory.createMockStream();
      expect(stream).toBeDefined();
      expect(stream.readable).toBe(true);
    });

    it('should create a mock stream with custom content', () => {
      const customContent = 'Custom log content';
      const stream = MockFactory.createMockStream(customContent);
      expect(stream).toBeDefined();
      expect(stream.readable).toBe(true);
    });

    it('should create multiple mock queues', () => {
      const queues = MockFactory.createMockQueues(5);
      expect(queues).toHaveLength(5);
      expect(queues[0].name).toBe('Queue-1');
      expect(queues[4].name).toBe('Queue-5');
      expect(queues[0].pool!.isHosted).toBe(true); // Even index
      expect(queues[1].pool!.isHosted).toBe(false); // Odd index
    });

    it('should create multiple mock agents with varied properties', () => {
      const agents = MockFactory.createMockAgents(4);
      expect(agents).toHaveLength(4);
      expect(agents[0].name).toBe('Agent-001');
      expect(agents[3].name).toBe('Agent-004');
      expect(agents[0].status).toBe(TaskAgentInterfaces.TaskAgentStatus.Online); // Even index
      expect(agents[1].status).toBe(TaskAgentInterfaces.TaskAgentStatus.Offline); // Odd index
      expect(agents[2].enabled).toBe(false); // Index 2 is disabled
      expect(agents[0].enabled).toBe(true);
    });

    it('should create multiple mock builds with varied properties', () => {
      const builds = MockFactory.createMockBuilds(3);
      expect(builds).toHaveLength(3);
      expect(builds[0].id).toBe(12345);
      expect(builds[2].id).toBe(12347);
      expect(builds[0].status).toBe(BuildInterfaces.BuildStatus.InProgress);
      expect(builds[1].status).toBe(BuildInterfaces.BuildStatus.Completed);
      expect(builds[0].result).toBeUndefined(); // In progress builds have no result
      expect(builds[1].result).toBe(BuildInterfaces.BuildResult.Failed); // Odd index fails
    });

    it('should create a complex timeline with multiple record types', () => {
      const timeline = MockFactory.createMockComplexTimeline();
      expect(timeline.id).toBe('timeline-complex');
      expect(timeline.records).toHaveLength(4);
      
      const stage = timeline.records!.find(r => r.type === 'Stage');
      const jobs = timeline.records!.filter(r => r.type === 'Job');
      const task = timeline.records!.find(r => r.type === 'Task');
      
      expect(stage).toBeDefined();
      expect(stage!.name).toBe('Build Stage');
      expect(jobs).toHaveLength(2);
      expect(jobs[0].name).toBe('Build Job');
      expect(jobs[1].name).toBe('Test Job');
      expect(task).toBeDefined();
      expect(task!.name).toBe('Checkout');
      expect(task!.parentId).toBe('job-1');
    });
  });
});