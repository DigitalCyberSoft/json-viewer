module.exports = {
  testEnvironment: 'node',
  testTimeout: 30000, // 30 seconds for browser operations
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: [
    '<rootDir>/tests/**/*.test.js'
  ],
  collectCoverageFrom: [
    'extension/src/**/*.js',
    '!extension/src/**/*.min.js',
    '!extension/src/**/vendor/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true
};