import { NavLink } from 'react-router-dom';
import {
  Activity,
  Bell,
  Beaker,
  Bot,
  Droplets,
  FileText,
  Home,
  Settings,
  TrendingUp,
} from 'lucide-react';
import { useData } from '../context/DataContext';

const NAV = [
  { to: '/', icon: Home, label: 'Overview' },
  { to: '/pond/pond_1', icon: Droplets, label: 'Pond Detail' },
  { to: '/predictions', icon: TrendingUp, label: 'Predictions' },
  { to: '/alerts', icon: Bell, label: 'Alerts' },
  { to: '/tanks', icon: Beaker, label: 'Tanks' },
  { to: '/sensor-health', icon: Activity, label: 'Sensor Health' },
  { to: '/ai-agent', icon: Bot, label: 'AI Agent' },
  { to: '/reports', icon: FileText, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar({ collapsed }) {
  const { pendingApprovals } = useData();
  const count = pendingApprovals?.length || 0;

  return (
    <aside
      className={`fixed left-0 top-0 h-full z-40 flex flex-col dark:bg-[#111111] bg-[#F8F8F8] dark:border-[#222222] border-[#E0E0E0] border-r transition-all ${
        collapsed ? 'w-16' : 'w-[220px]'
      }`}
    >
      <div className="p-4 border-b dark:border-[#222222] border-[#E0E0E0]">
        <h1 className={`font-bold text-accent ${collapsed ? 'text-xs text-center' : 'text-lg'}`}>
          {collapsed ? 'AS' : 'AquaSense'}
        </h1>
      </div>
      <nav className="flex-1 py-2 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 text-sm transition border-l-2 ${
                isActive
                  ? 'border-accent text-accent dark:bg-white/5 bg-black/5'
                  : 'border-transparent dark:text-white text-black hover:dark:bg-white/5 hover:bg-black/5'
              }`
            }
          >
            <Icon size={18} />
            {!collapsed && <span className="flex-1">{label}</span>}
            {!collapsed && label === 'Alerts' && count > 0 && (
              <span className="bg-danger text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {count}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
