import test from 'node:test';
import assert from 'node:assert/strict';
import {
  activityStreak,
  buildSignals,
  exerciseHistory,
  implicatedConcerns,
  muscleStats,
  summarizeEntry,
} from '../src/lib/signals.js';
import { newEntry, newSet } from '../src/lib/storage.js';
import { NOW, sessionAt, set, stateWith } from './helpers.js';

const statFor = (state, muscleId, now = NOW) =>
  muscleStats(state, { now }).find((m) => m.muscleId === muscleId);

test('warm-up sets are excluded from volume and completion', () => {
  const entry = newEntry('barbell-bench-press', {
    sets: [
      newSet('warmup', { weight: 40, reps: 10, targetReps: 10 }),
      newSet('normal', { weight: 100, reps: 8, targetReps: 8 }),
      newSet('normal', { weight: 100, reps: 6, targetReps: 8 }),
    ],
  });
  const s = summarizeEntry(entry);

  assert.equal(s.workingSets, 2);
  assert.equal(s.volumeLoad, 100 * 8 + 100 * 6);
  assert.equal(s.totalReps, 14);
  assert.equal(s.targetReps, 16);
  assert.equal(s.completionPct, 14 / 16);
  assert.equal(s.topSetWeight, 100);
});

test('completion is capped per set so overshoot cannot mask a miss', () => {
  const entry = newEntry('barbell-curl', {
    sets: [
      newSet('normal', { weight: 20, reps: 20, targetReps: 10 }),
      newSet('normal', { weight: 20, reps: 2, targetReps: 10 }),
    ],
  });
  assert.equal(summarizeEntry(entry).completionPct, 12 / 20);
});

test('completion is null when no targets were recorded', () => {
  const entry = newEntry('dip', { sets: [newSet('normal', { weight: 0, reps: 12 })] });
  assert.equal(summarizeEntry(entry).completionPct, null);
});

test('set types are counted', () => {
  const entry = newEntry('leg-press', {
    sets: [
      newSet('normal', { weight: 200, reps: 10 }),
      newSet('drop', { weight: 140, reps: 12 }),
      newSet('failure', { weight: 200, reps: 5 }),
    ],
  });
  const s = summarizeEntry(entry);
  assert.equal(s.hadDropSet, true);
  assert.equal(s.hadFailureSet, true);
  assert.equal(s.hadBackoffSet, false);
  assert.deepEqual(s.setTypes, { normal: 1, drop: 1, failure: 1 });
});

test('exercise history is newest first and limited', () => {
  const state = stateWith([
    sessionAt(24, [['barbell-bench-press', [set(100, 5, 5)]]]),
    sessionAt(24 * 8, [['barbell-bench-press', [set(95, 5, 5)]]]),
    sessionAt(24 * 15, [['barbell-bench-press', [set(90, 5, 5)]]]),
  ]);

  const history = exerciseHistory(state, 'barbell-bench-press', { limit: 2, now: NOW });
  assert.equal(history.length, 2);
  assert.equal(history[0].topSetWeight, 100);
  assert.equal(history[1].topSetWeight, 95);
  assert.equal(history[0].daysAgo, 1);
});

test('secondary muscles receive a fractional share of volume', () => {
  // Bench: chest primary, triceps secondary.
  const state = stateWith([sessionAt(2, [['barbell-bench-press', [set(100, 10, 10)]]])]);
  const chest = statFor(state, 'chest');
  const triceps = statFor(state, 'triceps');

  assert.equal(chest.rollingVolume7d[0], 1000);
  assert.equal(triceps.rollingVolume7d[0], 500);
});

test('non-strength sessions never touch muscle recovery timers', () => {
  const state = stateWith([
    sessionAt(2, [['swim', []]], { sessionType: 'swim', isStrength: false }),
    sessionAt(2, [['run', []]], { sessionType: 'cardio', isStrength: false }),
  ]);

  for (const m of muscleStats(state, { now: NOW })) {
    assert.equal(m.hoursSinceLastTrained, null, `${m.muscleId} should be untouched`);
    assert.equal(m.sessionsLast28, 0);
  }
});

test('non-strength sessions still feed the general activity streak', () => {
  const state = stateWith([
    sessionAt(2, [['run', []]], { sessionType: 'cardio', isStrength: false }),
    sessionAt(26, [['hike', []]], { sessionType: 'hike', isStrength: false }),
  ]);
  assert.equal(activityStreak(state, { now: NOW }).currentDays, 2);
});

