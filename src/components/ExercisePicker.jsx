import { useMemo, useState } from 'react';
import { EXERCISE_CATEGORIES, searchExercises } from '../data/exercises.js';
import { bodyPartName, muscleName } from '../data/muscles.js';
import { useApp } from '../state/store.jsx';
import { Button, Empty, Modal, Segmented } from './ui.jsx';

/**
 * Exercise picker. Flags any exercise that loads a body part on the user's
 * areas-of-concern list — visible before you commit, never blocking.
 */
export default function ExercisePicker({ onPick, onClose, restrictTo = null, title }) {
  const { state, lang, tr } = useApp();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(restrictTo ?? 'all');

  const flagged = useMemo(
    () => new Set((state.profile.areasOfConcern ?? []).map((c) => c.bodyPart)),
    [state.profile.areasOfConcern]
  );

  const results = useMemo(() => {
    let list = searchExercises(query, lang);
    if (restrictTo) list = list.filter((e) => e.category === restrictTo);
    else if (category !== 'all') list = list.filter((e) => e.category === category);
    return list;
  }, [query, category, lang, restrictTo]);

  const categoryOptions = [
    { value: 'all', label: tr('all') },
    ...EXERCISE_CATEGORIES.map((c) => ({ value: c, label: tr(`st_${c === 'core' ? 'custom' : c}`) })),
  ];

  return (
    <Modal title={title ?? tr('addExercise')} onClose={onClose} closeLabel={tr('close')}>
      <input
        type="text"
        value={query}
        autoFocus
        placeholder={tr('search')}
        onChange={(e) => setQuery(e.target.value)}
        aria-label={tr('search')}
      />

      {!restrictTo && (
        <Segmented ariaLabel={tr('search')} value={category} onChange={setCategory} options={categoryOptions} />
      )}

      {results.length === 0 && <Empty>{tr('empty')}</Empty>}

      <ul className="list-reset">
        {results.map((e) => {
          const concerns = e.bodyParts.filter((p) => flagged.has(p));
          const muscles = [...e.primary, ...e.secondary].slice(0, 3);
          return (
            <li key={e.id}>
              <button type="button" className="session-row grow" style={{ width: '100%' }} onClick={() => onPick(e.id)}>
                <span className="stack" style={{ gap: 4, alignItems: 'flex-start' }}>
                  <strong>{e.name[lang]}</strong>
                  <span className="muted tiny">
                    {e.movementType} · {muscles.map((m) => muscleName(m, lang)).join(', ') || '—'}
                  </span>
                  {concerns.length > 0 && (
                    <span className="pill" style={{ color: 'var(--warn)', borderColor: 'var(--warn)' }}>
                      ⚠ {concerns.map((p) => bodyPartName(p, lang)).join(', ')}
                    </span>
                  )}
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
