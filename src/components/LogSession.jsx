import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../state/store.jsx';
import { EXERCISE_BY_ID, exerciseName } from '../data/exercises.js';
import {
  SESSION_TYPES,
  SESSION_TYPE_BY_ID,
  SET_TYPES,
  newEntry,
  newSession,
  newSet,
} from '../lib/storage.js';
import { exerciseHistory } from '../lib/signals.js';
import { activeWarnings } from '../lib/recovery.js';
import { buildRoutine } from '../lib/routineBuilder.js';
import { muscleName } from '../data/muscles.js';
import { formatDate, formatHoursAgo, toISODate } from '../lib/date.js';
import ExercisePicker from './ExercisePicker.jsx';
import SwapPicker from './SwapPicker.jsx';
import WarningsPanel from './WarningsPanel.jsx';
import { Button, Card, Empty, Field, Modal, NumberInput, Segmented } from './ui.jsx';

/** Prefill a new entry from the saved target, then last performance, then blanks. */
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

export default function LogSession({ pending, onConsumePending, onSaved }) {
  const { state, lang, tr, actions } = useApp();
  const [draft, setDraft] = useState(null);
  const [picking, setPicking] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [routine, setRoutine] = useState(null);
  const [swapEntryId, setSwapEntryId] = useState(null);

  /**
   * Picking a session type builds a full routine straight away — structured by
   * the blueprint for that split and prescribed by the profile's goal. Nothing
   * here waits on the network, so the routine is always available and always
   * coherent.
   */
  const startSession = (sessionType) => {
    const session = newSession(sessionType);
    const plan = buildRoutine(state, sessionType);

    if (plan.activity) {
      session.durationMin = plan.activity.minutes;
      session.entries = [newEntry(plan.activity.exerciseId, { sets: [] })];
    } else {
      session.entries = plan.blocks.map((b) =>
        newEntry(b.exerciseId, {
          sets: Array.from({ length: b.sets }, () =>
            newSet('normal', { weight: b.targetWeight, targetReps: b.targetReps })
          ),
        })
      );
    }

    setRoutine(plan);
    setDraft(session);
  };

  // A routine handed over from the Coach tab becomes an editable draft.
  useEffect(() => {
    if (!pending || draft) return;
    const session = newSession(pending.sessionType, { customName: pending.title ?? '' });
    session.entries = pending.blocks
      .filter((b) => EXERCISE_BY_ID[b.exerciseId])
      .map((b) =>
        newEntry(b.exerciseId, {
          note: b.note ?? '',
          sets: Array.from({ length: b.sets }, () =>
            newSet('normal', { weight: b.targetWeight ?? null, targetReps: b.targetReps ?? null })
          ),
        })
      );
    setDraft(session);
    onConsumePending?.();
  }, [pending, draft, onConsumePending]);

  const exerciseIds = useMemo(() => (draft?.entries ?? []).map((e) => e.exerciseId), [draft]);

  const warnings = useMemo(
    () => (draft ? activeWarnings(state, exerciseIds, { isStrength: draft.isStrength }) : []),
    [state, exerciseIds, draft]
  );

  if (!draft) {
    return (
      <StartPanel
        onStart={startSession}
        onUseTemplate={(tpl) => {
          const session = newSession(tpl.sessionType, { customName: tpl.name });
          session.entries = tpl.exerciseIds.filter((id) => EXERCISE_BY_ID[id]).map((id) => buildEntry(state, id));
          setRoutine(null);
          setDraft(session);
        }}
      />
    );
  }

  const typeMeta = SESSION_TYPE_BY_ID[draft.sessionType] ?? SESSION_TYPE_BY_ID.custom;
  const isCustom = draft.sessionType === 'custom';
  const update = (fields) => setDraft((d) => ({ ...d, ...fields }));

  const updateEntry = (entryId, fields) =>
    setDraft((d) => ({
      ...d,
      entries: d.entries.map((e) => (e.id === entryId ? { ...e, ...fields } : e)),
    }));

  const updateSet = (entryId, setId, fields) =>
    setDraft((d) => ({
      ...d,
      entries: d.entries.map((e) =>
        e.id !== entryId ? e : { ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...fields } : s)) }
      ),
    }));

  const canSave =
    draft.entries.length > 0 || (!draft.isStrength && (draft.durationMin != null || draft.distanceKm != null));

  const save = () => {
    actions.saveSession(draft);
    const saved = draft;
    setDraft(null);
    setRoutine(null);
    onSaved?.(saved);
  };

  return (
    <>
      <Card
        title={isCustom && draft.customName ? draft.customName : tr(`st_${draft.sessionType}`)}
        action={
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setDraft(null);
              setRoutine(null);
            }}
          >
            {tr('discardSession')}
          </Button>
        }
      >
        <div className="grid-2">
          <Field label={tr('sessionDate')}>
            <input
              type="date"
              value={draft.date}
              max={toISODate()}
              onChange={(e) => update({ date: e.target.value || toISODate() })}
            />
          </Field>
          {isCustom && (
            <Field label={tr('customName')}>
              <input
                type="text"
                value={draft.customName}
                onChange={(e) => update({ customName: e.target.value })}
              />
            </Field>
          )}
        </div>

        {isCustom && (
          <Field hint={tr('countsAsStrengthHelp')}>
            <label className="row row-tight small">
              <input
                type="checkbox"
                style={{ width: 'auto' }}
                checked={draft.isStrength}
                onChange={(e) => update({ isStrength: e.target.checked })}
              />
              {tr('countsAsStrength')}
            </label>
          </Field>
        )}

        {!typeMeta.strength && !isCustom && (
          <p className="muted tiny">{tr('countsAsStrengthHelp')}</p>
        )}

        {!draft.isStrength && (
          <div className="grid-2">
            <Field label={tr('duration')}>
              <NumberInput value={draft.durationMin} onChange={(v) => update({ durationMin: v })} min="0" />
            </Field>
            <Field label={tr('distance')}>
              <NumberInput value={draft.distanceKm} onChange={(v) => update({ distanceKm: v })} min="0" step="0.1" />
            </Field>
          </div>
        )}
      </Card>

      {routine && (
        <RoutineCard
          routine={routine}
          onRegenerate={() => startSession(draft.sessionType)}
          onClear={() => {
            setDraft((d) => ({ ...d, entries: [] }));
            setRoutine(null);
          }}
        />
      )}

      <WarningsPanel warnings={warnings} />

      {draft.entries.length === 0 && (
        <Card>
          <Empty>{tr('noExercisesYet')}</Empty>
        </Card>
      )}

      {draft.entries.map((entry) => (
        <EntryEditor
          key={entry.id}
          entry={entry}
          isStrength={draft.isStrength}
          onChange={(fields) => updateEntry(entry.id, fields)}
          onChangeSet={(setId, fields) => updateSet(entry.id, setId, fields)}
          onAddSet={() =>
            updateEntry(entry.id, {
              sets: [
                ...entry.sets,
                newSet('normal', {
                  weight: entry.sets.at(-1)?.weight ?? null,
                  targetReps: entry.sets.at(-1)?.targetReps ?? null,
                }),
              ],
            })
          }
          onRemoveSet={(setId) => updateEntry(entry.id, { sets: entry.sets.filter((s) => s.id !== setId) })}
          onRemove={() => setDraft((d) => ({ ...d, entries: d.entries.filter((e) => e.id !== entry.id) }))}
          onSwap={() => setSwapEntryId(entry.id)}
        />
      ))}

      <div className="row">
        <Button className="grow" onClick={() => setPicking(true)}>
          + {tr('addExercise')}
        </Button>
        {draft.entries.length > 0 && (
          <Button variant="ghost" onClick={() => setSavingTemplate(true)}>
            {tr('saveAsTemplate')}
          </Button>
        )}
      </div>

      <Field label={tr('notes')}>
        <textarea value={draft.notes} onChange={(e) => update({ notes: e.target.value })} />
      </Field>

      <Button variant="primary" className="btn-block" disabled={!canSave} onClick={save}>
        {tr('saveSession')}
      </Button>

      {picking && (
        <ExercisePicker
          restrictTo={draft.isStrength ? null : 'cardio'}
          onClose={() => setPicking(false)}
          onPick={(id) => {
            setDraft((d) => ({
              ...d,
              entries: [...d.entries, draft.isStrength ? buildEntry(state, id) : newEntry(id, { sets: [] })],
            }));
            setPicking(false);
          }}
        />
      )}

      {swapEntryId && (
        <SwapPicker
          exerciseId={draft.entries.find((e) => e.id === swapEntryId)?.exerciseId}
          excludeIds={exerciseIds}
          onClose={() => setSwapEntryId(null)}
          onPick={(newId) => {
            // Keep the sets already prescribed — only the movement changes.
            updateEntry(swapEntryId, { exerciseId: newId });
            setSwapEntryId(null);
          }}
        />
      )}

      {savingTemplate && (
        <Modal
          title={tr('saveAsTemplate')}
          onClose={() => setSavingTemplate(false)}
          closeLabel={tr('close')}
          footer={
            <>
              <Button
                variant="primary"
                disabled={!templateName.trim()}
                onClick={() => {
                  actions.addTemplate(templateName.trim(), draft.sessionType, exerciseIds);
                  setTemplateName('');
                  setSavingTemplate(false);
                }}
              >
                {tr('save')}
              </Button>
              <Button variant="ghost" onClick={() => setSavingTemplate(false)}>
                {tr('cancel')}
              </Button>
            </>
          }
        >
          <Field label={tr('templateName')}>
            <input type="text" autoFocus value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
          </Field>
          <p className="muted tiny">{exerciseIds.map((id) => exerciseName(id, lang)).join(' · ')}</p>
        </Modal>
      )}
    </>
  );
}

