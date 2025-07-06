// Jest setup file for extension testing

// Increase timeout for browser operations
jest.setTimeout(30000);

// Global test helpers
global.sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Mock console methods to reduce test noise
const originalConsole = console;
global.console = {
  ...originalConsole,
  // Suppress debug logs during tests
  debug: process.env.NODE_ENV === 'test' ? () => {} : originalConsole.debug,
  // Keep important logs
  log: originalConsole.log,
  warn: originalConsole.warn,
  error: originalConsole.error
};

// Clean up resources after all tests
afterAll(async () => {
  // Any global cleanup can go here
});