// Synthesized UI cues and cinematic sound sequences — WebAudio, no downloads.
// Short signal effects accompany interactions; layered cues follow the story beats.
// All triggers happen inside user-gesture call stacks (or after the context
// is already unlocked), so autoplay policy is satisfied.

let ctx: AudioContext | null = null
let master: GainNode | null = null
let muted = false
try { muted = localStorage.getItem('victorai-muted') === '1' } catch { /* private mode */ }

function ensure(): AudioContext | null {
  if (muted) return null
  if (!ctx) {
    ctx = new AudioContext()
    master = ctx.createGain()
    master.gain.value = 0.22
    master.connect(ctx.destination)
  }
  if (ctx.state !== 'running') void ctx.resume()
  return ctx
}

interface ToneOpts {
  t?: number       // start offset (s)
  dur?: number     // length (s)
  type?: OscillatorType
  vol?: number     // 0..1 relative to master
  glide?: number   // optional end frequency
}

type StopSound = () => void

function tone(freq: number, { t = 0, dur = 0.18, type = 'sine', vol = 0.4, glide }: ToneOpts = {}): StopSound {
  const c = ensure()
  if (!c || !master) return () => {}
  const now = c.currentTime + t
  const osc = c.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(freq, now)
  if (glide) osc.frequency.exponentialRampToValueAtTime(glide, now + dur)
  const g = c.createGain()
  g.gain.setValueAtTime(0, now)
  g.gain.linearRampToValueAtTime(vol, now + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur)
  osc.connect(g)
  g.connect(master)
  osc.start(now)
  osc.stop(now + dur + 0.05)
  osc.onended = () => { osc.disconnect(); g.disconnect() }
  return () => {
    g.gain.cancelAndHoldAtTime(c.currentTime)
    g.gain.setTargetAtTime(0, c.currentTime, 0.008)
    try { osc.stop(c.currentTime + 0.04) } catch { /* already ended */ }
  }
}

/** A filtered burst or sweep; every scheduled source can be cancelled on exit. */
function signalNoise(t: number, dur: number, from: number, to: number, vol: number): StopSound {
  const c = ensure()
  if (!c || !master) return () => {}
  const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate)
  const samples = buffer.getChannelData(0)
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1
  const source = c.createBufferSource()
  source.buffer = buffer
  const filter = c.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = 0.8
  const gain = c.createGain()
  const at = c.currentTime + t
  filter.frequency.setValueAtTime(from, at)
  filter.frequency.exponentialRampToValueAtTime(to, at + dur)
  gain.gain.setValueAtTime(0, at)
  gain.gain.linearRampToValueAtTime(vol, at + Math.min(0.06, dur * 0.2))
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  source.connect(filter); filter.connect(gain); gain.connect(master)
  source.start(at)
  source.stop(at + dur + 0.02)
  source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect() }
  return () => {
    gain.gain.cancelAndHoldAtTime(c.currentTime)
    gain.gain.setTargetAtTime(0, c.currentTime, 0.008)
    try { source.stop(c.currentTime + 0.04) } catch { /* already ended */ }
  }
}

function recoveryChord(at: number): StopSound[] {
  return [
    tone(98, { t: at, dur: 0.7, vol: 0.42, glide: 49 }),
    ...[392, 494, 587, 784].map((freq, i) => tone(freq, { t: at + i * 0.065, dur: 1.15, vol: 0.2 })),
    tone(1568, { t: at + 0.32, dur: 1.1, vol: 0.06 }),
  ]
}


