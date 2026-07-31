import { useMemo, useState } from 'react';
import { useApp } from '../state/store.jsx';
import { MUSCLE_BY_ID, muscleName } from '../data/muscles.js';
import { muscleStats } from '../lib/signals.js';
import { MAX_TIER, tierLabel } from '../lib/powerScore.js';
import { formatDate, formatHoursAgo } from '../lib/date.js';
import { Card, Stat } from './ui.jsx';

/**
 * PHASE 2 — interactive tiered body map.
 *
 * Assets swap per muscle based on that muscle's current tier: shapes inflate as
 * a group climbs and deflate as it goes untrained, and tier 5 alone gets the
 * aura treatment. Every group is independent — upper body can sit at tier 5
 * while legs sit at tier 2.
 *
 * The geometry here is deliberately plain placeholder art. Final character
 * assets drop into `TIER_SCALE` / the shape tables without touching the tier
 * logic that feeds them.
 */

const TIER_COLORS = ['#3b4452', '#4d7fa8', '#4fa3c7', '#47c9a4', '#ffd166'];

/** Visible growth as tiers rise, visible deflation as they fall. */
const TIER_SCALE = [0.88, 0.94, 1.0, 1.06, 1.13];

const e = (cx, cy, rx, ry) => ({ type: 'ellipse', cx, cy, rx, ry });
const r = (x, y, w, h, rd = 6) => ({ type: 'rect', x, y, w, h, rd });

const FRONT = [
  { muscleId: 'shoulders', shapes: [e(33, 50, 11, 9), e(87, 50, 11, 9)] },
  { muscleId: 'chest', shapes: [e(49, 60, 13, 10), e(71, 60, 13, 10)] },
  { muscleId: 'biceps', shapes: [e(27, 78, 7, 13), e(93, 78, 7, 13)] },
  { muscleId: 'forearms', shapes: [e(21, 106, 6, 15), e(99, 106, 6, 15)] },
  { muscleId: 'abs', shapes: [r(48, 74, 24, 32, 7)] },
  { muscleId: 'quads', shapes: [e(49, 138, 11, 26), e(71, 138, 11, 26)] },
];

const BACK = [
  { muscleId: 'shoulders', shapes: [e(33, 50, 11, 9), e(87, 50, 11, 9)] },
  { muscleId: 'upper_back', shapes: [r(44, 46, 32, 22, 9)] },
  { muscleId: 'lats', shapes: [e(44, 78, 12, 16), e(76, 78, 12, 16)] },
  { muscleId: 'triceps', shapes: [e(27, 78, 7, 13), e(93, 78, 7, 13)] },
  { muscleId: 'lower_back', shapes: [r(50, 96, 20, 18, 6)] },
  { muscleId: 'glutes', shapes: [e(50, 124, 12, 12), e(70, 124, 12, 12)] },
  { muscleId: 'hamstrings', shapes: [e(49, 154, 11, 22), e(71, 154, 11, 22)] },
  { muscleId: 'calves', shapes: [e(49, 198, 8, 18), e(71, 198, 8, 18)] },
];

function centerOf(shapes) {
  const pts = shapes.map((s) => (s.type === 'ellipse' ? [s.cx, s.cy] : [s.x + s.w / 2, s.y + s.h / 2]));
  return [
    pts.reduce((a, p) => a + p[0], 0) / pts.length,
    pts.reduce((a, p) => a + p[1], 0) / pts.length,
  ];
}

function Shape({ shape }) {
  return shape.type === 'ellipse' ? (
    <ellipse cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} />
  ) : (
    <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={shape.rd} />
  );
}

function Figure({ parts, stats, selected, onSelect, label }) {
  const idPrefix = label.toLowerCase();
  return (
    <div className="bodymap">
      <svg viewBox="0 0 120 230" role="img" aria-label={label}>
        <defs>
          <filter id={`aura-${idPrefix}`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Silhouette */}
        <g fill="#1d232d" stroke="#262e3a" strokeWidth="1">
          <circle cx="60" cy="24" r="13" />
          <rect x="42" y="40" width="36" height="76" rx="14" />
          <rect x="44" y="112" width="32" height="106" rx="14" />
          <rect x="18" y="46" width="14" height="76" rx="7" />
          <rect x="88" y="46" width="14" height="76" rx="7" />
        </g>

        {parts.map((part) => {
          const stat = stats[part.muscleId];
          const tier = stat?.tier ?? 1;
          const [cx, cy] = centerOf(part.shapes);
          const scale = TIER_SCALE[tier - 1];
          const isSelected = selected === part.muscleId;
          return (
            <g
              key={`${idPrefix}-${part.muscleId}`}
              className={`muscle-shape ${isSelected ? 'is-selected' : ''}`}
              fill={TIER_COLORS[tier - 1]}
              opacity={0.55 + 0.09 * tier}
              filter={tier === MAX_TIER ? `url(#aura-${idPrefix})` : undefined}
              transform={`translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})`}
              onClick={() => onSelect(part.muscleId)}
              role="button"
              tabIndex={0}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') onSelect(part.muscleId);
              }}
              aria-label={part.muscleId}
            >
              {part.shapes.map((s, i) => (
                <Shape key={i} shape={s} />
              ))}
            </g>
          );
        })}
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

  const current = stats[selected];

  return (
    <>
      <Card title={tr('bodyMap')}>
        <div className="bodymap-wrap">
          <Figure parts={FRONT} stats={stats} selected={selected} onSelect={setSelected} label={tr('front')} />
          <Figure parts={BACK} stats={stats} selected={selected} onSelect={setSelected} label={tr('back')} />
        </div>
        <p className="muted tiny">{tr('tierExplainer')}</p>
        <p className="muted tiny">{tr('artPlaceholder')}</p>
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
                <span
                  style={{ width: `${Math.round(m.powerScore)}%`, background: TIER_COLORS[m.tier - 1] }}
                />
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
