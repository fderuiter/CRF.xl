module.exports = {
  verbose: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: ['/node_modules/'],
  projects: [
    {
      displayName: 'logic',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: [
        '**/__tests__/**/*.test.ts',
        '**/test/serialization/**/*.test.ts'
      ]
    },
    {
      displayName: 'ui',
      preset: 'ts-jest',
      testEnvironment: '<rootDir>/test/custom-jsdom-environment.js',
      testMatch: [
        '**/*.test.tsx'
      ]
    }
  ]
};
