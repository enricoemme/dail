import { useEffect, useMemo, useRef, useState } from 'react'
import { ClipPlayer } from './lib/audio/clipPlayer'
import { ALL_CLIPS } from './game/content'
import {
  DebriefScreen,
  EscapeScreen,
  GridScreen,
  RiddleScreen,
  ScoreScreen,
} from './components/Screens'
import { FacilitatorMenu } from './components/FacilitatorMenu'
import type { GridClip, Phase } from './types'

const REAL_TOTAL = ALL_CLIPS.filter((c) => c.isReal).length

function shuffledGrid(): GridClip[] {
  const clips = ALL_CLIPS.map((c) => ({
    id: c.id,
    file: c.file,
    isReal: c.isReal,
    transcript: c.transcript,
    mark: null as boolean | null,
  }))
  for (let i = clips.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[clips[i], clips[j]] = [clips[j], clips[i]]
  }
  return clips
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('grid')
  const [clips, setClips] = useState<GridClip[]>(() => shuffledGrid())
  const playerRef = useRef<ClipPlayer | null>(null)
  if (!playerRef.current) playerRef.current = new ClipPlayer()
  const player = playerRef.current

  // Warm the audio cache in the background so first play is instant.
  useEffect(() => {
    ALL_CLIPS.forEach((c) => void player.preload(c.file).catch(() => {}))
    return () => player.destroy()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const correct = useMemo(
    () => clips.filter((c) => c.isReal && c.mark === true).length,
    [clips],
  )
  const realClips = useMemo(() => clips.filter((c) => c.isReal), [clips])

  const mark = (id: string, m: boolean) =>
    setClips((prev) => prev.map((c) => (c.id === id ? { ...c, mark: m } : c)))

  const restart = () => {
    player.stop()
    setClips(shuffledGrid())
    setPhase('grid')
  }

  const go = (p: Phase) => {
    player.stop()
    setPhase(p)
  }

  return (
    <div className="v-app">
      {phase === 'grid' && (
        <GridScreen player={player} clips={clips} onMark={mark} onNext={() => go('score')} />
      )}
      {phase === 'score' && (
        <ScoreScreen correct={correct} total={REAL_TOTAL} onNext={() => go('riddle')} />
      )}
      {phase === 'riddle' && (
        <RiddleScreen player={player} realClips={realClips} onSolved={() => go('escape')} />
      )}
      {phase === 'escape' && <EscapeScreen onNext={() => go('debrief')} />}
      {phase === 'debrief' && <DebriefScreen onRestart={restart} />}

      <FacilitatorMenu onRestart={restart} onSkip={() => go(nextPhase(phase))} />
    </div>
  )
}

function nextPhase(p: Phase): Phase {
  const order: Phase[] = ['grid', 'score', 'riddle', 'escape', 'debrief']
  const i = order.indexOf(p)
  return order[Math.min(order.length - 1, i + 1)]
}
