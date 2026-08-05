import { useMemo } from 'react';
import { useApp } from '../state/store.jsx';
import { SESSION_TYPES } from '../lib/storage.js';
import { buildRoutine } from '../lib/routineBuilder.js';
import { muscleStats } from '../lib/signals.js';
import { bodyPartName, muscleName } from '../data/muscles.js';
import { RECOVERY_HOURS } from '../lib/recovery.js';
import { SESSION_ICON } from './Icons.jsx';
import { Card } from './ui.jsx';

/**
 * PHASE 2.5 — pick what you're training today.
 *
 * Every card carries a real reason, computed from the same deterministic
 * routine builder that will produce the session. Nothing here is decorative:
 * the dot and the sentence come from the plan the app would actually build.
 */

/** Which muscles each split is about, for the "why" line. */
const SPLIT_MUSCLES = {
  push: ['chest', 'shoulders', 'triceps'],
  pull: ['lats', 'upper_back', 'biceps'],
  legs: ['quads', 'hamstrings', 'glutes'],
  full_body: ['chest', 'lats', 'quads'],
};

export default function SessionPicker({ onStart }) {
  const { state, lang, tr } = useApp();

  const stats = useMemo(() => {
    const list = muscleStats(state);
    return Object.fromEntries(list.map((m) => [m.muscleId, m]));
  }, [state]);

  const plans = useMemo(
    () => Object.fromEntries(SESSION_TYPES.map((s) => [s.id, buildRoutine(state, s.id)])),
    [state]
  );

  /** Freshness of a split: the least-recovered of its headline muscles. */
  const freshness = (id) => {
    const muscles = SPLIT_MUSCLES[id];
    if (!muscles) return null;
    const hours = muscles.map((m) => stats[m]?.hoursSinceLastTrained ?? Infinity);
    return Math.min(...hours);
  };

  const status = (id) => {
    const plan = plans[id];
    if (plan.cautions?.some((c) => c.type === 'concern')) return 'flagged';
    const hrs = freshness(id);
    if (hrs != null && hrs < RECOVERY_HOURS.caution) return 'recovering';
    if (plan.skipped?.length > 0 || plan.overridden) return 'recovering';
    return 'ready';
  };

  const why = (id) => {
    const plan = plans[id];
    if (plan.activity) return tr('whyDuration');
    if (id === 'custom') return tr('whyBuildOwn');

    const concern = plan.cautions?.find((c) => c.type === 'concern');
    if (concern) return tr('whyFlagged', { part: bodyPartName(concern.bodyPart, lang) });

    const muscles = SPLIT_MUSCLES[id] ?? [];
    // The muscle that has waited longest is what makes today's case.
    const ranked = muscles
      .map((m) => ({ m, s: stats[m] }))
      .sort((a, b) => (b.s?.hoursSinceLastTrained ?? Infinity) - (a.s?.hoursSinceLastTrained ?? Infinity));
    const top = ranked[0];
    if (!top?.s || top.s.hoursSinceLastTrained == null) return tr('whyFresh');

    const days = Math.floor(top.s.hoursSinceLastTrained / 24);
    if (days >= 2) return tr('whyUntouched', { muscle: muscleName(top.m, lang), days });

    const hrs = freshness(id);
    if (hrs < RECOVERY_HOURS.caution) {
      const pct = Math.min(99, Math.round((hrs / RECOVERY_HOURS.caution) * 100));
      const worst = ranked.at(-1);
      return tr('whyRecovered', { muscle: muscleName(worst.m, lang), pct });
    }
    return tr('whyHighLoad');
  };

  // The recommendation is simply whatever has rested longest and isn't flagged.
  const recommended = useMemo(() => {
    const candidates = Object.keys(SPLIT_MUSCLES).filter((id) => status(id) === 'ready');
    if (candidates.length === 0) return null;
    return candidates.sort((a, b) => freshness(b) - freshness(a))[0];
  }, [state]);

  return (
    <>
      <Card>
        <div className="spread">
          <span className="step-label">{tr('stepSession')}</span>
        </div>
        <h2 className="display">{tr('whatTraining')}</h2>

        <div className="pick-grid">
          {SESSION_TYPES.map((s) => {
            const Icon = SESSION_ICON[s.id];
            const st = status(s.id);
            return (
              <button
                key={s.id}
                type="button"
                className={`pick ${recommended === s.id ? 'is-recommended' : ''}`}
                onClick={() => onStart(s.id)}
              >
                <span className={`dot dot-${st}`} aria-hidden="true" />
                <Icon aria-hidden="true" />
                <span className="stack stack-tight">
                  <span className="pick-name">{tr(`st_${s.id}`)}</span>
                  <span className="pick-why">{why(s.id)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <div className="row" style={{ gap: 14 }}>
          {[
            ['ready', 'legendReady'],
            ['recovering', 'legendRecovering'],
            ['flagged', 'legendFlagged'],
          ].map(([k, label]) => (
            <span key={k} className="row row-tight row-nowrap tiny muted">
              <span className={`dot dot-${k}`} aria-hidden="true" />
              {tr(label)}
            </span>
          ))}
        </div>
        <p className="tiny faint" style={{ margin: 0 }}>{tr('legendNote')}</p>
      </Card>
    </>
  );
}
