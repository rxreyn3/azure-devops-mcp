import { TaskAgentQueue } from 'azure-devops-node-api/interfaces/TaskAgentInterfaces.js';
import { QueueInfo } from '../../../src/types/api-types.js';

// Raw Azure DevOps API queue responses
export const mockQueueApiResponse: TaskAgentQueue[] = [
  {
    id: 1,
    name: 'Default',
    pool: {
      id: 1,
      name: 'Default',
      isHosted: false,
      poolType: 1,
      size: 5
    },
    projectId: 'test-project-id'
  },
  {
    id: 2,
    name: 'Azure Pipelines',
    pool: {
      id: 2,
      name: 'Azure Pipelines',
      isHosted: true,
      poolType: 2,
      size: 0
    },
    projectId: 'test-project-id'
  },
  {
    id: 3,
    name: 'Build Agents',
    pool: {
      id: 3,
      name: 'Build Pool',
      isHosted: false,
      poolType: 1,
      size: 3
    },
    projectId: 'test-project-id'
  }
];

// Processed queue info responses
export const mockQueueInfoResponse: QueueInfo[] = [
  {
    id: 1,
    name: 'Default',
    poolId: 1,
    poolName: 'Default',
    isHosted: false
  },
  {
    id: 2,
    name: 'Azure Pipelines',
    poolId: 2,
    poolName: 'Azure Pipelines',
    isHosted: true
  },
  {
    id: 3,
    name: 'Build Agents',
    poolId: 3,
    poolName: 'Build Pool',
    isHosted: false
  }
];

// Edge cases
export const emptyQueueResponse: TaskAgentQueue[] = [];

export const malformedQueueResponse: Partial<TaskAgentQueue>[] = [
  {
    id: 1,
    name: 'Incomplete Queue',
    // Missing pool information
  },
  {
    // Missing id and name
    pool: {
      id: 2,
      name: 'Orphaned Pool',
      isHosted: false
    }
  }
];

// Single queue responses for getQueue tests
export const singleQueueResponse: TaskAgentQueue = mockQueueApiResponse[0];

// Queue not found scenario
export const queueNotFoundResponse: TaskAgentQueue[] = [];