import { defaultState, newEntry, newSession, newSet } from '../src/lib/storage.js';
import { toISODate } from '../src/lib/date.js';

export const HOUR = 3600 * 1000;
export const DAY = 24 * HOUR;

/** Deterministic "now" so tests never depend on the wall clock. */
export const NOW = new Date('2026-03-15T18:00:00').getTime();

/**
 * Build a session that happened `hoursAgo` before NOW.
 * `entries` is [[exerciseId, sets], ...] where each set is a plain object.
 */
export function sessionAt(hoursAgo, entries, overrides = {}) {
  const ts = NOW - hoursAgo * HOUR;
  const session = newSession(overrides.sessionType ?? 'push', {
    date: toISODate(ts),
    createdAt: ts,
    ...overrides,
  });
  session.entries = entries.map(([exerciseId, sets]) =>
    newEntry(exerciseId, { sets: sets.map((s) => newSet(s.type ?? 'normal', s)) })
  );
  return session;
}

export function stateWith(sessions, profileOverrides = {}) {
  const base = defaultState();
  return {
    ...base,
    profile: { ...base.profile, onboarded: true, ...profileOverrides },
    sessions: [...sessions].sort((a, b) => b.createdAt - a.createdAt),
  };
}

export const set = (weight, reps, targetReps, type = 'normal') => ({ weight, reps, targetReps, type });
