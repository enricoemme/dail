# Human or Not? — The Islington AI Challenge

A kiosk voice game for public events. Residents put on a headset and play five
short games against Gemini's realtime voice AI, which is doing its very best
to sound human — coughs, "erm"s, north-London charm and all. Score and total
time go on a leaderboard; winners are crowned at the end of the day.

Staff-operated, zero sign-up: one screen, big buttons, first names only.

## The five rounds

| # | Round | Win condition |
|---|-------|---------------|
| 1 | Two Truths and a Lie | Spot which of 3 statements is the lie |
| 2 | Spot the Lie (The Interview) | Ask 3 fixed questions, spot the lying answer |
| 3 | Quick-Fire Quiz | The AI quizzes *you* — get 3 of 5 right |
| 4 | Catch the Slip | Hear the one inhuman detail in a human story |
| 5 | The Final Verdict | Hidden coin flip: is the voice claiming to be human, or not? |

1 point per round won; ties broken by total time (lower is better).

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
