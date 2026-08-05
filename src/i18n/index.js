/** Bilingual UI strings. English and Spanish are both first-class. */

export const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Español' },
];

const STRINGS = {
  // ---------------------------------------------------------------- generic
  appName: { en: 'Fitness App', es: 'Fitness App' },
  save: { en: 'Save', es: 'Guardar' },
  cancel: { en: 'Cancel', es: 'Cancelar' },
  delete: { en: 'Delete', es: 'Eliminar' },
  edit: { en: 'Edit', es: 'Editar' },
  add: { en: 'Add', es: 'Añadir' },
  done: { en: 'Done', es: 'Listo' },
  goBack: { en: 'Back', es: 'Volver' },
  yes: { en: 'Yes', es: 'Sí' },
  no: { en: 'No', es: 'No' },
  adjust: { en: 'Adjust', es: 'Ajustar' },
  dismiss: { en: 'Dismiss', es: 'Descartar' },
  close: { en: 'Close', es: 'Cerrar' },
  today: { en: 'Today', es: 'Hoy' },
  optional: { en: 'optional', es: 'opcional' },
  search: { en: 'Search', es: 'Buscar' },
  notes: { en: 'Notes', es: 'Notas' },
  loading: { en: 'Working…', es: 'Trabajando…' },
  retry: { en: 'Retry', es: 'Reintentar' },
  none: { en: 'None', es: 'Ninguno' },
  never: { en: 'Never', es: 'Nunca' },
  all: { en: 'All', es: 'Todo' },
  empty: { en: 'Nothing here yet.', es: 'Aún no hay nada.' },

  // -------------------------------------------------------------------- nav
  brand: { en: 'FORJA', es: 'FORJA' },
  navHome: { en: 'Home', es: 'Inicio' },
  navTrain: { en: 'Train', es: 'Entrenar' },
  navHistory: { en: 'History', es: 'Historial' },
  navProfile: { en: 'Profile', es: 'Perfil' },

  // -------------------------------------------------------------- dashboard
  statPower: { en: 'Power', es: 'Power' },
  statVolume: { en: 'Volume', es: 'Volumen' },
  statSessions: { en: 'Sessions', es: 'Sesiones' },
  streakDays: { en: 'days', es: 'días' },
  weekProgress: { en: 'Week {n}', es: 'Semana {n}' },
  stepMap: { en: '01 — MAP', es: '01 — MAPA' },
  stepSession: { en: '03 — SESSION', es: '03 — SESIÓN' },
  stepHistory: { en: '04 — HISTORY', es: '04 — HISTORIAL' },
  stepGenerator: { en: '05 — GENERATOR', es: '05 — GENERADOR' },
  stepProfile: { en: '06 — PROFILE', es: '06 — PERFIL' },
  openSuggestion: { en: 'You have a coach suggestion', es: 'Tienes una sugerencia del entrenador' },
  noDataYet: { en: 'Log a session and your map lights up.', es: 'Registra una sesión y tu mapa se enciende.' },

  // ---------------------------------------------------------- session pick
  whatTraining: { en: 'What are we training?', es: '¿Qué entrenamos?' },
  whyRecovered: { en: '{muscle} {pct}% recovered', es: '{muscle} {pct}% recuperado' },
  whyUntouched: { en: '{muscle} untouched {days} d', es: '{muscle} sin tocar {days} d' },
  whyNoStimulus: { en: 'No stimulus in {days} d', es: 'Sin estímulo {days} d' },
  whyFresh: { en: 'Never trained yet', es: 'Aún sin entrenar' },
  whyFlagged: { en: '{part} flagged', es: '{part} marcada' },
  whyHighLoad: { en: 'High load accumulated', es: 'Carga alta acumulada' },
  whyDuration: { en: 'Logged by duration', es: 'Registro por duración' },
  whyBuildOwn: { en: 'Build your own', es: 'Arma la tuya' },
  legendReady: { en: 'Recovered', es: 'Recuperado' },
  legendRecovering: { en: 'Recovering', es: 'En recuperación' },
  legendFlagged: { en: 'Flagged area', es: 'Área marcada' },
  legendNote: {
    en: 'Warnings never block. The app lowers the suggested volume and lets you train.',
    es: 'Los avisos no bloquean. La app baja el volumen sugerido y te deja entrenar.',
  },

  // --------------------------------------------------------------- logger
  inProgress: { en: 'In progress', es: 'En curso' },
  elapsed: { en: 'Time', es: 'Tiempo' },
  currentSet: { en: 'Set {n} · current', es: 'Set {n} · actual' },
  targetHint: { en: 'target {reps} reps', es: 'objetivo {reps} reps' },
  registerSet: { en: 'Log set', es: 'Registrar set' },
  restTimer: { en: 'Rest', es: 'Descanso' },
  pause: { en: 'Pause', es: 'Pausar' },
  resume: { en: 'Resume', es: 'Seguir' },
  plus30: { en: '+30s', es: '+30s' },
  skipRest: { en: 'Skip', es: 'Saltar' },
  nextUp: { en: 'Next', es: 'Siguiente' },
  finishExercise: { en: 'Next exercise', es: 'Siguiente ejercicio' },
  finishSession: { en: 'Finish session', es: 'Terminar sesión' },
  noSetsLogged: { en: 'No sets logged yet.', es: 'Aún no registras sets.' },
  exerciseCount: { en: '{i} / {n}', es: '{i} / {n}' },
  athlete: { en: 'Athlete', es: 'Atleta' },
  yourName: { en: 'Name', es: 'Nombre' },
  allExercisesDone: { en: 'Every exercise is done. Finish the session below.', es: 'Terminaste todos los ejercicios. Cierra la sesión abajo.' },
  sessionPlan: { en: 'Session plan', es: 'Plan de la sesión' },
  sessionDetails: { en: 'Session details', es: 'Detalles de la sesión' },

  // ------------------------------------------------------------ generator
  buildToday: { en: 'Build today\'s', es: 'Arma la de hoy' },
  generatorHelp: {
    en: 'Tell it how you arrive. It crosses your context with the abandoned groups on the map.',
    es: 'Cuéntale cómo llegas. Cruza tu contexto con los grupos abandonados del mapa.',
  },
  generatorPlaceholder: {
    en: 'Slept 5 h, right shoulder sensitive, I have 45 min…',
    es: 'Dormí 5 h, hombro derecho sensible, tengo 45 min…',
  },
  quickLowSleep: { en: 'Low sleep', es: 'Poco sueño' },
  quick45: { en: '45 min', es: '45 min' },
  quickNoCables: { en: 'No cables', es: 'Sin poleas' },
  quickShoulder: { en: 'Shoulder sensitive', es: 'Hombro sensible' },
  quickEnergy: { en: 'Feeling strong', es: 'Con energía' },
  generateRoutine: { en: 'Generate routine', es: 'Generar rutina' },

  // -------------------------------------------------------------- history
  tiersUp: { en: 'Tiers ↑', es: 'Tiers ↑' },

  // ------------------------------------------------------------ onboarding
  welcome: { en: 'Set up your profile', es: 'Configura tu perfil' },
  welcomeSub: {
    en: 'Four quick questions. You can change any of this later.',
    es: 'Cuatro preguntas rápidas. Puedes cambiar todo esto después.',
  },
  language: { en: 'Language', es: 'Idioma' },
  goal: { en: 'Goal', es: 'Objetivo' },
  goalStrength: { en: 'Strength', es: 'Fuerza' },
  goalHypertrophy: { en: 'Hypertrophy', es: 'Hipertrofia' },
  goalEndurance: { en: 'Endurance', es: 'Resistencia' },
  goalGeneral: { en: 'General fitness', es: 'Forma general' },
  daysPerWeek: { en: 'Days per week', es: 'Días por semana' },
  equipment: { en: 'Equipment', es: 'Equipamiento' },
  units: { en: 'Units', es: 'Unidades' },
  bodyweight: { en: 'Bodyweight', es: 'Peso corporal' },
  finish: { en: 'Finish', es: 'Terminar' },
  skip: { en: 'Skip', es: 'Omitir' },

  // ------------------------------------------------------------- equipment
  eq_barbell: { en: 'Barbell', es: 'Barra' },
  eq_dumbbells: { en: 'Dumbbells', es: 'Mancuernas' },
  eq_machine: { en: 'Machines', es: 'Máquinas' },
  eq_cable: { en: 'Cables', es: 'Poleas' },
  eq_bench: { en: 'Bench', es: 'Banco' },
  eq_rack: { en: 'Rack', es: 'Rack' },
  eq_bar: { en: 'Pull-up bar', es: 'Barra de dominadas' },
  eq_bars: { en: 'Dip bars', es: 'Paralelas' },
  eq_bodyweight: { en: 'Bodyweight', es: 'Peso corporal' },
  eq_bike: { en: 'Bike', es: 'Bicicleta' },
  eq_pool: { en: 'Pool', es: 'Piscina' },
  eq_rope: { en: 'Jump rope', es: 'Cuerda' },
  eq_kettlebell: { en: 'Kettlebell', es: 'Pesa rusa' },
  eq_band: { en: 'Bands', es: 'Bandas' },
  eq_sled: { en: 'Sled', es: 'Trineo' },

  // --------------------------------------------------------- session types
  st_push: { en: 'Push', es: 'Empuje' },
  st_pull: { en: 'Pull', es: 'Tirón' },
  st_legs: { en: 'Legs', es: 'Pierna' },
  st_full_body: { en: 'Full body', es: 'Cuerpo completo' },
  st_cardio: { en: 'Cardio', es: 'Cardio' },
  st_hike: { en: 'Hike', es: 'Senderismo' },
  st_swim: { en: 'Swim', es: 'Natación' },
  st_custom: { en: 'Custom', es: 'Personalizado' },

  // ------------------------------------------------------------- set types
  set_warmup: { en: 'Warm-up', es: 'Calentamiento' },
  set_normal: { en: 'Normal', es: 'Normal' },
  set_backoff: { en: 'Back-off', es: 'Back-off' },
  set_drop: { en: 'Drop set', es: 'Drop set' },
  set_failure: { en: 'To failure', es: 'Al fallo' },

  // ------------------------------------------------------------------- log
  startSession: { en: 'Start a session', es: 'Empezar sesión' },
  pickSessionType: { en: 'What are you training?', es: '¿Qué vas a entrenar?' },
  sessionDate: { en: 'Date', es: 'Fecha' },
  addExercise: { en: 'Add exercise', es: 'Añadir ejercicio' },
  addSet: { en: 'Add set', es: 'Añadir serie' },
  removeSet: { en: 'Remove set', es: 'Quitar serie' },
  removeExercise: { en: 'Remove exercise', es: 'Quitar ejercicio' },
  weight: { en: 'Weight', es: 'Peso' },
  reps: { en: 'Reps', es: 'Reps' },
  targetReps: { en: 'Target', es: 'Objetivo' },
  setType: { en: 'Type', es: 'Tipo' },
  saveSession: { en: 'Save session', es: 'Guardar sesión' },
  sessionSaved: { en: 'Session saved', es: 'Sesión guardada' },
  discardSession: { en: 'Discard session', es: 'Descartar sesión' },
  duration: { en: 'Duration (min)', es: 'Duración (min)' },
  distance: { en: 'Distance (km)', es: 'Distancia (km)' },
  countsAsStrength: { en: 'Counts as strength training', es: 'Cuenta como entrenamiento de fuerza' },
  countsAsStrengthHelp: {
    en: 'Off means it only feeds the activity streak and never touches muscle recovery timers.',
    es: 'Desactivado significa que solo alimenta la racha de actividad y no toca los tiempos de recuperación muscular.',
  },
  customName: { en: 'Session name', es: 'Nombre de la sesión' },
  noExercisesYet: { en: 'No exercises added yet.', es: 'Aún no has añadido ejercicios.' },
  currentTarget: { en: 'Target for today', es: 'Objetivo de hoy' },
  lastTime: { en: 'Last time', es: 'La última vez' },

  // -------------------------------------------------------------- routine
  routineReady: { en: 'Routine ready', es: 'Rutina lista' },
  routineFor: { en: 'Built for your goal: {goal}', es: 'Hecha para tu objetivo: {goal}' },
  regenerate: { en: 'Regenerate', es: 'Regenerar' },
  startBlank: { en: 'Start blank', es: 'Empezar vacía' },
  slot_main: { en: 'Main lift', es: 'Principal' },
  slot_accessory: { en: 'Accessory', es: 'Accesorio' },
  slot_finisher: { en: 'Finisher', es: 'Final' },
  reason_familiar: { en: 'you already train this', es: 'ya lo entrenas' },
  reason_variety: { en: 'new angle for variety', es: 'ángulo nuevo por variedad' },
  skippedForRecovery: {
    en: '{muscles} skipped — trained {ago}, still recovering.',
    es: '{muscles} omitido — entrenado {ago}, aún recuperando.',
  },
  routineOverridden: {
    en: 'Everything in this split was trained recently. Programmed anyway — go lighter, or pick another day.',
    es: 'Todo en esta división se entrenó hace poco. Se programó igual — baja la carga, o elige otro día.',
  },
  skippedNoEquipment: {
    en: '{muscles} skipped — no equipment for it in your profile.',
    es: '{muscles} omitido — no tienes equipo para eso en tu perfil.',
  },
  swap: { en: 'Swap', es: 'Cambiar' },
  swapTitle: { en: 'Swap {exercise}', es: 'Cambiar {exercise}' },
  swapHelp: {
    en: 'Same muscles, ranked by how closely they match. Nothing is hidden — options you lack equipment for are marked.',
    es: 'Mismos músculos, ordenados por cercanía. No se oculta nada — se marcan las opciones sin equipo.',
  },
  alternativesCount: { en: '{n} alternatives', es: '{n} alternativas' },
  activityTarget: { en: 'Target: {min} min', es: 'Objetivo: {min} min' },
  noRoutinePossible: {
    en: 'Not enough equipment selected to build this session. Add equipment in your profile, or start blank.',
    es: 'No hay suficiente equipo para armar esta sesión. Añade equipo en tu perfil, o empieza vacía.',
  },

  // ------------------------------------------------------------- templates
  templates: { en: 'Templates', es: 'Plantillas' },
  saveAsTemplate: { en: 'Save as template', es: 'Guardar como plantilla' },
  templateName: { en: 'Template name', es: 'Nombre de la plantilla' },
  useTemplate: { en: 'Use', es: 'Usar' },
  noTemplates: { en: 'No templates saved yet.', es: 'Aún no hay plantillas guardadas.' },
  templateSaved: { en: 'Template saved', es: 'Plantilla guardada' },

  // -------------------------------------------------------------- calendar
  history: { en: 'History', es: 'Historial' },
  noSessionsOnDay: { en: 'No sessions on this day.', es: 'No hay sesiones este día.' },
  sessionCount: { en: '{n} session(s)', es: '{n} sesión(es)' },
  activityStreak: { en: 'Activity streak', es: 'Racha de actividad' },
  days: { en: 'days', es: 'días' },
  longest: { en: 'longest', es: 'máxima' },
  totalSessions: { en: 'Total sessions', es: 'Sesiones totales' },
  deleteSessionConfirm: {
    en: 'Delete this session? This cannot be undone.',
    es: '¿Eliminar esta sesión? No se puede deshacer.',
  },

  // ------------------------------------------------------------- body map
  bodyMap: { en: 'Muscle map', es: 'Mapa muscular' },
  front: { en: 'Front', es: 'Frente' },
  back: { en: 'Back', es: 'Espalda' },
  tier: { en: 'Tier', es: 'Nivel' },
  powerScore: { en: 'Power score', es: 'Puntuación' },
  lastTrained: { en: 'Last trained', es: 'Último entrenamiento' },
  recency: { en: 'Recency', es: 'Frescura' },
  volumeTrend: { en: 'Volume trend', es: 'Tendencia de volumen' },
  consistency: { en: 'Consistency', es: 'Consistencia' },
  weekStreak: { en: 'Week streak', es: 'Racha semanal' },
  sessions28: { en: 'Sessions (28d)', es: 'Sesiones (28d)' },
  tierExplainer: {
    en: 'Each muscle group is scored on its own: recency, weekly volume trend and rep-completion consistency. No averaging across the body.',
    es: 'Cada grupo muscular se puntúa por separado: frescura, tendencia de volumen semanal y consistencia de repeticiones. Sin promediar el cuerpo entero.',
  },
  artPlaceholder: {
    en: 'Placeholder art — final tiered character assets land in Phase 2 visuals.',
    es: 'Arte provisional — los assets finales del personaje llegan en la fase visual 2.',
  },

  // -------------------------------------------------------------- warnings
  warningsTitle: { en: 'Before you start', es: 'Antes de empezar' },
  recoveryRest: {
    en: '{muscle} was trained {ago} — under 24h of recovery.',
    es: '{muscle} se entrenó {ago} — menos de 24 h de recuperación.',
  },
  recoveryCaution: {
    en: '{muscle} was trained {ago} — still inside the 24-36h window.',
    es: '{muscle} se entrenó {ago} — todavía dentro de la ventana de 24-36 h.',
  },
  concernWarning: {
    en: '{part} is flagged as an area of concern and is loaded by this session.',
    es: '{part} está marcada como zona sensible y esta sesión la carga.',
  },
  concernCooldown: {
    en: 'Last loaded {ago}; your flagged-area cooldown is {hours}h.',
    es: 'Cargada {ago}; tu período de espera para zonas marcadas es de {hours} h.',
  },
  nonBlocking: {
    en: 'This is a heads-up, not a block. Log whatever you actually did.',
    es: 'Esto es un aviso, no un bloqueo. Registra lo que realmente hiciste.',
  },

  // ----------------------------------------------------------- suggestions
  suggestionTitle: { en: 'Coach suggestion', es: 'Sugerencia del entrenador' },
  suggestionRunning: { en: 'Reviewing your session…', es: 'Revisando tu sesión…' },
  suggestionNone: {
    en: 'Nothing to change right now.',
    es: 'Nada que cambiar por ahora.',
  },
  suggestionFailed: { en: 'Coach unavailable', es: 'Entrenador no disponible' },
  applyTarget: { en: 'Yes, use this next time', es: 'Sí, úsalo la próxima vez' },
  declineTarget: { en: 'No', es: 'No' },
  adjustTarget: { en: 'Adjust', es: 'Ajustar' },
  commentLabel: { en: 'Add a comment', es: 'Añadir un comentario' },
  commentPlaceholder: {
    en: 'Optional — e.g. "left shoulder felt off on the last set"',
    es: 'Opcional — p. ej. «el hombro izquierdo molestó en la última serie»',
  },
  flagAsConcern: { en: 'Also flag a body part as an area of concern', es: 'Marcar también una zona sensible' },
  targetApplied: {
    en: 'Target saved for the next {exercise}.',
    es: 'Objetivo guardado para el próximo {exercise}.',
  },
  decisionLabel: {
    en: 'Decision',
    es: 'Decisión',
  },
  dec_increase_weight: { en: 'Increase weight', es: 'Subir peso' },
  dec_increase_reps: { en: 'Increase reps', es: 'Subir repeticiones' },
  dec_harder_variant: { en: 'Harder variant', es: 'Variante más difícil' },
  dec_different_exercise: { en: 'Different exercise', es: 'Ejercicio distinto' },
  dec_reduce_volume: { en: 'Reduce volume (deload)', es: 'Reducir volumen (descarga)' },
  dec_hold: { en: 'Hold steady', es: 'Mantener' },
  dec_caution: { en: 'Caution', es: 'Precaución' },
  confidence: { en: 'Confidence', es: 'Confianza' },
  conf_low: { en: 'low', es: 'baja' },
  conf_medium: { en: 'medium', es: 'media' },
  conf_high: { en: 'high', es: 'alta' },

  // ----------------------------------------------------------------- coach
  coachTitle: { en: 'Coach', es: 'Entrenador' },
  routineTab: { en: 'Build a session', es: 'Crear sesión' },
  qaTab: { en: 'Ask about my data', es: 'Preguntar sobre mis datos' },
  routinePlaceholder: {
    en: 'e.g. "solo lower hoy", "quiero velocidad", "hay piscina"',
    es: 'p. ej. «solo lower hoy», «quiero velocidad», «hay piscina»',
  },
  questionPlaceholder: {
    en: 'e.g. "how has my bench moved over the last month?"',
    es: 'p. ej. «¿cómo ha evolucionado mi press de banca este mes?»',
  },
  generate: { en: 'Generate', es: 'Generar' },
  ask: { en: 'Ask', es: 'Preguntar' },
  useRoutine: { en: 'Start this session', es: 'Empezar esta sesión' },
  readOnlyNote: {
    en: 'Read-only. The coach can never edit or delete anything you logged.',
    es: 'Solo lectura. El entrenador nunca puede editar ni borrar lo que registraste.',
  },
  cautions: { en: 'Cautions', es: 'Precauciones' },
  caveats: { en: 'Caveats', es: 'Matices' },
  coachNoBackend: {
    en: 'This is the static build — the AI coach needs the serverless function, which GitHub Pages cannot run. Everything else works. Deploy on Vercel to enable the coach.',
    es: 'Esta es la versión estática — el entrenador IA necesita la función serverless, que GitHub Pages no puede correr. Todo lo demás funciona. Despliega en Vercel para activarlo.',
  },
  coachDisabled: {
    en: 'The coach needs ANTHROPIC_API_KEY set on the server. Everything else works without it.',
    es: 'El entrenador necesita ANTHROPIC_API_KEY en el servidor. Todo lo demás funciona sin ella.',
  },

  // --------------------------------------------------------------- profile
  profile: { en: 'Profile', es: 'Perfil' },
  areasOfConcern: { en: 'Areas of concern', es: 'Zonas sensibles' },
  areasOfConcernHelp: {
    en: 'An open list. Any exercise that loads one of these triggers a non-blocking popup, with a 48h cooldown.',
    es: 'Una lista abierta. Cualquier ejercicio que cargue una de estas lanza un aviso no bloqueante, con 48 h de espera.',
  },
  bodyPart: { en: 'Body part', es: 'Zona del cuerpo' },
  concernNote: { en: 'Note', es: 'Nota' },
  concernNotePlaceholder: {
    en: 'What happens, and when',
    es: 'Qué pasa, y cuándo',
  },
  addConcern: { en: 'Add area of concern', es: 'Añadir zona sensible' },
  noConcerns: { en: 'No areas flagged.', es: 'No hay zonas marcadas.' },
  progressionMap: { en: 'Progression map', es: 'Mapa de progresión' },
  progressionHelp: {
    en: 'Scoped to the lifts you actually train, branched by your goal.',
    es: 'Limitado a los ejercicios que realmente entrenas, según tu objetivo.',
  },
  progressTo: { en: 'Progress to', es: 'Progresar a' },
  regressTo: { en: 'Regress to', es: 'Regresar a' },
  missingEquipment: { en: 'equipment missing', es: 'falta equipo' },
  loadsConcern: { en: 'loads {part}', es: 'carga {part}' },
  targets: { en: 'Next-session targets', es: 'Objetivos de la próxima sesión' },
  noTargets: { en: 'No targets set.', es: 'Sin objetivos definidos.' },
  clearTarget: { en: 'Clear', es: 'Borrar' },
  apiKeyTitle: { en: 'AI coach key', es: 'Clave del entrenador IA' },
  apiKeyHelp: {
    en: 'Only needed on a static host like GitHub Pages, which cannot run the backend. Paste your Anthropic key and the coach starts working.',
    es: 'Solo hace falta en un host estático como GitHub Pages, que no puede correr el backend. Pega tu clave de Anthropic y el entrenador empieza a funcionar.',
  },
  apiKeyWarning: {
    en: 'Stored in this browser only, and sent straight to Anthropic from this device. Anyone with access to this browser can read it. The safer option is deploying on Vercel with the key as a server environment variable — then leave this empty.',
    es: 'Se guarda solo en este navegador y se envía directo a Anthropic desde este dispositivo. Cualquiera con acceso a este navegador puede leerla. Lo más seguro es desplegar en Vercel con la clave como variable de entorno del servidor — entonces deja esto vacío.',
  },
  apiKeySaved: { en: 'Key saved in this browser', es: 'Clave guardada en este navegador' },
  apiKeyClear: { en: 'Remove key', es: 'Quitar clave' },
  badApiKey: { en: 'Anthropic rejected that key.', es: 'Anthropic rechazó esa clave.' },
  data: { en: 'Data', es: 'Datos' },
  exportData: { en: 'Export', es: 'Exportar' },
  importData: { en: 'Import', es: 'Importar' },
  resetData: { en: 'Reset everything', es: 'Borrar todo' },
  resetConfirm: {
    en: 'Delete every session, template and setting? This cannot be undone.',
    es: '¿Eliminar todas las sesiones, plantillas y ajustes? No se puede deshacer.',
  },
  importFailed: { en: 'Import failed — file was not valid.', es: 'Importación fallida — archivo no válido.' },
  formOnlyNote: {
    en: 'All edits happen through forms and buttons. Chat never writes to your log.',
    es: 'Todas las ediciones ocurren con formularios y botones. El chat nunca escribe en tu registro.',
  },
};

export function t(lang, key, vars) {
  const entry = STRINGS[key];
  let text = entry?.[lang] ?? entry?.en ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v));
  }
  return text;
}

/** Curried helper so components can do `const tr = useT()` then `tr('save')`. */
export const translator = (lang) => (key, vars) => t(lang, key, vars);
