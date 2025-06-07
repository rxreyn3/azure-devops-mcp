# Azure DevOps MCP Server Test Suite

This directory contains the test suite for the Azure DevOps MCP Server.

## Test Structure

```
tests/
├── unit/                    # Unit tests
│   ├── basic-functionality.test.ts  # Core functionality tests
│   └── config.test.ts              # Configuration validation tests
├── mocks/                   # Mock data and utilities
│   ├── ado-responses.ts    # Mock Azure DevOps API responses
│   └── mock-server.ts      # Mock HTTP server for testing
├── helpers/                 # Test utilities
│   └── test-utils.ts       # Helper functions for tests
└── test-runner.ts          # Test execution script
```

## Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test tests/unit/config.test.ts

# Run tests with coverage
bun test --coverage

# Run tests in watch mode
bun test --watch

# Use the test runner script
./tests/test-runner.ts
```

## Test Categories

### Unit Tests
- **basic-functionality.test.ts**: Tests core functionality without external dependencies
  - Config validation
  - MCP server structure
  - Response formatting
  - Data transformation
  - Error handling

- **config.test.ts**: Tests configuration validation
  - Environment variable parsing
  - Required field validation
  - URL formatting

### Integration Tests (Future)
- End-to-end testing with real Azure DevOps instances
- MCP protocol compliance testing
- Performance benchmarking

## Mock Infrastructure

The `mocks/` directory contains:
- Realistic Azure DevOps API response data
- Mock HTTP server implementation
- Test fixtures for various scenarios

## Testing Philosophy

1. **Fast & Reliable**: Tests run without external dependencies
2. **Comprehensive**: Cover both success and error scenarios
3. **Maintainable**: Clear test structure and naming
4. **Realistic**: Use actual Azure DevOps response formats

## Known Limitations

Due to the azure-devops-node-api library's initialization process, full API mocking requires:
- HTTP request interception (nock)
- Complex authentication flow mocking
- WebApi connection mocking

For now, we focus on testing:
- Configuration and validation
- Data transformation logic
- Error formatting
- MCP protocol compliance

## Future Improvements

1. **Mock Strategy**: Implement dependency injection in AzureDevOpsClient for easier testing
2. **Integration Tests**: Add Docker-based Azure DevOps test environment
3. **E2E Tests**: Test full MCP communication flow
4. **Performance Tests**: Benchmark API response times and throughput