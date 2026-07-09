import { useEffect, useRef } from 'react'

const COLORS = ['#22d3ee', '#a78bfa', '#f472b6', '#fbbf24', '#34d399', '#f87171']

/** Lightweight canvas confetti burst, plays once on mount (~2.5s). */
export function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    interface P { x: number; y: number; vx: number; vy: number; rot: number; vrot: number; w: number; h: number; color: string }
    const parts: P[] = Array.from({ length: 160 }, () => ({
      x: canvas.width / 2 + (Math.random() - 0.5) * canvas.width * 0.4,
      y: canvas.height * 0.35,
      vx: (Math.random() - 0.5) * 16,
      vy: -6 - Math.random() * 12,
      rot: Math.random() * Math.PI,
      vrot: (Math.random() - 0.5) * 0.35,
      w: 8 + Math.random() * 8,
      h: 5 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }))

    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = (now - start) / 1000
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      if (t > 2.6) return
      for (const p of parts) {
        p.vy += 0.35
        p.x += p.vx
        p.y += p.vy
        p.vx *= 0.99
        p.rot += p.vrot
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.globalAlpha = Math.max(0, 1 - t / 2.6)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return <canvas ref={ref} className="confetti-canvas" />
}
