// Tiny synthesized UI sound effects — pure WebAudio, no assets.
// Everything is quiet, short and ocean-flavoured: soft blips, a noise whoosh
// for screen changes, and a submarine sonar ping for the escape reveal.
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

function tone(freq: number, { t = 0, dur = 0.18, type = 'sine', vol = 0.4, glide }: ToneOpts = {}) {
  const c = ensure()
  if (!c || !master) return
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
}

export const sfx = {
  get muted(): boolean { return muted },
  setMuted(m: boolean): void {
    muted = m
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

  /** Bright rising pair — "it's really Victoria". */
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

  /** Rising arpeggio for the big win. */
  win(): void {
    ;[523, 659, 784, 1047].forEach((f, i) => tone(f, { t: i * 0.09, dur: 0.38, vol: 0.24 }))
  },
}
