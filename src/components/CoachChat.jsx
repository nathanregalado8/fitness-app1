import { Fragment, useEffect, useRef, useState } from 'react';
import { useApp } from '../state/store.jsx';
import { sendChat } from '../lib/aiClient.js';
import { exerciseName } from '../data/exercises.js';
import { bodyPartName } from '../data/muscles.js';
import { formatDate, toISODate } from '../lib/date.js';
import { Button, Card } from './ui.jsx';

/**
 * Talk to the coach.
 *
 * The reply is prose, but nothing it says changes the app by itself. Anything
 * that would write comes back as a typed proposal and renders as a button —
 * the spec is explicit that edits happen through controls, never through chat,
 * and that the only forward write is a target the user confirms. Historical
 * logs are out of reach from here entirely.
 */
export default function CoachChat({ onStartSession }) {
  const { state, lang, tr, actions } = useApp();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const endRef = useRef(null);

  const thread = state.chat ?? [];
  const today = toISODate();

  // The thread always opens at the bottom, on today. A conversation from
  // yesterday is context, not where you are now.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [thread.length, busy]);

  const lastAt = thread.at(-1)?.at ?? null;
  const isNewDay = lastAt != null && toISODate(lastAt) !== today;

  const send = async (raw) => {
    const message = raw.trim();
    if (!message || busy) return;

    actions.appendChat({ role: 'user', text: message });
    setText('');
    setBusy(true);
    setError(null);

    const res = await sendChat(state, message, thread);
    setBusy(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }
    actions.appendChat({ role: 'coach', text: res.data.reply, proposals: res.data.proposals ?? [] });
  };

  const apply = (messageId, index, pr) => {
    if (pr.kind === 'set_target') {
      actions.setTarget(pr.exerciseId, {
        weight: pr.weight,
        reps: pr.reps,
        note: pr.note,
        source: 'chat_confirmed',
      });
    } else if (pr.kind === 'flag_concern') {
      actions.addConcern(pr.bodyPart, pr.note);
    } else if (pr.kind === 'clear_concern') {
      const hit = state.profile.areasOfConcern.find((c) => c.bodyPart === pr.bodyPart);
      if (hit) actions.removeConcern(hit.id);
    } else if (pr.kind === 'set_profile') {
      actions.setProfile(pr.fields);
    } else if (pr.kind === 'set_equipment') {
      const owned = state.profile.equipment ?? [];
      actions.setProfile({
        equipment: pr.enabled
          ? [...new Set([...owned, pr.equipment])]
          : owned.filter((eq) => eq !== pr.equipment),
      });
    } else if (pr.kind === 'build_session') {
      // Same handoff the generator uses: it becomes an editable draft, and
      // nothing is logged until the user finishes the session themselves.
      onStartSession?.({ sessionType: pr.sessionType, title: pr.label, blocks: pr.blocks });
    }
    actions.markProposalApplied(messageId, index);
  };

  const describe = (pr) => {
    if (pr.kind === 'set_target') {
      return `${exerciseName(pr.exerciseId, lang)} · ${pr.weight ?? '—'} ${state.profile.units} × ${pr.reps ?? '—'}`;
    }
    if (pr.kind === 'set_profile') {
      return Object.entries(pr.fields)
        .map(([k, v]) =>
          k === 'goal' ? tr(`goal${v[0].toUpperCase()}${v.slice(1)}`) : `${tr(k === 'daysPerWeek' ? 'daysPerWeek' : 'units')}: ${v}`
        )
        .join(' · ');
    }
    if (pr.kind === 'set_equipment') {
      return `${pr.enabled ? '+' : '−'} ${tr(`eq_${pr.equipment}`)}`;
    }
    if (pr.kind === 'build_session') {
      return `${tr(`st_${pr.sessionType}`)} · ${pr.blocks.map((b) => exerciseName(b.exerciseId, lang)).join(', ')}`;
    }
    return bodyPartName(pr.bodyPart, lang);
  };

  return (
    <>
      <Card>
        <div className="spread">
          <span className="step-label">{tr('stepChat')}</span>
          {thread.length > 0 && (
            <Button size="sm" variant="quiet" onClick={actions.clearChat}>
              {tr('clearChat')}
            </Button>
          )}
        </div>
        <h2 className="display">{tr('chatTitle')}</h2>
        <p className="tiny faint" style={{ margin: 0 }}>{tr('chatNote')}</p>
      </Card>

      <div className="thread">
        {thread.length === 0 && !busy && (
          <div className="chip-row">
            {['chatSeedHeavy', 'chatSeedTired', 'chatSeedPlateau', 'chatSeedWeak'].map((k) => (
              <button key={k} type="button" className="chip" onClick={() => send(tr(k))}>
                {tr(k)}
              </button>
            ))}
          </div>
        )}

        {thread.map((m, i) => {
          const day = m.at ? toISODate(m.at) : today;
          const prevDay = i > 0 && thread[i - 1].at ? toISODate(thread[i - 1].at) : null;
          return (
            <Fragment key={m.id}>
              {day !== prevDay && (
                <span className="day-divider">
                  {day === today ? tr('today') : formatDate(day, lang)}
                </span>
              )}
              <div className={`bubble bubble-${m.role}`}>
                <p style={{ margin: 0 }}>{m.text}</p>

                {(m.proposals ?? []).map((pr, j) => (
                  <div key={j} className="proposal">
                    <span className="stack stack-tight">
                      <span className="micro">{tr(`prop_${pr.kind}`)}</span>
                      <strong className="small">{describe(pr)}</strong>
                      {pr.note && <span className="tiny faint">{pr.note}</span>}
                    </span>
                    {pr.appliedAt ? (
                      <span className="pill">✓ {tr('applied')}</span>
                    ) : (
                      <Button size="sm" variant="primary" onClick={() => apply(m.id, j, pr)}>
                        {pr.label}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </Fragment>
          );
        })}

        {isNewDay && <span className="day-divider">{tr('today')}</span>}

        {busy && (
          <div className="bubble bubble-coach">
            <span className="row row-tight small">
              <span className="spinner" /> {tr('loading')}
            </span>
          </div>
        )}

        <span ref={endRef} />
      </div>

      {error && (
        <Card tone="warn">
          <strong className="small">{tr('suggestionFailed')}</strong>
          <p className="muted tiny" style={{ margin: 0 }}>
            {error.code === 'bad_api_key'
              ? tr('badApiKey')
              : error.code === 'no_backend'
                ? tr('coachNoBackend')
                : error.code === 'missing_api_key'
                  ? tr('coachDisabled')
                  : error.message || error.code}
          </p>
        </Card>
      )}

      <form
        className="composer"
        onSubmit={(ev) => {
          ev.preventDefault();
          send(text);
        }}
      >
        <input
          type="text"
          value={text}
          placeholder={tr('chatPlaceholder')}
          aria-label={tr('chatTitle')}
          onChange={(ev) => setText(ev.target.value)}
        />
        <Button type="submit" variant="primary" disabled={busy || !text.trim()}>
          {tr('send')}
        </Button>
      </form>
    </>
  );
}
