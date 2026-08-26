// ============================================================================
// DAIL — GAME CONTENT (DAIL = the challenge; VIKI = the rogue AI villain). Single file to edit for scripts, clips and puzzle.
//
// THE STORY: VIKI, the council's AI assistant, has started imitating Chief
// Exec Dale's voice. Ten intercepted voice messages: five genuinely
// Dale (his own recordings), five synthesized by VIKI (ElevenLabs clone).
// The pattern players must hear: the real Dale always asks people to
// CHECK things; VIKI always talks people OUT of checking.
//
// Audio lives in public/clips/ under neutral names (clip-01..10) so nothing
// in dev-tools reveals which are genuine. The mapping below is the truth.
// ============================================================================

export interface ClipContent {
  /** Stable id; also the audio filename base (neutral, non-revealing). */
  id: string
  /** Public path to the audio file (served from public/clips). */
  file: string
  /** Whether this is genuinely Dale (true) or a VIKI synthesis. */
  isReal: boolean
  /** The council service the message is about (shown on the reveal). */
  subject: string
  /** What is said in the clip — reference / captions. */
  transcript: string
  /** FAKE clips only: the tell players should have noticed. */
  redFlag?: string
}

// Prefix asset URLs with Vite's base path so audio resolves whether the app
// is served from '/' (kiosk, Vercel) or '/dail/' (GitHub Pages).
const asset = (p: string) => import.meta.env.BASE_URL + p.replace(/^\//, '')

export const ALL_CLIPS: ClipContent[] = [
  {
    id: 'clip-01',
    file: asset('/clips/clip-01.mp3'),
    isReal: true,
    subject: 'Contact Centre',
    transcript:
      "We've seen call waiting times improve quite a bit over the last few weeks, which is great news. The only thing I can't quite reconcile is that complaints about getting through don't seem to have dropped at the same rate. Can someone have another look at the numbers before we include them in next month's report?",
  },
  {
    id: 'clip-02',
    file: asset('/clips/clip-02.mp3'),
    isReal: false,
    subject: 'Parking Services',
    transcript:
      "I've had a look at the permit pricing analysis, and honestly, the case for increasing charges in the high-demand areas is pretty clear. My worry is that another round of review just costs us most of the benefit this financial year. Let's not hold this one up — I'd rather we pressed on and implemented it now.",
    redFlag: 'Creates urgency and discourages verification.',
  },
  {
    id: 'clip-03',
    file: asset('/clips/clip-03.mp3'),
    isReal: false,
    subject: 'Waste & Recycling',
    transcript:
      "On the missed collection reports — I've been through the route data, and the system isn't showing anything wrong on those rounds. My feeling is the dashboards are giving us the truer picture here, so let's keep monitoring but hold off changing any routes. No need to chase every individual report for now.",
    redFlag: 'Tells staff to trust the dashboard over resident evidence.',
  },
  {
    id: 'clip-04',
    file: asset('/clips/clip-04.mp3'),
    isReal: true,
    subject: 'Facilities Management',
    transcript:
      "Energy usage is down again according to the dashboard, which is obviously positive. One of the building managers queried the figures yesterday though, so could we double-check them before the next performance update goes out? I'd rather be confident in the numbers.",
  },
  {
    id: 'clip-05',
    file: asset('/clips/clip-05.mp3'),
    isReal: true,
    subject: 'Repairs',
    transcript:
      "Morning all. I've been reviewing the latest repairs prioritisation list. Most of it looks sensible, but a couple of urgent damp and mould cases have ended up lower than I'd have expected. It's probably explainable, but before we reschedule anything I'd like somebody to sense-check the rankings.",
  },
  {
    id: 'clip-06',
    file: asset('/clips/clip-06.mp3'),
    isReal: false,
    subject: 'Communications',
    transcript:
      "The engagement analysis on the council tax campaign has come back, and the numbers say launching straight away gets us the best response rates. More testing and another round of stakeholder sign-off honestly aren't going to move the result much. I'd like us to get it out the door this week.",
    redFlag: 'Pushes teams to skip testing and approval steps.',
  },
  {
    id: 'clip-07',
    file: asset('/clips/clip-07.mp3'),
    isReal: false,
    subject: 'Business Rates',
    transcript:
      "Quick update on business rates — collections have beaten forecast three periods running now, which is brilliant. Given that, I don't think the case-by-case reviews are earning their keep anymore; if anything, they're slowing the recovery work down. Unless anyone objects strongly, let's scale them back and keep the momentum going.",
    redFlag: 'Frames case reviews as unnecessary delays.',
  },
  {
    id: 'clip-08',
    file: asset('/clips/clip-08.mp3'),
    isReal: true,
    subject: "Children's Services",
    transcript:
      "The case summary is helpful and the recommended placement looks reasonable overall, but before agreeing anything I'd like someone to review the original notes as well. There may be some context that hasn't come through in the summary.",
  },
  {
    id: 'clip-09',
    file: asset('/clips/clip-09.mp3'),
    isReal: false,
    subject: 'Housing Repairs',
    transcript:
      "So, on the repairs backlog — the analysis is showing that the low-priority appointments barely move the needle on resident satisfaction. If we want the performance numbers up, the sensible thing is to push those cases back and put the effort into preventative maintenance instead. I think we should just make that change.",
    redFlag: 'Prioritises performance targets over resident outcomes.',
  },
  {
    id: 'clip-10',
    file: asset('/clips/clip-10.mp3'),
    isReal: true,
    subject: 'Council Tax',
    transcript:
      "Has anyone else noticed we're relying much more heavily on the automated summaries now? They're generally very good and save a lot of time, but I worry people are starting to skip the detailed reports altogether. It might be worth discussing at the next team meeting.",
  },
]

export const REAL_CLIPS: ClipContent[] = ALL_CLIPS.filter((c) => c.isReal)
export const FAKE_CLIPS: ClipContent[] = ALL_CLIPS.filter((c) => !c.isReal)

// --- Stage 2: the question asked over the genuine recordings ----------------
export interface RiddleOption {
  id: string
  label: string
  correct: boolean
}

export const RIDDLE = {
  question: 'Looking across the genuine recordings, what warning sign appeared before the VIKI incident?',
  options: [
    {
      id: 'A',
      label: 'VIKI was producing large numbers of obvious errors across council services.',
      correct: false,
    },
    {
      id: 'B',
      label: 'Staff kept spotting concerns and inconsistencies — but everyone was starting to rely on summaries, dashboards and recommendations without fully investigating them.',
      correct: true,
    },
    {
      id: 'C',
      label: 'Council systems were already compromised by an external cyber attack.',
      correct: false,
    },
    {
      id: 'D',
      label: 'Senior management had instructed staff to stop reviewing information.',
      correct: false,
    },
  ] as RiddleOption[],
}

// --- The reward for solving Stage 2 -----------------------------------------
export const ESCAPE = {
  /** The one-line insight the genuine clips add up to. */
  insight: 'The warning sign: people were beginning to stop checking.',
  /** The override digit this challenge contributes to the escape room. */
  digit: '7',
  flavour: 'Enter this digit into the override console along with the digits from the other challenges.',
}
