# fitness-app1

Training log with per-muscle tiered progress, rule-based recovery warnings, and a
two-layer AI coach. React + localStorage, with a single serverless function as the
only place the Anthropic API key ever lives.

```bash
npm install
npm run dev     # http://localhost:5173  (also serves /api/ai)
npm test        # 47 unit tests over the signal / tier / warning logic
npm run build
```

## What's here

| Phase | Status |
|---|---|
| 1 — Logging: exercises, sets/reps/weight, 5 set types, calendar, history, templates | done |
| Routines: pick a session type → a coherent routine, built for your goal | done |
| Swap: every exercise can be swapped for an alternative that trains the same thing | done |
| 2 — Per-muscle power score → 5 independent tiers, interactive body map | done (Claude Design artwork) |
| 2.5 — Session types, activity streak, recovery + areas-of-concern warnings | done |
| 3 — Structured onboarding, open concern list, goal-branched progression map | done |
| 4 — Layer 1 signals + Layer 2 AI via backend proxy | done |

All edits happen through forms and buttons. Chat never writes to the log.

## Architecture

```
src/lib/signals.js        Layer 1 — deterministic signals, no thresholds, no AI
src/lib/powerScore.js     recency + volume trend + consistency → score → tier 1-5
src/lib/recovery.js       24-36h muscle window, 48h flagged-area cooldown
src/lib/routineBuilder.js blueprint per split × prescription per goal
src/components/muscleShapes.js  avatar paths, per muscle per tier (Claude Design)
api/ai.js                 Layer 2 — the only reader of ANTHROPIC_API_KEY
```

### Routines

Picking a session type builds the routine immediately — no network, no API key,
so it always works and is always structured the same way: heavy compounds, then
accessories, then isolation. What changes with your goal is the prescription
(strength 5×5, hypertrophy 4×8, endurance 3×15) and which lifts get chosen.

Guards that keep a routine sensible, each locked by a test: a slot is filled only
by an exercise those muscles actually *lead* (so a squat can't fill the hamstring
slot), no two lifts with identical primary muscles, accessories complement the
main lift rather than repeating it, muscles inside the rest window are skipped,
and nothing is programmed that your equipment can't do.

142 exercises, so every lift has real alternatives — 17 for bench, 25 for squat.
Swapping keeps the prescribed sets and only changes the movement.

**Layer 1** turns raw logs into signals on-device. **Layer 2** receives *only those
signals* — raw logs never leave the browser (there's a test asserting it). Every
Layer 2 call uses `claude-sonnet-5` with a forced `tool_choice`, so output is
structured tool input, never regex-parsed text, and is re-validated server-side
before it reaches the client.

The AI cannot edit or delete history. Its only write is a target for the next
occurrence of one exercise, and only after you press Yes on the suggestion card.
The post-session job runs once per logged session — not on app open.

### Tiers

Per muscle group, independently — no averaging, no single global character:

```
power = 0.45·recency + 0.30·volume trend + 0.25·rep-completion consistency
tier  = 1 · 2 · 3 · 4 · 5    at 0 / 20 / 40 / 60 / 80
```

Shapes inflate as a group climbs and deflate as it goes untrained; tier 5 alone
gets the aura. Cardio, hikes and swims feed the activity streak only and never
touch muscle timers.

## Running it

Two deploy targets, and the difference is only the AI coach.

**GitHub Pages** (`.github/workflows/pages.yml`, enable Pages → Source: GitHub
Actions). Static, so `/api/ai` does not exist there. Logging, routines,
swapping, tiers, calendar, warnings and the progression map all work. For the
coach you paste your own Anthropic key under Profile → AI coach key; the app
then calls the API straight from the browser.

**Vercel** — runs `api/ai.js`, so set `ANTHROPIC_API_KEY` in Project → Settings
→ Environment Variables and leave the in-app key field empty. This is the safer
path: the key stays on the server and never enters the browser.

Locally: `cp .env.example .env`, fill it in, `npm run dev`.

### About the in-app key field

It exists because a static host has no other way to reach the API, and it is
the less safe option: the key lives in that browser's localStorage and is sent
from the device. Anyone with access to that browser can read it. Exports strip
it (there's a test), and the proxy always wins when a backend answers — the
field is ignored entirely on Vercel.

`src/lib/aiProtocol.js` holds the model, tool schemas, prompt and validation,
and is imported by both paths, so a request is the same forced tool call and
gets the same validation whichever way it goes.

## Pending

Phase 2 character artwork (Claude Design). The tier pipeline is finished and feeds
`TIER_SCALE` / the shape tables in `src/components/BodyMap.jsx`; dropping in final
assets does not touch the tier logic.
