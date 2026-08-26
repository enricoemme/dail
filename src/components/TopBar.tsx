interface Props {
  /** 0..1 overall progress through the game, drives the thin bar. */
  progress: number
  /** Optional right-hand label, e.g. the team name. */
  teamName?: string
  /** Running solve-time label (e.g. "1:24"); omitted before the test starts. */
  timer?: string
  /** True once the challenge is solved and the clock has frozen. */
  timerStopped?: boolean
}

/** Slim frosted top bar: brand mark + a coral progress line + solve timer. */
export function TopBar({ progress, teamName, timer, timerStopped }: Props) {
  return (
    <header className="topbar">
      <div className="topbar-brand">
        <span className="brand-mark" aria-hidden="true">
          <span className="brand-wave" />
          <span className="brand-wave" />
          <span className="brand-wave" />
        </span>
        <span className="brand-word">DAIL</span>
      </div>
      <div className="topbar-progress">
        <div className="topbar-progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
      <div className="topbar-right">
        {timer && (
          <span className={'topbar-timer' + (timerStopped ? ' topbar-timer-stopped' : '')}>
            ⏱ {timer}
          </span>
        )}
        {teamName && <span className="topbar-team">Team {teamName}</span>}
      </div>
    </header>
  )
}
