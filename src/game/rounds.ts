// Game configuration: every round is the same "Who Am I?" mystery-guest game,
// so this file holds the shared tool declarations, the round limits, and the
// per-game random draw of five people from the pool.

import { PEOPLE_POOL } from '../prompts'
import type { FunctionDeclaration } from '../lib/liveClient'
import type { GameSetup } from '../types'

export const TOTAL_ROUNDS = 5

/** Hard cap per round — after this the app ends the round as lost. */
export const ROUND_TIME_LIMIT_MS = 150_000 // 2:30

/** Wrong guesses allowed before the round ends as lost. */
export const MAX_WRONG_GUESSES = 3

// NOTE: no `additionalProperties` anywhere — Gemini rejects schemas with it.
export const MYSTERY_TOOLS: FunctionDeclaration[] = [
  {
    name: 'clue_given',
    description:
      'Report that you have just delivered a scripted clue to the player. Call exactly once per clue, in order, at the moment you deliver it.',
    parameters: {
      type: 'OBJECT',
      properties: {
        clue_number: { type: 'INTEGER', description: 'Which clue you delivered, 1 to 4.' },
      },
      required: ['clue_number'],
    },
  },
  {
    name: 'guess_result',
    description:
      "Report your judgement of the player's guess at who you are. Call exactly once per distinct guess, immediately after judging it.",
    parameters: {
      type: 'OBJECT',
      properties: {
        correct: { type: 'BOOLEAN', description: 'True if they named you (any accepted name).' },
        guess: { type: 'STRING', description: 'The name they guessed, as text.' },
      },
      required: ['correct', 'guess'],
    },
  },
]

/** The instruction card shown before every round. */
export const ROUND_INSTRUCTIONS = [
  'The voice is someone famous from Islington. Work out who!',
  'Chat to them — ask about their life, their work, their manor.',
  'Stuck? Say "give me a clue". Clues appear on screen too.',
  'Think you know? Just say the name out loud — e.g. "Are you …?"',
  `${MAX_WRONG_GUESSES} wrong guesses or 2½ minutes and the round is lost.`,
  'Totally stumped? Tap Pass — but it costs the full 2½ minutes on the clock.',
]

function randInt(maxExclusive: number): number {
  return Math.floor(Math.random() * maxExclusive)
}

/** Draw five mystery guests for a new game. */
export function createGameSetup(): GameSetup {
  const copy = [...PEOPLE_POOL]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randInt(i + 1)
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return { people: copy.slice(0, TOTAL_ROUNDS) }
}
