import { useEffect, useId, useRef } from 'react'
import { useReducedMotion } from '../lib/useReducedMotion'

/** Cursor-responsive depth illusion using the existing photograph. */
export function DailPortrait({ disrupted }: { disrupted: boolean }) {
  const root = useRef<HTMLDivElement>(null)
  const tilt = useRef<HTMLDivElement>(null)
  const eye = useRef<SVGGElement>(null)
  const reduced = useReducedMotion()
  const glowId = useId()

  useEffect(() => {
    const frame = root.current
    const plane = tilt.current
    const gaze = eye.current
    if (!frame || !plane || !gaze) return
    const pointer = window.matchMedia('(any-hover: hover) and (any-pointer: fine) and (min-width: 901px)')
    let raf = 0
    let last = 0
    let x = 0, y = 0, targetX = 0, targetY = 0
    const paint = () => {
      plane.style.transform = `translate3d(${x * 7}px, ${y * 4}px, 0) rotateX(${-y * 3}deg) rotateY(${x * 5}deg)`
      plane.style.setProperty('--portrait-light-x', `${50 + x * 22}%`)
      plane.style.setProperty('--portrait-light-y', `${30 + y * 12}%`)
      gaze.setAttribute('transform', `translate(${x * 3.5} ${y * 2})`)
    }
    const tick = (now: number) => {
      const dt = Math.min(64, now - (last || now - 16))
      last = now
      const ease = 1 - Math.exp(-dt / 180)
      x += (targetX - x) * ease
      y += (targetY - y) * ease
      if (Math.abs(x - targetX) + Math.abs(y - targetY) < 0.001) {
        x = targetX; y = targetY; raf = 0; last = 0
      } else raf = requestAnimationFrame(tick)
      paint()
    }
    const wake = () => { if (!raf) raf = requestAnimationFrame(tick) }
    const recenter = () => { targetX = 0; targetY = 0; wake() }
    const reset = () => {
      cancelAnimationFrame(raf); raf = 0; last = 0
      x = y = targetX = targetY = 0
      paint()
    }
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || reduced || !pointer.matches || document.hidden) return
      // Coordinates follow the contained image, independent of the moving layer.
      const rect = frame.getBoundingClientRect()
      const scale = Math.min(rect.width / 760, rect.height / 1013)
      const eyeX = rect.left + (rect.width - 760 * scale) / 2 + 450 * scale
      const eyeY = rect.top + (rect.height - 1013 * scale) / 2 + 275 * scale
      targetX = Math.max(-1, Math.min(1, (event.clientX - eyeX) / (innerWidth * 0.55)))
      targetY = Math.max(-1, Math.min(1, (event.clientY - eyeY) / (innerHeight * 0.6)))
      wake()
    }
    const visibility = () => { if (document.hidden) reset() }
    const pointerChanged = () => { if (!pointer.matches) reset() }
    reset()
    if (reduced) return
    window.addEventListener('pointermove', move, { passive: true })
    document.documentElement.addEventListener('pointerleave', recenter)
    window.addEventListener('blur', recenter)
    window.addEventListener('resize', reset)
    document.addEventListener('visibilitychange', visibility)
    pointer.addEventListener('change', pointerChanged)
    return () => {
      reset()
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', recenter)
      window.removeEventListener('blur', recenter)
      window.removeEventListener('resize', reset)
      document.removeEventListener('visibilitychange', visibility)
      pointer.removeEventListener('change', pointerChanged)
    }
  }, [reduced])

  return (
    <div ref={root} className={'brief-portrait' + (disrupted ? ' identity-disrupted' : '')} aria-hidden="true">
      <div ref={tilt} className="portrait-tilt">
        <img className="portrait-base" src={`${import.meta.env.BASE_URL}dail-portrait.jpg`} alt="" />
        <svg className="portrait-eye" viewBox="0 0 760 1013" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <defs><radialGradient id={glowId}>
            <stop offset="0" stopColor="#b8f5ff" stopOpacity="0.85" />
            <stop offset="0.28" stopColor="#36caff" stopOpacity="0.65" />
            <stop offset="0.6" stopColor="#008dff" stopOpacity="0.25" />
            <stop offset="1" stopColor="#008dff" stopOpacity="0" />
          </radialGradient></defs>
          <g ref={eye}>
            <ellipse cx="450" cy="275" rx="30" ry="21" fill={`url(#${glowId})`} />
            <ellipse cx="450" cy="275" rx="3.5" ry="2.5" fill="#c6f8ff" opacity="0.4" />
          </g>
        </svg>
        <img className="portrait-echo portrait-echo-cyan" src={`${import.meta.env.BASE_URL}dail-portrait.jpg`} alt="" />
        <img className="portrait-echo portrait-echo-coral" src={`${import.meta.env.BASE_URL}dail-portrait.jpg`} alt="" />
        <span className="portrait-light" />
      </div>
    </div>
  )
}
