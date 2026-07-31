/**
 * LAYER 1 — deterministic signal extraction (spec Phase 4).
 *
 * Pure functions over logged sessions. No AI, no thresholds baked in, no fixed
 * session-count trigger: this module reports *what happened*, never what to do
 * about it. Deciding whether 3 sessions of clean completions warrants more
 * weight is Layer 2's job.
 *
 * The output of `buildSignals` is exactly what gets posted to the backend
 * proxy — raw logs never leave the device.
 */

import { EXERCISE_BY_ID, isStrengthExercise, muscleLoad } from '../data/exercises.js';
import { MUSCLE_GROUPS, MUSCLE_BY_ID } from '../data/muscles.js';
import { isWorkingSet } from './storage.js';
import { MS_DAY, MS_HOUR, daysBetweenDates, fromISODate, toISODate, weekStart } from './date.js';
import { powerScore } from './powerScore.js';

const round = (n, places = 2) => {
  if (n == null || !Number.isFinite(n)) return null;
  const f = 10 ** places;
  return Math.round(n * f) / f;
};

const sum = (arr) => arr.reduce((a, b) => a + b, 0);

/**
 * When a session was actually performed. Backdated entries fall back to
 * 18:00 local on the logged date so recovery timers stay sane.
 */
export function sessionTimestamp(session) {
  const created = session.createdAt;
  if (created && toISODate(created) === session.date) return created;
  return fromISODate(session.date).getTime() + 18 * MS_HOUR;
}

// ------------------------------------------------------------------ entries

/** Aggregate one logged exercise entry. Warm-up sets are excluded throughout. */
export function summarizeEntry(entry) {
  const working = (entry.sets ?? []).filter(isWorkingSet);
  const withReps = working.filter((s) => Number(s.reps) > 0);
  const targeted = working.filter((s) => Number(s.targetReps) > 0);

  const volumeLoad = sum(withReps.map((s) => (Number(s.weight) || 0) * Number(s.reps)));
  const totalReps = sum(withReps.map((s) => Number(s.reps)));
  const targetReps = sum(targeted.map((s) => Number(s.targetReps)));
  const completedAgainstTarget = sum(
    targeted.map((s) => Math.min(Number(s.reps) || 0, Number(s.targetReps)))
  );

  const heaviest = withReps.reduce(
    (best, s) => (best == null || (Number(s.weight) || 0) > (Number(best.weight) || 0) ? s : best),
    null
  );

  return {
    exerciseId: entry.exerciseId,
    workingSets: working.length,
    completedSets: withReps.length,
    totalReps,
    targetReps: targetReps || null,
    completionPct: targetReps ? completedAgainstTarget / targetReps : null,
    volumeLoad,
    topSetWeight: heaviest ? Number(heaviest.weight) || 0 : null,
    topSetReps: heaviest ? Number(heaviest.reps) || 0 : null,
    setTypes: working.reduce((acc, s) => ({ ...acc, [s.type]: (acc[s.type] ?? 0) + 1 }), {}),
    hadFailureSet: working.some((s) => s.type === 'failure'),
    hadDropSet: working.some((s) => s.type === 'drop'),
    hadBackoffSet: working.some((s) => s.type === 'backoff'),
  };
}

/** Sessions that count toward muscle recovery and volume (spec Phase 2.5). */
export const strengthSessions = (state) =>
  (state.sessions ?? []).filter((s) => s.isStrength && (s.entries?.length ?? 0) > 0);

// ---------------------------------------------------------------- exercises

/**
 * Per-exercise history, newest first.
 * @returns {Array} one summary per session in which the exercise appeared
 */
export function exerciseHistory(state, exerciseId, { limit = 8, now = Date.now() } = {}) {
  const out = [];
  for (const session of strengthSessions(state)) {
    for (const entry of session.entries) {
      if (entry.exerciseId !== exerciseId) continue;
      const s = summarizeEntry(entry);
      if (s.workingSets === 0) continue;
      const ts = sessionTimestamp(session);
      out.push({
        sessionId: session.id,
        date: session.date,
        daysAgo: round((now - ts) / MS_DAY, 1),
        sessionType: session.sessionType,
        ...s,
      });
    }
  }
  out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return out.slice(0, limit);
}

