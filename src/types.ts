// Shared types for the game.

export type Phase =
  | 'welcome'
  | 'name'
  | 'micCheck'
  | 'roundIntro'
  | 'roundLive'
  | 'reveal'
  | 'results'
  | 'leaderboard'

export interface AppConfig {
  model: string
  voice: string
  hasKey: boolean
}

/** Everything randomised once per game, before round 1 starts. */
export interface GameSetup {
  /** Round 1: which statement (1-3) is the lie. */
  r1LieSlot: 1 | 2 | 3
  /** Round 2: which of the three fixed questions (1-3) gets the lying answer. */
  r2LieSlot: 1 | 2 | 3
  /** Round 3: the five quiz questions chosen from the pool. */
  r3Questions: QuizQuestion[]
  /** Round 4: the inhuman slip injected into the story. */
  r4Slip: SlipCard
  /** Round 5: the coin flip. true = "Alex", committed human persona. */
  r5IsHuman: boolean
}

export interface QuizQuestion {
  question: string
  answer: string
}

export interface SlipCard {
  /** Instruction injected into the AI's story prompt. */
  instruction: string
  /** Short description shown to the player at reveal. */
  reveal: string
}

export interface RoundResult {
  won: boolean
  ms: number
  skipped?: boolean
  /** Human-readable detail for the results breakdown, e.g. "4/5 questions". */
  detail: string
}

export interface LeaderboardEntry {
  name: string
  score: number
  totalMs: number
  perRound: RoundResult[]
  playedAt: string // ISO timestamp
}

/** A function call reported by the model during a live round. */
export interface LiveToolCall {
  id: string
  name: string
  args: Record<string, unknown>
}
