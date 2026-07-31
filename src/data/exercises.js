/**
 * Exercise catalog.
 *
 * Every exercise carries the Layer 1 metadata the AI needs (spec Phase 4):
 *   movementType : 'compound' | 'isolation'
 *   primary      : muscle groups that receive full volume credit
 *   secondary    : muscle groups that receive partial credit (SECONDARY_WEIGHT)
 *   bodyParts    : joints / structures the exercise loads, checked against the
 *                  profile's areas-of-concern list (Phase 2.5 / Phase 3)
 *
 * Muscle size class is not stored here — it is derived from the muscle group
 * (see data/muscles.js) so a group's class is defined in exactly one place.
 */

import { MUSCLE_BY_ID } from './muscles.js';

/** Share of volume load credited to a secondary muscle group. */
export const SECONDARY_WEIGHT = 0.5;

const ex = (id, en, es, category, movementType, primary, secondary, bodyParts, equipment) => ({
  id,
  name: { en, es },
  category,
  movementType,
  primary,
  secondary,
  bodyParts,
  equipment,
});

export const EXERCISES = [
  // ---------------------------------------------------------------- PUSH
  ex('barbell-bench-press', 'Barbell Bench Press', 'Press de Banca con Barra', 'push', 'compound',
    ['chest'], ['triceps', 'shoulders'], ['shoulder', 'elbow', 'wrist', 'chest'], ['barbell', 'bench']),
  ex('dumbbell-bench-press', 'Dumbbell Bench Press', 'Press de Banca con Mancuernas', 'push', 'compound',
    ['chest'], ['triceps', 'shoulders'], ['shoulder', 'elbow', 'wrist', 'chest'], ['dumbbells', 'bench']),
  ex('incline-barbell-press', 'Incline Barbell Press', 'Press Inclinado con Barra', 'push', 'compound',
    ['chest', 'shoulders'], ['triceps'], ['shoulder', 'elbow', 'wrist', 'chest'], ['barbell', 'bench']),
  ex('incline-dumbbell-press', 'Incline Dumbbell Press', 'Press Inclinado con Mancuernas', 'push', 'compound',
    ['chest', 'shoulders'], ['triceps'], ['shoulder', 'elbow', 'wrist', 'chest'], ['dumbbells', 'bench']),
  ex('machine-chest-press', 'Machine Chest Press', 'Press de Pecho en Máquina', 'push', 'compound',
    ['chest'], ['triceps', 'shoulders'], ['shoulder', 'elbow', 'chest'], ['machine']),
  ex('push-up', 'Push-up', 'Flexiones', 'push', 'compound',
    ['chest'], ['triceps', 'shoulders', 'abs'], ['shoulder', 'elbow', 'wrist', 'chest'], ['bodyweight']),
  ex('overhead-press', 'Overhead Press', 'Press Militar', 'push', 'compound',
    ['shoulders'], ['triceps', 'upper_back', 'abs'], ['shoulder', 'elbow', 'wrist', 'lower_back'], ['barbell']),
  ex('dumbbell-shoulder-press', 'Dumbbell Shoulder Press', 'Press de Hombro con Mancuernas', 'push', 'compound',
    ['shoulders'], ['triceps'], ['shoulder', 'elbow', 'wrist'], ['dumbbells']),
  ex('dip', 'Dip', 'Fondos', 'push', 'compound',
    ['chest', 'triceps'], ['shoulders'], ['shoulder', 'elbow', 'wrist', 'chest'], ['bodyweight', 'bars']),
  ex('cable-fly', 'Cable Fly', 'Aperturas en Polea', 'push', 'isolation',
    ['chest'], ['shoulders'], ['shoulder', 'chest'], ['cable']),
  ex('dumbbell-fly', 'Dumbbell Fly', 'Aperturas con Mancuernas', 'push', 'isolation',
    ['chest'], [], ['shoulder', 'chest'], ['dumbbells', 'bench']),
  ex('lateral-raise', 'Lateral Raise', 'Elevaciones Laterales', 'push', 'isolation',
    ['shoulders'], [], ['shoulder'], ['dumbbells']),
  ex('cable-lateral-raise', 'Cable Lateral Raise', 'Elevaciones Laterales en Polea', 'push', 'isolation',
    ['shoulders'], [], ['shoulder'], ['cable']),
  ex('triceps-pushdown', 'Triceps Pushdown', 'Extensión de Tríceps en Polea', 'push', 'isolation',
    ['triceps'], [], ['elbow'], ['cable']),
  ex('overhead-triceps-extension', 'Overhead Triceps Extension', 'Extensión de Tríceps sobre la Cabeza', 'push', 'isolation',
    ['triceps'], [], ['elbow', 'shoulder'], ['dumbbells']),
  ex('skull-crusher', 'Skull Crusher', 'Press Francés', 'push', 'isolation',
    ['triceps'], [], ['elbow', 'wrist'], ['barbell', 'bench']),

  // ---------------------------------------------------------------- PULL
  ex('deadlift', 'Deadlift', 'Peso Muerto', 'pull', 'compound',
    ['lower_back', 'hamstrings', 'glutes'], ['lats', 'upper_back', 'forearms'],
    ['lower_back', 'hip', 'knee', 'wrist'], ['barbell']),
  ex('romanian-deadlift', 'Romanian Deadlift', 'Peso Muerto Rumano', 'pull', 'compound',
    ['hamstrings', 'glutes'], ['lower_back', 'forearms'], ['lower_back', 'hip', 'hamstring'], ['barbell']),
  ex('barbell-row', 'Barbell Row', 'Remo con Barra', 'pull', 'compound',
    ['lats', 'upper_back'], ['biceps', 'lower_back', 'forearms'], ['lower_back', 'elbow', 'shoulder'], ['barbell']),
  ex('dumbbell-row', 'Dumbbell Row', 'Remo con Mancuerna', 'pull', 'compound',
    ['lats', 'upper_back'], ['biceps', 'forearms'], ['elbow', 'shoulder', 'lower_back'], ['dumbbells', 'bench']),
  ex('seated-cable-row', 'Seated Cable Row', 'Remo Sentado en Polea', 'pull', 'compound',
    ['lats', 'upper_back'], ['biceps', 'forearms'], ['elbow', 'shoulder', 'lower_back'], ['cable']),
  ex('chest-supported-row', 'Chest-Supported Row', 'Remo con Pecho Apoyado', 'pull', 'compound',
    ['upper_back', 'lats'], ['biceps'], ['elbow', 'shoulder'], ['machine', 'bench']),
  ex('pull-up', 'Pull-up', 'Dominadas', 'pull', 'compound',
    ['lats'], ['biceps', 'upper_back', 'forearms'], ['shoulder', 'elbow'], ['bodyweight', 'bar']),
  ex('chin-up', 'Chin-up', 'Dominadas Supinas', 'pull', 'compound',
    ['lats', 'biceps'], ['upper_back', 'forearms'], ['shoulder', 'elbow'], ['bodyweight', 'bar']),
  ex('lat-pulldown', 'Lat Pulldown', 'Jalón al Pecho', 'pull', 'compound',
    ['lats'], ['biceps', 'upper_back'], ['shoulder', 'elbow'], ['cable']),
  ex('face-pull', 'Face Pull', 'Face Pull', 'pull', 'isolation',
    ['upper_back', 'shoulders'], [], ['shoulder'], ['cable']),
  ex('rear-delt-fly', 'Rear Delt Fly', 'Aperturas Posteriores', 'pull', 'isolation',
    ['shoulders', 'upper_back'], [], ['shoulder'], ['dumbbells']),
  ex('barbell-curl', 'Barbell Curl', 'Curl con Barra', 'pull', 'isolation',
    ['biceps'], ['forearms'], ['elbow', 'wrist'], ['barbell']),
  ex('dumbbell-curl', 'Dumbbell Curl', 'Curl con Mancuernas', 'pull', 'isolation',
    ['biceps'], ['forearms'], ['elbow', 'wrist'], ['dumbbells']),
  ex('hammer-curl', 'Hammer Curl', 'Curl Martillo', 'pull', 'isolation',
    ['biceps', 'forearms'], [], ['elbow', 'wrist'], ['dumbbells']),
  ex('cable-curl', 'Cable Curl', 'Curl en Polea', 'pull', 'isolation',
    ['biceps'], ['forearms'], ['elbow', 'wrist'], ['cable']),
  ex('shrug', 'Shrug', 'Encogimientos', 'pull', 'isolation',
    ['upper_back'], ['forearms'], ['neck', 'shoulder'], ['dumbbells']),

  // ---------------------------------------------------------------- LEGS
  ex('back-squat', 'Back Squat', 'Sentadilla Trasera', 'legs', 'compound',
    ['quads', 'glutes'], ['hamstrings', 'lower_back', 'abs'], ['knee', 'hip', 'lower_back'], ['barbell', 'rack']),
  ex('front-squat', 'Front Squat', 'Sentadilla Frontal', 'legs', 'compound',
    ['quads'], ['glutes', 'abs', 'upper_back'], ['knee', 'hip', 'wrist', 'lower_back'], ['barbell', 'rack']),
  ex('goblet-squat', 'Goblet Squat', 'Sentadilla Goblet', 'legs', 'compound',
    ['quads', 'glutes'], ['abs'], ['knee', 'hip'], ['dumbbells']),
  ex('leg-press', 'Leg Press', 'Prensa de Piernas', 'legs', 'compound',
    ['quads', 'glutes'], ['hamstrings'], ['knee', 'hip'], ['machine']),
  ex('hack-squat', 'Hack Squat', 'Sentadilla Hack', 'legs', 'compound',
    ['quads'], ['glutes'], ['knee', 'hip'], ['machine']),
  ex('bulgarian-split-squat', 'Bulgarian Split Squat', 'Sentadilla Búlgara', 'legs', 'compound',
    ['quads', 'glutes'], ['hamstrings'], ['knee', 'hip'], ['dumbbells', 'bench']),
  ex('walking-lunge', 'Walking Lunge', 'Zancadas Caminando', 'legs', 'compound',
    ['quads', 'glutes'], ['hamstrings'], ['knee', 'hip'], ['dumbbells']),
  ex('hip-thrust', 'Hip Thrust', 'Empuje de Cadera', 'legs', 'compound',
    ['glutes'], ['hamstrings'], ['hip', 'lower_back'], ['barbell', 'bench']),
  ex('leg-curl', 'Leg Curl', 'Curl Femoral', 'legs', 'isolation',
    ['hamstrings'], [], ['knee', 'hamstring'], ['machine']),
  ex('leg-extension', 'Leg Extension', 'Extensión de Cuádriceps', 'legs', 'isolation',
    ['quads'], [], ['knee'], ['machine']),
  ex('standing-calf-raise', 'Standing Calf Raise', 'Elevación de Talones de Pie', 'legs', 'isolation',
    ['calves'], [], ['ankle', 'achilles'], ['machine']),
  ex('seated-calf-raise', 'Seated Calf Raise', 'Elevación de Talones Sentado', 'legs', 'isolation',
    ['calves'], [], ['ankle', 'achilles'], ['machine']),

  // ---------------------------------------------------------------- CORE
  ex('plank', 'Plank', 'Plancha', 'core', 'isolation',
    ['abs'], ['lower_back'], ['lower_back', 'shoulder'], ['bodyweight']),
  ex('hanging-leg-raise', 'Hanging Leg Raise', 'Elevación de Piernas Colgado', 'core', 'isolation',
    ['abs'], ['forearms'], ['shoulder', 'lower_back'], ['bodyweight', 'bar']),
  ex('cable-crunch', 'Cable Crunch', 'Crunch en Polea', 'core', 'isolation',
    ['abs'], [], ['lower_back'], ['cable']),
  ex('back-extension', 'Back Extension', 'Extensión Lumbar', 'core', 'isolation',
    ['lower_back'], ['glutes', 'hamstrings'], ['lower_back', 'hip'], ['machine']),

  // ------------------------------------------------------- NON-STRENGTH
  // Logged for the general activity streak. These never touch muscle
  // recovery timers or per-muscle volume (spec Phase 2.5).
  ex('run', 'Run', 'Correr', 'cardio', 'compound', [], [], ['knee', 'ankle'], ['none']),
  ex('cycling', 'Cycling', 'Ciclismo', 'cardio', 'compound', [], [], ['knee'], ['bike']),
  ex('rowing-machine', 'Rowing Machine', 'Remo Ergómetro', 'cardio', 'compound', [], [], ['lower_back', 'knee'], ['machine']),
  ex('swim', 'Swim', 'Natación', 'cardio', 'compound', [], [], ['shoulder'], ['pool']),
  ex('hike', 'Hike', 'Senderismo', 'cardio', 'compound', [], [], ['knee', 'ankle'], ['none']),
  ex('jump-rope', 'Jump Rope', 'Saltar la Cuerda', 'cardio', 'compound', [], [], ['ankle', 'achilles', 'knee'], ['rope']),
];

