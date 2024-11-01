/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/configuration
 */

// eslint-disable-next-line object-curly-spacing
import type { JestConfigWithTsJest } from "ts-jest"

const esModules = ["@middy"].join("|")
const jestConfig: JestConfigWithTsJest = {
  preset: "ts-jest/presets/default-esm",
  moduleFileExtensions: ["js", "json", "ts", "d.ts", "jsx", "tsx"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1"
  },
  transform: {
    "^.+\\.ts?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "./tsconfig.json"
      }
    ]
  },
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  testMatch: ["**/tests/**/*.test.ts", "**/__tests__/**/*.test.js?(x)", "**/__tests__/**/*.test.ts?(x)"],
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  verbose: true,
  transformIgnorePatterns: [`node_modules/(?!${esModules})`]
}

export default jestConfig
