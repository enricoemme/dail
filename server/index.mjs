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

// Team roster comes from the VIKI escape-room registration API. The GM secret
// stays server-side; the browser only ever sees /api/teams.
const VIKI_TEAMS_URL =
  process.env.VIKI_TEAMS_URL ||
  'https://viki-escape-room.replit.app/api/viki/teams/visible'
const VIKI_GM_SECRET = process.env.VIKI_GM_SECRET

// Completion write-back: reports a team finished the DAIL module and receives
// the override digit in return. Both secrets stay server-side.
const VIKI_COMPLETE_URL =
  process.env.VIKI_COMPLETE_URL ||
  'https://viki-escape-room.replit.app/api/viki/modules/dail/complete'
const VIKI_INTEGRATION_SECRET = process.env.VIKI_INTEGRATION_SECRET
const VIKI_COMPLETE_SECRET = process.env.VIKI_COMPLETE_SECRET

const UPSTREAM_URL =
  'wss://generativelanguage.googleapis.com/ws/' +
  'google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent' +
  `?key=${API_KEY}`

if (!API_KEY) {
  console.error('\n  GEMINI_API_KEY is not set. Copy .env.example to .env and add your key.\n')
}

const app = express()
app.use(express.json())

// Non-secret config the frontend needs to build its Live setup message.
app.get('/api/config', (_req, res) => {
  res.json({
    model: MODEL,
    voiceFemale: VOICE_FEMALE,
    voiceMale: VOICE_MALE,
    hasKey: Boolean(API_KEY),
  })
})

// Team roster, proxied so the GM secret never reaches the browser. Cached
// briefly so a busy kiosk day doesn't hammer the registration API.
let teamsCache = { at: 0, data: null }
app.get('/api/teams', async (_req, res) => {
  if (!VIKI_GM_SECRET) return res.status(503).json({ error: 'no-secret' })
  const fresh = Date.now() - teamsCache.at < 30_000
  if (fresh && teamsCache.data) return res.json(teamsCache.data)
  try {
    const r = await fetch(VIKI_TEAMS_URL, {
      headers: { Accept: 'application/json', 'x-gm-secret': VIKI_GM_SECRET },
    })
    if (!r.ok) throw new Error(`upstream ${r.status}`)
    const raw = await r.json()
    // Only expose id + name to the client; drop anything else the API returns.
    const data = (Array.isArray(raw) ? raw : []).map((t) => ({ id: t.id, name: t.name }))
    teamsCache = { at: Date.now(), data }
    res.json(data)
  } catch (err) {
    console.error('Teams fetch failed:', err.message)
    if (teamsCache.data) return res.json(teamsCache.data) // serve stale on failure
    res.status(502).json({ error: 'fetch-failed' })
  }
})

// Report a team's completion of the DAIL module and relay back the override
// digit. Secrets stay server-side; the client only sends teamId + solve time.
app.post('/api/complete', async (req, res) => {
  if (!VIKI_INTEGRATION_SECRET || !VIKI_COMPLETE_SECRET) {
    return res.status(503).json({ error: 'no-secret' })
  }
  const teamId = req.body?.teamId
  if (!teamId) return res.status(400).json({ error: 'no-teamId' })
  try {
    const r = await fetch(VIKI_COMPLETE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-viki-integration-secret': VIKI_INTEGRATION_SECRET,
      },
      body: JSON.stringify({
        teamId,
        secret: VIKI_COMPLETE_SECRET,
        // Solve time — the API currently ignores extras, but send it so it's
        // captured if/when the central source starts recording it.
        timeSeconds: Number(req.body?.timeSeconds) || undefined,
        durationMs: Number(req.body?.durationMs) || undefined,
      }),
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) {
      console.error('Completion failed:', r.status, data)
      return res.status(502).json({ error: 'complete-failed', status: r.status })
    }
    res.json(data) // { digit }
  } catch (err) {
    console.error('Completion error:', err.message)
    res.status(502).json({ error: 'complete-failed' })
  }
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
