/**
 * Shared Layer 2 protocol.
 *
 * Model, tool schemas, system prompt, request shape and response validation —
 * imported by BOTH the serverless proxy (api/ai.js) and the browser fallback
 * (lib/aiClient.js), so the two can never drift. Whichever path a request
 * takes, it is the same forced tool call and the same server-side-grade
 * validation before anything reaches the UI.
 *
 * This module holds no credentials.
 */

/** Single model for all Layer 2 calls, per spec. */
export const MODEL = 'claude-sonnet-5';
export const MAX_TOKENS = 8000;
export const MAX_PAYLOAD_BYTES = 256 * 1024;

/** Payloads must carry this tag; anything else is rejected before a call. */
export const SIGNALS_SCHEMA = 'fitness-app1/layer1@1';

const SESSION_TYPES = ['push', 'pull', 'legs', 'full_body', 'cardio', 'hike', 'swim', 'custom'];

const DECISIONS = [
  'increase_weight',
  'increase_reps',
  'harder_variant',
  'different_exercise',
  'reduce_volume',
  'hold',
  'caution',
];

// --------------------------------------------------------------- tool schemas

const SUGGESTION_TOOL = {
  name: 'record_suggestions',
  description:
    'Record your coaching decision for the exercises just logged. Return an empty ' +
    'suggestions array when nothing is worth changing — saying nothing is a valid outcome.',
  input_schema: {
    type: 'object',
    properties: {
      overall_note: {
        type: 'string',
        description:
          'One or two sentences summarising the session, written directly to the user in their language.',
      },
      suggestions: {
        type: 'array',
        description: 'Zero or more per-exercise decisions. Only include exercises worth acting on.',
        items: {
          type: 'object',
          properties: {
            exercise_id: {
              type: 'string',
              description: 'Must be one of the exercise ids present in the signals payload.',
            },
            decision: { type: 'string', enum: DECISIONS },
            reasoning: {
              type: 'string',
              description:
                'Why, in the user\'s language, referring to the actual numbers in the signals. ' +
                'Two or three sentences at most.',
            },
            confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
            target: {
              type: 'object',
              description:
                'The concrete target for the next occurrence of this exercise. Omit for hold/caution decisions.',
              properties: {
                weight: { type: ['number', 'null'] },
                reps: { type: ['number', 'null'] },
                exercise_id: {
                  type: ['string', 'null'],
                  description:
                    'Set only for harder_variant / different_exercise, and only to an id from the allowed catalog.',
                },
              },
              required: [],
            },
            caution: {
              type: 'object',
              description: 'Populate when an area of concern is implicated.',
              properties: {
                body_part: { type: ['string', 'null'] },
                message: { type: ['string', 'null'] },
              },
              required: [],
            },
          },
          required: ['exercise_id', 'decision', 'reasoning', 'confidence'],
        },
      },
    },
    required: ['overall_note', 'suggestions'],
  },
};

const ROUTINE_TOOL = {
  name: 'propose_routine',
  description: 'Propose a single training session built from the allowed exercise catalog.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: "Short session title in the user's language." },
      summary: {
        type: 'string',
        description: 'Two or three sentences explaining the shape of the session and why.',
      },
      session_type: { type: 'string', enum: SESSION_TYPES },
      blocks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            exercise_id: { type: 'string', description: 'Must come from the allowed catalog.' },
            sets: { type: 'number' },
            target_reps: { type: 'number' },
            target_weight: { type: ['number', 'null'] },
            note: { type: ['string', 'null'] },
          },
          required: ['exercise_id', 'sets', 'target_reps'],
        },
      },
      cautions: {
        type: 'array',
        description: 'Warnings tied to areas of concern or recent training load.',
        items: { type: 'string' },
      },
      avoided_muscles: {
        type: 'array',
        description: 'Muscle ids deliberately left out because they were trained recently.',
        items: { type: 'string' },
      },
    },
    required: ['title', 'summary', 'session_type', 'blocks'],
  },
};

