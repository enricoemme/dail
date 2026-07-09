// The live round screen: owns one fresh Live API connection, the mic stream,
// the playback queue, the stall watchdog, and the round timer. Unmounting
// tears everything down.
//
// Every round is a "Who Am I?" mystery guest. The model reports game state
// via function calls: clue_given(n) puts the scripted clue on screen;
// guess_result(correct, guess) scores the round. The app enforces the wrong-
// guess limit and the time cap, telling the model via stage directions
// ("[OUT OF GUESSES]" / "[TIME'S UP]") so it can reveal itself out loud.

import { useCallback, useEffect, useRef, useState } from 'react'
import { LiveSession } from '../lib/liveClient'
import { startMicCapture, type MicCapture } from '../lib/audio/micCapture'
import { PcmPlayer } from '../lib/audio/pcmPlayer'
import { formatMs } from '../game/leaderboard'
import { buildMysteryPrompt } from '../prompts'
import { MAX_WRONG_GUESSES, MYSTERY_TOOLS, ROUND_TIME_LIMIT_MS } from '../game/rounds'
import type { AppConfig, LiveToolCall, PersonCard, RoundResult } from '../types'
import { VoiceOrb } from './VoiceOrb'
import { MicMeter } from './MicMeter'

const WATCHDOG_MS = 5000
/** Grace so the model's spoken celebration/reveal isn't cut mid-word. */
const OUTRO_GRACE_MS = 6000

interface Props {
  person: PersonCard
  roundNumber: number
  config: AppConfig
  /** Sum of previous rounds' times — the always-visible total keeps ticking. */
  baseMs: number
  onFinish: (result: RoundResult) => void
}

