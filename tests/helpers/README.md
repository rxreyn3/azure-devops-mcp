# MCP Test Utilities

This directory contains comprehensive test utilities for testing MCP (Model Context Protocol) server functionality. These utilities provide a complete testing framework for Azure DevOps MCP server components.

## Overview

The MCP test utilities consist of several key components:

- **MCPServerTestFactory**: Factory for creating test MCP server instances
- **MCPMessageFactory**: Utilities for creating MCP protocol messages
- **MCPResponseValidator**: Validators for MCP response formats
- **MCPTestEnvironment**: Environment management for tests
- **MCPAssertions**: Assertion helpers for MCP testing
- **TestMCPServer**: Test wrapper for MCP server instances

## Quick Start

```typescript
import {
  MCPServerTestFactory,
  MCPMessageFactory,
  MCPResponseValidator,
  MCPAssertions
} from './mcp-test-utils.js';

// Create a test server
const server = MCPServerTestFactory.createMockedServer();

// Create MCP messages
const request = MCPMessageFactory.createCallToolRequest('project_health_check');

// Validate responses
const isValid = MCPResponseValidator.validateCallToolResponse(response);

// Use assertions
MCPAssertions.assertToolSuccess(response);
```

## Components

### MCPServerTestFactory

Factory class for creating different types of test MCP servers:

```typescript
// Create a basic test server
const server = MCPServerTestFactory.createTestServer();

// Create a server with mocked clients
const mockedServer = MCPServerTestFactory.createMockedServer();

// Create an integration test server
const integrationServer = MCPServerTestFactory.createIntegrationServer(config);
```

### MCPMessageFactory

Utilities for creating MCP protocol messages:

```typescript
// Create a ListTools request
const listRequest = MCPMessageFactory.createListToolsRequest();

// Create a CallTool request
const callRequest = MCPMessageFactory.createCallToolRequest('tool_name', { param: 'value' });

// Create batch requests
const batchRequests = MCPMessageFactory.createBatchToolCalls([
  { name: 'tool1', args: { param1: 'value1' } },
  { name: 'tool2', args: { param2: 'value2' } }
]);

// Get common tool calls
const commonCalls = MCPMessageFactory.createCommonToolCalls();
```

### MCPResponseValidator

Validators for different MCP response types:

```typescript
// Validate JSON-RPC response format
const isValidRPC = MCPResponseValidator.validateJSONRPCResponse(response);

// Validate ListTools response
const isValidList = MCPResponseValidator.validateListToolsResponse(response);

// Validate CallTool response
const isValidCall = MCPResponseValidator.validateCallToolResponse(response);

// Validate tool response content
const isValidContent = MCPResponseValidator.validateToolResponseContent(response);

// Parse tool response data
const data = MCPResponseValidator.parseToolResponseData(response);

// Validate tool parameters
const isValidParams = MCPResponseValidator.validateToolParameters(tool, params);
```

### MCPTestEnvironment

Environment management for tests:

```typescript
// Manual environment management
const env = new MCPTestEnvironment();
env.setupTestEnvironment({
  ADO_ORGANIZATION: 'https://dev.azure.com/test-org',
  ADO_PROJECT: 'test-project',
  ADO_PAT: 'test-token'
});
// ... run tests ...
env.restore();

// Automatic environment management
await MCPTestEnvironment.withTestEnvironment(
  { ADO_PROJECT: 'temp-project' },
  () => {
    // Test code here
    return testResult;
  }
);
```

### MCPAssertions

Assertion helpers for MCP testing:

```typescript
// Assert valid response formats
MCPAssertions.assertValidListToolsResponse(response);
MCPAssertions.assertValidCallToolResponse(response);
MCPAssertions.assertValidErrorResponse(response);

// Assert tool execution results
MCPAssertions.assertToolSuccess(response);
MCPAssertions.assertToolFailure(response);

// Assert tool existence
MCPAssertions.assertToolExists(tools, 'tool_name');
MCPAssertions.assertAllToolsExist(tools, ['tool1', 'tool2']);
```

