# Who Am I? — The Islington AI Challenge

A kiosk voice game for public events. Residents put on a headset and talk to
Gemini's realtime voice AI, which plays a **mystery guest**: a famous person
from Islington, in first person, warm and cheeky, dropping clues but never its
own name. The player interrogates the voice and guesses who it is. Score and
total time go on a leaderboard; winners are crowned at the end of the day.

Staff-operated, zero sign-up: one screen, big buttons, first names only.

## How a game works

- **5 rounds**, each a different mystery guest drawn from a pool of Islington
  legends (Orwell, Thierry Henry, Little Simz, Douglas Adams, Johnny Rotten,
  Tony Blair, Charlie George, Nick Hornby — edit the pool in `src/prompts.ts`).
- The player chats freely; saying **"give me a clue"** unlocks the next of 4
  scripted clues (cryptic → giveaway), which also appear as cards on screen.
- To answer, the player **says the name out loud** — the AI judges it
  (surnames and nicknames count) and reports the result via function call.
- **3 wrong guesses or 2½ minutes** ends the round; the guest reveals itself
  either way.
- 1 point per guest unmasked; ties broken by total time (lower is better) —
  so leaning on clues costs you leaderboard position naturally.

## Setup

### 1. Get a Gemini API key

Create a key at <https://aistudio.google.com/apikey> (Google AI Studio — the
app uses the Generative Language API endpoint, not Vertex).

### 2. Configure

```bash
cp .env.example .env
# then edit .env and paste your key
```

| Variable | Default | Purpose |
|----------|---------|---------|
| `GEMINI_API_KEY` | — | **Required.** Never shipped to the browser — a tiny Node relay holds it. |
| `GEMINI_LIVE_MODEL` | `gemini-3.1-flash-live-preview` | Live API model |
| `GEMINI_VOICE` | `Charon` | Prebuilt voice (alternatives: Orus, Puck, Fenrir) |
| `PORT` | `8787` | Relay port |

### 3. Run

**Hosting the kiosk (recommended for the event):** one process serves
everything — UI, config, and the Live API relay:

```bash
npm install
npm run build
npm start
```

Open <http://localhost:8787>. Restart `npm start` after changing `.env`.

**Developing (hot reload):**

```bash
npm run dev
```

Open <http://localhost:5173> (or the URL Vite prints if 5173 is taken). This
starts two processes:

- **Relay** (`server/index.mjs`, port 8787) — holds the API key and pipes the
  Live API websocket; also serves `/api/config`.
- **Vite dev server** (port 5173) — the kiosk UI, proxying `/api` and `/live`
  to the relay.

After editing `src/prompts.ts` for the hosted kiosk, run `npm run build`
again and reload the page.

## Running the kiosk on event day

1. Use Chrome. Open the app, tap ⚙ (bottom-right) → **Enter fullscreen** — or
   launch in kiosk mode:
   ```bash
   open -a "Google Chrome" --args --kiosk http://localhost:5173   # macOS
   ```
2. Plug in the headset **before** starting, and pick it as the system
   mic/output device.
3. First game of the day: the app asks once to enable the microphone, with a
   level meter so you can confirm the headset works. Permission persists.
4. The small mic meter at the bottom of every live round tells you at a glance
   the mic is alive.
5. **⚙ staff menu**: Skip this round · Restart game · Clear leaderboard ·
   Enter fullscreen. Destructive buttons need a second confirming tap.
6. End of day: Leaderboard screen → **Download CSV** to announce winners.
   Scores persist in the browser's localStorage, so use the same browser
   profile all day and don't clear site data.

## Tuning the personas

All five system prompts (plus the shared "sound human" direction, the quiz
question pool and the Round-4 slip pool) live in **`src/prompts.ts`**. Edit,
save, and the dev server hot-reloads — no other code changes needed.

## Architecture notes

- **Fresh connection per round** — each round has its own system prompt;
  reconnecting takes well under a second.
- **Audio in**: mic → AudioWorklet → 16 kHz PCM16 → base64 `realtimeInput`.
  **Audio out**: 24 kHz PCM16 chunks queued gaplessly through Web Audio (the
  same node feeds the voice orb's analyser).
- **Turn-taking**: Gemini's native automatic VAD; on `serverContent.interrupted`
  (barge-in) the local playback queue is flushed instantly.
- **Scoring calls**: rounds 3 & 4 report results via function calls
  (`mark_quiz_answer`, `round_finished`, `slip_result`). Declarations contain
  no `additionalProperties` (Gemini rejects it) and tool responses are sent
  back instantly.
- **Watchdog**: if the player spoke and no audio arrives within 5 s, the app
  nudges the model with a text "continue"; a second stall reconnects (up to 3
  times per round).
- **No database**: leaderboard is localStorage + CSV export.
