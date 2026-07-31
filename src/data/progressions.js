/**
 * Exercise progression / regression map (spec Phase 3).
 *
 * Scoped deliberately to the habitual PPL lifts — this is not a general
 * exercise ontology. Each entry branches by goal:
 *   strength    → heavier / lower-rep variant when progressing
 *   hypertrophy → more volume or a different angle when progressing
 *
 * Candidates are checked against the profile's equipment and areas-of-concern
 * lists at read time (see `progressionOptions`). A candidate that loads a
 * flagged body part is returned *flagged*, never silently removed — the
 * warning system is non-blocking by design.
 */

import { EXERCISE_BY_ID } from './exercises.js';

const P = (strengthUp, strengthDown, hypertrophyUp, hypertrophyDown) => ({
  strength: { progress: strengthUp, regress: strengthDown },
  hypertrophy: { progress: hypertrophyUp, regress: hypertrophyDown },
});

export const PROGRESSION_MAP = {
  // ---- Push
  'push-up': P(
    ['dumbbell-bench-press', 'dip'],
    [],
    ['dip', 'dumbbell-bench-press'],
    []
  ),
  'machine-chest-press': P(
    ['dumbbell-bench-press', 'barbell-bench-press'],
    ['push-up'],
    ['incline-dumbbell-press', 'cable-fly'],
    ['push-up']
  ),
  'dumbbell-bench-press': P(
    ['barbell-bench-press'],
    ['machine-chest-press', 'push-up'],
    ['incline-dumbbell-press', 'dumbbell-fly'],
    ['machine-chest-press']
  ),
  'barbell-bench-press': P(
    ['incline-barbell-press'],
    ['dumbbell-bench-press', 'machine-chest-press'],
    ['incline-dumbbell-press', 'dip', 'cable-fly'],
    ['dumbbell-bench-press']
  ),
  'incline-barbell-press': P(
    ['overhead-press'],
    ['incline-dumbbell-press'],
    ['incline-dumbbell-press', 'cable-fly'],
    ['machine-chest-press']
  ),
  'incline-dumbbell-press': P(
    ['incline-barbell-press'],
    ['machine-chest-press'],
    ['dumbbell-fly', 'dip'],
    ['machine-chest-press']
  ),
  dip: P(
    ['barbell-bench-press'],
    ['push-up', 'machine-chest-press'],
    ['incline-dumbbell-press', 'cable-fly'],
    ['push-up']
  ),
  'overhead-press': P(
    ['incline-barbell-press'],
    ['dumbbell-shoulder-press'],
    ['dumbbell-shoulder-press', 'lateral-raise'],
    ['dumbbell-shoulder-press']
  ),
  'dumbbell-shoulder-press': P(
    ['overhead-press'],
    ['lateral-raise'],
    ['lateral-raise', 'cable-lateral-raise'],
    ['lateral-raise']
  ),
  'lateral-raise': P(
    ['dumbbell-shoulder-press'],
    [],
    ['cable-lateral-raise'],
    []
  ),
  'cable-lateral-raise': P(['dumbbell-shoulder-press'], [], ['lateral-raise'], []),
  'cable-fly': P(['dumbbell-bench-press'], [], ['dumbbell-fly'], []),
  'dumbbell-fly': P(['dumbbell-bench-press'], [], ['cable-fly'], []),
  'triceps-pushdown': P(
    ['skull-crusher', 'dip'],
    [],
    ['overhead-triceps-extension'],
    []
  ),
  'overhead-triceps-extension': P(['skull-crusher'], ['triceps-pushdown'], ['triceps-pushdown'], []),
  'skull-crusher': P(['dip'], ['triceps-pushdown'], ['overhead-triceps-extension'], ['triceps-pushdown']),

  // ---- Pull
  'lat-pulldown': P(
    ['pull-up', 'chin-up'],
    [],
    ['seated-cable-row', 'chest-supported-row'],
    []
  ),
  'pull-up': P(
    ['barbell-row'],
    ['lat-pulldown', 'chin-up'],
    ['chin-up', 'lat-pulldown', 'seated-cable-row'],
    ['lat-pulldown']
  ),
  'chin-up': P(['pull-up'], ['lat-pulldown'], ['lat-pulldown', 'cable-curl'], ['lat-pulldown']),
  'barbell-row': P(
    ['deadlift'],
    ['dumbbell-row', 'chest-supported-row'],
    ['chest-supported-row', 'seated-cable-row', 'dumbbell-row'],
    ['chest-supported-row']
  ),
  'dumbbell-row': P(
    ['barbell-row'],
    ['seated-cable-row'],
    ['chest-supported-row', 'seated-cable-row'],
    ['seated-cable-row']
  ),
  'seated-cable-row': P(
    ['barbell-row'],
    ['chest-supported-row'],
    ['dumbbell-row', 'chest-supported-row'],
    ['chest-supported-row']
  ),
  'chest-supported-row': P(['barbell-row'], ['seated-cable-row'], ['seated-cable-row', 'face-pull'], []),
  deadlift: P(
    [],
    ['romanian-deadlift', 'barbell-row'],
    ['romanian-deadlift', 'hip-thrust'],
    ['romanian-deadlift']
  ),
  'romanian-deadlift': P(
    ['deadlift'],
    ['leg-curl', 'back-extension'],
    ['leg-curl', 'hip-thrust'],
    ['leg-curl']
  ),
  'barbell-curl': P(['chin-up'], ['dumbbell-curl'], ['cable-curl', 'hammer-curl'], ['dumbbell-curl']),
  'dumbbell-curl': P(['barbell-curl'], ['cable-curl'], ['hammer-curl', 'cable-curl'], ['cable-curl']),
  'hammer-curl': P(['barbell-curl'], ['dumbbell-curl'], ['cable-curl'], ['dumbbell-curl']),
  'cable-curl': P(['barbell-curl'], [], ['dumbbell-curl', 'hammer-curl'], []),
  'face-pull': P(['rear-delt-fly'], [], ['rear-delt-fly'], []),
  'rear-delt-fly': P(['face-pull'], [], ['face-pull'], []),

  // ---- Legs
  'goblet-squat': P(
    ['front-squat', 'back-squat'],
    ['leg-press'],
    ['bulgarian-split-squat', 'leg-press'],
    ['leg-press']
  ),
  'leg-press': P(
    ['hack-squat', 'back-squat'],
    [],
    ['hack-squat', 'leg-extension'],
    []
  ),
  'hack-squat': P(['front-squat'], ['leg-press'], ['leg-press', 'leg-extension'], ['leg-press']),
  'back-squat': P(
    ['front-squat'],
    ['goblet-squat', 'leg-press'],
    ['bulgarian-split-squat', 'hack-squat', 'leg-press'],
    ['leg-press']
  ),
  'front-squat': P(
    ['back-squat'],
    ['goblet-squat', 'hack-squat'],
    ['bulgarian-split-squat', 'leg-extension'],
    ['hack-squat']
  ),
  'bulgarian-split-squat': P(
    ['back-squat'],
    ['walking-lunge', 'leg-press'],
    ['walking-lunge', 'leg-extension'],
    ['walking-lunge']
  ),
  'walking-lunge': P(['bulgarian-split-squat'], ['leg-press'], ['bulgarian-split-squat'], ['leg-press']),
  'hip-thrust': P(['romanian-deadlift'], ['back-extension'], ['bulgarian-split-squat', 'leg-curl'], ['back-extension']),
  'leg-curl': P(['romanian-deadlift'], [], ['romanian-deadlift', 'back-extension'], []),
  'leg-extension': P(['hack-squat'], [], ['leg-press', 'bulgarian-split-squat'], []),
  'standing-calf-raise': P(['seated-calf-raise'], [], ['seated-calf-raise'], []),
  'seated-calf-raise': P(['standing-calf-raise'], [], ['standing-calf-raise'], []),
};

