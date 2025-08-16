import { describe, it, expect } from 'vitest';
import { formatErrorResponse } from '../../../src/utils/formatters.js';
import type { ApiError, PermissionError } from '../../../src/types/index.js';

describe('Formatters', () => {
  describe('formatErrorResponse', () => {
    it('should format permission error with suggestion', () => {
      const error: PermissionError = {
        type: 'permission',
        message: "Access denied. You need 'Agent Pools (read)' permission to list queues.",
        requiredPermission: 'Agent Pools (read)',
        suggestion: "Ensure your PAT has project or organization-level 'Agent Pools (read)' permission."
      };

      const result = formatErrorResponse(error);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "❌ Permission Error\n\nAccess denied. You need 'Agent Pools (read)' permission to list queues.\n\n💡 Suggestion: Ensure your PAT has project or organization-level 'Agent Pools (read)' permission."
          }
        ]
      });
    });

    it('should format permission error without suggestion', () => {
      const error: ApiError = {
        type: 'permission',
        message: "Access denied. Insufficient permissions.",
        requiredPermission: 'Build (read)'
      };

      const result = formatErrorResponse(error);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "❌ Permission Error\n\nAccess denied. Insufficient permissions."
          }
        ]
      });
    });

    it('should format not found error', () => {
      const error: ApiError = {
        type: 'not_found',
        message: "Queue 'Default' not found"
      };

      const result = formatErrorResponse(error);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "❌ Not Found\n\nQueue 'Default' not found"
          }
        ]
      });
    });

    it('should format API error', () => {
      const error: ApiError = {
        type: 'api_error',
        message: 'Connection timeout occurred'
      };

      const result = formatErrorResponse(error);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "❌ API Error\n\nConnection timeout occurred"
          }
        ]
      });
    });

    it('should format unknown API error type', () => {
      const error = {
        type: 'unknown_type',
        message: 'Some unknown error'
      } as ApiError;

      const result = formatErrorResponse(error);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ Error\n\n{\n  "type": "unknown_type",\n  "message": "Some unknown error"\n}'
          }
        ]
      });
    });

    it('should format Error instance with stack trace', () => {
      const error = new Error('Test error message');
      error.stack = 'Error: Test error message\n    at test.js:1:1';

      const result = formatErrorResponse(error);

      expect(result.content[0].text).toContain('❌ Error\n\nTest error message');
      expect(result.content[0].text).toContain('Stack trace:\nError: Test error message\n    at test.js:1:1');
    });

    it('should format Error instance without stack trace', () => {
      const error = new Error('Test error message');
      error.stack = undefined;

      const result = formatErrorResponse(error);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "❌ Error\n\nTest error message"
          }
        ]
      });
    });

    it('should format string error', () => {
      const error = 'Simple string error';

      const result = formatErrorResponse(error);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ Unknown Error\n\n"Simple string error"'
          }
        ]
      });
    });

    it('should format number error', () => {
      const error = 404;

      const result = formatErrorResponse(error);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ Unknown Error\n\n404'
          }
        ]
      });
    });

    it('should format null error', () => {
      const error = null;

      const result = formatErrorResponse(error);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ Unknown Error\n\nnull'
          }
        ]
      });
    });

    it('should format undefined error', () => {
      const error = undefined;

      const result = formatErrorResponse(error);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ Unknown Error\n\nundefined'
          }
        ]
      });
    });

    it('should format complex object error', () => {
      const error = {
        code: 500,
        details: {
          message: 'Internal server error',
          timestamp: '2024-01-01T00:00:00Z'
        }
      };

      const result = formatErrorResponse(error);

      expect(result.content[0].text).toContain('❌ Unknown Error');
      expect(result.content[0].text).toContain('"code": 500');
      expect(result.content[0].text).toContain('"message": "Internal server error"');
      expect(result.content[0].text).toContain('"timestamp": "2024-01-01T00:00:00Z"');
    });

    it('should format array error', () => {
      const error = ['error1', 'error2'];

      const result = formatErrorResponse(error);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ Unknown Error\n\n[\n  "error1",\n  "error2"\n]'
          }
        ]
      });
    });

    it('should handle circular reference in object', () => {
      const error: any = { message: 'Circular error' };
      error.self = error;

      // This should throw due to circular reference in current implementation
      expect(() => formatErrorResponse(error)).toThrow('Converting circular structure to JSON');
    });
  });
});