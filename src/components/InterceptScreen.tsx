import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '../lib/useReducedMotion'
import { sfx } from '../lib/audio/sfx'

/** A brief visual unlock simulation; advances automatically without a reading step. */
export function InterceptScreen({ onComplete }: { onComplete: () => void }) {
  const reduced = useReducedMotion()
  const [progress, setProgress] = useState(reduced ? 100 : 0)
  const complete = useRef(onComplete)
  const finished = useRef(false)
  const screen = useRef<HTMLDivElement>(null)
  complete.current = onComplete
  const unlocked = progress === 100
  const finish = () => {
    if (finished.current) return
    finished.current = true
    complete.current()
  }

  useEffect(() => {
    screen.current?.focus({ preventScroll: true })
    const stopSound = sfx.unlock(reduced)
    let frame = 0
    if (reduced) setProgress(100)
    else {
      setProgress(0)
      const start = performance.now()
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / 1500)
        setProgress(Math.floor(t * 100))
        if (t < 1) frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    }
    const timer = window.setTimeout(finish, reduced ? 1300 : 2800)
    return () => { cancelAnimationFrame(frame); window.clearTimeout(timer); stopSound() }
  }, [reduced])

  return (
    <div ref={screen} tabIndex={-1} className={'v-screen unlock-simulation' + (unlocked ? ' simulation-unlocked' : '')}>
      <div className="simulation-grid" aria-hidden="true" />
      <div className="simulation-device" role="progressbar" aria-label="Unlocking" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
        <span className="simulation-wave" aria-hidden="true" />
        <svg className="simulation-dial" viewBox="0 0 320 320" aria-hidden="true">
          <defs><linearGradient id="unlock-ring" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ffb98a" /><stop offset="1" stopColor="#ff5e86" /></linearGradient></defs>
          <circle className="simulation-ticks" cx="160" cy="160" r="152" pathLength="100" />
          <circle className="simulation-track" cx="160" cy="160" r="135" />
          <circle className="simulation-progress" cx="160" cy="160" r="135" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - progress} />
          <circle className="simulation-inner" cx="160" cy="160" r="112" />
        </svg>
        <svg className="simulation-lock" viewBox="0 0 100 110" fill="none" aria-hidden="true">
          <path className="simulation-shackle" d="M28 48V30a22 22 0 0 1 44 0v18" />
          <rect className="simulation-lock-body" x="17" y="46" width="66" height="55" rx="12" />
          <circle className="simulation-keyhole" cx="50" cy="68" r="5" />
          <path className="simulation-keyhole" d="M50 72v10" />
        </svg>
        <span className="simulation-percent" aria-hidden="true">{progress}<small>%</small></span>
      </div>
      <h1 className="simulation-status" aria-live="polite">{unlocked ? 'UNLOCKED' : 'UNLOCKING'}</h1>
      <button className="simulation-skip" onClick={finish}>Skip <span aria-hidden="true">→</span></button>
    </div>
  )
}
