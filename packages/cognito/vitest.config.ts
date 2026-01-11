import {defineConfig, mergeConfig} from "vitest/config"
import sharedVitestConfig from "../../vitest.base.config"

export default mergeConfig(sharedVitestConfig, defineConfig({
  test: {
    dir: "./tests",
    setupFiles: ["./.jest/setEnvVars.js"],
    threads: false,
    deps: {
      inline: ["mock-jwks", "nock"]
    }
  }
}))
