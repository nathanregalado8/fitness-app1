/**
 * Frontend side of the AI boundary.
 *
 * Builds the Layer 1 signal payload and posts it to the backend proxy. No API
 * key, no model name and no prompt lives here — the browser only ever knows
 * about `/api/ai`.
 */

import { EXERCISES, EXERCISE_BY_ID } from '../data/exercises.js';
import { buildSignals } from './signals.js';
import { toISODate } from './date.js';
import {
  allowedExerciseIds,
  buildRequest,
  extractToolInput,
  messagesBody,
  validateFor,
} from './aiProtocol.js';

const ENDPOINT = '/api/ai';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

/**
 * Direct browser → Anthropic call, used only when the app is served from a
 * static host that cannot run the serverless function AND the user has pasted
 * their own key in the profile.
 *
 * This is the less safe path by design: the key sits in this browser's
 * localStorage rather than on a server. It exists because a static deploy has
 * no other way to reach the API. The proxy remains the default whenever a
 * backend answers.
 */
async function callDirect(action, payload, apiKey) {
  const spec = buildRequest(action, payload);
  if (!spec) return { ok: false, error: { code: 'unknown_action' } };

  let res;
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        // Required for browser-origin requests; without it the API rejects
        // the call before CORS even completes.
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(messagesBody(spec)),
    });
  } catch {
    return { ok: false, error: { code: 'network' } };
  }

  let message;
  try {
    message = await res.json();
  } catch {
    return { ok: false, error: { code: 'bad_response', message: `HTTP ${res.status}` } };
  }

  if (!res.ok) {
    return {
      ok: false,
      error: {
        code: res.status === 401 ? 'bad_api_key' : message?.error?.type ?? 'upstream_error',
        message: res.status === 429 ? 'Rate limited. Try again shortly.' : message?.error?.message,
      },
    };
  }
  if (message.stop_reason === 'refusal') return { ok: false, error: { code: 'refusal' } };

  const input = extractToolInput(message, spec.tool.name);
  if (!input) return { ok: false, error: { code: 'no_tool_use' } };

  // Same validation the proxy applies — a hallucinated exercise id is dropped
  // on this path too.
  return {
    ok: true,
    action,
    model: message.model,
    data: validateFor(action, input, allowedExerciseIds(action, payload)),
  };
}

async function post(action, payload, apiKey) {
  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload }),
    });
  } catch {
    return { ok: false, error: { code: 'network', message: 'Could not reach the coach service.' } };
  }

  // No serverless function here (static host). Fall back to the user's own key
  // if they supplied one, otherwise report the missing backend.
  if (res.status === 404) {
    return apiKey ? callDirect(action, payload, apiKey) : { ok: false, error: { code: 'no_backend' } };
  }

  let body;
  try {
    body = await res.json();
  } catch {
    // A static host (GitHub Pages) has no serverless function, so /api/ai
    // returns the 404 page instead of JSON. Everything except the coach still
    // works, so say that plainly rather than showing a parse error.
    return {
      ok: false,
      error: res.status === 404 ? { code: 'no_backend' } : { code: 'bad_response', message: `HTTP ${res.status}` },
    };
  }
  // A backend that exists but has no key of its own is the same situation as no
  // backend at all: use the key the user pasted, if there is one.
  if (!body?.ok && body?.error?.code === 'missing_api_key' && apiKey) {
    return callDirect(action, payload, apiKey);
  }

  return body?.ok ? body : { ok: false, error: body?.error ?? { code: 'unknown' } };
}

/** Exercise ids that had at least one working set in a session. */
export function sessionExerciseIds(session) {
  return [...new Set((session?.entries ?? []).map((e) => e.exerciseId))].filter((id) => EXERCISE_BY_ID[id]);
}

/**
 * Post-session job (spec: runs after each logged session, not on every app open).
 * Focuses the history window on the exercises that were just performed.
 */
/** The key the user pasted in their profile, if any. */
const localKey = (state) => (state.profile?.apiKey ?? '').trim() || null;

export function requestSuggestion(state, session, userContext = '') {
  const focus = sessionExerciseIds(session);
  const signals = buildSignals(state, {
    focusExerciseIds: focus,
    plannedExerciseIds: focus,
    historyDepth: 6,
  });
  return post('suggestion', { signals, userContext }, localKey(state));
}

/** Compact catalog so the model can only pick real, available exercises. */
function catalogFor(state) {
  const owned = new Set(state.profile?.equipment ?? []);
  return EXERCISES.filter(
    (e) => owned.size === 0 || e.equipment.every((eq) => eq === 'bodyweight' || eq === 'none' || owned.has(eq))
  ).map((e) => ({
    id: e.id,
    name: e.name.en,
    category: e.category,
    movementType: e.movementType,
    primary: e.primary,
    secondary: e.secondary,
    bodyParts: e.bodyParts,
  }));
}

/** On-demand routine generation with freeform context ("solo lower hoy"). */
export function requestRoutine(state, request) {
  const signals = buildSignals(state, { historyDepth: 4, maxExercises: 16 });
  return post('routine', { signals, catalog: catalogFor(state), request }, localKey(state));
}

/**
 * Conversational coaching. The model sees the same Layer 1 signals as every
 * other action — never the raw log — plus the recent turns of this thread.
 */
export function sendChat(state, message, history = [], now = Date.now()) {
  const signals = buildSignals(state, { historyDepth: 6, maxExercises: 16 });
  const lastTurn = history.at(-1)?.at ?? null;
  const lastSession = Math.max(0, ...(state.sessions ?? []).map((s) => s.createdAt ?? 0));

  return post(
    'chat',
    {
      signals,
      message,
      catalog: catalogFor(state),
      // Where we are in time. Without this the model has no way to know that
      // the thread it is reading happened yesterday.
      today: {
        date: toISODate(now),
        weekday: new Date(now).toLocaleDateString('en-US', { weekday: 'long' }),
        isNewDay: lastTurn ? toISODate(lastTurn) !== toISODate(now) : true,
        lastMessageDate: lastTurn ? toISODate(lastTurn) : null,
        daysSinceLastSession: lastSession ? Math.floor((now - lastSession) / 86400000) : null,
        loggedToday: (state.sessions ?? []).some((s) => s.date === toISODate(now)),
      },
      // Only the last few turns travel, and only their text.
      history: history.slice(-8).map((m) => ({
        role: m.role,
        text: String(m.text ?? '').slice(0, 800),
        date: m.at ? toISODate(m.at) : null,
      })),
    },
    localKey(state)
  );
}

/** Read-only Q&A about the user's own logged data. */
export function askQuestion(state, question) {
  const signals = buildSignals(state, { historyDepth: 6, maxExercises: 16 });
  return post('qa', { signals, question }, localKey(state));
}