/** Trend descriptors over an exercise's recent history. Raw ratios, no verdicts. */
export function exerciseTrend(history) {
  if (history.length === 0) {
    return { volumeTrendRatio: null, topSetWeightChange: null, repCompletionPct: null };
  }
  const latest = history[0];
  const prior = history.slice(1, 4);
  const priorVolume = prior.length ? sum(prior.map((h) => h.volumeLoad)) / prior.length : 0;

  const targeted = history.filter((h) => h.targetReps);
  const repCompletionPct = targeted.length
    ? sum(targeted.map((h) => h.completionPct * h.targetReps)) / sum(targeted.map((h) => h.targetReps))
    : null;

  const oldestWeight = history[history.length - 1].topSetWeight;

  return {
    volumeTrendRatio:
      priorVolume > 0 ? round(latest.volumeLoad / priorVolume, 3) : latest.volumeLoad > 0 ? 1.5 : null,
    topSetWeightChange:
      latest.topSetWeight != null && oldestWeight != null ? round(latest.topSetWeight - oldestWeight, 2) : null,
    repCompletionPct: round(repCompletionPct, 3),
  };
}

/** Every exercise the user has actually logged, most recently used first. */
export function loggedExerciseIds(state) {
  const seen = new Map();
  for (const session of state.sessions ?? []) {
    for (const entry of session.entries ?? []) {
      const prev = seen.get(entry.exerciseId);
      if (!prev || prev < session.date) seen.set(entry.exerciseId, session.date);
    }
  }
  return [...seen.entries()].sort((a, b) => (a[1] < b[1] ? 1 : -1)).map(([id]) => id);
}

// ------------------------------------------------------------------ muscles

/**
 * Volume events per muscle group, derived from every strength session.
 * Secondary muscles receive a fractional share (see SECONDARY_WEIGHT).
 */
function muscleEvents(state) {
  const byMuscle = Object.fromEntries(MUSCLE_GROUPS.map((m) => [m.id, []]));

  for (const session of strengthSessions(state)) {
    const ts = sessionTimestamp(session);
    for (const entry of session.entries) {
      if (!isStrengthExercise(entry.exerciseId)) continue;
      const s = summarizeEntry(entry);
      if (s.workingSets === 0) continue;
      for (const { muscleId, share } of muscleLoad(entry.exerciseId)) {
        byMuscle[muscleId]?.push({
          ts,
          date: session.date,
          volumeLoad: s.volumeLoad * share,
          repVolume: s.totalReps * share,
          sets: s.workingSets * share,
          targetReps: (s.targetReps ?? 0) * share,
          completedReps: s.targetReps ? s.completionPct * s.targetReps * share : 0,
        });
      }
    }
  }
  return byMuscle;
}

/** Four consecutive trailing 7-day windows, newest first. */
function rollingWindows(events, now, metric) {
  return [0, 1, 2, 3].map((i) => {
    const hi = now - i * 7 * MS_DAY;
    const lo = now - (i + 1) * 7 * MS_DAY;
    return sum(events.filter((e) => e.ts > lo && e.ts <= hi).map((e) => e[metric]));
  });
}

/** Consecutive weeks (counting back from this one) containing at least one session. */
function streakWeeks(events, now) {
  if (events.length === 0) return 0;
  const weeks = new Set(events.map((e) => weekStart(e.date)));
  let streak = 0;
  let cursor = weekStart(toISODate(now));
  // Allow the current week to be empty without breaking the streak — the
  // week is not over yet.
  if (!weeks.has(cursor)) {
    const prev = toISODate(new Date(fromISODate(cursor).getTime() - 7 * MS_DAY));
    if (!weeks.has(prev)) return 0;
    cursor = prev;
  }
  while (weeks.has(cursor)) {
    streak += 1;
    cursor = toISODate(new Date(fromISODate(cursor).getTime() - 7 * MS_DAY));
  }
  return streak;
}

/**
 * Full per-muscle signal set, including the Phase 2 power score and tier.
 * Consumed by both the body map and the AI payload.
 */