// --------------------------------------------------------------- sub-views

function StartPanel({ onStart, onUseTemplate }) {
  const { state, lang, tr, actions } = useApp();
  const recent = state.sessions.slice(0, 3);

  return (
    <>
      <Card title={tr('pickSessionType')}>
        <div className="chip-row">
          {SESSION_TYPES.map((s) => (
            <Button key={s.id} onClick={() => onStart(s.id)}>
              {tr(`st_${s.id}`)}
            </Button>
          ))}
        </div>
        <p className="muted tiny">{tr('formOnlyNote')}</p>
      </Card>

      <Card title={tr('templates')}>
        {state.templates.length === 0 && <Empty>{tr('noTemplates')}</Empty>}
        <ul className="list-reset">
          {state.templates.map((tpl) => (
            <li key={tpl.id} className="session-row">
              <span className="stack" style={{ gap: 2 }}>
                <strong className="small">{tpl.name}</strong>
                <span className="muted tiny">
                  {tr(`st_${tpl.sessionType}`)} · {tpl.exerciseIds.map((id) => exerciseName(id, lang)).join(', ')}
                </span>
              </span>
              <span className="row row-tight">
                <Button size="sm" onClick={() => onUseTemplate(tpl)}>
                  {tr('useTemplate')}
                </Button>
                <Button size="sm" variant="danger" onClick={() => actions.deleteTemplate(tpl.id)}>
                  ×
                </Button>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {recent.length > 0 && (
        <Card title={tr('history')}>
          <ul className="list-reset">
            {recent.map((s) => (
              <li key={s.id} className="session-row">
                <span className="stack" style={{ gap: 2 }}>
                  <strong className="small">{s.customName || tr(`st_${s.sessionType}`)}</strong>
                  <span className="muted tiny">{formatDate(s.date, lang)}</span>
                </span>
                <span className="pill">{s.entries.length}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

function EntryEditor({ entry, isStrength, onChange, onChangeSet, onAddSet, onRemoveSet, onRemove, onSwap }) {
  const { state, lang, tr } = useApp();
  const meta = EXERCISE_BY_ID[entry.exerciseId];
  const target = state.targets?.[entry.exerciseId] ?? null;
  const [last] = exerciseHistory(state, entry.exerciseId, { limit: 1 });
  const units = state.profile.units;

  return (
    <Card
      title={meta?.name[lang] ?? entry.exerciseId}
      action={
        <span className="row row-tight">
          <Button size="sm" onClick={onSwap}>
            ⇄ {tr('swap')}
          </Button>
          <Button size="sm" variant="danger" onClick={onRemove} aria-label={tr('removeExercise')}>
            ×
          </Button>
        </span>
      }
    >
      {target && (
        <p className="tiny" style={{ color: 'var(--accent)' }}>
          {tr('currentTarget')}: {target.weight ?? '—'} {units} × {target.reps ?? '—'}
        </p>
      )}
      {last && (
        <p className="muted tiny">
          {tr('lastTime')}: {last.topSetWeight ?? '—'} {units} × {last.topSetReps ?? '—'} · {last.workingSets}×
        </p>
      )}

      {isStrength ? (
        <div className="entry">
          <div className="set-grid">
            <span className="head">{tr('setType')}</span>
            <span className="head">
              {tr('weight')} ({units})
            </span>
            <span className="head">{tr('reps')}</span>
            <span className="head">{tr('targetReps')}</span>
            <span />
          </div>

          {entry.sets.map((set) => (
            <div className="set-grid" key={set.id}>
              <select
                value={set.type}
                aria-label={tr('setType')}
                onChange={(e) => onChangeSet(set.id, { type: e.target.value })}
              >
                {SET_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {tr(`set_${t}`)}
                  </option>
                ))}
              </select>
              <NumberInput
                value={set.weight}
                aria-label={tr('weight')}
                step="0.5"
                min="0"
                onChange={(v) => onChangeSet(set.id, { weight: v })}
              />
              <NumberInput
                value={set.reps}
                aria-label={tr('reps')}
                min="0"
                onChange={(v) => onChangeSet(set.id, { reps: v })}
              />
              <NumberInput
                value={set.targetReps}
                aria-label={tr('targetReps')}
                min="0"
                onChange={(v) => onChangeSet(set.id, { targetReps: v })}
              />
              <button
                type="button"
                className="icon-btn"
                aria-label={tr('removeSet')}
                onClick={() => onRemoveSet(set.id)}
              >
                −
              </button>
            </div>
          ))}

          <Button size="sm" variant="ghost" onClick={onAddSet}>
            + {tr('addSet')}
          </Button>
        </div>
      ) : (
        <p className="muted tiny">{tr('countsAsStrengthHelp')}</p>
      )}

      <Field label={tr('notes')}>
        <input type="text" value={entry.note} onChange={(e) => onChange({ note: e.target.value })} />
      </Field>
    </Card>
  );
}


/** Why this routine looks the way it does — rendered from structured reasons. */
function RoutineCard({ routine, onRegenerate, onClear }) {
  const { lang, tr } = useApp();
  const goalLabel = tr(`goal${routine.goal[0].toUpperCase()}${routine.goal.slice(1)}`);
  const empty = routine.blocks.length === 0 && !routine.activity;

  return (
    <Card
      tone="accent"
      title={tr('routineReady')}
      action={
        <span className="row row-tight">
          <Button size="sm" onClick={onRegenerate}>
            {tr('regenerate')}
          </Button>
          <Button size="sm" variant="ghost" onClick={onClear}>
            {tr('startBlank')}
          </Button>
        </span>
      }
    >
      <p className="small" style={{ margin: 0 }}>
        {tr('routineFor', { goal: goalLabel })}
      </p>

      {empty && <p className="tiny" style={{ color: 'var(--warn)' }}>{tr('noRoutinePossible')}</p>}

      {routine.activity && (
        <span className="muted tiny">{tr('activityTarget', { min: routine.activity.minutes })}</span>
      )}

      {routine.blocks.length > 0 && (
        <ul className="list-reset">
          {routine.blocks.map((b) => (
            <li key={b.exerciseId} className="spread tiny">
              <span className="muted">
                {tr(`slot_${b.slot}`)} · {exerciseName(b.exerciseId, lang)}
              </span>
              <span className="muted">{tr(`reason_${b.reason}`)}</span>
            </li>
          ))}
        </ul>
      )}

      {routine.overridden && (
        <span className="tiny" style={{ color: 'var(--warn)' }}>{tr('routineOverridden')}</span>
      )}

      {routine.skipped.map((s, i) => (
        <span key={i} className="tiny" style={{ color: 'var(--warn)' }}>
          {s.reason === 'equipment'
            ? tr('skippedNoEquipment', { muscles: s.muscles.map((m) => muscleName(m, lang)).join(', ') })
            : tr('skippedForRecovery', {
                muscles: s.muscles.map((m) => muscleName(m, lang)).join(', '),
                ago: formatHoursAgo(s.hoursSinceLastTrained, lang),
              })}
        </span>
      ))}
    </Card>
  );
}
