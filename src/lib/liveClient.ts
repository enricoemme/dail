// Gemini Live API client, speaking the raw BidiGenerateContent protocol
// through our key-holding relay (ws://<host>/live).
//
// Protocol notes that matter (learned in production):
// - Unknown/extra fields in ANY client message kill the socket with 1007,
//   so we send only documented fields.
// - Gemini's native automatic VAD handles turn-taking; we send no manual
//   VAD or buffer-control messages, just a continuous audio stream.
// - Function declarations must NOT contain `additionalProperties`.
// - Audio in: PCM16 mono 16 kHz base64. Audio out: PCM16 mono 24 kHz base64
//   inlineData parts inside serverContent.

import type { LiveToolCall } from '../types'

export interface FunctionDeclaration {
  name: string
  description: string
  parameters?: {
    type: 'OBJECT'
    properties: Record<string, { type: string; description?: string }>
    required?: string[]
  }
}

export interface LiveSessionConfig {
  model: string
  voice: string
  systemInstruction: string
  tools?: FunctionDeclaration[]
}

export interface LiveSessionCallbacks {
  /** Session is set up and ready for audio. */
  onReady?: () => void
  /** A chunk of 24 kHz PCM16 model audio (already base64-decoded). */
  onAudio?: (pcm: ArrayBuffer) => void
  /** The player barged in — flush local playback immediately. */
  onInterrupted?: () => void
  /** The model finished its spoken turn. */
  onTurnComplete?: () => void
  /** Live transcription of the player's speech. */
  onInputTranscript?: (text: string) => void
  /** Live transcription of the model's speech. */
  onOutputTranscript?: (text: string) => void
  /** The model called one of our scoring functions. */
  onToolCall?: (calls: LiveToolCall[]) => void
  /** Socket closed (any reason). */
  onClose?: (code: number, reason: string) => void
  onError?: (message: string) => void
}

function relayUrl(): string {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${location.host}/live`
}

export class LiveSession {
  private ws: WebSocket | null = null
  private closedByUs = false

  constructor(
    private config: LiveSessionConfig,
    private cb: LiveSessionCallbacks,
  ) {}

  connect(): void {
    const ws = new WebSocket(relayUrl())
    this.ws = ws

    ws.onopen = () => {
      const setup: Record<string, unknown> = {
        model: `models/${this.config.model}`,
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: this.config.voice } },
            languageCode: 'en-GB',
          },
        },
        systemInstruction: { parts: [{ text: this.config.systemInstruction }] },
        outputAudioTranscription: {},
        inputAudioTranscription: {},
      }
      if (this.config.tools && this.config.tools.length > 0) {
        setup.tools = [{ functionDeclarations: this.config.tools }]
      }
      this.send({ setup })
    }

    ws.onmessage = (ev) => this.handleMessage(String(ev.data))

    ws.onclose = (ev) => {
      if (!this.closedByUs) this.cb.onClose?.(ev.code, ev.reason)
    }
    ws.onerror = () => {
      if (!this.closedByUs) this.cb.onError?.('websocket error')
    }
  }

  private handleMessage(raw: string): void {
    let msg: any
    try {
      msg = JSON.parse(raw)
    } catch {
      return
    }

    if (msg.setupComplete !== undefined) {
      // Kick the model into speaking first. The system prompt tells it that
      // "[BEGIN ROUND]" comes from the app, not the player.
      this.send({
        clientContent: {
          turns: [{ role: 'user', parts: [{ text: '[BEGIN ROUND]' }] }],
          turnComplete: true,
        },
      })
      this.cb.onReady?.()
      return
    }

    const sc = msg.serverContent
    if (sc) {
      if (sc.interrupted) this.cb.onInterrupted?.()
      const parts = sc.modelTurn?.parts ?? []
      for (const part of parts) {
        const data = part.inlineData?.data
        if (data && String(part.inlineData.mimeType || '').startsWith('audio/pcm')) {
          this.cb.onAudio?.(base64ToArrayBuffer(data))
        }
      }
      if (sc.outputTranscription?.text) this.cb.onOutputTranscript?.(sc.outputTranscription.text)
      if (sc.inputTranscription?.text) this.cb.onInputTranscript?.(sc.inputTranscription.text)
      if (sc.turnComplete) this.cb.onTurnComplete?.()
    }

    if (msg.toolCall?.functionCalls?.length) {
      const calls: LiveToolCall[] = msg.toolCall.functionCalls.map((fc: any) => ({
        id: fc.id ?? '',
        name: fc.name ?? '',
        args: fc.args ?? {},
      }))
      // Tool handling must be instant: the model cannot speak while a call is
      // pending. Respond immediately, then notify the app.
      this.send({
        toolResponse: {
          functionResponses: calls.map((c) => ({
            id: c.id,
            name: c.name,
            response: { result: 'ok' },
          })),
        },
      })
      this.cb.onToolCall?.(calls)
    }
  }

  /** Stream a chunk of base64 PCM16 @ 16 kHz mic audio. */
  sendAudio(base64Pcm: string): void {
    this.send({
      realtimeInput: {
        audio: { data: base64Pcm, mimeType: 'audio/pcm;rate=16000' },
      },
    })
  }

  /** Send a plain text user turn (used by the stall watchdog to nudge). */
  sendText(text: string): void {
    this.send({
      clientContent: {
        turns: [{ role: 'user', parts: [{ text }] }],
        turnComplete: true,
      },
    })
  }

  close(): void {
    this.closedByUs = true
    try {
      this.ws?.close()
    } catch {
      /* already closed */
    }
    this.ws = null
  }

  get isOpen(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  private send(obj: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj))
    }
  }
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}
