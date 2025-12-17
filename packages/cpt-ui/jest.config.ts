import defaultConfig from "../../jest.default.config.ts"
import type {JestConfigWithTsJest} from "ts-jest"

const jestConfig: JestConfigWithTsJest = {
  ...defaultConfig,
  testEnvironment: "./fixedJsdomEnv.ts",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.(css|less|scss|sass)$": "identity-obj-proxy"
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
  testPathIgnorePatterns: ["<rootDir>/node_modules/"]
}

export default jestConfig
