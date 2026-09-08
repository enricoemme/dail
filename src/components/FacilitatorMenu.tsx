import { useEffect, useState } from 'react'
import { sfx } from '../lib/audio/sfx'
import { musicStatus, MUSIC_LABELS } from '../lib/audio/musicStatus'

interface Props {
  onRestart: () => void
  onSkip: () => void
}

/** Discreet staff controls behind a small gear icon (bottom-right). */
export function FacilitatorMenu({ onRestart, onSkip }: Props) {
  const [music, setMusic] = useState(musicStatus.get)
  const [open, setOpen] = useState(false)
  const [muted, setMuted] = useState(sfx.muted)

  useEffect(() => {
    const updateMusic = () => setMusic(musicStatus.get())
    updateMusic()
    window.addEventListener('dail-music-status', updateMusic)
    const sync = () => setMuted(sfx.muted)
    window.addEventListener('dail-mute-change', sync)
    return () => { window.removeEventListener('dail-mute-change', sync); window.removeEventListener('dail-music-status', updateMusic) }
  }, [])

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
          <button
            className="fac-btn"
            onClick={() => { sfx.setMuted(!muted); setMuted(!muted); if (muted) sfx.tap() }}
          >
            {muted ? 'Sound: off' : 'Sound: on'}
          </button>
          <p className="fac-music-status" role="status">{MUSIC_LABELS[music]}</p>
          {music !== 'inactive' && <button className="fac-btn" onClick={() => window.dispatchEvent(new Event('dail-music-retry'))}>Play music</button>}
          <button className="fac-btn fac-close" onClick={() => setOpen(false)}>Close</button>
        </div>
      )}
    </div>
  )
}
