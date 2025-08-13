// Error response fixtures for testing various Azure DevOps API error scenarios

export interface MockApiError {
  statusCode: number;
  message: string;
  name: string;
}

// Permission errors (401/403)
export const permissionDeniedError: MockApiError = {
  statusCode: 403,
  message: 'Access denied: Insufficient permissions to perform this operation',
  name: 'PermissionError'
};

export const unauthorizedError: MockApiError = {
  statusCode: 401,
  message: 'Unauthorized: Authentication required',
  name: 'UnauthorizedError'
};

export const agentPoolPermissionError: MockApiError = {
  statusCode: 403,
  message: 'Access denied: You do not have permission to access agent pools',
  name: 'PermissionError'
};

// Not found errors (404)
export const queueNotFoundError: MockApiError = {
  statusCode: 404,
  message: 'Queue not found',
  name: 'NotFoundError'
};

export const buildNotFoundError: MockApiError = {
  statusCode: 404,
  message: 'Build not found',
  name: 'NotFoundError'
};

export const pipelineNotFoundError: MockApiError = {
  statusCode: 404,
  message: 'Pipeline not found',
  name: 'NotFoundError'
};

export const agentNotFoundError: MockApiError = {
  statusCode: 404,
  message: 'Agent not found',
  name: 'NotFoundError'
};

// Network/timeout errors
export const timeoutError: MockApiError = {
  statusCode: 408,
  message: 'Request timeout',
  name: 'TimeoutError'
};

export const networkError: MockApiError = {
  statusCode: 0,
  message: 'Network error: Unable to connect to Azure DevOps',
  name: 'NetworkError'
};

// Server errors (500+)
export const internalServerError: MockApiError = {
  statusCode: 500,
  message: 'Internal server error',
  name: 'InternalServerError'
};

export const serviceUnavailableError: MockApiError = {
  statusCode: 503,
  message: 'Service temporarily unavailable',
  name: 'ServiceUnavailableError'
};

// Rate limiting
export const rateLimitError: MockApiError = {
  statusCode: 429,
  message: 'Too many requests: Rate limit exceeded',
  name: 'RateLimitError'
};

// Bad request errors (400)
export const badRequestError: MockApiError = {
  statusCode: 400,
  message: 'Bad request: Invalid parameters',
  name: 'BadRequestError'
};

export const invalidBuildParametersError: MockApiError = {
  statusCode: 400,
  message: 'Invalid build parameters: Missing required parameter',
  name: 'BadRequestError'
};

export const invalidPipelineParametersError: MockApiError = {
  statusCode: 400,
  message: 'Invalid pipeline parameters: Template parameter validation failed',
  name: 'BadRequestError'
};

// Conflict errors (409)
export const buildAlreadyQueuedError: MockApiError = {
  statusCode: 409,
  message: 'Build already queued for this commit',
  name: 'ConflictError'
};

// Helper function to create error objects that can be thrown in tests
export function createMockError(errorFixture: MockApiError): Error {
  const error = new Error(errorFixture.message);
  error.name = errorFixture.name;
  (error as any).statusCode = errorFixture.statusCode;
  return error;
}

// Common error scenarios for different operations
export const errorScenarios = {
  queue: {
    notFound: queueNotFoundError,
    permissionDenied: permissionDeniedError,
    timeout: timeoutError
  },
  agent: {
    notFound: agentNotFoundError,
    permissionDenied: agentPoolPermissionError,
    unauthorized: unauthorizedError
  },
  build: {
    notFound: buildNotFoundError,
    permissionDenied: permissionDeniedError,
    invalidParameters: invalidBuildParametersError,
    alreadyQueued: buildAlreadyQueuedError
  },
  pipeline: {
    notFound: pipelineNotFoundError,
    permissionDenied: permissionDeniedError,
    invalidParameters: invalidPipelineParametersError,
    timeout: timeoutError
  },
  network: {
    timeout: timeoutError,
    networkError: networkError,
    serverError: internalServerError,
    serviceUnavailable: serviceUnavailableError,
    rateLimit: rateLimitError
  }
};