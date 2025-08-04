import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { constants, rmSync } from 'node:fs';

export interface DownloadMetadata {
  path: string;
  category: 'logs' | 'artifacts';
  buildId: number;
  filename: string;
  size: number;
  downloadedAt: Date;
  ageHours: number;
}

export interface CleanupResult {
  filesRemoved: number;
  spaceSaved: number;
  errors: string[];
}

export interface TempDirInfo {
  path: string;
  totalSize: number;
  fileCount: number;
  oldestFile?: {
    path: string;
    age: number;
  };
}

export class TempManager {
  private static instance: TempManager;
  private baseDir: string | null = null;
  private initialized: boolean = false;
  private readonly prefix = 'ado-mcp-server';

  private constructor() {
    this.registerCleanupHandlers();
  }

  static getInstance(): TempManager {
    if (!TempManager.instance) {
      TempManager.instance = new TempManager();
    }
    return TempManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Create unique temp directory for this process
      const tempRoot = await fs.realpath(os.tmpdir());
      this.baseDir = await fs.mkdtemp(
        path.join(tempRoot, `${this.prefix}-${process.pid}-`)
      );

      // Create subdirectories
      await fs.mkdir(path.join(this.baseDir, 'downloads'), { recursive: true });
      await fs.mkdir(path.join(this.baseDir, 'downloads', 'logs'), { recursive: true });
      await fs.mkdir(path.join(this.baseDir, 'downloads', 'artifacts'), { recursive: true });

      this.initialized = true;

      // Clean up old temp directories from previous runs
      await this.cleanupOldTempDirs(tempRoot);
    } catch (error) {
      throw new Error(`Failed to initialize temp directory: ${error}`);
    }
  }

  async getTempDir(): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.baseDir!;
  }

  async getDownloadPath(
    category: 'logs' | 'artifacts',
    buildId: number,
    filename: string
  ): Promise<string> {
    // Validate parameters
    if (!Number.isInteger(buildId) || buildId <= 0) {
      throw new Error(`Invalid buildId: ${buildId}. Must be a positive integer.`);
    }
    
    if (!['logs', 'artifacts'].includes(category)) {
      throw new Error(`Invalid category: ${category}. Must be 'logs' or 'artifacts'.`);
    }
    
    if (!filename || typeof filename !== 'string' || filename.trim().length === 0) {
      throw new Error('Filename must be a non-empty string.');
    }
    
    if (!this.initialized) {
      await this.initialize();
    }

    const categoryDir = path.join(this.baseDir!, 'downloads', category, buildId.toString());
    await fs.mkdir(categoryDir, { recursive: true });

    // Sanitize filename to prevent path traversal
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.\-_]/g, '-');
    return path.join(categoryDir, sanitizedFilename);
  }

  async listDownloads(): Promise<DownloadMetadata[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    const downloads: DownloadMetadata[] = [];
    const downloadsDir = path.join(this.baseDir!, 'downloads');

    try {
      for (const category of ['logs', 'artifacts'] as const) {
        const categoryDir = path.join(downloadsDir, category);
        
        try {
          const buildDirs = await fs.readdir(categoryDir);
          
          for (const buildId of buildDirs) {
            const buildDir = path.join(categoryDir, buildId);
            const files = await fs.readdir(buildDir);
            
            for (const filename of files) {
              const filePath = path.join(buildDir, filename);
              const stats = await fs.stat(filePath);
              
              if (stats.isFile()) {
                const ageMs = Date.now() - stats.mtime.getTime();
                downloads.push({
                  path: filePath,
                  category,
                  buildId: parseInt(buildId, 10),
                  filename,
                  size: stats.size,
                  downloadedAt: stats.mtime,
                  ageHours: ageMs / (1000 * 60 * 60)
                });
              }
            }
          }
        } catch (error: any) {
          if (error?.code === 'ENOENT') {
            // Category directory doesn't exist yet - this is expected
            continue;
          }
          console.warn(`Warning: Failed to process category ${category}:`, error.message || error);
          continue;
        }
      }
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        // Downloads directory doesn't exist yet - this is expected
        return downloads;
      }
      console.warn('Warning: Failed to list downloads:', error.message || error);
    }

    return downloads;
  }

  async cleanup(olderThanHours: number = 24): Promise<CleanupResult> {
    const downloads = await this.listDownloads();
    let filesRemoved = 0;
    let spaceSaved = 0;
    const errors: string[] = [];

    for (const download of downloads) {
      if (download.ageHours > olderThanHours) {
        try {
          await fs.unlink(download.path);
          filesRemoved++;
          spaceSaved += download.size;

          // Try to remove empty parent directories
          try {
            const buildDir = path.dirname(download.path);
            const files = await fs.readdir(buildDir);
            if (files.length === 0) {
              await fs.rmdir(buildDir);
            }
          } catch {
            // Ignore directory cleanup errors
          }
        } catch (error) {
          errors.push(`Failed to remove ${download.path}: ${error}`);
        }
      }
    }

    return { filesRemoved, spaceSaved, errors };
  }

  async getTempDirInfo(): Promise<TempDirInfo> {
    const downloads = await this.listDownloads();
    
    const totalSize = downloads.reduce((sum, d) => sum + d.size, 0);
    const oldestFile = downloads.reduce((oldest, d) => {
      if (!oldest || d.ageHours > oldest.ageHours) {
        return { path: d.path, ageHours: d.ageHours };
      }
      return oldest;
    }, null as { path: string; ageHours: number } | null);

    return {
      path: await this.getTempDir(),
      totalSize,
      fileCount: downloads.length,
      oldestFile: oldestFile ? {
        path: oldestFile.path,
        age: oldestFile.ageHours
      } : undefined
    };
  }

  private async cleanupOldTempDirs(tempRoot: string): Promise<void> {
    try {
      const entries = await fs.readdir(tempRoot);
      const oldDirPattern = new RegExp(`^${this.prefix}-(\\d+)-`);
      
      for (const entry of entries) {
        const match = entry.match(oldDirPattern);
        if (match) {
          const pid = parseInt(match[1], 10);
          
          // Check if process is still running
          if (pid !== process.pid && !this.isProcessRunning(pid)) {
            const dirPath = path.join(tempRoot, entry);
            try {
              await fs.rm(dirPath, { recursive: true, force: true });
              console.error(`Cleaned up orphaned temp directory: ${dirPath}`);
            } catch (error: any) {
              console.warn(`Warning: Failed to cleanup orphaned directory ${dirPath}:`, error.message || error);
            }
          }
        }
      }
    } catch (error: any) {
      console.warn('Warning: Failed to scan for old temp directories:', error.message || error);
    }
  }

  private isProcessRunning(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  private registerCleanupHandlers(): void {
    const cleanup = async () => {
      if (this.baseDir) {
        try {
          await fs.rm(this.baseDir, { recursive: true, force: true });
        } catch {
          // Ignore cleanup errors on exit
        }
      }
    };

    process.on('exit', () => {
      // Synchronous cleanup attempt
      if (this.baseDir) {
        try {
          rmSync(this.baseDir, { recursive: true, force: true });
        } catch {
          // Ignore cleanup errors on exit
        }
      }
    });

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  }
}