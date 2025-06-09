import { PermissionError, ApiResult } from '../types/index.js';

export function createPermissionError(
  operation: string,
  requiredPermission: string
): PermissionError {
  return {
    type: 'permission',
    message: `Access denied. You need '${requiredPermission}' permission to ${operation}.`,
    requiredPermission,
    suggestion: `Ask your Azure DevOps administrator to grant you '${requiredPermission}' permission at the organization or project level.`
  };
}

export function createNotFoundError(resource: string, identifier: string | number) {
  return {
    type: 'not_found' as const,
    message: `${resource} '${identifier}' not found`
  };
}

export function createApiError(message: string, details?: unknown) {
  return {
    type: 'api_error' as const,
    message: details ? `${message}: ${JSON.stringify(details)}` : message
  };
}

export function handleAzureDevOpsError(error: unknown, operation: string): ApiResult<unknown> {
  const errorObj = error as { statusCode?: number; message?: string };
  
  if (errorObj.statusCode === 401 || errorObj.statusCode === 403) {
    const permissionMatch = errorObj.message?.match(/permission|access|authorization/i);
    const permission = permissionMatch ? 'appropriate' : 'higher-level';
    
    return {
      success: false,
      error: createPermissionError(operation, permission)
    };
  }

  if (errorObj.statusCode === 404) {
    return {
      success: false,
      error: createNotFoundError('Resource', 'requested')
    };
  }

  return {
    success: false,
    error: createApiError(
      errorObj.message || 'Unknown error occurred',
      errorObj.statusCode
    )
  };
}