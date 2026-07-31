import { bodyPartName, muscleName } from '../data/muscles.js';
import { exerciseName } from '../data/exercises.js';
import { formatHoursAgo } from '../lib/date.js';
import { useApp } from '../state/store.jsx';
import { Button, Card } from './ui.jsx';

/**
 * Non-blocking warnings for the session being built (spec Phase 2.5).
 *
 * Two independent systems rendered in one place:
 *  - muscle recency (24-36h window, strength sessions only)
 *  - areas of concern (48h cooldown, any session that loads the flagged part)
 *
 * Nothing here can stop a save. Dismissing hides the item for the rest of the day.
 */
export default function WarningsPanel({ warnings }) {
  const { lang, tr, actions } = useApp();
  if (!warnings || warnings.length === 0) return null;

  return (
    <Card tone="warn" title={tr('warningsTitle')}>
      <ul className="list-reset">
        {warnings.map((w) => (
          <li
            key={w.key}
            className={`warn-item ${w.kind === 'concern' ? 'is-concern' : w.level === 'rest' ? 'is-rest' : ''}`}
          >
            <div className="spread">
              <strong className="small">
                {w.kind === 'recovery'
                  ? tr(w.level === 'rest' ? 'recoveryRest' : 'recoveryCaution', {
                      muscle: muscleName(w.muscleId, lang),
                      ago: formatHoursAgo(w.hoursSinceLastTrained, lang),
                    })
                  : tr('concernWarning', { part: bodyPartName(w.bodyPart, lang) })}
              </strong>
              <Button size="sm" variant="ghost" onClick={() => actions.dismissWarning(w.key)}>
                {tr('dismiss')}
              </Button>
            </div>

            {w.kind === 'concern' && (
              <>
                {w.note && <span className="muted tiny">“{w.note}”</span>}
                <span className="muted tiny">
                  {tr('concernCooldown', {
                    ago: formatHoursAgo(w.hoursSinceLastLoaded, lang),
                    hours: w.cooldownHours,
                  })}
                </span>
              </>
            )}

            <span className="muted tiny">
              {w.viaExercises.map((id) => exerciseName(id, lang)).join(' · ')}
            </span>
          </li>
        ))}
      </ul>
      <p className="muted tiny">{tr('nonBlocking')}</p>
    </Card>
  );
}