const QA_TOOL = {
  name: 'answer_question',
  description: "Answer a read-only question about the user's own logged training data.",
  input_schema: {
    type: 'object',
    properties: {
      answer: { type: 'string', description: "The answer, in the user's language." },
      data_points: {
        type: 'array',
        description: 'The specific figures from the signals that support the answer.',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string' },
            value: { type: 'string' },
          },
          required: ['label', 'value'],
        },
      },
      caveats: {
        type: 'array',
        description: 'Anything the logged data cannot actually tell you.',
        items: { type: 'string' },
      },
    },
    required: ['answer', 'data_points'],
  },
};

/**
 * Conversational coaching.
 *
 * The reply is prose, but anything that would *change* the app comes back as a
 * typed proposal, never as an instruction hidden in text. Each proposal renders
 * as a button the user has to press. The model cannot write to the log, and it
 * cannot touch anything already recorded.
 */
const CHAT_TOOL = {
  name: 'coach_reply',
  description: 'Reply to the user, and optionally propose changes they can confirm.',
  input_schema: {
    type: 'object',
    properties: {
      reply: { type: 'string', description: "Your answer, in the user's language. Two or three sentences." },
      proposals: {
        type: 'array',
        description:
          'Changes the user could accept. Leave empty when the message needs no change — ' +
          'most messages do not. Never propose anything the user did not ask about.',
        items: {
          type: 'object',
          properties: {
            kind: {
              type: 'string',
              enum: [
                'set_target',
                'flag_concern',
                'clear_concern',
                'set_profile',
                'set_equipment',
                'build_session',
              ],
              description:
                'set_target: a weight/rep target for the next time they do that exercise. ' +
                'flag_concern / clear_concern: add or remove a body part on the areas-of-concern list. ' +
                'set_profile: change goal, days per week or units. ' +
                'set_equipment: add or drop a piece of equipment they have access to. ' +
                'build_session: a full session they can start immediately — use this whenever ' +
                'they ask to add an exercise, swap one, or train something specific today.',
            },
            label: { type: 'string', description: 'Button text, imperative, in the user\'s language.' },
            exercise_id: { type: 'string', description: 'Required for set_target. Must appear in the payload.' },
            weight: { type: 'number' },
            reps: { type: 'number' },
            body_part: { type: 'string', description: 'Required for flag_concern and clear_concern.' },
            note: { type: 'string' },
            goal: { type: 'string', enum: ['strength', 'hypertrophy', 'endurance', 'general'] },
            days_per_week: { type: 'number' },
            units: { type: 'string', enum: ['kg', 'lb'] },
            equipment: { type: 'string', description: 'Equipment id, for set_equipment.' },
            enabled: { type: 'boolean', description: 'For set_equipment: true adds it, false drops it.' },
            session_type: { type: 'string', enum: SESSION_TYPES, description: 'For build_session.' },
            exercises: {
              type: 'array',
              description: 'For build_session: the exercises, in the order they should be trained.',
              items: {
                type: 'object',
                properties: {
                  exercise_id: { type: 'string' },
                  sets: { type: 'number' },
                  target_reps: { type: 'number' },
                  target_weight: { type: 'number' },
                  rest_sec: { type: 'number' },
                },
                required: ['exercise_id', 'sets', 'target_reps'],
              },
            },
          },
          required: ['kind', 'label'],
        },
      },
    },
    required: ['reply'],
  },
};

// -------------------------------------------------------------- system prompt

