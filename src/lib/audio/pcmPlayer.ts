// Gapless playback queue for the model's 24 kHz PCM16 audio chunks.
// Chunks are scheduled back-to-back on a Web Audio timeline; barge-in calls
// flush() which stops everything instantly. An AnalyserNode feeds the
// voice-orb visualisation.

const MODEL_SAMPLE_RATE = 24000

export class PcmPlayer {
  private ctx: AudioContext
  private analyser: AnalyserNode
  private nextStartTime = 0
  private sources = new Set<AudioBufferSourceNode>()
  private levelData: Uint8Array<ArrayBuffer>

  constructor() {
    this.ctx = new AudioContext()
    this.analyser = this.ctx.createAnalyser()
    this.analyser.fftSize = 256
    this.analyser.smoothingTimeConstant = 0.7
    this.analyser.connect(this.ctx.destination)
    this.levelData = new Uint8Array(this.analyser.frequencyBinCount)
  }

  /** Must be called from a user gesture at least once (autoplay policy). */
  async resume(): Promise<void> {
    if (this.ctx.state !== 'running') await this.ctx.resume()
  }

  enqueue(pcm: ArrayBuffer): void {
    const int16 = new Int16Array(pcm)
    if (int16.length === 0) return
    const buffer = this.ctx.createBuffer(1, int16.length, MODEL_SAMPLE_RATE)
    const ch = buffer.getChannelData(0)
    for (let i = 0; i < int16.length; i++) ch[i] = int16[i] / 0x8000

    const src = this.ctx.createBufferSource()
    src.buffer = buffer
    src.connect(this.analyser)

    const now = this.ctx.currentTime
    const startAt = Math.max(now + 0.02, this.nextStartTime)
    src.start(startAt)
    this.nextStartTime = startAt + buffer.duration

    this.sources.add(src)
    src.onended = () => this.sources.delete(src)
  }

  /** Barge-in: stop all queued/playing audio immediately. */
  flush(): void {
    for (const src of this.sources) {
      try { src.stop() } catch { /* already stopped */ }
    }
    this.sources.clear()
    this.nextStartTime = 0
  }

  /** True while model audio is actually playing. */
  get isPlaying(): boolean {
    return this.sources.size > 0
  }

  /** 0..1 output level for the voice orb. */
  getLevel(): number {
    this.analyser.getByteFrequencyData(this.levelData)
    let sum = 0
    for (let i = 0; i < this.levelData.length; i++) sum += this.levelData[i]
    return sum / (this.levelData.length * 255)
  }

  destroy(): void {
    this.flush()
    void this.ctx.close()
  }
}
