/**
 * Per-muscle power score and tier (spec Phase 2).
 *
 * The score is a composite of three Layer 1 signals — recency, weekly volume
 * trend, and rep-completion consistency — computed continuously for every
 * muscle group. Each group is scored independently: there is no averaging and
 * no single global character, so upper body can sit at tier 5 while legs sit
 * at tier 2.
 *
 * Everything here is deterministic. No AI involved.
 */

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

export const WEIGHTS = { recency: 0.45, trend: 0.3, consistency: 0.25 };

/**
 * Days of no stimulus after which a group's recency component halves.
 * Large groups are trained less frequently than small ones, so they decay
 * more slowly — a week off hurts calves more than it hurts quads.
 */
export const DECAY_DAYS = { large: 6, small: 4.5 };

/** Score floors used when a signal has no data yet (a new user is not "bad"). */
export const NO_DATA = { trend: 40, consistency: 55 };

/**
 * How much accumulated work a group needs before its score counts in full.
 *
 * Without this, one good session pins recency at 100 and consistency at 100 and
 * the group jumps straight to the top tier — which is not what a tier means.
 * A tier is built: roughly eight sessions in the last four weeks, trained
 * across consecutive weeks, is what "fully earned" looks like.
 */
export const MATURITY = { sessions: 8, weeks: 4, floor: 0.34, sessionShare: 0.6 };

/** 0.34 (brand new) → 1 (four consistent weeks of work). */
export function maturityFactor({ sessionsLast28 = 0, streakWeeks = 0 } = {}) {
  const bySessions = clamp((sessionsLast28 ?? 0) / MATURITY.sessions, 0, 1);
  const byWeeks = clamp((streakWeeks ?? 0) / MATURITY.weeks, 0, 1);
  const built = MATURITY.sessionShare * bySessions + (1 - MATURITY.sessionShare) * byWeeks;
  return MATURITY.floor + (1 - MATURITY.floor) * built;
}

/** Upper bound of each tier; tier 5 is everything above the last threshold. */
export const TIER_THRESHOLDS = [20, 40, 60, 80];
export const MAX_TIER = TIER_THRESHOLDS.length + 1;

/** 100 the day of training, decaying toward 0 as the muscle goes untrained. */
export function recencyComponent(daysSinceLastTrained, sizeClass = 'large') {
  if (daysSinceLastTrained == null || !Number.isFinite(daysSinceLastTrained)) return 0;
  const halfLife = DECAY_DAYS[sizeClass] ?? DECAY_DAYS.large;
  // A one-day grace period so training yesterday still reads as fully fresh.
  const effective = Math.max(0, daysSinceLastTrained - 1);
  return clamp(100 * Math.exp(-effective / halfLife), 0, 100);
}

/**
 * Trailing-7-day volume against the mean of the three preceding 7-day blocks.
 * Ratio 1.0 (holding steady) maps to 50; +50% maps to 100; -50% maps to 0.
 */
export function trendComponent(volumeTrendRatio) {
  if (volumeTrendRatio == null || !Number.isFinite(volumeTrendRatio)) return NO_DATA.trend;
  return clamp(50 + (volumeTrendRatio - 1) * 100, 0, 100);
}

/** Share of target reps actually completed, as a 0-100 score. */
export function consistencyComponent(repCompletionPct) {
  if (repCompletionPct == null || !Number.isFinite(repCompletionPct)) return NO_DATA.consistency;
  return clamp(repCompletionPct * 100, 0, 100);
}

/**
 * @param {{daysSinceLastTrained: number|null, sizeClass: string,
 *          volumeTrendRatio: number|null, repCompletionPct: number|null,
 *          sessionsLast28: number, streakWeeks: number}} stats
 * @returns {{score: number, tier: number, tierProgress: number, components: object,
 *            maturity: number}}
 */
export function powerScore(stats) {
  const components = {
    recency: recencyComponent(stats.daysSinceLastTrained, stats.sizeClass),
    trend: trendComponent(stats.volumeTrendRatio),
    consistency: consistencyComponent(stats.repCompletionPct),
  };
  const raw =
    components.recency * WEIGHTS.recency +
    components.trend * WEIGHTS.trend +
    components.consistency * WEIGHTS.consistency;

  const maturity = maturityFactor(stats);
  const score = clamp(raw * maturity, 0, 100);

  return { score, tier: tierFor(score), tierProgress: tierProgress(score), components, maturity };
}

export function tierFor(score) {
  let tier = 1;
  for (const t of TIER_THRESHOLDS) if (score >= t) tier += 1;
  return Math.min(tier, MAX_TIER);
}

/** 0..1 position inside the current tier — drives the ring fill in the UI. */
export function tierProgress(score) {
  const tier = tierFor(score);
  const lo = tier === 1 ? 0 : TIER_THRESHOLDS[tier - 2];
  const hi = tier === MAX_TIER ? 100 : TIER_THRESHOLDS[tier - 1];
  if (hi === lo) return 1;
  return clamp((score - lo) / (hi - lo), 0, 1);
}

export const TIER_LABELS = {
  1: { en: 'Dormant', es: 'Dormido' },
  2: { en: 'Waking', es: 'Despertando' },
  3: { en: 'Building', es: 'Construyendo' },
  4: { en: 'Forged', es: 'Forjado' },
  5: { en: 'Peak', es: 'Cima' },
};

export const tierLabel = (tier, lang) => TIER_LABELS[tier]?.[lang] ?? String(tier);