export const sfx = {
  get muted(): boolean { return muted },
  setMuted(m: boolean): void {
    muted = m
    if (ctx && master) master.gain.setTargetAtTime(m ? 0 : 0.22, ctx.currentTime, 0.015)
    try { localStorage.setItem('victorai-muted', m ? '1' : '0') } catch { /* ok */ }
  },

  /** Generic soft tap for small confirmations. */
  tap(): void {
    tone(560, { dur: 0.09, vol: 0.3 })
    tone(740, { t: 0.04, dur: 0.1, vol: 0.22 })
  },

  /** Filtered-noise sweep for screen transitions — an underwater push. */
  whoosh(): void {
    const c = ensure()
    if (!c || !master) return
    const len = 0.38
    const buf = c.createBuffer(1, Math.floor(len * c.sampleRate), c.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
    const src = c.createBufferSource()
    src.buffer = buf
    const f = c.createBiquadFilter()
    f.type = 'bandpass'
    f.Q.value = 1.2
    const now = c.currentTime
    f.frequency.setValueAtTime(280, now)
    f.frequency.exponentialRampToValueAtTime(1500, now + len)
    const g = c.createGain()
    g.gain.setValueAtTime(0.14, now)
    g.gain.exponentialRampToValueAtTime(0.001, now + len)
    src.connect(f); f.connect(g); g.connect(master)
    src.start(now)
  },

  /** Bright rising pair — "it's really Dale". */
  chooseReal(): void {
    tone(659, { dur: 0.12, vol: 0.3 })
    tone(988, { t: 0.07, dur: 0.16, vol: 0.26 })
  },

  /** Falling triangle pair — "it's a clone". */
  chooseAI(): void {
    tone(494, { dur: 0.12, vol: 0.3, type: 'triangle' })
    tone(330, { t: 0.07, dur: 0.18, vol: 0.26, type: 'triangle' })
  },

  /** Low double-thud for a wrong riddle answer. */
  deny(): void {
    tone(220, { dur: 0.16, vol: 0.3, type: 'triangle' })
    tone(196, { t: 0.09, dur: 0.22, vol: 0.26, type: 'triangle' })
  },

  /** Submarine sonar ping with two fading echoes. */
  sonar(): void {
    tone(1175, { dur: 0.7, vol: 0.24, glide: 1100 })
    tone(1175, { t: 0.5, dur: 0.6, vol: 0.1, glide: 1100 })
    tone(1175, { t: 1.0, dur: 0.55, vol: 0.045, glide: 1100 })
  },

  /** Signal collapse, five synchronized disconnects, then a recovery chord. */
  intercept(reduced = false): StopSound {
    const stops: StopSound[] = reduced ? recoveryChord(0) : [
      tone(110, { dur: 0.75, vol: 0.48, type: 'triangle', glide: 42 }),
      tone(220, { dur: 0.4, vol: 0.18, glide: 65 }),
      signalNoise(0, 0.38, 1800, 180, 0.25),
      signalNoise(0.65, 0.8, 300, 1500, 0.12),
      ...Array.from({ length: 5 }, (_, i) => [
        signalNoise(0.75 + i * 0.24, 0.065, 2000, 500, 0.26),
        tone(600 + i * 110, { t: 0.75 + i * 0.24, dur: 0.12, vol: 0.3, type: 'triangle', glide: 300 + i * 55 }),
      ]).flat(),
      ...recoveryChord(2.25),
    ]
    return () => stops.forEach((stop) => stop())
  },

  /** Rising mechanism and accelerating ticks land on the digit's light burst. */
  unlock(reduced = false): StopSound {
    const stops: StopSound[] = reduced ? recoveryChord(0) : [
      tone(130, { dur: 1.4, vol: 0.16, type: 'triangle', glide: 390 }),
      signalNoise(0, 1.45, 280, 2400, 0.2),
      ...[0, 0.4, 0.72, 0.96, 1.14, 1.28].map((t, i) => tone(440 + i * 90, { t, dur: 0.06, vol: 0.16 })),
      signalNoise(1.5, 0.7, 1800, 300, 0.2),
      ...recoveryChord(1.5),
    ]
    return () => stops.forEach((stop) => stop())
  },

  /** Rising arpeggio for the big win. */
  win(): void {
    ;[523, 659, 784, 1047].forEach((f, i) => tone(f, { t: i * 0.09, dur: 0.38, vol: 0.24 }))
  },
}
