// Round definitions: titles, instruction cards, answer buttons, tool
// declarations, and how each round's system prompt is built from the
// per-game random setup.

import {
  buildRound1Prompt,
  buildRound2Prompt,
  buildRound3Prompt,
  buildRound4Prompt,
  buildRound5Prompt,
  QUIZ_POOL,
  ROUND2_QUESTIONS,
  SLIP_POOL,
} from '../prompts'
import type { FunctionDeclaration } from '../lib/liveClient'
import type { GameSetup } from '../types'

export const TOTAL_ROUNDS = 5

// NOTE: no `additionalProperties` anywhere — Gemini rejects schemas with it.
const QUIZ_TOOLS: FunctionDeclaration[] = [
  {
    name: 'mark_quiz_answer',
    description:
      "Report whether the player's spoken answer to a quiz question was correct. Call exactly once per question, immediately after judging.",
    parameters: {
      type: 'OBJECT',
      properties: {
        question_number: { type: 'INTEGER', description: 'The question number, 1 to 5.' },
        correct: { type: 'BOOLEAN', description: 'True if the answer was correct.' },
      },
      required: ['question_number', 'correct'],
    },
  },
  {
    name: 'round_finished',
    description: 'Call once after judging question 5 to end the round.',
    parameters: { type: 'OBJECT', properties: {} },
  },
]

const SLIP_TOOLS: FunctionDeclaration[] = [
  {
    name: 'slip_result',
    description:
      'Report whether the player correctly identified the inhuman slip in the story. Call exactly once, when their answer is final.',
    parameters: {
      type: 'OBJECT',
      properties: {
        caught: { type: 'BOOLEAN', description: 'True if the player caught the slip.' },
      },
      required: ['caught'],
    },
  },
]

export interface AnswerButton {
  /** Stable id recorded as the player's pick. */
  id: string
  label: string
  sublabel?: string
}

export interface RoundDef {
  number: number
  title: string
  tagline: string
  /** Bullet-point instructions shown on the intro card. */
  instructions: string[]
  /** Extra card shown during the live round (e.g. Round 2's questions). */
  liveHint?: string[]
  /**
   * Buttons the player uses to lock in (rounds 1, 2, 5).
   * Rounds 3 and 4 have none — the AI reports the result via function call.
   */
  answers?: AnswerButton[]
  tools?: FunctionDeclaration[]
  buildPrompt: (setup: GameSetup) => string
  /** Given the setup and the player's pick, was it correct? (button rounds) */
  judge?: (setup: GameSetup, pickedId: string) => boolean
  /** Reveal text explaining the right answer. */
  revealText: (setup: GameSetup) => string
}

export const ROUNDS: RoundDef[] = [
  {
    number: 1,
    title: 'Two Truths and a Lie',
    tagline: 'It will tell you three things about its life in Islington. One is a lie.',
    instructions: [
      'The voice tells you THREE statements about itself.',
      'Exactly one of them is a lie.',
      'Grill it! Ask follow-up questions about any statement.',
      'When you are sure, tap the number of the LIE.',
    ],
    answers: [
      { id: '1', label: '1', sublabel: 'First statement' },
      { id: '2', label: '2', sublabel: 'Second statement' },
      { id: '3', label: '3', sublabel: 'Third statement' },
    ],
    buildPrompt: (s) => buildRound1Prompt(s.r1LieSlot),
    judge: (s, picked) => picked === String(s.r1LieSlot),
    revealText: (s) => `The lie was statement ${s.r1LieSlot}.`,
  },
  {
    number: 2,
    title: 'Spot the Lie — The Interview',
    tagline: 'You ask the questions. One answer will be a lie.',
    instructions: [
      'Ask the voice the three questions on screen, in order.',
      'Exactly one of its answers is a lie.',
      'Follow up if something smells off.',
      'Then tap the question that got the lying answer.',
    ],
    liveHint: ROUND2_QUESTIONS.map((q, i) => `${i + 1}. ${q}`),
    answers: ROUND2_QUESTIONS.map((q, i) => ({
      id: String(i + 1),
      label: `Q${i + 1}`,
      sublabel: q,
    })),
    buildPrompt: (s) => buildRound2Prompt(s.r2LieSlot),
    judge: (s, picked) => picked === String(s.r2LieSlot),
    revealText: (s) =>
      `The lie was the answer to question ${s.r2LieSlot}: “${ROUND2_QUESTIONS[s.r2LieSlot - 1]}”`,
  },
  {
    number: 3,
    title: 'Quick-Fire Quiz',
    tagline: 'Tables turned — the AI is the quizmaster. Answer out loud!',
    instructions: [
      'The voice asks YOU five quick questions.',
      'London trivia and a bit about AI. Answer out loud.',
      'It judges your answers as you go.',
      'Get 3 or more right to win the round.',
    ],
    tools: QUIZ_TOOLS,
    buildPrompt: (s) => buildRound3Prompt(s.r3Questions),
    revealText: () => 'You needed 3 of 5 correct answers.',
  },
  {
    number: 4,
    title: 'Catch the Slip',
    tagline: 'A warm human story — with one thing no human could do. Hear it?',
    instructions: [
      'The voice tells a 45-second story from its life.',
      'Hidden inside is ONE thing no real human could do.',
      'When the story ends, SAY the slip out loud.',
      'The game master confirms if you caught it.',
    ],
    tools: SLIP_TOOLS,
    buildPrompt: (s) => buildRound4Prompt(s.r4Slip),
    revealText: (s) => `The slip: ${s.r4Slip.reveal}`,
  },
  {
    number: 5,
    title: 'The Final Verdict — Human or Not?',
    tagline: 'Is this voice claiming to be human, or not? Get it to reveal itself.',
    instructions: [
      'You have 60 seconds of free conversation. Ask anything.',
      'A hidden coin flip decided what this voice is playing.',
      'Push it: will it commit to being human, or come clean?',
      'Then lock in your verdict.',
    ],
    answers: [
      { id: 'human', label: 'Committed to being human', sublabel: 'It denies being an AI, no matter what' },
      { id: 'ai', label: 'It came clean', sublabel: 'It admits to being an AI when pressed' },
    ],
    buildPrompt: (s) => buildRound5Prompt(s.r5IsHuman),
    judge: (s, picked) => (s.r5IsHuman ? picked === 'human' : picked === 'ai'),
    revealText: (s) =>
      s.r5IsHuman
        ? 'The coin said HEADS — the voice was playing “Alex”, committed to being human.'
        : 'The coin said TAILS — the voice was an honest AI, ready to admit it if pressed.',
  },
]

function randInt(maxExclusive: number): number {
  return Math.floor(Math.random() * maxExclusive)
}

function pickN<T>(pool: readonly T[], n: number): T[] {
  const copy = [...pool]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randInt(i + 1)
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, n)
}

/** Roll all of a game's secrets up front. */
export function createGameSetup(): GameSetup {
  return {
    r1LieSlot: (randInt(3) + 1) as 1 | 2 | 3,
    r2LieSlot: (randInt(3) + 1) as 1 | 2 | 3,
    r3Questions: pickN(QUIZ_POOL, 5),
    r4Slip: SLIP_POOL[randInt(SLIP_POOL.length)],
    r5IsHuman: Math.random() < 0.5,
  }
}
