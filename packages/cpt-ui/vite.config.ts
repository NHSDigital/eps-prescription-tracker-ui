import {defineConfig, loadEnv} from "vite"
import {create} from "./vite.base.config"

export default defineConfig(({mode}) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), "VITE")
  return create(env)
})
