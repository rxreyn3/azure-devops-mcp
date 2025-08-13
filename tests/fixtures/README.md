# Test Fixtures

This directory contains comprehensive test fixtures for the Azure DevOps MCP server project. The fixtures provide realistic mock data for testing all aspects of the application without requiring actual Azure DevOps API calls.

## Structure

```
fixtures/
├── azure-responses/          # Azure DevOps API response fixtures
│   ├── queues.ts            # Agent queue responses
│   ├── agents.ts            # Agent and pool responses  
│   ├── builds.ts            # Build and definition responses
│   ├── pipelines.ts         # Pipeline run responses
│   ├── errors.ts            # Error response fixtures
│   └── index.ts             # Exports all Azure fixtures
├── mcp-messages/            # MCP protocol message fixtures
│   └── index.ts             # MCP request/response messages
├── fixture-utils.ts         # Utilities for customizing fixtures
├── sample-data.ts           # Main exports and test scenarios
└── README.md               # This file
```

## Usage

### Basic Usage

Import fixtures directly in your tests:

```typescript
import { 
  mockQueueApiResponse, 
  mockAgentApiResponse,
  mockBuildsResponse 
} from '../fixtures/sample-data.js';

// Use in tests
mockTaskAgentApi.getAgentQueues.mockResolvedValue(mockQueueApiResponse);
```

### Using Fixture Utilities

Create customized fixtures for specific test scenarios:

```typescript
import { createCustomQueue, createCustomAgent } from '../fixtures/fixture-utils.js';

// Create a custom queue for testing
const customQueue = createCustomQueue({
  id: 123,
  name: 'Test Queue',
  pool: { id: 456, name: 'Test Pool', isHosted: true }
});

// Create a custom agent
const offlineAgent = createCustomAgent({
  id: 789,
  name: 'Offline Agent',
  status: 2 // Offline
});
```

### Pagination Testing

Use pagination utilities for testing large datasets:

```typescript
import { createPagedResponse, largeAgentDataset } from '../fixtures/fixture-utils.js';

// Create a paged response
const pagedAgents = createPagedResponse(largeAgentDataset, 10, 0); // Page size 10, page 0
mockTaskAgentApi.getAgents.mockResolvedValue(pagedAgents);
```

### Error Testing

Test error scenarios with error fixtures:

```typescript
import { createMockError, permissionDeniedError } from '../fixtures/azure-responses/errors.js';

// Simulate permission error
mockTaskAgentApi.getAgentQueues.mockRejectedValue(
  createMockError(permissionDeniedError)
);
```

## Fixture Categories

### Queue Fixtures (`azure-responses/queues.ts`)

- `mockQueueApiResponse` - Array of typical queue responses
- `mockQueueInfoResponse` - Processed queue info objects
- `emptyQueueResponse` - Empty queue list
- `malformedQueueResponse` - Invalid/incomplete queue data
- `singleQueueResponse` - Single queue for specific tests

### Agent Fixtures (`azure-responses/agents.ts`)

- `mockAgentApiResponse` - Array of agent responses with different statuses
- `mockAgentInfoResponse` - Processed agent info objects
- `mockProjectAgentInfoResponse` - Agents with queue/pool context
- `mockPagedAgentsResult` - Paginated agent results
- `largeAgentDataset` - 300 agents for pagination testing
- `onlineAgentsOnly` - Filtered online agents
- `agentsWithNameFilter` - Agents matching name filter

### Build Fixtures (`azure-responses/builds.ts`)

- `mockBuildsResponse` - Array of builds with different statuses
- `mockBuildDefinitionsResponse` - Build definition references
- `mockTimelineResponse` - Build timeline with jobs and tasks
- `mockBuildArtifactsResponse` - Build artifacts
- `largeBuildDataset` - 100 builds for pagination testing
- `inProgressBuild` - Build currently running
- `incompleteTimelineResponse` - Timeline without logs

### Pipeline Fixtures (`azure-responses/pipelines.ts`)

- `mockPipelineRunResponse` - Completed pipeline run
- `mockPipelineRunsResponse` - Array of pipeline runs
- `mockPipelineRunResult` - Processed pipeline result
- `inProgressPipelineRun` - Currently running pipeline
- `failedPipelineRun` - Failed pipeline run
- `pipelineRunWithParameters` - Run with template parameters

### Error Fixtures (`azure-responses/errors.ts`)

- `permissionDeniedError` - 403 permission errors
- `unauthorizedError` - 401 authentication errors
- `queueNotFoundError` - 404 not found errors
- `timeoutError` - Request timeout errors
- `networkError` - Network connectivity errors
- `internalServerError` - 500 server errors
- `rateLimitError` - 429 rate limiting errors

### MCP Message Fixtures (`mcp-messages/index.ts`)

- `listToolsRequest/Response` - Tool discovery messages
- `callToolRequest` - Tool execution requests
- `successfulCallToolResponse` - Successful tool responses
- `errorCallToolResponse` - Error tool responses
- `batchToolCalls` - Multiple tool calls for testing

## Best Practices

### 1. Clone Fixtures to Avoid Mutation

Always clone fixtures before modifying them in tests:

```typescript
import { cloneFixture, mockQueueApiResponse } from '../fixtures/fixture-utils.js';

const modifiedQueues = cloneFixture(mockQueueApiResponse);
modifiedQueues[0].name = 'Modified Queue';
```

### 2. Use Specific Fixtures for Edge Cases

Choose the most appropriate fixture for your test scenario:

```typescript
// For testing empty results
mockApi.getQueues.mockResolvedValue(emptyQueueResponse);

// For testing malformed data handling
mockApi.getQueues.mockResolvedValue(malformedQueueResponse);

// For testing pagination
mockApi.getAgents.mockResolvedValue(largeAgentDataset);
```

### 3. Combine Fixtures with Utilities

Use fixture utilities to create variations:

```typescript
import { filterAgentsByStatus, mockAgentApiResponse } from '../fixtures/fixture-utils.js';

// Test with only online agents
const onlineAgents = filterAgentsByStatus(mockAgentApiResponse, true);
mockApi.getAgents.mockResolvedValue(onlineAgents);
```

### 4. Validate Fixture Structure

Use validation utilities to ensure fixture integrity:

```typescript
import { validateQueueFixture } from '../fixtures/fixture-utils.js';

// Validate custom fixtures
const customQueue = createCustomQueue({ id: 123 });
expect(validateQueueFixture(customQueue)).toBe(true);
```

## Adding New Fixtures

When adding new fixtures:

1. **Follow naming conventions**: Use descriptive names with consistent prefixes (`mock`, `empty`, `malformed`, etc.)

2. **Include edge cases**: Always provide fixtures for empty results, malformed data, and error conditions

3. **Add utilities**: Create helper functions for common customizations

4. **Document usage**: Add examples to this README

5. **Validate structure**: Ensure fixtures match actual API response structures

6. **Export properly**: Add exports to the appropriate index files

## Testing Scenarios

The fixtures support testing these common scenarios:

- **Happy path**: Normal API responses with valid data
- **Empty results**: APIs returning empty arrays/objects
- **Malformed data**: Invalid or incomplete API responses
- **Error conditions**: Various HTTP error codes and network issues
- **Pagination**: Large datasets requiring pagination
- **Filtering**: Search and filter operations
- **Edge cases**: Boundary conditions and unusual data

## Maintenance

When Azure DevOps APIs change:

1. Update the corresponding fixture files
2. Run tests to identify breaking changes
3. Update fixture utilities if needed
4. Document any new patterns or edge cases
5. Consider backward compatibility for existing tests