import type { RoundResult } from '../types'
import { TOTAL_ROUNDS } from '../game/rounds'

interface Props {
  currentRound: number // 0-based index of the round in progress
  results: RoundResult[]
}

export function ProgressDots({ currentRound, results }: Props) {
  return (
    <div className="progress-dots">
      {Array.from({ length: TOTAL_ROUNDS }, (_, i) => {
        const result = results[i]
        let cls = 'dot'
        if (result) cls += result.won ? ' dot-won' : ' dot-lost'
        else if (i === currentRound) cls += ' dot-current'
        return (
          <div key={i} className={cls}>
            {result ? (result.won ? '✓' : '✕') : i + 1}
          </div>
        )
      })}
    </div>
  )
}
