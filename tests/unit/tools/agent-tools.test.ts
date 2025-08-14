import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAgentTools } from '../../../src/tools/agent-tools.js';
import { TaskAgentClient } from '../../../src/clients/task-agent-client.js';
import { MockFactory } from '../../helpers/mock-factory.js';
import * as TaskAgentInterfaces from 'azure-devops-node-api/interfaces/TaskAgentInterfaces.js';

describe('Agent Tools', () => {
  let mockTaskAgentClient: TaskAgentClient;
  let agentTools: ReturnType<typeof createAgentTools>;

  beforeEach(() => {
    MockFactory.resetAllMocks();

    // Create a mock TaskAgentClient
    mockTaskAgentClient = {
      getQueues: vi.fn(),
      getQueue: vi.fn(),
      findAgent: vi.fn(),
      getAgents: vi.fn(),
    } as any;

    agentTools = createAgentTools(mockTaskAgentClient);
  });

  describe('project_health_check', () => {
    it('should return success status without calling any APIs', async () => {
      const result = await agentTools.project_health_check.handler({});

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                status: 'connected',
                message: 'Azure DevOps MCP server is running',
              },
              null,
              2,
            ),
          },
        ],
      });

      // Verify no API calls were made
      expect(mockTaskAgentClient.getQueues).not.toHaveBeenCalled();
      expect(mockTaskAgentClient.getQueue).not.toHaveBeenCalled();
      expect(mockTaskAgentClient.findAgent).not.toHaveBeenCalled();
      expect(mockTaskAgentClient.getAgents).not.toHaveBeenCalled();
    });

    it('should have correct tool definition', () => {
      expect(agentTools.project_health_check.tool).toEqual({
        name: 'project_health_check',
        description:
          'Check connection to Azure DevOps and verify permissions. Requires project-scoped PAT with Agent Pools (read) permission.',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      });
    });
  });

  describe('project_list_queues', () => {
    it('should return queues successfully', async () => {
      const mockQueues = MockFactory.createMockQueues(2);
      mockTaskAgentClient.getQueues = vi.fn().mockResolvedValue({
        success: true,
        data: mockQueues,
      });

      const result = await agentTools.project_list_queues.handler({});

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                queues: mockQueues,
                count: 2,
              },
              null,
              2,
            ),
          },
        ],
      });

      expect(mockTaskAgentClient.getQueues).toHaveBeenCalledTimes(1);
    });

    it('should handle API errors', async () => {
      const mockError = {
        type: 'api_error',
        message: 'Access denied',
        details: 'Insufficient permissions',
      };

      mockTaskAgentClient.getQueues = vi.fn().mockResolvedValue({
        success: false,
        error: mockError,
      });

      const result = await agentTools.project_list_queues.handler({});

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ API Error\n\nAccess denied',
          },
        ],
      });
    });

    it('should have correct tool definition', () => {
      expect(agentTools.project_list_queues.tool).toEqual({
        name: 'project_list_queues',
        description:
          'List all agent queues available in the project. Returns queue IDs, names, and pool information. Requires project-scoped PAT with Agent Pools (read) permission.',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      });
    });
  });

  describe('project_get_queue', () => {
    it('should get queue by ID successfully', async () => {
      const mockQueue = MockFactory.createMockQueue({ id: 123, name: 'Test Queue' });
      mockTaskAgentClient.getQueue = vi.fn().mockResolvedValue({
        success: true,
        data: mockQueue,
      });

      const result = await agentTools.project_get_queue.handler({ queueIdOrName: '123' });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(mockQueue, null, 2),
          },
        ],
      });

      expect(mockTaskAgentClient.getQueue).toHaveBeenCalledWith({
        queueIdOrName: 123,
      });
    });

    it('should get queue by name successfully', async () => {
      const mockQueue = MockFactory.createMockQueue({ id: 123, name: 'Test Queue' });
      mockTaskAgentClient.getQueue = vi.fn().mockResolvedValue({
        success: true,
        data: mockQueue,
      });

      const result = await agentTools.project_get_queue.handler({ queueIdOrName: 'Test Queue' });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(mockQueue, null, 2),
          },
        ],
      });

      expect(mockTaskAgentClient.getQueue).toHaveBeenCalledWith({
        queueIdOrName: 'Test Queue',
      });
    });

    it('should handle invalid queue ID', async () => {
      const mockError = {
        type: 'not_found',
        message: 'Queue not found',
        details: 'Queue with ID 999 does not exist',
      };

      mockTaskAgentClient.getQueue = vi.fn().mockResolvedValue({
        success: false,
        error: mockError,
      });

      const result = await agentTools.project_get_queue.handler({ queueIdOrName: '999' });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ Not Found\n\nQueue not found',
          },
        ],
      });
    });

    it('should have correct tool definition', () => {
      expect(agentTools.project_get_queue.tool).toEqual({
        name: 'project_get_queue',
        description:
          'Get detailed information about a specific queue including pool details and agent count. Requires project-scoped PAT with Agent Pools (read) permission.',
        inputSchema: {
          type: 'object',
          properties: {
            queueIdOrName: {
              type: 'string',
              description:
                'Queue ID (number) or name. Queue IDs are more reliable than names. Find IDs using project_list_queues.',
            },
          },
          required: ['queueIdOrName'],
        },
      });
    });
  });

  describe('org_find_agent', () => {
    it('should find agent successfully', async () => {
      const mockAgentData = {
        agent: MockFactory.createMockAgent({ name: 'TestAgent-001' }),
        poolName: 'Default Pool',
        queueId: 1,
      };

      mockTaskAgentClient.findAgent = vi.fn().mockResolvedValue({
        success: true,
        data: mockAgentData,
      });

      const result = await agentTools.org_find_agent.handler({ agentName: 'TestAgent-001' });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(mockAgentData, null, 2),
          },
        ],
      });

      expect(mockTaskAgentClient.findAgent).toHaveBeenCalledWith('TestAgent-001');
    });

    it('should handle agent not found', async () => {
      const mockError = {
        type: 'not_found',
        message: 'Agent not found',
        details: 'Agent "NonExistentAgent" was not found in any pool',
      };

      mockTaskAgentClient.findAgent = vi.fn().mockResolvedValue({
        success: false,
        error: mockError,
      });

      const result = await agentTools.org_find_agent.handler({ agentName: 'NonExistentAgent' });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ Not Found\n\nAgent not found',
          },
        ],
      });
    });

    it('should have correct tool definition', () => {
      expect(agentTools.org_find_agent.tool).toEqual({
        name: 'org_find_agent',
        description:
          'Find which queue/pool an agent belongs to. Searches across all pools in the organization. Requires PAT with organization-level Agent Pools (read) permission.',
        inputSchema: {
          type: 'object',
          properties: {
            agentName: {
              type: 'string',
              description:
                'Name of the agent to find. Agent names are case-sensitive. Partial matches not supported.',
            },
          },
          required: ['agentName'],
        },
      });
    });
  });

  describe('org_list_agents', () => {
    it('should list agents successfully with default parameters', async () => {
      const mockAgents = MockFactory.createMockAgents(3);
      const mockResponse = {
        agents: mockAgents.map((agent) => ({
          name: agent.name!,
          status:
            agent.status === TaskAgentInterfaces.TaskAgentStatus.Online ? 'Online' : 'Offline',
          enabled: agent.enabled!,
          version: agent.version!,
          poolName: 'Default Pool',
        })),
        continuationToken: undefined,
        hasMore: false,
      };

      mockTaskAgentClient.getAgents = vi.fn().mockResolvedValue({
        success: true,
        data: mockResponse,
      });

      const result = await agentTools.org_list_agents.handler({});

      expect(mockTaskAgentClient.getAgents).toHaveBeenCalledWith({});

      const expectedSummary = {
        agents: mockResponse.agents.map((a) => ({
          name: a.name,
          pool: a.poolName,
          status: a.status,
          enabled: a.enabled,
          version: a.version,
          capabilities: [],
        })),
        summary: {
          total: 3,
          online: 2, // Agents 0 and 2 are online (i % 2 === 0)
          offline: 1, // Agent 1 is offline (i % 2 === 1)
          pools: ['Default Pool'],
        },
        continuationToken: undefined,
        hasMore: false,
        pageInfo: {
          returned: 3,
          requested: 50,
        },
      };

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(expectedSummary, null, 2),
          },
        ],
      });
    });

    it('should list agents with filtering parameters', async () => {
      const mockAgents = MockFactory.createMockAgents(2);
      const mockResponse = {
        agents: mockAgents.map((agent) => ({
          name: agent.name!,
          status:
            agent.status === TaskAgentInterfaces.TaskAgentStatus.Online ? 'Online' : 'Offline',
          enabled: agent.enabled!,
          version: agent.version!,
          poolName: 'Test Pool',
        })),
        continuationToken: 'next-token',
        hasMore: true,
      };

      mockTaskAgentClient.getAgents = vi.fn().mockResolvedValue({
        success: true,
        data: mockResponse,
      });

      const args = {
        nameFilter: 'Agent-001',
        poolNameFilter: 'Test',
        onlyOnline: true,
        limit: 10,
        continuationToken: 'prev-token',
      };

      const result = await agentTools.org_list_agents.handler(args);

      expect(mockTaskAgentClient.getAgents).toHaveBeenCalledWith(args);

      const expectedSummary = {
        agents: mockResponse.agents.map((a) => ({
          name: a.name,
          pool: a.poolName,
          status: a.status,
          enabled: a.enabled,
          version: a.version,
          capabilities: [],
        })),
        summary: {
          total: 2,
          online: 1, // Agent 0 is online (i % 2 === 0)
          offline: 1, // Agent 1 is offline (i % 2 === 1)
          pools: ['Test Pool'],
        },
        continuationToken: 'next-token',
        hasMore: true,
        pageInfo: {
          returned: 2,
          requested: 10,
        },
      };

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(expectedSummary, null, 2),
          },
        ],
      });
    });

    it('should group agents by pool correctly', async () => {
      const mockAgents = [
        { ...MockFactory.createMockAgent({ name: 'Agent-001' }), poolName: 'Pool A' },
        { ...MockFactory.createMockAgent({ name: 'Agent-002' }), poolName: 'Pool B' },
        { ...MockFactory.createMockAgent({ name: 'Agent-003' }), poolName: 'Pool A' },
      ];

      const mockResponse = {
        agents: mockAgents,
        continuationToken: undefined,
        hasMore: false,
      };

      mockTaskAgentClient.getAgents = vi.fn().mockResolvedValue({
        success: true,
        data: mockResponse,
      });

      const result = await agentTools.org_list_agents.handler({});

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.summary.pools).toEqual(['Pool A', 'Pool B']);
    });

    it('should handle API errors', async () => {
      const mockError = {
        type: 'permission_error',
        message: 'Insufficient permissions',
        details: 'Organization-level Agent Pools (read) permission required',
      };

      mockTaskAgentClient.getAgents = vi.fn().mockResolvedValue({
        success: false,
        error: mockError,
      });

      const result = await agentTools.org_list_agents.handler({});

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ Error\n\n{\n  "type": "permission_error",\n  "message": "Insufficient permissions",\n  "details": "Organization-level Agent Pools (read) permission required"\n}',
          },
        ],
      });
    });

    it('should have correct tool definition', () => {
      expect(agentTools.org_list_agents.tool).toEqual({
        name: 'org_list_agents',
        description:
          'List agents from project pools with optional filtering. Shows agent status, version, and basic info. Requires PAT with organization-level Agent Pools (read) permission to access agent details.',
        inputSchema: {
          type: 'object',
          properties: {
            nameFilter: {
              type: 'string',
              description:
                'Filter agents by name (partial match supported, e.g., "BM40"). Case-insensitive. Matches anywhere in agent name.',
            },
            poolNameFilter: {
              type: 'string',
              description:
                'Filter by pool name (partial match supported). Case-insensitive. Useful when you have multiple pools.',
            },
            onlyOnline: {
              type: 'boolean',
              description:
                'Only show online agents (default: false). Online agents are ready to run builds immediately.',
              default: false,
            },
            limit: {
              type: 'number',
              description: 'Maximum number of agents to return per page (default: 50, max: 200)',
              default: 50,
              maximum: 200,
            },
            continuationToken: {
              type: 'string',
              description: 'Token from previous response to get next page of results',
            },
          },
          required: [],
        },
      });
    });
  });
});
