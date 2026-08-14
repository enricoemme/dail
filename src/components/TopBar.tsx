interface Props {
  /** 0..1 overall progress through the game, drives the thin bar. */
  progress: number
  /** Optional right-hand label, e.g. the team name. */
  teamName?: string
}

/** Slim frosted top bar: brand mark + a coral progress line. */
export function TopBar({ progress, teamName }: Props) {
  return (
    <header className="topbar">
      <div className="topbar-brand">
        <span className="brand-mark" aria-hidden="true">
          <span className="brand-wave" />
          <span className="brand-wave" />
          <span className="brand-wave" />
        </span>
        <span className="brand-word">D<span className="name-ai">AI</span>L</span>
      </div>
      <div className="topbar-progress">
        <div className="topbar-progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
      {teamName ? <div className="topbar-team">Team {teamName}</div> : <div className="topbar-team" />}
    </header>
  )
}
