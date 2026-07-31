import { useId, useMemo, useState } from 'react';
import { useApp } from '../state/store.jsx';
import { MUSCLE_BY_ID, muscleName } from '../data/muscles.js';
import { muscleStats } from '../lib/signals.js';
import { MAX_TIER, tierLabel } from '../lib/powerScore.js';
import { formatDate, formatHoursAgo } from '../lib/date.js';
import {
  AURA_CORE,
  AURA_DEFS,
  AURA_FLARE,
  GROUP_ORDER,
  HI_FILL,
  INK,
  MUSCLES,
  RIM,
  RIM_FILL,
  SHADE_FILL,
  SILHOUETTE,
  TIER_COLORS,
  VIEWBOX,
  tierOpacity,
} from './muscleShapes.js';
import { Card, Stat } from './ui.jsx';

/**
 * PHASE 2 — interactive tiered body map.
 *
 * Artwork by Claude Design: one set of paths per muscle group per tier, so each
 * group renders at its own level independently. Upper body can sit at tier 5
 * while legs sit at tier 2, on the same figure.
 *
 * Paint order is fixed by the asset contract:
 *   SILHOUETTE → INK → aura → per group (fill, shade, hi, line) → hit → RIM
 *
 * The aura is a single filtered layer covering every tier-5 group at once, so
 * adjacent peak groups blend instead of stacking halos. Tier 5 is the only
 * level that gets it.
 */

function Figure({ view, levels, selected, onSelect, label }) {
  // Filter ids must be unique per figure or the two SVGs collide.
  const uid = `${useId().replace(/[:]/g, '')}-${view}`;
  const ids = GROUP_ORDER[view];
  const peak = ids.filter((id) => levels[id] === MAX_TIER);

  return (
    <div className="bodymap">
      <svg viewBox={VIEWBOX} role="img" aria-label={label} style={{ overflow: 'visible' }}>
        <defs dangerouslySetInnerHTML={{ __html: AURA_DEFS.replace(/id="/g, `id="${uid}-`) }} />

        <path d={SILHOUETTE[view]} fill="#14181c" stroke="#242a30" strokeWidth="0.8" />

        {INK[view].map((d, i) => (
          <path key={`ink-${i}`} d={d} fill="none" stroke="#2b333c" strokeWidth="0.6" />
        ))}

        {peak.length > 0 && (
          <g className="bm-aura" style={{ pointerEvents: 'none' }}>
            <g filter={`url(#${uid}-auraSoft)`} opacity="0.5">
              {peak.map((id) =>
                MUSCLES[view][id].levels[MAX_TIER - 1].fill.map((d, i) => (
                  <path key={`${id}-soft-${i}`} d={d} fill={AURA_FLARE} />
                ))
              )}
            </g>
            <g filter={`url(#${uid}-aura)`} opacity="0.85">
              {peak.map((id) =>
                MUSCLES[view][id].levels[MAX_TIER - 1].fill.map((d, i) => (
                  <path key={`${id}-core-${i}`} d={d} fill={AURA_CORE} />
                ))
              )}
            </g>
          </g>
        )}

        {ids.map((id) => {
          const lvl = Math.min(MAX_TIER, Math.max(1, levels[id] ?? 1));
          const g = MUSCLES[view][id].levels[lvl - 1];
          const isSelected = selected === id;

          return (
            <g key={id} data-muscle={id} data-level={lvl}>
              <g opacity={tierOpacity(lvl - 1)}>
                {g.fill.map((d, i) => (
                  <path key={`f${i}`} d={d} fill={TIER_COLORS[lvl - 1]} />
                ))}
                {g.shade.map((d, i) => (
                  <path key={`s${i}`} d={d} fill={SHADE_FILL} fillRule="evenodd" opacity="0.34" />
                ))}
                {g.hi.map((d, i) => (
                  <path key={`h${i}`} d={d} fill={HI_FILL} fillRule="evenodd" opacity="0.16" />
                ))}
                {g.line.map((d, i) => (
                  <path key={`l${i}`} d={d} fill="none" stroke="#000" strokeWidth="0.5" opacity="0.35" />
                ))}
              </g>

              {/* Constant-size touch target, independent of the tier's artwork. */}
              <path
                className={`muscle-hit ${isSelected ? 'is-selected' : ''}`}
                d={MUSCLES[view][id].hit}
                fill="transparent"
                stroke={isSelected ? 'var(--accent)' : 'transparent'}
                strokeWidth="1.4"
                role="button"
                tabIndex={0}
                aria-label={id}
                onClick={() => onSelect(id)}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') onSelect(id);
                }}
              />
            </g>
          );
        })}

        <path d={RIM[view]} fill={RIM_FILL} opacity="0.1" style={{ pointerEvents: 'none' }} />
      </svg>
      <p className="muted tiny" style={{ textAlign: 'center' }}>
        {label}
      </p>
    </div>
  );
}

