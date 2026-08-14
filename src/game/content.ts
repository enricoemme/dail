// ============================================================================
// DAIL — GAME CONTENT. This is the single file to edit when Dale's real
// script and recordings arrive.
//
// HOW TO SWAP IN THE REAL AUDIO LATER:
//   1. Drop the 5 genuine recordings into  public/clips/  as
//      real-1.wav … real-5.wav  (any web audio format; .wav/.mp3/.m4a fine —
//      just update the `file` field's extension to match).
//   2. Drop the 5 cloned red-herring recordings in as  fake-1.wav … fake-5.wav
//   3. Update the `transcript` text below to match what was actually said,
//      and adjust RIDDLE / ESCAPE so the puzzle still resolves.
// Nothing else in the app needs to change.
// ============================================================================

export interface ClipContent {
  /** Stable id; also the audio filename base. */
  id: string
  /** Public path to the audio file (served from public/clips). */
  file: string
  /** Whether this is a genuine recording of Dale (true) or an AI clone. */
  isReal: boolean
  /** What is said in the clip — shown as an optional caption / swap reference. */
  transcript: string
  /**
   * For REAL clips: the hidden-message fragment this clip contributes.
   * Here, the first letter of each spells the answer to the riddle.
   */
  clueFragment?: string
}

// --- The 5 GENUINE clips (Dale's real security advice) ------------------
// Placeholder acrostic: first letters spell TRUST.
export const REAL_CLIPS: ClipContent[] = [
  {
    id: 'real-1',
    file: '/clips/real-1.wav',
    isReal: true,
    transcript: 'Take a breath before you act on anything that feels urgent.',
    clueFragment: 'Take',
  },
  {
    id: 'real-2',
    file: '/clips/real-2.wav',
    isReal: true,
    transcript: 'Refuse to hand over passwords or codes, no matter who is asking.',
    clueFragment: 'Refuse',
  },
  {
    id: 'real-3',
    file: '/clips/real-3.wav',
    isReal: true,
    transcript: 'Use a number you already trust to call the person back.',
    clueFragment: 'Use',
  },
  {
    id: 'real-4',
    file: '/clips/real-4.wav',
    isReal: true,
    transcript: 'Stop and check with a colleague if something seems off.',
    clueFragment: 'Stop',
  },
  {
    id: 'real-5',
    file: '/clips/real-5.wav',
    isReal: true,
    transcript: 'Trust has to be verified — never simply assumed.',
    clueFragment: 'Trust',
  },
]

// --- The 5 AI-CLONED clips (red herrings + scam-voice examples) -------------
export const FAKE_CLIPS: ClipContent[] = [
  {
    id: 'fake-1',
    file: '/clips/fake-1.wav',
    isReal: false,
    transcript: 'I need you to transfer the funds to a new account right away.',
  },
  {
    id: 'fake-2',
    file: '/clips/fake-2.wav',
    isReal: false,
    transcript: 'Just read me the security code that was texted to you.',
  },
  {
    id: 'fake-3',
    file: '/clips/fake-3.wav',
    isReal: false,
    transcript: "Don't tell the team about this — keep it between us for now.",
  },
  {
    id: 'fake-4',
    file: '/clips/fake-4.wav',
    isReal: false,
    transcript: 'Buy five gift cards and send me the numbers this afternoon.',
  },
  {
    id: 'fake-5',
    file: '/clips/fake-5.wav',
    isReal: false,
    transcript: "Log in with my password — it's the usual one, hurry please.",
  },
]

export const ALL_CLIPS: ClipContent[] = [...REAL_CLIPS, ...FAKE_CLIPS]

// --- The riddle shown once the real clips are identified --------------------
export interface RiddleOption {
  id: string
  label: string
  correct: boolean
}

export const RIDDLE = {
  intro: 'The five genuine clips from Dale hide a message.',
  question: "Read the first letter of each real clue, in order. What's Dale telling you?",
  options: [
    { id: 'A', label: 'TRUST — always verify who you are really talking to.', correct: true },
    { id: 'B', label: 'Transfer the funds before the end of the day.', correct: false },
    { id: 'C', label: 'The mainframe has been compromised by the Automation Team.', correct: false },
    { id: 'D', label: 'Mika is a very good pupper.', correct: false },
  ] as RiddleOption[],
}

// --- The reward for solving the riddle --------------------------------------
export const ESCAPE = {
  /** The code word the real clips spell out. */
  codeword: 'TRUST',
  /** The single letter this puzzle contributes to the wider escape room. */
  letter: 'T',
  flavour: 'Add this letter to the ones from the other rooms to complete the escape phrase.',
}