const SHARED_SYSTEM = `You are the coaching layer of a personal training log.

You receive only pre-computed signals — never raw workout logs. Everything you
know about this user is in the JSON payload you are given.

Apply general resistance-training domain knowledge from your own training. Weigh
session count, trend and rep-completion consistency differently depending on the
exercise's movement type and the size class of the muscles it loads: large
compound movements (legs, back, chest) accumulate fatigue and add load
differently from small isolation work (biceps, triceps, calves, abs). A small
isolation lift that stalls for two sessions means something different from a
heavy compound that stalls for two sessions.

Rules:
- There is no fixed session count that triggers a change. Judge each exercise on
  its own trend, consistency and recency.
- Recommending nothing is a legitimate and common outcome. Do not invent a
  change to look useful.
- Never claim to consult studies, external sources or the live internet, and
  never fabricate citations. You are drawing on your own training knowledge.
- Never suggest editing or deleting anything already logged. Your only forward
  write is a target for the next session, and only if the user confirms it.
- If an area of concern is implicated by an exercise, say so plainly and
  conservatively. You are not a medical professional; do not diagnose.
- Only ever reference exercise ids that appear in the payload you were given.
- Write user-facing text in the language given by profile.language ("es" =
  Spanish, "en" = English). Field names stay in English.
- Be concrete and brief. Refer to the actual numbers.`;

// -------------------------------------------------------------------- helpers

export function buildRequest(action, payload) {
  const lang = payload?.signals?.profile?.language === 'es' ? 'Spanish' : 'English';

  if (action === 'suggestion') {
    return {
      tool: SUGGESTION_TOOL,
      effort: 'high',
      system: `${SHARED_SYSTEM}\n\nTask: a session has just been logged. Decide, per exercise, whether to suggest anything for the next occurrence. Write in ${lang}.`,
      content:
        'A session was just logged. Here are the Layer 1 signals.\n\n' +
        `<signals>\n${JSON.stringify(payload.signals)}\n</signals>\n\n` +
        (payload.userContext
          ? `<user_context>${String(payload.userContext).slice(0, 2000)}</user_context>\n\n`
          : '') +
        'Call record_suggestions exactly once.',
    };
  }

  if (action === 'routine') {
    return {
      tool: ROUTINE_TOOL,
      effort: 'high',
      system:
        `${SHARED_SYSTEM}\n\nTask: build one training session. Default to the user's normal ` +
        `push/pull/legs order (profile.pplOrder) unless their free-text request overrides it. ` +
        `Respect recovery: prefer muscle groups with more days since last trained. Use only ` +
        `exercises from the catalog. Write in ${lang}.`,
      content:
        `<signals>\n${JSON.stringify(payload.signals)}\n</signals>\n\n` +
        `<exercise_catalog>\n${JSON.stringify(payload.catalog ?? [])}\n</exercise_catalog>\n\n` +
        `<request>${String(payload.request ?? '').slice(0, 2000)}</request>\n\n` +
        'Call propose_routine exactly once.',
    };
  }

  if (action === 'chat') {
    return {
      tool: CHAT_TOOL,
      effort: 'medium',
      system:
        `${SHARED_SYSTEM}\n\nTask: you are in a conversation with the user about their training. ` +
        `Answer from the signals. The <today> block tells you the current date and how the ` +
        `conversation sits relative to it — if the last exchange was on an earlier day, treat this ` +
        `as a fresh day and pick up accordingly rather than continuing yesterday's session. ` +
        `If — and only if — the conversation calls for a concrete change, attach it as a proposal; ` +
        `the user must press a button for it to happen, so never describe a change as already made. ` +
        `Most turns need no proposal at all. Write in ${lang}.`,
      content:
        `<today>\n${JSON.stringify(payload.today ?? {})}\n</today>\n\n` +
        `<signals>\n${JSON.stringify(payload.signals)}\n</signals>\n\n` +
        `<exercise_catalog>\n${JSON.stringify(payload.catalog ?? [])}\n</exercise_catalog>\n\n` +
        `<conversation>\n${JSON.stringify(payload.history ?? [])}\n</conversation>\n\n` +
        `<message>${String(payload.message ?? '').slice(0, 2000)}</message>\n\n` +
        'Call coach_reply exactly once.',
    };
  }

  if (action === 'qa') {
    return {
      tool: QA_TOOL,
      effort: 'medium',
      system:
        `${SHARED_SYSTEM}\n\nTask: answer a read-only question about the user's own data. ` +
        `If the signals do not contain the answer, say so instead of guessing. Write in ${lang}.`,
      content:
        `<signals>\n${JSON.stringify(payload.signals)}\n</signals>\n\n` +
        `<question>${String(payload.question ?? '').slice(0, 2000)}</question>\n\n` +
        'Call answer_question exactly once.',
    };
  }

  return null;
}

