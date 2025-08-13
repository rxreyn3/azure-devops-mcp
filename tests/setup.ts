// Global test setup file
// This file runs before all tests

// Set up environment variables for testing
process.env.NODE_ENV = 'test';
process.env.AZURE_DEVOPS_ORG_URL = 'https://dev.azure.com/test-org';
process.env.AZURE_DEVOPS_TOKEN = 'test-token';

// Mock console methods to reduce noise in tests (optional)
// Uncomment if you want to suppress console output during tests
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

// Global test utilities or mocks can be set up here
export {};