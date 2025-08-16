/**
 * Test Resource Manager
 * 
 * Manages test resources and provides cleanup functionality for:
 * - File system resources (temporary files, directories)
 * - Network resources (mock servers, connections)
 * - Database resources (test databases, connections)
 * - Timer resources (timeouts, intervals)
 * - Mock resources (spies, stubs, mocks)
 */

export interface TestResource {
  id: string;
  type: ResourceType;
  data: any;
  cleanup: () => Promise<void> | void;
  createdAt: number;
  memoryEstimate?: number; // bytes
}

export enum ResourceType {
  FILE = 'file',
  DIRECTORY = 'directory',
  NETWORK = 'network',
  DATABASE = 'database',
  TIMER = 'timer',
  MOCK = 'mock',
  OTHER = 'other'
}

export interface ResourceStats {
  totalResources: number;
  resourcesByType: Record<ResourceType, number>;
  totalMemoryEstimate: number;
  oldestResource: number; // timestamp
  newestResource: number; // timestamp
}

export interface CleanupResult {
  resourcesCleanedUp: number;
  errors: string[];
  duration: number;
}

class TestResourceManager {
  private static instance: TestResourceManager;
  private resources: Map<string, TestResource> = new Map();
  private cleanupInProgress = false;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): TestResourceManager {
    if (!TestResourceManager.instance) {
      TestResourceManager.instance = new TestResourceManager();
    }
    return TestResourceManager.instance;
  }

  /**
   * Register a resource for cleanup
   */
  register(resource: Omit<TestResource, 'createdAt'>): string {
    const fullResource: TestResource = {
      ...resource,
      createdAt: Date.now()
    };
    
    this.resources.set(resource.id, fullResource);
    return resource.id;
  }

  /**
   * Unregister a resource (useful when manually cleaned up)
   */
  unregister(id: string): boolean {
    return this.resources.delete(id);
  }

  /**
   * Get resource by ID
   */
  getResource(id: string): TestResource | undefined {
    return this.resources.get(id);
  }

  /**
   * Get all resources of a specific type
   */
  getResourcesByType(type: ResourceType): TestResource[] {
    return Array.from(this.resources.values()).filter(r => r.type === type);
  }

  /**
   * Get resource statistics
   */
  getStats(): ResourceStats {
    const resources = Array.from(this.resources.values());
    const resourcesByType = {} as Record<ResourceType, number>;
    
    // Initialize counts
    Object.values(ResourceType).forEach(type => {
      resourcesByType[type] = 0;
    });

    let totalMemoryEstimate = 0;
    let oldestResource = Date.now();
    let newestResource = 0;

    resources.forEach(resource => {
      resourcesByType[resource.type]++;
      totalMemoryEstimate += resource.memoryEstimate || 0;
      oldestResource = Math.min(oldestResource, resource.createdAt);
      newestResource = Math.max(newestResource, resource.createdAt);
    });

    return {
      totalResources: resources.length,
      resourcesByType,
      totalMemoryEstimate,
      oldestResource: resources.length > 0 ? oldestResource : 0,
      newestResource: resources.length > 0 ? newestResource : 0
    };
  }

  /**
   * Cleanup resources by type
   */
  async cleanupByType(type: ResourceType): Promise<CleanupResult> {
    const startTime = Date.now();
    const result: CleanupResult = {
      resourcesCleanedUp: 0,
      errors: [],
      duration: 0
    };

    const resourcesToCleanup = this.getResourcesByType(type);
    
    for (const resource of resourcesToCleanup) {
      try {
        await resource.cleanup();
        this.resources.delete(resource.id);
        result.resourcesCleanedUp++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.errors.push(`Failed to cleanup resource ${resource.id}: ${errorMessage}`);
      }
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Cleanup all resources
   */
  async cleanupAll(): Promise<CleanupResult> {
    if (this.cleanupInProgress) {
      throw new Error('Cleanup already in progress');
    }

    this.cleanupInProgress = true;
    const startTime = Date.now();
    const result: CleanupResult = {
      resourcesCleanedUp: 0,
      errors: [],
      duration: 0
    };

    try {
      const resources = Array.from(this.resources.values());
      
      // Sort by creation time (cleanup newest first to avoid dependency issues)
      resources.sort((a, b) => b.createdAt - a.createdAt);

      for (const resource of resources) {
        try {
          await resource.cleanup();
          this.resources.delete(resource.id);
          result.resourcesCleanedUp++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          result.errors.push(`Failed to cleanup resource ${resource.id}: ${errorMessage}`);
        }
      }
    } finally {
      this.cleanupInProgress = false;
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Cleanup resources older than specified age (in milliseconds)
   */
  async cleanupOlderThan(ageMs: number): Promise<CleanupResult> {
    const cutoffTime = Date.now() - ageMs;
    const startTime = Date.now();
    const result: CleanupResult = {
      resourcesCleanedUp: 0,
      errors: [],
      duration: 0
    };

    const resourcesToCleanup = Array.from(this.resources.values())
      .filter(r => r.createdAt < cutoffTime);

    for (const resource of resourcesToCleanup) {
      try {
        await resource.cleanup();
        this.resources.delete(resource.id);
        result.resourcesCleanedUp++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.errors.push(`Failed to cleanup resource ${resource.id}: ${errorMessage}`);
      }
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Check if cleanup is in progress
   */
  isCleanupInProgress(): boolean {
    return this.cleanupInProgress;
  }

  /**
   * Reset the resource manager (clear all resources without cleanup)
   */
  reset(): void {
    this.resources.clear();
    this.cleanupInProgress = false;
  }

  /**
   * Helper method to register a file resource
   */
  registerFile(filePath: string, cleanup?: () => Promise<void> | void): string {
    const id = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return this.register({
      id,
      type: ResourceType.FILE,
      data: { path: filePath },
      cleanup: cleanup || (() => {
        const fs = require('fs');
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }),
      memoryEstimate: 1024 // Estimate 1KB per file entry
    });
  }

  /**
   * Helper method to register a directory resource
   */
  registerDirectory(dirPath: string, cleanup?: () => Promise<void> | void): string {
    const id = `dir-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return this.register({
      id,
      type: ResourceType.DIRECTORY,
      data: { path: dirPath },
      cleanup: cleanup || (() => {
        const fs = require('fs');
        if (fs.existsSync(dirPath)) {
          fs.rmSync(dirPath, { recursive: true, force: true });
        }
      }),
      memoryEstimate: 2048 // Estimate 2KB per directory entry
    });
  }

  /**
   * Helper method to register a network resource
   */
  registerNetwork(connection: any, cleanup: () => Promise<void> | void): string {
    const id = `net-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return this.register({
      id,
      type: ResourceType.NETWORK,
      data: connection,
      cleanup,
      memoryEstimate: 4096 // Estimate 4KB per network connection
    });
  }

  /**
   * Helper method to register a database resource
   */
  registerDatabase(connection: any, cleanup: () => Promise<void> | void): string {
    const id = `db-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return this.register({
      id,
      type: ResourceType.DATABASE,
      data: connection,
      cleanup,
      memoryEstimate: 8192 // Estimate 8KB per database connection
    });
  }

  /**
   * Helper method to register a timer resource
   */
  registerTimer(timer: NodeJS.Timeout, type: 'timeout' | 'interval' = 'timeout'): string {
    const id = `timer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return this.register({
      id,
      type: ResourceType.TIMER,
      data: { timer, type },
      cleanup: () => {
        if (type === 'timeout') {
          clearTimeout(timer);
        } else {
          clearInterval(timer);
        }
      },
      memoryEstimate: 512 // Estimate 512 bytes per timer
    });
  }

  /**
   * Helper method to register a mock resource
   */
  registerMock(mock: any, name?: string): string {
    const id = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return this.register({
      id,
      type: ResourceType.MOCK,
      data: { mock, name },
      cleanup: () => {
        if (mock && typeof mock.mockRestore === 'function') {
          mock.mockRestore();
        } else if (mock && typeof mock.restore === 'function') {
          mock.restore();
        }
      },
      memoryEstimate: 1024 // Estimate 1KB per mock
    });
  }
}

// Export singleton instance
export const testResourceManager = TestResourceManager.getInstance();
export { TestResourceManager };