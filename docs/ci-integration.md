# CI/CD Pipeline Integration

This document describes the CI/CD pipeline integration for the Azure DevOps MCP Server project, including test execution, coverage reporting, and performance monitoring.

## Overview

The project uses GitHub Actions for continuous integration with comprehensive test execution, coverage reporting, and performance monitoring. The CI pipeline ensures code quality and maintains test coverage thresholds across all supported Node.js versions.

## CI Pipeline Structure

### Main Test Workflow (`.github/workflows/test.yml`)

The CI pipeline consists of several jobs that run in parallel and sequence:

#### 1. Test & Coverage Job
- **Matrix Strategy**: Tests against Node.js 18.x and 20.x
- **Steps**:
  - Code checkout
  - Node.js setup with npm cache
  - Dependency installation
  - TypeScript type checking
  - Test execution with coverage
  - Coverage upload to Codecov
  - Test results upload as artifacts
  - Test results publishing

#### 2. Performance Tests Job
- **Dependency**: Runs after main test job
- **Purpose**: Monitor test execution performance
- **Output**: Performance metrics in JSON format

#### 3. Coverage Threshold Check Job
- **Dependency**: Runs after main test job
- **Purpose**: Enforce 80% coverage requirement
- **Features**: PR coverage comments via lcov-reporter

#### 4. Unit Tests Job
- **Purpose**: Isolated unit test execution
- **Output**: Unit test results in JSON format

#### 5. Integration Tests Job
- **Purpose**: Isolated integration test execution
- **Output**: Integration test results in JSON format

## Test Scripts for CI

### Primary CI Scripts

#### `npm run test:ci`
Complete test suite with coverage for CI environments:
```bash
vitest run --coverage --reporter=verbose --reporter=json --reporter=junit --outputFile.json=./test-results.json --outputFile.junit=./test-results.xml
```

**Features**:
- Full test coverage
- Multiple output formats (verbose, JSON, JUnit XML)
- Structured test results for CI processing

#### `npm run test:ci:unit`
Unit tests only for CI:
```bash
vitest run tests/unit --coverage --reporter=verbose --reporter=json --outputFile.json=./test-results-unit.json
```

#### `npm run test:ci:integration`
Integration tests only for CI:
```bash
vitest run tests/integration --coverage --reporter=verbose --reporter=json --outputFile.json=./test-results-integration.json
```

### Performance Monitoring

#### `npm run test:performance`
Performance-focused test execution:
```bash
vitest run --reporter=verbose --reporter=json --outputFile.json=./test-performance.json
```

**Metrics Collected**:
- Test execution times
- Memory usage (heap usage logging enabled)
- Test suite performance trends

### Utility Scripts

#### `npm run test:silent`
Minimal output for quick CI checks:
```bash
vitest run --reporter=basic
```

#### `npm run test:bail`
Fail-fast execution for rapid feedback:
```bash
vitest run --bail=1
```

## CI-Specific Configuration

### Environment Detection

The Vitest configuration automatically detects CI environments and applies optimizations:

```typescript
// CI-specific configuration
...(process.env.CI && {
  // Fail fast in CI
  bail: 1,
  // Disable watch mode in CI
  watch: false,
  // Increase timeout for CI environments
  testTimeout: 15000,
  // Disable UI in CI
  ui: false
})
```

### Reporter Configuration

Different reporters are used based on environment:

- **Local Development**: `['verbose', 'json']`
- **CI Environment**: `['verbose', 'json', 'junit']`

### Output Formats

#### JSON Output (`test-results.json`)
Machine-readable test results for CI processing:
```json
{
  "testResults": [...],
  "numTotalTests": 506,
  "numPassedTests": 506,
  "numFailedTests": 0,
  "coverageMap": {...}
}
```

#### JUnit XML Output (`test-results.xml`)
Standard XML format for CI test reporting:
```xml
<testsuites>
  <testsuite name="Test Suite" tests="506" failures="0" time="1.74">
    <testcase name="should validate config" time="0.003"/>
    ...
  </testsuite>
</testsuites>
```

## Coverage Reporting

### Coverage Formats

Multiple coverage formats are generated for different CI integrations:

1. **LCOV** (`coverage/lcov.info`) - Standard format for most CI services
2. **JSON** (`coverage/coverage-final.json`) - Machine-readable coverage data
3. **HTML** (`coverage/index.html`) - Human-readable coverage report
4. **Text Summary** - Console output during CI runs

### Coverage Integration Services

#### Codecov Integration
```yaml
- name: Upload coverage reports to Codecov
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
    flags: unittests
    name: codecov-umbrella
    fail_ci_if_error: true
```

#### PR Coverage Comments
```yaml
- name: Comment coverage on PR
  if: github.event_name == 'pull_request'
  uses: romeovs/lcov-reporter-action@v0.3.1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    lcov-file: ./coverage/lcov.info
```

### Coverage Thresholds

