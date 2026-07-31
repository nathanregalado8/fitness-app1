import test from 'node:test';
import assert from 'node:assert/strict';
import { validateQA, validateRoutine, validateSuggestions } from '../api/ai.js';

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
