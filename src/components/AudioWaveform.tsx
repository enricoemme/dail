import { useEffect, useRef } from 'react'
import type { ClipPlayer } from '../lib/audio/clipPlayer'

interface Props {
  player: ClipPlayer
  clipId: string
  /** Stable seed → each clip gets a distinct resting waveform silhouette. */
  seed: string
  bins?: number
  height?: number
}

// Deterministic silhouette per clip: a speech-like envelope so idle clips look
// like real recordings, not random noise. Reproducible from the seed string.
function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function mulberry32(a: number) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function buildSilhouette(seed: string, bins: number): number[] {
  const rnd = mulberry32(hashString(seed))
  const out: number[] = []
  // A few overlapping "syllable" bumps give a natural speech look.
  const bumps = 3 + Math.floor(rnd() * 3)
  const centers = Array.from({ length: bumps }, () => rnd())
  const widths = Array.from({ length: bumps }, () => 0.06 + rnd() * 0.14)
  const peaks = Array.from({ length: bumps }, () => 0.5 + rnd() * 0.5)
  for (let i = 0; i < bins; i++) {
    const x = i / (bins - 1)
    let v = 0
    for (let b = 0; b < bumps; b++) {
      const d = (x - centers[b]) / widths[b]
      v += peaks[b] * Math.exp(-d * d)
    }
    // Taper the ends and add fine texture.
    const taper = Math.sin(Math.PI * x) ** 0.6
    v = v * taper + (0.05 + rnd() * 0.08)
    out.push(Math.min(1, v))
  }
  return out
}

export function AudioWaveform({ player, clipId, seed, bins = 56, height = 96 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const silhouette = useRef<number[]>(buildSilhouette(seed, bins))
  const heights = useRef<number[]>(new Array(bins).fill(0))

  useEffect(() => {
    silhouette.current = buildSilhouette(seed, bins)
  }, [seed, bins])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf = 0
    let phase = 0

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = canvas.clientWidth
      canvas.width = Math.max(1, Math.floor(w * dpr))
      canvas.height = Math.floor(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const draw = () => {
      const w = canvas.clientWidth
      const h = height
      const active = player.currentId === clipId
      phase += 0.05

      const live = active ? player.spectrum(bins) : null
      const progress = active ? player.progress : 0

      // Target heights: live spectrum (blended with silhouette so bars keep
      // shape through quiet moments) when playing; gently breathing silhouette
      // when idle.
      const target = heights.current
      for (let i = 0; i < bins; i++) {
        const sil = silhouette.current[i]
        let t: number
        if (live) {
          t = Math.max(live[i] * 1.15, sil * 0.25)
        } else {
          const breathe = 0.9 + 0.1 * Math.sin(phase + i * 0.35)
          t = sil * 0.5 * breathe
        }
        // Smooth toward target — fast attack, slower release.
        const cur = target[i]
        target[i] = t > cur ? cur + (t - cur) * 0.5 : cur + (t - cur) * 0.22
      }

      ctx.clearRect(0, 0, w, h)
      const mid = h / 2
      const gap = 2
      const barW = Math.max(1.5, w / bins - gap)
      const maxBar = h * 0.46

      for (let i = 0; i < bins; i++) {
        const x = i * (w / bins) + gap / 2
        const barH = Math.max(2, target[i] * maxBar)
        const played = i / bins <= progress

        if (active) {
          if (played) {
            // Tiffany-blue core melting into rose-gold at the tips.
            const grad = ctx.createLinearGradient(0, mid - barH, 0, mid + barH)
            grad.addColorStop(0, '#f3d9c6')
            grad.addColorStop(0.28, '#e8b4a0')
            grad.addColorStop(0.5, '#7fe7e0')
            grad.addColorStop(0.72, '#e8b4a0')
            grad.addColorStop(1, '#f3d9c6')
            ctx.fillStyle = grad
            ctx.shadowColor = 'rgba(127,231,224,0.75)'
            ctx.shadowBlur = 10 + target[i] * 26
          } else {
            ctx.fillStyle = 'rgba(235,244,242,0.30)'
            ctx.shadowBlur = 0
          }
        } else {
          ctx.fillStyle = 'rgba(214,231,227,0.34)'
          ctx.shadowBlur = 0
        }

        // Symmetric rounded bar around the centre line.
        const r = Math.min(barW / 2, 3)
        roundRect(ctx, x, mid - barH, barW, barH * 2, r)
        ctx.fill()
      }
      ctx.shadowBlur = 0

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [player, clipId, bins, height])

  return <canvas ref={canvasRef} className="waveform-canvas" style={{ height }} />
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