export const EXERCISE_BY_ID = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

export const getExercise = (id) => EXERCISE_BY_ID[id];

export const exerciseName = (id, lang) => EXERCISE_BY_ID[id]?.name[lang] ?? id;

/** Muscle groups an exercise loads, with role and size class attached. */
export function muscleLoad(exerciseId) {
  const e = EXERCISE_BY_ID[exerciseId];
  if (!e) return [];
  return [
    ...e.primary.map((id) => ({ muscleId: id, role: 'primary', share: 1 })),
    ...e.secondary.map((id) => ({ muscleId: id, role: 'secondary', share: SECONDARY_WEIGHT })),
  ]
    .filter((m) => MUSCLE_BY_ID[m.muscleId])
    .map((m) => ({ ...m, sizeClass: MUSCLE_BY_ID[m.muscleId].sizeClass }));
}

/** True when the exercise contributes to muscle recovery / volume tracking. */
export const isStrengthExercise = (id) => (EXERCISE_BY_ID[id]?.primary.length ?? 0) > 0;

export const EXERCISE_CATEGORIES = ['push', 'pull', 'legs', 'core', 'cardio'];

export const exercisesByCategory = (category) => EXERCISES.filter((e) => e.category === category);

export function searchExercises(query, lang) {
  const q = query.trim().toLowerCase();
  if (!q) return EXERCISES;
  return EXERCISES.filter(
    (e) =>
      e.name[lang].toLowerCase().includes(q) ||
      e.name.en.toLowerCase().includes(q) ||
      e.name.es.toLowerCase().includes(q)
  );
}
