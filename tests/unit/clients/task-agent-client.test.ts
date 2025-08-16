import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as azdev from 'azure-devops-node-api';
import { TaskAgentClient } from '../../../src/clients/task-agent-client.js';
import { Config } from '../../../src/config.js';
import { MockFactory } from '../../helpers/mock-factory.js';
import * as TaskAgentInterfaces from 'azure-devops-node-api/interfaces/TaskAgentInterfaces.js';

describe('TaskAgentClient', () => {
  let mockConfig: Config;
  let client: TaskAgentClient;
  let mockWebApi: Partial<azdev.WebApi>;
  let mockTaskAgentApi: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = {
      organization: 'https://dev.azure.com/test-org',
      project: 'test-project',
      pat: 'test-pat-token',
      logLevel: 'info',
    };

    mockTaskAgentApi = MockFactory.createTaskAgentApi();
    mockWebApi = {
      getTaskAgentApi: vi.fn().mockResolvedValue(mockTaskAgentApi),
    };

    vi.spyOn(azdev, 'WebApi').mockImplementation(() => mockWebApi as azdev.WebApi);
    vi.spyOn(azdev, 'getPersonalAccessTokenHandler').mockReturnValue({} as any);

    client = new TaskAgentClient(mockConfig);
  });

  describe('getQueues', () => {
    it('should return formatted queue list on success', async () => {
      const mockQueues = MockFactory.createMockQueues(2);
      mockTaskAgentApi.getAgentQueues.mockResolvedValue(mockQueues);

      const result = await client.getQueues();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0]).toEqual({
          id: 1,
          name: 'Queue-1',
          poolId: 1,
          poolName: 'Pool-1',
          isHosted: true,
        });
      }
      expect(mockTaskAgentApi.getAgentQueues).toHaveBeenCalledWith(mockConfig.project);
    });

    it('should filter out queues with missing required properties', async () => {
      const mockQueues = [
        MockFactory.createMockQueue({ id: 1, name: 'Valid Queue' }),
        { id: undefined, name: 'Invalid Queue' }, // Missing id
        { id: 2, name: undefined }, // Missing name
        { id: 3, name: 'No Pool', pool: undefined }, // Missing pool
      ];
      mockTaskAgentApi.getAgentQueues.mockResolvedValue(mockQueues);

      const result = await client.getQueues();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].name).toBe('Valid Queue');
      }
    });

    it('should handle empty queue list', async () => {
      mockTaskAgentApi.getAgentQueues.mockResolvedValue([]);

      const result = await client.getQueues();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });

    it('should handle API errors', async () => {
      const error = MockFactory.createPermissionError('Access denied');
      mockTaskAgentApi.getAgentQueues.mockRejectedValue(error);

      const result = await client.getQueues();

      expect(result.success).toBe(false);
    });
  });

  describe('getQueue', () => {
    it('should find queue by ID', async () => {
      const mockQueues = MockFactory.createMockQueues(3);
      mockTaskAgentApi.getAgentQueues.mockResolvedValue(mockQueues);

      const result = await client.getQueue({ queueIdOrName: 2 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(2);
        expect(result.data.name).toBe('Queue-2');
      }
    });

    it('should find queue by name (case insensitive)', async () => {
      const mockQueues = MockFactory.createMockQueues(3);
      mockTaskAgentApi.getAgentQueues.mockResolvedValue(mockQueues);

      const result = await client.getQueue({ queueIdOrName: 'queue-2' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(2);
        expect(result.data.name).toBe('Queue-2');
      }
    });

    it('should return error when queue not found by ID', async () => {
      const mockQueues = MockFactory.createMockQueues(2);
      mockTaskAgentApi.getAgentQueues.mockResolvedValue(mockQueues);

      const result = await client.getQueue({ queueIdOrName: 999 });

      expect(result.success).toBe(false);
    });

    it('should return error when queue not found by name', async () => {
      const mockQueues = MockFactory.createMockQueues(2);
      mockTaskAgentApi.getAgentQueues.mockResolvedValue(mockQueues);

      const result = await client.getQueue({ queueIdOrName: 'NonExistent' });

      expect(result.success).toBe(false);
    });

    it('should handle queues with missing properties', async () => {
      const mockQueues = [{ id: 1, name: undefined, pool: { id: 1, name: 'Pool-1' } }];
      mockTaskAgentApi.getAgentQueues.mockResolvedValue(mockQueues);

      const result = await client.getQueue({ queueIdOrName: 1 });

      expect(result.success).toBe(false);
    });
  });

  describe('findAgent', () => {
    it('should find agents across pools', async () => {
      const mockPools = [
        MockFactory.createMockAgentPool({ id: 1, name: 'Pool-1' }),
        MockFactory.createMockAgentPool({ id: 2, name: 'Pool-2' }),
      ];
      const mockAgents1 = [MockFactory.createMockAgent({ id: 1, name: 'TestAgent' })];
      const mockAgents2 = [MockFactory.createMockAgent({ id: 2, name: 'TestAgent' })];

      mockTaskAgentApi.getAgentPools.mockResolvedValue(mockPools);
      mockTaskAgentApi.getAgents
        .mockResolvedValueOnce(mockAgents1)
        .mockResolvedValueOnce(mockAgents2);

      const result = await client.findAgent('TestAgent');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0].agent.name).toBe('TestAgent');
        expect(result.data[0].poolName).toBe('Pool-1');
        expect(result.data[1].poolName).toBe('Pool-2');
      }
    });

    it('should handle agent status mapping', async () => {
      const mockPools = [MockFactory.createMockAgentPool({ id: 1, name: 'Pool-1' })];
      const mockAgents = [
        MockFactory.createMockAgent({
          id: 1,
          name: 'OnlineAgent',
          status: TaskAgentInterfaces.TaskAgentStatus.Online,
        }),
        MockFactory.createMockAgent({
          id: 2,
          name: 'OfflineAgent',
          status: TaskAgentInterfaces.TaskAgentStatus.Offline,
        }),
        MockFactory.createMockAgent({
          id: 3,
          name: 'UnknownAgent',
          status: undefined,
        }),
      ];

      mockTaskAgentApi.getAgentPools.mockResolvedValue(mockPools);
      mockTaskAgentApi.getAgents.mockResolvedValue(mockAgents);

      const result = await client.findAgent('Agent');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(3);
        expect(result.data[0].agent.status).toBe('Online');
        expect(result.data[1].agent.status).toBe('Offline');
        expect(result.data[2].agent.status).toBe('Unknown');
      }
    });

    it('should skip pools without access', async () => {
      const mockPools = [
        MockFactory.createMockAgentPool({ id: 1, name: 'AccessiblePool' }),
        MockFactory.createMockAgentPool({ id: 2, name: 'RestrictedPool' }),
      ];
      const mockAgents = [MockFactory.createMockAgent({ id: 1, name: 'TestAgent' })];

      mockTaskAgentApi.getAgentPools.mockResolvedValue(mockPools);
      mockTaskAgentApi.getAgents
        .mockResolvedValueOnce(mockAgents)
        .mockRejectedValueOnce(MockFactory.createPermissionError());

      const result = await client.findAgent('TestAgent');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].poolName).toBe('AccessiblePool');
      }
    });

    it('should handle permission errors at pool level', async () => {
      const error = MockFactory.createPermissionError('Access denied');
      (error as any).statusCode = 403;
      mockTaskAgentApi.getAgentPools.mockRejectedValue(error);

      const result = await client.findAgent('TestAgent');

      expect(result.success).toBe(false);
    });

    it('should filter agents with missing properties', async () => {
      const mockPools = [MockFactory.createMockAgentPool({ id: 1, name: 'Pool-1' })];
      const mockAgents = [
        MockFactory.createMockAgent({ id: 1, name: 'ValidAgent' }),
        { id: undefined, name: 'InvalidAgent' }, // Missing id
        { id: 2, name: undefined }, // Missing name
      ];

      mockTaskAgentApi.getAgentPools.mockResolvedValue(mockPools);
      mockTaskAgentApi.getAgents.mockResolvedValue(mockAgents);

      const result = await client.findAgent('Agent');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].agent.name).toBe('ValidAgent');
      }
    });

    it('should handle no agents found scenario', async () => {
      const mockPools = [MockFactory.createMockAgentPool({ id: 1, name: 'Pool-1' })];
      mockTaskAgentApi.getAgentPools.mockResolvedValue(mockPools);
      mockTaskAgentApi.getAgents.mockResolvedValue([]);

      // Mock getQueues to return empty for the fallback message
      const mockQueues: any[] = [];
      mockTaskAgentApi.getAgentQueues.mockResolvedValue(mockQueues);

      const result = await client.findAgent('NonExistentAgent');

      expect(result.success).toBe(false);
    });
  });

  describe('getAgentsByQueue', () => {
    it('should return agents for valid queue', async () => {
      const mockQueue = MockFactory.createMockQueue({
        id: 1,
        pool: { id: 1, name: 'Pool-1', isHosted: false },
      });
      const mockAgents = MockFactory.createMockAgents(2);

      // Mock getQueue call
      mockTaskAgentApi.getAgentQueues.mockResolvedValue([mockQueue]);
      mockTaskAgentApi.getAgents.mockResolvedValue(mockAgents);

      const result = await client.getAgentsByQueue({ queueId: 1 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
      }
      expect(mockTaskAgentApi.getAgents).toHaveBeenCalledWith(1); // poolId
    });

    it('should handle queue not found', async () => {
      mockTaskAgentApi.getAgentQueues.mockResolvedValue([]);

      const result = await client.getAgentsByQueue({ queueId: 999 });

      expect(result.success).toBe(false);
    });

    it('should handle permission errors', async () => {
      const mockQueue = MockFactory.createMockQueue({
        id: 1,
        pool: { id: 1, name: 'Pool-1', isHosted: false },
      });
      mockTaskAgentApi.getAgentQueues.mockResolvedValue([mockQueue]);

      const error = MockFactory.createPermissionError('Access denied');
      (error as any).statusCode = 403;
      mockTaskAgentApi.getAgents.mockRejectedValue(error);

      const result = await client.getAgentsByQueue({ queueId: 1 });

      expect(result.success).toBe(false);
    });

    it('should filter agents with missing properties', async () => {
      const mockQueue = MockFactory.createMockQueue({
        id: 1,
        pool: { id: 1, name: 'Pool-1', isHosted: false },
      });
      const mockAgents = [
        MockFactory.createMockAgent({ id: 1, name: 'ValidAgent' }),
        { id: undefined, name: 'InvalidAgent' },
        { id: 2, name: undefined },
      ];

      mockTaskAgentApi.getAgentQueues.mockResolvedValue([mockQueue]);
      mockTaskAgentApi.getAgents.mockResolvedValue(mockAgents);

      const result = await client.getAgentsByQueue({ queueId: 1 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].name).toBe('ValidAgent');
      }
    });
  });

  describe('getAgents', () => {
    beforeEach(() => {
      // Setup default mock queues
      const mockQueues = [
        MockFactory.createMockQueue({
          id: 1,
          name: 'Queue-1',
          pool: { id: 1, name: 'Pool-1' },
        }),
        MockFactory.createMockQueue({
          id: 2,
          name: 'Queue-2',
          pool: { id: 2, name: 'Pool-2' },
        }),
      ];
      mockTaskAgentApi.getAgentQueues.mockResolvedValue(mockQueues);
    });

    it('should return all agents from all queues', async () => {
      const mockAgents1 = [MockFactory.createMockAgent({ id: 1, name: 'Agent-1' })];
      const mockAgents2 = [MockFactory.createMockAgent({ id: 2, name: 'Agent-2' })];

      mockTaskAgentApi.getAgents
        .mockResolvedValueOnce(mockAgents1)
        .mockResolvedValueOnce(mockAgents2);

      const result = await client.getAgents();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.agents).toHaveLength(2);
        expect(result.data.agents[0].name).toBe('Agent-1');
        expect(result.data.agents[1].name).toBe('Agent-2');
        expect(result.data.hasMore).toBe(false);
      }
    });

    it('should filter by pool name', async () => {
      const mockAgents = [MockFactory.createMockAgent({ id: 1, name: 'Agent-1' })];
      mockTaskAgentApi.getAgents.mockResolvedValue(mockAgents);

      const result = await client.getAgents({ poolNameFilter: 'Pool-1' });

      expect(result.success).toBe(true);
      expect(mockTaskAgentApi.getAgents).toHaveBeenCalledTimes(1);
      expect(mockTaskAgentApi.getAgents).toHaveBeenCalledWith(1); // Only Pool-1's ID
    });

    it('should filter by agent name', async () => {
      const mockAgents = [
        MockFactory.createMockAgent({ id: 1, name: 'TestAgent-1' }),
        MockFactory.createMockAgent({ id: 2, name: 'OtherAgent-2' }),
      ];
      mockTaskAgentApi.getAgents.mockResolvedValue(mockAgents);

      const result = await client.getAgents({ nameFilter: 'Test' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.agents).toHaveLength(1);
        expect(result.data.agents[0].name).toBe('TestAgent-1');
      }
    });

    it('should filter by online status', async () => {
      const mockAgents = [
        MockFactory.createMockAgent({
          id: 1,
          name: 'OnlineAgent',
          status: TaskAgentInterfaces.TaskAgentStatus.Online,
        }),
        MockFactory.createMockAgent({
          id: 2,
          name: 'OfflineAgent',
          status: TaskAgentInterfaces.TaskAgentStatus.Offline,
        }),
      ];
      mockTaskAgentApi.getAgents.mockResolvedValue(mockAgents);

      const result = await client.getAgents({ onlyOnline: true });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.agents).toHaveLength(1);
        expect(result.data.agents[0].name).toBe('OnlineAgent');
      }
    });

    it('should handle pagination', async () => {
      const mockAgents = Array.from({ length: 5 }, (_, i) =>
        MockFactory.createMockAgent({ id: i + 1, name: `Agent-${i + 1}` }),
      );
      mockTaskAgentApi.getAgents.mockResolvedValue(mockAgents);

      const result = await client.getAgents({ limit: 3 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.agents).toHaveLength(3);
        expect(result.data.hasMore).toBe(true);
        expect(result.data.continuationToken).toBe('3');
      }
    });

    it('should handle continuation token', async () => {
      const mockAgents = Array.from({ length: 5 }, (_, i) =>
        MockFactory.createMockAgent({ id: i + 1, name: `Agent-${i + 1}` }),
      );
      mockTaskAgentApi.getAgents.mockResolvedValue(mockAgents);

      const result = await client.getAgents({
        limit: 2,
        continuationToken: '2',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.agents).toHaveLength(2);
        expect(result.data.agents[0].name).toBe('Agent-3'); // Starting from offset 2
        expect(result.data.hasMore).toBe(true);
      }
    });

    it('should skip inaccessible pools and continue', async () => {
      const mockAgents = [MockFactory.createMockAgent({ id: 1, name: 'Agent-1' })];

      mockTaskAgentApi.getAgents
        .mockRejectedValueOnce(MockFactory.createPermissionError())
        .mockResolvedValueOnce(mockAgents);

      const result = await client.getAgents();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.agents).toHaveLength(1);
      }
    });

    it('should deduplicate agents by ID', async () => {
      const duplicateAgent = MockFactory.createMockAgent({ id: 1, name: 'DuplicateAgent' });

      mockTaskAgentApi.getAgents
        .mockResolvedValueOnce([duplicateAgent])
        .mockResolvedValueOnce([duplicateAgent]); // Same agent in different pools

      const result = await client.getAgents();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.agents).toHaveLength(1);
      }
    });

    it('should sort agents by name', async () => {
      const mockAgents1 = [MockFactory.createMockAgent({ id: 1, name: 'Zebra-Agent' })];
      const mockAgents2 = [MockFactory.createMockAgent({ id: 2, name: 'Alpha-Agent' })];

      mockTaskAgentApi.getAgents
        .mockResolvedValueOnce(mockAgents1)
        .mockResolvedValueOnce(mockAgents2);

      const result = await client.getAgents();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.agents[0].name).toBe('Alpha-Agent');
        expect(result.data.agents[1].name).toBe('Zebra-Agent');
      }
    });

    it('should handle empty queue list', async () => {
      mockTaskAgentApi.getAgentQueues.mockResolvedValue([]);

      const result = await client.getAgents();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.agents).toEqual([]);
        expect(result.data.hasMore).toBe(false);
      }
    });

    it('should include queue information in agent data', async () => {
      const mockAgents = [MockFactory.createMockAgent({ id: 1, name: 'Agent-1' })];
      mockTaskAgentApi.getAgents.mockResolvedValue(mockAgents);

      const result = await client.getAgents();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.agents[0]).toMatchObject({
          id: 1,
          name: 'Agent-1',
          poolName: 'Pool-1',
          queueId: 1,
          queueName: 'Queue-1',
        });
      }
    });
  });
});
