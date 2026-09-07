import { useEffect, useRef, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { useReducedMotion } from '../lib/useReducedMotion'

const COLORS = ['#ff8a5c', '#ff5e86', '#ffb98a', '#7fe0ff', '#ffd0ad', '#e5faff']

/** A one-shot finale burst, anchored to the code, with frame-rate-independent physics. */
export function Confetti({ originRef }: { originRef: RefObject<HTMLDivElement> }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return
    const canvas = ref.current
    const origin = originRef.current
    if (!canvas || !origin) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const width = window.innerWidth
    const height = window.innerHeight
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    ctx.scale(dpr, dpr)
    const rect = origin.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const power = Math.min(1, width / 900)
    const duration = 3.6
    const rand = (a: number, b: number) => a + Math.random() * (b - a)
    const count = width < 700 ? 150 : 270
    const particles = Array.from({ length: count }, (_, i) => {
      const side = i % 2 === 0 ? -1 : 1
      const spark = i < 44
      const angle = rand(0, Math.PI * 2)
      const radius = rect.width * 0.46
      return {
        spark,
        x: spark ? cx + Math.cos(angle) * radius : cx + side * rect.width * 0.65,
        y: spark ? cy + Math.sin(angle) * radius : cy + rect.height * 0.32,
        vx: spark ? Math.cos(angle) * rand(230, 500) : -side * rand(180, 440) * power,
        vy: spark ? Math.sin(angle) * rand(230, 500) : -rand(580, 1000) * Math.max(0.65, power),
        rotation: rand(0, Math.PI * 2), spin: rand(-8, 8), phase: rand(0, Math.PI * 2),
        w: spark ? rand(2, 4) : rand(5, 10), h: spark ? rand(8, 17) : rand(5, 13),
        color: COLORS[i % COLORS.length], delay: i > count * 0.7 ? 0.16 : 0,
      }
    })
    let raf = 0
    let previous = performance.now()
    const start = previous
    const clear = () => { cancelAnimationFrame(raf); ctx.clearRect(0, 0, width, height) }
    const tick = (now: number) => {
      const age = (now - start) / 1000
      const dt = Math.min(0.034, (now - previous) / 1000)
      previous = now
      ctx.clearRect(0, 0, width, height)
      if (age > duration) return
      for (const p of particles) {
        const life = age - p.delay
        if (life < 0 || (p.spark && life > 0.8)) continue
        p.vy += (p.spark ? 160 : 560) * dt
        p.vx *= Math.exp(-dt * (p.spark ? 1.3 : 0.55))
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.rotation += p.spin * dt
        // Fade particles over the digit itself so the reward stays legible.
        const distance = Math.hypot((p.x - cx) / (rect.width * 0.38), (p.y - cy) / (rect.height * 0.48))
        const clearance = 0.12 + 0.88 * Math.min(1, Math.max(0, (distance - 0.6) / 0.6))
        const fade = p.spark ? Math.max(0, 1 - life / 0.8) : Math.min(1, Math.max(0, (duration - age) / 1.1))
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.globalAlpha = fade * clearance
        ctx.fillStyle = p.color
        const flutter = p.spark ? 1 : 0.35 + 0.65 * Math.abs(Math.cos(life * 8 + p.phase))
        ctx.fillRect(-p.w / 2, -p.h * flutter / 2, p.w, p.h * flutter)
        ctx.restore()
      }
      raf = requestAnimationFrame(tick)
    }
    const visibility = () => { if (document.hidden) clear() }
    raf = requestAnimationFrame(tick)
    // A resized or hidden viewport ends the burst instead of replaying it.
    window.addEventListener('resize', clear)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      clear()
      window.removeEventListener('resize', clear)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [reduced, originRef])

  if (reduced) return null
  return createPortal(<canvas ref={ref} className="confetti-canvas" aria-hidden="true" />, document.body)
}
