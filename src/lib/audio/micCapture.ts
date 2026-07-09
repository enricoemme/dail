// Microphone capture: AudioWorklet at the device's native rate, downsampled
// to 16 kHz PCM16 inside the worklet, delivered to the main thread as
// Int16Array chunks (~128 ms each) plus an RMS level for the staff mic meter.

const WORKLET_SOURCE = `
class MicDownsampler extends AudioWorkletProcessor {
  constructor() {
    super()
    this.targetRate = 16000
    this.ratio = sampleRate / this.targetRate
    this.readPos = 0
    this.out = new Int16Array(2048) // ~128ms at 16kHz
    this.outPos = 0
    this.sumSquares = 0
    this.sumCount = 0
  }
  process(inputs) {
    const input = inputs[0]
    if (!input || !input[0]) return true
    const ch = input[0]
    for (let i = 0; i < ch.length; i++) {
      this.sumSquares += ch[i] * ch[i]
      this.sumCount++
    }
    // Linear-interpolation downsample from sampleRate to 16 kHz.
    while (this.readPos < ch.length - 1) {
      const i0 = Math.floor(this.readPos)
      const frac = this.readPos - i0
      const sample = ch[i0] * (1 - frac) + ch[i0 + 1] * frac
      const s = Math.max(-1, Math.min(1, sample))
      this.out[this.outPos++] = s < 0 ? s * 0x8000 : s * 0x7fff
      if (this.outPos === this.out.length) {
        const rms = Math.sqrt(this.sumSquares / Math.max(1, this.sumCount))
        this.port.postMessage({ pcm: this.out.buffer.slice(0), rms })
        this.outPos = 0
        this.sumSquares = 0
        this.sumCount = 0
      }
      this.readPos += this.ratio
    }
    this.readPos -= ch.length
    return true
  }
}
registerProcessor('mic-downsampler', MicDownsampler)
`

export interface MicCapture {
  stop: () => void
}

export interface MicCallbacks {
  /** Base64-encoded PCM16 @ 16 kHz, ready to send to the Live API. */
  onChunk: (base64: string) => void
  /** RMS level 0..~1 for the mic meter. */
  onLevel?: (rms: number) => void
}

let sharedStream: MediaStream | null = null

/** Request mic permission once, up front (the "Enable microphone" step). */
export async function requestMic(): Promise<MediaStream> {
  if (sharedStream && sharedStream.getAudioTracks().some((t) => t.readyState === 'live')) {
    return sharedStream
  }
  sharedStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  })
  return sharedStream
}

export async function startMicCapture(cb: MicCallbacks): Promise<MicCapture> {
  const stream = await requestMic()
  const ctx = new AudioContext()
  await ctx.resume()

  const workletUrl = URL.createObjectURL(
    new Blob([WORKLET_SOURCE], { type: 'application/javascript' }),
  )
  try {
    await ctx.audioWorklet.addModule(workletUrl)
  } finally {
    URL.revokeObjectURL(workletUrl)
  }

  const source = ctx.createMediaStreamSource(stream)
  const node = new AudioWorkletNode(ctx, 'mic-downsampler')
  node.port.onmessage = (ev) => {
    const { pcm, rms } = ev.data as { pcm: ArrayBuffer; rms: number }
    cb.onChunk(arrayBufferToBase64(pcm))
    cb.onLevel?.(rms)
  }
  source.connect(node)
  // Keep the worklet pulled by the graph without feeding mic audio to speakers.
  const sink = ctx.createGain()
  sink.gain.value = 0
  node.connect(sink)
  sink.connect(ctx.destination)

  return {
    stop: () => {
      node.port.onmessage = null
      try { source.disconnect() } catch { /* noop */ }
      try { node.disconnect() } catch { /* noop */ }
      void ctx.close()
      // Note: the shared MediaStream stays live for the next round.
    },
  }
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}
