import { useState } from 'react';
import { useApp } from '../state/store.jsx';
import { EQUIPMENT, GOALS } from '../lib/storage.js';
import { BODY_PARTS, bodyPartName } from '../data/muscles.js';
import { LANGUAGES } from '../i18n/index.js';
import { Button, Card, ChipToggle, Field, NumberInput, Segmented } from './ui.jsx';

/** Structured onboarding (spec Phase 3): goal, days/week, equipment, concerns. */
export default function Onboarding() {
  const { state, lang, tr, actions } = useApp();
  const [goal, setGoal] = useState(state.profile.goal);
  const [daysPerWeek, setDays] = useState(state.profile.daysPerWeek);
  const [units, setUnits] = useState(state.profile.units);
  const [equipment, setEquipment] = useState(state.profile.equipment);
  const [concerns, setConcerns] = useState(state.profile.areasOfConcern.map((c) => c.bodyPart));

  const toggle = (list, setList, id) =>
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const finish = () => {
    for (const part of concerns) {
      if (!state.profile.areasOfConcern.some((c) => c.bodyPart === part)) actions.addConcern(part, '');
    }
    actions.completeOnboarding({ goal, daysPerWeek, units, equipment });
  };

  return (
    <div className="app">
      <header className="app-head">
        <h1>{tr('welcome')}</h1>
      </header>
      <main className="app-main">
        <p className="muted small">{tr('welcomeSub')}</p>

        <Card title={tr('language')}>
          <Segmented
            ariaLabel={tr('language')}
            value={lang}
            onChange={actions.setLanguage}
            options={LANGUAGES.map((l) => ({ value: l.id, label: l.label }))}
          />
        </Card>

        <Card title={tr('goal')}>
          <Segmented
            ariaLabel={tr('goal')}
            value={goal}
            onChange={setGoal}
            options={GOALS.map((g) => ({
              value: g,
              label: tr(`goal${g[0].toUpperCase()}${g.slice(1)}`),
            }))}
          />
        </Card>

        <Card title={tr('daysPerWeek')}>
          <Segmented
            ariaLabel={tr('daysPerWeek')}
            value={daysPerWeek}
            onChange={setDays}
            options={[1, 2, 3, 4, 5, 6, 7].map((n) => ({ value: n, label: String(n) }))}
          />
        </Card>

        <Card title={tr('units')}>
          <Segmented
            ariaLabel={tr('units')}
            value={units}
            onChange={setUnits}
            options={[
              { value: 'kg', label: 'kg' },
              { value: 'lb', label: 'lb' },
            ]}
          />
        </Card>

        <Card title={tr('equipment')}>
          <div className="chip-row">
            {EQUIPMENT.map((eq) => (
              <ChipToggle
                key={eq}
                label={tr(`eq_${eq}`)}
                active={equipment.includes(eq)}
                onClick={() => toggle(equipment, setEquipment, eq)}
              />
            ))}
          </div>
        </Card>

        <Card title={tr('areasOfConcern')}>
          <p className="muted tiny">{tr('areasOfConcernHelp')}</p>
          <div className="chip-row">
            {BODY_PARTS.map((p) => (
              <ChipToggle
                key={p.id}
                tone="warn"
                label={bodyPartName(p.id, lang)}
                active={concerns.includes(p.id)}
                onClick={() => toggle(concerns, setConcerns, p.id)}
              />
            ))}
          </div>
          <p className="muted tiny">{tr('formOnlyNote')}</p>
        </Card>

        <Field label={tr('bodyweight')}>
          <NumberInput
            value={state.profile.bodyweight}
            onChange={(v) => actions.setProfile({ bodyweight: v })}
            placeholder={state.profile.units}
          />
        </Field>

        <Button variant="primary" className="btn-block" onClick={finish}>
          {tr('finish')}
        </Button>
      </main>
    </div>
  );
}
