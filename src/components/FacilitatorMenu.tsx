import { useState } from 'react'
import { clearLeaderboard } from '../game/leaderboard'

interface Props {
  /** Only offered mid-round. */
  canSkipRound: boolean
  onSkipRound: () => void
  onRestartGame: () => void
}

/**
 * Discreet staff controls behind a small gear icon. Destructive actions need
 * a second tap ("Sure?") so a stray finger can't wipe a game.
 */
export function FacilitatorMenu({ canSkipRound, onSkipRound, onRestartGame }: Props) {
  const [open, setOpen] = useState(false)
  const [arm, setArm] = useState<string | null>(null)

  const armed = (key: string, label: string, action: () => void) => (
    <button
      className={'fac-btn' + (arm === key ? ' fac-btn-armed' : '')}
      onClick={() => {
        if (arm === key) {
          setArm(null)
          setOpen(false)
          action()
        } else {
          setArm(key)
        }
      }}
    >
      {arm === key ? 'Sure? Tap again' : label}
    </button>
  )

  return (
    <div className="facilitator">
      <button
        className="fac-gear"
        aria-label="Facilitator menu"
        onClick={() => { setOpen((v) => !v); setArm(null) }}
      >
        ⚙
      </button>
      {open && (
        <div className="fac-panel">
          <div className="fac-title">Staff controls</div>
          {canSkipRound && armed('skip', 'Skip this round', onSkipRound)}
          {armed('restart', 'Restart game', onRestartGame)}
          {armed('wipe', 'Clear leaderboard', clearLeaderboard)}
          <button className="fac-btn" onClick={() => document.documentElement.requestFullscreen?.()}>
            Enter fullscreen
          </button>
          <button className="fac-btn fac-close" onClick={() => setOpen(false)}>Close</button>
        </div>
      )}
    </div>
  )
}
