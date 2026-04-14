import {ServerOptions, UserConfig} from "vite"
import react from "@vitejs/plugin-react-swc"
import path from "path"

export function create(env: Record<string, string>, server?: ServerOptions): UserConfig {
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
    server: server,
    define: {
      ...envWithProcessPrefix,
      "global": "globalThis"
    },
    optimizeDeps: {
      include: ["react-input-mask"],
      exclude: []
    }
  }
}
