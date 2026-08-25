import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The dev server proxies API calls and the live-audio websocket to the Node
// relay (server/index.mjs) so the browser never sees the Gemini API key.
export default defineConfig({
  // Root '/' for the local kiosk server and Vercel; '/dail/' for GitHub Pages
  // (served from enricoemme.github.io/dail/). Set BASE_PATH at build time.
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8787', changeOrigin: true },
      '/live': { target: 'ws://localhost:8787', ws: true },
    },
  },
})
