import defaultConfig from "../../jest.default.config"
import type {JestConfigWithTsJest} from "ts-jest"

const jestConfig: JestConfigWithTsJest = {
  ...defaultConfig,
  "rootDir": "./",
  moduleNameMapper: {"@/(.*)$": ["<rootDir>/src/$1"]}
}

export default jestConfig
