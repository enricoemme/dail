import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

/** A single smooth displacement wave across the entire game viewport. */
export function TakeoverWave({ warning }: { warning: boolean }) {
  const displacement = useRef<SVGFEDisplacementMapElement>(null)
  useEffect(() => {
    const node = displacement.current!
    const started = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const progress = Math.max(0, Math.min(1, (now - started) / 1900))
      // Update the filter directly: native SVG animation can leave scale at zero.
      const strength = Math.pow(Math.sin(progress * Math.PI), 1.4) * 28
      node.setAttribute('scale', String(strength))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])
  return createPortal(<div className="takeover-viewport" aria-hidden="true">
    <svg width="0" height="0"><defs>
      <filter id="takeover-wave" x="-2%" y="-2%" width="104%" height="104%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency=".002 .028" numOctaves="1" seed="8" result="noise" />
        <feDisplacementMap ref={displacement} in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="B" />
      </filter>
    </defs></svg>
    {warning && <div className="takeover-warning">SIGNAL COMPROMISED</div>}
  </div>, document.body)
}
