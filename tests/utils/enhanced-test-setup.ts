/**
 * Enhanced Test Setup
 * 
 * Provides enhanced test setup utilities that integrate with the cleanup and resource management systems.
 * This module provides helper functions and automatic integration with Vitest lifecycle hooks.
 */
import { beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { testCleanupManager, CleanupOptions, CleanupReport } from './test-cleanup-manager.js';
import { testResourceManager, ResourceType, TestResource } from './test-resource-manager.js';

export interface EnhancedTestOptions {
  enableCleanup?: boolean;
  enableResourceManagement?: boolean;
  enableMemoryMonitoring?: boolean;
  memoryLimit?: number; // in bytes
  cleanupOptions?: CleanupOptions;
  autoRegisterTimers?: boolean;
  logCleanupReports?: boolean;
}

export interface TestContext {
  cleanupManager: typeof testCleanupManager;
  resourceManager: typeof testResourceManager;
  registerResource: (resource: Omit<TestResource, 'createdAt'>) => string;
  createTrackedTimeout: (callback: () => void, delay: number) => NodeJS.Timeout;
  createTrackedInterval: (callback: () => void, delay: number) => NodeJS.Timeout;
  addCleanupCallback: (callback: () => Promise<void> | void) => void;
}

const defaultOptions: Required<EnhancedTestOptions> = {
  enableCleanup: true,
  enableResourceManagement: true,
  enableMemoryMonitoring: true,
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
  logCleanupReports: false
};

let currentOptions: Required<EnhancedTestOptions> = { ...defaultOptions };
let setupComplete = false;

/**
 * Setup enhanced test environment with cleanup and resource management
 */
export function setupEnhancedTests(options: EnhancedTestOptions = {}): TestContext {
  currentOptions = { ...defaultOptions, ...options };
  
  if (!setupComplete) {
    setupTestHooks();
    setupComplete = true;
  }

  return createTestContext();
}

/**
 * Setup Vitest lifecycle hooks for automatic cleanup
 */
function setupTestHooks(): void {
  beforeAll(() => {
    if (currentOptions.enableCleanup) {
      testCleanupManager.initialize();
    }
  });

  beforeEach(() => {
    if (currentOptions.enableCleanup) {
      testCleanupManager.initialize();
    }
  });

  afterEach(async () => {
    if (currentOptions.enableCleanup || currentOptions.enableResourceManagement) {
      await performCleanup();
    }
  });

  afterAll(async () => {
    if (currentOptions.enableCleanup || currentOptions.enableResourceManagement) {
      await performFinalCleanup();
    }
  });
}

/**
 * Perform cleanup after each test
 */
async function performCleanup(): Promise<void> {
  const cleanupPromises: Promise<any>[] = [];

  if (currentOptions.enableCleanup) {
    cleanupPromises.push(
      testCleanupManager.cleanup(currentOptions.cleanupOptions)
        .then(report => {
          if (currentOptions.logCleanupReports) {
            logCleanupReport(report);
          }
          checkMemoryLimits(report);
        })
    );
  }

  if (currentOptions.enableResourceManagement) {
    cleanupPromises.push(
      testResourceManager.cleanupAll()
        .then(result => {
          if (currentOptions.logCleanupReports && result.errors.length > 0) {
            console.warn('Resource cleanup errors:', result.errors);
          }
        })
    );
  }

  await Promise.all(cleanupPromises);
}

/**
 * Perform final cleanup after all tests
 */
async function performFinalCleanup(): Promise<void> {
  await performCleanup();
  
  if (currentOptions.enableCleanup) {
    testCleanupManager.reset();
  }
  
  if (currentOptions.enableResourceManagement) {
    testResourceManager.reset();
  }
}

/**
 * Log cleanup report to console
 */
function logCleanupReport(report: CleanupReport): void {
  if (report.errors.length > 0 || report.warnings.length > 0) {
    console.log('Cleanup Report:', {
      tempFilesRemoved: report.tempFilesRemoved,
      mocksCleared: report.mocksCleared,
      timersCleared: report.timersCleared,
      memoryGrowth: `${Math.round(report.memoryGrowth / 1024 / 1024 * 100) / 100} MB`,
      duration: `${report.cleanupDuration}ms`,
      warnings: report.warnings,
      errors: report.errors
    });
  }
}

/**
 * Check memory usage and warn if exceeding limits
 */
function checkMemoryLimits(report: CleanupReport): void {
  if (currentOptions.enableMemoryMonitoring && report.memoryGrowth > currentOptions.memoryLimit) {
    console.warn(
      `Memory usage (${Math.round(report.memoryGrowth / 1024 / 1024 * 100) / 100} MB) ` +
      `exceeds limit (${Math.round(currentOptions.memoryLimit / 1024 / 1024 * 100) / 100} MB)`
    );
  }
}

/**
 * Create test context with helper functions
 */
function createTestContext(): TestContext {
  return {
    cleanupManager: testCleanupManager,
    resourceManager: testResourceManager,
    
    registerResource: (resource: Omit<TestResource, 'createdAt'>) => {
      return testResourceManager.register(resource);
    },

    createTrackedTimeout: (callback: () => void, delay: number) => {
      const timer = setTimeout(callback, delay);
      
      if (currentOptions.autoRegisterTimers) {
        testResourceManager.registerTimer(timer, 'timeout');
      }
      
      if (currentOptions.enableCleanup) {
        testCleanupManager.trackTimer(timer);
      }
      
      return timer;
    },

    createTrackedInterval: (callback: () => void, delay: number) => {
      const timer = setInterval(callback, delay);
      
      if (currentOptions.autoRegisterTimers) {
        testResourceManager.registerTimer(timer, 'interval');
      }
      
      if (currentOptions.enableCleanup) {
        testCleanupManager.trackInterval(timer);
      }
      
      return timer;
    },

    addCleanupCallback: (callback: () => Promise<void> | void) => {
      if (currentOptions.enableCleanup) {
        testCleanupManager.registerCleanupCallback(callback);
      }
    }
  };
}

/**
 * Helper function to create a temporary file with automatic cleanup
 */
export function createTempFile(content: string = '', extension: string = '.tmp'): string {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  
  const tempDir = os.tmpdir();
  const fileName = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}${extension}`;
  const filePath = path.join(tempDir, fileName);
  
  fs.writeFileSync(filePath, content);
  
  if (currentOptions.enableResourceManagement) {
    testResourceManager.registerFile(filePath);
  }
  
  if (currentOptions.enableCleanup) {
    testCleanupManager.registerTempDirectory(path.dirname(filePath));
  }
  
  return filePath;
}

/**
 * Helper function to create a temporary directory with automatic cleanup
 */
export function createTempDirectory(): string {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  
  const tempDir = os.tmpdir();
  const dirName = `test-dir-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const dirPath = path.join(tempDir, dirName);
  
  fs.mkdirSync(dirPath, { recursive: true });
  
  if (currentOptions.enableResourceManagement) {
    testResourceManager.registerDirectory(dirPath);
  }
  
  if (currentOptions.enableCleanup) {
    testCleanupManager.registerTempDirectory(dirPath);
  }
  
  return dirPath;
}

