module.exports = {
  preset: 'ts-jest',
  testEnvironment: '<rootDir>/test/custom-jsdom-environment.js',
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.tsx', '**/test/serialization/**/*.test.ts'],
  verbose: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: ['/node_modules/']
};
