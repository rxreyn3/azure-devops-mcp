import { PermissionError, ApiResult } from '../types/index.js';

export function createPermissionError(
  operation: string,
  requiredPermission: string,
  isOrgLevel: boolean = false
): PermissionError {
  const scope = isOrgLevel ? 'organization-level' : 'project or organization-level';
  return {
    type: 'permission',
    message: `Access denied. You need '${requiredPermission}' permission to ${operation}.`,
    requiredPermission,
    suggestion: `Ensure your PAT has ${scope} 'Agent Pools (read)' permission. ${isOrgLevel ? 'Project-scoped PATs will not work for this operation.' : ''}`
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

export function handleAzureDevOpsError(error: unknown, operation: string, isOrgLevel: boolean = false): ApiResult<unknown> {
  const errorObj = error as { statusCode?: number; message?: string };
  
  if (errorObj.statusCode === 401 || errorObj.statusCode === 403) {
    return {
      success: false,
      error: createPermissionError(operation, 'Agent Pools (read)', isOrgLevel)
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