import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { server } from 'typescript'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "172.26.0.2"
  },
  plugins: [react()],
})
