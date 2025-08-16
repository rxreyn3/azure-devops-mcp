import * as BuildInterfaces from 'azure-devops-node-api/interfaces/BuildInterfaces.js';
import { PagedList } from 'azure-devops-node-api/interfaces/common/VSSInterfaces.js';

// Build definition responses
export const mockBuildDefinitionsResponse: BuildInterfaces.BuildDefinitionReference[] = [
  {
    id: 1,
    name: 'CI Build',
    path: '\\',
    type: BuildInterfaces.DefinitionType.Build,
    queueStatus: BuildInterfaces.DefinitionQueueStatus.Enabled,
    revision: 5,
    createdDate: new Date('2023-01-01T10:00:00Z'),
    project: {
      id: 'test-project-id',
      name: 'Test Project'
    }
  },
  {
    id: 2,
    name: 'Release Build',
    path: '\\Production',
    type: BuildInterfaces.DefinitionType.Build,
    queueStatus: BuildInterfaces.DefinitionQueueStatus.Enabled,
    revision: 3,
    createdDate: new Date('2023-01-02T10:00:00Z'),
    project: {
      id: 'test-project-id',
      name: 'Test Project'
    }
  },
  {
    id: 3,
    name: 'Test Pipeline',
    path: '\\Testing',
    type: BuildInterfaces.DefinitionType.Build,
    queueStatus: BuildInterfaces.DefinitionQueueStatus.Enabled,
    revision: 1,
    createdDate: new Date('2023-01-03T10:00:00Z'),
    project: {
      id: 'test-project-id',
      name: 'Test Project'
    }
  }
];

// Build responses
export const mockBuildsResponse: BuildInterfaces.Build[] = [
  {
    id: 101,
    buildNumber: '20240101.1',
    status: BuildInterfaces.BuildStatus.Completed,
    result: BuildInterfaces.BuildResult.Succeeded,
    queueTime: new Date('2024-01-01T10:00:00Z'),
    startTime: new Date('2024-01-01T10:01:00Z'),
    finishTime: new Date('2024-01-01T10:15:00Z'),
    definition: {
      id: 1,
      name: 'CI Build'
    },
    project: {
      id: 'test-project-id',
      name: 'Test Project'
    },
    sourceBranch: 'refs/heads/main',
    sourceVersion: 'abc123def456',
    requestedFor: {
      displayName: 'John Doe',
      uniqueName: 'john.doe@example.com'
    },
    queue: {
      id: 1,
      name: 'Default'
    }
  },
  {
    id: 102,
    buildNumber: '20240101.2',
    status: BuildInterfaces.BuildStatus.InProgress,
    queueTime: new Date('2024-01-01T11:00:00Z'),
    startTime: new Date('2024-01-01T11:01:00Z'),
    definition: {
      id: 1,
      name: 'CI Build'
    },
    project: {
      id: 'test-project-id',
      name: 'Test Project'
    },
    sourceBranch: 'refs/heads/feature/new-feature',
    sourceVersion: 'def456ghi789',
    requestedFor: {
      displayName: 'Jane Smith',
      uniqueName: 'jane.smith@example.com'
    },
    queue: {
      id: 1,
      name: 'Default'
    }
  },
  {
    id: 103,
    buildNumber: '20240101.3',
    status: BuildInterfaces.BuildStatus.Completed,
    result: BuildInterfaces.BuildResult.Failed,
    queueTime: new Date('2024-01-01T12:00:00Z'),
    startTime: new Date('2024-01-01T12:01:00Z'),
    finishTime: new Date('2024-01-01T12:10:00Z'),
    definition: {
      id: 2,
      name: 'Release Build'
    },
    project: {
      id: 'test-project-id',
      name: 'Test Project'
    },
    sourceBranch: 'refs/heads/main',
    sourceVersion: 'ghi789jkl012',
    requestedFor: {
      displayName: 'Bob Wilson',
      uniqueName: 'bob.wilson@example.com'
    },
    queue: {
      id: 2,
      name: 'Azure Pipelines'
    }
  }
];

// Timeline responses
export const mockTimelineResponse: BuildInterfaces.Timeline = {
  id: 'timeline-1',
  changeId: 1,
  lastChangedBy: 'system',
  lastChangedOn: new Date('2024-01-01T10:15:00Z'),
  records: [
    {
      id: 'stage-1',
      parentId: undefined,
      type: 'Stage',
      name: 'Build',
      startTime: new Date('2024-01-01T10:01:00Z'),
      finishTime: new Date('2024-01-01T10:15:00Z'),
      state: BuildInterfaces.TimelineRecordState.Completed,
      result: BuildInterfaces.TaskResult.Succeeded,
      changeId: 1,
      lastModified: new Date('2024-01-01T10:15:00Z')
    },
    {
      id: 'job-1',
      parentId: 'stage-1',
      type: 'Job',
      name: 'Build Job',
      startTime: new Date('2024-01-01T10:01:30Z'),
      finishTime: new Date('2024-01-01T10:14:30Z'),
      state: BuildInterfaces.TimelineRecordState.Completed,
      result: BuildInterfaces.TaskResult.Succeeded,
      changeId: 1,
      lastModified: new Date('2024-01-01T10:14:30Z'),
      log: {
        id: 1,
        type: 'Container',
        url: 'https://dev.azure.com/test/logs/1'
      }
    },
    {
      id: 'task-1',
      parentId: 'job-1',
      type: 'Task',
      name: 'Checkout',
      startTime: new Date('2024-01-01T10:01:30Z'),
      finishTime: new Date('2024-01-01T10:02:00Z'),
      state: BuildInterfaces.TimelineRecordState.Completed,
      result: BuildInterfaces.TaskResult.Succeeded,
      changeId: 1,
      lastModified: new Date('2024-01-01T10:02:00Z'),
      log: {
        id: 2,
        type: 'Container',
        url: 'https://dev.azure.com/test/logs/2'
      }
    },
    {
      id: 'task-2',
      parentId: 'job-1',
      type: 'Task',
      name: 'Build Solution',
      startTime: new Date('2024-01-01T10:02:00Z'),
      finishTime: new Date('2024-01-01T10:14:00Z'),
      state: BuildInterfaces.TimelineRecordState.Completed,
      result: BuildInterfaces.TaskResult.Succeeded,
      changeId: 1,
      lastModified: new Date('2024-01-01T10:14:00Z'),
      log: {
        id: 3,
        type: 'Container',
        url: 'https://dev.azure.com/test/logs/3'
      }
    }
  ]
};

