# DAIL — The Islington AI Challenge

An escape-room voice puzzle. The Chief Exec, "Victoria", has been hacked:
ten short audio clips, **five genuinely hers and five AI voice-clones**. The
player listens, marks each real-or-AI, and scores. The five *real* clips are
clues that spell a hidden message; the five fakes are red herrings (and double
as textbook voice-scam scripts). Solving the riddle reveals the escape-room
letter, then a short debrief teaches how to defend against voice-cloning fraud.

Modern, luxurious UI — glassmorphism on a deep ground, Tiffany-blue + rose-gold
metallics, editorial serif display, and **live audio-reactive waveforms** that
light up and pulse to the real signal while a clip plays.

## Game flow

1. **The grid** — 10 clips (click to play/stop; only one plays at a time).
   Mark each `yes` (real) / `no` (AI). All ten must be marked to continue.
2. **Score** — "You correctly selected X of 5 real clips."
3. **The riddle** — replay just the 5 real clips; answer what message they
   spell (placeholder acrostic: **T-R-U-S-T**).
4. **Escape reveal** — the code word + this room's escape letter.
5. **Debrief** — "Could you tell the difference?" · Stop. Check. Confirm.

## ⭐ Swapping in Dale's real audio later

Everything is prepared so the real recordings are a drop-in replacement.
The 10 clips currently in `public/clips/` are AI placeholders (all one voice)
so the mechanic can be demoed today.

1. Drop the 5 genuine recordings into `public/clips/` as
   `real-1.wav … real-5.wav`, and the 5 cloned red herrings as
   `fake-1.wav … fake-5.wav`. (Any web audio format works — `.mp3`/`.m4a`
   too; just match the extension in the `file` fields.)
2. Open **`src/game/content.ts`** — the single content file — and update each
   clip's `transcript`, plus the `RIDDLE` options and `ESCAPE` letter/codeword
   so the puzzle resolves to the real script.
3. `npm run build` and reload. Nothing else changes.

The grid shuffles clip positions on every play, so real/fake placement is never
predictable.

## Setup & running

```bash
npm install
npm run build
npm start          # hosts everything on http://localhost:8787
```

The game itself is **fully static at runtime** — no API key needed to play,
since the clips are files. A Gemini key is only required to (re)generate the
placeholder clips:

```bash
cp .env.example .env         # add GEMINI_API_KEY
npm start                    # in one terminal (relay must be up)
node scripts/generate-clips.mjs   # regenerates public/clips/*.wav
```

`GEMINI_VOICE_FEMALE` (default `Aoede`) is the placeholder voice; `en-GB`.

### Dev mode (hot reload)

```bash
npm run dev        # Vite on http://localhost:5173 (or next free port)
```

## Event-day notes

- Chrome, fullscreen (⚙ bottom-left → Enter fullscreen), landscape display.
- The ⚙ staff menu also has **Skip to next screen** and **Restart game**.
- First interaction unlocks browser audio automatically (clicking a clip
  counts), so there's no separate "enable audio" step.

## Architecture

- **Vite + React + TS**, single page. `src/App.tsx` is the screen state machine.
- **Audio**: one shared `ClipPlayer` (`src/lib/audio/clipPlayer.ts`) — decodes
  and caches clips, plays one at a time, and exposes an `AnalyserNode` + play
  progress. `AudioWaveform.tsx` draws the reactive canvas: a deterministic
  per-clip silhouette at rest, live frequency bars while playing, with a
  metallic gradient, glow, and played-progress fill.
- **Server** (`server/index.mjs`): static host for `dist/`, plus the Gemini
  relay used only by the clip generator.
- No database, no accounts.
