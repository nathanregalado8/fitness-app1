import { useMemo, useState } from 'react';
import { useApp } from '../state/store.jsx';
import { exerciseName } from '../data/exercises.js';
import { formatDate, monthMatrix, monthName, toISODate, weekdayShort } from '../lib/date.js';
import { activityStreak, summarizeEntry } from '../lib/signals.js';
import { Button, Card, Empty } from './ui.jsx';

/** Calendar view with history by date (spec Phase 1). */
export default function Calendar() {
  const { state, lang, tr, actions } = useApp();
  const today = toISODate();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selected, setSelected] = useState(today);

  const byDate = useMemo(() => {
    const map = new Map();
    for (const s of state.sessions) {
      const list = map.get(s.date) ?? [];
      list.push(s);
      map.set(s.date, list);
    }
    return map;
  }, [state.sessions]);

  const streak = useMemo(() => activityStreak(state), [state]);
  const rows = monthMatrix(cursor.year, cursor.month);
  const daySessions = byDate.get(selected) ?? [];

  const shift = (delta) =>
    setCursor(({ year, month }) => {
      const m = month + delta;
      return { year: year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
    });

  return (
    <>
      <div className="stat-strip">
        <div>
          <span className="stat-label">{tr('activityStreak')}</span>
          <span className="stat-value">
            {streak.currentDays}
            <span className="stat-sub"> {tr('days')}</span>
          </span>
        </div>
        <div>
          <span className="stat-label">{tr('longest')}</span>
          <span className="stat-value">
            {streak.longestDays}
            <span className="stat-sub"> {tr('days')}</span>
          </span>
        </div>
        <div>
          <span className="stat-label">{tr('totalSessions')}</span>
          <span className="stat-value">{streak.totalSessions}</span>
        </div>
      </div>

      <Card>
        <span className="step-label">{tr('stepHistory')}</span>
        <div className="spread">
          <h2 className="display-sm">
            {monthName(cursor.month, lang)} {cursor.year}
          </h2>
          <span className="row row-tight">
            <Button size="sm" variant="quiet" onClick={() => shift(-1)} aria-label="previous month">
              ‹
            </Button>
            <Button size="sm" variant="quiet" onClick={() => shift(1)} aria-label="next month">
              ›
            </Button>
          </span>
        </div>

        <div className="cal-grid">
          {weekdayShort(lang).map((d) => (
            <span className="cal-head" key={d}>
              {d}
            </span>
          ))}
          {rows.flat().map((cell) => {
            const sessions = byDate.get(cell.iso) ?? [];
            return (
              <button
                type="button"
                key={cell.iso}
                className={[
                  'cal-cell',
                  cell.inMonth ? '' : 'is-out',
                  cell.iso === today ? 'is-today' : '',
                  cell.iso === selected ? 'is-selected' : '',
                ].join(' ')}
                onClick={() => setSelected(cell.iso)}
                aria-label={formatDate(cell.iso, lang)}
              >
                <span>{Number(cell.iso.slice(8))}</span>
                <span className="cal-dots">
                  {sessions.slice(0, 3).map((s) => (
                    <span key={s.id} className={`cal-dot ${s.isStrength ? '' : 'is-activity'}`} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <h2 className="display-sm">{formatDate(selected, lang)}</h2>
        {daySessions.length === 0 && <Empty>{tr('noSessionsOnDay')}</Empty>}
        <ul className="list-reset">
          {daySessions.map((s) => (
            <li key={s.id}>
              <SessionDetail
                session={s}
                onDelete={() => {
                  if (window.confirm(tr('deleteSessionConfirm'))) actions.deleteSession(s.id);
                }}
              />
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

function SessionDetail({ session, onDelete }) {
  const { state, lang, tr } = useApp();
  const units = state.profile.units;

  return (
    <div className="entry">
      <div className="spread">
        <strong className="small">
          {session.customName || tr(`st_${session.sessionType}`)}{' '}
          {!session.isStrength && <span className="pill">{tr('activityStreak')}</span>}
        </strong>
        <Button size="sm" variant="danger" onClick={onDelete}>
          {tr('delete')}
        </Button>
      </div>

      {!session.isStrength && (session.durationMin != null || session.distanceKm != null) && (
        <span className="muted tiny">
          {session.durationMin != null && `${session.durationMin} min`}
          {session.durationMin != null && session.distanceKm != null && ' · '}
          {session.distanceKm != null && `${session.distanceKm} km`}
        </span>
      )}

      {session.entries.map((entry) => {
        const s = summarizeEntry(entry);
        return (
          <div key={entry.id} className="stack" style={{ gap: 2 }}>
            <span className="small">
              <strong>{exerciseName(entry.exerciseId, lang)}</strong>{' '}
              {s.workingSets > 0 && (
                <span className="muted">
                  {s.workingSets} × · {s.totalReps} {tr('reps').toLowerCase()}
                  {s.topSetWeight ? ` · top ${s.topSetWeight}${units}` : ''}
                  {s.completionPct != null ? ` · ${Math.round(s.completionPct * 100)}%` : ''}
                </span>
              )}
            </span>
            {entry.note && <span className="muted tiny">“{entry.note}”</span>}
          </div>
        );
      })}

      {session.notes && <span className="muted tiny">“{session.notes}”</span>}
    </div>
  );
}