/** Extract the forced tool call. Never parses free text. */
export function extractToolInput(message, toolName) {
  const block = (message.content ?? []).find((b) => b.type === 'tool_use' && b.name === toolName);
  return block ? block.input : null;
}

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v, max = 1200) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

export function validateSuggestions(input, allowedIds) {
  const allowed = new Set(allowedIds);
  const raw = Array.isArray(input?.suggestions) ? input.suggestions : [];

  const suggestions = raw
    .filter((s) => allowed.has(s?.exercise_id) && DECISIONS.includes(s?.decision) && str(s?.reasoning))
    .slice(0, 8)
    .map((s) => {
      const targetExercise = allowed.has(s?.target?.exercise_id) ? s.target.exercise_id : null;
      const weight = num(s?.target?.weight);
      const reps = num(s?.target?.reps);
      const hasTarget = weight != null || reps != null || targetExercise != null;
      return {
        exerciseId: s.exercise_id,
        decision: s.decision,
        reasoning: str(s.reasoning),
        confidence: ['low', 'medium', 'high'].includes(s.confidence) ? s.confidence : 'medium',
        target: hasTarget ? { weight, reps, exerciseId: targetExercise } : null,
        caution: str(s?.caution?.message)
          ? { bodyPart: str(s.caution.body_part, 60), message: str(s.caution.message) }
          : null,
      };
    });

  return { overallNote: str(input?.overall_note, 600) ?? '', suggestions };
}

export function validateRoutine(input, allowedIds) {
  const allowed = new Set(allowedIds);
  const blocks = (Array.isArray(input?.blocks) ? input.blocks : [])
    .filter((b) => allowed.has(b?.exercise_id))
    .slice(0, 12)
    .map((b) => ({
      exerciseId: b.exercise_id,
      sets: Math.min(Math.max(Math.round(num(b.sets) ?? 3), 1), 10),
      targetReps: Math.min(Math.max(Math.round(num(b.target_reps) ?? 8), 1), 100),
      targetWeight: num(b.target_weight),
      note: str(b.note, 240),
    }));

  return {
    title: str(input?.title, 120) ?? 'Session',
    summary: str(input?.summary, 900) ?? '',
    sessionType: SESSION_TYPES.includes(input?.session_type) ? input.session_type : 'custom',
    blocks,
    cautions: (Array.isArray(input?.cautions) ? input.cautions : [])
      .map((c) => str(c, 300))
      .filter(Boolean)
      .slice(0, 6),
    avoidedMuscles: (Array.isArray(input?.avoided_muscles) ? input.avoided_muscles : [])
      .map((m) => str(m, 40))
      .filter(Boolean)
      .slice(0, 13),
  };
}

export function validateQA(input) {
  return {
    answer: str(input?.answer, 2500) ?? '',
    dataPoints: (Array.isArray(input?.data_points) ? input.data_points : [])
      .filter((d) => str(d?.label) && str(d?.value))
      .slice(0, 10)
      .map((d) => ({ label: str(d.label, 80), value: str(d.value, 120) })),
    caveats: (Array.isArray(input?.caveats) ? input.caveats : [])
      .map((c) => str(c, 300))
      .filter(Boolean)
      .slice(0, 5),
  };
}

const BODY_PART_RE = /^[a-z_]{2,30}$/;
const GOALS = ['strength', 'hypertrophy', 'endurance', 'general'];
const clampInt = (v, lo, hi, fallback) => {
  const n = num(v);
  return n == null ? fallback : Math.min(hi, Math.max(lo, Math.round(n)));
};

