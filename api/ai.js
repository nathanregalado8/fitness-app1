/**
 * LAYER 2 — backend AI proxy (spec Phase 4).
 *
 * The single place ANTHROPIC_API_KEY is ever read. The browser posts Layer 1
 * signals here; this function calls the Anthropic Messages API and returns
 * structured data. The key is never bundled into the frontend.
 *
 * Every call:
 *   - uses one model (claude-sonnet-5) — no model-switching logic
 *   - forces a tool call with `tool_choice: {type:'tool'}`, so output is always
 *     structured tool input, never regex-parsed free text
 *   - is validated server-side before anything is returned to the client
 *
 * This function has no write access to logs. The only thing the client is
 * allowed to persist from a response is a next-session target, and only after
 * the user explicitly confirms it in the suggestion card.
 *
 * Runtime: Node (Vercel serverless function, or the dev bridge in
 * vite.config.js — both call the default export with (req, res)).
 */

import Anthropic from '@anthropic-ai/sdk';

/** Single model for all Layer 2 calls, per spec. */
const MODEL = 'claude-sonnet-5';
const MAX_TOKENS = 8000;
const MAX_PAYLOAD_BYTES = 256 * 1024;

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

function buildRequest(action, payload) {
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
function extractToolInput(message, toolName) {
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

function allowedExerciseIds(action, payload) {
  const fromSignals = (payload?.signals?.perExercise ?? []).map((e) => e.exerciseId);
  const fromCatalog = (payload?.catalog ?? []).map((e) => e.id ?? e.exerciseId).filter(Boolean);
  return [...new Set([...fromSignals, ...fromCatalog])];
}

/**
 * One Messages API call with the tool forced.
 *
 * Sonnet 5 runs adaptive thinking by default, which is what we want for a
 * judgment call. If a deployment target rejects forced tool_choice alongside
 * thinking (Bedrock requires thinking disabled for forced tool use), retry
 * once with thinking off rather than failing the request.
 */
async function callClaude(client, { tool, system, content, effort }) {
  const base = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system,
    tools: [tool],
    tool_choice: { type: 'tool', name: tool.name },
    output_config: { effort },
    messages: [{ role: 'user', content }],
  };

  try {
    return await client.messages.create(base);
  } catch (err) {
    const msg = String(err?.message ?? '');
    const retryable = err?.status === 400 && /thinking|tool_choice/i.test(msg);
    if (!retryable) throw err;
    return client.messages.create({ ...base, thinking: { type: 'disabled' } });
  }
}

// ------------------------------------------------------------------- handler

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: { code: 'method_not_allowed' } });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      ok: false,
      error: {
        code: 'missing_api_key',
        message:
          'ANTHROPIC_API_KEY is not set on the server. Add it as an environment variable ' +
          '(and as a GitHub repo secret for CI). The app works fully without it — only the ' +
          'AI coach is disabled.',
      },
    });
  }

  const { action, payload } = req.body ?? {};
  const spec = buildRequest(action, payload ?? {});
  if (!spec) {
    return res.status(400).json({ ok: false, error: { code: 'unknown_action', message: String(action) } });
  }

  if (JSON.stringify(payload ?? {}).length > MAX_PAYLOAD_BYTES) {
    return res.status(413).json({ ok: false, error: { code: 'payload_too_large' } });
  }
  if (payload?.signals?.schema !== 'fitness-app1/layer1@1') {
    return res.status(400).json({ ok: false, error: { code: 'bad_signals_schema' } });
  }

  try {
    const client = new Anthropic({ apiKey });
    const message = await callClaude(client, spec);

    if (message.stop_reason === 'refusal') {
      return res.status(200).json({
        ok: false,
        error: { code: 'refusal', message: 'The model declined this request.' },
      });
    }

    const input = extractToolInput(message, spec.tool.name);
    if (!input) {
      return res.status(502).json({ ok: false, error: { code: 'no_tool_use' } });
    }

    const allowed = allowedExerciseIds(action, payload);
    const data =
      action === 'suggestion'
        ? validateSuggestions(input, allowed)
        : action === 'routine'
          ? validateRoutine(input, allowed)
          : validateQA(input);

    return res.status(200).json({
      ok: true,
      action,
      model: message.model,
      usage: {
        input_tokens: message.usage?.input_tokens ?? null,
        output_tokens: message.usage?.output_tokens ?? null,
      },
      data,
    });
  } catch (err) {
    const status = Number(err?.status) || 500;
    // Never echo the upstream error body — it can contain request context.
    return res.status(status >= 400 && status < 600 ? status : 500).json({
      ok: false,
      error: {
        code: err?.type ?? 'upstream_error',
        message: status === 429 ? 'Rate limited by the Anthropic API. Try again shortly.' : 'AI request failed.',
      },
    });
  }
}
