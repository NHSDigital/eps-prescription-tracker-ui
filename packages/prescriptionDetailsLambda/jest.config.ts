import defaultConfig from "../../jest.default.config.ts"
import type {JestConfigWithTsJest} from "ts-jest"

const jestConfig: JestConfigWithTsJest = {
  ...defaultConfig,
  rootDir: "./",
  setupFiles: ["<rootDir>/.jest/setEnvVars.js"]
}

export default jestConfig
