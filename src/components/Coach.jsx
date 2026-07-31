import { useState } from 'react';
import { useApp } from '../state/store.jsx';
import { askQuestion, requestRoutine } from '../lib/aiClient.js';
import { exerciseName } from '../data/exercises.js';
import { muscleName } from '../data/muscles.js';
import { Button, Card, Empty, Field, Segmented } from './ui.jsx';

/**
 * On-demand AI surfaces (spec Phase 4): routine generation with freeform
 * context, and read-only Q&A over the user's own logged data.
 *
 * Both go through the backend proxy. Neither can write to the log — a
 * generated routine only becomes real when the user starts it and saves it
 * through the normal logging form.
 */
export default function Coach({ onUseRoutine }) {
  const { state, lang, tr, actions } = useApp();
  const [tab, setTab] = useState('routine');
  const [request, setRequest] = useState('');
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [routine, setRoutine] = useState(null);
  const [answer, setAnswer] = useState(null);
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
      <Card title={tr('coachTitle')}>
        <Segmented
          ariaLabel={tr('coachTitle')}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'routine', label: tr('routineTab') },
            { value: 'qa', label: tr('qaTab') },
          ]}
        />
        <p className="muted tiny">{tr('readOnlyNote')}</p>
      </Card>

      {tab === 'routine' ? (
        <Card>
          <Field label={tr('routineTab')}>
            <textarea
              value={request}
              placeholder={tr('routinePlaceholder')}
              onChange={(ev) => setRequest(ev.target.value)}
            />
          </Field>
          <Button
            variant="primary"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const res = await requestRoutine(state, request);
                if (res.ok) actions.logCoach({ kind: 'routine', request, title: res.data.title });
                return res;
              }, setRoutine)
            }
          >
            {busy ? tr('loading') : tr('generate')}
          </Button>
        </Card>
      ) : (
        <Card>
          <Field label={tr('qaTab')}>
            <textarea
              value={question}
              placeholder={tr('questionPlaceholder')}
              onChange={(ev) => setQuestion(ev.target.value)}
            />
          </Field>
          <Button
            variant="primary"
            disabled={busy || !question.trim()}
            onClick={() =>
              run(async () => {
                const res = await askQuestion(state, question);
                if (res.ok) actions.logCoach({ kind: 'qa', question });
                return res;
              }, setAnswer)
            }
          >
            {busy ? tr('loading') : tr('ask')}
          </Button>
        </Card>
      )}

      {error && (
        <Card tone="warn">
          <strong className="small">{tr('suggestionFailed')}</strong>
          <p className="muted tiny">{error.code === 'bad_api_key' ? tr('badApiKey') : error.code === 'no_backend' ? tr('coachNoBackend') : error.code === 'missing_api_key' ? tr('coachDisabled') : error.message || error.code}</p>
        </Card>
      )}

      {tab === 'routine' && routine && (
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

      {tab === 'qa' && answer && (
        <Card title={tr('qaTab')}>
          <p className="small" style={{ margin: 0 }}>
            {answer.answer}
          </p>

          {answer.dataPoints.length > 0 && (
            <ul className="list-reset">
              {answer.dataPoints.map((d, i) => (
                <li key={i} className="spread small">
                  <span className="muted">{d.label}</span>
                  <strong>{d.value}</strong>
                </li>
              ))}
            </ul>
          )}

          {answer.caveats.length > 0 && (
            <div className="stack" style={{ gap: 4 }}>
              <strong className="tiny muted">{tr('caveats')}</strong>
              {answer.caveats.map((c, i) => (
                <span key={i} className="tiny muted">
                  · {c}
                </span>
              ))}
            </div>
          )}
        </Card>
      )}
    </>
  );
}
