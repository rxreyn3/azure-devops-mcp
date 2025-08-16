# Test Cleanup and Resource Management

This document describes the comprehensive test cleanup and resource management system that ensures proper cleanup of temporary files, mocks, timers, and other resources during test execution.

## Overview

The test cleanup system consists of three main components:

1. **TestCleanupManager**: Handles automatic cleanup of temporary files, mocks, timers, and memory monitoring
2. **TestResourceManager**: Manages test resources like file handles, network connections, and custom resources
3. **Enhanced Test Setup**: Provides convenient helpers and automatic integration

## Features

- **Automatic Cleanup**: Temporary files, mocks, and timers are automatically cleaned up
- **Memory Monitoring**: Track memory usage and detect potential leaks
- **Resource Management**: Register and manage custom resources with automatic cleanup
- **Error Handling**: Graceful handling of cleanup errors with detailed reporting
- **Integration**: Seamless integration with Vitest test lifecycle
- **Performance**: Optimized cleanup with minimal impact on test performance

## TestCleanupManager

### Basic Usage

```typescript
import { testCleanupManager } from './tests/utils/test-cleanup-manager.js';

// Initialize for a test run
testCleanupManager.initialize();

// Register temporary directory for cleanup
testCleanupManager.registerTempDirectory('/tmp/my-test-dir');

// Register mock for cleanup
const mockFn = vi.fn();
testCleanupManager.registerMock('myMock', mockFn);

// Track timers for cleanup
const timeout = testCleanupManager.trackTimer(
  setTimeout(() => console.log('test'), 1000)
);

// Perform cleanup
const report = await testCleanupManager.cleanup({
  cleanupTempFiles: true,
  cleanupMocks: true,
  cleanupTimers: true,
  monitorMemory: true
});

console.log(`Cleaned up ${report.tempFilesRemoved} files`);
```

### Cleanup Options

```typescript
interface CleanupOptions {
  cleanupTempFiles?: boolean;     // Clean up temporary files and directories
  cleanupMocks?: boolean;         // Clean up registered mocks
  monitorMemory?: boolean;        // Monitor memory usage
  forceGarbageCollection?: boolean; // Force garbage collection
  cleanupTimers?: boolean;        // Clean up tracked timers
  maxMemoryGrowth?: number;       // Maximum allowed memory growth (bytes)
  cleanupTimeout?: number;        // Cleanup timeout (milliseconds)
}
```

### Memory Monitoring

```typescript
// Capture memory snapshots
testCleanupManager.initialize();
testCleanupManager.captureMemorySnapshot();

// Get memory report
const memoryReport = testCleanupManager.getMemoryReport();
console.log(`Current heap: ${memoryReport.current.heapUsed}`);
console.log(`Memory growth: ${memoryReport.growth}`);

// Check for memory leaks during cleanup
const report = await testCleanupManager.cleanup({
  monitorMemory: true,
  maxMemoryGrowth: 50 * 1024 * 1024 // 50MB limit
});

if (report.warnings.length > 0) {
  console.warn('Memory warnings:', report.warnings);
}
```

## TestResourceManager

### Basic Resource Management

```typescript
import { testResourceManager } from './tests/utils/test-resource-manager.js';

// Register a custom resource
const resourceId = testResourceManager.registerResource(
  'database',
  dbConnection,
  async () => {
    await dbConnection.close();
  },
  { connectionString: 'test://localhost' }
);

// Check if resource exists
if (testResourceManager.hasResource(resourceId)) {
  console.log('Resource is registered');
}

// Get resource statistics
const stats = testResourceManager.getResourceStats();
console.log(`Total resources: ${stats.totalResources}`);
console.log(`Memory usage: ${stats.memoryUsage.formatted}`);

// Cleanup specific resource type
const result = await testResourceManager.cleanupResourcesByType('database');
console.log(`Cleaned up ${result.cleaned} database connections`);

// Cleanup all resources
const allResult = await testResourceManager.cleanupAllResources();
console.log(`Total cleanup: ${allResult.cleaned} resources`);
```

### Helper Functions for Common Resources

