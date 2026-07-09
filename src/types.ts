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

/** A famous Islington figure the AI plays as the mystery guest. */
export interface PersonCard {
  id: string
  /** Canonical display name, shown at reveal. */
  name: string
  /** Other names/nicknames that count as a correct guess. */
  aka: string[]
  /** Short label shown at reveal, e.g. "Writer · 1903–1950". */
  era: string
  /** One-sentence reveal blurb tying them to Islington. */
  blurb: string
  /** Grounding facts the AI improvises around (never contradicted). */
  facts: string[]
  /** Exactly four scripted clues, cryptic → giveaway. Shown on screen as given. */
  clues: string[]
}

/** Everything randomised once per game: the five mystery guests, in order. */
export interface GameSetup {
  people: PersonCard[]
}

export interface RoundResult {
  won: boolean
  ms: number
  skipped?: boolean
  /** Human-readable detail for the results breakdown, e.g. "Got it, 2 clues in". */
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
