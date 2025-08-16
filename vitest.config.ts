import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',
    
    // Test file patterns
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov', 'text-summary'],
      reportsDirectory: './coverage',
      
      // Coverage thresholds - meeting 80% requirement across all metrics
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
        },
        'src/config.ts': {
          branches: 90,
          functions: 100,
          lines: 90,
          statements: 90
        }
      },
      
      // Include/exclude patterns for coverage
      include: ['src/**/*.ts'],
      exclude: [
        // Test files
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'tests/**',
        
        // Type definitions (no executable code)
        'src/types/**',
        'src/**/*.d.ts',
        
        // Build artifacts
        'dist/**',
        'node_modules/**',
        
        // Configuration files
        '*.config.ts',
        '*.config.js',
        
        // Entry point (covered by integration tests)
        'src/index.ts',
        
        // Export-only files
        'src/clients/index.ts',
        
        // Enum mappers (utility functions with limited test value)
        'src/utils/enum-mappers.ts'
      ],
      
      // Additional coverage options
      all: true,
      clean: true,
      skipFull: false
    },
    
    // Test timeout
    testTimeout: 10000,
    
    // Setup files
    setupFiles: ['./tests/setup.ts'],
    
    // Global test configuration
    globals: true,
    
    // Reporter configuration
    reporter: process.env.CI 
      ? ['verbose', 'json', 'junit'] 
      : ['verbose', 'json'],
    outputFile: {
      json: './test-results.json',
      junit: './test-results.xml'
    },
    
    // Test execution monitoring
    logHeapUsage: true,
    
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
  }
});