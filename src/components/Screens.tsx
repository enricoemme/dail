// All the non-live screens. Kept in one file — they are small and share the
// same kiosk layout vocabulary.

import { useEffect, useRef, useState } from 'react'
import { formatMs, downloadCsv, sortEntries, loadLeaderboard } from '../game/leaderboard'
import { ROUND_INSTRUCTIONS, TOTAL_ROUNDS } from '../game/rounds'
import { requestMic, startMicCapture, type MicCapture } from '../lib/audio/micCapture'
import type { LeaderboardEntry, PersonCard, RoundResult, VoiceChoice } from '../types'
import { Confetti } from './Confetti'
import { MicMeter } from './MicMeter'
import { ProgressDots } from './ProgressDots'

// ---------------------------------------------------------------------------
export function WelcomeScreen({ onNewPlayer, onLeaderboard }: {
  onNewPlayer: () => void
  onLeaderboard: () => void
}) {
  return (
    <div className="screen welcome">
      <div className="welcome-badge">The Islington AI Challenge</div>
      <h1 className="welcome-title">
        Who <span className="title-or">am</span> I?
      </h1>
      <p className="welcome-sub">
        Five mystery voices. Five Islington legends. Can you unmask them all?
      </p>
      <button className="btn-primary btn-huge" onClick={onNewPlayer}>
        ▶ New Player
      </button>
      <button className="btn-ghost" onClick={onLeaderboard}>
        View leaderboard
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
export function NameScreen({ voiceChoice, onVoiceChoice, onConfirm, onBack }: {
  voiceChoice: VoiceChoice
  onVoiceChoice: (v: VoiceChoice) => void
  onConfirm: (name: string) => void
  onBack: () => void
}) {
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => inputRef.current?.focus(), [])
  const submit = () => {
    const trimmed = name.trim()
    if (trimmed) onConfirm(trimmed)
  }
  return (
    <div className="screen name-screen">
      <h2 className="screen-title">Who's playing?</h2>
      <p className="screen-sub">First name only — it goes on the leaderboard.</p>
      <input
        ref={inputRef}
        className="name-input"
        value={name}
        maxLength={20}
        placeholder="First name"
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      <div className="voice-picker">
        <span className="voice-picker-label">Mystery guest voice</span>
        <div className="voice-options">
          <button
            className={'btn-voice' + (voiceChoice === 'female' ? ' btn-voice-on' : '')}
            onClick={() => onVoiceChoice('female')}
          >
            ♀ Female
          </button>
          <button
            className={'btn-voice' + (voiceChoice === 'male' ? ' btn-voice-on' : '')}
            onClick={() => onVoiceChoice('male')}
          >
            ♂ Male
          </button>
        </div>
      </div>
      <div className="btn-row">
        <button className="btn-ghost" onClick={onBack}>Back</button>
        <button className="btn-primary" onClick={submit} disabled={!name.trim()}>
          Let's go →
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
export function MicCheckScreen({ onReady }: { onReady: () => void }) {
  const [state, setState] = useState<'idle' | 'testing' | 'denied'>('idle')
  const levelRef = useRef(0)
  const capRef = useRef<MicCapture | null>(null)

  useEffect(() => () => capRef.current?.stop(), [])

  const enable = async () => {
    try {
      await requestMic()
      capRef.current = await startMicCapture({
        onChunk: () => {},
        onLevel: (rms) => { levelRef.current = rms },
      })
      setState('testing')
    } catch (err) {
      console.error('Mic permission failed:', err)
      setState('denied')
    }
  }

  return (
    <div className="screen mic-check">
      <h2 className="screen-title">Microphone check</h2>
      {state === 'idle' && (
        <>
          <p className="screen-sub">Pop the headset on, then enable the mic.</p>
          <button className="btn-primary btn-huge" onClick={enable}>🎙 Enable microphone</button>
        </>
      )}
      {state === 'testing' && (
        <>
          <p className="screen-sub">Say something — the bars should light up.</p>
          <MicMeter getLevel={() => levelRef.current} large />
          <button
            className="btn-primary btn-huge"
            onClick={() => { capRef.current?.stop(); onReady() }}
          >
            Mic's working →
          </button>
        </>
      )}
      {state === 'denied' && (
        <>
          <p className="screen-sub screen-sub-error">
            Microphone access was blocked. Allow the mic for this site in the
            browser's site settings, then try again.
          </p>
          <button className="btn-primary" onClick={enable}>Try again</button>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
export function RoundIntroScreen({ roundNumber, playerName, results, baseMs, onStart }: {
  roundNumber: number
  playerName: string
  results: RoundResult[]
  baseMs: number
  onStart: () => void
}) {
  return (
    <div className="screen round-intro">
      <ProgressDots currentRound={roundNumber - 1} results={results} />
      <div className="intro-round-number">Round {roundNumber} of {TOTAL_ROUNDS}</div>
      <h2 className="intro-title">Mystery Guest #{roundNumber}</h2>
      <p className="intro-tagline">Someone famous from Islington is on the line…</p>
      <ul className="intro-instructions">
        {ROUND_INSTRUCTIONS.map((line) => <li key={line}>{line}</li>)}
      </ul>
      <div className="intro-footer">
        <div className="intro-player">
          {playerName} · total so far <strong>{formatMs(baseMs)}</strong>
        </div>
        <button className="btn-primary btn-huge" onClick={onStart}>
          ▶ Start — the clock's running!
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
export function RevealScreen({ person, result, isLast, onNext }: {
  person: PersonCard
  result: RoundResult
  isLast: boolean
  onNext: () => void
}) {
  return (
    <div className={'screen reveal ' + (result.won ? 'reveal-won' : 'reveal-lost')}>
      {result.won && <Confetti />}
      <div className="reveal-stamp">{result.won ? 'YOU GOT IT!' : 'STUMPED!'}</div>
      <div className="reveal-person">
        <div className="reveal-name">{person.name}</div>
        <div className="reveal-era">{person.era}</div>
      </div>
      <p className="reveal-explain">{person.blurb}</p>
      <p className="reveal-detail">
        {result.detail} · round time {formatMs(result.ms)}
      </p>
      <button className="btn-primary btn-huge" onClick={onNext}>
        {isLast ? 'See your results →' : 'Next round →'}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
export function ResultsScreen({ entry, people, rank, onLeaderboard }: {
  entry: LeaderboardEntry
  people: PersonCard[]
  rank: number
  onLeaderboard: () => void
}) {
  return (
    <div className="screen results">
      {entry.score >= 4 && <Confetti />}
      <h2 className="screen-title">Nice one, {entry.name}!</h2>
      <div className="results-headline">
        <div className="results-score">
          {entry.score}<span className="results-outof">/5</span>
        </div>
        <div className="results-time">{formatMs(entry.totalMs)}</div>
        <div className="results-rank">#{rank} on today's leaderboard</div>
      </div>
      <div className="results-breakdown">
        {entry.perRound.map((r, i) => (
          <div key={i} className={'breakdown-row ' + (r.won ? 'row-won' : 'row-lost')}>
            <span className="breakdown-icon">{r.skipped ? '⏭' : r.won ? '✓' : '✕'}</span>
            <span className="breakdown-title">{people[i]?.name ?? `Round ${i + 1}`}</span>
            <span className="breakdown-detail">{r.detail}</span>
            <span className="breakdown-time">{formatMs(r.ms)}</span>
          </div>
        ))}
      </div>
      <button className="btn-primary btn-huge" onClick={onLeaderboard}>
        Leaderboard →
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
export function LeaderboardScreen({ highlightPlayedAt, onDone }: {
  highlightPlayedAt?: string
  onDone: () => void
}) {
  const entries = sortEntries(loadLeaderboard())
  const top = entries.slice(0, 12)
  return (
    <div className="screen leaderboard">
      <h2 className="screen-title">🏆 Today's Leaderboard</h2>
      {top.length === 0 && <p className="screen-sub">No players yet — be the first!</p>}
      <div className="lb-table">
        {top.map((e, i) => (
          <div
            key={e.playedAt + e.name}
            className={
              'lb-row' +
              (e.playedAt === highlightPlayedAt ? ' lb-row-you' : '') +
              (i === 0 ? ' lb-row-first' : '')
            }
          >
            <span className="lb-rank">{i === 0 ? '👑' : i + 1}</span>
            <span className="lb-name">{e.name}</span>
            <span className="lb-score">{e.score}/5</span>
            <span className="lb-time">{formatMs(e.totalMs)}</span>
          </div>
        ))}
      </div>
      <div className="btn-row">
        <button className="btn-ghost" onClick={downloadCsv}>⬇ Download CSV</button>
        <button className="btn-primary btn-huge" onClick={onDone}>▶ New Player</button>
      </div>
    </div>
  )
}
