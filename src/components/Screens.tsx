// DAIL screens — Dale's storyboard plus the red-flag reveal:
//   1. BriefScreen    — transmission from Central Operations + team name
//   2. TestScreen     — the Turing test: all 10 clips, lock in, retry until perfect
//   3. FlagsScreen    — the five fakes revealed, each with its red flag
//   4. RiddleScreen   — replay the 5 genuine clips, spot the warning sign
//   5. OverrideScreen — the override digit ceremony
// (+ DebriefScreen — the voice-cloning safety takeaway.)

import { useEffect, useRef, useState } from 'react'
import type { ClipPlayer } from '../lib/audio/clipPlayer'
import type { GridClip, Team } from '../types'
import { RIDDLE, ESCAPE, REAL_CLIPS } from '../game/content'
import { sfx } from '../lib/audio/sfx'
import { apiFetch } from '../lib/api'
import { ClipCard } from './ClipCard'
import { TeamPicker } from './TeamPicker'
import { Confetti } from './Confetti'
import { useReducedMotion } from '../lib/useReducedMotion'

// ---------------------------------------------------------------------------
const TRANSMISSION = [
  '>> CENTRAL OPERATIONS — PRIORITY TRANSMISSION',
  '>> ⚠ SECURITY ALERT',
  '>> VIKI has discovered voice cloning.',
  '>> It now sounds exactly like our Head of Automation Dale,',
  '>> and has been using those voices to push',
  '>> its own recommendations.',
  '>> Ten voice messages have been intercepted.',
  '>> Five are genuine, five are VIKI in disguise.',
  '>> Spot the fakes before VIKI sways council decisions —',
  '>> and recover the second override digit.',
].join('\n')

const ALERT_LINE = '⚠ SECURITY ALERT'
const CLONE_LINE = 'VIKI has discovered voice cloning.'

/** Reveal the transmission as plain text, but flag the alert line coral-red
 *  once it has fully typed out — like a system breach warning. */
function renderTransmission(shown: string) {
  const i = shown.indexOf(ALERT_LINE)
  if (i === -1) return shown
  return (
    <>
      {shown.slice(0, i)}
      <span className="sys-alert">{ALERT_LINE}</span>
      {shown.slice(i + ALERT_LINE.length)}
    </>
  )
}

