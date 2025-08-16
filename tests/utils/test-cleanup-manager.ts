/**
 * Test Cleanup Manager
 * 
 * Comprehensive test cleanup and resource management system that handles:
 * - Automatic cleanup of temporary files created during tests
 * - Proper mock cleanup between test runs
 * - Memory usage monitoring for test execution
 * - Resource leak detection and prevention
 */
import { existsSync, rmSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { TempManager } from '../../src/utils/temp-manager.js';

export interface CleanupOptions {
  cleanupTempFiles?: boolean;
  cleanupMocks?: boolean;
  monitorMemory?: boolean;
  forceGarbageCollection?: boolean;
  cleanupTimers?: boolean;
  maxMemoryGrowth?: number; // in bytes
  cleanupTimeout?: number; // in milliseconds
}

export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
}

export interface CleanupReport {
  tempFilesRemoved: number;
  mocksCleared: number;
  timersCleared: number;
  memoryGrowth: number;
  cleanupDuration: number;
  warnings: string[];
  errors: string[];
}

class TestCleanupManager {
  private static instance: TestCleanupManager;
  private memorySnapshots: MemorySnapshot[] = [];
  private initialMemory: MemorySnapshot | null = null;
  private activeTimers: Set<NodeJS.Timeout> = new Set();
  private activeIntervals: Set<NodeJS.Timeout> = new Set();
  private mockRegistry: Map<string, any> = new Map();
  private tempDirectories: Set<string> = new Set();
  private cleanupCallbacks: Array<() => Promise<void> | void> = [];

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): TestCleanupManager {
    if (!TestCleanupManager.instance) {
      TestCleanupManager.instance = new TestCleanupManager();
    }
    return TestCleanupManager.instance;
  }

  /**
   * Initialize cleanup manager for a test run
   */
  initialize(): void {
    this.initialMemory = this.captureMemorySnapshot();
    this.memorySnapshots = [this.initialMemory];
    this.activeTimers.clear();
    this.activeIntervals.clear();
    this.mockRegistry.clear();
    this.tempDirectories.clear();
    this.cleanupCallbacks = [];
  }

  /**
   * Capture a memory snapshot
   */
  captureMemorySnapshot(): MemorySnapshot {
    const memory = process.memoryUsage();
    return {
      timestamp: Date.now(),
      heapUsed: memory.heapUsed,
      heapTotal: memory.heapTotal,
      external: memory.external,
      rss: memory.rss,
      arrayBuffers: memory.arrayBuffers || 0
    };
  }

  /**
   * Register a temporary directory for cleanup
   */
  registerTempDirectory(path: string): void {
    this.tempDirectories.add(path);
  }

  /**
   * Register a mock for cleanup
   */
  registerMock(name: string, mock: any): void {
    this.mockRegistry.set(name, mock);
  }

  /**
   * Register a cleanup callback
   */
  registerCleanupCallback(callback: () => Promise<void> | void): void {
    this.cleanupCallbacks.push(callback);
  }

  /**
   * Track a timer for cleanup
   */
  trackTimer(timer: NodeJS.Timeout): NodeJS.Timeout {
    this.activeTimers.add(timer);
    return timer;
  }

  /**
   * Track an interval for cleanup
   */
  trackInterval(interval: NodeJS.Timeout): NodeJS.Timeout {
    this.activeIntervals.add(interval);
    return interval;
  }

  /**
   * Perform comprehensive cleanup
   */
  async cleanup(options: CleanupOptions = {}): Promise<CleanupReport> {
    const startTime = Date.now();
    const report: CleanupReport = {
      tempFilesRemoved: 0,
      mocksCleared: 0,
      timersCleared: 0,
      memoryGrowth: 0,
      cleanupDuration: 0,
      warnings: [],
      errors: []
    };

    try {
      // Cleanup temporary files
      if (options.cleanupTempFiles !== false) {
        report.tempFilesRemoved = await this.cleanupTempFiles(report);
      }

      // Cleanup mocks
      if (options.cleanupMocks !== false) {
        report.mocksCleared = this.cleanupMocks(report);
      }

      // Cleanup timers and intervals
      if (options.cleanupTimers !== false) {
        report.timersCleared = this.cleanupTimers(report);
      }

      // Run custom cleanup callbacks
      await this.runCleanupCallbacks(report);

      // Monitor memory usage
      if (options.monitorMemory !== false) {
        report.memoryGrowth = this.checkMemoryUsage(options, report);
      }

      // Force garbage collection if requested
      if (options.forceGarbageCollection && global.gc) {
        global.gc();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      report.errors.push(`Cleanup failed: ${errorMessage}`);
    }

    report.cleanupDuration = Date.now() - startTime;
    return report;
  }

  /**
   * Cleanup temporary files and directories
   */
  private async cleanupTempFiles(report: CleanupReport): Promise<number> {
    let filesRemoved = 0;

    try {
      // Cleanup TempManager files
      const tempManager = TempManager.getInstance();
      const tempResult = await tempManager.cleanup(0); // Clean all files
      filesRemoved += tempResult.filesRemoved;

      // Cleanup registered temp directories
      for (const tempDir of this.tempDirectories) {
        if (existsSync(tempDir)) {
          try {
            const files = this.countFilesRecursively(tempDir);
            rmSync(tempDir, { recursive: true, force: true });
            filesRemoved += files;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            report.warnings.push(`Failed to remove temp directory ${tempDir}: ${errorMessage}`);
          }
        }
      }

      // Cleanup test artifacts in common locations
      const artifactPaths = [
        'test-results.json',
        'test-results.xml',
        'test-performance.json',
        'coverage/tmp',
        'tmp/test-*'
      ];

      for (const artifactPath of artifactPaths) {
        if (existsSync(artifactPath)) {
          try {
            if (statSync(artifactPath).isDirectory()) {
              const files = this.countFilesRecursively(artifactPath);
              rmSync(artifactPath, { recursive: true, force: true });
              filesRemoved += files;
            } else {
              rmSync(artifactPath, { force: true });
              filesRemoved += 1;
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            report.warnings.push(`Failed to remove artifact ${artifactPath}: ${errorMessage}`);
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      report.errors.push(`Temp file cleanup failed: ${errorMessage}`);
    }

    return filesRemoved;
  }

  /**
   * Count files recursively in a directory
   */
  private countFilesRecursively(dirPath: string): number {
    let count = 0;
    try {
      const items = readdirSync(dirPath);
      for (const item of items) {
        const itemPath = join(dirPath, item);
        const stats = statSync(itemPath);
        if (stats.isDirectory()) {
          count += this.countFilesRecursively(itemPath);
        } else {
          count += 1;
        }
      }
    } catch (error) {
      // Ignore errors when counting files
    }
    return count;
  }

  /**
   * Cleanup mocks and restore original implementations
   */
  private cleanupMocks(report: CleanupReport): number {
    let mocksCleared = 0;

    try {
      // Clear registered mocks
      for (const [name, mock] of this.mockRegistry) {
        try {
          if (mock && typeof mock.mockRestore === 'function') {
            mock.mockRestore();
          } else if (mock && typeof mock.restore === 'function') {
            mock.restore();
          }
          mocksCleared++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          report.warnings.push(`Failed to restore mock ${name}: ${errorMessage}`);
        }
      }

      // Clear Vitest mocks if available
      if (typeof vi !== 'undefined' && vi.clearAllMocks) {
        vi.clearAllMocks();
      }

      // Clear Jest mocks if available
      if (typeof jest !== 'undefined' && jest.clearAllMocks) {
        jest.clearAllMocks();
      }

      this.mockRegistry.clear();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      report.errors.push(`Mock cleanup failed: ${errorMessage}`);
    }

    return mocksCleared;
  }

  /**
   * Cleanup active timers and intervals
   */
  private cleanupTimers(report: CleanupReport): number {
    let timersCleared = 0;

    try {
      // Clear tracked timers
      for (const timer of this.activeTimers) {
        clearTimeout(timer);
        timersCleared++;
      }
      this.activeTimers.clear();

      // Clear tracked intervals
      for (const interval of this.activeIntervals) {
        clearInterval(interval);
        timersCleared++;
      }
      this.activeIntervals.clear();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      report.errors.push(`Timer cleanup failed: ${errorMessage}`);
    }

    return timersCleared;
  }

  /**
   * Run custom cleanup callbacks
   */
  private async runCleanupCallbacks(report: CleanupReport): Promise<void> {
    for (const callback of this.cleanupCallbacks) {
      try {
        await callback();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        report.warnings.push(`Cleanup callback failed: ${errorMessage}`);
      }
    }
  }

  /**
   * Check memory usage and detect potential leaks
   */
  private checkMemoryUsage(options: CleanupOptions, report: CleanupReport): number {
    const currentMemory = this.captureMemorySnapshot();
    this.memorySnapshots.push(currentMemory);

    if (!this.initialMemory) {
      return 0;
    }

    const memoryGrowth = currentMemory.heapUsed - this.initialMemory.heapUsed;
    const maxGrowth = options.maxMemoryGrowth || 50 * 1024 * 1024; // 50MB default

    if (memoryGrowth > maxGrowth) {
      report.warnings.push(
        `Memory growth (${this.formatBytes(memoryGrowth)}) exceeds threshold (${this.formatBytes(maxGrowth)})`
      );
    }

    // Check for rapid memory growth
    if (this.memorySnapshots.length >= 2) {
      const previousSnapshot = this.memorySnapshots[this.memorySnapshots.length - 2];
      const recentGrowth = currentMemory.heapUsed - previousSnapshot.heapUsed;
      if (recentGrowth > 10 * 1024 * 1024) { // 10MB rapid growth
        report.warnings.push(
          `Rapid memory growth detected: ${this.formatBytes(recentGrowth)} since last check`
        );
      }
    }

    return memoryGrowth;
  }

  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get memory usage report
   */
  getMemoryReport(): {
    initial: MemorySnapshot | null;
    current: MemorySnapshot;
    growth: number;
    snapshots: MemorySnapshot[];
  } {
    const current = this.captureMemorySnapshot();
    const growth = this.initialMemory ? current.heapUsed - this.initialMemory.heapUsed : 0;

    return {
      initial: this.initialMemory,
      current,
      growth,
      snapshots: [...this.memorySnapshots]
    };
  }

  /**
   * Reset the cleanup manager
   */
  reset(): void {
    this.memorySnapshots = [];
    this.initialMemory = null;
    this.activeTimers.clear();
    this.activeIntervals.clear();
    this.mockRegistry.clear();
    this.tempDirectories.clear();
    this.cleanupCallbacks = [];
  }
}

// Export singleton instance
export const testCleanupManager = TestCleanupManager.getInstance();
export { TestCleanupManager };