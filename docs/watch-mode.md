# Test Watch Mode Configuration

This document describes the enhanced test watch mode configuration for development, including intelligent test re-running, clear console output, and resource management.

## Overview

The project provides multiple watch mode options optimized for different development workflows:

- **Standard Watch Mode**: Basic file watching with Vitest's built-in capabilities
- **Enhanced Watch Mode**: Advanced configuration with memory monitoring and cleanup
- **Targeted Watch Modes**: Focused watching for unit tests, integration tests, or specific patterns

## Watch Mode Scripts

### Basic Watch Modes

#### `npm run test:watch`
Standard watch mode with intelligent file change detection:
```bash
npm run test:watch
```

**Features:**
- Watches all test files and source files
- Re-runs affected tests on file changes
- Clear console output on re-runs
- Optimized for development speed

#### `npm run test:watch:unit`
Watch unit tests only:
```bash
npm run test:watch:unit
```

**Features:**
- Focuses on `tests/unit/**/*.test.ts` files
- Faster execution for unit test development
- Isolated from integration test changes

#### `npm run test:watch:integration`
Watch integration tests only:
```bash
npm run test:watch:integration
```

**Features:**
- Focuses on `tests/integration/**/*.test.ts` files
- Useful for API and end-to-end test development
- Separate from unit test execution

### Advanced Watch Modes

#### `npm run test:watch:coverage`
Watch mode with live coverage reporting:
```bash
npm run test:watch:coverage
```

**Features:**
- Real-time coverage updates
- HTML coverage report generation
- Coverage threshold monitoring

#### `npm run test:watch:ui`
Watch mode with Vitest UI:
```bash
npm run test:watch:ui
```

**Features:**
- Web-based test runner interface
- Visual test results and coverage
- Interactive test filtering and debugging

#### `npm run test:watch:related`
Watch mode that runs tests related to changed files:
```bash
npm run test:watch:related
```

**Features:**
- Intelligent test selection based on file changes
- Faster feedback for focused development
- Automatic related test discovery

#### `npm run test:watch:enhanced`
Enhanced watch mode with advanced features:
```bash
npm run test:watch:enhanced
```

**Features:**
- Memory usage monitoring
- Automatic cleanup between runs
- Clear console output with run summaries
- Performance tracking

## Watch Mode Configuration

### Standard Configuration (`vitest.config.ts`)

The main configuration includes watch-optimized settings:

```typescript
export default defineConfig({
  test: {
    // Watch mode configuration
    watch: !process.env.CI,
    watchExclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/test-results/**',
      '**/.git/**',
      '**/test-performance.json',
      '**/test-performance-history.json',
      '**/*.log',
      '**/tmp/**'
    ],
    
    // Watch mode optimizations
    ...((!process.env.CI) && {
      clearScreen: true,
      changed: true,
      pool: 'threads',
      poolOptions: {
        threads: {
          singleThread: false,
          minThreads: 1,
          maxThreads: 4
        }
      }
    })
  }
});
```

### Enhanced Configuration (`vitest.watch.config.ts`)

The enhanced configuration provides additional optimizations for watch mode:

```typescript
export default defineConfig({
  test: {
    // Enhanced watch mode settings
    watch: true,
    clearScreen: true,
    changed: true,
    
    // Optimized pool configuration
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: Math.min(4, require('os').cpus().length),
        isolate: false // Better performance in watch mode
      }
    },
    
    // Faster test discovery
    forceRerunTriggers: [
      '**/package.json/**',
      '**/vitest.config.*/**',
      '**/vite.config.*/**'
    ],
    
    // Optimized for development
    testTimeout: 5000,
    logHeapUsage: false,
    
    // Watch-specific setup
    setupFiles: ['./tests/setup.ts', './tests/watch-setup.ts']
  }
});
```

## Intelligent File Watching

### File Change Detection

The watch mode intelligently detects file changes and determines the optimal test strategy:

#### Configuration Changes
- **Files**: `package.json`, `vitest.config.ts`, `tsconfig.json`
- **Action**: Run all tests (full suite)
- **Reason**: Configuration changes may affect all tests

#### Test File Changes
- **Files**: `tests/**/*.test.ts`
- **Action**: Run the specific changed test file
- **Reason**: Direct test changes only affect that test

#### Source File Changes
- **Files**: `src/**/*.ts`
- **Action**: Run related tests based on file path mapping
- **Reason**: Source changes may affect multiple related tests

### Related Test Discovery

The system automatically discovers related tests for source file changes:

#### Direct Mapping
```
src/clients/build-client.ts → tests/unit/clients/build-client.test.ts
src/tools/agent-tools.ts   → tests/unit/tools/agent-tools.test.ts
src/utils/validators.ts    → tests/unit/utils/validators.test.ts
```

#### Category Mapping
```
src/clients/*.ts → tests/unit/clients/**/*.test.ts
src/tools/*.ts   → tests/unit/tools/**/*.test.ts
src/utils/*.ts   → tests/unit/utils/**/*.test.ts
```

#### Integration Test Triggers
Major components trigger integration tests:
- `src/server.ts` → `tests/integration/**/*.test.ts`
- `src/config.ts` → `tests/integration/**/*.test.ts`
- `src/tools/*.ts` → `tests/integration/**/*.test.ts`

## Resource Management

### Memory Monitoring

The enhanced watch mode includes memory usage monitoring:

