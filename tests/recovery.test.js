import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONCERN_COOLDOWN_HOURS,
  activeWarnings,
  concernWarnings,
  recoveryWarnings,
} from '../src/lib/recovery.js';
import { NOW, sessionAt, set, stateWith } from './helpers.js';

const concern = (bodyPart, note = '') => ({
  id: `aoc_${bodyPart}`,
  bodyPart,
  note,
  createdAt: NOW - 30 * 86400000,
});

test('under 24h since training a muscle raises a rest warning', () => {
  const state = stateWith([sessionAt(10, [['barbell-bench-press', [set(100, 8, 8)]]])]);
  const [w] = recoveryWarnings(state, ['barbell-bench-press'], { now: NOW });

  assert.equal(w.kind, 'recovery');
  assert.equal(w.muscleId, 'chest');
  assert.equal(w.level, 'rest');
});

test('between 24h and 36h it softens to a caution', () => {
  const state = stateWith([sessionAt(30, [['barbell-bench-press', [set(100, 8, 8)]]])]);
  const [w] = recoveryWarnings(state, ['barbell-bench-press'], { now: NOW });
  assert.equal(w.level, 'caution');
});

test('past 36h there is no recovery warning at all', () => {
  const state = stateWith([sessionAt(40, [['barbell-bench-press', [set(100, 8, 8)]]])]);
  assert.deepEqual(recoveryWarnings(state, ['barbell-bench-press'], { now: NOW }), []);
});

test('only the planned exercise\'s primary movers are checked for rest', () => {
  // Pushdowns train triceps as a primary mover; bench only loads them
  // secondarily, so planning bench must not raise a triceps warning.
  const state = stateWith([sessionAt(10, [['triceps-pushdown', [set(30, 12, 12)]]])]);
  const muscles = recoveryWarnings(state, ['barbell-bench-press'], { now: NOW }).map((w) => w.muscleId);

  assert.ok(!muscles.includes('triceps'), 'triceps are secondary on bench');
  assert.deepEqual(muscles, [], 'chest has never been trained');
});

test('secondary work still counts toward a muscle\'s own recency', () => {
  // Bench works triceps secondarily; pushdowns then hit them as a primary
  // mover, so the recent bench session is fatigue that should surface.
  const state = stateWith([sessionAt(10, [['barbell-bench-press', [set(100, 8, 8)]]])]);
  const [w] = recoveryWarnings(state, ['triceps-pushdown'], { now: NOW });

  assert.equal(w.muscleId, 'triceps');
  assert.equal(w.level, 'rest');
});

test('non-strength sessions produce no muscle recovery warnings', () => {
  const state = stateWith([sessionAt(10, [['barbell-bench-press', [set(100, 8, 8)]]])]);
  const warnings = recoveryWarnings(state, ['barbell-bench-press'], { now: NOW, isStrength: false });
  assert.deepEqual(warnings, []);
});

test('a flagged body part warns whenever an exercise loads it', () => {
  const state = stateWith([sessionAt(10, [['overhead-press', [set(50, 5, 5)]]])], {
    areasOfConcern: [concern('shoulder', 'clicks under load')],
  });

  const [w] = concernWarnings(state, ['lateral-raise'], { now: NOW });
  assert.equal(w.kind, 'concern');
  assert.equal(w.bodyPart, 'shoulder');
  assert.equal(w.note, 'clicks under load');
  assert.equal(w.cooldownHours, CONCERN_COOLDOWN_HOURS);
  assert.equal(w.withinCooldown, true, '10h ago is inside the 48h flagged-area cooldown');
});

test('the flagged-area cooldown is longer than the general one', () => {
  const state = stateWith([sessionAt(40, [['overhead-press', [set(50, 5, 5)]]])], {
    areasOfConcern: [concern('shoulder')],
  });

  // 40h: past the 36h general window, still inside the 48h flagged window.
  assert.deepEqual(recoveryWarnings(state, ['lateral-raise'], { now: NOW }), []);
  assert.equal(concernWarnings(state, ['lateral-raise'], { now: NOW })[0].withinCooldown, true);
});

test('concern warnings fire for non-strength work too', () => {
  const state = stateWith([], { areasOfConcern: [concern('shoulder')] });
  const warnings = concernWarnings(state, ['swim'], { now: NOW });
  assert.equal(warnings.length, 1, 'swimming loads the shoulder');
});

test('the two systems are independent — both can fire at once', () => {
  const state = stateWith([sessionAt(10, [['overhead-press', [set(50, 5, 5)]]])], {
    areasOfConcern: [concern('shoulder')],
  });

  const warnings = activeWarnings(state, ['overhead-press'], { now: NOW });
  assert.ok(warnings.some((w) => w.kind === 'recovery'));
  assert.ok(warnings.some((w) => w.kind === 'concern'));
});

test('nothing is flagged when the profile has no areas of concern', () => {
  const state = stateWith([sessionAt(10, [['overhead-press', [set(50, 5, 5)]]])]);
  assert.deepEqual(concernWarnings(state, ['overhead-press'], { now: NOW }), []);
});

test('dismissed warnings drop out of the active list', () => {
  const base = stateWith([sessionAt(10, [['barbell-bench-press', [set(100, 8, 8)]]])]);
  const [w] = activeWarnings(base, ['barbell-bench-press'], { now: NOW });

  const dismissed = { ...base, dismissed: { [w.key]: new Date(NOW).toISOString() } };
  const remaining = activeWarnings(dismissed, ['barbell-bench-press'], { now: NOW });
  assert.ok(!remaining.some((x) => x.key === w.key));
});