export default function BodyMap() {
  const { state, lang, tr } = useApp();
  const [selected, setSelected] = useState('chest');

  const stats = useMemo(() => {
    const list = muscleStats(state);
    return Object.fromEntries(list.map((m) => [m.muscleId, m]));
  }, [state]);

  const levels = useMemo(
    () => Object.fromEntries(Object.values(stats).map((m) => [m.muscleId, m.tier])),
    [stats]
  );

  const current = stats[selected];

  return (
    <>
      <Card title={tr('bodyMap')}>
        <div className="bodymap-wrap">
          <Figure view="front" levels={levels} selected={selected} onSelect={setSelected} label={tr('front')} />
          <Figure view="back" levels={levels} selected={selected} onSelect={setSelected} label={tr('back')} />
        </div>
        <p className="muted tiny">{tr('tierExplainer')}</p>
      </Card>

      {current && (
        <Card
          title={muscleName(selected, lang)}
          action={
            <span className="tier-badge">
              <span className="tier-dot" style={{ background: TIER_COLORS[current.tier - 1] }} />
              {tr('tier')} {current.tier} · {tierLabel(current.tier, lang)}
            </span>
          }
        >
          <div className="stat-row">
            <Stat label={tr('powerScore')} value={Math.round(current.powerScore)} />
            <Stat
              label={tr('lastTrained')}
              value={current.lastTrainedDate ? formatHoursAgo(current.hoursSinceLastTrained, lang) : tr('never')}
              sub={current.lastTrainedDate ? formatDate(current.lastTrainedDate, lang) : ''}
            />
            <Stat label={tr('weekStreak')} value={current.streakWeeks} />
            <Stat label={tr('sessions28')} value={current.sessionsLast28} />
          </div>

          <div className="stack">
            <Component label={tr('recency')} value={current.components.recency} />
            <Component label={tr('volumeTrend')} value={current.components.trend} />
            <Component label={tr('consistency')} value={current.components.consistency} />
          </div>

          <span className="muted tiny">
            {MUSCLE_BY_ID[selected].sizeClass === 'large' ? 'large group' : 'small group'} ·{' '}
            {current.volumeMetric} 7d: {current.rollingVolume7d.join(' / ')}
          </span>
        </Card>
      )}

      <Card title={tr('bodyMap')}>
        <div className="muscle-list">
          {Object.values(stats).map((m) => (
            <button
              type="button"
              key={m.muscleId}
              className={`muscle-row ${selected === m.muscleId ? 'is-selected' : ''}`}
              onClick={() => setSelected(m.muscleId)}
            >
              <span className="spread">
                <strong className="small">{muscleName(m.muscleId, lang)}</strong>
                <span className="tiny muted">T{m.tier}</span>
              </span>
              <span className="meter">
                <span style={{ width: `${Math.round(m.powerScore)}%`, background: TIER_COLORS[m.tier - 1] }} />
              </span>
            </button>
          ))}
        </div>
      </Card>
    </>
  );
}

function Component({ label, value }) {
  return (
    <div className="stack" style={{ gap: 4 }}>
      <span className="spread tiny muted">
        <span>{label}</span>
        <span>{Math.round(value)}</span>
      </span>
      <span className="meter">
        <span style={{ width: `${Math.round(value)}%` }} />
      </span>
    </div>
  );
}
