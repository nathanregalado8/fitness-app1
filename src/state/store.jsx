import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  defaultState,
  importState,
  loadState,
  newConcern,
  newTemplate,
  saveState,
  uid,
} from '../lib/storage.js';
import { translator } from '../i18n/index.js';
import { requestSuggestion, sessionExerciseIds } from '../lib/aiClient.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, setState] = useState(loadState);
  const bootstrapped = useRef(false);
  /** Always-current state, so async jobs can read it without a stale closure. */
  const stateRef = useRef(state);
  stateRef.current = state;
  /** Sessions with a job in flight this tick, before the reducer commits. */
  const inFlight = useRef(new Set());

  // Persist on every change (skipping the very first render, which is just
  // whatever we loaded).
  useEffect(() => {
    if (!bootstrapped.current) {
      bootstrapped.current = true;
      return;
    }
    saveState(state);
  }, [state]);

  const patch = useCallback((updater) => {
    setState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return next === prev ? prev : next;
    });
  }, []);

  const actions = useMemo(() => {
    const setProfile = (fields) =>
      patch((s) => ({ ...s, profile: { ...s.profile, ...fields } }));

    return {
      setProfile,

      setLanguage: (language) => setProfile({ language }),

      completeOnboarding: (fields) => setProfile({ ...fields, onboarded: true }),

      // ------------------------------------------------------------ sessions
      /** Insert or replace a session. Returns the id so callers can run the job. */
      saveSession: (session) =>
        patch((s) => {
          const stamped = { ...session, updatedAt: Date.now() };
          const idx = s.sessions.findIndex((x) => x.id === session.id);
          const sessions =
            idx === -1
              ? [...s.sessions, stamped]
              : s.sessions.map((x) => (x.id === session.id ? stamped : x));
          sessions.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt));
          return { ...s, sessions };
        }),

      deleteSession: (sessionId) =>
        patch((s) => ({
          ...s,
          sessions: s.sessions.filter((x) => x.id !== sessionId),
          suggestions: s.suggestions.filter((x) => x.sessionId !== sessionId),
        })),

      // ----------------------------------------------------------- templates
      addTemplate: (name, sessionType, exerciseIds) =>
        patch((s) => ({ ...s, templates: [...s.templates, newTemplate(name, sessionType, exerciseIds)] })),

      deleteTemplate: (id) => patch((s) => ({ ...s, templates: s.templates.filter((t) => t.id !== id) })),

      // ------------------------------------------------------------- targets
      /**
       * The only forward write the AI can cause — and only after the user
       * presses Yes on a suggestion card. Historical logs are never touched.
       */
      setTarget: (exerciseId, target) =>
        patch((s) => ({
          ...s,
          targets: {
            ...s.targets,
            [exerciseId]: { ...target, updatedAt: Date.now() },
          },
        })),

      clearTarget: (exerciseId) =>
        patch((s) => {
          const targets = { ...s.targets };
          delete targets[exerciseId];
          return { ...s, targets };
        }),

      // --------------------------------------------------------- suggestions
      addSuggestions: (sessionId, overallNote, suggestions) =>
        patch((s) => ({
          ...s,
          suggestions: [
            ...s.suggestions,
            ...suggestions.map((sg) => ({
              id: uid('sug'),
              sessionId,
              createdAt: Date.now(),
              status: 'pending',
              overallNote,
              comment: '',
              ...sg,
            })),
          ],
        })),

      decideSuggestion: (suggestionId, status, extra = {}) =>
        patch((s) => ({
          ...s,
          suggestions: s.suggestions.map((sg) =>
            sg.id === suggestionId ? { ...sg, status, decidedAt: Date.now(), ...extra } : sg
          ),
        })),

      setJob: (sessionId, job) =>
        patch((s) => ({ ...s, jobs: { ...s.jobs, [sessionId]: { ...(s.jobs[sessionId] ?? {}), ...job } } })),

      // ---------------------------------------------------- areas of concern
      addConcern: (bodyPart, note) =>
        patch((s) => {
          const existing = s.profile.areasOfConcern.find((c) => c.bodyPart === bodyPart);
          const areasOfConcern = existing
            ? s.profile.areasOfConcern.map((c) =>
                c.id === existing.id ? { ...c, note: note || c.note } : c
              )
            : [...s.profile.areasOfConcern, newConcern(bodyPart, note)];
          return { ...s, profile: { ...s.profile, areasOfConcern } };
        }),

      updateConcern: (id, fields) =>
        patch((s) => ({
          ...s,
          profile: {
            ...s.profile,
            areasOfConcern: s.profile.areasOfConcern.map((c) => (c.id === id ? { ...c, ...fields } : c)),
          },
        })),

      removeConcern: (id) =>
        patch((s) => ({
          ...s,
          profile: { ...s.profile, areasOfConcern: s.profile.areasOfConcern.filter((c) => c.id !== id) },
        })),

      // -------------------------------------------------------------- misc
      dismissWarning: (key) =>
        patch((s) => ({ ...s, dismissed: { ...s.dismissed, [key]: new Date().toISOString() } })),

      logCoach: (entry) =>
        patch((s) => ({ ...s, coachLog: [{ id: uid('coach'), at: Date.now(), ...entry }, ...s.coachLog].slice(0, 30) })),

      importJSON: (json) => patch(() => importState(json)),

      resetAll: () => patch(() => ({ ...defaultState(), profile: { ...defaultState().profile, onboarded: false } })),
    };
  }, [patch]);

  /**
   * Post-session AI job (spec: runs after each logged session, not on every app
   * open). Guarded by `state.jobs[sessionId]` so a session is only ever
   * reviewed once, no matter how many times the app is reopened.
   */
  const runSuggestionJob = useCallback(
    async (session) => {
      const sessionId = session.id;
      // Read synchronously from the ref: a setState updater is deferred until
      // render, so anything captured inside one is not available here. The
      // session itself is passed in because the save that just queued it has
      // not committed to state yet.
      const base = stateRef.current;
      const snapshot = {
        ...base,
        sessions: [session, ...base.sessions.filter((s) => s.id !== sessionId)],
      };
      const prior = snapshot.jobs[sessionId]?.status;
      if (inFlight.current.has(sessionId) || prior === 'running' || prior === 'done') return;
      inFlight.current.add(sessionId);

      patch((s) => ({ ...s, jobs: { ...s.jobs, [sessionId]: { status: 'running', startedAt: Date.now() } } }));

      if (sessionExerciseIds(session).length === 0 || !session.isStrength) {
        inFlight.current.delete(sessionId);
        patch((s) => ({ ...s, jobs: { ...s.jobs, [sessionId]: { status: 'skipped', finishedAt: Date.now() } } }));
        return;
      }

      const res = await requestSuggestion(snapshot, session);
      inFlight.current.delete(sessionId);

      patch((s) => {
        if (!res.ok) {
          return {
            ...s,
            jobs: {
              ...s.jobs,
              [sessionId]: { status: 'error', error: res.error?.code ?? 'unknown', finishedAt: Date.now() },
            },
          };
        }
        const created = (res.data.suggestions ?? []).map((sg) => ({
          id: uid('sug'),
          sessionId,
          createdAt: Date.now(),
          status: 'pending',
          overallNote: res.data.overallNote,
          comment: '',
          ...sg,
        }));
        return {
          ...s,
          suggestions: [...s.suggestions, ...created],
          jobs: {
            ...s.jobs,
            [sessionId]: {
              status: 'done',
              finishedAt: Date.now(),
              overallNote: res.data.overallNote,
              count: created.length,
            },
          },
        };
      });
    },
    [patch]
  );

  const lang = state.profile.language ?? 'en';
  const value = useMemo(
    () => ({ state, lang, tr: translator(lang), actions, runSuggestionJob }),
    [state, lang, actions, runSuggestionJob]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
