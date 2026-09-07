import { useEffect, useState } from 'react'
import { useReducedMotion } from '../lib/useReducedMotion'
import { sfx } from '../lib/audio/sfx'

/** A short system recovery sequence after all five clones are identified. */
export function ChannelIsolation() {
  const reduced = useReducedMotion()
  const [isolated, setIsolated] = useState(reduced)
  useEffect(() => {
    if (reduced) { setIsolated(true); return }
    sfx.sonar()
    const timer = window.setTimeout(() => { setIsolated(true); sfx.win() }, 1500)
    return () => window.clearTimeout(timer)
  }, [reduced])

  return (
    <div className={'channel-isolation' + (isolated ? ' channels-secured' : '')}>
      <div className="isolation-topline"><span>Central operations / Voice integrity</span><span>05 / 05</span></div>
      <div className="isolation-channels" aria-hidden="true">
        <span className="isolation-track" />
        <span className="isolation-scan" />
        {Array.from({ length: 5 }, (_, i) => (
          <div className="isolation-node" key={i} style={{ animationDelay: `${250 + i * 220}ms` }}>
            <span className="isolation-signal"><i /><i /><i /><i /><i /></span>
            <svg className="isolation-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animationDelay: `${250 + i * 220}ms` }}><path d="m6 12 4 4 8-8" /></svg>
            <span className="isolation-channel-number">0{i + 1}</span>
          </div>
        ))}
      </div>
      <div className="isolation-status" role="status">
        {isolated ? 'Cloned voices isolated' : 'Isolating VIKI’s cloned voices…'}
      </div>
      <p className="isolation-caption">All five fakes caught. {isolated ? 'Genuine recordings ready for review.' : 'Disconnecting impersonation channels.'}</p>
    </div>
  )
}
