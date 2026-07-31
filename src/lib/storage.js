/**
 * localStorage persistence. All logging data lives here — there is no
 * database and no user account. The serverless function never sees raw logs
 * (spec Phase 4: Layer 2 receives Layer 1 signals only).
 */

import { toISODate } from './date.js';

const KEY = 'fitness-app1:state';
export const STATE_VERSION = 1;

export const SET_TYPES = ['warmup', 'normal', 'backoff', 'drop', 'failure'];

/** Warm-up sets are excluded from volume, completion and tier maths. */
export const isWorkingSet = (set) => set.type !== 'warmup';

export const SESSION_TYPES = [
  { id: 'push', strength: true },
  { id: 'pull', strength: true },
  { id: 'legs', strength: true },
  { id: 'full_body', strength: true },
  { id: 'cardio', strength: false },
  { id: 'hike', strength: false },
  { id: 'swim', strength: false },
  { id: 'custom', strength: true },
];

export const SESSION_TYPE_BY_ID = Object.fromEntries(SESSION_TYPES.map((s) => [s.id, s]));

export const GOALS = ['strength', 'hypertrophy', 'endurance', 'general'];

export const EQUIPMENT = [
  'barbell',
  'dumbbells',
  'machine',
  'cable',
  'bench',
  'rack',
  'bar',
  'bars',
  'bodyweight',
  'bike',
  'pool',
  'rope',
  'kettlebell',
  'band',
  'sled',
];

export function defaultState() {
  return {
    version: STATE_VERSION,
    profile: {
      language: (globalThis.navigator?.language ?? 'en').startsWith('es') ? 'es' : 'en',
      units: 'kg',
      goal: 'hypertrophy',
      daysPerWeek: 4,
      equipment: ['barbell', 'dumbbells', 'machine', 'cable', 'bench', 'rack', 'bar', 'bodyweight'],
      bodyweight: null,
      areasOfConcern: [],
      pplOrder: ['push', 'pull', 'legs'],
      onboarded: false,
    },
    sessions: [],
    templates: [],
    /** exerciseId -> { weight, reps, note, source, updatedAt } written only on explicit confirm. */
    targets: {},
    /** Suggestion cards produced by the post-session AI job, with their decisions. */
    suggestions: [],
    /** sessionId -> { status, startedAt, finishedAt, error } — the job runs once per session. */
    jobs: {},
    /** Non-blocking warnings the user dismissed: key -> ISO timestamp. */
    dismissed: {},
    /** Saved coach conversations (routine generation + read-only Q&A). */
    coachLog: [],
  };
}

export function uid(prefix = 'id') {
  const rand =
    globalThis.crypto?.randomUUID?.().slice(0, 8) ??
    Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

function migrate(state) {
  const base = defaultState();
  if (!state || typeof state !== 'object') return base;
  // Shallow-merge each top-level slice so a partially-written or older state
  // still boots with every key present.
  return {
    ...base,
    ...state,
    version: STATE_VERSION,
    profile: { ...base.profile, ...(state.profile ?? {}) },
    sessions: Array.isArray(state.sessions) ? state.sessions : [],
    templates: Array.isArray(state.templates) ? state.templates : [],
    targets: state.targets ?? {},
    suggestions: Array.isArray(state.suggestions) ? state.suggestions : [],
    jobs: state.jobs ?? {},
    dismissed: state.dismissed ?? {},
    coachLog: Array.isArray(state.coachLog) ? state.coachLog : [],
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    return migrate(JSON.parse(raw));
  } catch {
    return defaultState();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    // Quota exceeded or private-mode storage: keep running in memory.
    return false;
  }
}

export function exportState(state) {
  return JSON.stringify(state, null, 2);
}

export function importState(json) {
  return migrate(JSON.parse(json));
}

// ------------------------------------------------------------------ builders

export function newSet(type = 'normal', overrides = {}) {
  return {
    id: uid('set'),
    type,
    weight: null,
    reps: null,
    targetReps: null,
    ...overrides,
  };
}

export function newEntry(exerciseId, overrides = {}) {
  return {
    id: uid('entry'),
    exerciseId,
    note: '',
    sets: [newSet('normal')],
    ...overrides,
  };
}

export function newSession(sessionType = 'push', overrides = {}) {
  const type = SESSION_TYPE_BY_ID[sessionType] ?? SESSION_TYPE_BY_ID.custom;
  return {
    id: uid('sess'),
    date: toISODate(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    sessionType,
    customName: '',
    /** Mirrors the type default; the custom type lets the user flip it. */
    isStrength: type.strength,
    entries: [],
    /** Non-strength sessions record duration/distance instead of sets. */
    durationMin: null,
    distanceKm: null,
    notes: '',
    ...overrides,
  };
}

export function newTemplate(name, sessionType, exerciseIds) {
  return {
    id: uid('tpl'),
    name,
    sessionType,
    exerciseIds,
    createdAt: Date.now(),
  };
}

export function newConcern(bodyPart, note = '') {
  return { id: uid('aoc'), bodyPart, note, createdAt: Date.now() };
}
