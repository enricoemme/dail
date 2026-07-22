// Single-clip audio player for VictorAI. Only one clip plays at a time —
// starting a new one stops the current. Decoded buffers are cached so replays
// are instant. Exposes an AnalyserNode so the waveform canvas can react to the
// live signal, plus playback progress for the played-portion fill.

type Listener = () => void

export class ClipPlayer {
  private ctx: AudioContext
  private analyser: AnalyserNode
  private buffers = new Map<string, AudioBuffer>()
  private source: AudioBufferSourceNode | null = null
  private freqData: Uint8Array<ArrayBuffer>

  private playingId: string | null = null
  private startedAt = 0
  private duration = 0
  private listeners = new Set<Listener>()

  constructor() {
    this.ctx = new AudioContext()
    this.analyser = this.ctx.createAnalyser()
    this.analyser.fftSize = 256
    this.analyser.smoothingTimeConstant = 0.75
    this.analyser.connect(this.ctx.destination)
    this.freqData = new Uint8Array(this.analyser.frequencyBinCount)
  }

  onChange(fn: Listener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
  private emit() { for (const fn of this.listeners) fn() }

  get currentId(): string | null { return this.playingId }

  /** Load + decode a clip ahead of time (optional; play() will do it lazily). */
  async preload(url: string): Promise<void> {
    if (this.buffers.has(url)) return
    const res = await fetch(url)
    const arr = await res.arrayBuffer()
    const buf = await this.ctx.decodeAudioData(arr)
    this.buffers.set(url, buf)
  }

  /** Toggle: play the clip, or stop it if it's already the one playing. */
  async toggle(id: string, url: string): Promise<void> {
    if (this.playingId === id) {
      this.stop()
      return
    }
    await this.play(id, url)
  }

  async play(id: string, url: string): Promise<void> {
    if (this.ctx.state !== 'running') await this.ctx.resume()
    this.stop()
    if (!this.buffers.has(url)) await this.preload(url)
    const buffer = this.buffers.get(url)
    if (!buffer) return

    const src = this.ctx.createBufferSource()
    src.buffer = buffer
    src.connect(this.analyser)
    src.onended = () => {
      // Only clear if this source is still the active one.
      if (this.source === src) {
        this.source = null
        this.playingId = null
        this.emit()
      }
    }
    src.start()
    this.source = src
    this.playingId = id
    this.startedAt = this.ctx.currentTime
    this.duration = buffer.duration
    this.emit()
  }

  stop(): void {
    if (this.source) {
      try { this.source.onended = null; this.source.stop() } catch { /* already stopped */ }
      this.source = null
    }
    if (this.playingId !== null) {
      this.playingId = null
      this.emit()
    }
  }

  /** 0..1 progress of the currently-playing clip (0 if none). */
  get progress(): number {
    if (!this.playingId || this.duration === 0) return 0
    return Math.min(1, (this.ctx.currentTime - this.startedAt) / this.duration)
  }

  /**
   * Smoothed frequency magnitudes for `bins` bars, each 0..1. Returns a flat
   * baseline when nothing is playing.
   */
  spectrum(bins: number): number[] {
    this.analyser.getByteFrequencyData(this.freqData)
    const out = new Array(bins).fill(0)
    if (!this.playingId) return out
    // Use the lower ~70% of bins — that's where speech energy lives — and
    // resample to the requested bar count.
    const usable = Math.floor(this.freqData.length * 0.7)
    for (let i = 0; i < bins; i++) {
      const start = Math.floor((i / bins) * usable)
      const end = Math.max(start + 1, Math.floor(((i + 1) / bins) * usable))
      let sum = 0
      for (let j = start; j < end; j++) sum += this.freqData[j]
      out[i] = sum / (end - start) / 255
    }
    return out
  }

  destroy(): void {
    this.stop()
    this.listeners.clear()
    void this.ctx.close()
  }
}
