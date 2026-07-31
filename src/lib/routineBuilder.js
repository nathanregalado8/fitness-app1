/**
 * Deterministic routine builder.
 *
 * Pick a session type, get a routine that makes sense — every time, offline,
 * with no AI involved. The AI coach can still generate a routine from freeform
 * context (Coach tab), but the everyday path must never depend on it, and must
 * never produce an incoherent session.
 *
 * The structure is fixed by a blueprint per session type (heavy compounds
 * first, then accessories, then isolation), and the sets/reps prescription is
 * chosen by the profile's goal — so the routine is tied to what the user is
 * actually training for. Selection then fills each slot with the best-fitting
 * exercise the user can actually perform.
 *
 * Returns structured reasons and cautions, never prose: the UI renders them in
 * the user's language.
 */

import { EXERCISE_BY_ID, EXERCISES, hasEquipmentFor } from '../data/exercises.js';
import { exerciseHistory, muscleStats, sessionTimestamp, strengthSessions } from './signals.js';
import { RECOVERY_HOURS } from './recovery.js';

/**
 * Hours since each muscle was last a *primary* mover.
 *
 * Deliberately narrower than the recency in `muscleStats`, which also counts
 * secondary work. Bench presses fatigue the triceps and front delts, but that
 * is not a reason to cancel an entire push day — only direct work is.
 */
function hoursSincePrimaryWork(state, now) {
  const last = {};
  for (const session of strengthSessions(state)) {
    const ts = sessionTimestamp(session);
    for (const entry of session.entries) {
      for (const m of EXERCISE_BY_ID[entry.exerciseId]?.primary ?? []) {
        if (!last[m] || ts > last[m]) last[m] = ts;
      }
    }
  }
  return Object.fromEntries(Object.entries(last).map(([m, ts]) => [m, (now - ts) / 3600000]));
}

/**
 * Slot plan per session type. `movement` narrows the candidate pool;
 * 'any' accepts either. Order is the order the user will train in.
 */
export const BLUEPRINTS = {
  push: [
    { slot: 'main', muscles: ['chest'], movement: 'compound' },
    { slot: 'main', muscles: ['shoulders'], movement: 'compound' },
    { slot: 'accessory', muscles: ['chest'], movement: 'any' },
    { slot: 'accessory', muscles: ['shoulders'], movement: 'isolation' },
    { slot: 'finisher', muscles: ['triceps'], movement: 'any' },
    { slot: 'finisher', muscles: ['triceps'], movement: 'isolation' },
  ],
  pull: [
    { slot: 'main', muscles: ['lats'], movement: 'compound' },
    { slot: 'main', muscles: ['upper_back', 'lats'], movement: 'compound' },
    { slot: 'accessory', muscles: ['lats', 'upper_back'], movement: 'any' },
    { slot: 'accessory', muscles: ['upper_back'], movement: 'isolation' },
    { slot: 'finisher', muscles: ['biceps'], movement: 'any' },
    { slot: 'finisher', muscles: ['biceps', 'forearms'], movement: 'isolation' },
  ],
  legs: [
    { slot: 'main', muscles: ['quads'], movement: 'compound' },
    { slot: 'main', muscles: ['hamstrings', 'glutes'], movement: 'compound' },
    { slot: 'accessory', muscles: ['quads'], movement: 'any' },
    { slot: 'accessory', muscles: ['glutes', 'hamstrings'], movement: 'any' },
    { slot: 'finisher', muscles: ['calves'], movement: 'isolation' },
    { slot: 'finisher', muscles: ['abs'], movement: 'any' },
  ],
  full_body: [
    { slot: 'main', muscles: ['quads', 'glutes'], movement: 'compound' },
    { slot: 'main', muscles: ['chest'], movement: 'compound' },
    { slot: 'main', muscles: ['lats', 'upper_back'], movement: 'compound' },
    { slot: 'accessory', muscles: ['hamstrings'], movement: 'any' },
    { slot: 'accessory', muscles: ['shoulders'], movement: 'isolation' },
    { slot: 'finisher', muscles: ['abs'], movement: 'any' },
  ],
  custom: [
    { slot: 'main', muscles: ['chest', 'lats', 'quads'], movement: 'compound' },
    { slot: 'main', muscles: ['shoulders', 'hamstrings', 'upper_back'], movement: 'compound' },
    { slot: 'accessory', muscles: ['biceps', 'triceps'], movement: 'any' },
    { slot: 'finisher', muscles: ['abs'], movement: 'any' },
  ],
};

/**
 * Sets and reps by goal. This is what ties a routine to the user's purpose:
 * the same exercise list is prescribed very differently for strength than for
 * hypertrophy or endurance.
 */
