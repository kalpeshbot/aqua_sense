import { Bell, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';

export default function Header({ title }) {
  const { theme, toggleTheme } = useTheme();
  const { wsConnected, pendingApprovals } = useData();
  const alertCount = pendingApprovals?.length || 0;

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b dark:bg-black bg-white dark:border-[#222222] border-[#E0E0E0]">
      <h2 className="text-lg font-semibold dark:text-white text-black">{title}</h2>
      <div className="flex items-center gap-2">
        {wsConnected ? (
          <div className="flex items-center gap-1.5 text-xs text-accent font-semibold">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            LIVE
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs dark:text-[#999999] text-[#666666] font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#999999]" />
            RECONNECTING...
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="relative p-2 rounded-lg dark:hover:bg-[#111111] hover:bg-[#F8F8F8]"
          aria-label="Notifications"
        >
          <Bell size={18} className="dark:text-white text-black" />
          {alertCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-danger text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
              {alertCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-lg dark:hover:bg-[#111111] hover:bg-[#F8F8F8]"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun size={18} className="dark:text-white text-black" />
          ) : (
            <Moon size={18} className="dark:text-white text-black" />
          )}
        </button>
      </div>
    </header>
  );
}
