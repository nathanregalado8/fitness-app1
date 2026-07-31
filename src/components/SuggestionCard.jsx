import { useState } from 'react';
import { useApp } from '../state/store.jsx';
import { exerciseName } from '../data/exercises.js';
import { BODY_PARTS, bodyPartName } from '../data/muscles.js';
import { Button, Card, Field, NumberInput } from './ui.jsx';

/**
 * Suggestion card (spec Phase 4).
 *
 * Appears after a session is logged — never mid-set. Yes / No / Adjust, plus an
 * optional free-text comment tied to that decision, which can also add an
 * area-of-concern flag.
 *
 * "Yes" writes a target for the next occurrence of that exercise only. Nothing
 * here can touch historical logs.
 */
export default function SuggestionCard({ suggestion }) {
  const { state, lang, tr, actions } = useApp();
  const [adjusting, setAdjusting] = useState(false);
  const [weight, setWeight] = useState(suggestion.target?.weight ?? null);
  const [reps, setReps] = useState(suggestion.target?.reps ?? null);
  const [comment, setComment] = useState('');
  const [concernPart, setConcernPart] = useState(suggestion.caution?.bodyPart ?? '');

  const units = state.profile.units;
  const targetExerciseId = suggestion.target?.exerciseId ?? suggestion.exerciseId;

  const commit = (status) => {
    if (concernPart) actions.addConcern(concernPart, comment.trim());

    if (status === 'accepted' || status === 'adjusted') {
      actions.setTarget(targetExerciseId, {
        weight,
        reps,
        note: comment.trim() || suggestion.reasoning,
        source: status === 'adjusted' ? 'user_adjusted' : 'ai_suggestion',
        suggestionId: suggestion.id,
      });
    }

    actions.decideSuggestion(suggestion.id, status, {
      comment: comment.trim(),
      appliedTarget:
        status === 'accepted' || status === 'adjusted'
          ? { exerciseId: targetExerciseId, weight, reps }
          : null,
    });
  };

  const writesTarget = suggestion.target != null;

  return (
    <Card
      tone="accent"
      title={tr('suggestionTitle')}
      action={<span className="pill">{tr(`dec_${suggestion.decision}`)}</span>}
    >
      <div className="stack">
        <strong>{exerciseName(suggestion.exerciseId, lang)}</strong>
        <p className="small" style={{ margin: 0 }}>
          {suggestion.reasoning}
        </p>

        {suggestion.caution?.message && (
          <p className="small" style={{ margin: 0, color: 'var(--warn)' }}>
            ⚠ {suggestion.caution.message}
          </p>
        )}

        <span className="muted tiny">
          {tr('confidence')}: {tr(`conf_${suggestion.confidence}`)}
        </span>

        {writesTarget && (
          <div className="row row-tight small">
            <span className="muted">{tr('currentTarget')}:</span>
            {targetExerciseId !== suggestion.exerciseId && (
              <span className="pill">{exerciseName(targetExerciseId, lang)}</span>
            )}
            {adjusting ? (
              <>
                <NumberInput value={weight} onChange={setWeight} step="0.5" aria-label={tr('weight')} />
                <span className="muted">{units} ×</span>
                <NumberInput value={reps} onChange={setReps} aria-label={tr('reps')} />
              </>
            ) : (
              <strong>
                {weight ?? '—'} {units} × {reps ?? '—'}
              </strong>
            )}
          </div>
        )}

        <Field label={tr('commentLabel')}>
          <textarea
            value={comment}
            placeholder={tr('commentPlaceholder')}
            onChange={(e) => setComment(e.target.value)}
          />
        </Field>

        <Field label={tr('flagAsConcern')}>
          <select value={concernPart} onChange={(e) => setConcernPart(e.target.value)}>
            <option value="">— {tr('none')} —</option>
            {BODY_PARTS.map((p) => (
              <option key={p.id} value={p.id}>
                {bodyPartName(p.id, lang)}
              </option>
            ))}
          </select>
        </Field>

        <div className="row">
          {writesTarget && (
            <Button variant="primary" onClick={() => commit(adjusting ? 'adjusted' : 'accepted')}>
              {adjusting ? tr('save') : tr('applyTarget')}
            </Button>
          )}
          {writesTarget && !adjusting && (
            <Button onClick={() => setAdjusting(true)}>{tr('adjustTarget')}</Button>
          )}
          <Button variant="ghost" onClick={() => commit('declined')}>
            {writesTarget ? tr('declineTarget') : tr('dismiss')}
          </Button>
        </div>
      </div>
    </Card>
  );
}

/** Pending cards for a session, plus the job's own status. */
export function SuggestionQueue({ sessionId }) {
  const { state, tr } = useApp();
  const job = state.jobs[sessionId];
  const pending = state.suggestions.filter((s) => s.sessionId === sessionId && s.status === 'pending');

  if (!job) return null;

  if (job.status === 'running') {
    return (
      <Card>
        <span className="row row-tight small">
          <span className="spinner" /> {tr('suggestionRunning')}
        </span>
      </Card>
    );
  }

  if (job.status === 'error') {
    return (
      <Card tone="warn">
        <strong className="small">{tr('suggestionFailed')}</strong>
        <p className="muted tiny">
          {job.error === 'missing_api_key' ? tr('coachDisabled') : job.error}
        </p>
      </Card>
    );
  }

  if (job.status === 'done' && pending.length === 0) {
    return (
      <Card>
        <strong className="small">{tr('suggestionTitle')}</strong>
        <p className="small" style={{ margin: 0 }}>
          {job.overallNote || tr('suggestionNone')}
        </p>
      </Card>
    );
  }

  return (
    <>
      {job.overallNote && (
        <Card>
          <p className="small" style={{ margin: 0 }}>
            {job.overallNote}
          </p>
        </Card>
      )}
      {pending.map((s) => (
        <SuggestionCard key={s.id} suggestion={s} />
      ))}
    </>
  );
}