```typescript
// Memory tracking in tests/watch-setup.ts
beforeEach(() => {
  testStartMemory = process.memoryUsage();
});

afterEach(() => {
  checkMemoryUsage();
  if (global.gc) {
    global.gc();
  }
});
```

**Features:**
- Tracks memory usage per test
- Warns about potential memory leaks
- Forces garbage collection when available
- Shows memory summary after test runs

### Automatic Cleanup

The watch setup automatically cleans up resources:

```typescript
async function cleanupTestArtifacts() {
  try {
    const tempManager = TempManager.getInstance();
    await tempManager.cleanup(0); // Clean up all files
  } catch (error) {
    // Ignore cleanup errors in watch mode
  }
}
```

**Features:**
- Cleans up temporary files between runs
- Clears active timers and intervals
- Removes test artifacts
- Handles cleanup errors gracefully

### Timer Management

Automatic timer cleanup prevents resource leaks:

```typescript
function clearAllTimers() {
  // Clear any active timeouts
  const highestTimeoutId = setTimeout(() => {}, 0);
  for (let i = 0; i <= highestTimeoutId; i++) {
    clearTimeout(i);
  }
  
  // Clear any active intervals
  const highestIntervalId = setInterval(() => {}, 0);
  clearInterval(highestIntervalId);
  for (let i = 0; i <= highestIntervalId; i++) {
    clearInterval(i);
  }
}
```

## Development Workflow

### Recommended Workflow

1. **Start with unit tests** during initial development:
   ```bash
   npm run test:watch:unit
   ```

2. **Switch to integration tests** when testing component interactions:
   ```bash
   npm run test:watch:integration
   ```

3. **Use enhanced mode** for comprehensive development:
   ```bash
   npm run test:watch:enhanced
   ```

4. **Enable coverage** when focusing on test completeness:
   ```bash
   npm run test:watch:coverage
   ```

### Performance Tips

#### Optimize Test Speed
- Use `--related` flag to run only affected tests
- Focus on specific test categories during development
- Disable coverage in watch mode for faster execution
- Use `--bail=1` to stop on first failure

#### Memory Management
- Monitor memory usage with enhanced watch mode
- Force garbage collection with `--expose-gc` flag
- Clean up resources in test teardown
- Avoid creating large objects in test setup

#### File Organization
- Keep test files close to source files for better related test discovery
- Use descriptive test file names for easier identification
- Group related tests in the same directory structure as source files

## Troubleshooting

### Common Issues

#### Watch Mode Not Detecting Changes
```bash
# Check file watching limits (macOS/Linux)
ulimit -n

# Increase if needed
ulimit -n 4096
```

#### High Memory Usage
```bash
# Run with garbage collection exposed
node --expose-gc npm run test:watch:enhanced

# Monitor memory usage
npm run test:watch:coverage
```

#### Slow Test Execution
```bash
# Use related tests only
npm run test:watch:related

# Focus on specific test category
npm run test:watch:unit

# Disable coverage for speed
npm run test:watch
```

### Debug Mode

Enable debug output for troubleshooting:

```bash
# Enable Vitest debug output
DEBUG=vitest:* npm run test:watch

# Enable Node.js debug output
NODE_DEBUG=* npm run test:watch:enhanced
```

### Performance Monitoring

Monitor watch mode performance:

```bash
# Run with performance monitoring
npm run test:watch:enhanced

# Check memory usage
node --inspect npm run test:watch:coverage
```

## Best Practices

### File Organization
- Keep test files organized to match source structure
- Use consistent naming conventions for better discovery
- Group related tests together for efficient watching

### Test Writing
- Write focused, fast unit tests for watch mode
- Use proper setup and teardown to avoid resource leaks
- Mock external dependencies to improve test speed

### Development Workflow
- Start with failing tests (TDD approach)
- Use watch mode for rapid feedback during development
- Switch between different watch modes based on development phase
- Monitor memory usage during long development sessions

### Resource Management
- Clean up resources in test teardown
- Avoid creating unnecessary objects in test setup
- Use the enhanced watch mode for memory monitoring
- Force garbage collection when needed

## Integration with IDEs

### VS Code
Configure VS Code to work with watch mode:

```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Test Watch",
      "type": "shell",
      "command": "npm run test:watch",
      "group": "test",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      },
      "isBackground": true
    }
  ]
}
```

### WebStorm/IntelliJ
Configure run configurations for different watch modes:

1. Create new Node.js configuration
2. Set script to `test:watch:unit`
3. Enable "Single instance only"
4. Set working directory to project root

## Advanced Configuration

### Custom Watch Patterns

Extend watch patterns for specific needs:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    watchExclude: [
      // Add custom patterns
      '**/custom-temp/**',
      '**/build-artifacts/**'
    ]
  }
});
```

### Environment-Specific Settings

Configure different settings for different environments:

```typescript
// vitest.config.ts
const isWatchMode = process.argv.includes('--watch');
const isDevelopment = process.env.NODE_ENV === 'development';

export default defineConfig({
  test: {
    // Watch-specific optimizations
    ...(isWatchMode && {
      testTimeout: 5000,
      clearScreen: true,
      logHeapUsage: false
    }),
    
    // Development-specific settings
    ...(isDevelopment && {
      globals: true,
      setupFiles: ['./tests/watch-setup.ts']
    })
  }
});
```