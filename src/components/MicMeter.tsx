import { useEffect, useRef } from 'react'

interface Props {
  /** Returns latest mic RMS 0..~0.5 (read every animation frame). */
  getLevel: () => number
  large?: boolean
}

/** Segment mic-level meter so staff can see the headset mic is alive. */
export function MicMeter({ getLevel, large }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const SEGMENTS = large ? 16 : 8

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const el = ref.current
      if (el) {
        // RMS of speech is usually well under 0.3; scale so talking lights most bars.
        const lit = Math.min(SEGMENTS, Math.round((getLevel() / 0.18) * SEGMENTS))
        const children = el.children
        for (let i = 0; i < children.length; i++) {
          children[i].classList.toggle('mic-seg-on', i < lit)
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [getLevel, SEGMENTS])

  return (
    <div className={large ? 'mic-meter mic-meter-large' : 'mic-meter'} title="Mic level">
      <span className="mic-icon">🎙</span>
      <div ref={ref} className="mic-segs">
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <div key={i} className="mic-seg" />
        ))}
      </div>
    </div>
  )
}
