const isWindows = process.platform === 'win32';

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  clearMocks: true,
  // embedded-postgres binaries crash on Windows (STATUS_STACK_BUFFER_OVERRUN);
  // integration tests run in CI on Linux where embedded-postgres works fine.
  testPathIgnorePatterns: isWindows
    ? ['/node_modules/', '\\.integration\\.test\\.ts$']
    : ['/node_modules/'],
};
