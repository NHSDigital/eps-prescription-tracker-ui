import defaultConfig from "../../jest.default.config"
import type {JestConfigWithTsJest} from "ts-jest"

const jestConfig: JestConfigWithTsJest = {
  ...defaultConfig,
  rootDir: "./",
  setupFiles: ["<rootDir>/.jest/setEnvVars.js"]
}

export default jestConfig
