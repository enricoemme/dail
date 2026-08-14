// Shared types for DAIL.

export type Phase = 'brief' | 'test' | 'riddle' | 'override' | 'debrief'

export interface AppConfig {
  model: string
  voiceFemale: string
  voiceMale: string
  hasKey: boolean
}

/** A clip as shown in the grid: its content plus the player's yes/no mark. */
export interface GridClip {
  id: string
  file: string
  isReal: boolean
  transcript: string
  /** Player's mark: true = "yes, real", false = "no, AI", null = unanswered. */
  mark: boolean | null
}