// Build artifacts
export const mockBuildArtifactsResponse: BuildInterfaces.BuildArtifact[] = [
  {
    id: 1,
    name: 'drop',
    resource: {
      type: 'PipelineArtifact',
      data: JSON.stringify({
        artifactId: 'artifact-123',
        containerId: 'container-456'
      }),
      properties: {},
      url: 'https://dev.azure.com/test/artifacts/1',
      downloadUrl: 'https://dev.azure.com/test/artifacts/1/download'
    }
  },
  {
    id: 2,
    name: 'test-results',
    resource: {
      type: 'PipelineArtifact',
      data: JSON.stringify({
        artifactId: 'artifact-789',
        containerId: 'container-012'
      }),
      properties: {},
      url: 'https://dev.azure.com/test/artifacts/2',
      downloadUrl: 'https://dev.azure.com/test/artifacts/2/download'
    }
  }
];

// Paged build responses
export const mockPagedBuildsResponse: PagedList<BuildInterfaces.Build> = Object.assign(
  mockBuildsResponse.slice(0, 2),
  { continuationToken: 'next-page-token' }
);

// Edge cases
export const emptyBuildsResponse: BuildInterfaces.Build[] = [];

export const emptyDefinitionsResponse: BuildInterfaces.BuildDefinitionReference[] = [];

export const malformedBuildResponse: Partial<BuildInterfaces.Build>[] = [
  {
    id: 999,
    // Missing buildNumber and other required fields
    status: BuildInterfaces.BuildStatus.Completed
  }
];

// In-progress build without finish time
export const inProgressBuild: BuildInterfaces.Build = {
  id: 104,
  buildNumber: '20240101.4',
  status: BuildInterfaces.BuildStatus.InProgress,
  queueTime: new Date('2024-01-01T13:00:00Z'),
  startTime: new Date('2024-01-01T13:01:00Z'),
  definition: {
    id: 1,
    name: 'CI Build'
  },
  project: {
    id: 'test-project-id',
    name: 'Test Project'
  },
  sourceBranch: 'refs/heads/main',
  sourceVersion: 'jkl012mno345',
  requestedFor: {
    displayName: 'Alice Johnson',
    uniqueName: 'alice.johnson@example.com'
  }
};

// Timeline with incomplete job (no logs available)
export const incompleteTimelineResponse: BuildInterfaces.Timeline = {
  id: 'timeline-2',
  changeId: 1,
  lastChangedBy: 'system',
  lastChangedOn: new Date('2024-01-01T13:05:00Z'),
  records: [
    {
      id: 'job-2',
      parentId: undefined,
      type: 'Job',
      name: 'Incomplete Job',
      startTime: new Date('2024-01-01T13:01:00Z'),
      state: BuildInterfaces.TimelineRecordState.InProgress,
      changeId: 1,
      lastModified: new Date('2024-01-01T13:05:00Z')
      // No log property - logs not available yet
    }
  ]
};

// Large dataset for pagination testing
export const largeBuildDataset: BuildInterfaces.Build[] = Array.from({ length: 100 }, (_, index) => ({
  id: 1000 + index,
  buildNumber: `20240101.${index + 1}`,
  status: index % 3 === 0 ? BuildInterfaces.BuildStatus.Completed : BuildInterfaces.BuildStatus.InProgress,
  result: index % 3 === 0 ? 
    (index % 6 === 0 ? BuildInterfaces.BuildResult.Succeeded : BuildInterfaces.BuildResult.Failed) : 
    undefined,
  queueTime: new Date(2024, 0, 1, 10 + Math.floor(index / 10), index % 60),
  startTime: new Date(2024, 0, 1, 10 + Math.floor(index / 10), (index % 60) + 1),
  finishTime: index % 3 === 0 ? new Date(2024, 0, 1, 10 + Math.floor(index / 10), (index % 60) + 15) : undefined,
  definition: {
    id: (index % 3) + 1,
    name: ['CI Build', 'Release Build', 'Test Pipeline'][index % 3]
  },
  project: {
    id: 'test-project-id',
    name: 'Test Project'
  },
  sourceBranch: index % 2 === 0 ? 'refs/heads/main' : `refs/heads/feature/feature-${index}`,
  sourceVersion: `commit-${index.toString().padStart(3, '0')}`,
  requestedFor: {
    displayName: `User ${index}`,
    uniqueName: `user${index}@example.com`
  }
}));