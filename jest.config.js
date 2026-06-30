module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/test/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.tsx', '**/test/serialization/**/*.test.ts'],
  verbose: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: ['/node_modules/']
};