The CI pipeline enforces minimum coverage requirements:
- **Statements**: ≥80%
- **Branches**: ≥80%
- **Functions**: ≥80%
- **Lines**: ≥80%

Builds fail if coverage drops below these thresholds.

## Test Execution Monitoring

### Performance Metrics

The CI pipeline collects and monitors:

#### Execution Time Metrics
- Total test suite execution time
- Individual test execution times
- Performance trends over time

#### Memory Usage Metrics
- Heap usage during test execution
- Memory leak detection
- Resource utilization patterns

#### Test Distribution Metrics
- Unit vs integration test execution times
- Test file execution patterns
- Slowest tests identification

### Performance Thresholds

While not enforced, the following performance guidelines are monitored:

- **Total test suite**: <5 minutes
- **Unit tests**: <2 minutes
- **Integration tests**: <3 minutes
- **Individual test**: <10 seconds

## Artifacts and Reports

### Test Artifacts

The CI pipeline generates and stores:

#### Test Results
- `test-results.json` - Complete test results
- `test-results.xml` - JUnit XML format
- `test-results-unit.json` - Unit test results only
- `test-results-integration.json` - Integration test results only
- `test-performance.json` - Performance metrics

#### Coverage Reports
- `coverage/` directory - Complete coverage reports
- `coverage/lcov.info` - LCOV format for CI services
- `coverage/coverage-final.json` - JSON coverage data
- `coverage/index.html` - HTML coverage report

### Artifact Retention

- **Test Results**: 30 days
- **Coverage Reports**: 30 days
- **Performance Metrics**: 90 days

## CI Environment Variables

### Required Variables

- `CI=true` - Enables CI-specific configuration
- `GITHUB_TOKEN` - For PR comments and artifact uploads

### Optional Variables

- `CODECOV_TOKEN` - For private repository coverage uploads
- `NODE_ENV=test` - Test environment configuration

## Troubleshooting CI Issues

### Common CI Failures

#### Coverage Threshold Failures
```bash
ERROR: Coverage threshold for statements (79.5%) not met: 80%
```
**Solution**: Add tests to increase coverage or adjust thresholds if appropriate.

#### Test Timeout Failures
```bash
ERROR: Test timeout of 15000ms exceeded
```
**Solution**: Optimize slow tests or increase timeout for specific tests.

#### Memory Issues
```bash
ERROR: JavaScript heap out of memory
```
**Solution**: Optimize test memory usage or increase Node.js memory limit.

### Debugging CI Tests

#### Local CI Simulation
```bash
# Simulate CI environment locally
CI=true npm run test:ci

# Run with performance monitoring
npm run test:performance

# Check coverage thresholds
npm run test:coverage:threshold
```

#### Verbose Logging
```bash
# Enable detailed logging
DEBUG=* npm run test:ci

# Check heap usage
node --inspect npm run test:ci
```

## Integration with Other CI Systems

### Jenkins Integration

```groovy
pipeline {
    agent any
    stages {
        stage('Test') {
            steps {
                sh 'npm ci'
                sh 'npm run test:ci'
            }
            post {
                always {
                    publishTestResults testResultsPattern: 'test-results.xml'
                    publishHTML([
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'coverage',
                        reportFiles: 'index.html',
                        reportName: 'Coverage Report'
                    ])
                }
            }
        }
    }
}
```

### Azure DevOps Pipelines

```yaml
trigger:
- main
- develop

pool:
  vmImage: 'ubuntu-latest'

steps:
- task: NodeTool@0
  inputs:
    versionSpec: '20.x'
  displayName: 'Install Node.js'

- script: npm ci
  displayName: 'Install dependencies'

- script: npm run test:ci
  displayName: 'Run tests with coverage'
  env:
    CI: true

- task: PublishTestResults@2
  inputs:
    testResultsFormat: 'JUnit'
    testResultsFiles: 'test-results.xml'
  displayName: 'Publish test results'

- task: PublishCodeCoverageResults@1
  inputs:
    codeCoverageTool: 'Cobertura'
    summaryFileLocation: 'coverage/cobertura-coverage.xml'
    reportDirectory: 'coverage'
  displayName: 'Publish coverage results'
```

## Best Practices

### CI Configuration
- Use matrix builds for multiple Node.js versions
- Implement fail-fast strategies for quick feedback
- Cache dependencies to improve build times
- Use appropriate timeouts for different test types

### Test Organization
- Separate unit and integration tests for parallel execution
- Use descriptive test names for better CI reporting
- Implement proper test cleanup to prevent flaky tests
- Monitor test execution times and optimize slow tests

### Coverage Management
- Maintain consistent coverage thresholds
- Use coverage exclusions appropriately
- Monitor coverage trends over time
- Provide meaningful coverage reports in PRs

### Performance Monitoring
- Track test execution time trends
- Monitor memory usage patterns
- Identify and optimize slow tests
- Set reasonable performance expectations