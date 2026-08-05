import { useMemo, useState } from 'react';
import { useApp } from '../state/store.jsx';
import { activityStreak, muscleStats, strengthSessions, summarizeEntry } from '../lib/signals.js';
import { MUSCLE_GROUPS, muscleName } from '../data/muscles.js';
import { tierLabel } from '../lib/powerScore.js';
import { formatDate, formatHoursAgo } from '../lib/date.js';
import { blockAndWeek, motivationFor, motivationText, tierMovement } from '../lib/motivation.js';
import { TIER_COLORS } from './muscleShapes.js';
import BodyFigure from './BodyFigure.jsx';
import { IconFlame, IconSpark } from './Icons.jsx';
import { Button, Card } from './ui.jsx';

/** Total volume load across every logged strength session in the last 7 days. */
function weekVolume(state, now = Date.now()) {
  let total = 0;
  for (const s of strengthSessions(state)) {
    if ((s.createdAt ?? 0) < now - 7 * 86400000) continue;
    for (const e of s.entries) total += summarizeEntry(e).volumeLoad;
  }
  return total;
}

const compact = (n, units) => {
  if (n >= 1000) return { value: (n / 1000).toFixed(1).replace('.', ','), suffix: `k ${units}` };
  return { value: String(Math.round(n)), suffix: units };
};

