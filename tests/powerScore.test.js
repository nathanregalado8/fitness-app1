import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_TIER,
  NO_DATA,
  consistencyComponent,
  powerScore,
  recencyComponent,
  tierFor,
  tierProgress,
  trendComponent,
} from '../src/lib/powerScore.js';

test('recency is full the day of and the day after training', () => {
  assert.equal(recencyComponent(0, 'large'), 100);
  assert.equal(recencyComponent(1, 'large'), 100);
});

test('recency decays monotonically and never goes negative', () => {
  let prev = Infinity;
  for (const d of [1, 2, 4, 7, 14, 30, 90]) {
    const v = recencyComponent(d, 'small');
    assert.ok(v <= prev, `expected decay at day ${d}`);
    assert.ok(v >= 0);
    prev = v;
  }
  assert.ok(recencyComponent(90, 'small') < 1);
});

test('small groups decay faster than large groups', () => {
  assert.ok(recencyComponent(7, 'small') < recencyComponent(7, 'large'));
});

test('an untrained muscle scores zero recency', () => {
  assert.equal(recencyComponent(null, 'large'), 0);
});

test('trend maps holding steady to the midpoint', () => {
  assert.equal(trendComponent(1), 50);
  assert.equal(trendComponent(1.5), 100);
  assert.equal(trendComponent(0.5), 0);
  assert.equal(trendComponent(9), 100, 'clamped at the top');
  assert.equal(trendComponent(null), NO_DATA.trend);
});

test('consistency converts a completion fraction to a score', () => {
  assert.equal(consistencyComponent(1), 100);
  assert.equal(consistencyComponent(0.8), 80);
  assert.equal(consistencyComponent(null), NO_DATA.consistency);
});

test('tier boundaries are inclusive at the lower edge', () => {
  assert.equal(tierFor(0), 1);
  assert.equal(tierFor(19.9), 1);
  assert.equal(tierFor(20), 2);
  assert.equal(tierFor(59.9), 3);
  assert.equal(tierFor(60), 4);
  assert.equal(tierFor(80), MAX_TIER);
  assert.equal(tierFor(100), MAX_TIER);
});

test('tier progress is 0..1 inside the current tier', () => {
  assert.equal(tierProgress(20), 0);
  assert.equal(tierProgress(30), 0.5);
  assert.ok(tierProgress(100) === 1);
});

test('the peak tier takes weeks of accumulated work, not one good session', () => {
  const perfect = { daysSinceLastTrained: 1, sizeClass: 'large', volumeTrendRatio: 1.4, repCompletionPct: 1 };

  // One session, however good, is not a tier-5 muscle.
  const first = powerScore({ ...perfect, sessionsLast28: 1, streakWeeks: 1 });
  assert.ok(first.tier < MAX_TIER, `one session already reached tier ${first.tier}`);
  assert.ok(first.tier >= 2, 'but it is not nothing either');

  // The same session quality, sustained, is.
  const built = powerScore({ ...perfect, sessionsLast28: 10, streakWeeks: 5 });
  assert.equal(built.tier, MAX_TIER);
  assert.ok(built.score > 80);
  assert.ok(built.score > first.score);
});

test('tiers climb as the work accumulates', () => {
  const perfect = { daysSinceLastTrained: 1, sizeClass: 'large', volumeTrendRatio: 1.2, repCompletionPct: 1 };
  let prev = -1;
  for (const [sessionsLast28, streakWeeks] of [[1, 1], [4, 2], [7, 3], [10, 5]]) {
    const { score } = powerScore({ ...perfect, sessionsLast28, streakWeeks });
    assert.ok(score > prev, `score fell at ${sessionsLast28} sessions`);
    prev = score;
  }
});

test('a muscle deflates as it goes untrained', () => {
  const base = { sizeClass: 'small', volumeTrendRatio: 1, repCompletionPct: 0.9 };
  const fresh = powerScore({ ...base, daysSinceLastTrained: 1 });
  const stale = powerScore({ ...base, daysSinceLastTrained: 21 });
  assert.ok(stale.score < fresh.score);
  assert.ok(stale.tier < fresh.tier, 'tier should fall, not just the score');
});

test('a never-trained muscle sits at the bottom tier, with room to climb', () => {
  const { tier, score } = powerScore({
    daysSinceLastTrained: null,
    sizeClass: 'large',
    volumeTrendRatio: null,
    repCompletionPct: null,
  });
  assert.equal(tier, 1);
  assert.ok(score > 0, 'the no-data floors keep it from reading as a failure');
});
