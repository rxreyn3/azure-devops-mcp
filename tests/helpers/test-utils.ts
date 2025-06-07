import { Config } from '../../src/config.js';
import { MockAzureDevOpsServer } from '../mocks/mock-server.js';

export function createTestConfig(overrides: Partial<Config> = {}): Config {
  return {
    organization: 'test-org',
    project: 'test-project',
    personalAccessToken: 'test-pat-token',
    baseUrl: 'http://localhost:8080',
    ...overrides,
  };
}

export async function withMockServer<T>(
  options: Parameters<typeof MockAzureDevOpsServer.prototype.constructor>[0] = {},
  fn: (server: MockAzureDevOpsServer) => Promise<T>
): Promise<T> {
  const server = new MockAzureDevOpsServer(options);
  try {
    await server.start();
    return await fn(server);
  } finally {
    await server.stop();
  }
}

export function expectError(fn: () => Promise<any>, expectedMessage?: string) {
  return expect(fn()).rejects.toThrow(expectedMessage);
}

export function expectApiError(result: any, expectedError: string) {
  expect(result.success).toBe(false);
  expect(result.error).toBeDefined();
  expect(result.error.message).toContain(expectedError);
}