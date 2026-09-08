import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

/** Short, irregular signal interruptions across the entire game viewport. */
export function TakeoverWave({ warning }: { warning: boolean }) {
  const displacement = useRef<SVGFEDisplacementMapElement>(null)
  const noise = useRef<SVGFETurbulenceElement>(null)
  useEffect(() => {
    const node = displacement.current!
    const timers: number[] = []
    const zap = () => {
      noise.current!.setAttribute('seed', String(Math.floor(Math.random() * 1000)))
      noise.current!.setAttribute('baseFrequency', `.001 ${.025 + Math.random() * .09}`)
      node.setAttribute('scale', String((Math.random() > .5 ? 1 : -1) * (24 + Math.random() * 42)))
    }
    // A sharp interruption, sometimes followed by a weaker aftershock.
    zap()
    timers.push(window.setTimeout(() => node.setAttribute('scale', '0'), 65 + Math.random() * 65))
    if (Math.random() > .45) {
      const aftershock = 230 + Math.random() * 90
      timers.push(window.setTimeout(zap, aftershock))
      timers.push(window.setTimeout(() => node.setAttribute('scale', '0'), aftershock + 45 + Math.random() * 40))
    }
    return () => timers.forEach(window.clearTimeout)
  }, [])
  return createPortal(<div className="takeover-viewport" aria-hidden="true">
    <svg width="0" height="0"><defs>
      <filter id="takeover-wave" x="-2%" y="-2%" width="104%" height="104%" colorInterpolationFilters="sRGB">
        <feTurbulence ref={noise} type="fractalNoise" baseFrequency=".001 .055" numOctaves="1" seed="8" result="noise" />
        <feColorMatrix in="noise" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 0 0 .5  0 0 0 0 1" result="horizontal-noise" />
        <feDisplacementMap ref={displacement} in="SourceGraphic" in2="horizontal-noise" scale="0" xChannelSelector="R" yChannelSelector="B" />
      </filter>
    </defs></svg>
    {warning && <div className="takeover-warning">SIGNAL COMPROMISED</div>}
  </div>, document.body)
}
