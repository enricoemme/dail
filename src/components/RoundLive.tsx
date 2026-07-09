// The live round screen: owns one fresh Live API connection, the mic stream,
// the playback queue, the stall watchdog, and the round timer. Unmounting
// tears everything down.

import { useCallback, useEffect, useRef, useState } from 'react'
import { LiveSession } from '../lib/liveClient'
import { startMicCapture, type MicCapture } from '../lib/audio/micCapture'
import { PcmPlayer } from '../lib/audio/pcmPlayer'
import { formatMs } from '../game/leaderboard'
import type { RoundDef } from '../game/rounds'
import type { AppConfig, GameSetup, LiveToolCall, RoundResult } from '../types'
import { VoiceOrb } from './VoiceOrb'
import { MicMeter } from './MicMeter'

const WATCHDOG_MS = 5000
const ROUND5_SECONDS = 60

interface Props {
  round: RoundDef
  setup: GameSetup
  config: AppConfig
  /** Sum of previous rounds' times — the always-visible total keeps ticking. */
  baseMs: number
  onFinish: (result: RoundResult) => void
}

interface QuizMark {
  n: number
  correct: boolean
}

export function RoundLive({ round, setup, config, baseMs, onFinish }: Props) {
  const [status, setStatus] = useState<'connecting' | 'live' | 'error'>('connecting')
  const [elapsed, setElapsed] = useState(0)
  const [quizMarks, setQuizMarks] = useState<QuizMark[]>([])
  const [captions, setCaptions] = useState<string[]>([])
  const [showCaptions, setShowCaptions] = useState(false)

  const sessionRef = useRef<LiveSession | null>(null)
  const playerRef = useRef<PcmPlayer | null>(null)
  const micRef = useRef<MicCapture | null>(null)
  const micLevelRef = useRef(0)
  const startRef = useRef(performance.now())
  const finishedRef = useRef(false)
  const watchdogRef = useRef<number | null>(null)
  const nudgesRef = useRef(0)
  const quizMarksRef = useRef<QuizMark[]>([])
  const reconnectsRef = useRef(0)

  // ---- round timer -------------------------------------------------------
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!finishedRef.current && !clockStoppedRef.current) {
        setElapsed(performance.now() - startRef.current)
      }
    }, 100)
    return () => window.clearInterval(id)
  }, [])

  const lockIn = useCallback(
    (result: Omit<RoundResult, 'ms'>, msOverride?: number) => {
      if (finishedRef.current) return
      finishedRef.current = true
      const ms = msOverride ?? performance.now() - startRef.current
      onFinish({ ...result, ms })
    },
    [onFinish],
  )

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

  // ---- tool calls (rounds 3 & 4 report results this way) ------------------
  const handleToolCalls = (calls: LiveToolCall[]) => {
    for (const call of calls) {
      if (call.name === 'mark_quiz_answer') {
        const n = Number(call.args.question_number)
        const correct = Boolean(call.args.correct)
        if (n >= 1 && n <= 5 && !quizMarksRef.current.some((m) => m.n === n)) {
          quizMarksRef.current = [...quizMarksRef.current, { n, correct }]
          setQuizMarks(quizMarksRef.current)
          // Belt and braces: end the round on the 5th mark even if the model
          // forgets to call round_finished.
          if (quizMarksRef.current.length === 5) finishQuiz()
        }
      } else if (call.name === 'round_finished') {
        finishQuiz()
      } else if (call.name === 'slip_result') {
        const caught = Boolean(call.args.caught)
        // The timer stops NOW (the answer is in), but we let the model's
        // one-line reveal play out before cutting the audio.
        const ms = performance.now() - startRef.current
        stopClock()
        window.setTimeout(() => {
          lockIn({ won: caught, detail: caught ? 'Caught the slip' : 'Missed the slip' }, ms)
        }, 5000)
      }
    }
  }

  const finishQuiz = () => {
    const marks = quizMarksRef.current
    if (marks.length === 0) return
    const correct = marks.filter((m) => m.correct).length
    // Timer stops at the final judgement; the quizmaster gets a beat to
    // sign off before we cut the connection.
    const ms = performance.now() - startRef.current
    stopClock()
    window.setTimeout(() => {
      lockIn({ won: correct >= 3, detail: `${correct}/5 questions right` }, ms)
    }, 4000)
  }

  const clockStoppedRef = useRef(false)
  const stopClock = () => {
    clockStoppedRef.current = true
  }

  // ---- connection lifecycle ----------------------------------------------
  const openSession = useCallback(() => {
    setStatus('connecting')
    const session = new LiveSession(
      {
        model: config.model,
        voice: config.voice,
        systemInstruction: round.buildPrompt(setup),
        tools: round.tools,
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
        onOutputTranscript: (text) => appendCaption('AI', text),
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
  }, [round, setup, config]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // ---- per-round auxiliary UI ---------------------------------------------
  const isQuiz = round.number === 3
  const isSlip = round.number === 4
  const isVerdict = round.number === 5
  const verdictSecondsLeft = Math.max(0, ROUND5_SECONDS - Math.floor(elapsed / 1000))

  return (
    <div className="screen round-live">
      <header className="live-header">
        <div className="live-round-label">
          Round {round.number} · {round.title}
        </div>
        <div className="live-timers">
          <div className="timer timer-round">{formatMs(elapsed)}</div>
          <div className="timer timer-total">Total {formatMs(baseMs + elapsed)}</div>
        </div>
      </header>

      <VoiceOrb getLevel={getOrbLevel} state={status} />

      {round.liveHint && (
        <div className="live-hint">
          {round.liveHint.map((line) => (
            <div key={line} className="live-hint-line">{line}</div>
          ))}
        </div>
      )}

      {isQuiz && (
        <div className="quiz-marks">
          {Array.from({ length: 5 }, (_, i) => {
            const mark = quizMarks.find((m) => m.n === i + 1)
            return (
              <div
                key={i}
                className={
                  'quiz-mark' +
                  (mark ? (mark.correct ? ' quiz-mark-right' : ' quiz-mark-wrong') : '')
                }
              >
                {mark ? (mark.correct ? '✓' : '✕') : i + 1}
              </div>
            )
          })}
        </div>
      )}

      {isSlip && (
        <div className="slip-prompt">
          Listen for the slip… then <strong>say it out loud</strong>.
        </div>
      )}

      {isVerdict && (
        <div className={'verdict-countdown' + (verdictSecondsLeft === 0 ? ' verdict-zero' : '')}>
          {verdictSecondsLeft > 0
            ? `${verdictSecondsLeft}s of questioning left`
            : 'Time! Lock in your verdict ↓'}
        </div>
      )}

      {round.answers && (
        <div className={`answers answers-${round.answers.length}`}>
          {round.answers.map((a) => (
            <button
              key={a.id}
              className="btn-answer"
              onClick={() =>
                lockIn({
                  won: round.judge!(setup, a.id),
                  detail: `Picked: ${a.label}`,
                })
              }
            >
              <span className="btn-answer-label">{a.label}</span>
              {a.sublabel && <span className="btn-answer-sub">{a.sublabel}</span>}
            </button>
          ))}
        </div>
      )}

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
