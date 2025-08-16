# Testing Patterns and Conventions

This document outlines the testing patterns, conventions, and best practices used in the Azure DevOps MCP server project. Following these guidelines ensures consistent, maintainable, and reliable tests across the codebase.

## Table of Contents

- [Testing Framework and Setup](#testing-framework-and-setup)
- [Mock Factory Usage Patterns](#mock-factory-usage-patterns)
- [Fixture Data Management](#fixture-data-management)
- [Test Structure and Organization](#test-structure-and-organization)
- [Writing New Tests Guidelines](#writing-new-tests-guidelines)
- [Common Testing Patterns](#common-testing-patterns)
- [Error Testing Strategies](#error-testing-strategies)
- [Integration Testing Patterns](#integration-testing-patterns)

## Testing Framework and Setup

### Vitest Configuration

The project uses Vitest as the primary testing framework with the following key configurations:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  }
});
```

### Global Test Setup

All tests use a global setup file (`tests/setup.ts`) that:
- Configures environment variables for testing
- Sets up global mocks and utilities
- Initializes test cleanup procedures

```typescript
// Example test file structure
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockFactory } from '../helpers/mock-factory.js';

describe('ComponentName', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    MockFactory.resetAllMocks();
  });

  it('should perform expected behavior when given valid input', async () => {
    // Test implementation
  });
});
```

## Mock Factory Usage Patterns

The `MockFactory` class provides consistent mock objects for all Azure DevOps API interactions. Here are the key usage patterns:

### Basic Mock Setup

```typescript
import { MockFactory } from '../helpers/mock-factory.js';

// Create individual API mocks
const mockTaskAgentApi = MockFactory.createTaskAgentApi();
const mockBuildApi = MockFactory.createBuildApi();
const mockWebApi = MockFactory.createWebApi();

// Setup successful responses
const { mockWebApi, mockTaskAgentApi, mockBuildApi } = MockFactory.setupSuccessfulMocks();
```

### Custom Mock Responses

```typescript
// Create custom mock data
const customQueue = MockFactory.createMockQueue({
  id: 123,
  name: 'Custom Queue',
  pool: { id: 456, name: 'Custom Pool', isHosted: true }
});

// Setup specific mock behavior
mockTaskAgentApi.getAgentQueues.mockResolvedValue([customQueue]);
```

### Error Simulation

```typescript
// Simulate specific error types
mockTaskAgentApi.getAgentQueues.mockRejectedValue(
  MockFactory.createPermissionError('Access denied to queue')
);

// Use pre-configured error mocks
const { mockWebApi } = MockFactory.setupErrorMocks();
```

### Mock Cleanup

Always reset mocks between tests to ensure clean state:

```typescript
afterEach(() => {
  MockFactory.resetAllMocks();
});
```

## Fixture Data Management

### Fixture Organization

Fixtures are organized by API domain and response type:

```
fixtures/
├── azure-responses/
│   ├── queues.ts      # Queue-related responses
│   ├── agents.ts      # Agent and pool responses
│   ├── builds.ts      # Build and definition responses
│   ├── pipelines.ts   # Pipeline responses
│   └── errors.ts      # Error responses
├── mcp-messages/      # MCP protocol messages
└── fixture-utils.ts   # Utilities for fixture manipulation
```

### Using Fixtures in Tests

```typescript
import { mockQueueApiResponse, mockAgentApiResponse } from '../fixtures/sample-data.js';
import { createCustomQueue, cloneFixture } from '../fixtures/fixture-utils.js';

// Use pre-defined fixtures
mockApi.getQueues.mockResolvedValue(mockQueueApiResponse);

// Create custom variations
const customQueue = createCustomQueue({ name: 'Test Queue' });

// Clone fixtures to avoid mutation
const modifiedQueues = cloneFixture(mockQueueApiResponse);
modifiedQueues[0].name = 'Modified Name';
```

### Fixture Best Practices

1. **Always clone fixtures** before modifying them in tests
2. **Use specific fixtures** for edge cases (empty, malformed, error)
3. **Combine fixtures with utilities** for variations
4. **Validate fixture structure** when creating custom data

## Test Structure and Organization

### Directory Structure

Tests mirror the source code structure:

```
tests/
├── unit/
│   ├── clients/       # Mirror src/clients/
│   ├── tools/         # Mirror src/tools/
│   ├── utils/         # Mirror src/utils/
│   └── config.test.ts # Mirror src/config.ts
├── integration/       # Cross-component tests
├── fixtures/          # Test data
└── helpers/           # Test utilities
```

### Test File Naming

- Unit tests: `component-name.test.ts`
- Integration tests: `feature-name.integration.test.ts`
- Helper tests: `helper-name.test.ts`

### Test Case Organization

```typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should return expected result when given valid input', () => {
      // Happy path test
    });

    it('should throw error when given invalid input', () => {
      // Error case test
    });

    it('should handle edge case scenario', () => {
      // Edge case test
    });
  });

  describe('anotherMethod', () => {
    // More test cases
  });
});
```

## Writing New Tests Guidelines

### Test Naming Conventions

Use descriptive test names that follow this pattern:
```
should [expected behavior] when [condition]
```

Examples:
- `should return queue list when API call succeeds`
- `should throw permission error when user lacks access`
- `should handle empty response when no queues exist`

### Test Structure Pattern

Follow the Arrange-Act-Assert (AAA) pattern:

```typescript
it('should return formatted queue info when API returns valid data', async () => {
  // Arrange
  const mockQueues = [MockFactory.createMockQueue()];
  mockTaskAgentApi.getAgentQueues.mockResolvedValue(mockQueues);
  const client = new TaskAgentClient(mockWebApi as any, config);

  // Act
  const result = await client.listQueues();

  // Assert
  expect(result.success).toBe(true);
  expect(result.data).toHaveLength(1);
  expect(result.data[0]).toMatchObject({
    id: expect.any(Number),
    name: expect.any(String),
    poolName: expect.any(String)
  });
});
```

### Required Test Categories

For each component, include tests for:

1. **Happy Path**: Normal operation with valid inputs
2. **Error Handling**: Various error conditions and edge cases
3. **Input Validation**: Invalid or malformed inputs
4. **Boundary Conditions**: Edge cases and limits
5. **Integration Points**: Interaction with dependencies

### Mock Strategy

1. **Mock external dependencies** (Azure DevOps APIs, file system)
2. **Use real implementations** for internal utilities when possible
3. **Mock at the appropriate level** (API level for clients, client level for tools)
4. **Verify mock interactions** when behavior matters

## Common Testing Patterns

### Testing Async Operations

```typescript
it('should handle async operation correctly', async () => {
  const mockResponse = MockFactory.createMockBuild();
  mockBuildApi.getBuild.mockResolvedValue(mockResponse);

  const result = await client.getBuild(12345);

  expect(result).toBeDefined();
  expect(mockBuildApi.getBuild).toHaveBeenCalledWith(12345);
});
```

### Testing Error Propagation

```typescript
it('should propagate API errors correctly', async () => {
  const apiError = MockFactory.createPermissionError();
  mockTaskAgentApi.getAgentQueues.mockRejectedValue(apiError);

  await expect(client.listQueues()).rejects.toThrow('Access denied');
});
```

### Testing Pagination

```typescript
it('should handle paginated results correctly', async () => {
  const pagedResponse = MockFactory.createPagedList(
    MockFactory.createMockBuilds(5),
    'continuation-token'
  );
  mockBuildApi.getBuilds.mockResolvedValue(pagedResponse);

  const result = await client.listBuilds({ top: 5 });

  expect(result.data).toHaveLength(5);
  expect(result.continuationToken).toBe('continuation-token');
});
```

### Testing Configuration Validation

```typescript
it('should validate required configuration', () => {
  const invalidConfig = { organization: '', project: '', token: '' };

  expect(() => new Client(invalidConfig)).toThrow('Organization is required');
});
```

## Error Testing Strategies

### Error Categories to Test

1. **Permission Errors** (403): Access denied scenarios
2. **Authentication Errors** (401): Invalid credentials
3. **Not Found Errors** (404): Resource doesn't exist
4. **Network Errors**: Timeouts, connectivity issues
5. **API Errors** (500): Server-side failures
6. **Validation Errors**: Invalid input parameters

### Error Testing Pattern

```typescript
describe('error handling', () => {
  it('should handle permission errors gracefully', async () => {
    mockApi.method.mockRejectedValue(MockFactory.createPermissionError());

    const result = await client.method();

    expect(result.success).toBe(false);
    expect(result.error).toContain('Access denied');
  });

  it('should handle network timeouts', async () => {
    mockApi.method.mockRejectedValue(MockFactory.createTimeoutError());

    const result = await client.method();

    expect(result.success).toBe(false);
    expect(result.error).toContain('timeout');
  });
});
```

## Integration Testing Patterns

### MCP Server Testing

```typescript
describe('MCP Server Integration', () => {
  let server: McpServer;
  let mockTransport: MockTransport;

  beforeEach(() => {
    mockTransport = new MockTransport();
    server = new McpServer(mockTransport, config);
  });

  it('should handle tool execution requests', async () => {
    const request = createToolCallRequest('project_list_queues', {});
    
    const response = await server.handleRequest(request);

    expect(response.result).toBeDefined();
    expect(response.result.content).toContainEqual({
      type: 'text',
      text: expect.stringContaining('Queue')
    });
  });
});
```

### End-to-End Tool Testing

```typescript
describe('Tool End-to-End', () => {
  it('should execute complete tool flow', async () => {
    // Setup mocks for entire flow
    const { mockWebApi } = MockFactory.setupSuccessfulMocks();
    
    // Execute tool
    const result = await executeToolCall('project_list_queues', {}, mockWebApi);

    // Verify complete response
    expect(result.success).toBe(true);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
  });
});
```

### Testing Tool Parameter Validation

```typescript
describe('tool parameter validation', () => {
  it('should validate required parameters', async () => {
    const result = await executeToolCall('build_get_timeline', {});

    expect(result.success).toBe(false);
    expect(result.error).toContain('buildId is required');
  });

  it('should validate parameter types', async () => {
    const result = await executeToolCall('build_get_timeline', {
      buildId: 'invalid'
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('buildId must be a number');
  });
});
```

## Performance Testing Considerations

### Test Execution Speed

- Keep unit tests under 100ms each
- Use mocks to avoid network calls
- Minimize file system operations
- Parallelize independent tests

### Memory Management

- Clean up mocks between tests
- Avoid large fixture datasets in unit tests
- Use streaming for large data tests
- Monitor test process memory usage

### CI/CD Optimization

- Run fast unit tests first
- Parallelize test suites
- Cache dependencies
- Fail fast on critical errors

## Coverage Requirements

### Minimum Coverage Thresholds

- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

### Coverage Best Practices

1. **Focus on critical paths** first
2. **Test error conditions** thoroughly
3. **Cover edge cases** and boundary conditions
4. **Exclude appropriate files** from coverage (types, configs)
5. **Monitor coverage trends** over time

### Coverage Exclusions

Files typically excluded from coverage:
- Type definition files (`*.d.ts`)
- Configuration files
- Entry points with minimal logic
- Test files themselves
- Generated code

## Maintenance and Updates

### When to Update Tests

- **API changes**: Update mocks and fixtures
- **New features**: Add comprehensive test coverage
- **Bug fixes**: Add regression tests
- **Refactoring**: Update test structure as needed

### Test Maintenance Checklist

- [ ] Update mock responses when APIs change
- [ ] Verify fixture data matches current API responses
- [ ] Check coverage thresholds are maintained
- [ ] Update test documentation
- [ ] Review and optimize slow tests
- [ ] Clean up obsolete test files

### Documentation Updates

Keep this document updated when:
- Adding new testing patterns
- Changing test structure or organization
- Updating tools or frameworks
- Discovering new best practices