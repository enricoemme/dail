import { useEffect, useRef, useState } from 'react'
import { sfx } from '../lib/audio/sfx'

const PASSWORD = 'ISLINGTON2026'

interface Props {
  onUnlock: () => void
}

/** Simple access gate for the hosted preview (client-side, kiosk-grade). */
export function LockScreen({ onUnlock }: Props) {
  const [value, setValue] = useState('')
  const [wrong, setWrong] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => inputRef.current?.focus(), [])

  const submit = () => {
    if (value.trim().toUpperCase() === PASSWORD) {
      sfx.win()
      onUnlock()
    } else {
      sfx.deny()
      setWrong((w) => w + 1)
      setValue('')
      inputRef.current?.focus()
    }
  }

  return (
    <div className="v-screen lock-screen">
      <div className="intro-kicker">The Turing Test Challenge</div>
      <h1 className="v-title">D<span className="name-ai">AI</span>L</h1>

      <figure className="hero-portrait">
        <img src={`${import.meta.env.BASE_URL}dail-portrait.jpg`} alt="Half-human, half-AI portrait" />
        <span className="hero-scan" aria-hidden="true" />
        <span className="hero-duotone" aria-hidden="true" />
        <figcaption className="hero-caption">Human, or machine? Soon you won't be able to tell.</figcaption>
      </figure>

      <div className="lock-panel" key={wrong}>
        <p className="v-lead lock-lead">🔒 Enter the access code to begin.</p>
        <input
          ref={inputRef}
          className="team-input lock-input"
          type="password"
          value={value}
          placeholder="Access code"
          autoComplete="off"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <button className="btn-primary btn-lg" onClick={submit} disabled={!value.trim()}>
          Unlock
        </button>
        {wrong > 0 && <p className="lock-wrong">That's not it — check with the DAIL team.</p>}
      </div>
    </div>
  )
}
