import {defineConfig} from "vitest/config"

const sharedVitestConfig = defineConfig({
  test: {
    environment: "node",
    globals: true,
    reporters: "default",
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "./coverage"
    }
  }
})

export default sharedVitestConfig
