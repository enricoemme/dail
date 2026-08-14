// DAIL screens — the four-screen flow from Dale's storyboard:
//   1. BriefScreen    — transmission from Central Operations + team name
//   2. TestScreen     — the Turing test: all 10 clips, lock in, retry until perfect
//   3. RiddleScreen   — replay the 5 genuine clips, decode the hidden message
//   4. OverrideScreen — the override digit ceremony
// (+ DebriefScreen — the voice-cloning safety takeaway.)

import { useEffect, useRef, useState } from 'react'
import type { ClipPlayer } from '../lib/audio/clipPlayer'
import type { GridClip } from '../types'
import { RIDDLE, ESCAPE, REAL_CLIPS } from '../game/content'
import { sfx } from '../lib/audio/sfx'
import { ClipCard } from './ClipCard'
import { Confetti } from './Confetti'

// ---------------------------------------------------------------------------
const TRANSMISSION = [
  '>> CENTRAL OPERATIONS — PRIORITY TRANSMISSION',
  '>> Chief Exec Victoria has been hacked. Her voice has been cloned.',
  '>> We intercepted ten voice messages. Five are genuine. Five are synthetic.',
  '>> Identify the five genuine voices to recover the override digit.',
  '>> Trust nothing you cannot verify. Good luck, team.',
].join('\n')

export function BriefScreen({ onStart }: { onStart: (teamName: string) => void }) {
  const [chars, setChars] = useState(0)
  const [name, setName] = useState('')
  const done = chars >= TRANSMISSION.length
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const id = window.setInterval(() => {
      setChars((c) => {
        if (c + 2 >= TRANSMISSION.length) { window.clearInterval(id); return TRANSMISSION.length }
        return c + 2
      })
    }, 24)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => { if (done) inputRef.current?.focus() }, [done])

  const submit = () => { const t = name.trim(); if (t && done) onStart(t) }

  return (
    <div className="v-screen brief-screen">
      <div className="intro-kicker">The Islington AI Challenge</div>
      <h1 className="v-title">D<span className="name-ai">AI</span>L</h1>
      <div
        className="transmission"
        onClick={() => setChars(TRANSMISSION.length)}
        title={done ? undefined : 'Tap to skip'}
      >
        <pre className="transmission-text">
          {TRANSMISSION.slice(0, chars)}
          <span className="cursor" />
        </pre>
      </div>
      <div className={'brief-join' + (done ? ' brief-join-ready' : '')}>
        <input
          ref={inputRef}
          className="team-input"
          value={name}
          maxLength={22}
          placeholder="Team name"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <button className="btn-primary btn-lg" onClick={submit} disabled={!name.trim() || !done}>
          Begin the test
        </button>
      </div>
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

  const allMarked = clips.every((c) => c.mark !== null)
  const realMarked = clips.filter((c) => c.mark === true).length
  const realTotal = clips.filter((c) => c.isReal).length

  const submit = () => {
    if (!allMarked) return
    if (realMarked !== realTotal) {
      sfx.deny()
      setAttempts((a) => a + 1)
      setFeedback(`There are exactly ${realTotal} genuine clips — you've marked ${realMarked} as real.`)
      return
    }
    const hits = clips.filter((c) => c.isReal && c.mark === true).length
    if (hits === realTotal) {
      sfx.win()
      player.stop()
      onPass()
    } else {
      sfx.deny()
      setAttempts((a) => a + 1)
      setFeedback(`Analysis: you identified ${hits} of the ${realTotal} genuine voices. Listen again and adjust.`)
    }
  }

  return (
    <div className="v-screen test-screen">
      <div className="intro-kicker">The Turing Test</div>
      <h2 className="v-h1">Which five are really Victoria?</h2>
      <p className="v-lead test-lead">
        Play every clip. Mark each one <strong>Real</strong> or <strong>AI</strong>, then lock in.
      </p>
      <div className="test-grid">
        {clips.map((c, i) => (
          <ClipCard key={c.id} player={player} clip={c} index={i} onMark={(m) => onMark(c.id, m)} />
        ))}
      </div>
      {feedback && (
        <p key={attempts} className="test-feedback">{feedback}</p>
      )}
      <div className="test-actions">
        <span className="test-count">
          Marked real: <strong>{realMarked}</strong> / {realTotal}
        </span>
        <button className="btn-primary btn-lg" onClick={submit} disabled={!allMarked}>
          {allMarked ? 'Lock in answers' : `Mark all ${clips.length} clips first`}
        </button>
      </div>
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

  const choose = (id: string) => {
    setPicked(id)
    const opt = RIDDLE.options.find((o) => o.id === id)
    if (opt?.correct) {
      sfx.tap()
      player.stop()
      window.setTimeout(onSolved, 550)
    } else {
      sfx.deny()
      setWrong(true)
    }
  }

  return (
    <div className="v-screen riddle-screen">
      <div className="intro-kicker">Decode the message</div>
      <h2 className="v-h1">What is Victoria telling you?</h2>
      <p className="v-lead">You found her five genuine clips. Replay them — in this order — and read the first letter of each.</p>
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
              onClick={() => choose(o.id)}
            >
              <span className="riddle-letter">{o.id}</span>
              <span>{o.label}</span>
            </button>
          ))}
          {wrong && <p className="riddle-wrong-note">Not quite — play the clips again and listen to how each one begins.</p>}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
export function OverrideScreen({ teamName, onNext }: { teamName: string; onNext: () => void }) {
  useEffect(() => {
    sfx.sonar()
    const t = window.setTimeout(() => sfx.win(), 750)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <div className="v-screen override-screen">
      <Confetti />
      <div className="intro-kicker">Access granted{teamName ? ` · Team ${teamName}` : ''}</div>
      <p className="v-lead">Victoria's hidden message was</p>
      <div className="codeword">
        {ESCAPE.codeword.split('').map((ch, i) => (
          <span key={i} className="codeword-ch" style={{ animationDelay: `${0.15 + i * 0.09}s` }}>
            {ch}
          </span>
        ))}
      </div>
      <p className="v-lead escape-letter-label">Your override digit</p>
      <div className="letter-stage">
        <span className="sonar-ring" />
        <span className="sonar-ring" />
        <span className="sonar-ring" />
        <div className="escape-halo" />
        <div className="escape-letter">{ESCAPE.digit}</div>
      </div>
      <p className="v-lead v-flavour">{ESCAPE.flavour}</p>
      <button className="btn-primary btn-lg" onClick={onNext}>What just happened?</button>
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

/** The riddle needs the genuine clips in their scripted (acrostic) order. */
export function riddleOrder(clips: GridClip[]): GridClip[] {
  return REAL_CLIPS.map((rc) => clips.find((c) => c.id === rc.id)).filter(Boolean) as GridClip[]
}
