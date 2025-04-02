import {defineConfig, loadEnv} from "vite"
import react from "@vitejs/plugin-react-swc"
import path from "path"

export default defineConfig(({mode}) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), "VITE")
  const envWithProcessPrefix = Object.entries(env).reduce(
    (prev, [key, val]) => {
      return {
        ...prev,
        ["process.env." + key]: `"${val}"`
      }
    },
    {}
  )

  return {
    base: process.env.BASE_PATH || "",
    plugins: [react()],
    build: {
      sourcemap: true
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src")
      }
    },
    test: {
      environment: "jsdom",
      globals: true
    },
    server: {
      port: 3000,
      proxy: {
        "/api": {
          target: process.env.API_DOMAIN_OVERRIDE || "http://localhost:8080",
          changeOrigin: true,
          secure: false
        }
      }
    },
    define: envWithProcessPrefix
  }
})
