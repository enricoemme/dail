import { useEffect, useRef } from 'react'

/** Ambient rising bubbles — a slow, soft ocean backdrop behind every screen. */
export function Bubbles() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf = 0
    let w = 0
    let h = 0
    const dpr = Math.min(2, window.devicePixelRatio || 1)

    const resize = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    interface B { x: number; y: number; r: number; speed: number; drift: number; alpha: number; phase: number }
    const COUNT = 46
    const rand = (a: number, b: number) => a + Math.random() * (b - a)
    const make = (atBottom: boolean): B => ({
      x: rand(0, w),
      y: atBottom ? rand(0, h) : h + rand(0, 60),
      r: rand(1.5, 7),
      speed: rand(8, 30),
      drift: rand(-10, 10),
      alpha: rand(0.05, 0.28),
      phase: rand(0, Math.PI * 2),
    })
    const bubbles: B[] = Array.from({ length: COUNT }, () => make(true))

    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      ctx.clearRect(0, 0, w, h)
      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i]
        b.y -= b.speed * dt
        b.phase += dt * 1.5
        const x = b.x + Math.sin(b.phase) * b.drift * 0.15
        if (b.y + b.r < -10) bubbles[i] = make(false)
        ctx.beginPath()
        ctx.arc(x, b.y, b.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${b.alpha})`
        ctx.fill()
        // subtle highlight
        ctx.beginPath()
        ctx.arc(x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.35, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${b.alpha * 0.9})`
        ctx.fill()
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={ref} className="bubbles-canvas" aria-hidden="true" />
}
