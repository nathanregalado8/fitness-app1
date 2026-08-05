import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../state/store.jsx';
import { EXERCISE_BY_ID, exerciseName } from '../data/exercises.js';
import { SET_TYPES, newEntry, newSet } from '../lib/storage.js';
import { exerciseHistory } from '../lib/signals.js';
import { activeWarnings } from '../lib/recovery.js';
import { muscleName } from '../data/muscles.js';
import { formatHoursAgo, toISODate } from '../lib/date.js';
import ExercisePicker from './ExercisePicker.jsx';
import SwapPicker from './SwapPicker.jsx';
import WarningsPanel from './WarningsPanel.jsx';
import { IconChevronLeft, IconSwap } from './Icons.jsx';
import { Button, Card, Field, Modal, NumberInput, Stepper } from './ui.jsx';

/**
 * PHASE 1 — the guided logger.
 *
 * One exercise and one set at a time, so logging mid-workout is thumb-work:
 * steppers, chips and one big button. Every edit is a form control — the spec
 * is explicit that nothing here is ever edited through chat.
 */

/** Rest between working sets, by training goal. */
const REST_SECONDS = { strength: 180, hypertrophy: 90, endurance: 60, general: 90 };

const clock = (totalSeconds) => {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export default function Logger({ draft, setDraft, routine, onFinish, onExit }) {
  const { state, lang, tr, actions } = useApp();
  const [index, setIndex] = useState(0);
  const [picking, setPicking] = useState(false);
  const [swapEntryId, setSwapEntryId] = useState(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);

  const startedAt = useRef(draft.createdAt ?? Date.now());
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // -------------------------------------------------------------- rest timer
  const [rest, setRest] = useState(null); // { endsAt } | { remaining } when paused
  const restLeft = rest ? (rest.paused ? rest.remaining : (rest.endsAt - Date.now()) / 1000) : 0;
  useEffect(() => {
    if (rest && !rest.paused && restLeft <= 0) setRest(null);
  }, [rest, restLeft, tick]);

  const restFor = REST_SECONDS[state.profile.goal] ?? 90;

  // ---------------------------------------------------------------- helpers
  const entries = draft.entries ?? [];
  const entry = entries[Math.min(index, Math.max(0, entries.length - 1))] ?? null;

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

  const exerciseIds = useMemo(() => entries.map((e) => e.exerciseId), [entries]);
  const warnings = useMemo(
    () => activeWarnings(state, exerciseIds, { isStrength: draft.isStrength }),
    [state, exerciseIds, draft.isStrength]
  );

  const done = (e) => (e.sets ?? []).filter((s) => s.done).length;
  const totalDone = entries.reduce((a, e) => a + done(e), 0);

  const activeSet = entry ? (entry.sets ?? []).find((s) => !s.done) ?? null : null;
  const units = state.profile.units;

  // Value being dialled in for the active set, kept out of the saved draft
  // until the user actually presses the log button.
  const [pending, setPending] = useState({ weight: null, reps: null, type: 'normal' });
  useEffect(() => {
    if (!activeSet) return;
    const prior = (entry.sets ?? []).filter((s) => s.done).at(-1);
    setPending({
      weight: activeSet.weight ?? prior?.weight ?? null,
      reps: activeSet.targetReps ?? prior?.reps ?? null,
      type: activeSet.type ?? 'normal',
    });
  }, [activeSet?.id, entry?.id]);

  const logSet = () => {
    updateSet(entry.id, activeSet.id, { ...pending, done: true });
    const remaining = (entry.sets ?? []).filter((s) => !s.done).length - 1;
    // No rest prompt once the exercise is finished — the next move is a decision,
    // not a wait.
    setRest(remaining > 0 ? { endsAt: Date.now() + restFor * 1000, paused: false } : null);
  };

  const finish = () => {
    // Only sets the user actually logged become history.
    const clean = {
      ...draft,
      entries: draft.entries
        .map((e) => ({ ...e, sets: (e.sets ?? []).filter((s) => s.done) }))
        .filter((e) => !draft.isStrength || e.sets.length > 0),
      updatedAt: Date.now(),
    };
    onFinish(clean);
  };

  const canFinish = draft.isStrength
    ? totalDone > 0
    : draft.durationMin != null || draft.distanceKm != null;

  const meta = entry ? EXERCISE_BY_ID[entry.exerciseId] : null;
  const [last] = entry ? exerciseHistory(state, entry.exerciseId, { limit: 1 }) : [];
  const target = entry ? state.targets?.[entry.exerciseId] ?? null : null;
  const next = entries[index + 1] ?? null;

  return (
    <>
      <div className="spread" style={{ padding: '2px 2px 0' }}>
        <button type="button" className="icon-btn" onClick={onExit} aria-label={tr('goBack')}>
          <IconChevronLeft style={{ width: 18, height: 18 }} aria-hidden="true" />
        </button>
        <span className="step-label">
          {draft.customName || tr(`st_${draft.sessionType}`)} · {tr('inProgress')}
        </span>
        <span className="stack stack-tight" style={{ alignItems: 'flex-end' }}>
          <span className="micro">{tr('elapsed')}</span>
          <strong>{clock((Date.now() - startedAt.current) / 1000)}</strong>
        </span>
      </div>

      {entries.length > 0 && (
        <div className="progress" aria-hidden="true">
          {entries.map((e, i) => (
            <span
              key={e.id}
              className={`progress-seg ${
                done(e) >= (e.sets?.length ?? 0) && (e.sets?.length ?? 0) > 0
                  ? 'is-done'
                  : i === index
                    ? 'is-current'
                    : ''
              }`}
            />
          ))}
        </div>
      )}

      <WarningsPanel warnings={warnings} />

      {!draft.isStrength && (
        <Card>
          <span className="step-label">{tr(`st_${draft.sessionType}`)}</span>
          <div className="row">
            <Stepper
              label={tr('duration')}
              value={draft.durationMin}
              step={5}
              onChange={(v) => update({ durationMin: v })}
            />
            <Stepper
              label={tr('distance')}
              value={draft.distanceKm}
              step={0.5}
              onChange={(v) => update({ distanceKm: v })}
            />
          </div>
          {routine?.activity && (
            <p className="tiny faint" style={{ margin: 0 }}>
              {tr('activityTarget', { min: routine.activity.minutes })}
            </p>
          )}
        </Card>
      )}

      {draft.isStrength && entry && (
        <Card>
          <div className="spread">
            <span className="step-label">{tr('exerciseCount', { i: index + 1, n: entries.length })}</span>
            <span className="row row-tight">
              <Button size="sm" variant="quiet" onClick={() => setSwapEntryId(entry.id)}>
                <IconSwap style={{ width: 14, height: 14 }} aria-hidden="true" /> {tr('swap')}
              </Button>
              <Button
                size="sm"
                variant="quiet"
                aria-label={tr('removeExercise')}
                onClick={() => {
                  setDraft((d) => ({ ...d, entries: d.entries.filter((e) => e.id !== entry.id) }));
                  setIndex((i) => Math.max(0, Math.min(i, entries.length - 2)));
                }}
              >
                ×
              </Button>
            </span>
          </div>

          <h2 className="display">{meta?.name[lang] ?? entry.exerciseId}</h2>
          <span className="micro">
            {(meta?.primary ?? []).map((m) => muscleName(m, lang)).join(' · ')}
            {target ? ` · ${tr('currentTarget')} ${target.weight ?? '—'} ${units} × ${target.reps ?? '—'}` : ''}
          </span>

          {last && (
            <p className="tiny faint" style={{ margin: 0 }}>
              {tr('lastTime')}: {last.topSetWeight ?? '—'} {units} × {last.topSetReps ?? '—'} · {last.workingSets}×
            </p>
          )}

          <div className="set-table">
            {(entry.sets ?? []).filter((s) => s.done).length === 0 && (
              <p className="empty">{tr('noSetsLogged')}</p>
            )}
            {(entry.sets ?? []).map((s, i) =>
              s.done ? (
                <div className="set-row" key={s.id}>
                  <span className="num">{i + 1}</span>
                  <span className="tiny muted">{tr(`set_${s.type}`)}</span>
                  <span className="val">
                    {s.weight ?? '—'} <span className="tiny faint">{units}</span>
                  </span>
                  <span className="val">
                    {s.reps ?? '—'} <span className="tiny faint">{tr('reps')}</span>
                  </span>
                </div>
              ) : null
            )}
          </div>

          {rest && (
            <div className="spread" style={{ alignItems: 'center' }}>
              <span className="stack stack-tight">
                <span className="micro">{tr('restTimer')}</span>
                <span className="glow-timer">{clock(restLeft)}</span>
              </span>
              <span className="row row-tight">
                <Button
                  size="sm"
                  onClick={() =>
                    setRest((r) =>
                      r.paused
                        ? { endsAt: Date.now() + r.remaining * 1000, paused: false }
                        : { remaining: (r.endsAt - Date.now()) / 1000, paused: true }
                    )
                  }
                >
                  {rest.paused ? tr('resume') : tr('pause')}
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    setRest((r) =>
                      r.paused
                        ? { ...r, remaining: r.remaining + 30 }
                        : { ...r, endsAt: r.endsAt + 30000 }
                    )
                  }
                >
                  {tr('plus30')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setRest(null)}>
                  {tr('skipRest')}
                </Button>
              </span>
            </div>
          )}

          {activeSet ? (
            <div className="entry">
              <span className="step-label">
                {tr('currentSet', { n: (entry.sets ?? []).indexOf(activeSet) + 1 })}
                {activeSet.targetReps ? ` · ${tr('targetHint', { reps: activeSet.targetReps })}` : ''}
              </span>

              <div className="chip-row" role="radiogroup" aria-label={tr('setType')}>
                {SET_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={pending.type === t}
                    className={`chip ${pending.type === t ? 'is-active' : ''}`}
                    onClick={() => setPending((p) => ({ ...p, type: t }))}
                  >
                    {tr(`set_${t}`)}
                  </button>
                ))}
              </div>

              <div className="row">
                <Stepper
                  label={tr('weight')}
                  suffix={units}
                  value={pending.weight}
                  step={2.5}
                  onChange={(v) => setPending((p) => ({ ...p, weight: v }))}
                />
                <Stepper
                  label={tr('reps')}
                  value={pending.reps}
                  step={1}
                  onChange={(v) => setPending((p) => ({ ...p, reps: v }))}
                />
              </div>

              <Button variant="primary" className="btn-block btn-lg" onClick={logSet}>
                {tr('registerSet')}
              </Button>
            </div>
          ) : index + 1 < entries.length ? (
            <Button
              variant="primary"
              className="btn-block"
              onClick={() => {
                setRest(null);
                setIndex(index + 1);
              }}
            >
              {tr('finishExercise')}
            </Button>
          ) : (
            <p className="empty">{tr('allExercisesDone')}</p>
          )}

          <div className="row">
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                updateEntry(entry.id, {
                  sets: [
                    ...entry.sets,
                    newSet(pending.type ?? 'normal', {
                      weight: pending.weight,
                      targetReps: entry.sets.at(-1)?.targetReps ?? null,
                    }),
                  ],
                })
              }
            >
              + {tr('addSet')}
            </Button>
            {activeSet && (entry.sets ?? []).length > 1 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => updateEntry(entry.id, { sets: entry.sets.filter((s) => s.id !== activeSet.id) })}
              >
                − {tr('removeSet')}
              </Button>
            )}
          </div>

          <Field label={tr('notes')}>
            <input
              type="text"
              value={entry.note}
              onChange={(e) => updateEntry(entry.id, { note: e.target.value })}
            />
          </Field>
        </Card>
      )}

      {draft.isStrength && next && (
        <Card>
          <span className="step-label">{tr('nextUp')}</span>
          <div className="spread">
            <strong className="small">{exerciseName(next.exerciseId, lang)}</strong>
            <span className="pill">
              {next.sets.length} × {next.sets[0]?.targetReps ?? '—'}
            </span>
          </div>
        </Card>
      )}

      {draft.isStrength && (
        <Card>
          <span className="step-label">{tr('sessionPlan')}</span>
          <div className="rows">
            {entries.map((e, i) => (
              <button
                key={e.id}
                type="button"
                style={{ font: 'inherit', color: 'var(--text)', border: 0, cursor: 'pointer', textAlign: 'left' }}
                onClick={() => {
                  setIndex(i);
                  setRest(null);
                }}
              >
                <span className="row row-tight row-nowrap">
                  <span className={`dot ${done(e) >= e.sets.length ? 'dot-flagged' : 'dot-recovering'}`} />
                  <span className={`small ${i === index ? '' : 'muted'}`}>{exerciseName(e.exerciseId, lang)}</span>
                </span>
                <span className="tiny faint">
                  {done(e)} / {e.sets.length}
                </span>
              </button>
            ))}
          </div>

          <div className="row">
            <Button className="grow" onClick={() => setPicking(true)}>
              + {tr('addExercise')}
            </Button>
            {entries.length > 0 && (
              <Button variant="ghost" onClick={() => setSavingTemplate(true)}>
                {tr('saveAsTemplate')}
              </Button>
            )}
          </div>
        </Card>
      )}

      {routine && <RoutineNotes routine={routine} />}

      <Card>
        <button
          type="button"
          className="spread"
          style={{ font: 'inherit', color: 'var(--text)', background: 'none', border: 0, cursor: 'pointer', padding: 0 }}
          aria-expanded={detailsOpen}
          onClick={() => setDetailsOpen((v) => !v)}
        >
          <span className="step-label">{tr('sessionDetails')}</span>
          <span className="tiny faint">{detailsOpen ? '−' : '+'}</span>
        </button>

        {detailsOpen && (
          <>
            <div className="grid-2">
              <Field label={tr('sessionDate')}>
                <input
                  type="date"
                  value={draft.date}
                  max={toISODate()}
                  onChange={(e) => update({ date: e.target.value || toISODate() })}
                />
              </Field>
              {draft.sessionType === 'custom' && (
                <Field label={tr('customName')}>
                  <input
                    type="text"
                    value={draft.customName}
                    onChange={(e) => update({ customName: e.target.value })}
                  />
                </Field>
              )}
            </div>

            {draft.sessionType === 'custom' && (
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

            <Field label={tr('notes')}>
              <textarea value={draft.notes} onChange={(e) => update({ notes: e.target.value })} />
            </Field>

            <Button variant="ghost" onClick={onExit}>
              {tr('discardSession')}
            </Button>
          </>
        )}
      </Card>

      <Button variant="primary" className="btn-block btn-lg" disabled={!canFinish} onClick={finish}>
        {tr('finishSession')}
      </Button>

      {picking && (
        <ExercisePicker
          restrictTo={draft.isStrength ? null : 'cardio'}
          onClose={() => setPicking(false)}
          onPick={(id) => {
            setDraft((d) => ({
              ...d,
              entries: [
                ...d.entries,
                draft.isStrength
                  ? newEntry(id, {
                      sets: Array.from({ length: 3 }, () => newSet('normal', { weight: null, targetReps: null })),
                    })
                  : newEntry(id, { sets: [] }),
              ],
            }));
            setPicking(false);
          }}
        />
      )}

      {swapEntryId && (
        <SwapPicker
          exerciseId={entries.find((e) => e.id === swapEntryId)?.exerciseId}
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

/** Why the generated session looks the way it does — structured reasons only. */
function RoutineNotes({ routine }) {
  const { lang, tr } = useApp();
  const notes = [
    ...(routine.overridden ? [{ key: 'over', text: tr('routineOverridden') }] : []),
    ...routine.skipped.map((s, i) => ({
      key: `sk${i}`,
      text:
        s.reason === 'equipment'
          ? tr('skippedNoEquipment', { muscles: s.muscles.map((m) => muscleName(m, lang)).join(', ') })
          : tr('skippedForRecovery', {
              muscles: s.muscles.map((m) => muscleName(m, lang)).join(', '),
              ago: formatHoursAgo(s.hoursSinceLastTrained, lang),
            }),
    })),
  ];
  if (notes.length === 0) return null;

  return (
    <Card tone="warn">
      <span className="step-label">{tr('routineReady')}</span>
      {notes.map((n) => (
        <span key={n.key} className="tiny" style={{ color: 'var(--warn)' }}>
          {n.text}
        </span>
      ))}
    </Card>
  );
}
