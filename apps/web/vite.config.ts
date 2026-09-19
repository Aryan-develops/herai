import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import dotenv from 'dotenv'

// quiet: dotenv v17 prints rotating promotional "tips" into the dev banner,
// some naming external domains — noise that reads like a compromised build.
dotenv.config({ path: path.resolve(import.meta.dirname, '../../.env'), quiet: true })
const aiServicePort = process.env.AI_SERVICE_PORT ?? '8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/ai': {
        target: `http://localhost:${aiServicePort}`,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ai/, ''),
      },
    },
  },
})
