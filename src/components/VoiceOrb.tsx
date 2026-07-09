import { useEffect, useRef } from 'react'

interface Props {
  /** Returns current AI output level 0..1 (read every animation frame). */
  getLevel: () => number
  /** Connection state changes the orb's idle look. */
  state: 'connecting' | 'live' | 'error'
}

/** Audio-reactive orb shown while the AI speaks. */
export function VoiceOrb({ getLevel, state }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let raf = 0
    let smoothed = 0
    const tick = () => {
      const level = getLevel()
      smoothed += (level - smoothed) * 0.25
      const el = ref.current
      if (el) {
        el.style.setProperty('--orb-level', smoothed.toFixed(3))
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [getLevel])

  return (
    <div className={`orb-wrap orb-${state}`}>
      <div ref={ref} className="orb">
        <div className="orb-core" />
        <div className="orb-ring orb-ring-1" />
        <div className="orb-ring orb-ring-2" />
      </div>
      {state === 'connecting' && <div className="orb-caption">Connecting…</div>}
      {state === 'error' && <div className="orb-caption orb-caption-error">Connection lost — reconnecting…</div>}
    </div>
  )
}
