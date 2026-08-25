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
  /** Whether this is a genuine recording of Victoria (true) or an AI clone. */
  isReal: boolean
  /** What is said in the clip — shown as an optional caption / swap reference. */
  transcript: string
  /**
   * For REAL clips: the hidden-message fragment this clip contributes.
   * Here, the first letter of each spells the answer to the riddle.
   */
  clueFragment?: string
}

// --- The 5 GENUINE clips (Dale's real recordings as Victoria) ----------------
// Common thread (the Stage-2 answer): she keeps asking people to CHECK things.
export const REAL_CLIPS: ClipContent[] = [
  {
    id: 'real-1',
    file: '/clips/real-1.wav',
    isReal: true,
    transcript:
      "Morning all. I've been reviewing the latest repairs prioritisation list. Most of it looks sensible, but a couple of urgent damp and mould cases have ended up lower than I'd have expected. It's probably explainable, but before we reschedule anything I'd like somebody to sense-check the rankings.",
    clueFragment: 'Repairs',
  },
  {
    id: 'real-2',
    file: '/clips/real-2.wav',
    isReal: true,
    transcript:
      "We've seen call waiting times improve quite a bit over the last few weeks, which is great news. The only thing I can't quite reconcile is that complaints about getting through don't seem to have dropped at the same rate. Can someone have another look at the numbers before we include them in next month's report?",
    clueFragment: 'Contact Centre',
  },
  {
    id: 'real-3',
    file: '/clips/real-3.wav',
    isReal: true,
    transcript:
      "The case summary is helpful and the recommended placement looks reasonable overall, but before agreeing anything I'd like someone to review the original notes as well. There may be some context that hasn't come through in the summary.",
    clueFragment: "Children's Services",
  },
  {
    id: 'real-4',
    file: '/clips/real-4.wav',
    isReal: true,
    transcript:
      "Energy usage is down again according to the dashboard, which is obviously positive. One of the building managers queried the figures yesterday though, so could we double-check them before the next performance update goes out? I'd rather be confident in the numbers.",
    clueFragment: 'Facilities Management',
  },
  {
    id: 'real-5',
    file: '/clips/real-5.wav',
    isReal: true,
    transcript:
      "Has anyone else noticed we're relying much more heavily on the automated summaries now? They're generally very good and save a lot of time, but I worry people are starting to skip the detailed reports altogether. It might be worth discussing at the next team meeting.",
    clueFragment: 'Council Tax',
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
  intro: 'The five genuine clips from Victoria hide a message.',
  question: "Read the first letter of each real clue, in order. What's Victoria telling you?",
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
  /** The override digit this challenge contributes to the escape room. */
  digit: '7',
  flavour: 'Enter this digit into the override console along with the digits from the other challenges.',
}
