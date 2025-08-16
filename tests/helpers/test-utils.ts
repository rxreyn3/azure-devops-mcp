// Test utility functions and helpers

/**
 * Creates a mock Azure DevOps API response
 */
export function createMockApiResponse<T>(data: T, statusCode = 200) {
  return {
    data,
    statusCode,
    headers: {},
  };
}

/**
 * Creates a mock MCP request
 */
export function createMockMcpRequest(method: string, params?: any) {
  return {
    method,
    params: params || {},
    id: Math.random().toString(36).substr(2, 9),
  };
}

/**
 * Waits for a specified amount of time (useful for async tests)
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Creates a mock environment for testing
 */
export function createTestEnvironment() {
  const originalEnv = process.env;
  
  return {
    set: (key: string, value: string) => {
      process.env[key] = value;
    },
    restore: () => {
      process.env = originalEnv;
    }
  };
}