import defaultConfig from "../../jest.default.config.ts"
import type {JestConfigWithTsJest} from "ts-jest"

const jestConfig: JestConfigWithTsJest = {
  ...defaultConfig,
  testEnvironment: "./fixedJsdomEnv.ts",
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  moduleFileExtensions: ["js", "json", "ts", "d.ts", "jsx", "tsx"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "^@/styles/searchforaprescription\\.scss$": "<rootDir>/__mocks__/searchforaprescription.scss.js"
  },
  transform: {
    "^.+\\.(t|j)sx?$": [
      "@swc/jest",
      {
        jsc: {
          parser: {
            syntax: "typescript",
            tsx: true,
            decorators: false
          },
          transform: {
            react: {
              runtime: "automatic"
            }
          }
        }
      }
    ]
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testMatch: ["**/__tests__/**/*.test.js?(x)", "**/__tests__/**/*.test.ts?(x)"],
  testPathIgnorePatterns: ["<rootDir>/node_modules/"],
  verbose: true
}

export default jestConfig