export function RoundLive({ person, roundNumber, config, baseMs, onFinish }: Props) {
  const [status, setStatus] = useState<'connecting' | 'live' | 'error'>('connecting')
  const [elapsed, setElapsed] = useState(0)
  const [cluesRevealed, setCluesRevealed] = useState<number[]>([])
  const [strikes, setStrikes] = useState(0)
  const [captions, setCaptions] = useState<string[]>([])
  const [showCaptions, setShowCaptions] = useState(false)

  const sessionRef = useRef<LiveSession | null>(null)
  const playerRef = useRef<PcmPlayer | null>(null)
  const micRef = useRef<MicCapture | null>(null)
  const micLevelRef = useRef(0)
  const startRef = useRef(performance.now())
  const finishedRef = useRef(false)
  const endingRef = useRef(false) // outro grace period in progress
  const clockStoppedRef = useRef(false)
  const watchdogRef = useRef<number | null>(null)
  const nudgesRef = useRef(0)
  const strikesRef = useRef(0)
  const cluesRef = useRef<number[]>([])
  const reconnectsRef = useRef(0)

  const lockIn = useCallback(
    (result: Omit<RoundResult, 'ms'>, msOverride?: number) => {
      if (finishedRef.current) return
      finishedRef.current = true
      const ms = msOverride ?? performance.now() - startRef.current
      onFinish({ ...result, ms })
    },
    [onFinish],
  )

  /** Freeze the score clock now; end the round after the model's outro. */
  const endRound = (result: Omit<RoundResult, 'ms'>, stageDirection?: string) => {
    if (endingRef.current || finishedRef.current) return
    endingRef.current = true
    clockStoppedRef.current = true
    const ms = performance.now() - startRef.current
    if (stageDirection) sessionRef.current?.sendText(stageDirection)
    window.setTimeout(() => lockIn(result, ms), OUTRO_GRACE_MS)
  }

  // ---- round timer + time cap ---------------------------------------------
  useEffect(() => {
    const id = window.setInterval(() => {
      if (finishedRef.current || clockStoppedRef.current) return
      const now = performance.now() - startRef.current
      setElapsed(now)
      if (now >= ROUND_TIME_LIMIT_MS) {
        endRound(
          { won: false, detail: `Time's up — it was ${person.name}` },
          "[TIME'S UP]",
        )
      }
    }, 100)
    return () => window.clearInterval(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- stall watchdog ----------------------------------------------------
  const clearWatchdog = () => {
    if (watchdogRef.current !== null) {
      window.clearTimeout(watchdogRef.current)
      watchdogRef.current = null
    }
  }
  const armWatchdog = () => {
    clearWatchdog()
    watchdogRef.current = window.setTimeout(() => {
      const session = sessionRef.current
      if (!session || finishedRef.current) return
      if (nudgesRef.current < 1) {
        // Live-preview models occasionally stall — a text nudge wakes them.
        nudgesRef.current += 1
        session.sendText('continue')
        armWatchdog()
      } else {
        nudgesRef.current = 0
        reconnect()
      }
    }, WATCHDOG_MS)
  }

  // ---- tool calls ----------------------------------------------------------
  const handleToolCalls = (calls: LiveToolCall[]) => {
    for (const call of calls) {
      if (call.name === 'clue_given') {
        const n = Number(call.args.clue_number)
        if (n >= 1 && n <= person.clues.length && !cluesRef.current.includes(n)) {
          cluesRef.current = [...cluesRef.current, n].sort((a, b) => a - b)
          setCluesRevealed(cluesRef.current)
        }
      } else if (call.name === 'guess_result') {
        if (endingRef.current) continue
        const correct = Boolean(call.args.correct)
        if (correct) {
          const clueCount = Math.max(1, cluesRef.current.length)
          endRound({
            won: true,
            detail: `Got it — ${clueCount} clue${clueCount === 1 ? '' : 's'} in`,
          })
        } else {
          strikesRef.current += 1
          setStrikes(strikesRef.current)
          if (strikesRef.current >= MAX_WRONG_GUESSES) {
            endRound(
              { won: false, detail: `Out of guesses — it was ${person.name}` },
              '[OUT OF GUESSES]',
            )
          }
        }
      }
    }
  }

  // ---- connection lifecycle ----------------------------------------------
  const openSession = useCallback(() => {
    setStatus('connecting')
    const session = new LiveSession(
      {
        model: config.model,
        voice: config.voice,
        systemInstruction: buildMysteryPrompt(person),
        tools: MYSTERY_TOOLS,
      },
      {
        onReady: () => setStatus('live'),
        onAudio: (pcm) => {
          clearWatchdog()
          nudgesRef.current = 0
          playerRef.current?.enqueue(pcm)
        },
        onInterrupted: () => playerRef.current?.flush(),
        onInputTranscript: (text) => {
          armWatchdog() // player spoke — expect a response within 5s
          appendCaption('You', text)
        },
        onOutputTranscript: (text) => appendCaption('Guest', text),
        onToolCall: handleToolCalls,
        onTurnComplete: () => clearWatchdog(),
        onClose: () => {
          if (!finishedRef.current) reconnect()
        },
        onError: () => setStatus('error'),
      },
    )
    sessionRef.current = session
    session.connect()
  }, [person, config]) // eslint-disable-line react-hooks/exhaustive-deps

  const reconnect = () => {
    if (finishedRef.current || reconnectsRef.current >= 3) {
      setStatus('error')
      return
    }
    reconnectsRef.current += 1
    setStatus('error')
    sessionRef.current?.close()
    window.setTimeout(() => {
      if (!finishedRef.current) openSession()
    }, 600)
  }

  const captionBuffer = useRef<{ who: string; text: string }[]>([])
  const appendCaption = (who: string, text: string) => {
    const buf = captionBuffer.current
    const last = buf[buf.length - 1]
    if (last && last.who === who) last.text += text
    else buf.push({ who, text })
    captionBuffer.current = buf.slice(-6)
    setCaptions(captionBuffer.current.map((c) => `${c.who}: ${c.text}`))
  }

  useEffect(() => {
    let cancelled = false

    const player = new PcmPlayer()
    playerRef.current = player
    void player.resume() // we arrived here via a button tap, so this succeeds

    openSession()

    startMicCapture({
      onChunk: (b64) => sessionRef.current?.sendAudio(b64),
      onLevel: (rms) => {
        micLevelRef.current = rms
      },
    })
      .then((mic) => {
        if (cancelled) mic.stop()
        else micRef.current = mic
      })
      .catch((err) => {
        console.error('Mic failed:', err)
        setStatus('error')
      })

    return () => {
      cancelled = true
      clearWatchdog()
      micRef.current?.stop()
      sessionRef.current?.close()
      player.destroy()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const getOrbLevel = useCallback(() => playerRef.current?.getLevel() ?? 0, [])
  const getMicLevel = useCallback(() => micLevelRef.current, [])

  const remainingMs = Math.max(0, ROUND_TIME_LIMIT_MS - elapsed)
  const lowTime = remainingMs <= 30_000 && !endingRef.current

  return (
    <div className="screen round-live">
      <header className="live-header">
        <div className="live-round-label">
          Round {roundNumber} · Mystery Guest
        </div>
        <div className="live-timers">
          <div className={'timer timer-round' + (lowTime ? ' timer-low' : '')}>
            {formatMs(remainingMs)}
          </div>
          <div className="timer timer-total">Total {formatMs(baseMs + elapsed)}</div>
        </div>
      </header>

      <VoiceOrb getLevel={getOrbLevel} state={status} />

      <div className="clue-board">
        {person.clues.map((clue, i) =>
          cluesRevealed.includes(i + 1) ? (
            <div key={i} className="clue-card clue-card-revealed">
              <span className="clue-num">Clue {i + 1}</span>
              <span className="clue-text">{clue}</span>
            </div>
          ) : (
            <div key={i} className="clue-card">
              <span className="clue-num">Clue {i + 1}</span>
              <span className="clue-text clue-locked">Say “give me a clue”</span>
            </div>
          ),
        )}
      </div>

      <div className="guess-status">
        <span className="guess-hint">
          Know it? Just say the name — <em>“Are you…?”</em>
        </span>
        <span className="strikes">
          {Array.from({ length: MAX_WRONG_GUESSES }, (_, i) => (
            <span key={i} className={'strike' + (i < strikes ? ' strike-used' : '')}>
              {i < strikes ? '✕' : '●'}
            </span>
          ))}
          <span className="strikes-label">guesses</span>
        </span>
      </div>

      <footer className="live-footer">
        <MicMeter getLevel={getMicLevel} />
        <button className="btn-ghost" onClick={() => setShowCaptions((v) => !v)}>
          {showCaptions ? 'Hide captions' : 'Captions'}
        </button>
      </footer>

      {showCaptions && (
        <div className="captions">
          {captions.map((line, i) => (
            <div key={i} className="caption-line">{line}</div>
          ))}
        </div>
      )}
    </div>
  )
}
