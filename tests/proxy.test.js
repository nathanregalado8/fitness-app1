import test from 'node:test';
import assert from 'node:assert/strict';
import { validateChat, validateQA, validateRoutine, validateSuggestions } from '../src/lib/aiProtocol.js';

const ALLOWED = ['barbell-bench-press', 'incline-barbell-press'];

test('a well-formed suggestion survives validation', () => {
  const out = validateSuggestions(
    {
      overall_note: 'Solid session.',
      suggestions: [
        {
          exercise_id: 'barbell-bench-press',
          decision: 'increase_weight',
          reasoning: 'All target reps hit across three sessions.',
          confidence: 'high',
          target: { weight: 102.5, reps: 8, exercise_id: null },
        },
      ],
    },
    ALLOWED
  );

  assert.equal(out.overallNote, 'Solid session.');
  assert.equal(out.suggestions.length, 1);
  assert.deepEqual(out.suggestions[0].target, { weight: 102.5, reps: 8, exerciseId: null });
});

test('suggestions naming an unknown exercise are dropped', () => {
  const out = validateSuggestions(
    {
      overall_note: 'x',
      suggestions: [
        { exercise_id: 'made-up-lift', decision: 'increase_weight', reasoning: 'nope', confidence: 'high' },
      ],
    },
    ALLOWED
  );
  assert.equal(out.suggestions.length, 0);
});

test('an invented decision value is rejected', () => {
  const out = validateSuggestions(
    {
      overall_note: 'x',
      suggestions: [
        { exercise_id: 'barbell-bench-press', decision: 'delete_history', reasoning: 'no', confidence: 'high' },
      ],
    },
    ALLOWED
  );
  assert.equal(out.suggestions.length, 0);
});

test('a target pointing at an exercise outside the catalog is stripped, not trusted', () => {
  const out = validateSuggestions(
    {
      overall_note: 'x',
      suggestions: [
        {
          exercise_id: 'barbell-bench-press',
          decision: 'harder_variant',
          reasoning: 'Ready for a harder angle.',
          confidence: 'medium',
          target: { weight: null, reps: null, exercise_id: 'not-a-real-exercise' },
        },
      ],
    },
    ALLOWED
  );
  assert.equal(out.suggestions[0].target, null);
});

test('an empty suggestion list is a valid outcome', () => {
  const out = validateSuggestions({ overall_note: 'Nothing to change.', suggestions: [] }, ALLOWED);
  assert.deepEqual(out.suggestions, []);
  assert.equal(out.overallNote, 'Nothing to change.');
});

test('a malformed payload degrades to empty rather than throwing', () => {
  assert.doesNotThrow(() => validateSuggestions(null, ALLOWED));
  assert.deepEqual(validateSuggestions(undefined, ALLOWED).suggestions, []);
  assert.deepEqual(validateSuggestions({ suggestions: 'not-an-array' }, ALLOWED).suggestions, []);
});

test('routine blocks are filtered to the catalog and clamped to sane ranges', () => {
  const out = validateRoutine(
    {
      title: 'Lower',
      summary: 'Legs today.',
      session_type: 'legs',
      blocks: [
        { exercise_id: 'barbell-bench-press', sets: 99, target_reps: 8 },
        { exercise_id: 'ghost-exercise', sets: 3, target_reps: 10 },
      ],
      cautions: ['Knee is flagged.'],
      avoided_muscles: ['quads'],
    },
    ALLOWED
  );

  assert.equal(out.blocks.length, 1);
  assert.equal(out.blocks[0].sets, 10, 'clamped to the maximum');
  assert.equal(out.sessionType, 'legs');
  assert.deepEqual(out.cautions, ['Knee is flagged.']);
});

test('an unknown session type falls back to custom', () => {
  const out = validateRoutine({ title: 'x', summary: 'y', session_type: 'moon-day', blocks: [] }, ALLOWED);
  assert.equal(out.sessionType, 'custom');
});

test('QA answers keep only well-formed data points', () => {
  const out = validateQA({
    answer: 'Your bench went up 5kg.',
    data_points: [{ label: 'Top set', value: '100kg' }, { label: '', value: '' }, 'junk'],
    caveats: ['Only four sessions logged.'],
  });

  assert.equal(out.answer, 'Your bench went up 5kg.');
  assert.equal(out.dataPoints.length, 1);
  assert.equal(out.caveats.length, 1);
});

// ------------------------------------------------- request shape / key safety

