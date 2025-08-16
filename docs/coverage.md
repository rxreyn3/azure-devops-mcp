# Test Coverage Configuration

This document describes the test coverage setup and requirements for the Azure DevOps MCP Server project.

## Coverage Requirements

The project maintains **80% minimum coverage** across all metrics:

- **Statements**: ≥80%
- **Branches**: ≥80%
- **Functions**: ≥80%
- **Lines**: ≥80%

## Current Coverage Status

As of the latest run, the project exceeds all minimum requirements:

- **Statements**: 88.29% ✅
- **Branches**: 82.05% ✅
- **Functions**: 98.85% ✅
- **Lines**: 88.29% ✅

## Coverage Configuration

### Included Files

Coverage is collected for all TypeScript files in the `src/` directory:
- `src/**/*.ts`

### Excluded Files

The following files are excluded from coverage analysis:

#### Test Files
- `src/**/*.test.ts` - Unit test files
- `src/**/*.spec.ts` - Specification test files
- `tests/**` - All test directories

#### Type Definitions
- `src/types/**` - TypeScript type definitions (no executable code)
- `src/**/*.d.ts` - Declaration files

#### Build Artifacts
- `dist/**` - Compiled output
- `node_modules/**` - Dependencies

#### Configuration Files
- `*.config.ts` - Configuration files
- `*.config.js` - JavaScript configuration files

#### Entry Points
- `src/index.ts` - CLI entry point (covered by integration tests)

#### Export-Only Files
- `src/clients/index.ts` - Re-export file with no logic

#### Utility Files with Limited Test Value
- `src/utils/enum-mappers.ts` - Simple enum mapping functions

### Per-File Thresholds

Critical files have higher coverage requirements:

#### Server Core (`src/server.ts`)
- Statements: ≥85%
- Branches: ≥85%
- Functions: ≥90%
- Lines: ≥85%

#### Configuration (`src/config.ts`)
- Statements: ≥90%
- Branches: ≥90%
- Functions: 100%
- Lines: ≥90%

## Coverage Reports

### Report Formats

The following coverage report formats are generated:

1. **Text** - Console output during test runs
2. **HTML** - Interactive web-based report (`coverage/index.html`)
3. **JSON** - Machine-readable format (`coverage/coverage-final.json`)
4. **LCOV** - Standard format for CI integration (`coverage/lcov.info`)
5. **Text Summary** - Concise summary format

### Viewing Coverage Reports

#### HTML Report (Recommended)
```bash
npm run test:coverage:open
```
This runs tests with coverage and opens the HTML report in your browser.

#### Console Output
```bash
npm run test:coverage
```
Shows coverage summary in the terminal.

#### Watch Mode
```bash
npm run test:coverage:watch
```
Runs tests in watch mode with live coverage updates.

## Coverage Scripts

### Basic Coverage
- `npm run test:coverage` - Run all tests with coverage
- `npm run test:coverage:open` - Run coverage and open HTML report
- `npm run test:coverage:watch` - Watch mode with coverage
- `npm run test:coverage:threshold` - Run with verbose threshold reporting

### Targeted Coverage
- `npm run test:unit:coverage` - Coverage for unit tests only
- `npm run test:integration:coverage` - Coverage for integration tests only

## CI Integration

### Coverage Thresholds

The CI pipeline enforces the 80% minimum coverage requirement. Builds will fail if coverage drops below:
- 80% statements
- 80% branches  
- 80% functions
- 80% lines

### Coverage Reports in CI

Coverage reports are generated in multiple formats for CI integration:
- **LCOV format** for services like Codecov, Coveralls
- **JSON format** for custom CI processing
- **Text summary** for build logs

## Maintaining Coverage

### Adding New Code

When adding new functionality:

1. **Write tests first** (TDD approach recommended)
2. **Ensure all branches are covered** - test both success and error paths
3. **Test edge cases** - null/undefined inputs, boundary conditions
4. **Mock external dependencies** - focus on testing your code, not external APIs

### Coverage Best Practices

#### Do Cover
- **Business logic** - Core functionality and algorithms
- **Error handling** - All error paths and edge cases
- **Public APIs** - All exported functions and classes
- **Configuration logic** - Validation and transformation
- **Utility functions** - Reusable helper functions

#### Don't Over-Cover
- **Type definitions** - No executable code to test
- **Simple getters/setters** - Trivial property access
- **Re-export files** - Files that only export other modules
- **External library wrappers** - Focus on your logic, not the library

### Improving Coverage

If coverage drops below thresholds:

1. **Identify uncovered code** using the HTML report
2. **Add missing test cases** for uncovered branches
3. **Test error conditions** that may be missed
4. **Remove dead code** that's no longer needed
5. **Consider excluding** files with no testable logic

## Coverage Analysis

### Understanding Coverage Metrics

- **Statements**: Percentage of executable statements that were executed
- **Branches**: Percentage of conditional branches (if/else, switch, ternary) that were taken
- **Functions**: Percentage of functions that were called
- **Lines**: Percentage of lines containing executable code that were executed

### Coverage vs Quality

High coverage doesn't guarantee high quality tests. Focus on:
- **Meaningful assertions** - Test behavior, not just execution
- **Edge case testing** - Boundary conditions and error scenarios
- **Integration testing** - How components work together
- **Regression testing** - Prevent bugs from reoccurring

## Troubleshooting

### Common Coverage Issues

#### Low Branch Coverage
- Missing tests for error conditions
- Incomplete conditional logic testing
- Missing edge case scenarios

#### Low Function Coverage
- Unused utility functions
- Missing integration tests
- Dead code that should be removed

#### Coverage Exclusions Not Working
- Check file paths in `vitest.config.ts`
- Ensure patterns match actual file structure
- Verify glob patterns are correct

### Getting Help

If you encounter coverage issues:
1. Check the HTML coverage report for detailed analysis
2. Review the `vitest.config.ts` configuration
3. Run tests with `--reporter=verbose` for detailed output
4. Consult the Vitest documentation for advanced configuration options