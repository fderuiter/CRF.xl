module.exports = {
  preset: "ts-jest",
  testEnvironment: "<rootDir>/../../test/custom-jsdom-environment.js",
  testMatch: ["<rootDir>/src/**/__tests__/**/*.test.ts", "<rootDir>/src/**/*.test.tsx"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.json",
      },
    ],
  },
  moduleNameMapper: {
    "^@crf-xl/core/src(.*)$": "<rootDir>/../core/src$1",
    "^@crf-xl/core(.*)$": "<rootDir>/../core/src$1",
  },
};