/**
 * Progression / regression candidates for an exercise, filtered and annotated
 * against the profile.
 *
 * @param {string} exerciseId
 * @param {'strength'|'hypertrophy'|string} goal  falls back to hypertrophy branch
 * @param {{equipment?: string[], areasOfConcern?: {bodyPart: string}[]}} profile
 * @returns {{progress: Candidate[], regress: Candidate[]}}
 *   Candidate: { exerciseId, hasEquipment, concerns: string[] }
 */
export function progressionOptions(exerciseId, goal, profile = {}) {
  const entry = PROGRESSION_MAP[exerciseId];
  const branch = goal === 'strength' ? 'strength' : 'hypertrophy';
  const empty = { progress: [], regress: [] };
  if (!entry) return empty;

  const owned = new Set(profile.equipment ?? []);
  const flagged = new Set((profile.areasOfConcern ?? []).map((a) => a.bodyPart));

  const annotate = (ids) =>
    ids
      .map((id) => EXERCISE_BY_ID[id] && id)
      .filter(Boolean)
      .map((id) => {
        const e = EXERCISE_BY_ID[id];
        return {
          exerciseId: id,
          // Bodyweight-only movements are always considered available.
          hasEquipment:
            owned.size === 0 ||
            e.equipment.every((eq) => eq === 'bodyweight' || eq === 'none' || owned.has(eq)),
          concerns: e.bodyParts.filter((p) => flagged.has(p)),
        };
      });

  return {
    progress: annotate(entry[branch].progress),
    regress: annotate(entry[branch].regress),
  };
}

/** Every exercise that has a mapping — used to scope the Phase 3 profile view. */
export const MAPPED_EXERCISE_IDS = Object.keys(PROGRESSION_MAP);
