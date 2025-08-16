# Test Maintenance Procedures

This document outlines the procedures and guidelines for maintaining the test suite in the Azure DevOps MCP server project. Following these procedures ensures that tests remain reliable, up-to-date, and performant as the codebase evolves.

## Table of Contents

- [Mock Data Update Procedures](#mock-data-update-procedures)
- [Coverage Threshold Management](#coverage-threshold-management)
- [Test Performance Optimization](#test-performance-optimization)
- [Fixture Management](#fixture-management)
- [CI/CD Integration Maintenance](#cicd-integration-maintenance)
- [Test Environment Management](#test-environment-management)
- [Troubleshooting Common Issues](#troubleshooting-common-issues)

## Mock Data Update Procedures

### When to Update Mock Data

Mock data should be updated when:

1. **Azure DevOps API Changes**: Microsoft updates API response structures
2. **New API Endpoints**: Adding support for new Azure DevOps features
3. **Test Coverage Gaps**: Discovering scenarios not covered by existing mocks
4. **Bug Reports**: Real-world data reveals edge cases not in mocks
5. **Performance Issues**: Mock data causing slow test execution

### Update Process

#### 1. Identify Changes Needed

```bash
# Check for API changes by comparing with real responses
npm run test:api-validation  # Custom script to validate mock accuracy
```

#### 2. Update Fixture Files

```typescript
// Example: Updating queue fixtures in tests/fixtures/azure-responses/queues.ts
export const mockQueueApiResponse = [
  {
    id: 1,
    name: 'Default',
    pool: {
      id: 1,
      name: 'Default',
      isHosted: false,
      // NEW: Add new properties from API updates
      agentCloudId: null,
      targetSize: 1,
      autoProvision: false
    },
    // NEW: Add new queue properties
    projectId: 'project-guid',
    createdOn: '2024-01-01T00:00:00Z'
  }
];
```

#### 3. Update Mock Factory

```typescript
// Update MockFactory methods to include new properties
static createMockQueue(overrides = {}) {
  return {
    id: 1,
    name: 'Default',
    pool: {
      id: 1,
      name: 'Default',
      isHosted: false,
      agentCloudId: null,
      targetSize: 1,
      autoProvision: false,
      ...overrides.pool
    },
    projectId: 'project-guid',
    createdOn: '2024-01-01T00:00:00Z',
    ...overrides
  };
}
```

#### 4. Update Type Definitions

```typescript
// Update type definitions if API structure changes
interface QueueInfo {
  id: number;
  name: string;
  poolName: string;
  poolId: number;
  isHosted: boolean;
  // NEW: Add new properties
  projectId?: string;
  createdOn?: string;
  agentCount?: number;
}
```

#### 5. Update Tests

```typescript
// Update tests to handle new properties
it('should include new queue properties in response', async () => {
  const mockQueues = [MockFactory.createMockQueue({
    projectId: 'test-project-id',
    createdOn: '2024-01-01T00:00:00Z'
  })];
  
  mockTaskAgentApi.getAgentQueues.mockResolvedValue(mockQueues);
  
  const result = await client.listQueues();
  
  expect(result.data[0]).toMatchObject({
    id: expect.any(Number),
    name: expect.any(String),
    poolName: expect.any(String),
    projectId: 'test-project-id',
    createdOn: expect.any(String)
  });
});
```

#### 6. Validation and Testing

```bash
# Run tests to ensure updates work correctly
npm run test:unit
npm run test:integration

# Run coverage to ensure no regressions
npm run test:coverage

# Validate mock accuracy against real API (if available)
npm run test:mock-validation
```

### Mock Data Validation Script

Create a script to validate mock data accuracy:

```typescript
// scripts/validate-mocks.ts
import { WebApi } from 'azure-devops-node-api';
import { MockFactory } from '../tests/helpers/mock-factory.js';

async function validateMockAccuracy() {
  // Only run if real credentials are available
  if (!process.env.ADO_PAT) {
    console.log('Skipping mock validation - no credentials');
    return;
  }

  const connection = new WebApi(
    process.env.ADO_ORGANIZATION!,
    process.env.ADO_PAT!
  );

  try {
    // Compare real API response with mock structure
    const taskAgentApi = await connection.getTaskAgentApi();
    const realQueues = await taskAgentApi.getAgentQueues(process.env.ADO_PROJECT!);
    const mockQueues = MockFactory.createMockQueues(1);

    // Validate structure matches
    const realKeys = Object.keys(realQueues[0] || {});
    const mockKeys = Object.keys(mockQueues[0] || {});

    const missingInMock = realKeys.filter(key => !mockKeys.includes(key));
    const extraInMock = mockKeys.filter(key => !realKeys.includes(key));

    if (missingInMock.length > 0) {
      console.warn('Properties missing in mock:', missingInMock);
    }

    if (extraInMock.length > 0) {
      console.warn('Extra properties in mock:', extraInMock);
    }

    console.log('Mock validation completed');
  } catch (error) {
    console.error('Mock validation failed:', error.message);
  }
}
```

## Coverage Threshold Management

### Current Thresholds

The project maintains these coverage thresholds:

```typescript
// vitest.config.ts
thresholds: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80
  },
  // Per-file thresholds for critical files
  'src/server.ts': {
    branches: 85,
    functions: 90,
    lines: 85,
    statements: 85
  }
}
```

### Threshold Management Procedures

#### 1. Monitoring Coverage Trends

```bash
# Generate coverage reports with trend analysis
npm run test:coverage:trend

# View coverage history
cat coverage/coverage-history.json
```

#### 2. Adjusting Thresholds

**When to Increase Thresholds:**
- Consistently exceeding current thresholds by 5%+
- Adding critical functionality that needs higher coverage
- Improving code quality standards

**When to Temporarily Lower Thresholds:**
- Major refactoring that temporarily reduces coverage
- Adding new features with complex edge cases
- External dependency changes affecting testability

#### 3. Per-File Threshold Management

```typescript
// Add specific thresholds for critical files
'src/clients/build-client.ts': {
  branches: 85,
  functions: 90,
  lines: 85,
  statements: 85
},
'src/tools/build-tools.ts': {
  branches: 90,
  functions: 95,
  lines: 90,
  statements: 90
}
```

#### 4. Coverage Exclusion Management

Review and update coverage exclusions regularly:

```typescript
exclude: [
  // Test files
  'src/**/*.test.ts',
  'tests/**',
  
  // Type definitions (no executable code)
  'src/types/**',
  
  // Configuration files
  '*.config.ts',
  
  // Entry points (covered by integration tests)
  'src/index.ts',
  
  // Export-only files
  'src/clients/index.ts',
  
  // Utility files with limited test value
  'src/utils/enum-mappers.ts'
]
```

### Coverage Monitoring Script

```typescript
// scripts/monitor-coverage.ts
import { readFileSync, writeFileSync } from 'fs';

interface CoverageData {
  timestamp: string;
  global: {
    branches: number;
    functions: number;
    lines: number;
    statements: number;
  };
  files: Record<string, any>;
}

function monitorCoverage() {
  try {
    // Read current coverage data
    const coverageData = JSON.parse(readFileSync('coverage/coverage-final.json', 'utf8'));
    
    // Read coverage history
    let history: CoverageData[] = [];
    try {
      history = JSON.parse(readFileSync('coverage/coverage-history.json', 'utf8'));
    } catch {
      // File doesn't exist yet
    }

    // Add current data to history
    const currentData: CoverageData = {
      timestamp: new Date().toISOString(),
      global: {
        branches: coverageData.total.branches.pct,
        functions: coverageData.total.functions.pct,
        lines: coverageData.total.lines.pct,
        statements: coverageData.total.statements.pct
      },
      files: coverageData
    };

    history.push(currentData);

    // Keep only last 30 entries
    if (history.length > 30) {
      history = history.slice(-30);
    }

    // Write updated history
    writeFileSync('coverage/coverage-history.json', JSON.stringify(history, null, 2));

    // Analyze trends
    if (history.length >= 2) {
      const previous = history[history.length - 2];
      const current = history[history.length - 1];

      console.log('Coverage Trend Analysis:');
      console.log(`Branches: ${previous.global.branches}% → ${current.global.branches}%`);
      console.log(`Functions: ${previous.global.functions}% → ${current.global.functions}%`);
      console.log(`Lines: ${previous.global.lines}% → ${current.global.lines}%`);
      console.log(`Statements: ${previous.global.statements}% → ${current.global.statements}%`);
    }

  } catch (error) {
    console.error('Coverage monitoring failed:', error.message);
  }
}
```

## Test Performance Optimization

### Performance Monitoring

#### 1. Test Execution Time Tracking

```typescript
// scripts/test-performance.js (existing file)
// Enhanced to track performance trends
const performanceData = {
  timestamp: new Date().toISOString(),
  totalTime: testResults.duration,
  testCount: testResults.numTotalTests,
  avgTimePerTest: testResults.duration / testResults.numTotalTests,
  slowTests: testResults.testResults
    .filter(test => test.duration > 1000)
    .map(test => ({
      name: test.fullName,
      duration: test.duration
    }))
};
```

#### 2. Performance Thresholds

Set performance thresholds for different test categories:

```typescript
// vitest.config.ts
testTimeout: {
  unit: 5000,      // Unit tests should complete in 5s
  integration: 15000, // Integration tests in 15s
  e2e: 30000       // E2E tests in 30s
}
```

#### 3. Performance Optimization Strategies

**Slow Test Identification:**

```bash
# Run tests with performance reporting
npm run test:performance

# Identify slow tests
npm run test -- --reporter=verbose | grep -E "SLOW|[0-9]+ms" | sort -nr
```

**Common Optimizations:**

1. **Mock Optimization:**
   ```typescript
   // Use lightweight mocks for performance-critical tests
   const fastMock = vi.fn().mockResolvedValue(simpleResponse);
   ```

2. **Test Data Optimization:**
   ```typescript
   // Use minimal test data for performance tests
   const minimalQueue = { id: 1, name: 'Test' }; // Instead of full mock
   ```

3. **Parallel Test Execution:**
   ```typescript
   // vitest.config.ts
   poolOptions: {
     threads: {
       maxThreads: Math.min(4, require('os').cpus().length)
     }
   }
   ```

4. **Test Cleanup Optimization:**
   ```typescript
   // Batch cleanup operations
   afterAll(async () => {
     await Promise.all([
       cleanupMocks(),
       cleanupTempFiles(),
       cleanupConnections()
     ]);
   });
   ```

### Performance Monitoring Script

```bash
#!/bin/bash
# scripts/monitor-test-performance.sh

echo "🔍 Monitoring test performance..."

# Run tests with timing
npm run test:performance

# Analyze results
node -e "
const fs = require('fs');
const results = JSON.parse(fs.readFileSync('test-results.json', 'utf8'));

console.log('Performance Summary:');
console.log('Total Tests:', results.numTotalTests);
console.log('Total Time:', results.duration + 'ms');
console.log('Average per Test:', Math.round(results.duration / results.numTotalTests) + 'ms');

// Find slow tests
const slowTests = results.testResults
  .filter(test => test.duration > 1000)
  .sort((a, b) => b.duration - a.duration)
  .slice(0, 10);

if (slowTests.length > 0) {
  console.log('\nSlowest Tests:');
  slowTests.forEach(test => {
    console.log(\`  \${test.duration}ms - \${test.fullName}\`);
  });
}
"
```

## Fixture Management

### Fixture Organization

Maintain fixtures with clear organization and documentation:

```
fixtures/
├── azure-responses/
│   ├── queues.ts          # Queue responses
│   ├── agents.ts          # Agent responses
│   ├── builds.ts          # Build responses
│   ├── pipelines.ts       # Pipeline responses
│   └── errors.ts          # Error responses
├── mcp-messages/          # MCP protocol messages
├── fixture-utils.ts       # Fixture utilities
└── README.md             # Fixture documentation
```

### Fixture Update Procedures

#### 1. Regular Fixture Reviews

Schedule monthly reviews of fixture data:

```bash
# Create fixture review checklist
echo "Fixture Review Checklist:" > fixture-review.md
echo "- [ ] Queue fixtures match current API" >> fixture-review.md
echo "- [ ] Agent fixtures include all statuses" >> fixture-review.md
echo "- [ ] Build fixtures cover all scenarios" >> fixture-review.md
echo "- [ ] Error fixtures match current error codes" >> fixture-review.md
```

#### 2. Fixture Validation

```typescript
// tests/fixtures/fixture-validation.test.ts
describe('Fixture Validation', () => {
  it('should have valid queue fixtures', () => {
    mockQueueApiResponse.forEach(queue => {
      expect(queue).toHaveProperty('id');
      expect(queue).toHaveProperty('name');
      expect(queue).toHaveProperty('pool');
      expect(queue.pool).toHaveProperty('id');
      expect(queue.pool).toHaveProperty('name');
    });
  });

  it('should have consistent fixture structure', () => {
    const queueKeys = Object.keys(mockQueueApiResponse[0]);
    mockQueueApiResponse.forEach(queue => {
      expect(Object.keys(queue).sort()).toEqual(queueKeys.sort());
    });
  });
});
```

#### 3. Fixture Documentation

Keep fixture documentation up-to-date:

```markdown
# Fixture Update Log

## 2024-01-15
- Updated queue fixtures to include new `projectId` property
- Added error fixtures for new 429 rate limiting responses
- Updated agent fixtures with new status values

## 2024-01-01
- Initial fixture creation
- Added comprehensive queue, agent, and build fixtures
```

## CI/CD Integration Maintenance

### CI Configuration Updates

#### 1. Test Execution Configuration

```yaml
# .github/workflows/test.yml
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

#### 2. Performance Monitoring in CI

```yaml
      - name: Monitor test performance
        run: |
          npm run test:performance
          node scripts/check-performance-regression.js
```

#### 3. Coverage Reporting

```yaml
      - name: Check coverage thresholds
        run: npm run test:coverage:threshold
        
      - name: Comment coverage on PR
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const coverage = JSON.parse(fs.readFileSync('coverage/coverage-summary.json'));
            // Post coverage comment on PR
```

### CI Maintenance Procedures

#### 1. Regular CI Health Checks

```bash
# scripts/ci-health-check.sh
#!/bin/bash

echo "🔍 Checking CI health..."

# Check test execution times
if [ -f "test-results.json" ]; then
  duration=$(node -e "console.log(JSON.parse(require('fs').readFileSync('test-results.json')).duration)")
  if [ "$duration" -gt 120000 ]; then  # 2 minutes
    echo "⚠️  Tests taking too long: ${duration}ms"
  fi
fi

# Check coverage trends
if [ -f "coverage/coverage-history.json" ]; then
  node -e "
    const history = JSON.parse(require('fs').readFileSync('coverage/coverage-history.json'));
    const recent = history.slice(-5);
    const avgCoverage = recent.reduce((sum, item) => sum + item.global.lines, 0) / recent.length;
    if (avgCoverage < 80) {
      console.log('⚠️  Coverage trending down:', avgCoverage + '%');
    }
  "
fi

echo "✅ CI health check completed"
```

#### 2. Dependency Updates

```bash
# Update test dependencies monthly
npm update @vitest/coverage-v8 vitest
npm audit fix

# Test after updates
npm run test:ci
```

## Test Environment Management

### Environment Configuration

#### 1. Test Environment Variables

```bash
# .env.test
NODE_ENV=test
LOG_LEVEL=error
ADO_ORGANIZATION=test-org
ADO_PROJECT=test-project
ADO_PAT=test-token
VITEST_LOG_CLEANUP=true
```

#### 2. Environment Validation

```typescript
// tests/setup.ts
function validateTestEnvironment() {
  const required = ['NODE_ENV', 'ADO_ORGANIZATION', 'ADO_PROJECT'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing test environment variables: ${missing.join(', ')}`);
  }
}

validateTestEnvironment();
```

### Resource Management

#### 1. Temporary File Cleanup

```typescript
// tests/utils/test-cleanup-manager.ts (existing)
// Enhanced with monitoring
export class TestCleanupManager {
  private static cleanupStats = {
    filesCreated: 0,
    filesDeleted: 0,
    memoryUsage: []
  };

  static trackCleanup() {
    const usage = process.memoryUsage();
    this.cleanupStats.memoryUsage.push({
      timestamp: Date.now(),
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal
    });
  }

  static getCleanupReport() {
    return this.cleanupStats;
  }
}
```

#### 2. Memory Monitoring

```typescript
// tests/utils/memory-monitor.ts
export function monitorMemoryUsage() {
  const usage = process.memoryUsage();
  const threshold = 100 * 1024 * 1024; // 100MB
  
  if (usage.heapUsed > threshold) {
    console.warn(`High memory usage: ${Math.round(usage.heapUsed / 1024 / 1024)}MB`);
  }
}
```

## Troubleshooting Common Issues

### Common Test Failures

#### 1. Mock-Related Issues

**Problem:** Tests fail due to outdated mocks
```
Error: Cannot read property 'newProperty' of undefined
```

**Solution:**
```bash
# Update mock factory
npm run test:mock-validation
# Update fixtures based on validation results
```

#### 2. Timing Issues

**Problem:** Tests fail intermittently due to timing
```
Error: Timeout of 5000ms exceeded
```

**Solution:**
```typescript
// Increase timeout for specific tests
it('should handle slow operation', async () => {
  // ... test code
}, 10000); // 10 second timeout
```

#### 3. Resource Cleanup Issues

**Problem:** Tests fail due to resource leaks
```
Error: EMFILE: too many open files
```

**Solution:**
```typescript
afterEach(async () => {
  await TestCleanupManager.cleanup();
  MockFactory.resetAllMocks();
});
```

### Performance Issues

#### 1. Slow Test Execution

**Diagnosis:**
```bash
npm run test:performance
node scripts/analyze-slow-tests.js
```

**Solutions:**
- Optimize mock data size
- Use parallel test execution
- Reduce test timeout values
- Batch similar tests

#### 2. Memory Leaks

**Diagnosis:**
```bash
npm run test:memory
```

**Solutions:**
- Implement proper cleanup in `afterEach`
- Use weak references for large objects
- Clear mock implementations between tests

### CI/CD Issues

#### 1. Flaky Tests in CI

**Diagnosis:**
```bash
# Run tests multiple times to identify flaky tests
for i in {1..10}; do npm test; done
```

**Solutions:**
- Add retry logic for network-dependent tests
- Increase timeouts for CI environment
- Use more deterministic test data

#### 2. Coverage Drops

**Diagnosis:**
```bash
npm run test:coverage:diff
```

**Solutions:**
- Identify uncovered code paths
- Add missing test cases
- Review coverage exclusions

## Maintenance Schedule

### Daily
- [ ] Monitor CI test results
- [ ] Check for test failures in development

### Weekly
- [ ] Review test performance metrics
- [ ] Update fixture data if needed
- [ ] Check coverage trends

### Monthly
- [ ] Full fixture validation
- [ ] Dependency updates
- [ ] Performance optimization review
- [ ] CI/CD configuration review

### Quarterly
- [ ] Test strategy review
- [ ] Coverage threshold evaluation
- [ ] Test infrastructure updates
- [ ] Documentation updates

## Tools and Scripts

### Maintenance Scripts

```bash
# Package.json scripts for maintenance
"test:maintenance": "node scripts/test-maintenance.js",
"test:validate-mocks": "node scripts/validate-mocks.js",
"test:performance-check": "node scripts/check-performance.js",
"test:cleanup-check": "node scripts/check-cleanup.js",
"test:coverage-trend": "node scripts/coverage-trend.js"
```

### Monitoring Dashboard

Create a simple monitoring dashboard:

```typescript
// scripts/test-dashboard.js
function generateTestDashboard() {
  const coverage = JSON.parse(fs.readFileSync('coverage/coverage-summary.json'));
  const performance = JSON.parse(fs.readFileSync('test-performance-history.json'));
  
  console.log('📊 Test Dashboard');
  console.log('================');
  console.log(`Coverage: ${coverage.total.lines.pct}%`);
  console.log(`Tests: ${performance.latest.testCount}`);
  console.log(`Duration: ${performance.latest.totalTime}ms`);
  console.log(`Avg per test: ${performance.latest.avgTimePerTest}ms`);
}
```

This comprehensive maintenance guide ensures that the test suite remains reliable, performant, and up-to-date as the project evolves.