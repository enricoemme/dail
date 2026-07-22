import { useEffect, useMemo, useRef, useState } from 'react'
import { ClipPlayer } from './lib/audio/clipPlayer'
import { ALL_CLIPS } from './game/content'
import { Bubbles } from './components/Bubbles'
import { Stage } from './components/Stage'
import { TopBar } from './components/TopBar'
import { FacilitatorMenu } from './components/FacilitatorMenu'
import {
  ClipScreen,
  DebriefScreen,
  EscapeScreen,
  IntroScreen,
  RiddleScreen,
  ScoreScreen,
  TeamNameScreen,
} from './components/Screens'
import type { GridClip, Phase } from './types'

const REAL_TOTAL = ALL_CLIPS.filter((c) => c.isReal).length
const TOTAL_CLIPS = ALL_CLIPS.length

function shuffledGrid(): GridClip[] {
  const clips = ALL_CLIPS.map((c) => ({
    id: c.id, file: c.file, isReal: c.isReal, transcript: c.transcript, mark: null as boolean | null,
  }))
  for (let i = clips.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[clips[i], clips[j]] = [clips[j], clips[i]]
  }
  return clips
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('intro')
  const [clipIndex, setClipIndex] = useState(0)
  const [clips, setClips] = useState<GridClip[]>(() => shuffledGrid())
  const [teamName, setTeamName] = useState('')

  const playerRef = useRef<ClipPlayer | null>(null)
  if (!playerRef.current) playerRef.current = new ClipPlayer()
  const player = playerRef.current

  useEffect(() => {
    ALL_CLIPS.forEach((c) => void player.preload(c.file).catch(() => {}))
    return () => player.destroy()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const correct = useMemo(() => clips.filter((c) => c.isReal && c.mark === true).length, [clips])
  const realClips = useMemo(() => clips.filter((c) => c.isReal), [clips])

  const mark = (id: string, m: boolean) =>
    setClips((prev) => prev.map((c) => (c.id === id ? { ...c, mark: m } : c)))

  const go = (p: Phase) => { player.stop(); setPhase(p) }

  const restart = () => {
    player.stop()
    setClips(shuffledGrid())
    setClipIndex(0)
    setTeamName('')
    setPhase('intro')
  }

  const nextClip = () => {
    player.stop()
    if (clipIndex + 1 < TOTAL_CLIPS) setClipIndex((i) => i + 1)
    else setPhase('score')
  }

  // Overall progress (0..1) across the whole journey, for the top bar.
  const stepKey =
    phase === 'clip' ? `clip-${clipIndex}` : phase
  const progress = useMemo(() => {
    const order = ['intro', 'name']
    let done: number
    if (phase === 'intro') done = 0
    else if (phase === 'name') done = 1
    else if (phase === 'clip') done = 2 + clipIndex
    else {
      const after: Record<string, number> = {
        score: 2 + TOTAL_CLIPS,
        riddle: 3 + TOTAL_CLIPS,
        escape: 4 + TOTAL_CLIPS,
        debrief: 5 + TOTAL_CLIPS,
      }
      done = after[phase] ?? 0
    }
    const totalSteps = order.length + TOTAL_CLIPS + 4 // score,riddle,escape,debrief
    return Math.min(1, done / totalSteps)
  }, [phase, clipIndex])

  const skip = () => {
    if (phase === 'clip' && clipIndex + 1 < TOTAL_CLIPS) { setClipIndex((i) => i + 1); player.stop(); return }
    const order: Phase[] = ['intro', 'name', 'clip', 'score', 'riddle', 'escape', 'debrief']
    go(order[Math.min(order.length - 1, order.indexOf(phase) + 1)])
  }

  return (
    <div className="v-app">
      <Bubbles />
      <TopBar progress={progress} teamName={teamName || undefined} />

      <Stage stepKey={stepKey}>
        {phase === 'intro' && <IntroScreen onNext={() => setPhase('name')} />}
        {phase === 'name' && (
          <TeamNameScreen
            onStart={(n) => { setTeamName(n); setPhase('clip') }}
            onBack={() => setPhase('intro')}
          />
        )}
        {phase === 'clip' && (
          <ClipScreen
            player={player}
            clip={clips[clipIndex]}
            index={clipIndex}
            total={TOTAL_CLIPS}
            onMark={(m) => mark(clips[clipIndex].id, m)}
            onNext={nextClip}
          />
        )}
        {phase === 'score' && (
          <ScoreScreen teamName={teamName} correct={correct} total={REAL_TOTAL} onNext={() => go('riddle')} />
        )}
        {phase === 'riddle' && (
          <RiddleScreen player={player} realClips={realClips} onSolved={() => go('escape')} />
        )}
        {phase === 'escape' && <EscapeScreen onNext={() => go('debrief')} />}
        {phase === 'debrief' && <DebriefScreen onRestart={restart} />}
      </Stage>

      <FacilitatorMenu onRestart={restart} onSkip={skip} />
    </div>
  )
}
