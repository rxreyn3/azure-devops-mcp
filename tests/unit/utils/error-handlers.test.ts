import { describe, it, expect } from 'vitest';
import {
  createPermissionError,
  createNotFoundError,
  createApiError,
  handleAzureDevOpsError
} from '../../../src/utils/error-handlers.js';

describe('Error Handlers', () => {
  describe('createPermissionError', () => {
    it('should create permission error for project-level operations', () => {
      const error = createPermissionError('list queues', 'Agent Pools (read)', false);

      expect(error).toEqual({
        type: 'permission',
        message: "Access denied. You need 'Agent Pools (read)' permission to list queues.",
        requiredPermission: 'Agent Pools (read)',
        suggestion: "Ensure your PAT has project or organization-level 'Agent Pools (read)' permission. "
      });
    });

    it('should create permission error for organization-level operations', () => {
      const error = createPermissionError('manage agents', 'Agent Pools (manage)', true);

      expect(error).toEqual({
        type: 'permission',
        message: "Access denied. You need 'Agent Pools (manage)' permission to manage agents.",
        requiredPermission: 'Agent Pools (manage)',
        suggestion: "Ensure your PAT has organization-level 'Agent Pools (read)' permission. Project-scoped PATs will not work for this operation."
      });
    });

    it('should default to project-level when isOrgLevel is not specified', () => {
      const error = createPermissionError('view builds', 'Build (read)');

      expect(error.suggestion).toContain('project or organization-level');
      expect(error.suggestion).not.toContain('Project-scoped PATs will not work');
    });
  });

  describe('createNotFoundError', () => {
    it('should create not found error with string identifier', () => {
      const error = createNotFoundError('Queue', 'Default');

      expect(error).toEqual({
        type: 'not_found',
        message: "Queue 'Default' not found"
      });
    });

    it('should create not found error with numeric identifier', () => {
      const error = createNotFoundError('Build', 12345);

      expect(error).toEqual({
        type: 'not_found',
        message: "Build '12345' not found"
      });
    });

    it('should handle zero as identifier', () => {
      const error = createNotFoundError('Agent', 0);

      expect(error).toEqual({
        type: 'not_found',
        message: "Agent '0' not found"
      });
    });
  });

  describe('createApiError', () => {
    it('should create API error with message only', () => {
      const error = createApiError('Connection timeout');

      expect(error).toEqual({
        type: 'api_error',
        message: 'Connection timeout'
      });
    });

    it('should create API error with message and details', () => {
      const details = { statusCode: 500, response: 'Internal Server Error' };
      const error = createApiError('Server error', details);

      expect(error).toEqual({
        type: 'api_error',
        message: 'Server error: {"statusCode":500,"response":"Internal Server Error"}'
      });
    });

    it('should handle null details', () => {
      const error = createApiError('Error occurred', null);

      expect(error).toEqual({
        type: 'api_error',
        message: 'Error occurred'
      });
    });

    it('should handle undefined details', () => {
      const error = createApiError('Error occurred', undefined);

      expect(error).toEqual({
        type: 'api_error',
        message: 'Error occurred'
      });
    });

    it('should handle complex object details', () => {
      const details = {
        error: {
          code: 'INVALID_REQUEST',
          message: 'Bad request',
          details: ['Field is required']
        }
      };
      const error = createApiError('Validation failed', details);

      expect(error.message).toContain('Validation failed:');
      expect(error.message).toContain('INVALID_REQUEST');
    });
  });

  describe('handleAzureDevOpsError', () => {
    it('should handle 401 unauthorized error for project-level operation', () => {
      const error = { statusCode: 401, message: 'Unauthorized' };
      const result = handleAzureDevOpsError(error, 'list builds', false);

      expect(result).toEqual({
        success: false,
        error: {
          type: 'permission',
          message: "Access denied. You need 'Agent Pools (read)' permission to list builds.",
          requiredPermission: 'Agent Pools (read)',
          suggestion: "Ensure your PAT has project or organization-level 'Agent Pools (read)' permission. "
        }
      });
    });

    it('should handle 403 forbidden error for organization-level operation', () => {
      const error = { statusCode: 403, message: 'Forbidden' };
      const result = handleAzureDevOpsError(error, 'manage agents', true);

      expect(result).toEqual({
        success: false,
        error: {
          type: 'permission',
          message: "Access denied. You need 'Agent Pools (read)' permission to manage agents.",
          requiredPermission: 'Agent Pools (read)',
          suggestion: "Ensure your PAT has organization-level 'Agent Pools (read)' permission. Project-scoped PATs will not work for this operation."
        }
      });
    });

    it('should handle 404 not found error', () => {
      const error = { statusCode: 404, message: 'Not Found' };
      const result = handleAzureDevOpsError(error, 'get build');

      expect(result).toEqual({
        success: false,
        error: {
          type: 'not_found',
          message: "Resource 'requested' not found"
        }
      });
    });

    it('should handle generic API error with status code', () => {
      const error = { statusCode: 500, message: 'Internal Server Error' };
      const result = handleAzureDevOpsError(error, 'process request');

      expect(result).toEqual({
        success: false,
        error: {
          type: 'api_error',
          message: 'Internal Server Error: 500'
        }
      });
    });

    it('should handle error without status code', () => {
      const error = { message: 'Network timeout' };
      const result = handleAzureDevOpsError(error, 'connect to server');

      expect(result).toEqual({
        success: false,
        error: {
          type: 'api_error',
          message: 'Network timeout'
        }
      });
    });

    it('should handle error without message', () => {
      const error = { statusCode: 429 };
      const result = handleAzureDevOpsError(error, 'make request');

      expect(result).toEqual({
        success: false,
        error: {
          type: 'api_error',
          message: 'Unknown error occurred: 429'
        }
      });
    });

    it('should handle unknown error types', () => {
      const error = 'String error';
      const result = handleAzureDevOpsError(error, 'unknown operation');

      expect(result).toEqual({
        success: false,
        error: {
          type: 'api_error',
          message: 'Unknown error occurred'
        }
      });
    });

    it('should handle null error', () => {
      // The current implementation will throw when trying to access properties on null
      expect(() => handleAzureDevOpsError(null, 'null operation')).toThrow();
    });

    it('should handle Error instance', () => {
      const error = new Error('Custom error message');
      const result = handleAzureDevOpsError(error, 'error operation');

      expect(result).toEqual({
        success: false,
        error: {
          type: 'api_error',
          message: 'Custom error message'
        }
      });
    });
  });
});