test('every request forces the tool call on the single configured model', async () => {
  const { MODEL, buildRequest, messagesBody } = await import('../src/lib/aiProtocol.js');
  const signals = { schema: 'fitness-app1/layer1@1', profile: { language: 'es' }, perExercise: [] };

  for (const [action, tool] of [
    ['suggestion', 'record_suggestions'],
    ['routine', 'propose_routine'],
    ['qa', 'answer_question'],
    ['chat', 'coach_reply'],
  ]) {
    const body = messagesBody(
      buildRequest(action, { signals, catalog: [], request: 'x', question: 'x', message: 'x' })
    );
    assert.equal(body.model, MODEL);
    assert.equal(body.model, 'claude-sonnet-5', 'spec pins one model for all Layer 2 calls');
    assert.deepEqual(body.tool_choice, { type: 'tool', name: tool }, `${action} must force its tool`);
    assert.equal(body.tools.length, 1);
    // Sampling params are rejected by this model and must never be sent.
    assert.equal(body.temperature, undefined);
    assert.equal(body.top_p, undefined);
  }
});

test('the user language reaches the prompt', async () => {
  const { buildRequest } = await import('../src/lib/aiProtocol.js');
  const es = buildRequest('qa', { signals: { schema: 'fitness-app1/layer1@1', profile: { language: 'es' } } });
  const en = buildRequest('qa', { signals: { schema: 'fitness-app1/layer1@1', profile: { language: 'en' } } });
  assert.match(es.system, /Spanish/);
  assert.match(en.system, /English/);
});

test('an exported backup never carries the API key', async () => {
  const { defaultState, exportState } = await import('../src/lib/storage.js');
  const state = defaultState();
  state.profile.apiKey = 'sk-ant-secret-value';

  const dump = exportState(state);
  assert.ok(!dump.includes('sk-ant-secret-value'), 'key must be stripped from exports');
  assert.equal(JSON.parse(dump).profile.apiKey, undefined);
  assert.equal(JSON.parse(dump).profile.goal, state.profile.goal, 'the rest of the profile survives');
});

// ------------------------------------------------------------------- chat

test('the chat request carries the date, the catalog and the thread', async () => {
  const { buildRequest } = await import('../src/lib/aiProtocol.js');
  const spec = buildRequest('chat', {
    signals: { schema: 'fitness-app1/layer1@1', profile: { language: 'es' } },
    catalog: [{ id: 'back-squat' }],
    today: { date: '2026-08-05', isNewDay: true },
    history: [{ role: 'user', text: 'ayer', date: '2026-08-04' }],
    message: 'hoy que toca',
  });

  assert.equal(spec.tool.name, 'coach_reply');
  assert.match(spec.content, /<today>/);
  assert.match(spec.content, /isNewDay/);
  assert.match(spec.content, /<exercise_catalog>/);
  // The model has to be told the thread may be from an earlier day.
  assert.match(spec.system, /fresh day/);
});

test('the chat can only propose changes this app knows how to apply', () => {
  const { proposals } = validateChat(
    {
      reply: 'ok',
      proposals: [
        { kind: 'set_target', label: 'Sube', exercise_id: 'back-squat', weight: 120, reps: 5 },
        { kind: 'set_target', label: 'Sube', exercise_id: 'not-a-real-lift', weight: 100 },
        { kind: 'set_target', label: 'Nada', exercise_id: 'back-squat' },
        { kind: 'delete_history', label: 'Borra todo' },
        { kind: 'set_profile', label: 'Cambia', goal: 'strength', days_per_week: 99 },
        { kind: 'set_equipment', label: 'Añade', equipment: 'jetpack' },
        { kind: 'build_session', label: 'Empieza', session_type: 'push', exercises: [] },
      ],
    },
    ['back-squat']
  );

  const kinds = proposals.map((p) => p.kind);
  assert.deepEqual(kinds, ['set_target', 'set_profile']);
  assert.equal(proposals[0].exerciseId, 'back-squat');
  // Out-of-range values are clamped rather than trusted.
  assert.equal(proposals[1].fields.daysPerWeek, 7);
  // Nothing in the tool schema can reach historical logs.
  assert.ok(!kinds.includes('delete_history'));
});

test('a proposed session drops exercises the model invented', () => {
  const { proposals } = validateChat(
    {
      reply: 'listo',
      proposals: [
        {
          kind: 'build_session',
          label: 'Empezar',
          session_type: 'push',
          exercises: [
            { exercise_id: 'barbell-bench-press', sets: 4, target_reps: 8, rest_sec: 120 },
            { exercise_id: 'hyperbolic-press', sets: 3, target_reps: 10 },
          ],
        },
      ],
    },
    ['barbell-bench-press']
  );

  assert.equal(proposals.length, 1);
  assert.deepEqual(proposals[0].blocks.map((b) => b.exerciseId), ['barbell-bench-press']);
  assert.equal(proposals[0].blocks[0].restSec, 120);
});
