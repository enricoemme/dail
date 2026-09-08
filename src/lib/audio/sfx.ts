// Finished, sample-based sound cues. Mix sources and licenses live in scripts/audio-sources.
// Preload during the briefing; play through WebAudio for precise timing and clean cancellation.
const FILES = {
  click: 'click.wav',
  select: 'select.wav',
  deny: 'deny.wav',
  transition: 'transition.wav',
  release: 'release.wav',
  unlock: 'unlock.wav',
  finale: 'finale.wav',
} as const

type Cue = keyof typeof FILES
type StopSound = () => void
let ctx: AudioContext | null = null
let master: GainNode | null = null
let muted = false
let stopTransient: StopSound = () => {}
const buffers = new Map<Cue, AudioBuffer>()
const loading = new Map<Cue, Promise<AudioBuffer>>()
try { muted = localStorage.getItem('victorai-muted') === '1' } catch { /* private mode */ }

function context(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext()
    master = ctx.createGain()
    master.gain.value = muted ? 0 : 0.8
    master.connect(ctx.destination)
  }
  return ctx
}

function load(cue: Cue): Promise<AudioBuffer> {
  const cached = buffers.get(cue)
  if (cached) return Promise.resolve(cached)
  const pending = loading.get(cue)
  if (pending) return pending
  const c = context()
  const request = fetch(`${import.meta.env.BASE_URL}sfx/${FILES[cue]}`)
    .then((r) => { if (!r.ok) throw new Error(`Sound ${cue}: ${r.status}`); return r.arrayBuffer() })
    .then((data) => c.decodeAudioData(data))
    .then((buffer) => { buffers.set(cue, buffer); return buffer })
    .finally(() => loading.delete(cue))
  loading.set(cue, request)
  return request
}

function play(cue: Cue, synchronized = false): StopSound {
  if (muted) return () => {}
  const c = context()
  const requestedAt = performance.now()
  let cancelled = false
  let source: AudioBufferSourceNode | null = null
  let gain: GainNode | null = null
  // Resume in the interaction call stack; briefing preloading never attempts playback.
  const ready = c.state === 'running' ? Promise.resolve() : c.resume()
  void Promise.all([ready, load(cue)]).then(([, buffer]) => {
    if (cancelled || muted) return
    const elapsed = (performance.now() - requestedAt) / 1000
    // A slow download must not move the release sound beyond its visual reveal.
    const offset = synchronized ? elapsed : 0
    if (offset >= buffer.duration || (!synchronized && elapsed > 0.25)) return
    source = c.createBufferSource()
    source.buffer = buffer
    gain = c.createGain()
    gain.gain.setValueAtTime(0, c.currentTime)
    gain.gain.linearRampToValueAtTime(1, c.currentTime + 0.005)
    source.connect(gain); gain.connect(master!)
    const node = source
    const level = gain
    source.onended = () => { node.disconnect(); level.disconnect() }
    source.start(0, offset)
  }).catch(() => { /* Gameplay remains available if a sound asset cannot load. */ })
  return () => {
    cancelled = true
    if (!source || !gain) return
    gain.gain.cancelAndHoldAtTime(c.currentTime)
    gain.gain.setTargetAtTime(0, c.currentTime, 0.008)
    try { source.stop(c.currentTime + 0.04) } catch { /* already ended */ }
  }
}

function transient(cue: Cue): void {
  stopTransient()
  stopTransient = play(cue)
}

export const sfx = {
  async preload(): Promise<void> {
    await Promise.allSettled((Object.keys(FILES) as Cue[]).map(load))
  },
  get muted(): boolean { return muted },
  setMuted(m: boolean): void {
    muted = m
    window.dispatchEvent(new Event('dail-mute-change'))
    if (ctx && master) {
      master.gain.cancelAndHoldAtTime(ctx.currentTime)
      master.gain.setTargetAtTime(m ? 0 : 0.8, ctx.currentTime, 0.015)
    }
    try { localStorage.setItem('victorai-muted', m ? '1' : '0') } catch { /* private mode */ }
  },
  tap(): void { transient('click') },
  whoosh(): void { transient('transition') },
  chooseReal(): void { transient('click') },
  chooseAI(): void { transient('select') },
  deny(): void { transient('deny') },
  win(): void { transient('release') },
  unlock(reduced = false, finale = false): StopSound {
    stopTransient()
    return play(reduced ? 'release' : finale ? 'finale' : 'unlock', true)
  },
}