### TestMCPServer

Test wrapper for MCP server instances:

```typescript
const server = MCPServerTestFactory.createMockedServer();

// Get available tools
const tools = await server.getTools();

// Execute tool calls (for testing)
const response = await server.executeToolCall(request);

// Clean up resources
await server.cleanup();
```

## Usage Patterns

### Basic Server Testing

```typescript
describe('MCP Server Tests', () => {
  it('should register all expected tools', async () => {
    const server = MCPServerTestFactory.createMockedServer();
    const tools = await server.getTools();
    
    MCPAssertions.assertAllToolsExist(tools, [
      'project_health_check',
      'project_list_queues',
      'build_list'
    ]);
    
    await server.cleanup();
  });
});
```

### Tool Response Testing

```typescript
describe('Tool Response Tests', () => {
  it('should validate tool response format', () => {
    const mockResponse = {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            data: { message: 'Success' }
          })
        }
      ]
    };
    
    expect(MCPResponseValidator.validateToolResponseContent(mockResponse)).toBe(true);
    MCPAssertions.assertToolSuccess(mockResponse);
    
    const data = MCPResponseValidator.parseToolResponseData(mockResponse);
    expect(data.success).toBe(true);
  });
});
```

### Error Scenario Testing

```typescript
describe('Error Handling Tests', () => {
  it('should handle permission errors correctly', () => {
    const errorResponse = {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: {
              type: 'permission',
              message: 'Access denied'
            }
          })
        }
      ]
    };
    
    MCPAssertions.assertToolFailure(errorResponse);
    
    const data = MCPResponseValidator.parseToolResponseData(errorResponse);
    expect(data.error.type).toBe('permission');
  });
});
```

### Integration Testing

```typescript
describe('Integration Tests', () => {
  it('should test complete workflow', async () => {
    await MCPTestEnvironment.withTestEnvironment(
      { ADO_PROJECT: 'integration-test' },
      async () => {
        const server = MCPServerTestFactory.createMockedServer();
        
        // Test tool registration
        const tools = await server.getTools();
        MCPAssertions.assertToolExists(tools, 'project_health_check');
        
        // Test message creation
        const request = MCPMessageFactory.createCallToolRequest('project_health_check');
        expect(request.params.name).toBe('project_health_check');
        
        await server.cleanup();
      }
    );
  });
});
```

## Best Practices

1. **Always clean up**: Use `server.cleanup()` or `env.restore()` to clean up resources
2. **Use environment helpers**: Prefer `MCPTestEnvironment.withTestEnvironment()` for automatic cleanup
3. **Validate responses**: Always validate MCP response formats using the validators
4. **Use assertions**: Use the assertion helpers for clear test failures
5. **Mock external dependencies**: Use mocked servers for unit tests, integration servers for integration tests
6. **Test error scenarios**: Include tests for error conditions and edge cases

## Integration with MockFactory

These utilities work seamlessly with the MockFactory for creating realistic test data:

```typescript
import { MockFactory } from './mock-factory.js';

// Create mock data
const mockQueues = MockFactory.createMockQueues(3);

// Create mock tool response
const mockResponse = {
  content: [
    {
      type: 'text',
      text: JSON.stringify({
        success: true,
        data: mockQueues
      })
    }
  ]
};

// Validate and assert
MCPAssertions.assertToolSuccess(mockResponse);
```

## Files

- `mcp-test-utils.ts` - Main utilities implementation
- `mcp-test-utils.test.ts` - Unit tests for the utilities
- `mcp-test-utils-usage-example.test.ts` - Comprehensive usage examples
- `README.md` - This documentation file

## Requirements Covered

This implementation addresses the following requirements from the spec:

- **3.1**: MCP server initialization and protocol handling testing
- **3.2**: MCP protocol message creation and validation
- **3.4**: MCP response format validation and compliance testing

The utilities provide a complete testing framework for MCP server functionality, enabling comprehensive unit and integration testing of Azure DevOps MCP server components.