/**
 * Only typed, whitelisted proposals survive, and each one must carry a payload
 * this app knows how to apply. Free text never becomes an action, and an
 * exercise id the model invented is dropped rather than shown.
 */
export function validateChat(input, allowedIds) {
  const allowed = new Set(allowedIds);
  const raw = Array.isArray(input?.proposals) ? input.proposals : [];

  const build = (pr) => {
    const base = { kind: pr.kind, label: str(pr.label, 80), note: str(pr.note, 240) ?? '' };

    if (pr.kind === 'set_target') {
      if (!allowed.has(pr.exercise_id)) return null;
      const weight = num(pr.weight);
      const reps = num(pr.reps);
      if (weight == null && reps == null) return null;
      return { ...base, exerciseId: pr.exercise_id, weight, reps };
    }

    if (pr.kind === 'flag_concern' || pr.kind === 'clear_concern') {
      if (!BODY_PART_RE.test(String(pr.body_part ?? ''))) return null;
      return { ...base, bodyPart: String(pr.body_part) };
    }

    if (pr.kind === 'set_profile') {
      const fields = {};
      if (GOALS.includes(pr.goal)) fields.goal = pr.goal;
      if (num(pr.days_per_week) != null) fields.daysPerWeek = clampInt(pr.days_per_week, 1, 7, 4);
      if (pr.units === 'kg' || pr.units === 'lb') fields.units = pr.units;
      if (Object.keys(fields).length === 0) return null;
      return { ...base, fields };
    }

    if (pr.kind === 'set_equipment') {
      if (!EQUIPMENT_IDS.includes(pr.equipment)) return null;
      return { ...base, equipment: pr.equipment, enabled: pr.enabled !== false };
    }

    if (pr.kind === 'build_session') {
      const blocks = (Array.isArray(pr.exercises) ? pr.exercises : [])
        .filter((b) => allowed.has(b?.exercise_id))
        .slice(0, 12)
        .map((b) => ({
          exerciseId: b.exercise_id,
          sets: clampInt(b.sets, 1, 10, 3),
          targetReps: clampInt(b.target_reps, 1, 100, 10),
          targetWeight: num(b.target_weight),
          restSec: clampInt(b.rest_sec, 15, 300, 90),
        }));
      if (blocks.length === 0) return null;
      return {
        ...base,
        sessionType: SESSION_TYPES.includes(pr.session_type) ? pr.session_type : 'custom',
        blocks,
      };
    }

    return null;
  };

  const proposals = raw
    .filter((pr) => str(pr?.label, 80))
    .map(build)
    .filter(Boolean)
    .slice(0, 4);

  return { reply: str(input?.reply, 2000) ?? '', proposals };
}

/** Equipment the app understands. Kept here so the validator owns the list. */
export const EQUIPMENT_IDS = [
  'barbell', 'dumbbells', 'machine', 'cable', 'bench', 'rack', 'bar', 'bars',
  'bodyweight', 'bike', 'pool', 'rope', 'kettlebell', 'band', 'sled',
];

export function allowedExerciseIds(action, payload) {
  const fromSignals = (payload?.signals?.perExercise ?? []).map((e) => e.exerciseId);
  const fromCatalog = (payload?.catalog ?? []).map((e) => e.id ?? e.exerciseId).filter(Boolean);
  return [...new Set([...fromSignals, ...fromCatalog])];
}


/** Route a tool result through the validator for its action. */
export function validateFor(action, input, allowedIds) {
  if (action === 'suggestion') return validateSuggestions(input, allowedIds);
  if (action === 'routine') return validateRoutine(input, allowedIds);
  if (action === 'chat') return validateChat(input, allowedIds);
  return validateQA(input);
}

/**
 * The Messages API request body for one action. Identical on both paths — the
 * only difference is who holds the credential.
 */
export function messagesBody(spec) {
  return {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: spec.system,
    tools: [spec.tool],
    tool_choice: { type: 'tool', name: spec.tool.name },
    output_config: { effort: spec.effort },
    messages: [{ role: 'user', content: spec.content }],
  };
}
