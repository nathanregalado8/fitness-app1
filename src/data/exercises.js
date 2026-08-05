/**
 * Exercise catalog.
 *
 * Deliberately broad: every muscle group has many interchangeable options so
 * the "swap this exercise" flow always has real alternatives to offer, whatever
 * equipment the user has.
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

const C = 'compound';
const I = 'isolation';

export const EXERCISES = [
  // ============================================================ PUSH — chest
  ex('barbell-bench-press', 'Barbell Bench Press', 'Press de Banca con Barra', 'push', C,
    ['chest'], ['triceps', 'shoulders'], ['shoulder', 'elbow', 'wrist', 'chest'], ['barbell', 'bench']),
  ex('dumbbell-bench-press', 'Dumbbell Bench Press', 'Press de Banca con Mancuernas', 'push', C,
    ['chest'], ['triceps', 'shoulders'], ['shoulder', 'elbow', 'wrist', 'chest'], ['dumbbells', 'bench']),
  ex('incline-barbell-press', 'Incline Barbell Press', 'Press Inclinado con Barra', 'push', C,
    ['chest', 'shoulders'], ['triceps'], ['shoulder', 'elbow', 'wrist', 'chest'], ['barbell', 'bench']),
  ex('incline-dumbbell-press', 'Incline Dumbbell Press', 'Press Inclinado con Mancuernas', 'push', C,
    ['chest', 'shoulders'], ['triceps'], ['shoulder', 'elbow', 'wrist', 'chest'], ['dumbbells', 'bench']),
  ex('decline-barbell-press', 'Decline Barbell Press', 'Press Declinado con Barra', 'push', C,
    ['chest'], ['triceps'], ['shoulder', 'elbow', 'chest'], ['barbell', 'bench']),
  ex('machine-chest-press', 'Machine Chest Press', 'Press de Pecho en Máquina', 'push', C,
    ['chest'], ['triceps', 'shoulders'], ['shoulder', 'elbow', 'chest'], ['machine']),
  ex('smith-bench-press', 'Smith Machine Bench Press', 'Press de Banca en Multipower', 'push', C,
    ['chest'], ['triceps', 'shoulders'], ['shoulder', 'elbow', 'chest'], ['machine', 'bench']),
  ex('floor-press', 'Floor Press', 'Press en el Suelo', 'push', C,
    ['chest'], ['triceps'], ['elbow', 'shoulder'], ['barbell']),
  ex('push-up', 'Push-up', 'Flexiones', 'push', C,
    ['chest'], ['triceps', 'shoulders', 'abs'], ['shoulder', 'elbow', 'wrist', 'chest'], ['bodyweight']),
  ex('incline-push-up', 'Incline Push-up', 'Flexiones Inclinadas', 'push', C,
    ['chest'], ['triceps', 'shoulders'], ['shoulder', 'elbow', 'wrist'], ['bodyweight']),
  ex('decline-push-up', 'Decline Push-up', 'Flexiones Declinadas', 'push', C,
    ['chest', 'shoulders'], ['triceps'], ['shoulder', 'elbow', 'wrist'], ['bodyweight', 'bench']),
  ex('dip', 'Dip', 'Fondos', 'push', C,
    ['chest', 'triceps'], ['shoulders'], ['shoulder', 'elbow', 'wrist', 'chest'], ['bodyweight', 'bars']),
  ex('cable-fly', 'Cable Fly', 'Aperturas en Polea', 'push', I,
    ['chest'], ['shoulders'], ['shoulder', 'chest'], ['cable']),
  ex('cable-crossover', 'Cable Crossover', 'Cruces en Polea', 'push', I,
    ['chest'], [], ['shoulder', 'chest'], ['cable']),
  ex('incline-cable-fly', 'Incline Cable Fly', 'Aperturas Inclinadas en Polea', 'push', I,
    ['chest'], ['shoulders'], ['shoulder', 'chest'], ['cable', 'bench']),
  ex('dumbbell-fly', 'Dumbbell Fly', 'Aperturas con Mancuernas', 'push', I,
    ['chest'], [], ['shoulder', 'chest'], ['dumbbells', 'bench']),
  ex('pec-deck', 'Pec Deck', 'Contractor de Pecho', 'push', I,
    ['chest'], [], ['shoulder', 'chest'], ['machine']),
  ex('band-chest-press', 'Band Chest Press', 'Press de Pecho con Banda', 'push', C,
    ['chest'], ['triceps'], ['shoulder', 'elbow'], ['band']),

  // ======================================================== PUSH — shoulders
  ex('overhead-press', 'Overhead Press', 'Press Militar', 'push', C,
    ['shoulders'], ['triceps', 'upper_back', 'abs'], ['shoulder', 'elbow', 'wrist', 'lower_back'], ['barbell']),
  ex('seated-barbell-press', 'Seated Barbell Press', 'Press Militar Sentado', 'push', C,
    ['shoulders'], ['triceps'], ['shoulder', 'elbow', 'lower_back'], ['barbell', 'bench']),
  ex('dumbbell-shoulder-press', 'Dumbbell Shoulder Press', 'Press de Hombro con Mancuernas', 'push', C,
    ['shoulders'], ['triceps'], ['shoulder', 'elbow', 'wrist'], ['dumbbells']),
  ex('arnold-press', 'Arnold Press', 'Press Arnold', 'push', C,
    ['shoulders'], ['triceps'], ['shoulder', 'elbow'], ['dumbbells']),
  ex('machine-shoulder-press', 'Machine Shoulder Press', 'Press de Hombro en Máquina', 'push', C,
    ['shoulders'], ['triceps'], ['shoulder', 'elbow'], ['machine']),
  ex('push-press', 'Push Press', 'Push Press', 'push', C,
    ['shoulders'], ['triceps', 'quads', 'abs'], ['shoulder', 'elbow', 'lower_back', 'knee'], ['barbell']),
  ex('landmine-press', 'Landmine Press', 'Press Landmine', 'push', C,
    ['shoulders'], ['chest', 'triceps'], ['shoulder', 'elbow'], ['barbell']),
  ex('pike-push-up', 'Pike Push-up', 'Flexiones Pica', 'push', C,
    ['shoulders'], ['triceps'], ['shoulder', 'wrist', 'elbow'], ['bodyweight']),
  ex('lateral-raise', 'Lateral Raise', 'Elevaciones Laterales', 'push', I,
    ['shoulders'], [], ['shoulder'], ['dumbbells']),
  ex('cable-lateral-raise', 'Cable Lateral Raise', 'Elevaciones Laterales en Polea', 'push', I,
    ['shoulders'], [], ['shoulder'], ['cable']),
  ex('machine-lateral-raise', 'Machine Lateral Raise', 'Elevaciones Laterales en Máquina', 'push', I,
    ['shoulders'], [], ['shoulder'], ['machine']),
  ex('front-raise', 'Front Raise', 'Elevaciones Frontales', 'push', I,
    ['shoulders'], [], ['shoulder'], ['dumbbells']),
  ex('band-lateral-raise', 'Band Lateral Raise', 'Elevaciones Laterales con Banda', 'push', I,
    ['shoulders'], [], ['shoulder'], ['band']),

  // ========================================================== PUSH — triceps
  ex('triceps-pushdown', 'Triceps Pushdown', 'Extensión de Tríceps en Polea', 'push', I,
    ['triceps'], [], ['elbow'], ['cable']),
  ex('rope-pushdown', 'Rope Pushdown', 'Extensión con Cuerda', 'push', I,
    ['triceps'], [], ['elbow'], ['cable']),
  ex('overhead-triceps-extension', 'Overhead Triceps Extension', 'Extensión de Tríceps sobre la Cabeza', 'push', I,
    ['triceps'], [], ['elbow', 'shoulder'], ['dumbbells']),
  ex('cable-overhead-extension', 'Cable Overhead Extension', 'Extensión sobre la Cabeza en Polea', 'push', I,
    ['triceps'], [], ['elbow', 'shoulder'], ['cable']),
  ex('skull-crusher', 'Skull Crusher', 'Press Francés', 'push', I,
    ['triceps'], [], ['elbow', 'wrist'], ['barbell', 'bench']),
  ex('close-grip-bench', 'Close-Grip Bench Press', 'Press Cerrado', 'push', C,
    ['triceps'], ['chest', 'shoulders'], ['elbow', 'wrist', 'shoulder'], ['barbell', 'bench']),
  ex('triceps-kickback', 'Triceps Kickback', 'Patada de Tríceps', 'push', I,
    ['triceps'], [], ['elbow'], ['dumbbells']),
  ex('bench-dip', 'Bench Dip', 'Fondos en Banco', 'push', C,
    ['triceps'], ['chest'], ['shoulder', 'elbow'], ['bodyweight', 'bench']),
  ex('diamond-push-up', 'Diamond Push-up', 'Flexiones Diamante', 'push', C,
    ['triceps'], ['chest'], ['elbow', 'wrist'], ['bodyweight']),

  // ============================================================= PULL — back
  ex('deadlift', 'Deadlift', 'Peso Muerto', 'pull', C,
    ['lower_back', 'hamstrings', 'glutes'], ['lats', 'upper_back', 'forearms'],
    ['lower_back', 'hip', 'knee', 'wrist'], ['barbell']),
  ex('sumo-deadlift', 'Sumo Deadlift', 'Peso Muerto Sumo', 'pull', C,
    ['glutes', 'quads', 'lower_back'], ['hamstrings', 'upper_back'], ['lower_back', 'hip', 'knee', 'groin'], ['barbell']),
  ex('rack-pull', 'Rack Pull', 'Rack Pull', 'pull', C,
    ['lower_back', 'upper_back'], ['lats', 'glutes', 'forearms'], ['lower_back', 'wrist'], ['barbell', 'rack']),
  ex('barbell-row', 'Barbell Row', 'Remo con Barra', 'pull', C,
    ['lats', 'upper_back'], ['biceps', 'lower_back', 'forearms'], ['lower_back', 'elbow', 'shoulder'], ['barbell']),
  ex('pendlay-row', 'Pendlay Row', 'Remo Pendlay', 'pull', C,
    ['lats', 'upper_back'], ['biceps', 'lower_back'], ['lower_back', 'elbow', 'shoulder'], ['barbell']),
  ex('t-bar-row', 'T-Bar Row', 'Remo en T', 'pull', C,
    ['lats', 'upper_back'], ['biceps'], ['lower_back', 'elbow'], ['barbell', 'machine']),
  ex('dumbbell-row', 'Dumbbell Row', 'Remo con Mancuerna', 'pull', C,
    ['lats', 'upper_back'], ['biceps', 'forearms'], ['elbow', 'shoulder', 'lower_back'], ['dumbbells', 'bench']),
  ex('seated-cable-row', 'Seated Cable Row', 'Remo Sentado en Polea', 'pull', C,
    ['lats', 'upper_back'], ['biceps', 'forearms'], ['elbow', 'shoulder', 'lower_back'], ['cable']),
  ex('chest-supported-row', 'Chest-Supported Row', 'Remo con Pecho Apoyado', 'pull', C,
    ['upper_back', 'lats'], ['biceps'], ['elbow', 'shoulder'], ['machine', 'bench']),
  ex('machine-row', 'Machine Row', 'Remo en Máquina', 'pull', C,
    ['lats', 'upper_back'], ['biceps'], ['elbow', 'shoulder'], ['machine']),
  ex('inverted-row', 'Inverted Row', 'Remo Invertido', 'pull', C,
    ['upper_back', 'lats'], ['biceps'], ['elbow', 'shoulder'], ['bodyweight', 'bar']),
  ex('meadows-row', 'Meadows Row', 'Remo Meadows', 'pull', C,
    ['lats', 'upper_back'], ['biceps'], ['lower_back', 'elbow'], ['barbell']),
  ex('pull-up', 'Pull-up', 'Dominadas', 'pull', C,
    ['lats'], ['biceps', 'upper_back', 'forearms'], ['shoulder', 'elbow'], ['bodyweight', 'bar']),
  ex('chin-up', 'Chin-up', 'Dominadas Supinas', 'pull', C,
    ['lats', 'biceps'], ['upper_back', 'forearms'], ['shoulder', 'elbow'], ['bodyweight', 'bar']),
  ex('neutral-grip-pull-up', 'Neutral-Grip Pull-up', 'Dominadas Neutras', 'pull', C,
    ['lats'], ['biceps', 'upper_back'], ['shoulder', 'elbow'], ['bodyweight', 'bar']),
  ex('lat-pulldown', 'Lat Pulldown', 'Jalón al Pecho', 'pull', C,
    ['lats'], ['biceps', 'upper_back'], ['shoulder', 'elbow'], ['cable']),
  ex('wide-grip-pulldown', 'Wide-Grip Pulldown', 'Jalón Agarre Ancho', 'pull', C,
    ['lats'], ['upper_back', 'biceps'], ['shoulder', 'elbow'], ['cable']),
  ex('close-grip-pulldown', 'Close-Grip Pulldown', 'Jalón Agarre Cerrado', 'pull', C,
    ['lats'], ['biceps'], ['shoulder', 'elbow'], ['cable']),
  ex('straight-arm-pulldown', 'Straight-Arm Pulldown', 'Jalón con Brazos Rectos', 'pull', I,
    ['lats'], [], ['shoulder'], ['cable']),
  ex('band-pulldown', 'Band Pulldown', 'Jalón con Banda', 'pull', C,
    ['lats'], ['biceps'], ['shoulder', 'elbow'], ['band']),

  // ======================================================= PULL — upper back
  ex('face-pull', 'Face Pull', 'Face Pull', 'pull', I,
    ['upper_back', 'shoulders'], [], ['shoulder'], ['cable']),
  ex('rear-delt-fly', 'Rear Delt Fly', 'Aperturas Posteriores', 'pull', I,
    ['shoulders', 'upper_back'], [], ['shoulder'], ['dumbbells']),
  ex('cable-rear-delt-fly', 'Cable Rear Delt Fly', 'Aperturas Posteriores en Polea', 'pull', I,
    ['shoulders', 'upper_back'], [], ['shoulder'], ['cable']),
  ex('reverse-pec-deck', 'Reverse Pec Deck', 'Contractor Inverso', 'pull', I,
    ['upper_back', 'shoulders'], [], ['shoulder'], ['machine']),
  ex('shrug', 'Dumbbell Shrug', 'Encogimientos con Mancuernas', 'pull', I,
    ['upper_back'], ['forearms'], ['neck', 'shoulder'], ['dumbbells']),
  ex('barbell-shrug', 'Barbell Shrug', 'Encogimientos con Barra', 'pull', I,
    ['upper_back'], ['forearms'], ['neck', 'shoulder'], ['barbell']),

  // =========================================================== PULL — biceps
  ex('barbell-curl', 'Barbell Curl', 'Curl con Barra', 'pull', I,
    ['biceps'], ['forearms'], ['elbow', 'wrist'], ['barbell']),
  ex('ez-bar-curl', 'EZ-Bar Curl', 'Curl con Barra Z', 'pull', I,
    ['biceps'], ['forearms'], ['elbow', 'wrist'], ['barbell']),
  ex('dumbbell-curl', 'Dumbbell Curl', 'Curl con Mancuernas', 'pull', I,
    ['biceps'], ['forearms'], ['elbow', 'wrist'], ['dumbbells']),
  ex('hammer-curl', 'Hammer Curl', 'Curl Martillo', 'pull', I,
    ['biceps', 'forearms'], [], ['elbow', 'wrist'], ['dumbbells']),
  ex('incline-dumbbell-curl', 'Incline Dumbbell Curl', 'Curl Inclinado', 'pull', I,
    ['biceps'], [], ['elbow', 'shoulder'], ['dumbbells', 'bench']),
  ex('preacher-curl', 'Preacher Curl', 'Curl Predicador', 'pull', I,
    ['biceps'], [], ['elbow'], ['barbell', 'bench']),
  ex('concentration-curl', 'Concentration Curl', 'Curl Concentrado', 'pull', I,
    ['biceps'], [], ['elbow'], ['dumbbells']),
  ex('spider-curl', 'Spider Curl', 'Curl Araña', 'pull', I,
    ['biceps'], [], ['elbow'], ['dumbbells', 'bench']),
  ex('cable-curl', 'Cable Curl', 'Curl en Polea', 'pull', I,
    ['biceps'], ['forearms'], ['elbow', 'wrist'], ['cable']),
  ex('band-curl', 'Band Curl', 'Curl con Banda', 'pull', I,
    ['biceps'], [], ['elbow'], ['band']),

  // ========================================================= PULL — forearms
  ex('wrist-curl', 'Wrist Curl', 'Curl de Muñeca', 'pull', I,
    ['forearms'], [], ['wrist'], ['dumbbells']),
  ex('reverse-wrist-curl', 'Reverse Wrist Curl', 'Curl Inverso de Muñeca', 'pull', I,
    ['forearms'], [], ['wrist'], ['dumbbells']),
  ex('reverse-curl', 'Reverse Curl', 'Curl Inverso', 'pull', I,
    ['forearms', 'biceps'], [], ['elbow', 'wrist'], ['barbell']),
  ex('farmer-carry', "Farmer's Carry", 'Paseo del Granjero', 'pull', C,
    ['forearms'], ['upper_back', 'abs'], ['wrist', 'shoulder', 'lower_back'], ['dumbbells']),

  // ========================================================== LEGS — quads
  ex('back-squat', 'Back Squat', 'Sentadilla Trasera', 'legs', C,
    ['quads', 'glutes'], ['hamstrings', 'lower_back', 'abs'], ['knee', 'hip', 'lower_back'], ['barbell', 'rack']),
  ex('front-squat', 'Front Squat', 'Sentadilla Frontal', 'legs', C,
    ['quads'], ['glutes', 'abs', 'upper_back'], ['knee', 'hip', 'wrist', 'lower_back'], ['barbell', 'rack']),
  ex('box-squat', 'Box Squat', 'Sentadilla al Cajón', 'legs', C,
    ['quads', 'glutes'], ['hamstrings'], ['knee', 'hip', 'lower_back'], ['barbell', 'rack']),
  ex('smith-squat', 'Smith Machine Squat', 'Sentadilla en Multipower', 'legs', C,
    ['quads', 'glutes'], ['hamstrings'], ['knee', 'hip'], ['machine']),
  ex('goblet-squat', 'Goblet Squat', 'Sentadilla Goblet', 'legs', C,
    ['quads', 'glutes'], ['abs'], ['knee', 'hip'], ['dumbbells']),
  ex('kettlebell-goblet-squat', 'Kettlebell Goblet Squat', 'Sentadilla Goblet con Pesa Rusa', 'legs', C,
    ['quads', 'glutes'], ['abs'], ['knee', 'hip'], ['kettlebell']),
  ex('leg-press', 'Leg Press', 'Prensa de Piernas', 'legs', C,
    ['quads', 'glutes'], ['hamstrings'], ['knee', 'hip'], ['machine']),
  ex('hack-squat', 'Hack Squat', 'Sentadilla Hack', 'legs', C,
    ['quads'], ['glutes'], ['knee', 'hip'], ['machine']),
  ex('belt-squat', 'Belt Squat', 'Sentadilla con Cinturón', 'legs', C,
    ['quads', 'glutes'], [], ['knee', 'hip'], ['machine']),
  ex('bulgarian-split-squat', 'Bulgarian Split Squat', 'Sentadilla Búlgara', 'legs', C,
    ['quads', 'glutes'], ['hamstrings'], ['knee', 'hip'], ['dumbbells', 'bench']),
  ex('walking-lunge', 'Walking Lunge', 'Zancadas Caminando', 'legs', C,
    ['quads', 'glutes'], ['hamstrings'], ['knee', 'hip'], ['dumbbells']),
  ex('reverse-lunge', 'Reverse Lunge', 'Zancada Inversa', 'legs', C,
    ['quads', 'glutes'], ['hamstrings'], ['knee', 'hip'], ['dumbbells']),
  ex('step-up', 'Step-up', 'Subida al Cajón', 'legs', C,
    ['quads', 'glutes'], ['hamstrings'], ['knee', 'hip'], ['dumbbells', 'bench']),
  ex('bodyweight-squat', 'Bodyweight Squat', 'Sentadilla Libre', 'legs', C,
    ['quads', 'glutes'], [], ['knee', 'hip'], ['bodyweight']),
  ex('sissy-squat', 'Sissy Squat', 'Sentadilla Sissy', 'legs', I,
    ['quads'], [], ['knee'], ['bodyweight']),
  ex('leg-extension', 'Leg Extension', 'Extensión de Cuádriceps', 'legs', I,
    ['quads'], [], ['knee'], ['machine']),

  // ============================================== LEGS — hamstrings / glutes
  ex('romanian-deadlift', 'Romanian Deadlift', 'Peso Muerto Rumano', 'legs', C,
    ['hamstrings', 'glutes'], ['lower_back', 'forearms'], ['lower_back', 'hip', 'hamstring'], ['barbell']),
  ex('dumbbell-rdl', 'Dumbbell Romanian Deadlift', 'Peso Muerto Rumano con Mancuernas', 'legs', C,
    ['hamstrings', 'glutes'], ['lower_back'], ['lower_back', 'hip', 'hamstring'], ['dumbbells']),
  ex('stiff-leg-deadlift', 'Stiff-Leg Deadlift', 'Peso Muerto Piernas Rectas', 'legs', C,
    ['hamstrings'], ['glutes', 'lower_back'], ['lower_back', 'hamstring'], ['barbell']),
  ex('single-leg-rdl', 'Single-Leg RDL', 'Peso Muerto Rumano a Una Pierna', 'legs', C,
    ['hamstrings', 'glutes'], ['lower_back'], ['hip', 'hamstring', 'ankle'], ['dumbbells']),
  ex('good-morning', 'Good Morning', 'Buenos Días', 'legs', C,
    ['hamstrings', 'lower_back'], ['glutes'], ['lower_back', 'hamstring'], ['barbell']),
  ex('hip-thrust', 'Hip Thrust', 'Empuje de Cadera', 'legs', C,
    ['glutes'], ['hamstrings'], ['hip', 'lower_back'], ['barbell', 'bench']),
  ex('glute-bridge', 'Glute Bridge', 'Puente de Glúteos', 'legs', C,
    ['glutes'], ['hamstrings'], ['hip'], ['bodyweight']),
  ex('cable-pull-through', 'Cable Pull-Through', 'Pull-Through en Polea', 'legs', C,
    ['glutes', 'hamstrings'], ['lower_back'], ['hip', 'lower_back'], ['cable']),
  ex('kettlebell-swing', 'Kettlebell Swing', 'Swing con Pesa Rusa', 'legs', C,
    ['glutes', 'hamstrings'], ['lower_back', 'abs'], ['hip', 'lower_back'], ['kettlebell']),
  ex('lying-leg-curl', 'Lying Leg Curl', 'Curl Femoral Tumbado', 'legs', I,
    ['hamstrings'], [], ['knee', 'hamstring'], ['machine']),
  ex('seated-leg-curl', 'Seated Leg Curl', 'Curl Femoral Sentado', 'legs', I,
    ['hamstrings'], [], ['knee', 'hamstring'], ['machine']),
  ex('nordic-curl', 'Nordic Hamstring Curl', 'Curl Nórdico', 'legs', I,
    ['hamstrings'], ['glutes'], ['knee', 'hamstring'], ['bodyweight']),
  ex('back-extension', 'Back Extension', 'Extensión Lumbar', 'legs', I,
    ['lower_back'], ['glutes', 'hamstrings'], ['lower_back', 'hip'], ['machine']),
  ex('hip-abduction', 'Hip Abduction', 'Abducción de Cadera', 'legs', I,
    ['glutes'], [], ['hip'], ['machine']),

  // ========================================================== LEGS — calves
  ex('standing-calf-raise', 'Standing Calf Raise', 'Elevación de Talones de Pie', 'legs', I,
    ['calves'], [], ['ankle', 'achilles'], ['machine']),
  ex('seated-calf-raise', 'Seated Calf Raise', 'Elevación de Talones Sentado', 'legs', I,
    ['calves'], [], ['ankle', 'achilles'], ['machine']),
  ex('leg-press-calf-raise', 'Leg Press Calf Raise', 'Elevación de Talones en Prensa', 'legs', I,
    ['calves'], [], ['ankle', 'achilles'], ['machine']),
  ex('single-leg-calf-raise', 'Single-Leg Calf Raise', 'Elevación de Talones a Una Pierna', 'legs', I,
    ['calves'], [], ['ankle', 'achilles'], ['bodyweight']),
  ex('dumbbell-calf-raise', 'Dumbbell Calf Raise', 'Elevación de Talones con Mancuernas', 'legs', I,
    ['calves'], [], ['ankle', 'achilles'], ['dumbbells']),

  // ================================================================== CORE
  ex('plank', 'Plank', 'Plancha', 'core', I,
    ['abs'], ['lower_back'], ['lower_back', 'shoulder'], ['bodyweight']),
  ex('side-plank', 'Side Plank', 'Plancha Lateral', 'core', I,
    ['abs'], [], ['shoulder', 'lower_back'], ['bodyweight']),
  ex('hollow-hold', 'Hollow Hold', 'Hollow Hold', 'core', I,
    ['abs'], [], ['lower_back'], ['bodyweight']),
  ex('hanging-leg-raise', 'Hanging Leg Raise', 'Elevación de Piernas Colgado', 'core', I,
    ['abs'], ['forearms'], ['shoulder', 'lower_back'], ['bodyweight', 'bar']),
  ex('captains-chair-raise', "Captain's Chair Leg Raise", 'Elevación de Piernas en Silla Romana', 'core', I,
    ['abs'], [], ['shoulder', 'lower_back'], ['machine']),
  ex('cable-crunch', 'Cable Crunch', 'Crunch en Polea', 'core', I,
    ['abs'], [], ['lower_back'], ['cable']),
  ex('crunch', 'Crunch', 'Abdominales', 'core', I,
    ['abs'], [], ['neck', 'lower_back'], ['bodyweight']),
  ex('bicycle-crunch', 'Bicycle Crunch', 'Bicicleta Abdominal', 'core', I,
    ['abs'], [], ['neck', 'lower_back'], ['bodyweight']),
  ex('decline-sit-up', 'Decline Sit-up', 'Abdominales Declinados', 'core', I,
    ['abs'], [], ['lower_back', 'neck'], ['bench']),
  ex('ab-wheel', 'Ab Wheel Rollout', 'Rueda Abdominal', 'core', C,
    ['abs'], ['lats', 'lower_back'], ['lower_back', 'shoulder'], ['bodyweight']),
  ex('russian-twist', 'Russian Twist', 'Giro Ruso', 'core', I,
    ['abs'], [], ['lower_back'], ['bodyweight']),
  ex('dead-bug', 'Dead Bug', 'Bicho Muerto', 'core', I,
    ['abs'], [], ['lower_back'], ['bodyweight']),
  ex('mountain-climber', 'Mountain Climber', 'Escaladores', 'core', C,
    ['abs'], ['shoulders', 'quads'], ['shoulder', 'wrist'], ['bodyweight']),
  ex('pallof-press', 'Pallof Press', 'Press Pallof', 'core', I,
    ['abs'], [], ['lower_back', 'shoulder'], ['cable']),

  // ------------------------------------------------------- NON-STRENGTH
  // Logged for the general activity streak. These never touch muscle
  // recovery timers or per-muscle volume (spec Phase 2.5).
  ex('run', 'Run', 'Correr', 'cardio', C, [], [], ['knee', 'ankle'], ['none']),
  ex('treadmill-run', 'Treadmill Run', 'Correr en Cinta', 'cardio', C, [], [], ['knee', 'ankle'], ['machine']),
  ex('incline-walk', 'Incline Walk', 'Caminata Inclinada', 'cardio', C, [], [], ['knee', 'ankle'], ['machine']),
  ex('cycling', 'Cycling', 'Ciclismo', 'cardio', C, [], [], ['knee'], ['bike']),
  ex('assault-bike', 'Assault Bike', 'Bici de Asalto', 'cardio', C, [], [], ['knee', 'shoulder'], ['bike']),
  ex('rowing-machine', 'Rowing Machine', 'Remo Ergómetro', 'cardio', C, [], [], ['lower_back', 'knee'], ['machine']),
  ex('elliptical', 'Elliptical', 'Elíptica', 'cardio', C, [], [], ['knee'], ['machine']),
  ex('stair-climber', 'Stair Climber', 'Escaladora', 'cardio', C, [], [], ['knee', 'ankle'], ['machine']),
  ex('swim', 'Swim', 'Natación', 'cardio', C, [], [], ['shoulder'], ['pool']),
  ex('hike', 'Hike', 'Senderismo', 'cardio', C, [], [], ['knee', 'ankle'], ['none']),
  ex('jump-rope', 'Jump Rope', 'Saltar la Cuerda', 'cardio', C, [], [], ['ankle', 'achilles', 'knee'], ['rope']),
  ex('sled-push', 'Sled Push', 'Empuje de Trineo', 'cardio', C, [], [], ['knee', 'ankle'], ['sled']),
  ex('hiit-intervals', 'HIIT Intervals', 'Intervalos HIIT', 'cardio', C, [], [], ['knee', 'ankle'], ['none']),
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

/** Does the user own everything this exercise needs? Bodyweight is always available. */
export function hasEquipmentFor(exercise, owned) {
  const set = new Set(owned ?? []);
  if (set.size === 0) return true;
  return exercise.equipment.every((eq) => eq === 'bodyweight' || eq === 'none' || set.has(eq));
}