export function muscleStats(state, { now = Date.now() } = {}) {
  const events = muscleEvents(state);

  return MUSCLE_GROUPS.map((muscle) => {
    const list = events[muscle.id] ?? [];
    const last = list.reduce((a, b) => (a == null || b.ts > a.ts ? b : a), null);
    const hoursSince = last ? (now - last.ts) / MS_HOUR : null;
    const daysSince = hoursSince == null ? null : hoursSince / 24;

    const window28 = list.filter((e) => e.ts > now - 28 * MS_DAY);
    // Pick one metric for the whole window so bodyweight-only work still
    // produces a usable trend instead of dividing by zero.
    const metric = sum(window28.map((e) => e.volumeLoad)) > 0 ? 'volumeLoad' : 'repVolume';
    const windows = rollingWindows(list, now, metric);
    const baseline = (windows[1] + windows[2] + windows[3]) / 3;
    const volumeTrendRatio =
      baseline > 0 ? windows[0] / baseline : windows[0] > 0 ? 1.5 : null;

    const targetTotal = sum(window28.map((e) => e.targetReps));
    const repCompletionPct = targetTotal > 0 ? sum(window28.map((e) => e.completedReps)) / targetTotal : null;

    const countIn = (days) => new Set(list.filter((e) => e.ts > now - days * MS_DAY).map((e) => e.date)).size;

    const score = powerScore({
      daysSinceLastTrained: daysSince,
      sizeClass: muscle.sizeClass,
      volumeTrendRatio,
      repCompletionPct,
    });

    return {
      muscleId: muscle.id,
      sizeClass: muscle.sizeClass,
      region: muscle.region,
      lastTrainedDate: last?.date ?? null,
      hoursSinceLastTrained: round(hoursSince, 1),
      daysSinceLastTrained: round(daysSince, 2),
      sessionsLast7: countIn(7),
      sessionsLast14: countIn(14),
      sessionsLast28: countIn(28),
      streakWeeks: streakWeeks(list, now),
      volumeMetric: metric,
      rollingVolume7d: windows.map((w) => round(w, 1)),
      volumeTrendRatio: round(volumeTrendRatio, 3),
      repCompletionPct: round(repCompletionPct, 3),
      powerScore: round(score.score, 1),
      tier: score.tier,
      tierProgress: round(score.tierProgress, 3),
      components: {
        recency: round(score.components.recency, 1),
        trend: round(score.components.trend, 1),
        consistency: round(score.components.consistency, 1),
      },
    };
  });
}

// ----------------------------------------------------------------- activity

/**
 * General activity streak — counts every session type, including cardio,
 * hike and swim, which never touch muscle recovery (spec Phase 2.5).
 */
