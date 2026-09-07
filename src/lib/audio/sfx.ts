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

/** A filtered, pulsing motor winds up without turning into a musical riser. */
function servo(dur: number): StopSound {
  const c = ensure()
  if (!c || !master) return () => {}
  const at = c.currentTime
  const motor = c.createOscillator()
  motor.type = 'sawtooth'
  motor.frequency.setValueAtTime(48, at)
  motor.frequency.exponentialRampToValueAtTime(83, at + dur)
  const filter = c.createBiquadFilter()
  filter.type = 'lowpass'
  filter.Q.value = 1.2
  filter.frequency.setValueAtTime(220, at)
  filter.frequency.exponentialRampToValueAtTime(650, at + dur)
  const tremolo = c.createOscillator()
  tremolo.frequency.setValueAtTime(7, at)
  tremolo.frequency.linearRampToValueAtTime(19, at + dur)
  const depth = c.createGain()
  depth.gain.value = 0.25
  const pulse = c.createGain()
  pulse.gain.value = 0.7
  tremolo.connect(depth); depth.connect(pulse.gain)
  const envelope = c.createGain()
  envelope.gain.setValueAtTime(0, at)
  envelope.gain.linearRampToValueAtTime(0.18, at + 0.12)
  envelope.gain.linearRampToValueAtTime(0.25, at + dur - 0.1)
  envelope.gain.linearRampToValueAtTime(0, at + dur)
  motor.connect(filter); filter.connect(pulse); pulse.connect(envelope); envelope.connect(master)
  motor.start(at); tremolo.start(at)
  motor.stop(at + dur + 0.04); tremolo.stop(at + dur + 0.04)
  motor.onended = () => { motor.disconnect(); filter.disconnect(); pulse.disconnect(); envelope.disconnect() }
  tremolo.onended = () => { tremolo.disconnect(); depth.disconnect() }
  return () => {
    envelope.gain.cancelAndHoldAtTime(c.currentTime)
    envelope.gain.setTargetAtTime(0, c.currentTime, 0.008)
    try { motor.stop(c.currentTime + 0.04); tremolo.stop(c.currentTime + 0.04) } catch { /* already ended */ }
  }
}

/** Non-musical impact: bass weight, metal resonance, and a short air release. */
function lockRelease(at: number): StopSound[] {
  return [
    tone(88, { t: at, dur: 0.55, vol: 0.55, glide: 38 }),
    tone(146, { t: at, dur: 0.24, vol: 0.2, type: 'triangle', glide: 119 }),
    signalNoise(at, 0.09, 1600, 380, 0.38),
    tone(213, { t: at + 0.02, dur: 0.23, vol: 0.11 }),
    tone(347, { t: at + 0.02, dur: 0.16, vol: 0.07 }),
    signalNoise(at + 0.08, 0.58, 800, 150, 0.16),
  ]
}

export const sfx = {
  get muted(): boolean { return muted },
  setMuted(m: boolean): void {
    muted = m
    if (ctx && master) master.gain.setTargetAtTime(m ? 0 : 0.22, ctx.currentTime, 0.015)
    try { localStorage.setItem('victorai-muted', m ? '1' : '0') } catch { /* ok */ }
  },

  /** A dry relay click, with a low mechanical body. */
  tap(): void {
    signalNoise(0, 0.045, 1300, 500, 0.2)
    tone(115, { dur: 0.07, vol: 0.18, type: 'triangle' })
  },

  whoosh(): void {
    signalNoise(0, 0.32, 220, 750, 0.16)
  },

  chooseReal(): void {
    signalNoise(0, 0.04, 1600, 650, 0.2)
    tone(160, { dur: 0.08, vol: 0.18, type: 'triangle' })
  },

  chooseAI(): void {
    signalNoise(0, 0.05, 1100, 350, 0.22)
    tone(93, { dur: 0.1, vol: 0.22, type: 'triangle' })
  },

  /** A restrained mechanical double knock. */
  deny(): void {
    tone(76, { dur: 0.13, vol: 0.25, type: 'triangle' })
    signalNoise(0, 0.05, 650, 220, 0.16)
    tone(76, { t: 0.16, dur: 0.13, vol: 0.2, type: 'triangle' })
  },

  /** Servo tension and mechanical latches resolve at the 1.5-second reveal. */
  unlock(reduced = false): StopSound {
    const stops: StopSound[] = reduced ? lockRelease(0) : [
      servo(1.48),
      signalNoise(0, 0.18, 480, 160, 0.16),
      ...[0.15, 0.55, 0.91, 1.18, 1.36].flatMap((t) => [
        signalNoise(t, 0.035, 1500, 500, 0.22),
        tone(127, { t, dur: 0.055, vol: 0.11, type: 'triangle' }),
      ]),
      ...lockRelease(1.5),
    ]
    return () => stops.forEach((stop) => stop())
  },

  /** Confirmation lands as a latch engaging, without a melody. */
  win(): void {
    lockRelease(0)
  },
}
