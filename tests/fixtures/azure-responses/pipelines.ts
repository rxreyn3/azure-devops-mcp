import * as PipelinesInterfaces from 'azure-devops-node-api/interfaces/PipelinesInterfaces.js';
import { PipelineRunResult } from '../../../src/types/api-types.js';

// Pipeline run responses
export const mockPipelineRunResponse: PipelinesInterfaces.Run = {
  id: 201,
  name: 'CI Pipeline Run',
  state: PipelinesInterfaces.RunState.Completed,
  result: PipelinesInterfaces.RunResult.Succeeded,
  createdDate: new Date('2024-01-01T14:00:00Z'),
  finishedDate: new Date('2024-01-01T14:15:00Z'),
  pipeline: {
    id: 10,
    name: 'CI Pipeline',
    folder: '\\',
    revision: 5
  },
  resources: {
    repositories: {
      self: {
        refName: 'refs/heads/main',
        version: 'abc123def456'
      }
    }
  },
  variables: {},
  url: 'https://dev.azure.com/test/pipelines/runs/201'
};

// Multiple pipeline runs
export const mockPipelineRunsResponse: PipelinesInterfaces.Run[] = [
  {
    id: 201,
    name: 'CI Pipeline Run',
    state: PipelinesInterfaces.RunState.Completed,
    result: PipelinesInterfaces.RunResult.Succeeded,
    createdDate: new Date('2024-01-01T14:00:00Z'),
    finishedDate: new Date('2024-01-01T14:15:00Z'),
    pipeline: {
      id: 10,
      name: 'CI Pipeline'
    },
    url: 'https://dev.azure.com/test/pipelines/runs/201'
  },
  {
    id: 202,
    name: 'CI Pipeline Run',
    state: PipelinesInterfaces.RunState.InProgress,
    createdDate: new Date('2024-01-01T15:00:00Z'),
    pipeline: {
      id: 10,
      name: 'CI Pipeline'
    },
    url: 'https://dev.azure.com/test/pipelines/runs/202'
  },
  {
    id: 203,
    name: 'Release Pipeline Run',
    state: PipelinesInterfaces.RunState.Completed,
    result: PipelinesInterfaces.RunResult.Failed,
    createdDate: new Date('2024-01-01T16:00:00Z'),
    finishedDate: new Date('2024-01-01T16:05:00Z'),
    pipeline: {
      id: 11,
      name: 'Release Pipeline'
    },
    url: 'https://dev.azure.com/test/pipelines/runs/203'
  }
];

// Pipeline run result (processed response)
export const mockPipelineRunResult: PipelineRunResult = {
  id: 201,
  pipelineId: 10,
  pipelineName: 'CI Pipeline',
  state: 'completed',
  result: 'succeeded',
  createdDate: new Date('2024-01-01T14:00:00Z'),
  finishedDate: new Date('2024-01-01T14:15:00Z'),
  url: 'https://dev.azure.com/test/pipelines/runs/201',
  name: 'CI Pipeline Run',
  templateParameters: {
    buildConfiguration: 'Release',
    runTests: 'true'
  }
};

// Pipeline artifacts
export const mockPipelineArtifactResponse: PipelinesInterfaces.Artifact = {
  name: 'build-output',
  signedContent: {
    url: 'https://dev.azure.com/test/artifacts/signed-download-url',
    signatureExpires: new Date('2024-01-02T14:00:00Z')
  }
};

// Edge cases
export const emptyPipelineRunsResponse: PipelinesInterfaces.Run[] = [];

export const malformedPipelineRunResponse: Partial<PipelinesInterfaces.Run> = {
  id: 999,
  // Missing required fields like state, createdDate, pipeline
  name: 'Incomplete Run'
};

// In-progress pipeline run
export const inProgressPipelineRun: PipelinesInterfaces.Run = {
  id: 204,
  name: 'Long Running Pipeline',
  state: PipelinesInterfaces.RunState.InProgress,
  createdDate: new Date('2024-01-01T17:00:00Z'),
  pipeline: {
    id: 12,
    name: 'Long Running Pipeline'
  },
  url: 'https://dev.azure.com/test/pipelines/runs/204'
};

// Failed pipeline run
export const failedPipelineRun: PipelinesInterfaces.Run = {
  id: 205,
  name: 'Failed Pipeline Run',
  state: PipelinesInterfaces.RunState.Completed,
  result: PipelinesInterfaces.RunResult.Failed,
  createdDate: new Date('2024-01-01T18:00:00Z'),
  finishedDate: new Date('2024-01-01T18:02:00Z'),
  pipeline: {
    id: 13,
    name: 'Unstable Pipeline'
  },
  url: 'https://dev.azure.com/test/pipelines/runs/205'
};

// Pipeline run with template parameters
export const pipelineRunWithParameters: PipelinesInterfaces.Run = {
  id: 206,
  name: 'Parameterized Pipeline Run',
  state: PipelinesInterfaces.RunState.Completed,
  result: PipelinesInterfaces.RunResult.Succeeded,
  createdDate: new Date('2024-01-01T19:00:00Z'),
  finishedDate: new Date('2024-01-01T19:10:00Z'),
  pipeline: {
    id: 14,
    name: 'Parameterized Pipeline'
  },
  templateParameters: {
    environment: 'production',
    deploymentSlot: 'blue',
    skipTests: false,
    buildNumber: '1.2.3'
  },
  url: 'https://dev.azure.com/test/pipelines/runs/206'
};

// Pipeline run with stages to skip
export const pipelineRunWithSkippedStages: PipelinesInterfaces.Run = {
  id: 207,
  name: 'Partial Pipeline Run',
  state: PipelinesInterfaces.RunState.Completed,
  result: PipelinesInterfaces.RunResult.Succeeded,
  createdDate: new Date('2024-01-01T20:00:00Z'),
  finishedDate: new Date('2024-01-01T20:05:00Z'),
  pipeline: {
    id: 15,
    name: 'Multi-Stage Pipeline'
  },
  url: 'https://dev.azure.com/test/pipelines/runs/207'
};

// Large dataset for testing
export const largePipelineRunDataset: PipelinesInterfaces.Run[] = Array.from({ length: 50 }, (_, index) => ({
  id: 2000 + index,
  name: `Pipeline Run ${index + 1}`,
  state: index % 4 === 0 ? PipelinesInterfaces.RunState.InProgress : PipelinesInterfaces.RunState.Completed,
  result: index % 4 === 0 ? undefined : 
    (index % 8 === 0 ? PipelinesInterfaces.RunResult.Failed : PipelinesInterfaces.RunResult.Succeeded),
  createdDate: new Date(2024, 0, 1, 10 + Math.floor(index / 10), index % 60),
  finishedDate: index % 4 === 0 ? undefined : 
    new Date(2024, 0, 1, 10 + Math.floor(index / 10), (index % 60) + 10),
  pipeline: {
    id: (index % 5) + 10,
    name: `Pipeline ${(index % 5) + 1}`
  },
  url: `https://dev.azure.com/test/pipelines/runs/${2000 + index}`
}));