/** Home screen: who you are, how you're doing, and the map. */
export default function Dashboard({ onOpenSuggestions }) {
  const { state, lang, tr, actions } = useApp();
  const [view, setView] = useState('front');
  const [selected, setSelected] = useState(null);
  const [nameDraft, setNameDraft] = useState('');

  const stats = useMemo(() => muscleStats(state), [state]);
  const byId = useMemo(() => Object.fromEntries(stats.map((m) => [m.muscleId, m])), [stats]);
  const levels = useMemo(() => Object.fromEntries(stats.map((m) => [m.muscleId, m.tier])), [stats]);

  const streak = useMemo(() => activityStreak(state), [state]);
  const movement = useMemo(() => tierMovement(muscleStats, state), [state]);
  const cycle = useMemo(() => blockAndWeek(state), [state]);
  const power = Math.round(stats.reduce((a, m) => a + m.powerScore, 0));
  const vol = compact(weekVolume(state), state.profile.units);
  const doneThisWeek = useMemo(() => {
    const since = Date.now() - 7 * 86400000;
    return new Set(state.sessions.filter((s) => (s.createdAt ?? 0) >= since).map((s) => s.date)).size;
  }, [state.sessions]);

  const pending = state.suggestions.filter((s) => s.status === 'pending');
  const current = selected ? byId[selected] : null;

  const lastSessionAt = Math.max(0, ...state.sessions.map((s) => s.createdAt ?? 0));
  const line = motivationText(
    motivationFor({
      stats,
      streak,
      doneThisWeek,
      daysPerWeek: state.profile.daysPerWeek,
      tiersUp: movement.up,
      daysSinceLastSession: lastSessionAt ? (Date.now() - lastSessionAt) / 86400000 : 0,
      muscleName: (id) => muscleName(id, lang),
    }),
    lang
  );

  return (
    <>
      <div className="spread" style={{ padding: '2px 2px 4px' }}>
        <div className="row row-tight row-nowrap">
          <span
            aria-hidden="true"
            style={{
              width: 42, height: 42, borderRadius: '50%', flex: '0 0 auto',
              background: 'var(--surface-2)', border: '1px solid var(--line-2)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontStyle: 'italic', fontWeight: 800,
            }}
          >
            {(state.profile.name || '?').slice(0, 1).toUpperCase()}
          </span>
          <span className="stack stack-tight">
            <strong style={{ fontSize: '1.15rem' }}>{state.profile.name || tr('yourName')}</strong>
            <span className="micro">
              {tr('blockWeek', { block: cycle.block, week: cycle.weekOfBlock })}
            </span>
          </span>
        </div>

        <span className="pill pill-accent" style={{ fontSize: '0.78rem', padding: '7px 12px' }}>
          <IconFlame style={{ width: 13, height: 13 }} aria-hidden="true" />
          <strong style={{ fontSize: '0.95rem' }}>{streak.currentDays}</strong> {tr('streakDays')}
        </span>
      </div>

      {!state.profile.name && (
        <form
          className="card card-tight"
          style={{ borderColor: 'var(--accent-deep)' }}
          onSubmit={(ev) => {
            ev.preventDefault();
            if (nameDraft.trim()) actions.setProfile({ name: nameDraft.trim() });
          }}
        >
          <span className="step-label">{tr('askName')}</span>
          <div className="row row-nowrap">
            <input
              type="text"
              value={nameDraft}
              autoComplete="given-name"
              aria-label={tr('yourName')}
              placeholder={tr('yourName')}
              onChange={(ev) => setNameDraft(ev.target.value)}
            />
            <Button type="submit" variant="primary" disabled={!nameDraft.trim()}>
              {tr('save')}
            </Button>
          </div>
        </form>
      )}

      {line && (
        <p className="hero-line">
          <IconSpark aria-hidden="true" />
          {line}
        </p>
      )}

      <div className="stat-strip">
        <div>
          <span className="stat-label">{tr('statPower')}</span>
          <span className="stat-value">{power}</span>
        </div>
        <div>
          <span className="stat-label">{tr('statVolume')}</span>
          <span className="stat-value">
            {vol.value}
            <span className="stat-sub"> {vol.suffix}</span>
          </span>
        </div>
        <div>
          <span className="stat-label">{tr('statSessions')}</span>
          <span className="stat-value">
            {doneThisWeek}
            <span className="stat-sub">/{state.profile.daysPerWeek}</span>
          </span>
        </div>
      </div>

      {pending.length > 0 && (
        <button type="button" className="session-row" onClick={onOpenSuggestions} style={{ borderColor: 'var(--accent-deep)' }}>
          <span className="row row-tight">
            <span className="dot dot-flagged" />
            <span className="small">{tr('openSuggestion')}</span>
          </span>
          <span className="pill pill-accent">{pending.length}</span>
        </button>
      )}

      <Card>
        <div className="spread">
          <span className="step-label">{tr('stepMap')}</span>
          <span className="switch">
            <button type="button" className={view === 'front' ? 'is-active' : ''} onClick={() => setView('front')}>
              {tr('front')}
            </button>
            <button type="button" className={view === 'back' ? 'is-active' : ''} onClick={() => setView('back')}>
              {tr('back')}
            </button>
          </span>
        </div>

        <div className="bodymap-wrap">
          <BodyFigure view={view} levels={levels} selected={selected} onSelect={setSelected} label={tr(view)} />
        </div>

        <div className="tier-strip" aria-hidden="true">
          {MUSCLE_GROUPS.map((m) => (
            <span key={m.id} style={{ background: TIER_COLORS[(byId[m.id]?.tier ?? 1) - 1] }} />
          ))}
        </div>

        {streak.totalSessions === 0 && <p className="empty">{tr('noDataYet')}</p>}
      </Card>

      {current && (
        <Card>
          <div className="spread">
            <strong className="display-sm">{muscleName(current.muscleId, lang)}</strong>
            <span className="tier-badge">
              <span className="tier-dot" style={{ background: TIER_COLORS[current.tier - 1] }} />
              {tr('tier')} {current.tier} · {tierLabel(current.tier, lang)}
            </span>
          </div>

          <div className="rows">
            <div>
              <span className="muted small">{tr('powerScore')}</span>
              <strong>{Math.round(current.powerScore)}</strong>
            </div>
            <div>
              <span className="muted small">{tr('lastTrained')}</span>
              <strong>
                {current.lastTrainedDate
                  ? `${formatHoursAgo(current.hoursSinceLastTrained, lang)} · ${formatDate(current.lastTrainedDate, lang)}`
                  : tr('never')}
              </strong>
            </div>
            <div>
              <span className="muted small">{tr('weekStreak')}</span>
              <strong>{current.streakWeeks}</strong>
            </div>
            <div>
              <span className="muted small">{tr('sessions28')}</span>
              <strong>{current.sessionsLast28}</strong>
            </div>
          </div>

          <div className="stack stack-tight">
            {[
              [tr('recency'), current.components.recency],
              [tr('volumeTrend'), current.components.trend],
              [tr('consistency'), current.components.consistency],
            ].map(([label, v]) => (
              <div key={label} className="stack" style={{ gap: 4 }}>
                <span className="spread tiny muted">
                  <span>{label}</span>
                  <span>{Math.round(v)}</span>
                </span>
                <span className="bar">
                  <span style={{ width: `${Math.round(v)}%` }} />
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <span className="step-label">{tr('bodyMap')}</span>
        <div className="muscle-list">
          {stats.map((m) => (
            <button
              type="button"
              key={m.muscleId}
              className={`muscle-row ${selected === m.muscleId ? 'is-selected' : ''}`}
              onClick={() => setSelected(m.muscleId)}
            >
              <span className="spread">
                <strong className="small">{muscleName(m.muscleId, lang)}</strong>
                <span className="tiny faint">T{m.tier}</span>
              </span>
              <span className="bar">
                <span style={{ width: `${Math.round(m.powerScore)}%`, background: TIER_COLORS[m.tier - 1] }} />
              </span>
            </button>
          ))}
        </div>
        <p className="tiny faint" style={{ margin: 0 }}>{tr('tierExplainer')}</p>
      </Card>
    </>
  );
}

export { weekVolume };
