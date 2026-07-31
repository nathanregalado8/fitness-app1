import { useState } from 'react';
import { useApp } from './state/store.jsx';
import Onboarding from './components/Onboarding.jsx';
import Nav from './components/Nav.jsx';
import LogSession from './components/LogSession.jsx';
import Calendar from './components/Calendar.jsx';
import BodyMap from './components/BodyMap.jsx';
import Coach from './components/Coach.jsx';
import ProfileView from './components/Profile.jsx';
import SuggestionCard, { SuggestionQueue } from './components/SuggestionCard.jsx';
import { Button } from './components/ui.jsx';

export default function App() {
  const { state, lang, tr, actions, runSuggestionJob } = useApp();
  const [tab, setTab] = useState('log');
  const [lastSavedSessionId, setLastSavedSessionId] = useState(null);
  const [pendingRoutine, setPendingRoutine] = useState(null);

  if (!state.profile.onboarded) return <Onboarding />;

  // Cards from earlier sessions the user never answered. They stay pending
  // until decided — the job itself never re-runs.
  const olderPending = state.suggestions.filter(
    (s) => s.status === 'pending' && s.sessionId !== lastSavedSessionId
  );

  return (
    <div className="app">
      <header className="app-head">
        <h1>{tr('appName')}</h1>
        <Button size="sm" variant="ghost" onClick={() => actions.setLanguage(lang === 'en' ? 'es' : 'en')}>
          {lang === 'en' ? 'ES' : 'EN'}
        </Button>
      </header>

      <main className="app-main">
        {tab === 'log' && (
          <>
            {lastSavedSessionId && <SuggestionQueue sessionId={lastSavedSessionId} />}
            {olderPending.map((s) => (
              <SuggestionCard key={s.id} suggestion={s} />
            ))}
            <LogSession
              pending={pendingRoutine}
              onConsumePending={() => setPendingRoutine(null)}
              onSaved={(session) => {
                setLastSavedSessionId(session.id);
                // Post-session job: fires here and only here, never on app open.
                runSuggestionJob(session);
              }}
            />
          </>
        )}

        {tab === 'calendar' && <Calendar />}
        {tab === 'body' && <BodyMap />}
        {tab === 'coach' && (
          <Coach
            onUseRoutine={(routine) => {
              setPendingRoutine(routine);
              setTab('log');
            }}
          />
        )}
        {tab === 'profile' && <ProfileView />}
      </main>

      <Nav tab={tab} onChange={setTab} />
    </div>
  );
}