test('activity streak counts consecutive days and reports the longest run', () => {
  const state = stateWith([
    sessionAt(2, [['back-squat', [set(100, 5, 5)]]]),
    sessionAt(26, [['back-squat', [set(100, 5, 5)]]]),
    sessionAt(50, [['back-squat', [set(100, 5, 5)]]]),
    sessionAt(24 * 20, [['back-squat', [set(100, 5, 5)]]]),
  ]);
  const streak = activityStreak(state, { now: NOW });
  assert.equal(streak.currentDays, 3);
  assert.equal(streak.longestDays, 3);
  assert.equal(streak.totalSessions, 4);
});

test('volume trend compares the last 7 days against the prior three weeks', () => {
  const state = stateWith([
    sessionAt(24, [['back-squat', [set(100, 10, 10)]]]), // 1000 this week
    sessionAt(24 * 9, [['back-squat', [set(100, 5, 5)]]]), // 500
    sessionAt(24 * 16, [['back-squat', [set(100, 5, 5)]]]), // 500
    sessionAt(24 * 23, [['back-squat', [set(100, 5, 5)]]]), // 500
  ]);
  const quads = statFor(state, 'quads');
  assert.equal(quads.volumeTrendRatio, 2);
  assert.ok(quads.components.trend > 50);
});

test('bodyweight-only work falls back to rep volume instead of dividing by zero', () => {
  const state = stateWith([
    sessionAt(24, [['pull-up', [set(0, 10, 10), set(0, 8, 10)]]]),
    sessionAt(24 * 9, [['pull-up', [set(0, 6, 10)]]]),
  ]);
  const lats = statFor(state, 'lats');
  assert.equal(lats.volumeMetric, 'repVolume');
  assert.ok(lats.volumeTrendRatio > 1, 'more reps this week than last');
});

test('each muscle group is tiered independently — no global averaging', () => {
  const state = stateWith([
    sessionAt(12, [['barbell-bench-press', [set(100, 8, 8), set(100, 8, 8), set(100, 8, 8)]]]),
    sessionAt(24 * 9, [['barbell-bench-press', [set(95, 8, 8)]]]),
    sessionAt(24 * 40, [['back-squat', [set(140, 5, 5)]]]),
  ]);

  const chest = statFor(state, 'chest');
  const quads = statFor(state, 'quads');
  assert.ok(chest.tier >= 4, `chest tier was ${chest.tier}`);
  assert.ok(quads.tier <= 2, `quads tier was ${quads.tier}`);
});

test('implicated concerns match on whatever body part the user saved', () => {
  const state = stateWith([sessionAt(10, [['overhead-press', [set(50, 5, 5)]]])], {
    areasOfConcern: [{ id: 'a1', bodyPart: 'shoulder', note: 'clicks under load', createdAt: NOW - 86400000 }],
  });

  const [concern] = implicatedConcerns(state, ['overhead-press', 'leg-curl'], { now: NOW });
  assert.equal(concern.bodyPart, 'shoulder');
  assert.deepEqual(concern.implicatedByExerciseIds, ['overhead-press']);
  assert.ok(concern.hoursSinceLastLoaded >= 10 && concern.hoursSinceLastLoaded < 11);
});

test('the signal bundle is serialisable and carries the schema tag', () => {
  const state = stateWith([sessionAt(5, [['barbell-bench-press', [set(100, 8, 8)]]])]);
  const signals = buildSignals(state, { now: NOW });

  assert.equal(signals.schema, 'fitness-app1/layer1@1');
  assert.equal(signals.perExercise[0].exerciseId, 'barbell-bench-press');
  assert.equal(signals.perExercise[0].movementType, 'compound');
  assert.equal(signals.perMuscle.length, 13);
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(signals)));
});

test('the payload sent to the backend contains no raw set rows', () => {
  const state = stateWith([sessionAt(5, [['barbell-bench-press', [set(100, 8, 8)]]])]);
  const json = JSON.stringify(buildSignals(state, { now: NOW }));

  assert.ok(!json.includes('"sets"'), 'raw set arrays must not leave the device');
  assert.ok(!json.includes('set_'), 'set ids must not leave the device');
});
