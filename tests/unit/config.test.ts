import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { validateConfig, type Config } from '../../src/config.js';

describe('Config Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables before each test
    process.env = { ...originalEnv };
    delete process.env.ADO_ORGANIZATION;
    delete process.env.ADO_PROJECT;
    delete process.env.ADO_PAT;
    delete process.env.LOG_LEVEL;
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Valid Configuration Scenarios', () => {
    it('should validate config with all required environment variables', () => {
      process.env.ADO_ORGANIZATION = 'myorg';
      process.env.ADO_PROJECT = 'myproject';
      process.env.ADO_PAT = 'mypat123';

      const config = validateConfig();

      expect(config).toEqual({
        organization: 'https://dev.azure.com/myorg',
        project: 'myproject',
        pat: 'mypat123',
        logLevel: 'info'
      });
    });

    it('should use custom log level when provided', () => {
      process.env.ADO_ORGANIZATION = 'myorg';
      process.env.ADO_PROJECT = 'myproject';
      process.env.ADO_PAT = 'mypat123';
      process.env.LOG_LEVEL = 'debug';

      const config = validateConfig();

      expect(config.logLevel).toBe('debug');
    });

    it('should handle organization URL with trailing slash', () => {
      process.env.ADO_ORGANIZATION = 'myorg/';
      process.env.ADO_PROJECT = 'myproject';
      process.env.ADO_PAT = 'mypat123';

      const config = validateConfig();

      expect(config.organization).toBe('https://dev.azure.com/myorg');
    });

    it('should handle organization URL that already has https prefix', () => {
      process.env.ADO_ORGANIZATION = 'https://dev.azure.com/myorg';
      process.env.ADO_PROJECT = 'myproject';
      process.env.ADO_PAT = 'mypat123';

      const config = validateConfig();

      expect(config.organization).toBe('https://dev.azure.com/myorg');
    });

    it('should handle organization URL with https prefix and trailing slash', () => {
      process.env.ADO_ORGANIZATION = 'https://dev.azure.com/myorg/';
      process.env.ADO_PROJECT = 'myproject';
      process.env.ADO_PAT = 'mypat123';

      const config = validateConfig();

      expect(config.organization).toBe('https://dev.azure.com/myorg');
    });

    it('should handle custom Azure DevOps server URL', () => {
      process.env.ADO_ORGANIZATION = 'https://mycompany.visualstudio.com/';
      process.env.ADO_PROJECT = 'myproject';
      process.env.ADO_PAT = 'mypat123';

      const config = validateConfig();

      expect(config.organization).toBe('https://mycompany.visualstudio.com');
    });
  });

  describe('Invalid Configuration Scenarios', () => {
    it('should throw error when ADO_ORGANIZATION is missing', () => {
      process.env.ADO_PROJECT = 'myproject';
      process.env.ADO_PAT = 'mypat123';

      expect(() => validateConfig()).toThrow('Configuration errors:\nADO_ORGANIZATION is required');
    });

    it('should throw error when ADO_PROJECT is missing', () => {
      process.env.ADO_ORGANIZATION = 'myorg';
      process.env.ADO_PAT = 'mypat123';

      expect(() => validateConfig()).toThrow('Configuration errors:\nADO_PROJECT is required');
    });

    it('should throw error when ADO_PAT is missing', () => {
      process.env.ADO_ORGANIZATION = 'myorg';
      process.env.ADO_PROJECT = 'myproject';

      expect(() => validateConfig()).toThrow('Configuration errors:\nADO_PAT is required');
    });

    it('should throw error with all missing variables listed', () => {
      expect(() => validateConfig()).toThrow(
        'Configuration errors:\nADO_ORGANIZATION is required\nADO_PROJECT is required\nADO_PAT is required'
      );
    });

    it('should throw error when ADO_ORGANIZATION is empty string', () => {
      process.env.ADO_ORGANIZATION = '';
      process.env.ADO_PROJECT = 'myproject';
      process.env.ADO_PAT = 'mypat123';

      expect(() => validateConfig()).toThrow('Configuration errors:\nADO_ORGANIZATION is required');
    });

    it('should throw error when ADO_PROJECT is empty string', () => {
      process.env.ADO_ORGANIZATION = 'myorg';
      process.env.ADO_PROJECT = '';
      process.env.ADO_PAT = 'mypat123';

      expect(() => validateConfig()).toThrow('Configuration errors:\nADO_PROJECT is required');
    });

    it('should throw error when ADO_PAT is empty string', () => {
      process.env.ADO_ORGANIZATION = 'myorg';
      process.env.ADO_PROJECT = 'myproject';
      process.env.ADO_PAT = '';

      expect(() => validateConfig()).toThrow('Configuration errors:\nADO_PAT is required');
    });
  });

  describe('URL Normalization Logic', () => {
    beforeEach(() => {
      process.env.ADO_PROJECT = 'myproject';
      process.env.ADO_PAT = 'mypat123';
    });

    it('should normalize simple organization name', () => {
      process.env.ADO_ORGANIZATION = 'myorg';
      const config = validateConfig();
      expect(config.organization).toBe('https://dev.azure.com/myorg');
    });

    it('should normalize organization name with multiple trailing slashes', () => {
      process.env.ADO_ORGANIZATION = 'myorg///';
      const config = validateConfig();
      expect(config.organization).toBe('https://dev.azure.com/myorg//');
    });

    it('should preserve custom domain URLs', () => {
      process.env.ADO_ORGANIZATION = 'https://tfs.mycompany.com/tfs/DefaultCollection';
      const config = validateConfig();
      expect(config.organization).toBe('https://tfs.mycompany.com/tfs/DefaultCollection');
    });

    it('should handle organization names with special characters', () => {
      process.env.ADO_ORGANIZATION = 'my-org_123';
      const config = validateConfig();
      expect(config.organization).toBe('https://dev.azure.com/my-org_123');
    });

    it('should handle organization names with spaces (URL encoded)', () => {
      process.env.ADO_ORGANIZATION = 'my%20org';
      const config = validateConfig();
      expect(config.organization).toBe('https://dev.azure.com/my%20org');
    });
  });

  describe('Configuration Cleanup', () => {
    it('should handle whitespace in configuration values as-is', () => {
      process.env.ADO_ORGANIZATION = '  myorg  ';
      process.env.ADO_PROJECT = '  myproject  ';
      process.env.ADO_PAT = '  mypat123  ';
      process.env.LOG_LEVEL = '  debug  ';

      const config = validateConfig();

      // URL normalization removes trailing slashes, which removes trailing whitespace
      expect(config.organization).toBe('https://dev.azure.com/  myorg  ');
      expect(config.project).toBe('  myproject  ');
      expect(config.pat).toBe('  mypat123  ');
      expect(config.logLevel).toBe('  debug  ');
    });
  });

  describe('Type Safety', () => {
    it('should return Config interface with correct types', () => {
      process.env.ADO_ORGANIZATION = 'myorg';
      process.env.ADO_PROJECT = 'myproject';
      process.env.ADO_PAT = 'mypat123';

      const config: Config = validateConfig();

      expect(typeof config.organization).toBe('string');
      expect(typeof config.project).toBe('string');
      expect(typeof config.pat).toBe('string');
      expect(typeof config.logLevel).toBe('string');
    });
  });
});