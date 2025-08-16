// Global test setup file
// This file runs before all tests

import { setupEnhancedTests } from './utils/enhanced-test-setup.js';

// Set up environment variables for testing
process.env.NODE_ENV = 'test';
process.env.AZURE_DEVOPS_ORG_URL = 'https://dev.azure.com/test-org';
process.env.AZURE_DEVOPS_TOKEN = 'test-token';

// Setup enhanced test environment with cleanup and resource management
const testContext = setupEnhancedTests({
  enableCleanup: true,
  enableResourceManagement: true,
  enableMemoryMonitoring: process.env.NODE_ENV === 'development',
  memoryLimit: 100 * 1024 * 1024, // 100MB
  cleanupOptions: {
    cleanupTempFiles: true,
    cleanupMocks: true,
    monitorMemory: true,
    forceGarbageCollection: false,
    cleanupTimers: true,
    maxMemoryGrowth: 50 * 1024 * 1024, // 50MB
    cleanupTimeout: 5000 // 5 seconds
  },
  autoRegisterTimers: true,
  logCleanupReports: process.env.VITEST_LOG_CLEANUP === 'true'
});

// Make test context available globally for tests that need it
(global as any).testContext = testContext;

// Mock console methods to reduce noise in tests (optional)
// Uncomment if you want to suppress console output during tests
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

export {};