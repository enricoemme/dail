// DAIL screens — ocean & coral theme, centered layouts, one clip per
// screen. The Stage component handles the animated transitions between them.

import { useEffect, useRef, useState } from 'react'
import type { ClipPlayer } from '../lib/audio/clipPlayer'
import type { GridClip } from '../types'
import { RIDDLE, ESCAPE } from '../game/content'
import { sfx } from '../lib/audio/sfx'
import { ClipCard } from './ClipCard'
import { AudioWaveform } from './AudioWaveform'
import { Confetti } from './Confetti'

// ---------------------------------------------------------------------------
export function IntroScreen({ onNext }: { onNext: () => void }) {
  const steps = [
    { n: 1, t: 'Listen', d: 'Play each of the 10 short voice clips.' },
    { n: 2, t: 'Judge', d: 'Decide if each one is really Dale — or an AI clone.' },
    { n: 3, t: 'Crack it', d: "The real clips hide a message. Find it to solve the case." },
  ]
  return (
    <div className="v-screen intro-screen">
      <div className="intro-kicker">The Islington AI Challenge</div>
      <h1 className="v-title">D<span className="name-ai">AI</span>L</h1>
      <p className="v-lead">
        Our Chief Exec, <strong>Dale</strong>, has been hacked. Ten voice
        messages have surfaced — five are genuinely Dale's, five are AI
        voice-clones built to deceive. Can your team tell real from fake?
      </p>
      <div className="howto">
        {steps.map((s) => (
          <div className="howto-card" key={s.n}>
            <div className="howto-num">{s.n}</div>
            <div className="howto-title">{s.t}</div>
            <div className="howto-desc">{s.d}</div>
          </div>
        ))}
      </div>
      <button className="btn-primary btn-lg" onClick={onNext}>Continue</button>
    </div>
  )
}

