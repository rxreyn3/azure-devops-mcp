// Main fixture data exports for easy access in tests

// Azure DevOps API response fixtures
export * from './azure-responses/index.js';

// MCP protocol message fixtures
export * from './mcp-messages/index.js';

// Fixture utilities
export * from './fixture-utils.js';

// Common test data scenarios
export const testScenarios = {
  // Queue scenarios
  queues: {
    empty: 'emptyQueueResponse',
    single: 'singleQueueResponse',
    multiple: 'mockQueueApiResponse',
    malformed: 'malformedQueueResponse'
  },
  
  // Agent scenarios
  agents: {
    empty: 'emptyAgentResponse',
    single: 'singleAgentResponse',
    multiple: 'mockAgentApiResponse',
    onlineOnly: 'onlineAgentsOnly',
    filtered: 'agentsWithNameFilter',
    large: 'largeAgentDataset'
  },
  
  // Build scenarios
  builds: {
    empty: 'emptyBuildsResponse',
    single: 'mockBuildsResponse[0]',
    multiple: 'mockBuildsResponse',
    inProgress: 'inProgressBuild',
    large: 'largeBuildDataset'
  },
  
  // Pipeline scenarios
  pipelines: {
    empty: 'emptyPipelineRunsResponse',
    single: 'mockPipelineRunResponse',
    multiple: 'mockPipelineRunsResponse',
    inProgress: 'inProgressPipelineRun',
    failed: 'failedPipelineRun',
    withParameters: 'pipelineRunWithParameters'
  },
  
  // Error scenarios
  errors: {
    permission: 'permissionDeniedError',
    notFound: 'queueNotFoundError',
    timeout: 'timeoutError',
    network: 'networkError',
    server: 'internalServerError'
  }
} as const;