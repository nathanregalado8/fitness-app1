import { useState } from 'react';
import { useApp } from '../state/store.jsx';
import { EXERCISE_BY_ID, exerciseName } from '../data/exercises.js';
import { newEntry, newSession, newSet } from '../lib/storage.js';
import { buildRoutine } from '../lib/routineBuilder.js';
import { exerciseHistory } from '../lib/signals.js';
import SessionPicker from './SessionPicker.jsx';
import Logger from './Logger.jsx';
import Coach from './Coach.jsx';
import CoachChat from './CoachChat.jsx';
import { Button, Card, Empty, Segmented } from './ui.jsx';

/** Prefill an entry from the saved target, then last performance, then blanks. */
function buildEntry(state, exerciseId) {
  const target = state.targets?.[exerciseId] ?? null;
  const [last] = exerciseHistory(state, exerciseId, { limit: 1 });
  const setCount = Math.min(Math.max(last?.workingSets ?? 3, 1), 8);
  const weight = target?.weight ?? last?.topSetWeight ?? null;
  const reps = target?.reps ?? last?.topSetReps ?? null;

  return newEntry(exerciseId, {
    sets: Array.from({ length: setCount }, () => newSet('normal', { weight, targetReps: reps })),
  });
}

/**
 * The training tab: pick a session, get a coherent routine, log it set by set.
 *
 * The routine comes from the deterministic builder, so it is always available
 * and never waits on the network. The AI generator below is an extra, not the
 * path of least resistance.
 */
export default function Train({ onSaved }) {
  const { state, lang, tr, actions } = useApp();
  const [draft, setDraft] = useState(null);
  const [routine, setRoutine] = useState(null);
  const [view, setView] = useState('session');

  const startSession = (sessionType) => {
    const session = newSession(sessionType);
    const plan = buildRoutine(state, sessionType);

    if (plan.activity) {
      session.durationMin = plan.activity.minutes;
      session.entries = [newEntry(plan.activity.exerciseId, { sets: [] })];
    } else {
      session.entries = plan.blocks.map((b) =>
        newEntry(b.exerciseId, {
          restSec: b.restSec,
          sets: Array.from({ length: b.sets }, () =>
            newSet('normal', { weight: b.targetWeight, targetReps: b.targetReps })
          ),
        })
      );
      // Conditioning closes the day. It logs by duration and has no primary
      // movers, so it never touches recovery timers.
      if (plan.finisher) {
        session.entries.push(
          newEntry(plan.finisher.exerciseId, { sets: [], durationMin: plan.finisher.minutes })
        );
      }
    }

    setRoutine(plan);
    setDraft(session);
  };

  if (draft) {
    return (
      <Logger
        draft={draft}
        setDraft={setDraft}
        routine={routine}
        onExit={() => {
          setDraft(null);
          setRoutine(null);
        }}
        onFinish={(session) => {
          actions.saveSession(session);
          setDraft(null);
          setRoutine(null);
          onSaved?.(session);
        }}
      />
    );
  }

  // A routine handed over by the chat or the generator becomes an editable
  // draft — nothing is logged until the user finishes the session themselves.
  const useRoutine = (plan) => {
    const session = newSession(plan.sessionType, { customName: plan.title ?? '' });
    session.entries = plan.blocks
      .filter((b) => EXERCISE_BY_ID[b.exerciseId])
      .map((b) =>
        newEntry(b.exerciseId, {
          note: b.note ?? '',
          restSec: b.restSec ?? null,
          sets: Array.from({ length: b.sets }, () =>
            newSet('normal', { weight: b.targetWeight ?? null, targetReps: b.targetReps ?? null })
          ),
        })
      );
    setRoutine(null);
    setDraft(session);
  };

  return (
    <>
      <Segmented
        ariaLabel={tr('navTrain')}
        value={view}
        onChange={setView}
        options={[
          { value: 'session', label: tr('viewSession') },
          { value: 'chat', label: tr('chatTab') },
          { value: 'generator', label: tr('routineTab') },
        ]}
      />

      {view === 'chat' && <CoachChat onStartSession={useRoutine} />}
      {view === 'generator' && <Coach onUseRoutine={useRoutine} />}

      {view === 'session' && (
        <>
      <SessionPicker onStart={startSession} />

      <Card>
        <span className="step-label">{tr('templates')}</span>
        {state.templates.length === 0 && <Empty>{tr('noTemplates')}</Empty>}
        <div className="stack stack-tight">
          {state.templates.map((tpl) => (
            <div key={tpl.id} className="session-row">
              <span className="stack" style={{ gap: 2 }}>
                <strong className="small">{tpl.name}</strong>
                <span className="tiny faint">
                  {tr(`st_${tpl.sessionType}`)} · {tpl.exerciseIds.map((id) => exerciseName(id, lang)).join(', ')}
                </span>
              </span>
              <span className="row row-tight">
                <Button
                  size="sm"
                  onClick={() => {
                    const session = newSession(tpl.sessionType, { customName: tpl.name });
                    session.entries = tpl.exerciseIds
                      .filter((id) => EXERCISE_BY_ID[id])
                      .map((id) => buildEntry(state, id));
                    setRoutine(null);
                    setDraft(session);
                  }}
                >
                  {tr('useTemplate')}
                </Button>
                <Button size="sm" variant="danger" onClick={() => actions.deleteTemplate(tpl.id)} aria-label={tr('delete')}>
                  ×
                </Button>
              </span>
            </div>
          ))}
        </div>
      </Card>

        </>
      )}
    </>
  );
}
