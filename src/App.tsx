import { useEffect, useMemo, useRef, useState } from 'react'
import { ClipPlayer } from './lib/audio/clipPlayer'
import { sfx } from './lib/audio/sfx'
import { ALL_CLIPS } from './game/content'
import { Backdrop } from './components/Backdrop'
import { Bubbles } from './components/Bubbles'
import { Stage } from './components/Stage'
import { TopBar } from './components/TopBar'
import { FacilitatorMenu } from './components/FacilitatorMenu'
import { LockScreen } from './components/LockScreen'
import {
  BriefScreen,
  DebriefScreen,
  FlagsScreen,
  OverrideScreen,
  RiddleScreen,
  riddleOrder,
  TestScreen,
} from './components/Screens'
import type { GridClip, Phase } from './types'

const PHASE_ORDER: Phase[] = ['brief', 'test', 'flags', 'riddle', 'override', 'debrief']

// Fixed display order (= content.ts order, already scrambled real/fake):
// facilitators get a stable answer key — the REAL clips are always
// numbers 1, 4, 5, 8 and 10 on the test screen.
function gridClips(): GridClip[] {
  return ALL_CLIPS.map((c) => ({
    id: c.id, file: c.file, isReal: c.isReal, subject: c.subject,
    transcript: c.transcript, redFlag: c.redFlag, mark: null as boolean | null,
  }))
}

export default function App() {
  const [unlocked, setUnlocked] = useState(() => {
    try { return sessionStorage.getItem('dail-unlocked') === '1' } catch { return false }
  })
  const [phase, setPhase] = useState<Phase>('brief')
  const [clips, setClips] = useState<GridClip[]>(() => gridClips())
  const [teamName, setTeamName] = useState('')

  const playerRef = useRef<ClipPlayer | null>(null)
  if (!playerRef.current) playerRef.current = new ClipPlayer()
  const player = playerRef.current

  useEffect(() => {
    ALL_CLIPS.forEach((c) => void player.preload(c.file).catch(() => {}))
    return () => player.destroy()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const realClips = useMemo(() => riddleOrder(clips), [clips])
  const fakeClips = useMemo(() => clips.filter((c) => !c.isReal), [clips])

  const mark = (id: string, m: boolean) =>
    setClips((prev) => prev.map((c) => (c.id === id ? { ...c, mark: m } : c)))

  const go = (p: Phase) => { player.stop(); sfx.whoosh(); setPhase(p) }

  const restart = () => {
    player.stop()
    setClips(gridClips())
    setTeamName('')
    setPhase('brief')
  }

  const skip = () => {
    const idx = PHASE_ORDER.indexOf(phase)
    go(PHASE_ORDER[Math.min(PHASE_ORDER.length - 1, idx + 1)])
  }

  const progress = PHASE_ORDER.indexOf(phase) / (PHASE_ORDER.length - 1)

  if (!unlocked) {
    return (
      <div className="v-app">
        <Backdrop depth={0} />
        <Bubbles />
        <LockScreen
          onUnlock={() => {
            try { sessionStorage.setItem('dail-unlocked', '1') } catch { /* private mode */ }
            setUnlocked(true)
          }}
        />
        <img className="islington-logo" src="/islington.png" alt="Islington Council" />
      </div>
    )
  }

  return (
    <div className="v-app">
      <Backdrop depth={progress} />
      <Bubbles />
      <TopBar progress={progress} teamName={teamName || undefined} />

      <Stage stepKey={phase}>
        {phase === 'brief' && (
          <BriefScreen onStart={(n) => { setTeamName(n); go('test') }} />
        )}
        {phase === 'test' && (
          <TestScreen player={player} clips={clips} onMark={mark} onPass={() => go('flags')} />
        )}
        {phase === 'flags' && (
          <FlagsScreen player={player} fakeClips={fakeClips} onNext={() => go('riddle')} />
        )}
        {phase === 'riddle' && (
          <RiddleScreen player={player} realClips={realClips} onSolved={() => go('override')} />
        )}
        {phase === 'override' && (
          <OverrideScreen teamName={teamName} onNext={() => go('debrief')} />
        )}
        {phase === 'debrief' && <DebriefScreen onRestart={restart} />}
      </Stage>

      <FacilitatorMenu onRestart={restart} onSkip={skip} />
      <img className="islington-logo" src="/islington.png" alt="Islington Council" />
    </div>
  )
}
