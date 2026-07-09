// Thin relay for the Gemini Live API.
//
// The browser must never see GEMINI_API_KEY, so the kiosk frontend opens a
// websocket to this server (/live) and we pipe every message verbatim to
// Google's BidiGenerateContent websocket, key attached server-side.
// No message inspection, no state — one upstream socket per client socket.

import 'dotenv/config'
import http from 'node:http'
import path from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { WebSocketServer, WebSocket } from 'ws'

const PORT = Number(process.env.PORT || 8787)
const rawKey = process.env.GEMINI_API_KEY
// The .env.example placeholder doesn't count as a configured key.
const API_KEY = rawKey && rawKey !== 'your-key-here' ? rawKey : undefined
const MODEL = process.env.GEMINI_LIVE_MODEL || 'gemini-3.1-flash-live-preview'
const VOICE_FEMALE = process.env.GEMINI_VOICE_FEMALE || 'Aoede'
const VOICE_MALE = process.env.GEMINI_VOICE_MALE || 'Charon'

const UPSTREAM_URL =
  'wss://generativelanguage.googleapis.com/ws/' +
  'google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent' +
  `?key=${API_KEY}`

if (!API_KEY) {
  console.error('\n  GEMINI_API_KEY is not set. Copy .env.example to .env and add your key.\n')
}

const app = express()

// Non-secret config the frontend needs to build its Live setup message.
app.get('/api/config', (_req, res) => {
  res.json({
    model: MODEL,
    voiceFemale: VOICE_FEMALE,
    voiceMale: VOICE_MALE,
    hasKey: Boolean(API_KEY),
  })
})

// If the frontend has been built, host it too — one process runs the whole
// kiosk (`npm run build && npm start`), no Vite required.
const distDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')
if (existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get(/^\/(?!api\/|live$).*/, (_req, res) => res.sendFile(path.join(distDir, 'index.html')))
}

const server = http.createServer(app)
const wss = new WebSocketServer({ server, path: '/live' })

wss.on('connection', (client) => {
  if (!API_KEY) {
    client.close(1011, 'Server has no GEMINI_API_KEY configured')
    return
  }

  const upstream = new WebSocket(UPSTREAM_URL)
  const pending = [] // client messages that arrive before upstream is open

  upstream.on('open', () => {
    for (const msg of pending) upstream.send(msg)
    pending.length = 0
  })

  client.on('message', (data) => {
    const msg = data.toString()
    if (upstream.readyState === WebSocket.OPEN) upstream.send(msg)
    else if (upstream.readyState === WebSocket.CONNECTING) pending.push(msg)
  })

  upstream.on('message', (data) => {
    if (client.readyState === WebSocket.OPEN) client.send(data.toString())
  })

  const closeBoth = (code, reason) => {
    if (code === 1007) console.warn('Upstream 1007 (bad message field):', reason?.toString())
    try { client.close() } catch {}
    try { upstream.close() } catch {}
  }
  upstream.on('close', closeBoth)
  upstream.on('error', (err) => { console.error('Upstream error:', err.message); closeBoth() })
  client.on('close', closeBoth)
  client.on('error', closeBoth)
})

server.listen(PORT, () => {
  console.log(`Relay listening on http://localhost:${PORT}  (model: ${MODEL}, voices: ${VOICE_FEMALE}/${VOICE_MALE})`)
})
