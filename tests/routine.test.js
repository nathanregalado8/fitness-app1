import test from 'node:test';
import assert from 'node:assert/strict';
import { PRESCRIPTION, buildRoutine } from '../src/lib/routineBuilder.js';
import { EXERCISE_BY_ID, alternativesFor } from '../src/data/exercises.js';
import { NOW, sessionAt, set, stateWith } from './helpers.js';

const SPLITS = ['push', 'pull', 'legs', 'full_body'];
const signature = (id) => [...EXERCISE_BY_ID[id].primary].sort().join('+');

const routine = (state, type) => buildRoutine(state, type, { now: NOW });

test('every strength split produces a usable routine', () => {
  const state = stateWith([]);
  for (const split of SPLITS) {
    const r = routine(state, split);
    assert.ok(r.blocks.length >= 4, `${split} produced ${r.blocks.length} exercises`);
    for (const b of r.blocks) {
      assert.ok(EXERCISE_BY_ID[b.exerciseId], `unknown exercise ${b.exerciseId}`);
      assert.ok(b.sets >= 1 && b.targetReps >= 1);
    }
  }
});

test('sets and reps follow the profile goal, not the split', () => {
  for (const goal of ['strength', 'hypertrophy', 'endurance', 'general']) {
    const r = routine(stateWith([], { goal }), 'push');
    const main = r.blocks.find((b) => b.slot === 'main');
    assert.equal(main.sets, PRESCRIPTION[goal].main.sets, `${goal} main sets`);
    assert.equal(main.targetReps, PRESCRIPTION[goal].main.reps, `${goal} main reps`);
  }
});

test('strength prescribes heavier low-rep work than endurance', () => {
  const strength = routine(stateWith([], { goal: 'strength' }), 'legs').blocks[0];
  const endurance = routine(stateWith([], { goal: 'endurance' }), 'legs').blocks[0];
  assert.ok(strength.targetReps < endurance.targetReps);
});

test('a routine never stacks near-duplicate lifts', () => {
  // Four squat variants in a row is the failure this guards against: two
  // exercises with the same primary muscles train the same thing.
  const state = stateWith([]);
  for (const split of SPLITS) {
    const counts = {};
    for (const b of routine(state, split).blocks) {
      const sig = signature(b.exerciseId);
      counts[sig] = (counts[sig] ?? 0) + 1;
      assert.ok(counts[sig] <= 2, `${split} repeated ${sig} ${counts[sig]} times`);
    }
  }
});

test('the hinge slot is led by a hinge, not by a squat that mentions glutes', () => {
  const r = routine(stateWith([]), 'legs');
  const leaders = r.blocks.map((b) => EXERCISE_BY_ID[b.exerciseId].primary[0]);
  assert.ok(
    leaders.some((m) => m === 'hamstrings' || m === 'glutes'),
    `legs day had no posterior-chain lead: ${leaders.join(', ')}`
  );
});

test('a legs day covers quads, the posterior chain and calves', () => {
  const r = routine(stateWith([]), 'legs');
  const led = new Set(r.blocks.map((b) => EXERCISE_BY_ID[b.exerciseId].primary[0]));
  assert.ok(led.has('quads'));
  assert.ok(led.has('hamstrings') || led.has('glutes'));
  assert.ok(led.has('calves'));
});

test('a push day never programs a pull lift, and vice versa', () => {
  const pushMuscles = new Set(['chest', 'shoulders', 'triceps']);
  for (const b of routine(stateWith([]), 'push').blocks) {
    assert.ok(pushMuscles.has(EXERCISE_BY_ID[b.exerciseId].primary[0]), b.exerciseId);
  }
  const pullMuscles = new Set(['lats', 'upper_back', 'biceps', 'forearms', 'shoulders']);
  for (const b of routine(stateWith([]), 'pull').blocks) {
    assert.ok(pullMuscles.has(EXERCISE_BY_ID[b.exerciseId].primary[0]), b.exerciseId);
  }
});

test('muscles still inside the rest window are skipped, not re-loaded', () => {
  const state = stateWith([sessionAt(6, [['barbell-bench-press', [set(100, 8, 8)]]])]);
  const r = routine(state, 'push');

  assert.ok(r.skipped.some((s) => s.muscles.includes('chest')), 'chest slot should be skipped');
  assert.ok(
    !r.blocks.some((b) => EXERCISE_BY_ID[b.exerciseId].primary[0] === 'chest'),
    'no chest lift should be programmed 6h after benching'
  );
  assert.ok(r.blocks.length > 0, 'the rest of the day still gets programmed');
});

