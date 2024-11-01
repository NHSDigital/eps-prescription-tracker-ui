import nextJest from "next/jest"
const createJestConfig = nextJest({
  dir: "./"
})
const customJestConfig = {
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  moduleDirectories: ["node_modules", "<rootDir>/"],
  testEnvironment: "jest-environment-jsdom"
}
module.exports = createJestConfig(customJestConfig)
