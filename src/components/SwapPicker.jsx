import { useMemo, useState } from 'react';
import { EXERCISE_BY_ID, alternativesFor, exerciseName } from '../data/exercises.js';
import { bodyPartName, muscleName } from '../data/muscles.js';
import { useApp } from '../state/store.jsx';
import { Button, Modal } from './ui.jsx';

/**
 * Swap one exercise for another that trains the same thing.
 *
 * Alternatives are ranked by how closely they preserve the training intent.
 * Options the user lacks equipment for, or that load a flagged body part, are
 * shown and labelled rather than hidden — the same non-blocking principle the
 * warnings follow.
 */
export default function SwapPicker({ exerciseId, excludeIds = [], onPick, onClose }) {
  const { state, lang, tr } = useApp();
  const [query, setQuery] = useState('');

  const options = useMemo(
    () =>
      alternativesFor(exerciseId, {
        equipment: state.profile.equipment,
        areasOfConcern: state.profile.areasOfConcern,
        exclude: excludeIds,
      }),
    [exerciseId, state.profile.equipment, state.profile.areasOfConcern, excludeIds]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      const e = EXERCISE_BY_ID[o.exerciseId];
      return e.name.en.toLowerCase().includes(q) || e.name.es.toLowerCase().includes(q);
    });
  }, [options, query]);

  return (
    <Modal
      title={tr('swapTitle', { exercise: exerciseName(exerciseId, lang) })}
      onClose={onClose}
      closeLabel={tr('close')}
    >
      <p className="muted tiny">{tr('swapHelp')}</p>
      <p className="muted tiny">{tr('alternativesCount', { n: options.length })}</p>

      <input
        type="text"
        value={query}
        placeholder={tr('search')}
        aria-label={tr('search')}
        onChange={(e) => setQuery(e.target.value)}
      />

      <ul className="list-reset">
        {filtered.map((o) => {
          const e = EXERCISE_BY_ID[o.exerciseId];
          return (
            <li key={o.exerciseId}>
              <button
                type="button"
                className="session-row"
                style={{ width: '100%' }}
                onClick={() => onPick(o.exerciseId)}
              >
                <span className="stack" style={{ gap: 3, alignItems: 'flex-start' }}>
                  <strong className="small">{e.name[lang]}</strong>
                  <span className="muted tiny">
                    {e.movementType} · {e.primary.map((m) => muscleName(m, lang)).join(', ')}
                  </span>
                  <span className="row row-tight">
                    {!o.hasEquipment && <span className="pill">{tr('missingEquipment')}</span>}
                    {o.concerns.length > 0 && (
                      <span className="pill" style={{ color: 'var(--warn)', borderColor: 'var(--warn)' }}>
                        ⚠ {o.concerns.map((c) => bodyPartName(c, lang)).join(', ')}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <Button variant="ghost" onClick={onClose}>
        {tr('cancel')}
      </Button>
    </Modal>
  );
}