export function activityStreak(state, { now = Date.now() } = {}) {
  const dates = [...new Set((state.sessions ?? []).map((s) => s.date))].sort();
  if (dates.length === 0) return { currentDays: 0, longestDays: 0, lastActivityDate: null, totalSessions: 0 };

  const set = new Set(dates);
  const today = toISODate(now);
  let cursor = set.has(today) ? today : toISODate(now - MS_DAY);
  let current = 0;
  while (set.has(cursor)) {
    current += 1;
    cursor = toISODate(fromISODate(cursor).getTime() - MS_DAY);
  }

  let longest = 1;
  let run = 1;
  for (let i = 1; i < dates.length; i++) {
    run = daysBetweenDates(dates[i - 1], dates[i]) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  return {
    currentDays: current,
    longestDays: longest,
    lastActivityDate: dates[dates.length - 1],
    totalSessions: (state.sessions ?? []).length,
  };
}

// ------------------------------------------------------------------ concerns

/**
 * Which areas of concern are implicated by a set of exercises, plus when that
 * body part was last loaded. Generalized — nothing is hardcoded to a specific
 * joint; it matches on whatever the user saved.
 */
export function implicatedConcerns(state, exerciseIds, { now = Date.now() } = {}) {
  const concerns = state.profile?.areasOfConcern ?? [];
  if (concerns.length === 0) return [];

  const lastLoaded = {};
  for (const session of strengthSessions(state)) {
    const ts = sessionTimestamp(session);
    for (const entry of session.entries) {
      for (const part of EXERCISE_BY_ID[entry.exerciseId]?.bodyParts ?? []) {
        if (!lastLoaded[part] || ts > lastLoaded[part]) lastLoaded[part] = ts;
      }
    }
  }

  return concerns.map((c) => {
    const matching = (exerciseIds ?? []).filter((id) =>
      (EXERCISE_BY_ID[id]?.bodyParts ?? []).includes(c.bodyPart)
    );
    return {
      bodyPart: c.bodyPart,
      note: c.note || null,
      addedDaysAgo: round((now - c.createdAt) / MS_DAY, 1),
      implicatedByExerciseIds: matching,
      hoursSinceLastLoaded: lastLoaded[c.bodyPart] ? round((now - lastLoaded[c.bodyPart]) / MS_HOUR, 1) : null,
    };
  });
}

// -------------------------------------------------------------- the bundle

/**
 * Assemble the complete Layer 1 payload.
 *
 * @param {object} state
 * @param {object} [opts]
 * @param {number} [opts.now]
 * @param {string[]} [opts.focusExerciseIds] exercises to report history for
 *   (defaults to everything logged, capped)
 * @param {string[]} [opts.plannedExerciseIds] exercises about to be performed,
 *   used for the areas-of-concern check
 * @param {number} [opts.historyDepth] sessions of history per exercise
 */
export function buildSignals(state, opts = {}) {
  const {
    now = Date.now(),
    focusExerciseIds = null,
    plannedExerciseIds = [],
    historyDepth = 6,
    maxExercises = 12,
  } = opts;

  const profile = state.profile ?? {};
  const ids = (focusExerciseIds ?? loggedExerciseIds(state)).filter((id) => EXERCISE_BY_ID[id]).slice(0, maxExercises);

  const perExercise = ids.map((id) => {
    const meta = EXERCISE_BY_ID[id];
    const history = exerciseHistory(state, id, { limit: historyDepth, now });
    const target = state.targets?.[id] ?? null;
    const allSessions = strengthSessions(state).filter((s) =>
      s.entries.some((e) => e.exerciseId === id && e.sets.some(isWorkingSet))
    ).length;

    return {
      exerciseId: id,
      name: meta.name.en,
      category: meta.category,
      movementType: meta.movementType,
      muscleGroups: muscleLoad(id).map((m) => ({
        muscleId: m.muscleId,
        role: m.role,
        sizeClass: m.sizeClass,
      })),
      bodyPartsLoaded: meta.bodyParts,
      equipment: meta.equipment,
      totalLoggedSessions: allSessions,
      history: history.map((h) => ({
        date: h.date,
        daysAgo: h.daysAgo,
        workingSets: h.workingSets,
        topSetWeight: h.topSetWeight,
        topSetReps: h.topSetReps,
        totalReps: h.totalReps,
        targetReps: h.targetReps,
        completionPct: round(h.completionPct, 3),
        volumeLoad: round(h.volumeLoad, 1),
        hadFailureSet: h.hadFailureSet,
        hadDropSet: h.hadDropSet,
        hadBackoffSet: h.hadBackoffSet,
      })),
      trend: exerciseTrend(history),
      currentTarget: target ? { weight: target.weight, reps: target.reps, setAt: target.updatedAt } : null,
    };
  });

  const muscles = muscleStats(state, { now });
  const planned = plannedExerciseIds.length ? plannedExerciseIds : ids;

  return {
    schema: 'fitness-app1/layer1@1',
    generatedAt: new Date(now).toISOString(),
    units: profile.units ?? 'kg',
    profile: {
      goal: profile.goal ?? null,
      daysPerWeek: profile.daysPerWeek ?? null,
      equipment: profile.equipment ?? [],
      pplOrder: profile.pplOrder ?? ['push', 'pull', 'legs'],
      language: profile.language ?? 'en',
    },
    activityStreak: activityStreak(state, { now }),
    perExercise,
    perMuscle: muscles.map((m) => ({
      muscleId: m.muscleId,
      sizeClass: m.sizeClass,
      daysSinceLastTrained: m.daysSinceLastTrained,
      sessionsLast7: m.sessionsLast7,
      sessionsLast14: m.sessionsLast14,
      sessionsLast28: m.sessionsLast28,
      streakWeeks: m.streakWeeks,
      volumeMetric: m.volumeMetric,
      rollingVolume7d: m.rollingVolume7d,
      volumeTrendRatio: m.volumeTrendRatio,
      repCompletionPct: m.repCompletionPct,
      powerScore: m.powerScore,
      tier: m.tier,
    })),
    areasOfConcern: implicatedConcerns(state, planned, { now }),
    plannedExerciseIds: planned,
  };
}

export { MUSCLE_BY_ID };
