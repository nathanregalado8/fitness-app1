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
| 2 — Per-muscle power score → 5 independent tiers, interactive body map | done (placeholder art) |
| 2.5 — Session types, activity streak, recovery + areas-of-concern warnings | done |
| 3 — Structured onboarding, open concern list, goal-branched progression map | done |
| 4 — Layer 1 signals + Layer 2 AI via backend proxy | done |

All edits happen through forms and buttons. Chat never writes to the log.

## Architecture

```
src/lib/signals.js     Layer 1 — deterministic signals, no thresholds, no AI
src/lib/powerScore.js  recency + volume trend + consistency → score → tier 1-5
src/lib/recovery.js    24-36h muscle window, 48h flagged-area cooldown
api/ai.js              Layer 2 — the only reader of ANTHROPIC_API_KEY
```

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

## API key

The key is backend-only — Vite inlines `VITE_*` vars only, so it can't reach the
bundle. Set `ANTHROPIC_API_KEY` on the function's environment:

- **Local**: `cp .env.example .env` and fill it in.
- **Vercel**: Project → Settings → Environment Variables.
- **GitHub Actions**: repo → Settings → Secrets and variables → Actions → New
  repository secret, named `ANTHROPIC_API_KEY`.

Without a key the app is fully usable — logging, tiers, calendar, warnings and the
progression map all work offline. Only the coach is disabled, and it says so.

## Pending

Phase 2 character artwork (Claude Design). The tier pipeline is finished and feeds
`TIER_SCALE` / the shape tables in `src/components/BodyMap.jsx`; dropping in final
assets does not touch the tier logic.