// ---------------------------------------------------------------------------
export function TeamNameScreen({ onStart, onBack }: {
  onStart: (name: string) => void
  onBack: () => void
}) {
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => inputRef.current?.focus(), [])
  const submit = () => { const t = name.trim(); if (t) onStart(t) }
  return (
    <div className="v-screen team-screen">
      <h2 className="v-h1">Name your team</h2>
      <p className="v-lead">It goes on the case file. Make it a good one.</p>
      <input
        ref={inputRef}
        className="team-input"
        value={name}
        maxLength={22}
        placeholder="e.g. The Codebreakers"
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      <div className="btn-row">
        <button className="btn-ghost" onClick={onBack}>Back</button>
        <button className="btn-primary btn-lg" onClick={submit} disabled={!name.trim()}>
          Start the investigation
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
export function ClipScreen({ player, clip, index, total, marks, onMark, onNext }: {
  player: ClipPlayer
  clip: GridClip
  index: number
  total: number
  /** All clips' marks, for the pearl progress strand. */
  marks: (boolean | null)[]
  onMark: (mark: boolean) => void
  onNext: () => void
}) {
  const [playing, setPlaying] = useState(player.currentId === clip.id)
  useEffect(() => player.onChange(() => setPlaying(player.currentId === clip.id)), [player, clip.id])

  // Live level → CSS var, so the play button glows & swells with the voice.
  const panelRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    let raf = 0
    let smoothed = 0
    const tick = () => {
      const el = panelRef.current
      if (el) {
        let level = 0
        if (player.currentId === clip.id) {
          const s = player.spectrum(12)
          level = s.reduce((a, b) => a + b, 0) / s.length
        }
        smoothed += (level - smoothed) * 0.3
        el.style.setProperty('--glow', smoothed.toFixed(3))
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [player, clip.id])

  const isLast = index === total - 1
  return (
    <div className="v-screen clip-screen">
      <div className="clip-step">
        Clip <span className="clip-step-n">{index + 1}</span> of {total}
      </div>

      <div className="pearl-row" aria-hidden="true">
        {marks.map((m, i) => (
          <span
            key={i}
            className={
              'pearl' +
              (m === true ? ' pearl-real' : m === false ? ' pearl-ai' : '') +
              (i === index ? ' pearl-current' : '')
            }
          />
        ))}
      </div>

      <button
        ref={panelRef}
        className={'clip-stage-panel' + (playing ? ' is-playing' : '')}
        onClick={() => player.toggle(clip.id, clip.file)}
        aria-label={playing ? 'Pause clip' : 'Play clip'}
      >
        <span className="big-play">{playing ? '❚❚' : '▶'}</span>
        <AudioWaveform player={player} clipId={clip.id} seed={clip.id + index} bins={72} height={150} />
      </button>
      <div className="clip-play-hint">{playing ? 'Playing…' : 'Tap to listen'}</div>

      <h2 className="clip-question">Real, or an AI clone?</h2>
      <div className="choice-row">
        <button
          className={'choice choice-real' + (clip.mark === true ? ' choice-on' : '')}
          onClick={() => { sfx.chooseReal(); onMark(true) }}
        >
          <span className="choice-key">Real</span>
          <span className="choice-sub">It's really Dale</span>
        </button>
        <button
          className={'choice choice-ai' + (clip.mark === false ? ' choice-on' : '')}
          onClick={() => { sfx.chooseAI(); onMark(false) }}
        >
          <span className="choice-key">AI clone</span>
          <span className="choice-sub">Generated fake</span>
        </button>
      </div>

      <button className="btn-primary btn-lg" onClick={onNext} disabled={clip.mark === null}>
        {isLast ? 'See the results' : 'Next clip'}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
export function ScoreScreen({ teamName, correct, total, onNext }: {
  teamName: string
  correct: number
  total: number
  onNext: () => void
}) {
  const [shown, setShown] = useState(0)
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (correct === total) sfx.win()
    else sfx.tap()
    const armT = window.setTimeout(() => setArmed(true), 120)
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1300)
      setShown(Math.round((1 - Math.pow(1 - p, 3)) * correct))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); window.clearTimeout(armT) }
  }, [correct, total])

  const R = 96
  const C = 2 * Math.PI * R
  const frac = total > 0 ? correct / total : 0

  return (
    <div className="v-screen score-screen">
      {correct === total && <Confetti />}
      <div className="intro-kicker">Case file · Team {teamName}</div>
      <h2 className="v-h1">
        You spotted <span className="score-hl">{correct}</span> of {total}
      </h2>
      <div className="score-ring">
        <svg className="score-svg" viewBox="0 0 220 220">
          <defs>
            <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffb98a" />
              <stop offset="0.5" stopColor="#ff7a6b" />
              <stop offset="1" stopColor="#ff5e8a" />
            </linearGradient>
          </defs>
          <circle cx="110" cy="110" r={R} className="score-track" />
          <circle
            cx="110" cy="110" r={R}
            className="score-arc"
            stroke="url(#scoreGrad)"
            strokeDasharray={C}
            strokeDashoffset={armed ? C * (1 - frac) : C}
          />
        </svg>
        <div className="score-ring-num">{shown}<span>/{total}</span></div>
      </div>
      <p className="v-lead">
        real clips from Dale. The genuine ones aren't random — listen again
        and they lead somewhere. The fakes were only ever trying to mislead you.
      </p>
      <button className="btn-primary btn-lg" onClick={onNext}>Investigate the real clips</button>
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
      <h2 className="v-h1">What is Dale telling you?</h2>
      <p className="v-lead">Replay Dale's five genuine clips and read the first letter of each, in order.</p>
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
          {wrong && <p className="riddle-wrong-note">Not quite — play the real clips again and listen to how each one begins.</p>}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
export function EscapeScreen({ onNext }: { onNext: () => void }) {
  useEffect(() => {
    sfx.sonar()
    const t = window.setTimeout(() => sfx.win(), 750)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <div className="v-screen escape-screen">
      <Confetti />
      <div className="intro-kicker">Case cracked</div>
      <p className="v-lead">Dale's hidden message was</p>
      <div className="codeword">
        {ESCAPE.codeword.split('').map((ch, i) => (
          <span key={i} className="codeword-ch" style={{ animationDelay: `${0.15 + i * 0.09}s` }}>
            {ch}
          </span>
        ))}
      </div>
      <p className="v-lead escape-letter-label">Your escape-room letter</p>
      <div className="letter-stage">
        <span className="sonar-ring" />
        <span className="sonar-ring" />
        <span className="sonar-ring" />
        <div className="escape-halo" />
        <div className="escape-letter">{ESCAPE.letter}</div>
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
