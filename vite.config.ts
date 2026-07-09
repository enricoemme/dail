import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The dev server proxies API calls and the live-audio websocket to the Node
// relay (server/index.mjs) so the browser never sees the Gemini API key.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8787', changeOrigin: true },
      '/live': { target: 'ws://localhost:8787', ws: true },
    },
  },
})
