import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { TempManager } from '../../../src/utils/temp-manager.js';

// Mock the fs module
vi.mock('node:fs/promises');
vi.mock('node:fs', () => ({
  constants: {},
  rmSync: vi.fn()
}));
vi.mock('node:os');
vi.mock('node:path');

const mockFs = vi.mocked(fs);
const mockOs = vi.mocked(os);
const mockPath = vi.mocked(path);

describe('TempManager', () => {
  let tempManager: TempManager;
  const mockTempDir = '/tmp/test-temp';
  const mockBaseDir = '/tmp/ado-mcp-server-12345-abc123';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset singleton instance
    (TempManager as any).instance = undefined;
    
    // Setup default mocks
    mockOs.tmpdir.mockReturnValue('/tmp');
    mockFs.realpath.mockResolvedValue('/tmp');
    mockFs.mkdtemp.mockResolvedValue(mockBaseDir);
    mockFs.mkdir.mockResolvedValue(undefined);
    mockPath.join.mockImplementation((...args) => args.join('/'));
    mockPath.dirname.mockImplementation((filePath) => {
      const parts = filePath.split('/');
      return parts.slice(0, -1).join('/');
    });
    
    tempManager = TempManager.getInstance();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = TempManager.getInstance();
      const instance2 = TempManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('should create temp directory structure on first initialization', async () => {
      await tempManager.initialize();

      expect(mockFs.realpath).toHaveBeenCalledWith('/tmp');
      expect(mockFs.mkdtemp).toHaveBeenCalledWith(expect.stringMatching(/\/tmp\/ado-mcp-server-\d+-/));
      expect(mockFs.mkdir).toHaveBeenCalledWith(`${mockBaseDir}/downloads`, { recursive: true });
      expect(mockFs.mkdir).toHaveBeenCalledWith(`${mockBaseDir}/downloads/logs`, { recursive: true });
      expect(mockFs.mkdir).toHaveBeenCalledWith(`${mockBaseDir}/downloads/artifacts`, { recursive: true });
    });

    it('should not reinitialize if already initialized', async () => {
      await tempManager.initialize();
      vi.clearAllMocks();
      
      await tempManager.initialize();

      expect(mockFs.mkdtemp).not.toHaveBeenCalled();
    });

    it('should throw error if initialization fails', async () => {
      mockFs.mkdtemp.mockRejectedValue(new Error('Permission denied'));

      await expect(tempManager.initialize()).rejects.toThrow('Failed to initialize temp directory: Error: Permission denied');
    });

    it('should clean up old temp directories during initialization', async () => {
      mockFs.readdir.mockResolvedValue(['ado-mcp-server-999-old', 'other-file', 'ado-mcp-server-888-old2']);
      
      // Mock process.kill to simulate dead processes
      const originalKill = process.kill;
      process.kill = vi.fn().mockImplementation((pid: number) => {
        if (pid === 999 || pid === 888) {
          throw new Error('Process not found'); // Simulate dead process
        }
        return true;
      });

      await tempManager.initialize();

      expect(mockFs.rm).toHaveBeenCalledWith('/tmp/ado-mcp-server-999-old', { recursive: true, force: true });
      expect(mockFs.rm).toHaveBeenCalledWith('/tmp/ado-mcp-server-888-old2', { recursive: true, force: true });
      
      process.kill = originalKill;
    });
  });

  describe('getTempDir', () => {
    it('should return temp directory after initialization', async () => {
      const result = await tempManager.getTempDir();
      expect(result).toBe(mockBaseDir);
    });

    it('should initialize if not already initialized', async () => {
      const result = await tempManager.getTempDir();
      expect(mockFs.mkdtemp).toHaveBeenCalled();
      expect(result).toBe(mockBaseDir);
    });
  });

  describe('getDownloadPath', () => {
    beforeEach(async () => {
      await tempManager.initialize();
      vi.clearAllMocks();
    });

    it('should create valid download path for logs', async () => {
      const result = await tempManager.getDownloadPath('logs', 12345, 'build.log');

      expect(mockFs.mkdir).toHaveBeenCalledWith(`${mockBaseDir}/downloads/logs/12345`, { recursive: true });
      expect(result).toBe(`${mockBaseDir}/downloads/logs/12345/build.log`);
    });

    it('should create valid download path for artifacts', async () => {
      const result = await tempManager.getDownloadPath('artifacts', 67890, 'artifact.zip');

      expect(mockFs.mkdir).toHaveBeenCalledWith(`${mockBaseDir}/downloads/artifacts/67890`, { recursive: true });
      expect(result).toBe(`${mockBaseDir}/downloads/artifacts/67890/artifact.zip`);
    });

    it('should sanitize filename with special characters', async () => {
      const result = await tempManager.getDownloadPath('logs', 123, 'file with spaces & symbols!.log');

      expect(result).toBe(`${mockBaseDir}/downloads/logs/123/file-with-spaces---symbols-.log`);
    });

    it('should throw error for invalid buildId', async () => {
      await expect(tempManager.getDownloadPath('logs', -1, 'test.log'))
        .rejects.toThrow('Invalid buildId: -1. Must be a positive integer.');
      
      await expect(tempManager.getDownloadPath('logs', 0, 'test.log'))
        .rejects.toThrow('Invalid buildId: 0. Must be a positive integer.');
      
      await expect(tempManager.getDownloadPath('logs', 1.5, 'test.log'))
        .rejects.toThrow('Invalid buildId: 1.5. Must be a positive integer.');
    });

    it('should throw error for invalid category', async () => {
      await expect(tempManager.getDownloadPath('invalid' as any, 123, 'test.log'))
        .rejects.toThrow("Invalid category: invalid. Must be 'logs' or 'artifacts'.");
    });

    it('should throw error for invalid filename', async () => {
      await expect(tempManager.getDownloadPath('logs', 123, ''))
        .rejects.toThrow('Filename must be a non-empty string.');
      
      await expect(tempManager.getDownloadPath('logs', 123, '   '))
        .rejects.toThrow('Filename must be a non-empty string.');
      
      await expect(tempManager.getDownloadPath('logs', 123, null as any))
        .rejects.toThrow('Filename must be a non-empty string.');
    });
  });

  describe('listDownloads', () => {
    beforeEach(async () => {
      await tempManager.initialize();
      vi.clearAllMocks();
    });

    it('should list downloads from both categories', async () => {
      const mockStats = {
        isFile: () => true,
        size: 1024,
        mtime: new Date('2024-01-01T12:00:00Z')
      };

      mockFs.readdir
        .mockResolvedValueOnce(['123', '456'] as any) // logs buildDirs
        .mockResolvedValueOnce(['build.log'] as any) // logs/123 files
        .mockResolvedValueOnce(['test.log'] as any) // logs/456 files
        .mockResolvedValueOnce(['789'] as any) // artifacts buildDirs
        .mockResolvedValueOnce(['artifact.zip'] as any); // artifacts/789 files

      mockFs.stat.mockResolvedValue(mockStats as any);

      // Mock Date.now for consistent age calculation
      const mockNow = new Date('2024-01-01T13:00:00Z').getTime();
      vi.spyOn(Date, 'now').mockReturnValue(mockNow);

      const result = await tempManager.listDownloads();

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        path: `${mockBaseDir}/downloads/logs/123/build.log`,
        category: 'logs',
        buildId: 123,
        filename: 'build.log',
        size: 1024,
        downloadedAt: mockStats.mtime,
        ageHours: 1
      });
    });

    it('should handle missing category directories gracefully', async () => {
      mockFs.readdir.mockRejectedValue({ code: 'ENOENT' });

      const result = await tempManager.listDownloads();

      expect(result).toEqual([]);
    });

    it('should handle missing downloads directory gracefully', async () => {
      mockFs.readdir.mockRejectedValueOnce({ code: 'ENOENT' });

      const result = await tempManager.listDownloads();

      expect(result).toEqual([]);
    });

    it('should skip non-file entries', async () => {
      const mockFileStats = { isFile: () => true, size: 1024, mtime: new Date() };
      const mockDirStats = { isFile: () => false, size: 0, mtime: new Date() };

      mockFs.readdir
        .mockResolvedValueOnce(['123'] as any)
        .mockResolvedValueOnce(['file.log', 'subdir'] as any)
        .mockResolvedValueOnce([] as any);

      mockFs.stat
        .mockResolvedValueOnce(mockFileStats as any)
        .mockResolvedValueOnce(mockDirStats as any);

      const result = await tempManager.listDownloads();

      expect(result).toHaveLength(1);
      expect(result[0].filename).toBe('file.log');
    });
  });

  describe('cleanup', () => {
    beforeEach(async () => {
      await tempManager.initialize();
      vi.clearAllMocks();
    });

    it('should remove files older than specified hours', async () => {
      const oldFile = {
        path: '/tmp/old-file.log',
        category: 'logs' as const,
        buildId: 123,
        filename: 'old-file.log',
        size: 1024,
        downloadedAt: new Date(),
        ageHours: 25
      };

      const newFile = {
        path: '/tmp/new-file.log',
        category: 'logs' as const,
        buildId: 456,
        filename: 'new-file.log',
        size: 512,
        downloadedAt: new Date(),
        ageHours: 1
      };

      // Mock listDownloads
      vi.spyOn(tempManager, 'listDownloads').mockResolvedValue([oldFile, newFile]);
      mockFs.unlink.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([] as any);
      mockFs.rmdir.mockResolvedValue(undefined);

      const result = await tempManager.cleanup(24);

      expect(result).toEqual({
        filesRemoved: 1,
        spaceSaved: 1024,
        errors: []
      });
      expect(mockFs.unlink).toHaveBeenCalledWith('/tmp/old-file.log');
      expect(mockFs.unlink).not.toHaveBeenCalledWith('/tmp/new-file.log');
    });

    it('should handle file removal errors', async () => {
      const file = {
        path: '/tmp/error-file.log',
        category: 'logs' as const,
        buildId: 123,
        filename: 'error-file.log',
        size: 1024,
        downloadedAt: new Date(),
        ageHours: 25
      };

      vi.spyOn(tempManager, 'listDownloads').mockResolvedValue([file]);
      mockFs.unlink.mockRejectedValue(new Error('Permission denied'));

      const result = await tempManager.cleanup(24);

      expect(result).toEqual({
        filesRemoved: 0,
        spaceSaved: 0,
        errors: ['Failed to remove /tmp/error-file.log: Error: Permission denied']
      });
    });

    it('should remove empty parent directories', async () => {
      const file = {
        path: '/tmp/downloads/logs/123/file.log',
        category: 'logs' as const,
        buildId: 123,
        filename: 'file.log',
        size: 1024,
        downloadedAt: new Date(),
        ageHours: 25
      };

      vi.spyOn(tempManager, 'listDownloads').mockResolvedValue([file]);
      mockFs.unlink.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([] as any); // Empty directory
      mockFs.rmdir.mockResolvedValue(undefined);

      await tempManager.cleanup(24);

      expect(mockFs.rmdir).toHaveBeenCalledWith('/tmp/downloads/logs/123');
    });

    it('should not remove non-empty parent directories', async () => {
      const file = {
        path: '/tmp/downloads/logs/123/file.log',
        category: 'logs' as const,
        buildId: 123,
        filename: 'file.log',
        size: 1024,
        downloadedAt: new Date(),
        ageHours: 25
      };

      vi.spyOn(tempManager, 'listDownloads').mockResolvedValue([file]);
      mockFs.unlink.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue(['other-file.log'] as any); // Non-empty directory

      await tempManager.cleanup(24);

      expect(mockFs.rmdir).not.toHaveBeenCalled();
    });
  });

  describe('getTempDirInfo', () => {
    beforeEach(async () => {
      await tempManager.initialize();
      vi.clearAllMocks();
    });

    it('should return temp directory information', async () => {
      const downloads = [
        {
          path: '/tmp/file1.log',
          category: 'logs' as const,
          buildId: 123,
          filename: 'file1.log',
          size: 1024,
          downloadedAt: new Date(),
          ageHours: 1
        },
        {
          path: '/tmp/file2.log',
          category: 'logs' as const,
          buildId: 456,
          filename: 'file2.log',
          size: 2048,
          downloadedAt: new Date(),
          ageHours: 5
        }
      ];

      vi.spyOn(tempManager, 'listDownloads').mockResolvedValue(downloads);

      const result = await tempManager.getTempDirInfo();

      expect(result).toEqual({
        path: mockBaseDir,
        totalSize: 3072,
        fileCount: 2,
        oldestFile: {
          path: '/tmp/file2.log',
          age: 5
        }
      });
    });

    it('should handle empty downloads directory', async () => {
      vi.spyOn(tempManager, 'listDownloads').mockResolvedValue([]);

      const result = await tempManager.getTempDirInfo();

      expect(result).toEqual({
        path: mockBaseDir,
        totalSize: 0,
        fileCount: 0,
        oldestFile: undefined
      });
    });
  });
});