/**
 * Alternatives for an exercise, best match first.
 *
 * Ranked by how closely the swap preserves the training intent: same primary
 * muscles and same movement type score highest, then same muscles, then any
 * overlap. Options the user lacks equipment for, or that load a flagged body
 * part, are still returned — annotated, not hidden — so the choice stays theirs.
 */
export function alternativesFor(exerciseId, { equipment = [], areasOfConcern = [], exclude = [] } = {}) {
  const base = EXERCISE_BY_ID[exerciseId];
  if (!base) return [];

  const flagged = new Set(areasOfConcern.map((c) => c.bodyPart));
  const skip = new Set([exerciseId, ...exclude]);
  const basePrimary = new Set(base.primary);

  return EXERCISES.filter((e) => !skip.has(e.id) && e.primary.some((m) => basePrimary.has(m)))
    .map((e) => {
      const shared = e.primary.filter((m) => basePrimary.has(m)).length;
      const sameShape = e.primary.length === base.primary.length && shared === base.primary.length;
      const hasEquipment = hasEquipmentFor(e, equipment);
      const concerns = e.bodyParts.filter((p) => flagged.has(p));
      const score =
        (sameShape ? 100 : shared * 30) +
        (e.movementType === base.movementType ? 25 : 0) +
        (e.category === base.category ? 10 : 0) +
        (hasEquipment ? 20 : 0) -
        concerns.length * 15;
      return { exerciseId: e.id, hasEquipment, concerns, score };
    })
    .sort((a, b) => b.score - a.score || a.exerciseId.localeCompare(b.exerciseId));
}
