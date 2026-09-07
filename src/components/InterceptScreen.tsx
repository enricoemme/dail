import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '../lib/useReducedMotion'
import { sfx } from '../lib/audio/sfx'

/** A one-off story beat between identifying the clones and reviewing evidence. */
export function InterceptScreen({ onComplete }: { onComplete: () => void }) {
  const reduced = useReducedMotion()
  const [beat, setBeat] = useState(reduced ? 2 : 0)
  const complete = useRef(onComplete)
  const finished = useRef(false)
  const title = useRef<HTMLHeadingElement>(null)
  complete.current = onComplete
  const finish = () => {
    if (finished.current) return
    finished.current = true
    complete.current()
  }

  useEffect(() => {
    title.current?.focus({ preventScroll: true })
    if (reduced) { setBeat(2); return }
    sfx.intercept()
    const timers = [
      window.setTimeout(() => setBeat(1), 700),
      window.setTimeout(() => { setBeat(2); sfx.win() }, 2250),
      window.setTimeout(finish, 4400),
    ]
    return () => timers.forEach(window.clearTimeout)
  }, [reduced])

  return (
    <div className={`v-screen intercept-screen intercept-beat-${beat}`}>
      <div className="intercept-grid" aria-hidden="true" />
      <div className="intercept-portrait" aria-hidden="true">
        {[0, 1, 2].map((slice) => <img key={slice} className={`intercept-slice intercept-slice-${slice}`} src={`${import.meta.env.BASE_URL}dail-portrait.jpg`} alt="" />)}
      </div>
      <div className="intercept-orbit" aria-hidden="true"><span /><span /><span /></div>
      <div className="intercept-sweep" aria-hidden="true" />
      <div className="intercept-content">
        <div className="intercept-kicker"><span />Central operations · Countermeasure active</div>
        <p className="intercept-score">5 / 5 IMPOSTERS IDENTIFIED</p>
        <h1 ref={title} tabIndex={-1} className="intercept-title" aria-live="polite">
          {beat === 0 ? <>VIKI SIGNAL<br /><em>DETECTED.</em></> : beat === 1 ? <>CUTTING THE<br /><em>CONNECTION.</em></> : <>YOU BROKE<br /><em>THE SIGNAL.</em></>}
        </h1>
        <div className="intercept-channels" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="intercept-channel" style={{ animationDelay: `${750 + i * 240}ms` }}><span>VOICE 0{i + 1}</span><b>×</b><i>ISOLATED</i></div>)}
        </div>
        <p className="intercept-caption" role="status">{beat < 2 ? 'Disconnecting VIKI’s five impersonation channels…' : 'VIKI’s cloned voices are isolated. The genuine recordings are yours.'}</p>
        <button className="btn-ghost intercept-continue" onClick={finish}>{beat < 2 ? 'Skip sequence' : 'Review the evidence'} <span aria-hidden="true">→</span></button>
      </div>
    </div>
  )
}
