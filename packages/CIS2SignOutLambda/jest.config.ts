import defaultConfig from "../../jest.default.config"
import type {JestConfigWithTsJest} from "ts-jest"

const jestConfig: JestConfigWithTsJest = {
  ...defaultConfig,
  rootDir: __dirname,
  setupFiles: ["<rootDir>/.jest/setEnvVars.js"],
  moduleNameMapper: {"@/(.*)$": ["<rootDir>/src/$1"]}
}

export default jestConfig
