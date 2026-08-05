import { useState } from 'react';
import { useApp } from './state/store.jsx';
import Onboarding from './components/Onboarding.jsx';
import Nav from './components/Nav.jsx';
import Dashboard from './components/Dashboard.jsx';
import Train from './components/Train.jsx';
import Calendar from './components/Calendar.jsx';
import ProfileView from './components/Profile.jsx';
import SuggestionCard, { SuggestionQueue } from './components/SuggestionCard.jsx';
import { Button, Modal } from './components/ui.jsx';

export default function App() {
  const { state, lang, tr, actions, runSuggestionJob } = useApp();
  const [tab, setTab] = useState('home');
  const [lastSavedSessionId, setLastSavedSessionId] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!state.profile.onboarded) return <Onboarding />;

  // Cards from earlier sessions the user never answered. They stay pending
  // until decided — the job itself never re-runs.
  const olderPending = state.suggestions.filter(
    (s) => s.status === 'pending' && s.sessionId !== lastSavedSessionId
  );

  return (
    <div className="app">
      <header className="app-head">
        <h1 className="brand">{tr('brand')}</h1>
        <Button size="sm" variant="quiet" onClick={() => actions.setLanguage(lang === 'en' ? 'es' : 'en')}>
          {lang === 'en' ? 'ES' : 'EN'}
        </Button>
      </header>

      <main className="app-main">
        {tab === 'home' && <Dashboard onOpenSuggestions={() => setSheetOpen(true)} />}

        {tab === 'train' && (
          <Train
            onSaved={(session) => {
              setLastSavedSessionId(session.id);
              setSheetOpen(true);
              setTab('home');
              // Post-session job: fires here and only here, never on app open.
              runSuggestionJob(session);
            }}
          />
        )}

        {tab === 'history' && <Calendar />}
        {tab === 'profile' && <ProfileView />}
      </main>

      <Nav tab={tab} onChange={setTab} />

      {sheetOpen && (
        <Modal title={tr('suggestionTitle')} closeLabel={tr('close')} onClose={() => setSheetOpen(false)}>
          {lastSavedSessionId && <SuggestionQueue sessionId={lastSavedSessionId} />}
          {olderPending.map((s) => (
            <SuggestionCard key={s.id} suggestion={s} />
          ))}
          {!lastSavedSessionId && olderPending.length === 0 && (
            <p className="empty">{tr('suggestionNone')}</p>
          )}
        </Modal>
      )}
    </div>
  );
}
