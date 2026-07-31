import { useApp } from '../state/store.jsx';

const TABS = [
  { id: 'log', icon: '✎', key: 'navLog' },
  { id: 'calendar', icon: '▦', key: 'navCalendar' },
  { id: 'body', icon: '◉', key: 'navBody' },
  { id: 'coach', icon: '✦', key: 'navCoach' },
  { id: 'profile', icon: '☰', key: 'navProfile' },
];

export default function Nav({ tab, onChange }) {
  const { tr } = useApp();
  return (
    <nav className="nav" aria-label="primary">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`nav-item ${tab === t.id ? 'is-active' : ''}`}
          aria-current={tab === t.id ? 'page' : undefined}
          onClick={() => onChange(t.id)}
        >
          <span className="nav-icon" aria-hidden="true">
            {t.icon}
          </span>
          {tr(t.key)}
        </button>
      ))}
    </nav>
  );
}
