import { useState } from 'react'

interface Props {
  onRestart: () => void
  onSkip: () => void
}

/** Discreet staff controls behind a small gear icon (bottom-right). */
export function FacilitatorMenu({ onRestart, onSkip }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="facilitator">
      <button className="fac-gear" aria-label="Facilitator menu" onClick={() => setOpen((v) => !v)}>
        ⚙
      </button>
      {open && (
        <div className="fac-panel">
          <div className="fac-title">Staff controls</div>
          <button className="fac-btn" onClick={() => { onSkip(); setOpen(false) }}>
            Skip to next screen
          </button>
          <button className="fac-btn" onClick={() => { onRestart(); setOpen(false) }}>
            Restart game
          </button>
          <button className="fac-btn" onClick={() => document.documentElement.requestFullscreen?.()}>
            Enter fullscreen
          </button>
          <button className="fac-btn fac-close" onClick={() => setOpen(false)}>Close</button>
        </div>
      )}
    </div>
  )
}
