# Testing Guide

This comprehensive guide covers all aspects of testing in the Azure DevOps MCP server project. It serves as the main entry point for understanding our testing strategy, tools, and procedures.

## Quick Start

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test categories
npm run test:unit
npm run test:integration
```

### Development Workflow

```bash
# Start development with automatic test running
npm run test:watch

# Check test health before committing
npm run test:maintenance

# View coverage trends
npm run test:coverage:trend
```

## Documentation Structure

Our testing documentation is organized into several focused documents:

### 📋 [Testing Patterns and Conventions](./testing-patterns-and-conventions.md)
- Mock factory usage patterns
- Fixture data management
- Test structure and organization
- Writing new tests guidelines
- Common testing patterns
- Error testing strategies
- Integration testing patterns

### 🔧 [Test Maintenance Procedures](./test-maintenance-procedures.md)
- Mock data update procedures
- Coverage threshold management
- Test performance optimization
- Fixture management
- CI/CD integration maintenance
- Test environment management
- Troubleshooting common issues

## Testing Architecture Overview

### Framework and Tools

- **Testing Framework**: Vitest 3.2.4
- **Coverage Provider**: V8 (via @vitest/coverage-v8)
- **Mock Strategy**: Comprehensive mock factory pattern
- **Fixture Management**: Organized realistic test data
- **CI Integration**: GitHub Actions with coverage reporting

### Test Categories

#### Unit Tests (`tests/unit/`)
- **Client Tests**: Azure DevOps API client functionality
- **Tool Tests**: MCP tool implementations
- **Utility Tests**: Helper functions and utilities
- **Configuration Tests**: Environment and config validation

#### Integration Tests (`tests/integration/`)
- **MCP Server Tests**: Complete server functionality
- **Protocol Compliance**: MCP standard adherence
- **End-to-End Tool Execution**: Full request-response flows

#### Test Utilities (`tests/helpers/`, `tests/fixtures/`)
- **Mock Factory**: Centralized mock object creation
- **Test Fixtures**: Realistic Azure DevOps API responses
- **Test Utilities**: Helper functions for test setup

## Key Features

### 🎭 Mock Factory Pattern
Centralized mock creation with realistic data:

```typescript
import { MockFactory } from '../helpers/mock-factory.js';

// Create configured mocks
const { mockWebApi, mockTaskAgentApi } = MockFactory.setupSuccessfulMocks();

// Create custom mock data
const customQueue = MockFactory.createMockQueue({
  id: 123,
  name: 'Custom Queue'
});
```

### 📊 Coverage Monitoring
Comprehensive coverage tracking with thresholds:

- **Global Thresholds**: 80% across all metrics
- **Per-File Thresholds**: Higher standards for critical files
- **Trend Analysis**: Historical coverage tracking
- **Automated Reporting**: CI integration with coverage reports

### ⚡ Performance Optimization
Fast test execution with monitoring:

- **Parallel Execution**: Multi-threaded test running
- **Smart Watch Mode**: Intelligent file change detection
- **Performance Tracking**: Execution time monitoring
- **Resource Management**: Memory and cleanup monitoring

### 🧹 Automatic Cleanup
Robust resource management:

- **Temporary File Cleanup**: Automatic cleanup of test artifacts
- **Mock Reset**: Clean state between tests
- **Memory Management**: Leak detection and prevention
- **CI Resource Management**: Efficient CI execution

## Coverage Requirements

### Minimum Thresholds
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

### Critical File Thresholds
- **Server Components**: 85%+ coverage
- **Configuration**: 90%+ coverage
- **Core Clients**: 85%+ coverage

### Coverage Exclusions
- Type definition files (`*.d.ts`)
- Test files themselves
- Configuration files
- Entry points (covered by integration tests)
- Export-only modules

## Development Workflow

### 1. Writing New Tests

Follow the established patterns:

```typescript
describe('ComponentName', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    MockFactory.resetAllMocks();
  });

  it('should perform expected behavior when given valid input', async () => {
    // Arrange
    const mockData = MockFactory.createMockData();
    mockApi.method.mockResolvedValue(mockData);

    // Act
    const result = await component.method();

    // Assert
    expect(result).toMatchObject(expectedResult);
  });
});
```

### 2. Test-Driven Development

1. **Write failing test** for new functionality
2. **Implement minimum code** to make test pass
3. **Refactor** while keeping tests green
4. **Add edge cases** and error scenarios
5. **Verify coverage** meets requirements

### 3. Maintenance Workflow

Regular maintenance tasks:

```bash
# Daily: Check test health
npm run test:maintenance

# Weekly: Review performance and coverage trends
npm run test:coverage:trend
npm run test:performance

# Monthly: Full maintenance review
npm run test:maintenance
# Review and update fixtures
# Check for outdated mocks
# Optimize slow tests
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test:ci
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

### CI Test Commands

```bash
# CI-optimized test execution
npm run test:ci

# Unit tests only (faster feedback)
npm run test:ci:unit

# Integration tests only
npm run test:ci:integration

# Performance monitoring
npm run test:performance
```

## Troubleshooting

### Common Issues

#### Test Failures
1. **Mock-related**: Update mock factory and fixtures
2. **Timing issues**: Increase timeouts or fix race conditions
3. **Resource leaks**: Ensure proper cleanup in `afterEach`

#### Performance Issues
1. **Slow tests**: Use performance profiling to identify bottlenecks
2. **Memory leaks**: Monitor memory usage and implement cleanup
3. **CI timeouts**: Optimize test execution and parallelization

#### Coverage Issues
1. **Dropping coverage**: Identify uncovered code paths
2. **False positives**: Review coverage exclusions
3. **Threshold failures**: Add missing tests or adjust thresholds

### Getting Help

1. **Check documentation**: Review relevant guide sections
2. **Run diagnostics**: Use maintenance scripts to identify issues
3. **Review examples**: Look at existing tests for patterns
4. **Ask for help**: Consult with team members

## Best Practices Summary

### ✅ Do
- Use the mock factory for consistent test data
- Follow the AAA pattern (Arrange, Act, Assert)
- Write descriptive test names
- Test both success and error scenarios
- Clean up resources in `afterEach`
- Monitor coverage and performance trends
- Keep tests fast and focused

### ❌ Don't
- Make real API calls in tests
- Share state between tests
- Write overly complex test setups
- Ignore failing tests
- Skip error scenario testing
- Let coverage drop below thresholds
- Create tests that depend on external services

## Scripts Reference

### Test Execution
```bash
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # With coverage
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:ci            # CI-optimized
```

### Maintenance
```bash
npm run test:maintenance           # Full maintenance check
npm run test:maintenance:coverage  # Coverage check only
npm run test:maintenance:performance # Performance check only
npm run test:coverage:trend        # Coverage trend analysis
```

### Development
```bash
npm run test:watch:ui      # Watch with UI
npm run test:watch:coverage # Watch with coverage
npm run test:performance   # Performance analysis
npm run test:cleanup       # Cleanup verification
```

## Contributing

When contributing to the test suite:

1. **Follow established patterns** documented in this guide
2. **Maintain coverage thresholds** for all new code
3. **Add appropriate fixtures** for new API responses
4. **Update documentation** when adding new patterns
5. **Run maintenance checks** before submitting PRs

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Azure DevOps Node API](https://github.com/Microsoft/azure-devops-node-api)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Testing Best Practices](https://testing-library.com/docs/guiding-principles/)

---

This guide is maintained alongside the codebase. When you add new testing patterns or procedures, please update the relevant documentation sections.