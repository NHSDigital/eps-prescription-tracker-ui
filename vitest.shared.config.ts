import {defineConfig} from "vitest/config"

const sharedVitestConfig = defineConfig({
  test: {
    environment: "node",
    globals: true,
    reporters: "default",
    coverage: {
      "enabled": true,
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "./coverage"
    },
    exclude: ["**/lib/**", "**/node_modules/**", "**/packages/**"]
  }
})

export default sharedVitestConfig