export function BriefScreen({ onStart }: { onStart: (teamName: string, teamId: string | null) => void }) {
  const reduced = useReducedMotion()
  const [chars, setChars] = useState(() => reduced ? TRANSMISSION.length : 0)
  const [skipped, setSkipped] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const starting = useRef(false)
  const startTimer = useRef<number>()
  const done = chars >= TRANSMISSION.length
  const alertArrived = !skipped && chars >= TRANSMISSION.indexOf(ALERT_LINE) + ALERT_LINE.length
  const cloneArrived = chars >= TRANSMISSION.indexOf(CLONE_LINE) + CLONE_LINE.length
  const skipTransmission = () => { setSkipped(true); setChars(TRANSMISSION.length) }
  useEffect(() => () => window.clearTimeout(startTimer.current), [])

  const [teams, setTeams] = useState<Team[] | null>(null) // null = still loading
  const [loadFailed, setLoadFailed] = useState(false)
  const [selectedId, setSelectedId] = useState('')

  useEffect(() => {
    if (reduced) { setChars(TRANSMISSION.length); return }
    if (done) return
    const id = window.setInterval(() => {
      setChars((c) => {
        if (c + 2 >= TRANSMISSION.length) { window.clearInterval(id); return TRANSMISSION.length }
        return c + 2
      })
    }, 24)
    return () => window.clearInterval(id)
  }, [reduced, done])

  // Load the registered teams. Only registered teams can play — there is no
  // manual fallback; a failure shows a retry, not a way around the roster.
  const loadTeams = () => {
    setLoadFailed(false)
    setTeams(null)
    apiFetch('/api/teams', { headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: Team[]) => setTeams(Array.isArray(data) ? data : []))
      .catch(() => { setTeams([]); setLoadFailed(true) })
  }
  useEffect(() => { loadTeams() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const chosen = teams?.find((t) => t.id === selectedId) ?? null
  const canStart = done && !!chosen && !connecting
  const submit = () => {
    if (!chosen || !done || starting.current) return
    starting.current = true
    setConnecting(true)
    sfx.tap()
    startTimer.current = window.setTimeout(() => onStart(chosen.name, chosen.id), reduced ? 0 : 850)
  }

  const placeholder = loadFailed
    ? "Couldn't load the team list"
    : teams === null
      ? 'Loading teams…'
      : teams.length === 0
        ? 'No teams registered yet'
        : 'Select your team'

  return (
    <div className={'v-screen brief-screen' + (connecting ? ' brief-connecting' : '')}>
      <div className={'brief-portrait' + (cloneArrived ? ' identity-disrupted' : '')} aria-hidden="true">
        <img className="portrait-base" src={`${import.meta.env.BASE_URL}dail-portrait.jpg`} alt="" />
        <svg className="portrait-eye" viewBox="0 0 760 1013" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <defs>
            <radialGradient id="eye-blue-glow">
              <stop offset="0" stopColor="#b8f5ff" stopOpacity="0.85" />
              <stop offset="0.28" stopColor="#36caff" stopOpacity="0.65" />
              <stop offset="0.6" stopColor="#008dff" stopOpacity="0.25" />
              <stop offset="1" stopColor="#008dff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx="450" cy="275" rx="30" ry="21" fill="url(#eye-blue-glow)" />
        </svg>
        <img className="portrait-echo portrait-echo-cyan" src={`${import.meta.env.BASE_URL}dail-portrait.jpg`} alt="" />
        <img className="portrait-echo portrait-echo-coral" src={`${import.meta.env.BASE_URL}dail-portrait.jpg`} alt="" />
      </div>
      <div className="intro-kicker">The Turing Test Challenge</div>
      <h1 className="v-title">D<span className="name-ai">AI</span>L</h1>
      <div
        className={'transmission' + (alertArrived ? ' transmission-alert' : '') + (done ? ' transmission-complete' : '')}
      >
        <div className="transmission-header">
          <span className={'signal-status' + (done ? ' signal-complete' : '')} role="status">
            <span className="signal-dot" aria-hidden="true" />
            {connecting ? 'Connection secured' : done ? 'Transmission received' : 'Incoming transmission'}
          </span>
          <span className="signal-channel" aria-hidden="true">DAIL / 02</span>
        </div>
        <pre className="transmission-text" aria-hidden="true">
          <span className="transmission-spacer">{TRANSMISSION}</span>
          <span className="transmission-typed">
            {renderTransmission(TRANSMISSION.slice(0, chars))}
            {!done && <span className="cursor" />}
          </span>
        </pre>
        <p className="sr-only">{TRANSMISSION}</p>
        <div className="transmission-footer">
          <span>{done ? '10 recordings · 5 imposters · 1 override digit' : 'Receiving intercepted briefing…'}</span>
          {!done && <button className="transmission-skip" onClick={skipTransmission}>Skip briefing animation →</button>}
        </div>
      </div>
      <div className={'brief-join' + (done ? ' brief-join-ready' : '')}>
        <TeamPicker
          teams={teams ?? []}
          value={selectedId}
          placeholder={placeholder}
          disabled={connecting || !teams || teams.length === 0}
          onChange={setSelectedId}
        />
        <button className={'btn-primary btn-lg brief-start' + (connecting ? ' brief-start-secured' : '')} onClick={submit} disabled={!canStart}>
          <span>{connecting ? 'Connection secured' : 'Enter the challenge'}</span>
          <span className="brief-start-icon" aria-hidden="true">{connecting ? '✓' : '→'}</span>
        </button>
      </div>
      {loadFailed && (
        <button className="brief-manual-toggle" onClick={loadTeams}>
          ⟳ Retry loading teams
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
export function TestScreen({ player, clips, onMark, onPass }: {
  player: ClipPlayer
  clips: GridClip[]
  onMark: (id: string, mark: boolean) => void
  onPass: () => void
}) {
  const [attempts, setAttempts] = useState(0)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [heard, setHeard] = useState<Set<string>>(() => new Set())
  // Confirmed fakes stay locked between attempts.
  const [locked, setLocked] = useState<Set<string>>(() => new Set())

  // Remember every clip the team has pressed play on (✓ on the player).
  useEffect(
    () =>
      player.onChange(() => {
        const id = player.currentId
        if (id) setHeard((prev) => (prev.has(id) ? prev : new Set(prev).add(id)))
      }),
    [player],
  )

  const allMarked = clips.every((c) => c.mark !== null)
  const aiMarked = clips.filter((c) => c.mark === false).length
  const fakeTotal = clips.filter((c) => !c.isReal).length

  const submit = () => {
    if (!allMarked) {
      sfx.deny()
      setAttempts((a) => a + 1)
      const missing = clips
        .map((c, i) => (c.mark === null ? i + 1 : null))
        .filter((n): n is number => n !== null)
      setFeedback(
        missing.length === 1
          ? `You haven't marked clip ${missing[0]} yet.`
          : `You haven't marked clips ${missing.join(', ')} yet.`,
      )
      return
    }
    if (aiMarked !== fakeTotal) {
      sfx.deny()
      setAttempts((a) => a + 1)
      setFeedback(`Mark exactly ${fakeTotal} voices as AI — those are the imposters.`)
      return
    }
    // Lock every fake clip they've correctly caught as AI.
    const next = new Set(locked)
    clips.forEach((c) => { if (!c.isReal && c.mark === false) next.add(c.id) })
    const newly = next.size - locked.size
    setLocked(next)

    if (next.size === fakeTotal) {
      sfx.win()
      player.stop()
      onPass()
      return
    }
    setAttempts((a) => a + 1)
    const found = next.size
    const remaining = fakeTotal - found
    const fakeWord = `fake recording${found === 1 ? '' : 's'}`
    const cloneClause = `${remaining} more VIKI clone${remaining === 1 ? ' is' : 's are'} still operating undetected`
    if (newly > 0) sfx.win()
    else sfx.deny()
    setFeedback(`${found} ${fakeWord} identified. ${cloneClause}.`)
  }

  return (
    <div className="v-screen test-screen">
      <div className="intro-kicker">The Turing Test</div>
      <h2 className="v-h1">Spot the fakes</h2>
      <p className="v-lead test-lead">
        VIKI has been cloning staff voices to influence decisions and bypass human
        oversight. Five recordings are genuine. Five are AI-generated imposters.
        Listen carefully and decide which are <strong>Real</strong> and which are <strong>AI</strong>.
      </p>
      <div className="catch-progress" role="status" aria-live="polite">
        <span className="catch-dots" aria-hidden="true">
          {Array.from({ length: fakeTotal }, (_, i) => <span key={i} className={i < locked.size ? 'caught' : ''} />)}
        </span>
        <span><strong>{locked.size}/{fakeTotal}</strong> fakes caught</span>
      </div>
      <div className="test-grid">
        {clips.map((c, i) => (
          <ClipCard
            key={c.id}
            player={player}
            clip={c}
            index={i}
            heard={heard.has(c.id)}
            locked={locked.has(c.id)}
            onMark={(m) => onMark(c.id, m)}
          />
        ))}
      </div>
      {feedback && (
        <p key={attempts} className="test-feedback" role="status">{feedback}</p>
      )}
      <div className="test-actions">
        <button className="btn-primary btn-lg" onClick={submit}>
          Lock in answers
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
export function FlagsScreen({ player, fakeClips, onNext }: {
  player: ClipPlayer
  fakeClips: GridClip[]
  onNext: () => void
}) {
  useEffect(() => { sfx.win() }, [])
  return (
    <div className="v-screen flags-screen">
      <Confetti milestone />
      <div className="fakes-victory" role="status">
        <span className="fakes-victory-check" aria-hidden="true">✓</span>
        <span><strong>5/5</strong> · All five fakes caught</span>
      </div>
      <h2 className="v-h1">Here's what should have raised suspicion</h2>
      <p className="v-lead flags-lead">
        You've identified VIKI's five messages. Review the warning signs, then examine
        Dale's genuine recordings to work out what was happening before the incident.
      </p>
      <div className="flags-list">
        {fakeClips.map((c, i) => (
          <div className="flag-row" key={c.id}>
            <div className="flag-clip">
              <ClipCard player={player} clip={c} index={i} onMark={() => {}} readOnly />
            </div>
            <div className="flag-meta">
              <span className="flag-subject">{c.subject}</span>
              <span className="flag-chip">🚩 {c.redFlag}</span>
            </div>
          </div>
        ))}
      </div>
      <button className="btn-primary btn-lg" onClick={() => { player.stop(); onNext() }}>
        Now — the genuine recordings
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
export function RiddleScreen({ player, realClips, onSolved }: {
  player: ClipPlayer
  realClips: GridClip[]
  onSolved: () => void
}) {
  const [picked, setPicked] = useState<string | null>(null)
  const [wrong, setWrong] = useState(false)
  const solvedRef = useRef(false)
  const nextTimer = useRef<number>()
  const reduced = useReducedMotion()
  useEffect(() => () => window.clearTimeout(nextTimer.current), [])

  const choose = (id: string) => {
    if (solvedRef.current) return
    setWrong(false)
    setPicked(id)
    const opt = RIDDLE.options.find((o) => o.id === id)
    if (opt?.correct) {
      sfx.tap()
      player.stop()
      solvedRef.current = true
      nextTimer.current = window.setTimeout(onSolved, reduced ? 0 : 550)
    } else {
      sfx.deny()
      setWrong(true)
    }
  }

  return (
    <div className="v-screen riddle-screen">
      <div className="intro-kicker">Stage 2 · The warning sign</div>
      <h2 className="v-h1">{RIDDLE.question}</h2>
      <p className="v-lead">Replay Dale's five genuine messages. What do they all have in common?</p>
      <div className="riddle-layout">
        <div className="riddle-clips">
          {realClips.map((c, i) => (
            <ClipCard key={c.id} player={player} clip={c} index={i} onMark={() => {}} readOnly />
          ))}
        </div>
        <div className="riddle-options">
          {RIDDLE.options.map((o) => (
            <button
              key={o.id}
              className={
                'riddle-opt' +
                (picked === o.id ? (o.correct ? ' riddle-opt-right' : ' riddle-opt-wrong') : '')
              }
              disabled={solvedRef.current}
              onClick={() => choose(o.id)}
            >
              <span className="riddle-letter">{o.id}</span>
              <span>{o.label}</span>
            </button>
          ))}
          {wrong && <p className="riddle-wrong-note">Not quite — compare the concerns in the genuine messages. What pattern was developing across services?</p>}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
export function OverrideScreen({ teamName, solveTime, onNext }: {
  teamName: string
  solveTime?: string
  onNext: () => void
}) {
  const reduced = useReducedMotion()
  const [revealed, setRevealed] = useState(reduced)
  useEffect(() => {
    const t = window.setTimeout(() => setRevealed(true), reduced ? 0 : 700)
    return () => window.clearTimeout(t)
  }, [reduced])
  useEffect(() => {
    sfx.sonar()
    const t = window.setTimeout(() => sfx.win(), 750)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <div className={"v-screen override-screen" + (revealed ? " override-revealed" : "")} >
      {revealed && <Confetti />}
      <div className="intro-kicker">
        Access granted{teamName ? ` · ${teamName}` : ''}{solveTime ? ` · solved in ${solveTime}` : ''}
      </div>
      <div className="override-status" role="status">{revealed ? "Override recovered" : "Releasing override…"}</div>
      <p className="v-lead insight-line">{ESCAPE.insight}</p>
      <p className="v-lead escape-letter-label">The second override digit</p>
      <div className="letter-stage">
        <span className="sonar-ring" />
        <div className="escape-halo" />
        {!revealed && <span className="override-lock" aria-label="Unlocking"><span /></span>}
        <div className="escape-letter" aria-hidden={!revealed}>{ESCAPE.digit}</div>
      </div>
      <p className="v-lead v-flavour">{ESCAPE.flavour}</p>
      <button className="btn-primary btn-lg" onClick={onNext} disabled={!revealed}>What just happened?</button>
    </div>
  )
}

// ---------------------------------------------------------------------------
export function DebriefScreen({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="v-screen debrief-screen">
      <h2 className="v-h1">Could you tell the difference?</h2>
      <div className="debrief-body">
        <p className="v-body">
          AI voice-cloning technology can study recordings of a person speaking
          and learn the patterns in their voice — their accent, rhythm, tone and
          pronunciation. It can then generate new speech that sounds as though
          the person said words they never actually spoke.
        </p>
        <p className="v-body">
          Voice cloning can be useful for entertainment, accessibility and
          translation, but it can also be misused. Criminals may imitate a
          family member, colleague or senior leader to request money, passwords,
          confidential information or urgent action. A convincing voice is no
          longer proof that the caller is genuine.
        </p>
        <h3 className="debrief-h">Stop. Check. Confirm.</h3>
        <ul className="v-list">
          <li>Do not share passwords, security codes or sensitive information.</li>
          <li>Do not transfer money based only on a voice request.</li>
          <li>End the call and contact the person using a trusted number you already have.</li>
          <li>Ask a question or use a private phrase that an impersonator would not know.</li>
          <li>Report suspicious messages or calls through the correct security channel.</li>
        </ul>
      </div>
      <h3 className="debrief-final">Listen carefully — but always verify another way.</h3>
      <button className="btn-primary btn-lg" onClick={onRestart}>Play again</button>
    </div>
  )
}

/** Keep genuine clips in their scripted order for the comparison. */
export function riddleOrder(clips: GridClip[]): GridClip[] {
  return REAL_CLIPS.map((rc) => clips.find((c) => c.id === rc.id)).filter(Boolean) as GridClip[]
}
