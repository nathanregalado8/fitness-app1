import { useState } from 'react';
import { useApp } from '../state/store.jsx';
import { requestRoutine } from '../lib/aiClient.js';
import { exerciseName } from '../data/exercises.js';
import { muscleName } from '../data/muscles.js';
import { Button, Card, Empty, Field } from './ui.jsx';

/**
 * On-demand routine generation with freeform context (spec Phase 4).
 *
 * Goes through the backend proxy and cannot write to the log: a generated
 * routine only becomes real when the user starts it and saves it through the
 * normal logging form. Conversational Q&A lives in the chat next door.
 */
export default function Coach({ onUseRoutine }) {
  const { state, lang, tr, actions } = useApp();
  const [request, setRequest] = useState('');
  const [busy, setBusy] = useState(false);
  const [routine, setRoutine] = useState(null);
  const [error, setError] = useState(null);

  const units = state.profile.units;

  const run = async (fn, setResult) => {
    setBusy(true);
    setError(null);
    setResult(null);
    const res = await fn();
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setResult(res.data);
  };

  return (
    <>
      <Card>
        <span className="step-label">{tr('stepGenerator')}</span>
        <h2 className="display">{tr('buildToday')}</h2>
        <p className="tiny faint" style={{ margin: 0 }}>{tr('readOnlyNote')}</p>
      </Card>

      <Card>
          <p className="small muted" style={{ margin: 0 }}>{tr('generatorHelp')}</p>

          <div className="chip-row">
            {['quickLowSleep', 'quick45', 'quickNoCables', 'quickShoulder', 'quickEnergy'].map((k) => (
              <button
                key={k}
                type="button"
                className="chip"
                onClick={() => setRequest((r) => (r ? `${r}, ${tr(k).toLowerCase()}` : tr(k)))}
              >
                {tr(k)}
              </button>
            ))}
          </div>

          <Field label={tr('routineTab')}>
            <textarea
              value={request}
              placeholder={tr('generatorPlaceholder')}
              onChange={(ev) => setRequest(ev.target.value)}
            />
          </Field>
          <Button
            variant="primary"
            className="btn-block"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const res = await requestRoutine(state, request);
                if (res.ok) actions.logCoach({ kind: 'routine', request, title: res.data.title });
                return res;
              }, setRoutine)
            }
          >
            {busy ? tr('loading') : tr('generateRoutine')}
          </Button>
      </Card>

      {error && (
        <Card tone="warn">
          <strong className="small">{tr('suggestionFailed')}</strong>
          <p className="muted tiny">{error.code === 'bad_api_key' ? tr('badApiKey') : error.code === 'no_backend' ? tr('coachNoBackend') : error.code === 'missing_api_key' ? tr('coachDisabled') : error.message || error.code}</p>
        </Card>
      )}

      {routine && (
        <Card title={routine.title} action={<span className="pill">{tr(`st_${routine.sessionType}`)}</span>}>
          <p className="small" style={{ margin: 0 }}>
            {routine.summary}
          </p>

          {routine.blocks.length === 0 ? (
            <Empty>{tr('empty')}</Empty>
          ) : (
            <ul className="list-reset">
              {routine.blocks.map((b, i) => (
                <li key={`${b.exerciseId}-${i}`} className="session-row">
                  <span className="stack" style={{ gap: 2 }}>
                    <strong className="small">{exerciseName(b.exerciseId, lang)}</strong>
                    {b.note && <span className="muted tiny">{b.note}</span>}
                  </span>
                  <span className="small muted">
                    {b.sets} × {b.targetReps}
                    {b.targetWeight != null ? ` @ ${b.targetWeight}${units}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {routine.cautions.length > 0 && (
            <div className="stack" style={{ gap: 4 }}>
              <strong className="tiny" style={{ color: 'var(--warn)' }}>
                {tr('cautions')}
              </strong>
              {routine.cautions.map((c, i) => (
                <span key={i} className="tiny muted">
                  ⚠ {c}
                </span>
              ))}
            </div>
          )}

          {routine.avoidedMuscles.length > 0 && (
            <span className="muted tiny">
              {tr('recency')}: {routine.avoidedMuscles.map((m) => muscleName(m, lang)).join(', ')}
            </span>
          )}

          <Button
            variant="primary"
            disabled={routine.blocks.length === 0}
            onClick={() => onUseRoutine(routine)}
          >
            {tr('useRoutine')}
          </Button>
        </Card>
      )}

    </>
  );
}
