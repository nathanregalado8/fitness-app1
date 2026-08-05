import { useApp } from '../state/store.jsx';
import { IconCalendar, IconDumbbell, IconHome, IconUser } from './Icons.jsx';

const TABS = [
  { id: 'home', Icon: IconHome, key: 'navHome' },
  { id: 'train', Icon: IconDumbbell, key: 'navTrain' },
  { id: 'history', Icon: IconCalendar, key: 'navHistory' },
  { id: 'profile', Icon: IconUser, key: 'navProfile' },
];

export default function Nav({ tab, onChange }) {
  const { tr } = useApp();
  return (
    <nav className="nav" aria-label="primary">
      {TABS.map(({ id, Icon, key }) => (
        <button
          key={id}
          type="button"
          className={`nav-item ${tab === id ? 'is-active' : ''}`}
          aria-current={tab === id ? 'page' : undefined}
          onClick={() => onChange(id)}
        >
          <Icon aria-hidden="true" />
          {tr(key)}
        </button>
      ))}
    </nav>
  );
}
