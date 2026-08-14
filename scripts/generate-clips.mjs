// Generate the 10 placeholder audio clips through the Gemini Live relay.
// Every clip uses the SAME voice (a stand-in for Victoria) — Dale will later
// replace these files with his real recordings and his cloned red herrings.
//
// Usage:  node scripts/generate-clips.mjs        (relay must be running)
//
// Writes 24kHz mono 16-bit WAV files to public/clips/.

import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const RELAY_HTTP = 'http://localhost:8787'
const RELAY_WS = 'ws://localhost:8787/live'
const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'clips')

// Same transcripts as src/game/content.ts (kept in sync by hand — placeholders).
const CLIPS = [
  { id: 'real-1', text: 'Take a breath before you act on anything that feels urgent.' },
  { id: 'real-2', text: 'Refuse to hand over passwords or codes, no matter who is asking.' },
  { id: 'real-3', text: 'Use a number you already trust to call the person back.' },
  { id: 'real-4', text: 'Stop and check with a colleague if something seems off.' },
  { id: 'real-5', text: 'Trust has to be verified — never simply assumed.' },
  { id: 'fake-1', text: 'I need you to transfer the funds to a new account right away.' },
  { id: 'fake-2', text: 'Just read me the security code that was texted to you.' },
  { id: 'fake-3', text: "Don't tell the team about this — keep it between us for now." },
  { id: 'fake-4', text: 'Buy five gift cards and send me the numbers this afternoon.' },
  { id: 'fake-5', text: "Log in with my password — it's the usual one, hurry please." },
]

const SYSTEM = `You are a text-to-speech engine. When the user sends text, read it aloud ONCE,
exactly as written, in a natural, warm British English (en-GB) voice at a normal pace.
Do NOT greet, comment, explain, apologise, add words, or say anything that is not the given text.
Output only the spoken text.`

function wavFromPcm16(pcmBuffers, sampleRate) {
  const data = Buffer.concat(pcmBuffers)
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16) // PCM chunk size
  header.writeUInt16LE(1, 20) // PCM format
  header.writeUInt16LE(1, 22) // mono
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate * 2, 28) // byte rate (mono, 16-bit)
  header.writeUInt16LE(2, 32) // block align
  header.writeUInt16LE(16, 34) // bits per sample
  header.write('data', 36)
  header.writeUInt32LE(data.length, 40)
  return Buffer.concat([header, data])
}

async function generateOne(config, clip) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(RELAY_WS)
    const pcm = []
    let done = false
    const finish = (err) => {
      if (done) return
      done = true
      try { ws.close() } catch {}
      if (err) reject(err)
      else resolve(pcm)
    }
    ws.onopen = () => {
      ws.send(JSON.stringify({
        setup: {
          model: `models/${config.model}`,
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voiceFemale } },
              languageCode: 'en-GB',
            },
          },
          systemInstruction: { parts: [{ text: SYSTEM }] },
        },
      }))
    }
    ws.onmessage = async (e) => {
      const raw = typeof e.data === 'string' ? e.data : await e.data.text()
      const msg = JSON.parse(raw)
      if (msg.setupComplete !== undefined) {
        ws.send(JSON.stringify({
          clientContent: { turns: [{ role: 'user', parts: [{ text: clip.text }] }], turnComplete: true },
        }))
      }
      const sc = msg.serverContent
      if (sc) {
        for (const p of sc.modelTurn?.parts ?? []) {
          const d = p.inlineData?.data
          if (d && String(p.inlineData.mimeType || '').startsWith('audio/pcm')) {
            pcm.push(Buffer.from(d, 'base64'))
          }
        }
        if (sc.turnComplete) finish()
      }
    }
    ws.onerror = () => finish(new Error('ws error'))
    ws.onclose = () => { if (!done && pcm.length) finish(); else if (!done) finish(new Error('closed early')) }
    setTimeout(() => finish(pcm.length ? undefined : new Error('timeout')), 30000)
  })
}

const config = await (await fetch(`${RELAY_HTTP}/api/config`)).json()
if (!config.hasKey) { console.error('No API key on the relay.'); process.exit(1) }
console.log(`Generating with voice ${config.voiceFemale} @ ${config.model}`)
mkdirSync(OUT_DIR, { recursive: true })

for (const clip of CLIPS) {
  process.stdout.write(`  ${clip.id} … `)
  try {
    const pcm = await generateOne(config, clip)
    const wav = wavFromPcm16(pcm, 24000)
    writeFileSync(path.join(OUT_DIR, `${clip.id}.wav`), wav)
    console.log(`ok (${(wav.length / 1024).toFixed(0)} KB)`)
  } catch (err) {
    console.log(`FAILED: ${err.message}`)
  }
}
console.log('Done.')
process.exit(0)
