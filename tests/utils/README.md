# Test Cleanup and Resource Management Utilities

This directory contains comprehensive test cleanup and resource management utilities that help maintain clean test environments and prevent resource leaks during test execution.

## Components

### TestCleanupManager (`test-cleanup-manager.ts`)

A singleton class that provides comprehensive cleanup functionality for test environments:

- **Temporary File Cleanup**: Automatically removes temporary files and directories created during tests
- **Mock Cleanup**: Restores mocked functions and clears mock registries
- **Timer Cleanup**: Clears active timeouts and intervals to prevent hanging tests
- **Memory Monitoring**: Tracks memory usage and detects potential memory leaks
- **Custom Cleanup Callbacks**: Allows registration of custom cleanup functions

#### Usage

```typescript
import { testCleanupManager } from './test-cleanup-manager.js';

// Initialize for a test run
testCleanupManager.initialize();

// Register resources for cleanup
testCleanupManager.registerTempDirectory('/tmp/test-dir');
testCleanupManager.registerMock('myMock', mockObject);
testCleanupManager.trackTimer(setTimeout(() => {}, 1000));

// Perform cleanup
const report = await testCleanupManager.cleanup({
  cleanupTempFiles: true,
  cleanupMocks: true,
  cleanupTimers: true,
  monitorMemory: true
});

console.log(`Cleaned up ${report.tempFilesRemoved} files, ${report.mocksCleared} mocks`);
```

### TestResourceManager (`test-resource-manager.ts`)

A singleton class that provides resource registration and management:

- **Resource Registration**: Register various types of resources (files, directories, network connections, etc.)
- **Type-based Cleanup**: Clean up resources by type or all at once
- **Resource Statistics**: Get detailed statistics about registered resources
- **Age-based Cleanup**: Clean up resources older than a specified age
- **Helper Methods**: Convenient methods for common resource types

#### Usage

```typescript
import { testResourceManager, ResourceType } from './test-resource-manager.js';

// Register resources
const fileId = testResourceManager.registerFile('/tmp/test.txt');
const mockId = testResourceManager.registerMock(mockObject, 'test-mock');

// Get statistics
const stats = testResourceManager.getStats();
console.log(`Total resources: ${stats.totalResources}`);

// Cleanup by type
await testResourceManager.cleanupByType(ResourceType.FILE);

// Cleanup all resources
await testResourceManager.cleanupAll();
```

### Enhanced Test Setup (`enhanced-test-setup.ts`)

Provides integration with Vitest lifecycle hooks and helper functions:

- **Automatic Integration**: Automatically integrates with Vitest beforeEach/afterEach hooks
- **Helper Functions**: Convenient functions for creating tracked resources
- **Memory Monitoring**: Built-in memory usage monitoring and limits
- **Configuration Options**: Flexible configuration for different test scenarios

#### Usage

```typescript
import { setupEnhancedTests, createTempFile, createTempDirectory } from './enhanced-test-setup.js';

// Setup enhanced test environment
const testContext = setupEnhancedTests({
  enableCleanup: true,
  enableResourceManagement: true,
  enableMemoryMonitoring: true,
  memoryLimit: 100 * 1024 * 1024 // 100MB
});

// Use helper functions
const tempFile = createTempFile('test content', '.txt');
const tempDir = createTempDirectory();
const timer = testContext.createTrackedTimeout(() => {}, 1000);

// Resources are automatically cleaned up after each test
```

## Integration with Test Setup

The utilities are automatically integrated into the global test setup (`tests/setup.ts`):

```typescript
import { setupEnhancedTests } from './utils/enhanced-test-setup.js';

const testContext = setupEnhancedTests({
  enableCleanup: true,
  enableResourceManagement: true,
  enableMemoryMonitoring: process.env.NODE_ENV === 'development',
  logCleanupReports: process.env.VITEST_LOG_CLEANUP === 'true'
});

// Make test context available globally
(global as any).testContext = testContext;
```

## NPM Scripts

Additional test scripts are available for cleanup-related testing:

```bash
# Run cleanup system tests with logging
npm run test:cleanup

# Run tests with memory monitoring
npm run test:memory

# Run tests with resource usage reporting
npm run test:resources
```

## Environment Variables

- `VITEST_LOG_CLEANUP=true` - Enable cleanup report logging
- `NODE_ENV=development` - Enable memory monitoring in development

## Best Practices

1. **Use Helper Functions**: Prefer `createTempFile()` and `createTempDirectory()` over manual file creation
2. **Register Resources**: Always register resources that need cleanup using the resource manager
3. **Monitor Memory**: Enable memory monitoring during development to catch potential leaks
4. **Custom Cleanup**: Use cleanup callbacks for complex cleanup scenarios
5. **Test Isolation**: Each test gets a clean environment automatically

## Troubleshooting

### Memory Warnings

If you see memory growth warnings:
- Check for unregistered resources that aren't being cleaned up
- Look for circular references or closures holding onto memory
- Consider increasing the memory limit if the growth is expected

### Cleanup Failures

If cleanup fails:
- Check the cleanup report for specific error messages
- Ensure file permissions allow deletion
- Verify that mocks have proper restore methods

### Performance Issues

If tests are slow:
- Disable memory monitoring in CI environments
- Reduce cleanup frequency for non-critical resources
- Use selective cleanup options instead of full cleanup