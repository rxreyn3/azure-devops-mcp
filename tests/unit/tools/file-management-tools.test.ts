import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createBuildTools } from '../../../src/tools/build-tools.js';
import { BuildClient } from '../../../src/clients/build-client.js';
import { PipelineClient } from '../../../src/clients/pipeline-client.js';
import { TempManager } from '../../../src/utils/temp-manager.js';
import { MockFactory } from '../../helpers/mock-factory.js';

// Mock TempManager
vi.mock('../../../src/utils/temp-manager.js', () => ({
  TempManager: {
    getInstance: vi.fn(() => ({
      listDownloads: vi.fn(),
      cleanup: vi.fn(),
      getTempDir: vi.fn(),
      getTempDirInfo: vi.fn(),
    })),
  },
}));

describe('File Management Tools', () => {
  let mockBuildClient: BuildClient;
  let mockPipelineClient: PipelineClient;
  let buildTools: ReturnType<typeof createBuildTools>;
  let mockTempManager: any;

  beforeEach(() => {
    MockFactory.resetAllMocks();
    
    // Create minimal mock clients (not used by file management tools)
    mockBuildClient = {} as any;
    mockPipelineClient = {} as any;

    // Setup mock TempManager
    mockTempManager = {
      listDownloads: vi.fn(),
      cleanup: vi.fn(),
      getTempDir: vi.fn(),
      getTempDirInfo: vi.fn(),
    };
    (TempManager.getInstance as any).mockReturnValue(mockTempManager);

    buildTools = createBuildTools(mockBuildClient, mockPipelineClient);
  });

  describe('list_downloads', () => {
    it('should list downloads with various file types', async () => {
      const mockDownloads = [
        {
          path: '/tmp/ado-mcp/build-12345-job-logs.txt',
          category: 'logs',
          buildId: 12345,
          filename: 'build-12345-job-logs.txt',
          size: 1024,
          downloadedAt: new Date('2024-01-01T10:00:00Z'),
          ageHours: 2.5,
        },
        {
          path: '/tmp/ado-mcp/build-12346-artifact.zip',
          category: 'artifacts',
          buildId: 12346,
          filename: 'build-12346-artifact.zip',
          size: 2048,
          downloadedAt: new Date('2024-01-01T09:00:00Z'),
          ageHours: 3.5,
        },
        {
          path: '/tmp/ado-mcp/build-12347-timeline-logs.txt',
          category: 'logs',
          buildId: 12347,
          filename: 'build-12347-timeline-logs.txt',
          size: 512,
          downloadedAt: new Date('2024-01-01T11:00:00Z'),
          ageHours: 1.5,
        },
      ];

      mockTempManager.listDownloads.mockResolvedValue(mockDownloads);
      mockTempManager.getTempDir.mockResolvedValue('/tmp/ado-mcp');

      const result = await buildTools.list_downloads.handler({});

      expect(mockTempManager.listDownloads).toHaveBeenCalledTimes(1);
      expect(mockTempManager.getTempDir).toHaveBeenCalledTimes(1);

      const parsedResult = JSON.parse(result.content[0].text);
      
      expect(parsedResult.message).toBe('Found 3 downloaded file(s)');
      expect(parsedResult.tempDirectory).toBe('/tmp/ado-mcp');
      expect(parsedResult.summary).toEqual({
        totalFiles: 3,
        totalSize: 3584, // 1024 + 2048 + 512
        logs: 2,
        artifacts: 1,
      });
      expect(parsedResult.downloads).toHaveLength(3);
      
      // Verify download details
      expect(parsedResult.downloads[0]).toEqual({
        path: '/tmp/ado-mcp/build-12345-job-logs.txt',
        category: 'logs',
        buildId: 12345,
        filename: 'build-12345-job-logs.txt',
        size: 1024,
        downloadedAt: '2024-01-01T10:00:00.000Z',
        ageHours: 2.5,
      });
    });

    it('should handle empty downloads directory', async () => {
      mockTempManager.listDownloads.mockResolvedValue([]);
      mockTempManager.getTempDir.mockResolvedValue('/tmp/ado-mcp');

      const result = await buildTools.list_downloads.handler({});

      const parsedResult = JSON.parse(result.content[0].text);
      
      expect(parsedResult.message).toBe('Found 0 downloaded file(s)');
      expect(parsedResult.summary).toEqual({
        totalFiles: 0,
        totalSize: 0,
        logs: 0,
        artifacts: 0,
      });
      expect(parsedResult.downloads).toEqual([]);
    });

    it('should categorize files correctly', async () => {
      const mockDownloads = [
        {
          path: '/tmp/log1.txt',
          category: 'logs',
          buildId: 1,
          filename: 'log1.txt',
          size: 100,
          downloadedAt: new Date(),
          ageHours: 1,
        },
        {
          path: '/tmp/log2.txt',
          category: 'logs',
          buildId: 2,
          filename: 'log2.txt',
          size: 200,
          downloadedAt: new Date(),
          ageHours: 2,
        },
        {
          path: '/tmp/artifact1.zip',
          category: 'artifacts',
          buildId: 3,
          filename: 'artifact1.zip',
          size: 300,
          downloadedAt: new Date(),
          ageHours: 3,
        },
        {
          path: '/tmp/artifact2.zip',
          category: 'artifacts',
          buildId: 4,
          filename: 'artifact2.zip',
          size: 400,
          downloadedAt: new Date(),
          ageHours: 4,
        },
        {
          path: '/tmp/artifact3.zip',
          category: 'artifacts',
          buildId: 5,
          filename: 'artifact3.zip',
          size: 500,
          downloadedAt: new Date(),
          ageHours: 5,
        },
      ];

      mockTempManager.listDownloads.mockResolvedValue(mockDownloads);
      mockTempManager.getTempDir.mockResolvedValue('/tmp/ado-mcp');

      const result = await buildTools.list_downloads.handler({});

      const parsedResult = JSON.parse(result.content[0].text);
      
      expect(parsedResult.summary.logs).toBe(2);
      expect(parsedResult.summary.artifacts).toBe(3);
      expect(parsedResult.summary.totalFiles).toBe(5);
      expect(parsedResult.summary.totalSize).toBe(1500); // 100+200+300+400+500
    });

    it('should handle TempManager errors gracefully', async () => {
      mockTempManager.listDownloads.mockRejectedValue(new Error('File system error'));

      await expect(buildTools.list_downloads.handler({})).rejects.toThrow('File system error');
    });

    it('should have correct tool definition', () => {
      expect(buildTools.list_downloads.tool).toEqual({
        name: 'list_downloads',
        description: 'List all files downloaded to the temporary directory by this MCP server, including logs and artifacts.',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      });
    });
  });

  describe('cleanup_downloads', () => {
    it('should cleanup old files successfully', async () => {
      const mockCleanupResult = {
        filesRemoved: 5,
        spaceSaved: 10240,
        errors: [],
      };

      mockTempManager.cleanup.mockResolvedValue(mockCleanupResult);

      const result = await buildTools.cleanup_downloads.handler({ olderThanHours: 48 });

      expect(mockTempManager.cleanup).toHaveBeenCalledWith(48);

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.message).toBe('Cleanup completed');
      expect(parsedResult.filesRemoved).toBe(5);
      expect(parsedResult.spaceSaved).toBe(10240);
      expect(parsedResult.errors).toEqual([]);
    });

    it('should use default cleanup age when not specified', async () => {
      const mockCleanupResult = {
        filesRemoved: 2,
        spaceSaved: 2048,
        errors: [],
      };

      mockTempManager.cleanup.mockResolvedValue(mockCleanupResult);

      const result = await buildTools.cleanup_downloads.handler({});

      expect(mockTempManager.cleanup).toHaveBeenCalledWith(24); // Default 24 hours

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.filesRemoved).toBe(2);
      expect(parsedResult.spaceSaved).toBe(2048);
    });

    it('should handle cleanup with errors', async () => {
      const mockCleanupResult = {
        filesRemoved: 3,
        spaceSaved: 5120,
        errors: [
          'Failed to delete /tmp/locked-file.txt: Permission denied',
          'Failed to delete /tmp/in-use-file.txt: File in use',
        ],
      };

      mockTempManager.cleanup.mockResolvedValue(mockCleanupResult);

      const result = await buildTools.cleanup_downloads.handler({ olderThanHours: 12 });

      expect(mockTempManager.cleanup).toHaveBeenCalledWith(12);

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.filesRemoved).toBe(3);
      expect(parsedResult.spaceSaved).toBe(5120);
      expect(parsedResult.errors).toHaveLength(2);
      expect(parsedResult.errors[0]).toContain('Permission denied');
    });

    it('should handle zero cleanup age', async () => {
      const mockCleanupResult = {
        filesRemoved: 10,
        spaceSaved: 20480,
        errors: [],
      };

      mockTempManager.cleanup.mockResolvedValue(mockCleanupResult);

      const result = await buildTools.cleanup_downloads.handler({ olderThanHours: 0 });

      expect(mockTempManager.cleanup).toHaveBeenCalledWith(0);

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.filesRemoved).toBe(10);
    });

    it('should handle negative cleanup age', async () => {
      const mockCleanupResult = {
        filesRemoved: 0,
        spaceSaved: 0,
        errors: [],
      };

      mockTempManager.cleanup.mockResolvedValue(mockCleanupResult);

      const result = await buildTools.cleanup_downloads.handler({ olderThanHours: -5 });

      expect(mockTempManager.cleanup).toHaveBeenCalledWith(-5);

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.filesRemoved).toBe(0);
      expect(parsedResult.spaceSaved).toBe(0);
    });

    it('should handle TempManager cleanup errors', async () => {
      mockTempManager.cleanup.mockRejectedValue(new Error('Cleanup failed'));

      await expect(buildTools.cleanup_downloads.handler({})).rejects.toThrow('Cleanup failed');
    });

    it('should have correct tool definition', () => {
      expect(buildTools.cleanup_downloads.tool).toEqual({
        name: 'cleanup_downloads',
        description: 'Remove old downloaded files from the temporary directory.',
        inputSchema: {
          type: 'object',
          properties: {
            olderThanHours: {
              type: 'number',
              description: 'Remove files older than this many hours (default: 24)',
              default: 24,
            },
          },
          required: [],
        },
      });
    });
  });

  describe('get_download_location', () => {
    it('should get download location info with files present', async () => {
      const mockTempDirInfo = {
        path: '/tmp/ado-mcp-server',
        totalSize: 15360, // 15KB
        fileCount: 8,
        oldestFile: {
          path: '/tmp/ado-mcp-server/old-build-logs.txt',
          age: 72.5, // 72.5 hours old
        },
      };

      mockTempManager.getTempDirInfo.mockResolvedValue(mockTempDirInfo);

      const result = await buildTools.get_download_location.handler({});

      expect(mockTempManager.getTempDirInfo).toHaveBeenCalledTimes(1);

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.message).toBe('Temporary download directory information');
      expect(parsedResult.path).toBe('/tmp/ado-mcp-server');
      expect(parsedResult.totalSize).toBe(15360);
      expect(parsedResult.fileCount).toBe(8);
      expect(parsedResult.oldestFile).toEqual({
        path: '/tmp/ado-mcp-server/old-build-logs.txt',
        ageHours: 72.5,
      });
    });

    it('should handle empty download directory', async () => {
      const mockTempDirInfo = {
        path: '/tmp/ado-mcp-server',
        totalSize: 0,
        fileCount: 0,
        oldestFile: null,
      };

      mockTempManager.getTempDirInfo.mockResolvedValue(mockTempDirInfo);

      const result = await buildTools.get_download_location.handler({});

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.path).toBe('/tmp/ado-mcp-server');
      expect(parsedResult.totalSize).toBe(0);
      expect(parsedResult.fileCount).toBe(0);
      expect(parsedResult.oldestFile).toBeNull();
    });

    it('should handle large directory with many files', async () => {
      const mockTempDirInfo = {
        path: '/tmp/ado-mcp-server',
        totalSize: 1073741824, // 1GB
        fileCount: 1000,
        oldestFile: {
          path: '/tmp/ado-mcp-server/very-old-file.zip',
          age: 168.25, // 1 week old
        },
      };

      mockTempManager.getTempDirInfo.mockResolvedValue(mockTempDirInfo);

      const result = await buildTools.get_download_location.handler({});

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.totalSize).toBe(1073741824);
      expect(parsedResult.fileCount).toBe(1000);
      expect(parsedResult.oldestFile.ageHours).toBe(168.3);
    });

    it('should handle fractional age hours correctly', async () => {
      const mockTempDirInfo = {
        path: '/tmp/ado-mcp-server',
        totalSize: 1024,
        fileCount: 1,
        oldestFile: {
          path: '/tmp/ado-mcp-server/recent-file.txt',
          age: 0.123456789, // Very recent file
        },
      };

      mockTempManager.getTempDirInfo.mockResolvedValue(mockTempDirInfo);

      const result = await buildTools.get_download_location.handler({});

      const parsedResult = JSON.parse(result.content[0].text);
      // Should round to 1 decimal place
      expect(parsedResult.oldestFile.ageHours).toBe(0.1);
    });

    it('should handle TempManager errors', async () => {
      mockTempManager.getTempDirInfo.mockRejectedValue(new Error('Directory access error'));

      await expect(buildTools.get_download_location.handler({})).rejects.toThrow('Directory access error');
    });

    it('should have correct tool definition', () => {
      expect(buildTools.get_download_location.tool).toEqual({
        name: 'get_download_location',
        description: 'Get information about the temporary directory where files are downloaded.',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      });
    });
  });

  describe('File Management Tools Integration', () => {
    it('should work together for complete file lifecycle', async () => {
      // First, list downloads to see current state
      const initialDownloads = [
        {
          path: '/tmp/old-file.txt',
          category: 'logs',
          buildId: 1,
          filename: 'old-file.txt',
          size: 1024,
          downloadedAt: new Date('2024-01-01T00:00:00Z'),
          ageHours: 48,
        },
        {
          path: '/tmp/new-file.txt',
          category: 'logs',
          buildId: 2,
          filename: 'new-file.txt',
          size: 512,
          downloadedAt: new Date('2024-01-02T00:00:00Z'),
          ageHours: 12,
        },
      ];

      mockTempManager.listDownloads.mockResolvedValue(initialDownloads);
      mockTempManager.getTempDir.mockResolvedValue('/tmp/ado-mcp');

      const listResult = await buildTools.list_downloads.handler({});
      const listParsed = JSON.parse(listResult.content[0].text);
      expect(listParsed.summary.totalFiles).toBe(2);

      // Then cleanup old files (older than 24 hours)
      const cleanupResult = {
        filesRemoved: 1,
        spaceSaved: 1024,
        errors: [],
      };

      mockTempManager.cleanup.mockResolvedValue(cleanupResult);

      const cleanupResponse = await buildTools.cleanup_downloads.handler({ olderThanHours: 24 });
      const cleanupParsed = JSON.parse(cleanupResponse.content[0].text);
      expect(cleanupParsed.filesRemoved).toBe(1);

      // Finally, get directory info after cleanup
      const finalDirInfo = {
        path: '/tmp/ado-mcp',
        totalSize: 512,
        fileCount: 1,
        oldestFile: {
          path: '/tmp/new-file.txt',
          age: 12,
        },
      };

      mockTempManager.getTempDirInfo.mockResolvedValue(finalDirInfo);

      const infoResult = await buildTools.get_download_location.handler({});
      const infoParsed = JSON.parse(infoResult.content[0].text);
      expect(infoParsed.fileCount).toBe(1);
      expect(infoParsed.totalSize).toBe(512);
    });
  });
});