/**
 * Helper function to register a mock with automatic cleanup
 */
export function registerMock(mock: any, name?: string): string {
  if (currentOptions.enableResourceManagement) {
    return testResourceManager.registerMock(mock, name);
  }
  
  if (currentOptions.enableCleanup) {
    testCleanupManager.registerMock(name || 'unnamed-mock', mock);
  }
  
  return `mock-${Date.now()}`;
}

/**
 * Helper function to check memory usage
 */
export function checkMemoryUsage(): {
  current: number;
  growth: number;
  limit: number;
  withinLimit: boolean;
} {
  const memoryReport = testCleanupManager.getMemoryReport();
  const current = memoryReport.current.heapUsed;
  const growth = memoryReport.growth;
  const limit = currentOptions.memoryLimit;
  
  return {
    current,
    growth,
    limit,
    withinLimit: growth <= limit
  };
}

/**
 * Helper function to get resource statistics
 */
export function getResourceStats() {
  return testResourceManager.getStats();
}

/**
 * Reset enhanced test setup (useful for test isolation)
 */
export function resetEnhancedTests(): void {
  if (currentOptions.enableCleanup) {
    testCleanupManager.reset();
  }
  
  if (currentOptions.enableResourceManagement) {
    testResourceManager.reset();
  }
  
  setupComplete = false;
}

// Export the test context type for use in tests
export type { TestContext };