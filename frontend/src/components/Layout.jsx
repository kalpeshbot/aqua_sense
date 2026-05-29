import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';

const TITLES = {
  '/': 'Overview',
  '/predictions': 'Predictions',
  '/alerts': 'Alerts',
  '/tanks': 'Chemical Tanks',
  '/sensor-health': 'Sensor Health',
  '/ai-agent': 'AI Agent',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

export default function Layout() {
  const [collapsed, setCollapsed] = useState(window.innerWidth < 768);
  const location = useLocation();

  let title = TITLES[location.pathname] || 'AquaSense';
  if (location.pathname.startsWith('/pond/')) {
    title = 'Pond Detail';
  }

  return (
    <div className="min-h-screen flex dark:bg-black bg-white font-sans">
      <Sidebar collapsed={collapsed} />
      <div
        className={`flex-1 flex flex-col transition-all ${collapsed ? 'ml-16' : 'ml-[220px]'}`}
      >
        <Header title={title} />
        <main className="flex-1 p-6 overflow-auto dark:bg-black bg-white">
          <Outlet />
        </main>
      </div>
      <button
        type="button"
        className="fixed bottom-4 left-4 md:hidden z-50 bg-accent text-white px-3 py-1 rounded text-xs"
        onClick={() => setCollapsed((c) => !c)}
      >
        Menu
      </button>
    </div>
  );
}