export const PRESCRIPTION = {
  strength: {
    main: { sets: 5, reps: 5 },
    accessory: { sets: 3, reps: 8 },
    finisher: { sets: 3, reps: 10 },
  },
  hypertrophy: {
    main: { sets: 4, reps: 8 },
    accessory: { sets: 3, reps: 12 },
    finisher: { sets: 3, reps: 15 },
  },
  endurance: {
    main: { sets: 3, reps: 15 },
    accessory: { sets: 3, reps: 18 },
    finisher: { sets: 2, reps: 20 },
  },
  general: {
    main: { sets: 3, reps: 10 },
    accessory: { sets: 3, reps: 12 },
    finisher: { sets: 2, reps: 15 },
  },
};

/** Non-strength types get a duration target instead of a set/rep scheme. */
export const ACTIVITY_PLAN = {
  cardio: { exerciseId: 'run', minutes: { strength: 20, hypertrophy: 25, endurance: 45, general: 30 } },
  hike: { exerciseId: 'hike', minutes: { strength: 45, hypertrophy: 60, endurance: 90, general: 60 } },
  swim: { exerciseId: 'swim', minutes: { strength: 20, hypertrophy: 30, endurance: 45, general: 30 } },
};

const prescriptionFor = (goal) => PRESCRIPTION[goal] ?? PRESCRIPTION.general;

/** Two exercises with the same primary muscles train the same thing. */
const signatureOf = (e) => [...e.primary].sort().join('+');

/** How many slots to fill, scaled by training frequency. */
function slotBudget(daysPerWeek) {
  if (daysPerWeek <= 2) return 6; // few sessions → each one covers more
  if (daysPerWeek >= 6) return 4; // training often → keep sessions short
  return 5;
}

/**
 * Rank the candidates for one blueprint slot.
 *
 * Main slots favour a lift the user already knows (so load carries over and
 * progression is meaningful); accessory and finisher slots favour variety, so
 * the routine doesn't hand back the same four exercises forever.
 */
function pickForSlot(spec, ctx) {
  const { used, usedSignatures, equipment, flagged, recentByExercise, muscleByid, goal } = ctx;

  const eligible = (e) => {
    if (used.has(e.id)) return false;
    if (e.category === 'cardio') return false;
    if (spec.movement !== 'any' && e.movementType !== spec.movement) return false;
    // Hard filter, not a scoring penalty: never prescribe work the user
    // physically cannot do. An empty slot is more honest than a fake one.
    if (!hasEquipmentFor(e, equipment)) return false;
    return true;
  };

  // A slot must be filled by an exercise the slot's muscles actually *lead* —
  // `primary[0]` is the dominant mover. Without this, quad-dominant lifts that
  // merely list glutes as a secondary primary (back squat, box squat, belt
  // squat) hijack the hamstring/glute slot and the day becomes four squats.
  let candidates = EXERCISES.filter((e) => eligible(e) && spec.muscles.includes(e.primary[0]));

  // Fall back to any primary overlap only if nothing leads with those muscles.
  if (candidates.length === 0) {
    candidates = EXERCISES.filter((e) => eligible(e) && e.primary.some((m) => spec.muscles.includes(m)));
  }

  if (candidates.length === 0) return null;

  const scored = candidates.map((e) => {
    const daysSinceUsed = recentByExercise.get(e.id) ?? null;
    const concerns = e.bodyParts.filter((p) => flagged.has(p));
    const owned = hasEquipmentFor(e, equipment);

    let score = 0;
    if (owned) score += 60;
    // Familiarity vs variety, depending on the slot's job.
    if (daysSinceUsed != null) {
      score += spec.slot === 'main' ? 30 : Math.min(daysSinceUsed * 1.5, 25);
    } else {
      score += spec.slot === 'main' ? 5 : 18;
    }
    // Don't hand back something trained in the last couple of days.
    if (daysSinceUsed != null && daysSinceUsed < 2) score -= 35;
    score -= concerns.length * 25;
    // Movement variety: two lifts hitting the exact same primary muscles are
    // near-duplicates of each other, however different their names look.
    if (usedSignatures.has(signatureOf(e))) score -= 45;
    // Accessories complement the main lift instead of repeating it: after a
    // heavy barbell compound, a second one adds fatigue more than stimulus.
    if (spec.slot !== 'main' && e.movementType === 'compound' && e.equipment.includes('barbell')) score -= 22;
    // Heavier barbell work leads a strength day; machines lead an endurance day.
    if (spec.slot === 'main' && goal === 'strength' && e.equipment.includes('barbell')) score += 12;
    if (goal === 'endurance' && e.equipment.includes('machine')) score += 6;
    // Prefer the freshest of the slot's muscles.
    const freshness = Math.max(
      ...e.primary.filter((m) => spec.muscles.includes(m)).map((m) => muscleByid[m]?.daysSinceLastTrained ?? 14)
    );
    score += Math.min(freshness, 10);

    return { exercise: e, score, concerns, hasEquipment: owned };
  });

  scored.sort((a, b) => b.score - a.score || a.exercise.id.localeCompare(b.exercise.id));
  return scored[0];
}

