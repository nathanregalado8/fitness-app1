/**
 * Frontend side of the AI boundary.
 *
 * Builds the Layer 1 signal payload and posts it to the backend proxy. No API
 * key, no model name and no prompt lives here — the browser only ever knows
 * about `/api/ai`.
 */

import { EXERCISES, EXERCISE_BY_ID } from '../data/exercises.js';
import { buildSignals } from './signals.js';

const ENDPOINT = '/api/ai';

async function post(action, payload) {
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

  let body;
  try {
    body = await res.json();
  } catch {
    return { ok: false, error: { code: 'bad_response', message: `HTTP ${res.status}` } };
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
export function requestSuggestion(state, session, userContext = '') {
  const focus = sessionExerciseIds(session);
  const signals = buildSignals(state, {
    focusExerciseIds: focus,
    plannedExerciseIds: focus,
    historyDepth: 6,
  });
  return post('suggestion', { signals, userContext });
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
  return post('routine', { signals, catalog: catalogFor(state), request });
}

/** Read-only Q&A about the user's own logged data. */
export function askQuestion(state, question) {
  const signals = buildSignals(state, { historyDepth: 6, maxExercises: 16 });
  return post('qa', { signals, question });
}
