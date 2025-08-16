# Test Directory Structure

This directory contains all test files for the Azure DevOps MCP server.

## Directory Structure

- `unit/` - Unit tests for individual functions and classes
- `integration/` - Integration tests that test multiple components together
- `fixtures/` - Test data and mock responses
- `helpers/` - Shared test utilities and helper functions
- `setup.ts` - Global test setup and configuration

## Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run tests with UI
npm run test:ui
```

## Test Naming Conventions

- Unit test files: `*.test.ts` or `*.spec.ts`
- Integration test files: `*.integration.test.ts`
- Test descriptions should be descriptive and follow the pattern: "should [expected behavior] when [condition]"

## Coverage Thresholds

The project maintains the following coverage thresholds:
- Branches: 80%
- Functions: 80%
- Lines: 80%
- Statements: 80%