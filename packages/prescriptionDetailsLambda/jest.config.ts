import defaultConfig from "../../jest.default.config"
import type {JestConfigWithTsJest} from "ts-jest"

const jestConfig: JestConfigWithTsJest = {
  ...defaultConfig,
  rootDir: "../../",
  roots: ["<rootDir>/packages/prescriptionDetailsLambda"],
  setupFiles: ["<rootDir>/packages/prescriptionDetailsLambda/.jest/setEnvVars.js"]
}

export default jestConfig
