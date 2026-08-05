import { useMemo, useRef, useState } from 'react';
import { useApp } from '../state/store.jsx';
import { EQUIPMENT, GOALS, exportState } from '../lib/storage.js';
import { BODY_PARTS, bodyPartName } from '../data/muscles.js';
import { exerciseName } from '../data/exercises.js';
import { MAPPED_EXERCISE_IDS, progressionOptions } from '../data/progressions.js';
import { loggedExerciseIds } from '../lib/signals.js';
import { LANGUAGES } from '../i18n/index.js';
import { Button, Card, ChipToggle, Empty, Field, NumberInput, Segmented } from './ui.jsx';

export default function Profile() {
  const { state, lang, tr, actions } = useApp();
  const p = state.profile;
  const fileRef = useRef(null);
  const [importError, setImportError] = useState(false);

  const toggleEquipment = (eq) =>
    actions.setProfile({
      equipment: p.equipment.includes(eq) ? p.equipment.filter((x) => x !== eq) : [...p.equipment, eq],
    });

  return (
    <>
      <Card>
        <span className="step-label">{tr('stepProfile')}</span>
        <h2 className="display">{tr('profile')}</h2>

        <Field label={tr('yourName')}>
          <input
            type="text"
            value={p.name ?? ''}
            autoComplete="given-name"
            onChange={(ev) => actions.setProfile({ name: ev.target.value })}
          />
        </Field>

        <Field label={tr('language')}>
          <Segmented
            ariaLabel={tr('language')}
            value={lang}
            onChange={actions.setLanguage}
            options={LANGUAGES.map((l) => ({ value: l.id, label: l.label }))}
          />
        </Field>

        <Field label={tr('goal')}>
          <Segmented
            ariaLabel={tr('goal')}
            value={p.goal}
            onChange={(goal) => actions.setProfile({ goal })}
            options={GOALS.map((g) => ({ value: g, label: tr(`goal${g[0].toUpperCase()}${g.slice(1)}`) }))}
          />
        </Field>

        <Field label={tr('daysPerWeek')}>
          <Segmented
            ariaLabel={tr('daysPerWeek')}
            value={p.daysPerWeek}
            onChange={(daysPerWeek) => actions.setProfile({ daysPerWeek })}
            options={[1, 2, 3, 4, 5, 6, 7].map((n) => ({ value: n, label: String(n) }))}
          />
        </Field>

        <div className="grid-2">
          <Field label={tr('units')}>
            <Segmented
              ariaLabel={tr('units')}
              value={p.units}
              onChange={(units) => actions.setProfile({ units })}
              options={[
                { value: 'kg', label: 'kg' },
                { value: 'lb', label: 'lb' },
              ]}
            />
          </Field>
          <Field label={tr('bodyweight')}>
            <NumberInput value={p.bodyweight} onChange={(bodyweight) => actions.setProfile({ bodyweight })} />
          </Field>
        </div>

        <Field label={tr('equipment')}>
          <div className="chip-row">
            {EQUIPMENT.map((eq) => (
              <ChipToggle
                key={eq}
                label={tr(`eq_${eq}`)}
                active={p.equipment.includes(eq)}
                onClick={() => toggleEquipment(eq)}
              />
            ))}
          </div>
        </Field>
      </Card>

      <ApiKeyCard />
      <ConcernsCard />
      <ProgressionCard />
      <TargetsCard />

      <Card title={tr('data')}>
        <div className="row">
          <Button
            onClick={() => {
              const blob = new Blob([exportState(state)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `fitness-app1-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            {tr('exportData')}
          </Button>

          <Button onClick={() => fileRef.current?.click()}>{tr('importData')}</Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={async (ev) => {
              const file = ev.target.files?.[0];
              if (!file) return;
              try {
                actions.importJSON(await file.text());
                setImportError(false);
              } catch {
                setImportError(true);
              }
              ev.target.value = '';
            }}
          />

          <Button
            variant="danger"
            onClick={() => {
              if (window.confirm(tr('resetConfirm'))) actions.resetAll();
            }}
          >
            {tr('resetData')}
          </Button>
        </div>
        {importError && <p className="tiny" style={{ color: 'var(--danger)' }}>{tr('importFailed')}</p>}
        <p className="muted tiny">{tr('formOnlyNote')}</p>
      </Card>
    </>
  );
}

/**
 * Somewhere to paste an Anthropic key when the app is served from a static
 * host that cannot run the serverless function.
 *
 * The proxy is still the default and the safer path: whenever a backend
 * answers /api/ai, that is what gets used and this field is ignored.
 */
function ApiKeyCard() {
  const { state, tr, actions } = useApp();
  const saved = (state.profile.apiKey ?? '').trim();
  const [value, setValue] = useState(saved);

  return (
    <Card title={tr('apiKeyTitle')}>
      <p className="muted tiny">{tr('apiKeyHelp')}</p>

      <Field>
        <input
          type="password"
          value={value}
          placeholder="sk-ant-..."
          autoComplete="off"
          spellCheck="false"
          aria-label={tr('apiKeyTitle')}
          onChange={(ev) => setValue(ev.target.value)}
        />
      </Field>

      <div className="row">
        <Button
          variant="primary"
          disabled={!value.trim() || value.trim() === saved}
          onClick={() => actions.setProfile({ apiKey: value.trim() })}
        >
          {tr('save')}
        </Button>
        {saved && (
          <Button
            variant="ghost"
            onClick={() => {
              setValue('');
              actions.setProfile({ apiKey: '' });
            }}
          >
            {tr('apiKeyClear')}
          </Button>
        )}
      </div>

      {saved && <p className="tiny" style={{ color: 'var(--ok)' }}>✓ {tr('apiKeySaved')}</p>}
      <p className="tiny" style={{ color: 'var(--warn)' }}>{tr('apiKeyWarning')}</p>
    </Card>
  );
}

/** Open-ended areas-of-concern list (spec Phase 2.5 / Phase 3). */
function ConcernsCard() {
  const { state, lang, tr, actions } = useApp();
  const [bodyPart, setBodyPart] = useState(BODY_PARTS[0].id);
  const [custom, setCustom] = useState('');
  const [note, setNote] = useState('');

  const add = () => {
    const part = custom.trim() ? custom.trim().toLowerCase().replace(/\s+/g, '_') : bodyPart;
    actions.addConcern(part, note.trim());
    setCustom('');
    setNote('');
  };

  return (
    <Card title={tr('areasOfConcern')}>
      <p className="muted tiny">{tr('areasOfConcernHelp')}</p>

      {state.profile.areasOfConcern.length === 0 && <Empty>{tr('noConcerns')}</Empty>}

      <ul className="list-reset">
        {state.profile.areasOfConcern.map((c) => (
          <li key={c.id} className="entry">
            <div className="spread">
              <strong className="small">{bodyPartName(c.bodyPart, lang)}</strong>
              <Button size="sm" variant="danger" onClick={() => actions.removeConcern(c.id)}>
                {tr('delete')}
              </Button>
            </div>
            <input
              type="text"
              value={c.note}
              placeholder={tr('concernNotePlaceholder')}
              aria-label={tr('concernNote')}
              onChange={(ev) => actions.updateConcern(c.id, { note: ev.target.value })}
            />
          </li>
        ))}
      </ul>

      <hr className="divider" />

      <div className="grid-2">
        <Field label={tr('bodyPart')}>
          <select value={bodyPart} onChange={(ev) => setBodyPart(ev.target.value)}>
            {BODY_PARTS.map((b) => (
              <option key={b.id} value={b.id}>
                {bodyPartName(b.id, lang)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={`${tr('bodyPart')} (${tr('optional')})`}>
          <input type="text" value={custom} onChange={(ev) => setCustom(ev.target.value)} />
        </Field>
      </div>

      <Field label={tr('concernNote')}>
        <input
          type="text"
          value={note}
          placeholder={tr('concernNotePlaceholder')}
          onChange={(ev) => setNote(ev.target.value)}
        />
      </Field>

      <Button onClick={add}>+ {tr('addConcern')}</Button>
    </Card>
  );
}

/** Progression map, scoped to the lifts the user actually trains. */
function ProgressionCard() {
  const { state, lang, tr } = useApp();
  const goal = state.profile.goal;

  const ids = useMemo(() => {
    const logged = loggedExerciseIds(state).filter((id) => MAPPED_EXERCISE_IDS.includes(id));
    // Before there is any history, show a representative PPL slice rather than
    // the whole map.
    return logged.length
      ? logged.slice(0, 12)
      : ['barbell-bench-press', 'lat-pulldown', 'back-squat', 'overhead-press'];
  }, [state]);

  return (
    <Card title={tr('progressionMap')}>
      <p className="muted tiny">
        {tr('progressionHelp')} — {tr('goal')}: {tr(`goal${goal[0].toUpperCase()}${goal.slice(1)}`)}
      </p>

      <ul className="list-reset">
        {ids.map((id) => {
          const opts = progressionOptions(id, goal, state.profile);
          return (
            <li key={id} className="entry">
              <strong className="small">{exerciseName(id, lang)}</strong>
              <Branch label={tr('progressTo')} items={opts.progress} />
              <Branch label={tr('regressTo')} items={opts.regress} />
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function Branch({ label, items }) {
  const { lang, tr } = useApp();
  if (items.length === 0) return null;
  return (
    <div className="stack" style={{ gap: 4 }}>
      <span className="tiny muted">{label}</span>
      <div className="chip-row">
        {items.map((it) => (
          <span
            key={it.exerciseId}
            className="pill"
            style={it.concerns.length ? { color: 'var(--warn)', borderColor: 'var(--warn)' } : undefined}
          >
            {exerciseName(it.exerciseId, lang)}
            {!it.hasEquipment && ` · ${tr('missingEquipment')}`}
            {it.concerns.length > 0 &&
              ` · ⚠ ${it.concerns.map((c) => tr('loadsConcern', { part: bodyPartName(c, lang) })).join(', ')}`}
          </span>
        ))}
      </div>
    </div>
  );
}

function TargetsCard() {
  const { state, lang, tr, actions } = useApp();
  const entries = Object.entries(state.targets ?? {});

  return (
    <Card title={tr('targets')}>
      {entries.length === 0 && <Empty>{tr('noTargets')}</Empty>}
      <ul className="list-reset">
        {entries.map(([exerciseId, target]) => (
          <li key={exerciseId} className="session-row">
            <span className="stack" style={{ gap: 2 }}>
              <strong className="small">{exerciseName(exerciseId, lang)}</strong>
              <span className="muted tiny">
                {target.weight ?? '—'} {state.profile.units} × {target.reps ?? '—'} · {target.source}
              </span>
              {target.note && <span className="muted tiny">“{target.note}”</span>}
            </span>
            <Button size="sm" variant="ghost" onClick={() => actions.clearTarget(exerciseId)}>
              {tr('clearTarget')}
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
