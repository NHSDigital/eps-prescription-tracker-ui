import nextJest from "next/jest"

const createJestConfig = nextJest({
  dir: "./"
})

const customJestConfig = {
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  rootDir: "./",
  moduleDirectories: ["node_modules", "<rootDir>/"],
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1"
  }
}

module.exports = createJestConfig(customJestConfig)
