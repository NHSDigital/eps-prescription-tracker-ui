import nextJest from "next/jest"
const createJestConfig = nextJest({
  dir: "./"
})
const customJestConfig = {
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  moduleDirectories: ["node_modules", "<rootDir>/"],
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    "^@/context/(.*)$": "<rootDir>/context/$1",
    "^@/app/(.*)$": "<rootDir>/app/$1",
    "^@/constants/(.*)$": "<rootDir>/constants/$1",
    "^@/assets/(.*)$": "<rootDir>/assets/$1",
    "^@/components/(.*)$": "<rootDir>/components/$1"
  }
}
module.exports = createJestConfig(customJestConfig)
