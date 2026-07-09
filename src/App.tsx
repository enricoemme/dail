import { useCallback, useEffect, useMemo, useState } from 'react'
import { FacilitatorMenu } from './components/FacilitatorMenu'
import { RoundLive } from './components/RoundLive'
import {
  LeaderboardScreen,
  MicCheckScreen,
  NameScreen,
  ResultsScreen,
  RevealScreen,
  RoundIntroScreen,
  WelcomeScreen,
} from './components/Screens'
import { saveEntry } from './game/leaderboard'
import { createGameSetup, TOTAL_ROUNDS } from './game/rounds'
import type { AppConfig, GameSetup, LeaderboardEntry, Phase, RoundResult, VoiceChoice } from './types'

export default function App() {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [configError, setConfigError] = useState(false)

  const [phase, setPhase] = useState<Phase>('welcome')
  const [playerName, setPlayerName] = useState('')
  const [voiceChoice, setVoiceChoice] = useState<VoiceChoice>('female')
  const [micDone, setMicDone] = useState(false)
  const [setup, setSetup] = useState<GameSetup | null>(null)
  const [roundIndex, setRoundIndex] = useState(0)
  const [results, setResults] = useState<RoundResult[]>([])
  const [savedEntry, setSavedEntry] = useState<LeaderboardEntry | null>(null)
  const [savedRank, setSavedRank] = useState(0)

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => setConfigError(true))
  }, [])

  const baseMs = useMemo(() => results.reduce((sum, r) => sum + r.ms, 0), [results])
  const person = setup?.people[roundIndex]

  const startGame = useCallback(() => {
    setSetup(createGameSetup())
    setResults([])
    setRoundIndex(0)
    setSavedEntry(null)
    setPhase('roundIntro')
  }, [])

  const confirmName = (name: string) => {
    setPlayerName(name)
    if (micDone) startGame()
    else setPhase('micCheck')
  }

  const finishRound = useCallback((result: RoundResult) => {
    setResults((prev) => [...prev, result])
    setPhase('reveal')
  }, [])

  const afterReveal = () => {
    if (roundIndex + 1 < TOTAL_ROUNDS) {
      setRoundIndex((i) => i + 1)
      setPhase('roundIntro')
    } else {
      finishGame()
    }
  }

  const finishGame = (finalResults: RoundResult[] = results) => {
    const entry: LeaderboardEntry = {
      name: playerName,
      score: finalResults.filter((r) => r.won).length,
      totalMs: finalResults.reduce((sum, r) => sum + r.ms, 0),
      perRound: finalResults,
      playedAt: new Date().toISOString(),
    }
    const rank = saveEntry(entry)
    setSavedEntry(entry)
    setSavedRank(rank)
    setPhase('results')
  }

  // -- facilitator escape hatches ------------------------------------------
  const skipRound = () => {
    const skipped: RoundResult = { won: false, ms: 0, skipped: true, detail: 'Skipped by staff' }
    const next = [...results, skipped]
    setResults(next)
    if (roundIndex + 1 < TOTAL_ROUNDS) {
      setRoundIndex((i) => i + 1)
      setPhase('roundIntro')
    } else {
      finishGame(next)
    }
  }

  const restartGame = () => {
    setPlayerName('')
    setSetup(null)
    setResults([])
    setRoundIndex(0)
    setSavedEntry(null)
    setPhase('welcome')
  }

  // -- render ----------------------------------------------------------------
  if (configError || (config && !config.hasKey)) {
    return (
      <div className="screen setup-error">
        <h2 className="screen-title">Setup needed</h2>
        <p className="screen-sub">
          {configError
            ? 'Cannot reach the local server. Run `npm run dev` and reload.'
            : 'The server has no GEMINI_API_KEY. Copy .env.example to .env, add your key, and restart.'}
        </p>
      </div>
    )
  }
  if (!config) {
    return <div className="screen"><p className="screen-sub">Loading…</p></div>
  }

  const inRound = phase === 'roundLive' || phase === 'roundIntro'

  return (
    <div className="app">
      {phase === 'welcome' && (
        <WelcomeScreen
          onNewPlayer={() => setPhase('name')}
          onLeaderboard={() => setPhase('leaderboard')}
        />
      )}
      {phase === 'name' && (
        <NameScreen
          voiceChoice={voiceChoice}
          onVoiceChoice={setVoiceChoice}
          onConfirm={confirmName}
          onBack={() => setPhase('welcome')}
        />
      )}
      {phase === 'micCheck' && (
        <MicCheckScreen onReady={() => { setMicDone(true); startGame() }} />
      )}
      {phase === 'roundIntro' && setup && (
        <RoundIntroScreen
          roundNumber={roundIndex + 1}
          playerName={playerName}
          results={results}
          baseMs={baseMs}
          onStart={() => setPhase('roundLive')}
        />
      )}
      {phase === 'roundLive' && person && (
        <RoundLive
          key={roundIndex} // fresh mount (and fresh connection) per round
          person={person}
          roundNumber={roundIndex + 1}
          model={config.model}
          voice={voiceChoice === 'female' ? config.voiceFemale : config.voiceMale}
          baseMs={baseMs}
          onFinish={finishRound}
        />
      )}
      {phase === 'reveal' && person && results.length > 0 && (
        <RevealScreen
          person={person}
          result={results[results.length - 1]}
          isLast={roundIndex + 1 >= TOTAL_ROUNDS}
          onNext={afterReveal}
        />
      )}
      {phase === 'results' && savedEntry && setup && (
        <ResultsScreen
          entry={savedEntry}
          people={setup.people}
          rank={savedRank}
          onLeaderboard={() => setPhase('leaderboard')}
        />
      )}
      {phase === 'leaderboard' && (
        <LeaderboardScreen
          highlightPlayedAt={savedEntry?.playedAt}
          onDone={restartGame}
        />
      )}

      <FacilitatorMenu
        canSkipRound={inRound}
        onSkipRound={skipRound}
        onRestartGame={restartGame}
      />
    </div>
  )
}
