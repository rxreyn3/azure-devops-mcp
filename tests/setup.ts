// Test setup file
import { mock } from 'bun:test';

// Set up global test environment
process.env.NODE_ENV = 'test';

// Suppress console errors during tests unless DEBUG is set
if (!process.env.DEBUG) {
  console.error = () => {};
}