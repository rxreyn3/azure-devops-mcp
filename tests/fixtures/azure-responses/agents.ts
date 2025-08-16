import { TaskAgent, TaskAgentStatus, TaskAgentPool } from 'azure-devops-node-api/interfaces/TaskAgentInterfaces.js';
import { AgentInfo, ProjectAgentInfo, PagedAgentsResult } from '../../../src/types/api-types.js';

// Raw Azure DevOps API agent responses
export const mockAgentApiResponse: TaskAgent[] = [
  {
    id: 1,
    name: 'Agent-001',
    status: TaskAgentStatus.Online,
    enabled: true,
    version: '3.220.2',
    oSDescription: 'Windows_NT',
    createdOn: new Date('2023-01-15T10:00:00Z'),
    maxParallelism: 1
  },
  {
    id: 2,
    name: 'Agent-002',
    status: TaskAgentStatus.Offline,
    enabled: true,
    version: '3.220.2',
    oSDescription: 'Linux',
    createdOn: new Date('2023-01-16T10:00:00Z'),
    maxParallelism: 2
  },
  {
    id: 3,
    name: 'Build-Agent-01',
    status: TaskAgentStatus.Online,
    enabled: false,
    version: '3.219.0',
    oSDescription: 'macOS',
    createdOn: new Date('2023-01-10T10:00:00Z'),
    maxParallelism: 1
  }
];

// Processed agent info responses
export const mockAgentInfoResponse: AgentInfo[] = [
  {
    id: 1,
    name: 'Agent-001',
    status: 'Online',
    enabled: true,
    version: '3.220.2',
    osDescription: 'Windows_NT'
  },
  {
    id: 2,
    name: 'Agent-002',
    status: 'Offline',
    enabled: true,
    version: '3.220.2',
    osDescription: 'Linux'
  },
  {
    id: 3,
    name: 'Build-Agent-01',
    status: 'Online',
    enabled: false,
    version: '3.219.0',
    osDescription: 'macOS'
  }
];

// Project agent info with queue details
export const mockProjectAgentInfoResponse: ProjectAgentInfo[] = [
  {
    id: 1,
    name: 'Agent-001',
    status: 'Online',
    enabled: true,
    version: '3.220.2',
    osDescription: 'Windows_NT',
    poolName: 'Default',
    queueId: 1,
    queueName: 'Default'
  },
  {
    id: 2,
    name: 'Agent-002',
    status: 'Offline',
    enabled: true,
    version: '3.220.2',
    osDescription: 'Linux',
    poolName: 'Default',
    queueId: 1,
    queueName: 'Default'
  },
  {
    id: 3,
    name: 'Build-Agent-01',
    status: 'Online',
    enabled: false,
    version: '3.219.0',
    osDescription: 'macOS',
    poolName: 'Build Pool',
    queueId: 3,
    queueName: 'Build Agents'
  }
];

// Paged agents result
export const mockPagedAgentsResult: PagedAgentsResult = {
  agents: mockProjectAgentInfoResponse,
  continuationToken: undefined,
  hasMore: false
};

// Agent pools for findAgent functionality
export const mockAgentPoolsResponse: TaskAgentPool[] = [
  {
    id: 1,
    name: 'Default',
    isHosted: false,
    poolType: 1,
    size: 2
  },
  {
    id: 2,
    name: 'Azure Pipelines',
    isHosted: true,
    poolType: 2,
    size: 0
  },
  {
    id: 3,
    name: 'Build Pool',
    isHosted: false,
    poolType: 1,
    size: 1
  }
];

// Edge cases
export const emptyAgentResponse: TaskAgent[] = [];

export const malformedAgentResponse: Partial<TaskAgent>[] = [
  {
    id: 1,
    // Missing name
    status: TaskAgentStatus.Online,
    enabled: true
  },
  {
    // Missing id
    name: 'Incomplete Agent',
    status: TaskAgentStatus.Offline
  }
];

// Single agent for specific tests
export const singleAgentResponse: TaskAgent = mockAgentApiResponse[0];

// Filtered responses for testing search functionality
export const onlineAgentsOnly: TaskAgent[] = mockAgentApiResponse.filter(
  agent => agent.status === TaskAgentStatus.Online
);

export const agentsWithNameFilter: TaskAgent[] = mockAgentApiResponse.filter(
  agent => agent.name?.toLowerCase().includes('build')
);

// Large dataset for pagination testing
export const largeAgentDataset: TaskAgent[] = Array.from({ length: 300 }, (_, index) => ({
  id: index + 1,
  name: `Agent-${String(index + 1).padStart(3, '0')}`,
  status: index % 3 === 0 ? TaskAgentStatus.Online : TaskAgentStatus.Offline,
  enabled: index % 5 !== 0,
  version: index % 2 === 0 ? '3.220.2' : '3.219.0',
  oSDescription: ['Windows_NT', 'Linux', 'macOS'][index % 3],
  createdOn: new Date(2023, 0, 1 + (index % 30)),
  maxParallelism: (index % 3) + 1
}));