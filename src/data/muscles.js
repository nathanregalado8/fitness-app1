/**
 * Muscle groups and body parts.
 *
 * `sizeClass` is Layer 1 exercise metadata (spec Phase 4): large groups
 * (legs / back / chest) and small groups (biceps / triceps / calves / abs)
 * accumulate and recover differently. It is passed to the AI as a raw signal —
 * this file makes no judgment about what to do with it.
 *
 * `region` drives which side of the body map the muscle is drawn on.
 */

export const MUSCLE_GROUPS = [
  { id: 'chest', sizeClass: 'large', region: 'front', name: { en: 'Chest', es: 'Pecho' } },
  { id: 'shoulders', sizeClass: 'small', region: 'front', name: { en: 'Shoulders', es: 'Hombros' } },
  { id: 'biceps', sizeClass: 'small', region: 'front', name: { en: 'Biceps', es: 'Bíceps' } },
  { id: 'forearms', sizeClass: 'small', region: 'front', name: { en: 'Forearms', es: 'Antebrazos' } },
  { id: 'abs', sizeClass: 'small', region: 'front', name: { en: 'Abs', es: 'Abdominales' } },
  { id: 'quads', sizeClass: 'large', region: 'front', name: { en: 'Quads', es: 'Cuádriceps' } },
  { id: 'upper_back', sizeClass: 'large', region: 'back', name: { en: 'Upper back', es: 'Espalda alta' } },
  { id: 'lats', sizeClass: 'large', region: 'back', name: { en: 'Lats', es: 'Dorsales' } },
  { id: 'lower_back', sizeClass: 'large', region: 'back', name: { en: 'Lower back', es: 'Espalda baja' } },
  { id: 'triceps', sizeClass: 'small', region: 'back', name: { en: 'Triceps', es: 'Tríceps' } },
  { id: 'glutes', sizeClass: 'large', region: 'back', name: { en: 'Glutes', es: 'Glúteos' } },
  { id: 'hamstrings', sizeClass: 'large', region: 'back', name: { en: 'Hamstrings', es: 'Isquiotibiales' } },
  { id: 'calves', sizeClass: 'small', region: 'back', name: { en: 'Calves', es: 'Pantorrillas' } },
];

export const MUSCLE_BY_ID = Object.fromEntries(MUSCLE_GROUPS.map((m) => [m.id, m]));

export const muscleName = (id, lang) => MUSCLE_BY_ID[id]?.name[lang] ?? id;

/**
 * Areas of concern are an open list on the profile, but the picker offers
 * these as shortcuts. Free text is always allowed — nothing here is hardcoded
 * into the warning logic, which matches on whatever `bodyPart` the user saved.
 */
export const BODY_PARTS = [
  { id: 'shoulder', name: { en: 'Shoulder', es: 'Hombro' } },
  { id: 'elbow', name: { en: 'Elbow', es: 'Codo' } },
  { id: 'wrist', name: { en: 'Wrist', es: 'Muñeca' } },
  { id: 'neck', name: { en: 'Neck', es: 'Cuello' } },
  { id: 'upper_back', name: { en: 'Upper back', es: 'Espalda alta' } },
  { id: 'lower_back', name: { en: 'Lower back', es: 'Espalda baja' } },
  { id: 'hip', name: { en: 'Hip', es: 'Cadera' } },
  { id: 'knee', name: { en: 'Knee', es: 'Rodilla' } },
  { id: 'ankle', name: { en: 'Ankle', es: 'Tobillo' } },
  { id: 'achilles', name: { en: 'Achilles', es: 'Tendón de Aquiles' } },
  { id: 'hamstring', name: { en: 'Hamstring', es: 'Isquiotibial' } },
  { id: 'groin', name: { en: 'Groin', es: 'Ingle' } },
  { id: 'chest', name: { en: 'Chest / pec', es: 'Pecho / pectoral' } },
];

export const BODY_PART_BY_ID = Object.fromEntries(BODY_PARTS.map((b) => [b.id, b]));

export const bodyPartName = (id, lang) => BODY_PART_BY_ID[id]?.name[lang] ?? id;

export const SIZE_CLASS_NAME = {
  large: { en: 'large', es: 'grande' },
  small: { en: 'small', es: 'pequeño' },
};
