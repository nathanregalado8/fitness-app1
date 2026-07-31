/**
 * PHASE 2.5 — rule-based recovery and areas-of-concern warnings.
 *
 * Both kinds of warning are dismissible and non-blocking: they never prevent
 * logging anything. They are deliberately rule-based, not AI — a popup must
 * appear instantly while the user is picking exercises.
 *
 * The two systems are independent (spec): a flagged body part fires its own
 * popup with a longer cooldown, whether or not the muscle recency warning
 * also fires.
 */

import { EXERCISE_BY_ID, isStrengthExercise, muscleLoad } from '../data/exercises.js';
import { toISODate } from './date.js';
import { muscleStats } from './signals.js';

/** General muscle recovery window. Under `rest`, hard warning; up to `caution`, soft. */
export const RECOVERY_HOURS = { rest: 24, caution: 36 };

/** Flagged areas get a longer default cooldown. */
export const CONCERN_COOLDOWN_HOURS = 48;

/**
 * Muscle-recency warnings for a planned set of exercises.
 * Returns [] for non-strength work — cardio, hikes and swims never touch
 * muscle recovery timers.
 */
export function recoveryWarnings(state, exerciseIds, { now = Date.now(), isStrength = true } = {}) {
  if (!isStrength) return [];

  const strengthIds = (exerciseIds ?? []).filter(isStrengthExercise);
  if (strengthIds.length === 0) return [];

  // Primary movers only: a secondary contribution is not enough to claim a
  // muscle needs rest.
  const targeted = new Map();
  for (const id of strengthIds) {
    for (const m of muscleLoad(id)) {
      if (m.role !== 'primary') continue;
      const list = targeted.get(m.muscleId) ?? [];
      list.push(id);
      targeted.set(m.muscleId, list);
    }
  }

  const stats = Object.fromEntries(muscleStats(state, { now }).map((m) => [m.muscleId, m]));
  const today = toISODate(now);
  const warnings = [];

  for (const [muscleId, viaExercises] of targeted) {
    const s = stats[muscleId];
    const hours = s?.hoursSinceLastTrained;
    if (hours == null) continue;
    if (hours >= RECOVERY_HOURS.caution) continue;

    warnings.push({
      kind: 'recovery',
      muscleId,
      sizeClass: s.sizeClass,
      hoursSinceLastTrained: hours,
      lastTrainedDate: s.lastTrainedDate,
      level: hours < RECOVERY_HOURS.rest ? 'rest' : 'caution',
      viaExercises,
      key: `recovery:${muscleId}:${today}`,
    });
  }

  return warnings.sort((a, b) => a.hoursSinceLastTrained - b.hoursSinceLastTrained);
}

/**
 * Areas-of-concern warnings. Fires for any exercise that loads a flagged body
 * part, strength or not, independently of the recency warning above.
 */
export function concernWarnings(state, exerciseIds, { now = Date.now() } = {}) {
  const concerns = state.profile?.areasOfConcern ?? [];
  if (concerns.length === 0) return [];

  const today = toISODate(now);
  const lastLoaded = lastLoadedByBodyPart(state);
  const out = [];

  for (const concern of concerns) {
    const matching = (exerciseIds ?? []).filter((id) =>
      (EXERCISE_BY_ID[id]?.bodyParts ?? []).includes(concern.bodyPart)
    );
    if (matching.length === 0) continue;

    const lastTs = lastLoaded[concern.bodyPart] ?? null;
    const hours = lastTs == null ? null : (now - lastTs) / 3600000;

    out.push({
      kind: 'concern',
      concernId: concern.id,
      bodyPart: concern.bodyPart,
      note: concern.note ?? '',
      hoursSinceLastLoaded: hours,
      withinCooldown: hours != null && hours < CONCERN_COOLDOWN_HOURS,
      cooldownHours: CONCERN_COOLDOWN_HOURS,
      viaExercises: matching,
      key: `concern:${concern.id}:${today}`,
    });
  }

  return out;
}

function lastLoadedByBodyPart(state) {
  const last = {};
  for (const session of state.sessions ?? []) {
    const ts = session.createdAt ?? new Date(`${session.date}T18:00:00`).getTime();
    for (const entry of session.entries ?? []) {
      for (const part of EXERCISE_BY_ID[entry.exerciseId]?.bodyParts ?? []) {
        if (!last[part] || ts > last[part]) last[part] = ts;
      }
    }
  }
  return last;
}

/** Both warning kinds for a planned session, minus anything dismissed today. */
export function activeWarnings(state, exerciseIds, { now = Date.now(), isStrength = true } = {}) {
  const dismissed = state.dismissed ?? {};
  return [
    ...recoveryWarnings(state, exerciseIds, { now, isStrength }),
    ...concernWarnings(state, exerciseIds, { now }),
  ].filter((w) => !dismissed[w.key]);
}