/**
 * Build a complete routine for a session type.
 *
 * @returns {{
 *   sessionType: string,
 *   goal: string,
 *   blocks: Array<{exerciseId, sets, targetReps, targetWeight, slot, reason, concerns}>,
 *   cautions: Array<object>,
 *   skipped: Array<object>,
 *   activity: object|null
 * }}
 */
export function buildRoutine(state, sessionType, { now = Date.now(), ignoreRecovery = false } = {}) {
  const profile = state.profile ?? {};
  const goal = profile.goal ?? 'general';

  // Non-strength days: a duration target, not a set/rep scheme.
  const activityPlan = ACTIVITY_PLAN[sessionType];
  if (activityPlan) {
    return {
      sessionType,
      goal,
      blocks: [],
      cautions: [],
      skipped: [],
      activity: {
        exerciseId: activityPlan.exerciseId,
        minutes: activityPlan.minutes[goal] ?? activityPlan.minutes.general,
      },
    };
  }

  const blueprint = BLUEPRINTS[sessionType] ?? BLUEPRINTS.custom;
  const rx = prescriptionFor(goal);
  const budget = slotBudget(profile.daysPerWeek ?? 4);

  const stats = muscleStats(state, { now });
  const muscleByid = Object.fromEntries(stats.map((m) => [m.muscleId, m]));
  const primaryHours = hoursSincePrimaryWork(state, now);
  const flagged = new Set((profile.areasOfConcern ?? []).map((c) => c.bodyPart));

  // Days since each exercise was last performed, for the familiarity/variety split.
  const recentByExercise = new Map();
  for (const session of state.sessions ?? []) {
    for (const entry of session.entries ?? []) {
      const days = (now - (session.createdAt ?? now)) / 86400000;
      const prev = recentByExercise.get(entry.exerciseId);
      if (prev == null || days < prev) recentByExercise.set(entry.exerciseId, days);
    }
  }

  const used = new Set();
  const usedSignatures = new Set();
  const blocks = [];
  const cautions = [];
  const skipped = [];

  for (const spec of blueprint) {
    if (blocks.length >= budget) break;

    // Respect recovery: if every muscle this slot targets is still inside the
    // rest window, drop the slot rather than pile more volume on it.
    const allTooRecent =
      !ignoreRecovery &&
      spec.muscles.every((m) => {
        const hrs = primaryHours[m];
        return hrs != null && hrs < RECOVERY_HOURS.rest;
      });
    if (allTooRecent) {
      skipped.push({
        reason: 'recovery',
        muscles: spec.muscles,
        hoursSinceLastTrained: primaryHours[spec.muscles[0]] ?? null,
      });
      continue;
    }

    const pick = pickForSlot(spec, {
      used,
      usedSignatures,
      equipment: profile.equipment,
      flagged,
      recentByExercise,
      muscleByid,
      goal,
    });
    if (!pick) {
      skipped.push({ reason: 'equipment', muscles: spec.muscles, hoursSinceLastTrained: null });
      continue;
    }

    used.add(pick.exercise.id);
    usedSignatures.add(signatureOf(pick.exercise));

    const scheme = rx[spec.slot];
    const target = state.targets?.[pick.exercise.id] ?? null;
    const [last] = exerciseHistory(state, pick.exercise.id, { limit: 1, now });

    blocks.push({
      exerciseId: pick.exercise.id,
      sets: scheme.sets,
      targetReps: target?.reps ?? scheme.reps,
      targetWeight: target?.weight ?? last?.topSetWeight ?? null,
      slot: spec.slot,
      reason: recentByExercise.has(pick.exercise.id) ? 'familiar' : 'variety',
      concerns: pick.concerns,
      hasEquipment: pick.hasEquipment,
    });

    for (const part of pick.concerns) {
      cautions.push({ type: 'concern', bodyPart: part, exerciseId: pick.exercise.id });
    }
  }

  // Surface muscles that are inside the softer caution window but still trained.
  for (const block of blocks) {
    for (const m of EXERCISE_BY_ID[block.exerciseId].primary) {
      const hrs = muscleByid[m]?.hoursSinceLastTrained;
      if (hrs != null && hrs < RECOVERY_HOURS.caution && !cautions.some((c) => c.muscleId === m)) {
        cautions.push({ type: 'recovery', muscleId: m, hoursSinceLastTrained: hrs });
      }
    }
  }

  // Never hand back an empty session: if recovery vetoed every slot, rebuild
  // ignoring it and let the cautions carry the message instead.
  if (blocks.length === 0 && !ignoreRecovery && skipped.some((s) => s.reason === 'recovery')) {
    const retry = buildRoutine(state, sessionType, { now, ignoreRecovery: true });
    return { ...retry, skipped, overridden: true };
  }

  return { sessionType, goal, blocks, cautions, skipped, activity: null, overridden: false };
}
