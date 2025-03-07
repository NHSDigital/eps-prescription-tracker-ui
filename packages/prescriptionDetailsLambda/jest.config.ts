import defaultConfig from "../../jest.default.config"
import type {JestConfigWithTsJest} from "ts-jest"

const jestConfig: JestConfigWithTsJest = {
  ...defaultConfig,
  "rootDir": "../../packages/prescriptionDetailsLambda",
  setupFiles: ["<rootDir>/.jest/setEnvVars.js"]
}

export default jestConfig
