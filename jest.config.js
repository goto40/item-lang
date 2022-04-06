/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverage: true,
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/extension.ts",
    "!**/generated/**",
    "!src/cli/index.ts",
    "!src/cli/**",
    "!src/language-server/main.ts",
  ],
  moduleFileExtensions: ["ts", "js", "json"],
  testResultsProcessor: "./node_modules/jest-junit-reporter",
};