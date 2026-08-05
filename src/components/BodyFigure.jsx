import { useId } from 'react';
import { MAX_TIER } from '../lib/powerScore.js';
import {
  AURA_COLOR,
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

/**
 * PHASE 2 — the tiered figure itself.
 *
 * Artwork by Claude Design: one set of paths per muscle group per tier, so each
 * group renders at its own level independently. Upper body can sit at tier 5
 * while legs sit at tier 2, on the same figure — no averaging anywhere.
 *
 * Paint order is fixed by the asset contract:
 *   SILHOUETTE → INK → aura → per group (fill, shade, hi, line) → hit → RIM
 *
 * The aura is a single filtered layer covering every tier-5 group at once, so
 * adjacent peak groups blend instead of stacking halos. Tier 5 is the only
 * level that gets it.
 */
export default function BodyFigure({ view, levels, selected, onSelect, label, showLabel = false }) {
  // Filter ids must be unique per figure or two SVGs on one screen collide.
  const uid = `${useId().replace(/[:]/g, '')}-${view}`;
  const ids = GROUP_ORDER[view];
  const peak = ids.filter((id) => levels[id] === MAX_TIER);
  // Tier 4 gets a faint heat haze — the aura starts before the top, so you can
  // see a group approaching it rather than having it appear from nothing.
  const rising = ids.filter((id) => levels[id] === MAX_TIER - 1);

  const glow = (list, fill, key) =>
    list.map((id) =>
      MUSCLES[view][id].levels[(levels[id] ?? 1) - 1].fill.map((d, i) => (
        <path key={`${id}-${key}-${i}`} d={d} fill={fill} />
      ))
    );

  return (
    <div className={`bodymap ${peak.length > 0 ? 'is-charged' : ''}`}>
      <svg viewBox={VIEWBOX} role="img" aria-label={label} style={{ overflow: 'visible' }}>
        <defs dangerouslySetInnerHTML={{ __html: AURA_DEFS.replace(/id="/g, `id="${uid}-`) }} />

        <path d={SILHOUETTE[view]} fill="#14181c" stroke="#242a30" strokeWidth="0.8" />

        {INK[view].map((d, i) => (
          <path key={`ink-${i}`} d={d} fill="none" stroke="#2b333c" strokeWidth="0.6" />
        ))}

        {rising.length > 0 && (
          <g className="bm-haze" filter={`url(#${uid}-auraSoft)`} style={{ pointerEvents: 'none' }}>
            {glow(rising, AURA_FLARE, 'haze')}
          </g>
        )}

        {peak.length > 0 && (
          <g className="bm-aura" style={{ pointerEvents: 'none' }}>
            {/* Three stacked layers: a wide swell, the halo, and a white-hot
                core. Each breathes at its own rate, which is what reads as
                energy rather than as a static blur. */}
            <g className="bm-aura-wide" filter={`url(#${uid}-auraSoft)`}>
              {glow(peak, AURA_COLOR, 'wide')}
            </g>
            <g className="bm-aura-soft" filter={`url(#${uid}-auraSoft)`}>
              {glow(peak, AURA_FLARE, 'soft')}
            </g>
            <g className="bm-aura-core" filter={`url(#${uid}-aura)`}>
              {glow(peak, AURA_CORE, 'core')}
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
                onClick={() => onSelect?.(id)}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') onSelect?.(id);
                }}
              />
            </g>
          );
        })}

        <path d={RIM[view]} fill={RIM_FILL} opacity="0.1" style={{ pointerEvents: 'none' }} />
      </svg>
      {showLabel && (
        <p className="muted tiny" style={{ textAlign: 'center' }}>
          {label}
        </p>
      )}
    </div>
  );
}