test('only equipment the user owns is programmed', () => {
  const state = stateWith([], { equipment: ['bodyweight', 'bar'] });
  for (const split of SPLITS) {
    for (const b of routine(state, split).blocks) {
      const e = EXERCISE_BY_ID[b.exerciseId];
      assert.ok(
        e.equipment.every((eq) => eq === 'bodyweight' || eq === 'none' || ['bodyweight', 'bar'].includes(eq)),
        `${split}: ${b.exerciseId} needs ${e.equipment.join('+')}`
      );
    }
  }
});

test('a flagged body part surfaces as a caution rather than a silent swap', () => {
  const state = stateWith([], {
    areasOfConcern: [{ id: 'a1', bodyPart: 'knee', note: '', createdAt: NOW - 86400000 }],
  });
  const r = routine(state, 'legs');
  // Knees are unavoidable on a legs day, so the routine still programs them —
  // but it says so.
  const kneeBlocks = r.blocks.filter((b) => EXERCISE_BY_ID[b.exerciseId].bodyParts.includes('knee'));
  if (kneeBlocks.length > 0) {
    assert.ok(r.cautions.some((c) => c.type === 'concern' && c.bodyPart === 'knee'));
  }
});

test('non-strength types get a duration target instead of sets', () => {
  for (const type of ['cardio', 'hike', 'swim']) {
    const r = routine(stateWith([]), type);
    assert.equal(r.blocks.length, 0);
    assert.ok(r.activity.minutes > 0);
    assert.ok(EXERCISE_BY_ID[r.activity.exerciseId]);
  }
});

test('training more days a week yields shorter sessions', () => {
  const rare = routine(stateWith([], { daysPerWeek: 2 }), 'push');
  const often = routine(stateWith([], { daysPerWeek: 6 }), 'push');
  assert.ok(often.blocks.length < rare.blocks.length);
});

test('saved targets carry into the generated routine', () => {
  const base = stateWith([]);
  const state = { ...base, targets: { 'barbell-bench-press': { weight: 97.5, reps: 6, updatedAt: NOW } } };
  const block = routine(state, 'push').blocks.find((b) => b.exerciseId === 'barbell-bench-press');
  assert.ok(block, 'bench should still be the main push lift');
  assert.equal(block.targetWeight, 97.5);
  assert.equal(block.targetReps, 6);
});

// ------------------------------------------------------------- alternatives

test('every catalogued lift has real alternatives to swap to', () => {
  for (const id of ['barbell-bench-press', 'back-squat', 'lat-pulldown', 'barbell-curl', 'standing-calf-raise']) {
    assert.ok(alternativesFor(id).length >= 4, `${id} had too few alternatives`);
  }
});

test('alternatives share the muscles they replace', () => {
  const base = new Set(EXERCISE_BY_ID['back-squat'].primary);
  for (const alt of alternativesFor('back-squat').slice(0, 10)) {
    assert.ok(EXERCISE_BY_ID[alt.exerciseId].primary.some((m) => base.has(m)), alt.exerciseId);
  }
});

test('alternatives exclude the current exercise and anything already programmed', () => {
  const alts = alternativesFor('barbell-bench-press', { exclude: ['incline-barbell-press'] });
  const ids = alts.map((a) => a.exerciseId);
  assert.ok(!ids.includes('barbell-bench-press'));
  assert.ok(!ids.includes('incline-barbell-press'));
});

test('unavailable or flagged alternatives are annotated, never hidden', () => {
  const alts = alternativesFor('barbell-bench-press', {
    equipment: ['bodyweight'],
    areasOfConcern: [{ bodyPart: 'shoulder' }],
  });
  assert.ok(alts.length > 0);
  assert.ok(alts.some((a) => !a.hasEquipment), 'equipment-gated options should still be listed');
  assert.ok(alts.some((a) => a.concerns.includes('shoulder')), 'flagged options should still be listed');
  // Best-ranked option should be one the user can actually do.
  assert.equal(alts[0].hasEquipment, true);
});
