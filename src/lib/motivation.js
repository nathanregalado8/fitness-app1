/**
 * The line under the athlete's name.
 *
 * Every phrase here is earned: each one is selected because a specific signal
 * is true right now, and it names the number behind it. Nothing is picked at
 * random, and nothing congratulates the user for something that did not happen
 * — a training log that flatters you is a log you stop trusting.
 */

import { MS_DAY } from './date.js';
import { MAX_TIER } from './powerScore.js';

const LINES = {
  peak: {
    en: '{n} groups at peak. Hold it.',
    es: '{n} grupos en la cima. Sostenlo.',
  },
  firstPeak: {
    en: '{muscle} hit the top tier.',
    es: '{muscle} llegó al tier máximo.',
  },
  climbing: {
    en: '{n} groups moved up this week.',
    es: '{n} grupos subieron esta semana.',
  },
  streakLong: {
    en: '{n} days straight. Do not break it today.',
    es: '{n} días seguidos. No lo rompas hoy.',
  },
  streakBuilding: {
    en: 'Day {n} of the streak.',
    es: 'Día {n} de la racha.',
  },
  onTarget: {
    en: '{done}/{goal} this week. On plan.',
    es: '{done}/{goal} esta semana. En plan.',
  },
  behind: {
    en: '{left} sessions left this week.',
    es: 'Faltan {left} sesiones esta semana.',
  },
  volumeUp: {
    en: 'Volume up on {n} groups.',
    es: 'Volumen en alza en {n} grupos.',
  },
  comeback: {
    en: '{n} days off. Today is the restart.',
    es: '{n} días fuera. Hoy es el reinicio.',
  },
  coldest: {
    en: '{muscle} has waited {days} days.',
    es: '{muscle} lleva {days} días esperando.',
  },
  start: {
    en: 'Nothing logged yet. Session one starts the map.',
    es: 'Aún sin registrar. La sesión uno enciende el mapa.',
  },
};

/**
 * Which muscle groups changed tier over the last seven days.
 * Recomputed rather than stored — the stats are pure functions of the log.
 */
export function tierMovement(muscleStats, state, now = Date.now()) {
  const before = new Map(muscleStats(state, { now: now - 7 * MS_DAY }).map((m) => [m.muscleId, m.tier]));
  let up = 0;
  let down = 0;
  for (const m of muscleStats(state, { now })) {
    const was = before.get(m.muscleId) ?? 1;
    if (m.tier > was) up += 1;
    else if (m.tier < was) down += 1;
  }
  return { up, down };
}

/**
 * @param {object} ctx  { stats, streak, doneThisWeek, daysPerWeek, tiersUp, muscleName }
 * @returns {{key: string, vars: object} | null}
 */
export function motivationFor(ctx) {
  const { stats = [], streak, doneThisWeek = 0, daysPerWeek = 4, tiersUp = 0, muscleName } = ctx;

  if (!streak || streak.totalSessions === 0) return { key: 'start', vars: {} };

  const peak = stats.filter((m) => m.tier >= MAX_TIER);
  const daysIdle = streak.currentDays === 0 ? Math.floor(ctx.daysSinceLastSession ?? 0) : 0;

  // A lapse outranks everything: naming it is more useful than praise.
  if (daysIdle >= 4) return { key: 'comeback', vars: { n: daysIdle } };

  if (peak.length >= 2) return { key: 'peak', vars: { n: peak.length } };
  if (peak.length === 1) return { key: 'firstPeak', vars: { muscle: muscleName(peak[0].muscleId) } };
  if (tiersUp >= 2) return { key: 'climbing', vars: { n: tiersUp } };
  if (streak.currentDays >= 5) return { key: 'streakLong', vars: { n: streak.currentDays } };

  if (doneThisWeek >= daysPerWeek) return { key: 'onTarget', vars: { done: doneThisWeek, goal: daysPerWeek } };

  const rising = stats.filter((m) => (m.volumeTrendRatio ?? 0) > 1.1).length;
  if (rising >= 3) return { key: 'volumeUp', vars: { n: rising } };

  if (streak.currentDays >= 2) return { key: 'streakBuilding', vars: { n: streak.currentDays } };

  // Nothing is on fire — point at the group that has waited longest instead.
  const trained = stats.filter((m) => m.daysSinceLastTrained != null);
  if (trained.length > 0) {
    const coldest = trained.reduce((a, b) => (b.daysSinceLastTrained > a.daysSinceLastTrained ? b : a));
    if (coldest.daysSinceLastTrained >= 4) {
      return {
        key: 'coldest',
        vars: { muscle: muscleName(coldest.muscleId), days: Math.floor(coldest.daysSinceLastTrained) },
      };
    }
  }

  const left = Math.max(0, daysPerWeek - doneThisWeek);
  if (left > 0) return { key: 'behind', vars: { left } };
  return { key: 'onTarget', vars: { done: doneThisWeek, goal: daysPerWeek } };
}

/** Render the selected line in the user's language. */
export function motivationText(pick, lang) {
  if (!pick) return '';
  const template = LINES[pick.key]?.[lang] ?? LINES[pick.key]?.en ?? '';
  return template.replace(/\{(\w+)\}/g, (_, k) => String(pick.vars[k] ?? ''));
}

/**
 * Training blocks: four weeks each, counted from the first logged session, so
 * "BLOCK 3 · WEEK 2" means something instead of being decoration.
 */
export function blockAndWeek(state, now = Date.now()) {
  const dates = (state.sessions ?? []).map((s) => s.createdAt ?? 0).filter(Boolean);
  if (dates.length === 0) return { block: 1, week: 1, weekOfBlock: 1 };
  const first = Math.min(...dates);
  const week = Math.floor((now - first) / (7 * MS_DAY)) + 1;
  return { block: Math.floor((week - 1) / 4) + 1, week, weekOfBlock: ((week - 1) % 4) + 1 };
}