```typescript
import {
  registerFileResource,
  registerNetworkResource,
  registerDatabaseResource,
  registerTimerResource,
  registerMockResource
} from './tests/utils/test-resource-manager.js';

// Register file handle
const fileId = registerFileResource('/tmp/test.txt', fileHandle);

// Register network connection
const networkId = registerNetworkResource(socket, {
  host: 'localhost',
  port: 3000
});

// Register database connection
const dbId = registerDatabaseResource(dbConnection, {
  database: 'test_db'
});

// Register timer
const timerId = registerTimerResource(
  setTimeout(() => {}, 1000),
  'timeout'
);

// Register mock
const mockId = registerMockResource(mockFn, 'apiMock');
```

## Enhanced Test Setup

### Automatic Setup

The enhanced test setup is automatically configured in `tests/setup.ts`:

```typescript
import { setupEnhancedTests } from './tests/utils/enhanced-test-setup.js';

// Setup enhanced test environment
setupEnhancedTests({
  enableMemoryMonitoring: true,
  enableAutoCleanup: true,
  maxMemoryGrowth: 50 * 1024 * 1024, // 50MB
  setupTempManager: true,
  logCleanupReport: process.env.NODE_ENV !== 'ci'
});
```

### Helper Functions

```typescript
import {
  registerTestCleanup,
  registerTempDirectory,
  registerMock,
  createTrackedTimeout,
  createTrackedInterval,
  getMemoryUsage,
  checkMemoryLimits
} from './tests/utils/enhanced-test-setup.js';

// Register custom cleanup
registerTestCleanup(async () => {
  await myCustomCleanup();
});

// Register temp directory
registerTempDirectory('/tmp/my-test-files');

// Register mock
const mockFn = vi.fn();
registerMock('myMock', mockFn);

// Create tracked timers
const timeout = createTrackedTimeout(() => {
  console.log('timeout executed');
}, 1000);

const interval = createTrackedInterval(() => {
  console.log('interval tick');
}, 500);

// Monitor memory usage
const memoryUsage = getMemoryUsage();
console.log(`Current memory: ${memoryUsage.formatted.current}`);
console.log(`Memory growth: ${memoryUsage.formatted.growth}`);

// Check memory limits
const limits = checkMemoryLimits(100 * 1024 * 1024); // 100MB
if (!limits.withinLimits) {
  console.warn(limits.warning);
}
```

## Best Practices

### Resource Registration

1. **Register Early**: Register resources as soon as they're created
2. **Use Descriptive Names**: Provide meaningful names and metadata
3. **Handle Cleanup Errors**: Always provide error handling in cleanup functions
4. **Clean Up Promptly**: Don't let resources accumulate

### Memory Management

1. **Monitor Regularly**: Use memory monitoring in development
2. **Set Reasonable Limits**: Configure appropriate memory growth limits
3. **Clean Up Large Objects**: Explicitly clean up large test data
4. **Use Garbage Collection**: Force GC for accurate measurements

### Test Organization

1. **Use Enhanced Setup**: Leverage automatic cleanup where possible
2. **Group Related Tests**: Keep resource-intensive tests together
3. **Isolate Tests**: Ensure tests don't interfere with each other
4. **Document Resources**: Comment on resource usage patterns

## CLI Commands

### Manual Cleanup
```bash
# Run manual cleanup
npm run test:cleanup

# Check resource usage
npm run test:resources

# Run tests with memory monitoring
npm run test:memory
```

### Performance Testing
```bash
# Run tests with garbage collection
node --expose-gc npm test

# Monitor memory usage
node --inspect npm test

# Run with heap profiling
node --prof npm test
```

## Integration with CI/CD

### CI Configuration

```yaml
# .github/workflows/test.yml
- name: Run tests with cleanup monitoring
  run: |
    npm run test:ci
    npm run test:cleanup
  env:
    NODE_ENV: ci
    NODE_OPTIONS: --max-old-space-size=4096
```

### Performance Monitoring

```typescript
// In CI, use stricter limits
const isCI = process.env.CI === 'true';
const memoryLimit = isCI ? 100 * 1024 * 1024 : 200 * 1024 * 1024;

const report = await testCleanupManager.cleanup({
  maxMemoryGrowth: memoryLimit,
  forceGarbageCollection: isCI
});

if (isCI && report.warnings.length > 0) {
  // Fail CI on memory warnings
  process.exit(1);
}
```